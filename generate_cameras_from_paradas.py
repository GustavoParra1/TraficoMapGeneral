import json
import os
from pathlib import Path

# Paths
data_dir = Path("public/data")
output_file = data_dir / "cameras_cordoba.geojson"

# Extract paradas from all línea files
cameras_features = []
camera_id = 1

for linea_num in range(1, 16):  # líneas 1-15
    linea_file = data_dir / f"linea{linea_num}.geojson"
    
    if not linea_file.exists():
        print(f"⚠️  {linea_file} no encontrado")
        continue
    
    with open(linea_file, 'r', encoding='utf-8') as f:
        linea_data = json.load(f)
    
    # Extract parada features
    for feature in linea_data['features']:
        if feature.get('properties', {}).get('tipo') == 'parada':
            coords = feature['geometry']['coordinates']
            parada_name = feature['properties'].get('nombre', f'Parada Línea {linea_num}')
            
            # Create camera feature
            camera_feature = {
                "type": "Feature",
                "geometry": {
                    "type": "Point",
                    "coordinates": coords
                },
                "properties": {
                    "nombre": parada_name,
                    "camera_number": camera_id,  # Municipal camera number
                    "numero": camera_id,
                    "linea": linea_num,
                    "barrio": f"Córdoba Centro",
                    "ubicacion": parada_name,
                    "lat": coords[1],
                    "lng": coords[0],
                    "tipo": "municipal"
                }
            }
            cameras_features.append(camera_feature)
            camera_id += 1

# Create GeoJSON
cameras_geojson = {
    "type": "FeatureCollection",
    "features": cameras_features
}

# Write to file
with open(output_file, 'w', encoding='utf-8') as f:
    json.dump(cameras_geojson, f, ensure_ascii=False, indent=2)

print(f"✅ {len(cameras_features)} cámaras generadas desde paradas")
print(f"📁 Archivo guardado: {output_file}")
