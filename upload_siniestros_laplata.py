#!/usr/bin/env python3
"""
Script para cargar siniestros de La Plata desde CSV a Firestore.
Elimina los datos antiguos y carga los nuevos con los códigos correctos.
"""

import csv
import json
from datetime import datetime
import firebase_admin
from firebase_admin import credentials, firestore

# Inicializar Firebase con el proyecto correcto
options = {
    'projectId': 'trafico-map-general-v2'
}
firebase_admin.initialize_app(options=options)

# Conectar a Firestore
db = firestore.client()

# Mapeo de códigos de causa a descripciones completas
CAUSA_DESCRIPTIONS = {
    'D': 'Distracción',
    'A': 'Alcohol',
    'AV': 'Avería',
    'EV': 'Exceso de velocidad',
    'FV': 'Falta de visibilidad',
    'G': 'Giro prohibido',
    'MI': 'Maniobra indebida',
    'MR': 'Maniobra riesgosa',
    'NR': 'No respetar norma',
    'NSD': 'No se determinó',
    'P': 'Peatón',
    'PC': 'Parada confusa',
    'PI': 'Piso inseguro',
    'VS': 'Violación de semáforo',
    'DF': 'Defecto fatal',
    'DESCOMPENSAN': 'Descompensación',
    'IC': 'Inexperiencia/Conducción',
    'PERSECUCIÓN': 'Persecución',
    '?': 'Desconocido'
}

def delete_old_siniestros_laplata():
    """Elimina todos los siniestros antiguos de La Plata en Firestore"""
    print("🗑️ Eliminando siniestros antiguos de La Plata...")
    
    try:
        collection = db.collection('clientes').document('laplata').collection('siniestros')
        docs = collection.stream()
        
        deleted_count = 0
        for doc in docs:
            doc.reference.delete()
            deleted_count += 1
        
        print(f"✅ Eliminados {deleted_count} siniestros antiguos")
        return True
    except Exception as e:
        print(f"❌ Error eliminando siniestros: {e}")
        return False

def upload_siniestros_from_csv(csv_path):
    """Carga siniestros desde CSV a Firestore"""
    print(f"\n📂 Leyendo CSV: {csv_path}")
    
    siniestros = []
    errores = []
    # Códigos válidos (igual que reload_laplata_siniestros.py)
    causa_validos = set([
        'D','A','AV','EV','FV','G','MI','MR','NR','NSD','P','PC','PI','VS','DF','DESCOMPENSAN','IC','PERSECUCIÓN','?'
    ])
    participantes_validos = set([
        'A','M','P','CAM','B','COL','CTA','BOMBEROS','PERRO','POLICIA','MONOPATIN','AMB','PATRULLA','CABALLO'
    ])
    try:
        with open(csv_path, 'r', encoding='utf-8') as f:
            reader = csv.DictReader(f)
            for idx, row in enumerate(reader):
                # Validar lat/lng
                try:
                    lat = float(row['lat'])
                    lng = float(row['lng'])
                except Exception:
                    errores.append(f"Fila {idx+2}: lat/lng inválido")
                    continue
                # Validar causa
                causa_code = row['causa'].strip().upper()
                if not causa_code or causa_code not in causa_validos:
                    errores.append(f"Fila {idx+2}: Causa inválida '{row['causa']}'")
                # Validar participantes
                part = row['participantes'].strip()
                if part:
                    for p in part.split('/'):
                        if p and p not in participantes_validos:
                            errores.append(f"Fila {idx+2}: Participante inválido '{p}'")
                # Validar hora si existe
                hora = row.get('hora', '').strip()
                if hora and not (len(hora)==5 and hora[2]==':'):
                    errores.append(f"Fila {idx+2}: Formato de hora inválido '{hora}' (debe ser HH:MM)")
                # Si no hay errores para esta fila, agregar a siniestros
                if not errores or (len(errores) > 0 and errores[-1].startswith(f"Fila {idx+2}")) == False:
                    causa_description = CAUSA_DESCRIPTIONS.get(causa_code, causa_code)
                    siniestro = {
                        'lat': lat,
                        'lng': lng,
                        'nombre': row['nombre'],
                        'tipo': row.get('descripcion_tipo', ''),
                        'causa': causa_code,
                        'causa_descripcion': causa_description,
                        'fecha': row['fecha'],
                        'participantes': row['participantes'],
                        'descripcion': row['descripcion'],
                        'barrio': row.get('barrio', ''),
                        'timestamp': datetime.now().isoformat(),
                        'geopoint': {
                            'latitude': lat,
                            'longitude': lng
                        }
                    }
                    siniestros.append(siniestro)
                    print(f"  ✓ {row['nombre']}: causa={causa_code} ({causa_description})")
        if errores:
            print(f"\n❌ Errores encontrados en el archivo:")
            for err in errores:
                print(f"   - {err}")
            print(f"Corrige los errores y vuelve a intentar. No se subió ningún dato.")
            return False
        print(f"\n📦 Total de siniestros a cargar: {len(siniestros)}")
        # Cargar a Firestore en lotes
        print("\n📡 Cargando a Firestore en lotes...")
        collection = db.collection('clientes').document('laplata').collection('siniestros')
        batch_size = 100
        for batch_idx in range(0, len(siniestros), batch_size):
            batch = db.batch()
            batch_items = siniestros[batch_idx:batch_idx + batch_size]
            for siniestro in batch_items:
                doc_id = siniestro['nombre'].replace(' ', '_').lower()
                batch.set(collection.document(doc_id), siniestro)
            batch.commit()
            print(f"  ✅ Lote [{batch_idx + len(batch_items)}/{len(siniestros)}] cargado")
        print(f"\n✅ Todos los {len(siniestros)} siniestros cargados exitosamente!")
        return True
    except FileNotFoundError:
        print(f"❌ Archivo no encontrado: {csv_path}")
        return False
    except Exception as e:
        print(f"❌ Error cargando siniestros: {e}")
        return False

def main():
    print("=" * 60)
    print("🚗 CARGADOR DE SINIESTROS LA PLATA A FIRESTORE")
    print("=" * 60)
    
    csv_path = r'DATOS_EJEMPLO_LA_PLATA\01_siniestros_50.csv'
    
    # Paso 1: Eliminar datos antiguos
    if not delete_old_siniestros_laplata():
        print("❌ No se pudo eliminar datos antiguos. Abortando.")
        return
    
    # Paso 2: Cargar nuevos datos
    if not upload_siniestros_from_csv(csv_path):
        print("❌ No se pudo cargar nuevos datos.")
        return
    
    print("\n" + "=" * 60)
    print("🎉 PROCESO COMPLETADO EXITOSAMENTE")
    print("=" * 60)
    print("\n📝 Próximos pasos:")
    print("  1. Abre el navegador en: http://localhost:5173/?city=La%20Plata&client=laplata")
    print("  2. Presiona Ctrl+Shift+R para limpiar el cache")
    print("  3. Activa el checkbox de 'Siniestros'")
    print("  4. Los siniestros aparecerán con colores vibrantes según su causa")

if __name__ == '__main__':
    main()
