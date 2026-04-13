#!/usr/bin/env python3
import json
import csv

csv_path = r"C:\Users\gparra\MapaTraficoFinal\public\Camaras.CSV1.csv"
output_path = r"c:\Users\gparra\TraficoMapGeneral\public\data\cameras.geojson"

print("[INFO] Iniciando lectura del CSV...")

# Diccionario para almacenar cámaras LPR por número (evitar duplicados)
lpr_dict = {}

try:
    with open(csv_path, 'r', encoding='utf-8') as f:
        reader = csv.DictReader(f)
        row_count = 0
        
        for row in reader:
            row_count += 1
            
            # Obtener columna LPR
            lpr_value = row.get('LPR', '').strip()
            
            # Si tiene LPR (no vacío y no es "0")
            if lpr_value and lpr_value != '0':
                cam_num = str(row.get('N CAMARA', '')).strip()
                
                if cam_num:  # Solo si tiene número de cámara
                    # Solo agregar si no ya existe (evitar duplicados)
                    if cam_num not in lpr_dict:
                        try:
                            lat = float(str(row.get('Latitud', '0')).replace(',', '.'))
                            lon = float(str(row.get('Longitud', '0')).replace(',', '.'))
                            
                            lpr_dict[cam_num] = {
                                'lat': lat,
                                'lon': lon,
                                'address': str(row.get('Dirección', 'Sin dirección')),
                                'barrio': str(row.get('Barrios', 'Sin barrio')),
                                'domes': int(row.get('Domos', 0)) if row.get('Domos', '0').isdigit() else 0,
                                'fixed': int(row.get('Fijas', 0)) if row.get('Fijas', '0').isdigit() else 0
                            }
                        except Exception as e:
                            print(f"[WARNING] Error en fila {row_count} (cámara {cam_num}): {e}")

    print(f"[INFO] Procesadas {row_count} filas del CSV")
    print(f"[SUCCESS] Cámaras LPR ÚNICAS encontradas: {len(lpr_dict)}")
    
    if lpr_dict:
        cameras_list = sorted(lpr_dict.keys(), key=lambda x: int(x) if x.isdigit() else 999999)
        print(f"[INFO] Números de cámara LPR: {cameras_list[:20]}{'...' if len(cameras_list) > 20 else ''}")

except Exception as e:
    print(f"[ERROR] Error leyendo CSV: {e}")
    import traceback
    traceback.print_exc()
    exit(1)

# Construir GeoJSON
print("[INFO] Construyendo GeoJSON...")

features = []
for cam_num, data in lpr_dict.items():
    feature = {
        "type": "Feature",
        "geometry": {
            "type": "Point",
            "coordinates": [data['lon'], data['lat']]
        },
        "properties": {
            "id": cam_num,
            "camera_number": cam_num,
            "address": data['address'],
            "barrio": data['barrio'],
            "city": "Mar del Plata",
            "province": "Buenos Aires",
            "country": "Argentina",
            "domes": data['domes'],
            "fixed": data['fixed'],
            "lpr": 1,
            "total_cameras": 1,
            "type": "Pública (Municipal)",
            "corridor": "",
            "school_corridor": False,
            "monitoring": False,
            "street_type": "Avenida"
        }
    }
    features.append(feature)

geojson = {
    "type": "FeatureCollection",
    "features": features
}

# Escribir archivo
print(f"[INFO] Escribiendo {len(features)} features a {output_path}...")

try:
    with open(output_path, 'w', encoding='utf-8') as f:
        json.dump(geojson, f, ensure_ascii=False, indent=2)
    
    print(f"[SUCCESS] ✅ GeoJSON guardado exitosamente")
    print(f"[SUCCESS] Total de LPRs: {len(features)}")
    
    # Verificar
    with open(output_path, 'r', encoding='utf-8') as f:
        content = f.read()
        lpr_count = content.count('"lpr": 1')
    
    print(f"[VERIFY] Verificación: {lpr_count} cámaras con 'lpr': 1 en archivo")
    
except Exception as e:
    print(f"[ERROR] Error escribiendo GeoJSON: {e}")
    import traceback
    traceback.print_exc()
    exit(1)

print("[INFO] ✅ Proceso completado exitosamente")
