#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Extrae robos de TODOS los años disponibles en el CSV
"""
import csv
import os

data_dir = "public/data"

# Buscar el archivo más grande (original)
files = []
for f in os.listdir(data_dir):
    if "robo" in f.lower() and "hoja" in f.lower():
        fpath = os.path.join(data_dir, f)
        size = os.path.getsize(fpath)
        if size > 100000:  # Solo archivos grandes
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
        
        # Leer encabezado
        header = next(reader)
        print(f"📋 Encabezado: {len(header)} columnas")
        
        # Encontrar índices de columnas importantes
        year_col = None
        month_col = None
        
        for i, col in enumerate(header):
            col_lower = col.lower()
            if 'año' in col_lower or 'year' in col_lower:
                year_col = i
                print(f"   Columna de AÑO: [{i}] {col}")
            if 'mes' in col_lower or 'month' in col_lower:
                month_col = i
                print(f"   Columna de MES: [{i}] {col}")
        
        # Procesar datos
        for row_num, row in enumerate(reader):
            if row_num % 500 == 0:
                print(f"  Procesando fila {row_num}...", end='\r')
            
            if len(row) < 16:
                skipped += 1
                continue
            
            try:
                # Buscar columnas de coordenadas
                lat, lng = None, None
                
                for pos in [16, 17, 18, 15, 19]:
                    if pos >= len(row):
                        continue
                    val = row[pos].strip()
                    if val and ',' not in val:
                        try:
                            num = float(val.replace(',', '.'))
                            if -40 <= num <= -33:
                                lat = num
                            elif -64 <= num <= -53:
                                lng = num
                        except:
                            pass
                
                if lat is not None and lng is not None:
                    # Construcción de fecha
                    fecha = "2023-01-01"
                    
                    year = None
                    month = None
                    
                    # Extraer año
                    if year_col is not None and year_col < len(row):
                        try:
                            year = int(row[year_col].strip())
                            years_found.add(year)
                        except:
                            pass
                    
                    # Extraer mes
                    if month_col is not None and month_col < len(row):
                        try:
                            month = int(row[month_col].strip())
                        except:
                            pass
                    
                    # Construir fecha
                    if year is not None:
                        if month is not None:
                            fecha = f"{year}-{month:02d}-01"
                        else:
                            fecha = f"{year}-01-01"
                    
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
        print(f"   {year}: {years_count[year]} robos")
    
    if robos:
        # Escribir archivo limpio
        output_file = os.path.join(data_dir, "robo automotor - Hoja 1.csv")
        
        with open(output_file, 'w', encoding='utf-8', newline='') as f:
            f.write("lat,lng,fecha,resultado,observaciones\n")
            for robo in robos:
                f.write(f"{robo['lat']},{robo['lng']},{robo['fecha']},{robo['resultado']},{robo['observaciones']}\n")
        
        print(f"\n✅ Archivo guardado: {output_file}")
        
        # Verificar
        with open(output_file, 'r') as f:
            lines = f.readlines()
        
        print(f"✅ Verificación: {len(lines)} líneas totales ({len(lines)-1} registros)")
        print("   Muestra de diferentes años:")
        
        # Mostrar algunos ejemplos de 2023 y 2024 si existen
        for line in lines[1:]:
            if '2024' in line or '2023' in line:
                print(f"     {line.strip()}")
                break
        
        for line in lines[1:]:
            if '2024' in line:
                print(f"     {line.strip()}")
                break
    else:
        print("❌ No se extrajeron robos")
        
except Exception as e:
    print(f"❌ Error: {e}")
    import traceback
    traceback.print_exc()
