#!/usr/bin/env python3
"""
reload_laplata_siniestros.py - Recargar siniestros de La Plata desde CSV
Elimina datos antiguos y carga nuevos con códigos correctos
"""
import firebase_admin
from firebase_admin import credentials, firestore
import pandas as pd
from datetime import datetime
import os

# Inicializar Firebase
cred = credentials.Certificate('trafico-map-general-v2-firebase-adminsdk-fbsvc-28104b7758.json')
try:
    firebase_admin.initialize_app(cred)
except:
    pass  # Ya inicializado

db = firestore.client()

def reload_laplata_siniestros():
    """Recargar siniestros de La Plata desde CSV"""
    cliente_id = 'laplata'
    csv_path = r'DATOS_EJEMPLO_LA_PLATA\01_siniestros_50.csv'
    
    print(f"\n{'='*70}")
    print(f"🔄 RECARGANDO SINIESTROS DE LA PLATA")
    print(f"{'='*70}")
    
    try:
        # 1. Verificar que el CSV existe
        if not os.path.exists(csv_path):
            print(f"❌ Archivo no encontrado: {csv_path}")
            return False
        
        # 2. Leer CSV
        print(f"\n1️⃣  Leyendo CSV: {csv_path}")
        df = pd.read_csv(csv_path)
        print(f"   ✅ {len(df)} siniestros encontrados en CSV")
        print(f"   Columnas: {list(df.columns)}")
        
        # 3. Verificar columnas críticas
        # Columnas requeridas según instructivo
        required_cols = ['lat', 'lng', 'hora', 'causa', 'participantes', 'fecha', 'descripcion']
        missing_cols = [col for col in required_cols if col not in df.columns]
        if missing_cols:
            print(f"   ❌ Columnas faltantes: {missing_cols}")
            print(f"   El archivo debe tener exactamente estas columnas (en cualquier orden): {required_cols}")
            return False

        # 4. Validar datos de cada fila
        print(f"\n2️⃣  Validando datos de cada fila...")
        causa_validos = [
            'D','A','AV','EV','FV','G','MI','MR','NR','NSD','P','PC','PI','VS','DF','DESCOMPENSAN','IC','PERSECUCIÓN','?'
        ]
        participantes_validos = [
            'A','M','P','CAM','B','COL','CTA','BOMBEROS','PERRO','POLICIA','MONOPATIN','AMB','PATRULLA','CABALLO'
        ]
        errores = []
        for idx, row in df.iterrows():
            # lat/lng obligatorios
            if pd.isna(row['lat']) or pd.isna(row['lng']):
                errores.append(f"Fila {idx+1}: Falta lat o lng")
            # causa (si está presente)
            causa = str(row['causa']).strip()
            if causa and causa not in causa_validos:
                errores.append(f"Fila {idx+1}: Causa inválida '{causa}'")
            # participantes (si está presente)
            part = str(row['participantes']).strip()
            if part:
                for p in part.split('/'):
                    if p and p not in participantes_validos:
                        errores.append(f"Fila {idx+1}: Participante inválido '{p}'")
            # hora (si está presente)
            hora = str(row['hora']).strip()
            if hora and not (len(hora)==5 and hora[2]==':'):
                errores.append(f"Fila {idx+1}: Formato de hora inválido '{hora}' (debe ser HH:MM)")
        if errores:
            print(f"   ❌ Errores encontrados en el archivo:")
            for err in errores:
                print(f"      - {err}")
            print(f"   Corrige los errores y vuelve a intentar.")
            return False
        print(f"   ✅ Validación estricta completada. Todas las filas son válidas.")
        
        # 5. Eliminar datos antiguos
        print(f"\n3️⃣  Eliminando documentos antiguos de Firestore...")
        siniestros_col = db.collection('clientes').document(cliente_id).collection('siniestros')
        
        docs = siniestros_col.stream()
        deleted_count = 0
        for doc in docs:
            doc.reference.delete()
            deleted_count += 1
        print(f"   🗑️  Eliminados: {deleted_count} documentos antiguos")
        
        # 6. Cargar nuevos datos
        print(f"\n4️⃣  Cargando nuevos siniestros a Firestore...")
        loaded_count = 0
        
        for idx, row in df.iterrows():
            try:
                sin_data = {
                    'lat': float(row['lat']),
                    'lng': float(row['lng']),
                    'hora': str(row['hora']).strip() if not pd.isna(row['hora']) else '',
                    'causa': str(row['causa']).strip(),
                    'participantes': str(row['participantes']).strip() if not pd.isna(row['participantes']) else '',
                    'fecha': str(row['fecha']).strip() if not pd.isna(row['fecha']) else '',
                    'descripcion': str(row['descripcion']).strip() if not pd.isna(row['descripcion']) else ''
                }
                # Generar ID único
                doc_id = f"sin_laplata_{idx:03d}"
                siniestros_col.document(doc_id).set(sin_data)
                loaded_count += 1
                if (idx + 1) % 10 == 0:
                    print(f"   ✅ {loaded_count} siniestros cargados...")
            except Exception as e:
                print(f"   ⚠️  Error en fila {idx}: {str(e)}")
                continue
        
        # 7. Verificación final
        print(f"\n5️⃣  Verificación final...")
        final_docs = list(siniestros_col.stream())
        print(f"   ✅ Total de siniestros en Firestore: {len(final_docs)}")
        
        # Muestra ejemplos
        print(f"\n📋 Ejemplos de documentos cargados:")
        for i, doc in enumerate(final_docs[:3]):
            data = doc.to_dict()
            print(f"   [{i}] causa='{data.get('causa')}' lat={data.get('lat')} lng={data.get('lng')}")
        
        print(f"\n{'='*70}")
        print(f"✅ RECARGA COMPLETADA")
        print(f"   • Eliminados: {deleted_count} documentos antiguos")
        print(f"   • Cargados: {loaded_count} nuevos siniestros")
        print(f"{'='*70}\n")
        
        return True
        
    except Exception as e:
        print(f"\n❌ ERROR: {str(e)}\n")
        import traceback
        traceback.print_exc()
        return False

if __name__ == '__main__':
    success = reload_laplata_siniestros()
    exit(0 if success else 1)
