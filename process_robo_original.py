#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Procesa el CSV de robos original y extrae coordenadas
"""
import os
import re

# Buscar el archivo original (649 KB)
data_dir = "public/data"
original_file = None

for f in os.listdir(data_dir):
    if "robo" in f.lower() and "hoja" in f.lower():
        fpath = os.path.join(data_dir, f)
        size = os.path.getsize(fpath)
        print(f"📂 {f} - {size:,} bytes")
        
        if size > 600000:  # Más de 600 KB
            original_file = fpath
            print(f"✅ Archivo original encontrado (grande)")

if not original_file:
    print("❌ No se encontró el archivo original")
    exit(1)

print(f"\n🔍 Leyendo: {original_file}")

try:
    # Leer el archivo
    with open(original_file, 'r', encoding='latin-1', errors='replace') as f:
        lines = f.readlines()
    
    print(f"📊 Total de líneas: {len(lines)}")
    
    # Analizar estructura
    print("\n🔍 Primeras 5 líneas:")
    for i in range(min(5, len(lines))):
        print(f"  [{i}] {lines[i][:100]}")
    
    # Procesar datos
    clean_data = []
    
    # Línea de encabezado
    header = lines[0].strip()
    headers = [h.strip().lower() for h in header.split(',')]
    
    print(f"\n📋 Encabezados ({len(headers)} columnas):")
    for i, h in enumerate(headers[-5:]):
        print(f"  [{len(headers)-5+i}] {h}")
    
    # Procesar datos
    skipped = 0
    for line_num in range(1, len(lines)):
        line = lines[line_num].strip()
        if not line:
            continue
        
        try:
            # Dividir por comas (simple, podría mejorar con CSV parser)
            parts = line.split(',')
            
            if len(parts) < 17:  # Necesitamos al menos hasta la columna de coordenadas
                skipped += 1
                continue
            
            # Extraer coordenadas
            # El archivo Excel tiene "Longitud y Latitud" en la columna 16
            coords_text = parts[16].strip() if len(parts) > 16 else ""
            
            # Formato: "-38.032577, -57.5876566" o similar
            if coords_text:
                # Separar por comas dentro de las coordenadas
                coord_parts = [p.strip() for p in coords_text.split(',')]
                
                if len(coord_parts) >= 2:
                    try:
                        lat = float(coord_parts[0])
                        lng = float(coord_parts[1])
                        
                        # Validar rango Argentina
                        if -40 <= lat <= -33 and -64 <= lng <= -53:
                            fecha = "2023-01-01"  # Default
                            
                            # Intentar obtener fecha
                            if len(parts) > 3:
                                try:
                                    mes = int(parts[2].strip())
                                    fecha = f"2023-{mes:02d}-01"
                                except:
                                    pass
                            
                            resultado = parts[10].strip() if len(parts) > 10 else "Robo"
                            obs = parts[9].strip() if len(parts) > 9 else ""
                            
                            clean_line = f"{lat},{lng},{fecha},{resultado},{obs}"
                            clean_data.append(clean_line)
                    except ValueError:
                        skipped += 1
                        continue
        except Exception as e:
            skipped += 1
            continue
    
    print(f"\n✅ Procesados: {len(clean_data)} registro ")
    print(f"⚠️  Saltados: {skipped}")
    
    # Escribir archivo limpio
    output_file = os.path.join(data_dir, "robo automotor - Hoja 1.csv")
    
    with open(output_file, 'w', encoding='utf-8', newline='') as f:
        f.write("lat,lng,fecha,resultado,observaciones\n")
        for line in clean_data:
            f.write(line + "\n")
    
    print(f"\n✅ Archivo guardado: {output_file}")
    
    # Verificar
    with open(output_file, 'r') as f:
        final_lines = f.readlines()
    print(f"✅ Verificación: {len(final_lines)} líneas (incluye encabezado)")
    print("   Muestra:")
    for line in final_lines[1:4]:
        print(f"     {line.strip()}")
    
except Exception as e:
    print(f"❌ Error: {e}")
    import traceback
    traceback.print_exc()
