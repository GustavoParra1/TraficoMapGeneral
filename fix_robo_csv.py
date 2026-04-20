#!/usr/bin/env python3
# -*- coding: utf-8 -*-
import csv
import re
import os

# Buscar el archivo exacto
data_dir = "public/data"
robo_file = None

print(f"🔍 Buscando archivos en {data_dir}...")
for f in os.listdir(data_dir):
    if "robo" in f.lower():
        print(f"   Encontrado: {f}")
        robo_file = f

if not robo_file:
    print("❌ No se encontró archivo con 'robo' en el nombre")
    exit(1)

input_file = os.path.join(data_dir, robo_file)
output_file = os.path.join(data_dir, "robo_automotor_fixed.csv")

print(f"📂 Leyendo: {input_file}")

try:
    # Leer con detección automática de encoding
    with open(input_file, 'r', encoding='utf-8', errors='replace') as f:
        content = f.read()
    
    print(f"✅ Archivo leído: {len(content)} caracteres")
    
    # Separar por líneas
    lines = content.split('\n')
    print(f"📊 Total de líneas: {len(lines)}")
    
    # Mostrar primeras 5 líneas
    print("\n🔍 Primeras 5 líneas:")
    for i, line in enumerate(lines[:5]):
        print(f"  [{i}] {line[:80]}")
    
    # El formato original tiene los datos al final
    # Buscar dónde comienza "lat,lng,fecha"
    clean_data = []
    data_started = False
    
    for i, line in enumerate(lines):
        line = line.strip()
        if not line:
            continue
            
        # Si encontramos el nuevo formato, usar desde aquí
        if line.startswith('lat,lng,fecha'):
            data_started = True
            print(f"\n✅ Nuevo formato encontrado en línea {i}")
            clean_data.append(line)
            continue
        
        if data_started:
            if line and not line.startswith(','):
                clean_data.append(line)
    
    if not data_started:
        print("⚠️ No se encontró formato lat,lng. Intentando parsear los datos originales...")
        
        # Alternativamente, parsear los datos originales
        clean_data = []
        reader = csv.reader(lines[1:])
        
        for row_num, row in enumerate(reader):
            if row_num == 0:  # Encabezado
                continue
            
            if len(row) < 17:  # No hay suficientes columnas
                continue
            
            try:
                # Buscar las coordenadas
                # Generalmente en posiciones -2 y -1 o en "Longitud y Latitud"
                coords_str = ""
                
                # Intentar obtener de columna 16 (Longitud y Latitud)
                if len(row) > 16:
                    coords_str = row[16].strip()
                
                if coords_str and ',' in coords_str:
                    # Formato: "-38.032577, -57.5876566"
                    parts = coords_str.split(',')
                    if len(parts) >= 2:
                        lat = parts[0].strip()
                        lng = parts[1].strip()
                        fecha = f"2023-{int(row[2]):02d}-01" if len(row) > 2 else "2023-01-01"
                        resultado = row[10] if len(row) > 10 else "Robo"
                        obs = row[9] if len(row) > 9 else ""
                        
                        clean_line = f"{lat},{lng},{fecha},{resultado},{obs}"
                        clean_data.append(clean_line)
            except Exception as e:
                continue
    
    if clean_data:
        print(f"\n✅ {len(clean_data)} registros procesados")
        
        # Escribir en archivo temporal primero
        with open(output_file, 'w', encoding='utf-8', newline='') as f:
            f.write("lat,lng,fecha,resultado,observaciones\n")
            for line in clean_data[1:] if clean_data[0].startswith('lat,') else clean_data:
                f.write(line + "\n")
        
        print(f"✅ Archivo temporal guardado: {output_file}")
        
        # Ahora mover al archivo original
        import shutil
        final_file = os.path.join(data_dir, "robo automotor - Hoja 1.csv")
        shutil.copy(output_file, final_file)
        
        print(f"✅ Archivo final actualizado: {final_file}")
        
        # Verificar
        with open(input_file, 'r') as f:
            final_lines = f.readlines()
        print(f"✅ Verificación: {len(final_lines)} líneas (incluye encabezado)")
        print(f"   Primeras 3 líneas:")
        for line in final_lines[:3]:
            print(f"   {line.strip()}")
    else:
        print("❌ No se pudieron procesar los datos")
        
except Exception as e:
    print(f"❌ Error: {e}")
    import traceback
    traceback.print_exc()
