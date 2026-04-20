import csv

input_file = r'c:\Users\gparra\TraficoMapGeneral\public\data\robo_automotor_2023_2024.csv'
output_file = r'c:\Users\gparra\TraficoMapGeneral\public\data\robos_final.csv'

print("📖 Leyendo CSV manualmente...")
registros = []

with open(input_file, 'r', encoding='utf-8') as f:
    reader = csv.reader(f)
    header = next(reader)
    print(f"Encabezado tiene {len(header)} columnas")
    
    for row_num, row in enumerate(reader, 1):
        if row_num <= 3:
            print(f"\nFila {row_num}: {len(row)} campos")
            print(f"  {row}")
        
        if len(row) >= 16:
            # Intentar extraer datos
            try:
                año = int(float(row[2]))
                mes = int(float(row[3]))
                resultado = row[10]
                direccion = row[9]
                
                # Las últimas 2 columnas numerosas deben ser lat/lng
                # Buscar números negativos grandes
                lat = None
                lng = None
                
                for i in range(len(row)-1, max(len(row)-10, -1), -1):
                    try:
                        val = float(row[i].strip())
                        if -56 < val < -20 and lat is None:
                            lat = val
                        elif -75 < val < -50 and lng is None:
                            lng = val
                    except:
                        pass
                
                if lat and lng and row_num <= 3:
                    print(f"  Lat: {lat}, Lng: {lng}")
                
                if lat and lng:
                    fecha = f"{año}-{mes:02d}-01"
                    registros.append({
                        'lat': lat,
                        'lng': lng,
                        'fecha': fecha,
                        'resultado': resultado,
                        'observaciones': direccion,
                        'año': año
                    })
            except Exception as e:
                if row_num <= 3:
                    print(f"  Error: {e}")

print(f"\n✅ Procesados {len(registros)} registros válidos")

# Guardar
import pandas as pd
df = pd.DataFrame(registros)
df.to_csv(output_file, index=False)
print(f"Guardados en: {output_file}")
