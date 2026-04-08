#!/usr/bin/env python3
import csv
import json
import sys

def csv_to_geojson(csv_path, lat_col, lng_col):
    features = []
    try:
        with open(csv_path, 'r', encoding='utf-8') as f:
            reader = csv.DictReader(f)
            for i, row in enumerate(reader):
                try:
                    lat = float(row[lat_col])
                    lng = float(row[lng_col])
                    feature = {
                        'type': 'Feature',
                        'geometry': {
                            'type': 'Point',
                            'coordinates': [lng, lat]
                        },
                        'properties': row
                    }
                    features.append(feature)
                except (ValueError, KeyError) as e:
                    print(f'Error en fila {i}: {e}', file=sys.stderr)
                    continue
        
        return {
            'type': 'FeatureCollection',
            'features': features
        }
    except Exception as e:
        print(f'Error: {e}', file=sys.stderr)
        return None

# Convertir siniestros
print('Convirtiendo siniestros_cordoba_ejemplo.csv...')
sin_geo = csv_to_geojson('public/data/siniestros_cordoba_ejemplo.csv', 'lat', 'lng')
if sin_geo:
    with open('public/data/siniestros_cordoba.geojson', 'w', encoding='utf-8') as f:
        json.dump(sin_geo, f)
    print(f'✅ {len(sin_geo["features"])} siniestros convertidos')

# Convertir cámaras
print('Convirtiendo camaras_cordoba_ejemplo.csv...')
cam_geo = csv_to_geojson('public/data/camaras_cordoba_ejemplo.csv', 'lat', 'lng')
if cam_geo:
    with open('public/data/cameras_cordoba.geojson', 'w', encoding='utf-8') as f:
        json.dump(cam_geo, f)
    print(f'✅ {len(cam_geo["features"])} cámaras convertidas')

# Convertir cámaras privadas
print('Convirtiendo camaras_privadas_cordoba_ejemplo.csv...')
pcam_geo = csv_to_geojson('public/data/camaras_privadas_cordoba_ejemplo.csv', 'lat', 'lng')
if pcam_geo:
    with open('public/data/private_cameras_cordoba.geojson', 'w', encoding='utf-8') as f:
        json.dump(pcam_geo, f)
    print(f'✅ {len(pcam_geo["features"])} cámaras privadas convertidas')

print('\n✅ Conversión completada')
