import csv
import re
import os

# Entrar al directorio correcto
os.chdir(r'c:\Users\gparra\TraficoMapGeneral')

input_file = r'public\data\robo automotor - Hoja 1.csv'
output_file = r'public\data\robos.csv'

print(f"📁 Archivo entrada: {input_file}")
print(f"📁 Existe: {os.path.exists(input_file)}")
print(f"📁 Tamaño: {os.path.getsize(input_file)} bytes")

valid_count = 0
rejected_count = 0
output_lines = ['lat,lng,fecha,resultado,observaciones']

try:
    with open(input_file, 'r', encoding='utf-8', errors='replace') as infile:
        reader = csv.reader(infile, delimiter=';')
        headers = next(reader)
        
        print(f"\n📊 Encabezados (columnas: {len(headers)}): {headers[:5]}...")
        
        for row_num, row in enumerate(reader, start=2):
            try:
                if not row or len(row) < 5:
                    rejected_count += 1
                    continue
                
                # Últimas columna tiene coordenadas
                coord_str = row[-1].strip()
                
                if not coord_str or len(coord_str) < 3:
                    rejected_count += 1
                    continue
                
                # Extraer números: "-38.032577, -57.5876566"
                numbers = re.findall(r'-?\d+\.?\d*', coord_str)
                
                if len(numbers) < 2:
                    rejected_count += 1
                    continue
                
                lat = float(numbers[0])
                lng = float(numbers[1])
                
                # Validar rango Argentina (-40 a -33 lat, -63 a -54 lng)
                if not (-40 <= lat <= -33 and -63 <= lng <= -54):
                    rejected_count += 1
                    continue
                
                año = row[2].strip() if len(row) > 2 else ''
                resultado = row[10].strip() if len(row) > 10 else ''
                tipo = row[4].strip() if len(row) > 4 else 'Robo'
                
                obs = f'{tipo}; {resultado}'
                output_lines.append(f'{lat},{lng},{año},{resultado},{obs}')
                valid_count += 1
                
            except Exception as e:
                rejected_count += 1
                if row_num <= 3:
                    print(f"⚠️ Error fila {row_num}: {str(e)[:50]}")
    
    # Guardar
    with open(output_file, 'w', newline='', encoding='utf-8') as f:
        f.write('\n'.join(output_lines))
    
    print(f'\n✅ COMPLETADO!')
    print(f'✅ Registros válidos: {valid_count}')
    print(f'❌ Registros rechazados: {rejected_count}')
    print(f'📊 Total: {valid_count + rejected_count}')
    print(f'📁 Archivo guardado: {output_file}')
    
except Exception as e:
    print(f'❌ Error fatal: {e}')
    import traceback
    traceback.print_exc()
