import pandas as pd
import os

data_dir = r'c:\Users\gparra\TraficoMapGeneral\public\data'
input_file = os.path.join(data_dir, 'robo_automotor_2023_2024.csv')

print("📖 Leyendo archivo real...")
df = pd.read_csv(input_file)
print(f"Total de registros: {len(df)}")

# Ver primeras filas de coordenadas
print("\nPrimeras 5 valores de 'Longitud y Latitud':")
for i, val in enumerate(df['Longitud y Latitud'].head()):
    print(f"  {i}: {repr(val)}")

# Función para parsear coordenadas
def parse_coords(coord_str):
    try:
        coord_str = str(coord_str).strip()
        coord_str = coord_str.replace('−', '-').replace('–', '-')
        parts = coord_str.split(',')
        print(f"  CSV String: {repr(coord_str)}")
        print(f"  Split result: {parts}")
        if len(parts) >= 2:
            lat = float(parts[0].strip())
            lng = float(parts[1].strip())
            print(f"  Lat: {lat}, Lng: {lng}")
            if -56 < lat < -20 and -75 < lng < -50:
                print(f"  ✓ VÁLIDO")
                return lat, lng
            else:
                print(f"  ✗ Fuera de rango")
    except Exception as e:
        print(f"  ✗ Error: {e}")
    return None, None

print("\nProbando parseo de primeras 3 filas:")
for i in range(3):
    print(f"\nFila {i}:")
    parse_coords(df['Longitud y Latitud'].iloc[i])
