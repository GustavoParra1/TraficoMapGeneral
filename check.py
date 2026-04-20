import pandas as pd
df = pd.read_csv('public/data/robo_automotor_2023_2024.csv')
print('Primeros 3 ENLACE:')
for i in range(3):
    print(f'{i}: {repr(df["ENLACE"].iloc[i])}')
print()
print('Parsing ENLACE[0]:')
enlace = df['ENLACE'].iloc[0]
parts = enlace.split(',')
print(f'Parts: {parts}')
print(f'Len: {len(parts)}')
for j, p in enumerate(parts):
    print(f'  [{j}]: {repr(p)}')
