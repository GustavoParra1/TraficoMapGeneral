import pandas as pd
import os

data_dir = r'c:\Users\gparra\TraficoMapGeneral\public\data'
input_file = os.path.join(data_dir, 'robo_automotor_2023_2024.csv')
output_file = os.path.join(data_dir, 'robos_final.csv')

print("📖 Leyendo archivo sin procesar encabezados...")
df = pd.read_csv(input_file)

print(f"Total de registros: {len(df)}")
print(f"Columnas: {list(df.columns)}")

# El ENLACE contiene: "Jacinto Peralta Ramos y Carasa , Buenos Aires , Argentina,-38.032577, -57.5876566"
# Necesitamos extraer lat/lng del final

def extract_coords_from_enlace(enlace_str):
    try:
        enlace_str = str(enlace_str).strip()
        # Buscar el patrón -XX.XXXXX (números negativos)
        # Dividir por comas desde atrás
        parts = enlace_str.split(',')
        if len(parts) >= 2:
            # Los últimos 2 elementos deben ser lat y lng
            try:
                lng = float(parts[-1].strip().replace('−', '-').replace('–', '-'))
                lat = float(parts[-2].strip().replace('−', '-').replace('–', '-'))
                if -56 < lat < -20 and -75 < lng < -50:
                    return lat, lng
            except:
                pass
    except:
        pass
    return None, None

# Procesar ENLACE para extraer coordenadas
coords = df['ENLACE'].apply(extract_coords_from_enlace)
df['lat'] = coords.apply(lambda x: x[0])
df['lng'] = coords.apply(lambda x: x[1])

# Limpiar año y mes
df['año'] = pd.to_numeric(df['año'], errors='coerce').fillna(2023).astype(int)
df['mes'] = pd.to_numeric(df['mes'], errors='coerce').fillna(1).astype(int)

# Crear fecha
df['fecha'] = df.apply(lambda row: f"{int(row['año'])}-{int(row['mes']):02d}-01", axis=1)

# Seleccionar columnas
df_final = df[['lat', 'lng', 'fecha', 'Resultado', 'Direccion', 'año']].copy()
df_final.columns = ['lat', 'lng', 'fecha', 'resultado', 'observaciones', 'año']

# Eliminar nulos
df_final = df_final.dropna(subset=['lat', 'lng'])

# Guardar
print(f"💾 Guardando {len(df_final)} registros...")
df_final.to_csv(output_file, index=False)

print(f"\n✅ Proceso completado!")
print(f"   Registros guardados: {len(df_final)}")
print(f"   Años: {sorted(df_final['año'].unique())}")
