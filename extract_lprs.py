#!/usr/bin/env python3
import csv
import json

# Leer CSV de MapaTraficoFinal
csv_file = r'c:\Users\gparra\MapaTraficoFinal\public\Camaras.CSV1.csv'
lprs_data = {}

print("Extrayendo LPRs del CSV...")

with open(csv_file, 'r', encoding='latin-1') as f:
    reader = csv.DictReader(f)
    for row in reader:
        lpr_val = row.get('LPR', '').strip()
        cam_num = row.get('N CAMARA', '').strip()
        
        # Solo procesar si tiene LPR y número de cámara válido
        if cam_num and lpr_val and lpr_val != '0':
            if cam_num not in lprs_data:
                # Usar la primera ocurrencia con LPR
                lprs_data[cam_num] = {
                    'lng': float(row.get('Longitud', '0').replace(',', '.')),
                    'lat': float(row.get('Latitud', '0').replace(',', '.')),
                    'address': row.get('Direccion', ''),
                    'barrio': row.get('Barrios', ''),
                    'lpr': lpr_val
                }

print(f"\n✅ Total de cámaras LPR encontradas: {len(lprs_data)}")
print("\nPrimeras 5 cámaras LPR:")
for i, (cam_num, data) in enumerate(list(lprs_data.items())[:5]):
    print(f"  {cam_num}: {data['lpr']} - {data['address'][:50]}...")

# Generar GeoJSON
features = []
for cam_num in sorted(lprs_data.keys(), key=lambda x: int(x) if x.isdigit() else 999):
    data = lprs_data[cam_num]
    feature = {
        "type": "Feature",
        "geometry": {
            "type": "Point",
            "coordinates": [data['lng'], data['lat']]
        },
        "properties": {
            "camera_number": cam_num,
            "address": data['address'],
            "barrio": data['barrio'],
            "lpr": 1,
            "domes": 0,
            "fixed": 0
        }
    }
    features.append(feature)

geojson = {
    "type": "FeatureCollection",
    "features": features
}

# Guardar a archivo
output_file = r'c:\Users\gparra\TraficoMapGeneral\lprs_mapatraficofinal.geojson'
with open(output_file, 'w', encoding='utf-8') as f:
    json.dump(geojson, f, ensure_ascii=False, indent=2)

print(f"\n✅ GeoJSON con {len(features)} LPRs guardado en: {output_file}")
