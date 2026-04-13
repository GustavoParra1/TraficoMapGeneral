#!/usr/bin/env python3
import json
import pandas as pd
import sys

try:
    # Leer el CSV de MapaTraficoFinal
    csv_path = r"C:\Users\gparra\MapaTraficoFinal\public\Camaras.CSV1.csv"
    print(f"[INFO] Leyendo CSV desde: {csv_path}")
    
    df = pd.read_csv(csv_path, encoding='utf-8')
    print(f"[INFO] Total de filas en CSV: {len(df)}")
    print(f"[INFO] Columnas: {list(df.columns)}")
    
    # FILTRO: Todas las filas donde LPR NO esté vacío y NO sea "0"
    lpr_cameras = df[
        (df['LPR'].notna()) & 
        (df['LPR'].astype(str).str.strip() != '') & 
        (df['LPR'].astype(str).str.strip() != '0')
    ].copy()
    
    print(f"\n[SUCCESS] Cámaras con LPR encontradas: {len(lpr_cameras)}")
    
    if len(lpr_cameras) > 0:
        print(f"[INFO] Primeras 10 cámaras LPR:")
        for idx, (i, row) in enumerate(lpr_cameras.head(10).iterrows()):
            print(f"   {idx+1}. N CAMARA: {row['N CAMARA']}, LPR: '{row['LPR']}'")
    
    # Convertir a GeoJSON
    features = []
    for idx, row in lpr_cameras.iterrows():
        try:
            lat = float(str(row['Latitud']).replace(',', '.'))
            lon = float(str(row['Longitud']).replace(',', '.'))
            
            feature = {
                "type": "Feature",
                "geometry": {
                    "type": "Point",
                    "coordinates": [lon, lat]
                },
                "properties": {
                    "camera_number": str(row['N CAMARA']),
                    "lpr": 1,
                    "address": str(row.get('Dirección', 'Sin dirección')),
                    "barrio": str(row.get('Barrios', 'Sin barrio')),
                    "domes": int(row.get('Domos', 0)) if pd.notna(row.get('Domos')) else 0,
                    "fixed": int(row.get('Fijas', 0)) if pd.notna(row.get('Fijas')) else 0
                }
            }
            features.append(feature)
        except Exception as e:
            print(f"[WARNING] Error procesando fila {idx}: {e}")
            continue
    
    geojson = {
        "type": "FeatureCollection",
        "features": features
    }
    
    # Escribir al archivo
    output_path = r"c:\Users\gparra\TraficoMapGeneral\public\data\cameras.geojson"
    with open(output_path, 'w', encoding='utf-8') as f:
        json.dump(geojson, f, ensure_ascii=False, indent=2)
    
    print(f"\n✅ {len(features)} LPRs guardados exitosamente en cameras.geojson")
    print(f"✅ Ruta: {output_path}")
    sys.exit(0)
    
except Exception as e:
    print(f"❌ ERROR: {e}")
    import traceback
    traceback.print_exc()
    sys.exit(1)
