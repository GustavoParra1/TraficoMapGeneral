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
        required_cols = ['lat', 'lng', 'causa']
        missing_cols = [col for col in required_cols if col not in df.columns]
        if missing_cols:
            print(f"   ❌ Columnas faltantes: {missing_cols}")
            return False
        
        # 4. Verificar datos de causa
        print(f"\n2️⃣  Validando datos...")
        print(f"   Valores únicos en 'causa': {df['causa'].unique().tolist()}")
        print(f"   Ejemplo de datos:")
        print(df[['lat', 'lng', 'causa']].head(3).to_string())
        
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
                    'causa': str(row['causa']).strip(),  # CRÍTICO: asegurar que sea string limpio
                    'fecha': datetime.now() if pd.isna(row.get('fecha')) else row['fecha'],
                    'participantes': int(row['participantes']) if 'participantes' in row and not pd.isna(row['participantes']) else 0,
                    'heridos': int(row['heridos']) if 'heridos' in row and not pd.isna(row['heridos']) else 0,
                    'muertos': int(row['muertos']) if 'muertos' in row and not pd.isna(row['muertos']) else 0,
                    'lugar': str(row['lugar']) if 'lugar' in row and not pd.isna(row['lugar']) else 'La Plata',
                    'descripcion_tipo': str(row['descripcion_tipo']) if 'descripcion_tipo' in row and not pd.isna(row['descripcion_tipo']) else 'accidente'
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
