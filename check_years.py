import pandas as pd
df = pd.read_csv('public/data/robo_automotor_2023_2024.csv')
print('Años únicos en el archivo:')
años = df['año'].value_counts().sort_index()
print(años)
print()
print(f'Total: {len(df)} registros')
print(f'2023: {len(df[df["año"] == 2023])}')
print(f'2024: {len(df[df["año"] == 2024])}')
print()
print('Primeros registros de cada año:')
for year in sorted(df['año'].unique()):
    sample = df[df['año'] == year].iloc[0] if len(df[df['año'] == year]) > 0 else None
    if sample is not None:
        print(f'  {year}: {sample["año"]}-{int(sample["mes"]):02d}, {sample["Direccion"]}')
