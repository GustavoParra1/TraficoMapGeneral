import pandas as pd
import os

# Rutas de archivos
data_dir = r'c:\Users\gparra\TraficoMapGeneral\public\data'
file_2023 = os.path.join(data_dir, 'robo automotor - Hoja 1.csv')
file_2024 = os.path.join(data_dir, 'robo_automotor_fixed.csv')
output_file = os.path.join(data_dir, 'robos_completo_2023_2024.csv')

# Leer archivos
print("📖 Leyendo archivos...")
df_2023 = pd.read_csv(file_2023)
df_2024 = pd.read_csv(file_2024)

# Agregar columna de año
print("➕ Agregando columna de año...")
df_2023['año'] = 2023
df_2024['año'] = 2024

# Fusionar
print("🔗 Fusionando datos...")
df_combined = pd.concat([df_2023, df_2024], ignore_index=True)

# Guardar
print(f"💾 Guardando archivo consolidado: {output_file}")
df_combined.to_csv(output_file, index=False)

print(f"\n✅ Proceso completado!")
print(f"   2023: {len(df_2023)} registros")
print(f"   2024: {len(df_2024)} registros")
print(f"   Total: {len(df_combined)} registros")
print(f"\nArchivo guardado en: {output_file}")
