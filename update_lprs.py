#!/usr/bin/env python3
import json
import csv
import os

csv_path = r'C:\Users\gparra\MapaTraficoFinal\public\Camaras.CSV1.csv'
geojson_path = r'C:\Users\gparra\TraficoMapGeneral\public\data\cameras.geojson'

# 1. Leer datos de LPR del CSV
lprs_by_camera = {}
try:
    with open(csv_path, 'r', encoding='utf-8') as f:
        reader = csv.DictReader(f)
        for row in reader:
            lpr_col = row.get('LPR', '').strip()
            if lpr_col and lpr_col != '0' and lpr_col != '':
                cam_num = row['N CAMARA'].strip()
                if cam_num not in lprs_by_camera:
                    lprs_by_camera[cam_num] = {
                        'lpr': 1,
                        'address': row.get('Dirección', '').strip(),
                        'barrio': row.get('Barrios', '').strip()
                    }
    print(f'✅ Encontrados {len(lprs_by_camera)} LPRs en CSV: {list(lprs_by_camera.keys())[:5]}...')
except Exception as e:
    print(f'❌ Error leyendo CSV: {e}')
    exit(1)

# 2. Leer GeoJSON y actualizar propiedades de LPR
try:
    with open(geojson_path, 'r', encoding='utf-8') as f:
        geojson = json.load(f)
    
    # Marcar todos como lpr: 0 primero
    for feature in geojson['features']:
        cam_num = feature['properties'].get('camera_number', '')
        if cam_num in lprs_by_camera:
            feature['properties']['lpr'] = 1
        else:
            feature['properties']['lpr'] = 0
    
    # Contar
    lpr_count = sum(1 for f in geojson['features'] if f['properties'].get('lpr') == 1)
    print(f'✅ Actualizado GeoJSON - Total LPRs: {lpr_count}')
    
    # Guardar
    with open(geojson_path, 'w', encoding='utf-8') as f:
        json.dump(geojson, f, ensure_ascii=False, indent=2)
    
    print(f'✅ Guardado en {geojson_path}')
    
except Exception as e:
    print(f'❌ Error procesando GeoJSON: {e}')
    exit(1)

# 3. Verificar
try:
    with open(geojson_path, 'r', encoding='utf-8') as f:
        content = f.read()
        count = content.count('"lpr": 1')
    print(f'✅ Verificación final: {count} LPRs en archivo')
except Exception as e:
    print(f'⚠️ Error en verificación: {e}')
