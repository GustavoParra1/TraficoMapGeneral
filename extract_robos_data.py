#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Procesa el CSV de robos usando csv.reader para parsear correctamente
"""
import csv
import os

data_dir = "public/data"
input_file = os.path.join(data_dir, "robo automotor - Hoja 1.csv")

# Hay dos versiones: una limpia (38 bytes) y una grande (649 KB)
# Usar la más grande
files = []
for f in os.listdir(data_dir):
    if "robo" in f.lower() and "hoja" in f.lower():
        fpath = os.path.join(data_dir, f)
        size = os.path.getsize(fpath)
        files.append((fpath, size, f))

files.sort(key=lambda x: -x[1])  # Ordenar por tamaño descendente

if not files:
    print("❌ No hay archivos de robos")
    exit(1)

print(f"Archivos encontrados:")
for fpath, size, name in files:
    print(f"  - {name}: {size:,} bytes")

# Usar el más grande
input_file = files[0][0]
print(f"\n📂 Procesando: {os.path.basename(input_file)} ({files[0][1]:,} bytes)")

try:
    # Leer con csv.reader
    robos = []
    skipped = 0
    
    with open(input_file, 'r', encoding='latin-1', errors='ignore') as f:
        reader = csv.reader(f)
        
        # Leer encabezado
        header = next(reader)
        print(f"📋 Encabezado: {len(header)} columnas")
        
        # Mostrar últimas columnas (donde están las coordenadas)
        print("    Últimas 5 columnas:")
        for col in header[-5:]:
            print(f"      - {col}")
        
        # Procesar datos
        for row_num, row in enumerate(reader):
            if row_num % 500 == 0:
                print(f"  Procesando fila {row_num}...", end='\r')
            
            if len(row) < 16:
                skipped += 1
                continue
            
            try:
                # Buscar columnas de coordenadas
                # Pueden estar en posiciones variadas, buscar en valores numéricos
                lat, lng = None, None
                
                # Intentar en posiciones comunes
                for pos in [16, 17, 18, 15, 19]:
                    if pos < len(row):
                        val = row[pos].strip()
                        # Check if it looks like coordinates
                        if val and ',' not in val and any(c.isdigit() or c == '-' or c == '.' for c in val):
                            try:
                                num = float(val.replace(',', '.'))
                                if -40 <= num <= -33:  # Latitud Argentina
                                    lat = num
                                elif -64 <= num <= -53:  # Longitud Argentina
                                    lng = num
                            except:
                                pass
                
                # Si encontramos ambas coordenadas
                if lat is not None and lng is not None:
                    fecha = "2023-01-01"
                    if len(row) > 3:
                        try:
                            mes = int(row[3].strip())
                            fecha = f"2023-{mes:02d}-01"
                        except:
                            pass
                    
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
        
        print(f"✅ Verificación: {len(lines)} líneas totales")
        print("   Muestra:")
        for line in lines[1:4]:
            print(f"     {line.strip()}")
    else:
        print("❌ No se extrajeron robos")
        
except Exception as e:
    print(f"❌ Error: {e}")
    import traceback
    traceback.print_exc()
