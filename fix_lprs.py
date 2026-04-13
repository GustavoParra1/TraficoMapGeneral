import json
import os

# Leer el CSV de MapaTraficoFinal
csv_file = r'C:\Users\gparra\MapaTraficoFinal\public\Camaras.CSV1.csv'
geojson_file = r'c:\Users\gparra\TraficoMapGeneral\public\data\cameras.geojson'

lprs_cameras = set()

# Procesar CSV
with open(csv_file, 'r', encoding='utf-8') as f:
    lines = f.readlines()
    for line in lines[1:]:  # Skip header
        parts = line.split(',')
        if len(parts) >= 8:
            camera_num = parts[4].strip()
            lpr_col = parts[7].strip()
            
            # Si tiene LPR
            if lpr_col and lpr_col != '0' and lpr_col != '' and 'LPR' in lpr_col:
                lprs_cameras.add(camera_num)

print(f'Cámaras LPR encontradas: {len(lprs_cameras)}')
print(f'IDs: {sorted(list(lprs_cameras), key=lambda x: int(x) if x.isdigit() else 0)}')

# Actualizar GeoJSON
with open(geojson_file, 'r', encoding='utf-8') as f:
    geojson = json.load(f)

count = 0
for feature in geojson['features']:
    cam_num = str(feature['properties'].get('camera_number', ''))
    if cam_num in lprs_cameras:
        feature['properties']['lpr'] = 1
        count += 1
    else:
        feature['properties']['lpr'] = 0

print(f'Marcadas {count} cámaras como LPR en GeoJSON')

# Guardar
with open(geojson_file, 'w', encoding='utf-8') as f:
    json.dump(geojson, f, ensure_ascii=False, indent=2)

print(f'Archivo guardado: {geojson_file}')

# Verificar
with open(geojson_file, 'r') as f:
    content = f.read()
    final_count = content.count('"lpr": 1')

print(f'✅ VERIFICACIÓN FINAL: {final_count} LPRs en archivo')
