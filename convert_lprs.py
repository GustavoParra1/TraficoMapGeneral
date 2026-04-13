#!/usr/bin/env python3
import csv
import json

# Leer CSV de MapaTraficoFinal
with open('C:\\Users\\gparra\\MapaTraficoFinal\\public\\Camaras.CSV1.csv', 'r', encoding='utf-8') as f:
    reader = csv.DictReader(f)
    cameras = list(reader)

# Filtrar solo las que tengan LPR
lpr_cameras = []
for cam in cameras:
    lpr_val = str(cam.get('LPR', '')).strip() if cam.get('LPR') else ''
    cant_lpr_val = str(cam.get('Cant. Cam. LPR', '')).strip() if cam.get('Cant. Cam. LPR') else '0'
    
    has_lpr = (lpr_val and lpr_val != '0' and lpr_val != '') or (cant_lpr_val and cant_lpr_val != '0')
    
    if has_lpr:
        try:
            lat = float(str(cam.get('Latitud', '')).replace(',', '.'))
            lon = float(str(cam.get('Longitud', '')).replace(',', '.'))
            
            feature = {
                "type": "Feature",
                "geometry": {
                    "type": "Point",
                    "coordinates": [lon, lat]
                },
                "properties": {
                    "camera_number": cam.get('N CAMARA', ''),
                    "lpr": 1,
                    "address": cam.get('Dirección', '') or cam.get('DIRECCION', '') or '',
                    "barrio": cam.get('BARRIO', ''),
                    "domes": cam.get('Domes', '') or '0',
                    "fixed": cam.get('Fijas', '') or '0'
                }
            }
            lpr_cameras.append(feature)
        except Exception as e:
            print(f"Error procesando {cam.get('N CAMARA')}: {e}")
            pass

print(f"Encontrados {len(lpr_cameras)} LPRs")

# Crear GeoJSON
geojson = {
    "type": "FeatureCollection",
    "features": lpr_cameras
}

# Guardar
with open('public\\data\\cameras.geojson', 'w', encoding='utf-8') as f:
    json.dump(geojson, f, ensure_ascii=False, indent=2)

print(f"✅ Guardado: public\\data\\cameras.geojson con {len(lpr_cameras)} cámaras LPR")
for cam in lpr_cameras[:5]:
    print(f"  - {cam['properties']['camera_number']}: {cam['properties']['address']}")
