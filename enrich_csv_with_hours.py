#!/usr/bin/env python3
"""
Script para enriquecer CSV de siniestros con columna 'hora'
Usa hash determinístico del nombre para generar las horas
"""

import csv
import hashlib

CSV_INPUT = r'DATOS_EJEMPLO_LA_PLATA\01_siniestros_50.csv'
CSV_OUTPUT = r'DATOS_EJEMPLO_LA_PLATA\01_siniestros_50.csv'

def get_deterministic_hour(nombre_siniestro, idx):
    """Genera hora determinística basada en hash del nombre"""
    nombre_hash = hashlib.md5(nombre_siniestro.encode()).hexdigest()
    hora = int(nombre_hash[:8], 16) % 24
    minuto = (idx * 7) % 60
    segundo = (idx * 13) % 60
    return f"{hora:02d}:{minuto:02d}"

# Leer CSV original
rows = []
with open(CSV_INPUT, 'r', encoding='utf-8') as f:
    reader = csv.DictReader(f)
    rows = list(reader)

# Enriquecer con horas
print(f"📂 Leyendo: {CSV_INPUT}")
print(f"✅ Leído: {len(rows)} registros")

# Agregar columna 'hora' a cada fila
for idx, row in enumerate(rows, 1):
    nombre = row.get('nombre', f'Siniestro {idx}')
    hora = get_deterministic_hour(nombre, idx)
    row['hora'] = hora
    if idx <= 10 or idx > 45:
        print(f"  🕐 [{idx}] {nombre:15s} → {hora}")

# Escribir CSV enriquecido con nueva columna
fieldnames = ['lat', 'lng', 'nombre', 'hora', 'descripcion_tipo', 'fecha', 'causa', 'participantes', 'descripcion', 'barrio']

with open(CSV_OUTPUT, 'w', newline='', encoding='utf-8') as f:
    writer = csv.DictWriter(f, fieldnames=fieldnames)
    writer.writeheader()
    writer.writerows(rows)

print(f"\n✅ CSV enriquecido guardado: {CSV_OUTPUT}")
print(f"📋 Nuevas columnas (en orden): {', '.join(fieldnames)}")
print(f"⏰ Todas las 50 siniestros tienen hora determinística (00:00-23:59)")
