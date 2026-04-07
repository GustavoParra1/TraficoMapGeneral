#!/usr/bin/env python3
# -*- coding: utf-8 -*-

import pandas as pd
import json
import sys

# Intentar leer CSV con diferentes encodings
csv_file = 'public/data/SINIESTROS.csv'
encodings = ['latin-1', 'iso-8859-1', 'cp1252', 'utf-8']

df = None
used_encoding = None
for enc in encodings:
    try:
        df = pd.read_csv(csv_file, encoding=enc)
        used_encoding = enc
        print(f"✅ CSV leído con encoding: {enc}")
        break
    except:
        continue

if df is None:
    print("❌ No se pudo leer el CSV con ningún encoding")
    sys.exit(1)

print(f"✅ Leyendo {len(df)} registros del CSV")
print(f"Columnas: {list(df.columns)[:5]}...")

# Crear GeoJSON
features = []
for idx, row in df.iterrows():
    lon = float(row.get('longitud', row.get('LONGITUD', 0)) or 0)
    lat = float(row.get('latitud', row.get('LATITUD', 0)) or 0)
    
    # Convertir fila a diccionario preservando tipos
    props = {}
    for col in df.columns:
        val = row[col]
        if pd.isna(val):
            props[col] = None
        elif isinstance(val, (int, float)):
            props[col] = val
        else:
            props[col] = str(val)
    
    feature = {
        'type': 'Feature',
        'geometry': {
            'type': 'Point',
            'coordinates': [lon, lat]
        },
        'properties': props
    }
    features.append(feature)

geojson = {
    'type': 'FeatureCollection',
    'features': features
}

# Escribir GeoJSON con encoding UTF-8
output_file = 'public/data/siniestros_con_ubicacion.geojson'
with open(output_file, 'w', encoding='utf-8') as f:
    json.dump(geojson, f, ensure_ascii=False, indent=2)

print(f"✅ GeoJSON convertido: {len(features)} siniestros")
