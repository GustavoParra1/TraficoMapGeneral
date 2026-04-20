#!/usr/bin/env python3
# -*- coding: utf-8 -*-

with open('public/data/robo automotor - Hoja 1.csv', 'r', encoding='utf-8') as f:
    lines = f.readlines()

print(f'Total de líneas: {len(lines)}')
print(f'Registros: {len(lines) - 1}')

# Contar años
years = {}
for line in lines[1:]:
    if line.strip():
        parts = line.split(',')
        if len(parts) >= 3:
            year = parts[2][:4]  # Extraer año de fecha
            years[year] = years.get(year, 0) + 1

print(f'\nDistribución por año:')
for year in sorted(years.keys()):
    print(f'  {year}: {years[year]} robos')

print(f'\nÚltimas 5 líneas:')
for line in lines[-5:]:
    print(f'  {line.strip()[:80]}')
