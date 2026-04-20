#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Extrae robos de TODOS los años del CSV (2023, 2024, etc)
"""
import csv
import os

data_dir = "public/data"

# Buscar el archivo más grande
files = []
for f in os.listdir(data_dir):
    if "robo" in f.lower() and "hoja" in f.lower():
        fpath = os.path.join(data_dir, f)
        size = os.path.getsize(fpath)
        if size > 100000:
            files.append((fpath, size, f))

files.sort(key=lambda x: -x[1])

if not files:
    print("❌ No hay archivos de robos grandes")
    exit(1)

input_file = files[0][0]
print(f"📂 Procesando: {os.path.basename(input_file)} ({files[0][1]:,} bytes)")

try:
    robos = []
    skipped = 0
    years_found = set()
    
    with open(input_file, 'r', encoding='latin-1', errors='ignore') as f:
        reader = csv.reader(f)
        
        header = next(reader)
        print(f"📋 Encabezado: {len(header)} columnas")
        print(f"   [2] = {header[2]} (AÑO)")
        print(f"   [3] = {header[3]} (MES)")
        
        # Procesar datos
        for row_num, row in enumerate(reader):
            if row_num % 500 == 0:
                print(f"  Procesando fila {row_num}...", end='\r')
            
            if len(row) < 16:
                skipped += 1
                continue
            
            try:
                # Extraer coordenadas de columna 15 "Longitud y Latitud"
                lat, lng = None, None
                
                coords_text = row[15].strip() if len(row) > 15 else ""
                
                # El formato es: "-38.032577, -57.5876566"
                if coords_text:
                    parts = [p.strip() for p in coords_text.split(',')]
                    if len(parts) >= 2:
                        try:
                            lat = float(parts[0])
                            lng = float(parts[1])
                            
                            # Validar rangos Argentina
                            if not (-40 <= lat <= -33 and -64 <= lng <= -53):
                                lat, lng = None, None
                        except:
                            pass
                
                if lat is not None and lng is not None:
                    # Extraer año y mes
                    year = None
                    month = None
                    
                    if len(row) > 2:
                        try:
                            year = int(row[2].strip())
                            years_found.add(year)
                        except:
                            year = 2023
                    
                    if len(row) > 3:
                        try:
                            month = int(row[3].strip())
                        except:
                            month = 1
                    
                    # Construir fecha
                    if year:
                        fecha = f"{year}-{month:02d}-01" if month else f"{year}-01-01"
                    else:
                        fecha = "2023-01-01"
                    
                    resultado = row[10].strip() if len(row) > 10 else "Robo"
                    obs = row[9].strip() if len(row) > 9 else ""
                    
                    robos.append({
                        'lat': lat,
                        'lng': lng,
                        'fecha': fecha,
                        'resultado': resultado,
                        'observaciones': obs
                    })
                else:
                    skipped += 1
            except Exception as e:
                skipped += 1
                continue
    
    print(f"\n✅ Robos extraídos: {len(robos)}")
    print(f"⚠️  Saltados: {skipped}")
    print(f"📅 Años encontrados: {sorted(years_found)}")
    
    # Contar por año
    years_count = {}
    for robo in robos:
        year = robo['fecha'][:4]
        years_count[year] = years_count.get(year, 0) + 1
    
    print(f"\n📊 Distribución por año:")
    for year in sorted(years_count.keys()):
        print(f"   {year}: {years_count[year]:,} robos")
    
    if robos:
        # Escribir archivo
        output_file = os.path.join(data_dir, "robo automotor - Hoja 1.csv")
        
        with open(output_file, 'w', encoding='utf-8', newline='') as f:
            f.write("lat,lng,fecha,resultado,observaciones\n")
            for robo in robos:
                f.write(f"{robo['lat']},{robo['lng']},{robo['fecha']},{robo['resultado']},{robo['observaciones']}\n")
        
        print(f"\n✅ Archivo guardado: {output_file}")
        
        # Verificar
        with open(output_file, 'r') as f:
            lines = f.readlines()
        
        print(f"✅ Total: {len(lines)-1} registros")
        print("   Ejemplos:")
        
        # Mostrar ejemplos de diferentes años
        shown_2023 = False
        shown_2024 = False
        
        for line in lines[1:]:
            if '2023' in line and not shown_2023:
                print(f"     2023: {line.strip()[:60]}...")
                shown_2023 = True
            if '2024' in line and not shown_2024:
                print(f"     2024: {line.strip()[:60]}...")
                shown_2024 = True
            if shown_2023 and shown_2024:
                break
    else:
        print("❌ No se extrajeron robos")
        
except Exception as e:
    print(f"❌ Error: {e}")
    import traceback
    traceback.print_exc()
