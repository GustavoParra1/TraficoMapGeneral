import pandas as pd
import os

data_dir = r'c:\Users\gparra\TraficoMapGeneral\public\data'
input_file = os.path.join(data_dir, 'robo_automotor_2023_2024.csv')
output_file = os.path.join(data_dir, 'robos_final.csv')

print("📖 Leyendo archivo real...")
df = pd.read_csv(input_file)
print(f"Total de registros: {len(df)}")

# Limpiar año y mes
df['año'] = pd.to_numeric(df['año'], errors='coerce').fillna(2023).astype(int)
df['mes'] = pd.to_numeric(df['mes'], errors='coerce').fillna(1).astype(int)

# Función para parsear coordenadas
def parse_coords(coord_str):
    try:
        coord_str = str(coord_str).strip()
        coord_str = coord_str.replace('−', '-').replace('–', '-')
        parts = coord_str.split(',')
        if len(parts) >= 2:
            lat = float(parts[0].strip())
            lng = float(parts[1].strip())
            if -56 < lat < -20 and -75 < lng < -50:
                return lat, lng
    except:
        pass
    return None, None

# Parsear coordenadas
coords = df['Longitud y Latitud'].apply(parse_coords)
df['lat'] = coords.apply(lambda x: x[0])
df['lng'] = coords.apply(lambda x: x[1])

# Crear fecha
df['fecha'] = df.apply(lambda row: f"{int(row['año'])}-{int(row['mes']):02d}-01", axis=1)

# Seleccionar columnas
df_final = df[['lat', 'lng', 'fecha', 'Resultado', 'Direccion', 'año']].copy()
df_final.columns = ['lat', 'lng', 'fecha', 'resultado', 'observaciones', 'año']

# Eliminar nulos
df_final = df_final.dropna(subset=['lat', 'lng'])

# Guardar
print(f"💾 Guardando archivo limpio...")
df_final.to_csv(output_file, index=False)

print(f"\n✅ Proceso completado!")
print(f"   Registros procesados: {len(df_final)}")
print(f"   Años: {sorted(df_final['año'].unique())}")
