#!/usr/bin/env python3
import re

input_file = r'c:\Users\gparra\TraficoMapGeneral\public\data\robo automotor - Hoja 1.csv'
output_file = r'c:\Users\gparra\TraficoMapGeneral\public\data\robos.csv'

print(f"Leyendo: {input_file}")

valid_count = 0
rejected_count = 0
output_lines = ['lat,lng,fecha,resultado,observaciones']

try:
    with open(input_file, 'r', encoding='utf-8', errors='replace') as f:
        all_lines = f.readlines()
    
    print(f"Total de líneas: {len(all_lines)}")
    
    # Saltar header (primera línea)
    for i, line in enumerate(all_lines[1:], start=2):
        line = line.strip()
        if not line:
            continue
        
        # Dividir por semicolon
        fields = line.split(';')
        
        if len(fields) < 16:
            rejected_count += 1
            continue
        
        # Las coordenadas están en el último campo
        coord_str = fields[-1].strip()
        
        if not coord_str or len(coord_str) < 3:
            rejected_count += 1
            continue
        
        # Extraer números
        numbers = re.findall(r'-?\d+\.?\d*', coord_str)
        
        if len(numbers) < 2:
            rejected_count += 1
            continue
        
        try:
            lat = float(numbers[0])
            lng = float(numbers[1])
            
            # Validar rango
            if not (-40 <= lat <= -33 and -63 <= lng <= -54):
                rejected_count += 1
                continue
            
            año = fields[2].strip() if len(fields) > 2 else ''
            resultado = fields[10].strip() if len(fields) > 10 else ''
            tipo = fields[4].strip() if len(fields) > 4 else 'Robo'
            
            obs = f'{tipo}; {resultado}'
            output_lines.append(f'{lat},{lng},{año},{resultado},{obs}')
            valid_count += 1
            
            if valid_count % 500 == 0:
                print(f"  ✓ {valid_count} registros procesados...")
        
        except:
            rejected_count += 1
    
    # Guardar
    with open(output_file, 'w', encoding='utf-8') as f:
        f.write('\n'.join(output_lines))
    
    print(f'\n✅ COMPLETADO!')
    print(f'✅ Válidos: {valid_count}')
    print(f'❌ Rechazados: {rejected_count}')
    print(f'📁 Guardado: {output_file}')

except Exception as e:
    print(f'❌ Error: {e}')
    import traceback
    traceback.print_exc()
