import json
import re

# Leer CSV manualmente
csv_file = r"C:\Users\gparra\MapaTraficoFinal\public\Camaras.CSV1.csv"
geojson_file = r"c:\Users\gparra\TraficoMapGeneral\public\data\cameras.geojson"

# Extraer cámaras con LPR del CSV
lpr_cameras = set()
with open(csv_file, 'r', encoding='utf-8') as f:
    for line in f:
        # Buscar columnas LPR (columna 7) con valor "LPR"
        if 'LPR' in line:
            # Extraer el número de cámara (columna 4)
            parts = line.split(',')
            if len(parts) > 7:
                lpr_val = parts[7].strip().strip('"')
                if lpr_val and 'LPR' in lpr_val:
                    cam_num = parts[4].strip().strip('"')
                    if cam_num and cam_num.isdigit():
                        lpr_cameras.add(cam_num)

print(f"[SUCCESS] Cámaras LPR encontradas: {len(lpr_cameras)}")
print(f"[INFO] Números: {sorted(list(lpr_cameras), key=lambda x: int(x))}")

# Actualizar GeoJSON
with open(geojson_file, 'r', encoding='utf-8') as f:
    geojson = json.load(f)

updated = 0
for feature in geojson['features']:
    cam_num = str(feature['properties'].get('camera_number', ''))
    if cam_num in lpr_cameras:
        feature['properties']['lpr'] = 1
        updated += 1
    else:
        feature['properties']['lpr'] = 0

print(f"[INFO] Actualizadas {updated} cámaras como LPR")

# Guardar
with open(geojson_file, 'w', encoding='utf-8') as f:
    json.dump(geojson, f, ensure_ascii=False, indent=2)

print(f"[SUCCESS] GeoJSON guardado")

# Verificar
with open(geojson_file, 'r') as f:
    count = f.read().count('"lpr": 1')
print(f"[VERIFY] Total cámaras con lpr=1: {count}")
