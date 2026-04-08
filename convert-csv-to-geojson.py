#!/usr/bin/env python3
# -*- coding: utf-8 -*-

import pandas as pd
import json
import sys
import os

# Rutas de archivos
csv_file = 'public/data/SINIESTROS.csv'
cameras_file = 'public/data/cameras.csv'  # Si existe
cameras_geojson = 'public/data/cameras.geojson'
output_file = 'public/data/siniestros_con_ubicacion.geojson'

# --- 1. LEER COORDENADAS DE CÁMARAS ---
cameras_dict = {}

# Opción A: Si hay un CSV de cámaras
if os.path.exists(cameras_file):
    try:
        df_cameras = pd.read_csv(cameras_file, encoding='latin-1')
        for idx, row in df_cameras.iterrows():
            try:
                cam_id = int(float(row.get('N CAMARA', row.get('N CÁMARA', 0)) or 0))
                lon = float(str(row.get('Longitud', 0) or 0).replace(',', '.'))
                lat = float(str(row.get('Latitud', 0) or 0).replace(',', '.'))
                cameras_dict[cam_id] = {'lat': lat, 'lon': lon}
            except:
                pass
        print(f"✅ Cámaras cargadas desde CSV: {len(cameras_dict)} cámaras")
    except Exception as e:
        print(f"⚠️ No se pudo leer CSV de cámaras: {e}")

# Opción B: Si hay un GeoJSON de cámaras
if not cameras_dict and os.path.exists(cameras_geojson):
    try:
        with open(cameras_geojson, 'r', encoding='utf-8') as f:
            geojson_cam = json.load(f)
            for feature in geojson_cam.get('features', []):
                try:
                    # Buscar camera_number (puede estar como 'camera_number', 'N CAMERA', 'N CAMARA', etc.)
                    props = feature.get('properties', {})
                    cam_id = None
                    for key in ['camera_number', 'N CAMERA', 'N CAMARA', 'id']:
                        if key in props:
                            val = props[key]
                            if isinstance(val, (int, float)):
                                cam_id = int(val)
                            else:
                                try:
                                    cam_id = int(float(str(val)))
                                except:
                                    pass
                            if cam_id:
                                break
                    
                    if cam_id:
                        coords = feature.get('geometry', {}).get('coordinates', [0, 0])
                        if coords and len(coords) == 2:
                            cameras_dict[cam_id] = {'lon': coords[0], 'lat': coords[1]}
                except Exception as e:
                    pass
        print(f"✅ Cámaras cargadas desde GeoJSON: {len(cameras_dict)} cámaras")
    except Exception as e:
        print(f"⚠️ No se pudo leer GeoJSON de cámaras: {e}")

if not cameras_dict:
    print("⚠️ No se pudieron cargar coordenadas de cámaras. Los siniestros tendrán coordenadas [0, 0]")

# --- 2. LEER SINIESTROS Y ASIGNAR COORDENADAS ---
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
print(f"Columnas ({len(df.columns)}): {list(df.columns)[:10]}...")

# Crear GeoJSON
features = []
missing_cameras = set()
coords_from_csv = 0
coords_from_camera_lookup = 0
coords_fallback = 0

for idx, row in df.iterrows():
    try:
        lat = None
        lon = None
        coord_source = 'fallback'  # Rastrear la fuente
        
        # --- PASO 1: Intentar obtener coordenadas DIRECTAS del CSV ---
        # Buscar variantes de columnas de latitud
        for lat_col in ['Latitud', 'latitud', 'LATITUD', 'lat', 'LAT', 'latitude']:
            if lat_col in df.columns and not pd.isna(row[lat_col]):
                try:
                    lat = float(str(row[lat_col]).replace(',', '.'))
                    if lat != 0:  # Si encontramos valor válido, usarlo
                        break
                except:
                    lat = None
                    continue
        
        # Buscar variantes de columnas de longitud
        for lon_col in ['Longitud', 'longitud', 'LONGITUD', 'lng', 'LNG', 'longitude']:
            if lon_col in df.columns and not pd.isna(row[lon_col]):
                try:
                    lon = float(str(row[lon_col]).replace(',', '.'))
                    if lon != 0:  # Si encontramos valor válido, usarlo
                        break
                except:
                    lon = None
                    continue
        
        # Si tenemos ambas coordenadas directas, usarlas
        if lat is not None and lon is not None and lat != 0 and lon != 0:
            coord_source = 'csv_direct'
            coords_from_csv += 1
        else:
            # --- PASO 2: Si NO tenemos coordenadas directas, intentar CAMERA ID LOOKUP ---
            try:
                cam_id = int(float(row.iloc[1]) if not pd.isna(row.iloc[1]) else 0)
            except:
                cam_id = None
            
            if cam_id and cam_id in cameras_dict:
                lon = cameras_dict[cam_id]['lon']
                lat = cameras_dict[cam_id]['lat']
                coord_source = 'camera_lookup'
                coords_from_camera_lookup += 1
            else:
                if cam_id and cam_id != 0:
                    missing_cameras.add(cam_id)
        
        # --- PASO 3: Fallback a [0, 0] si no tenemos nada ---
        if lat is None or lon is None or (lat == 0 and lon == 0):
            if coord_source == 'fallback':
                coords_fallback += 1
            lat = lat if (lat is not None and lat != 0) else 0
            lon = lon if (lon is not None and lon != 0) else 0
        
        # Convertir fila a diccionario preservando tipos
        props = {}
        for i, col in enumerate(df.columns):
            val = row.iloc[i]
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
    except Exception as e:
        print(f"⚠️ Error procesando fila {idx}: {e}")
        continue

if missing_cameras:
    print(f"⚠️ Cámaras no encontradas en GeoJSON: {len(missing_cameras)} cámaras")

geojson = {
    'type': 'FeatureCollection',
    'features': features
}

# Escribir GeoJSON con encoding UTF-8
with open(output_file, 'w', encoding='utf-8') as f:
    json.dump(geojson, f, ensure_ascii=False, indent=2)

print(f"\n✅ GeoJSON convertido: {len(features)} siniestros")
print(f"\n📊 Fuentes de coordenadas:")
print(f"   📍 Desde CSV directo (Latitud/Longitud): {coords_from_csv}")
print(f"   🎥 Desde Camera ID lookup: {coords_from_camera_lookup}")
print(f"   ❌ Fallback [0,0]: {coords_fallback}")
print(f"   ✅ Total: {coords_from_csv + coords_from_camera_lookup + coords_fallback}")
print(f"\n📁 Guardado en: {output_file}")
