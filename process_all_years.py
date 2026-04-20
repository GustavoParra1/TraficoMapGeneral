import csv
import pandas as pd

input_file = r'c:\Users\gparra\TraficoMapGeneral\public\data\robo_automotor_2023_2024.csv'
output_file = r'c:\Users\gparra\TraficoMapGeneral\public\data\robos_final.csv'

print("📖 Leyendo CSV manualmente...")
registros = []

with open(input_file, 'r', encoding='utf-8') as f:
    reader = csv.reader(f)
    header = next(reader)
    print(f"Encabezado: {len(header)} columnas")
    
    for row_num, row in enumerate(reader, 1):
        if len(row) >= 18:
            try:
                año = int(float(row[2]))
                mes = int(float(row[3]))
                resultado = row[10].strip() if len(row) > 10 else ""
                direccion = row[9].strip() if len(row) > 9 else ""
                
                # Las últimas 2 columnas (17 y 18) son lat/lng
                lat = None
                lng = None
                
                try:
                    lat = float(row[17].strip())
                except:
                    pass
                
                try:
                    lng = float(row[18].strip())
                except:
                    pass
                
                # Validar coordenadas (rango Argentina)
                if lat and lng and -56 < lat < -20 and -75 < lng < -50:
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
                pass

print(f"✅ Procesados {len(registros)} registros válidos")

# Verificar años
df = pd.DataFrame(registros)
if len(df) > 0:
    print(f"\n📊 Distribución por año:")
    print(df['año'].value_counts().sort_index())
    
    # Guardar
    df.to_csv(output_file, index=False)
    print(f"\n💾 Guardados en: {output_file}")
else:
    print("❌ No se encontraron registros válidos")
