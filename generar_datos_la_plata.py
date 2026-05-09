#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Generador de datos de ejemplo para La Plata
Crea 500 registros de cada tipo respetando formatos exactos
"""

import random
import csv
from datetime import datetime, timedelta
import json

# Coordenadas base de La Plata
LAT_CENTER = -34.921
LNG_CENTER = -57.955
LAT_RANGE = 0.15  # ±0.15 grados
LNG_RANGE = 0.15

# Barrios de La Plata
BARRIOS = [
    "Centro", "Zona Norte", "Zona Sur", "Este", "Oeste",
    "Villa Elvira", "Tolosa", "Los Hornos", "Gonnet", "Abella",
    "Ángel Etcheverry", "Parque Saavedra", "Nueva República",
    "San Carlos", "Barrio Universitario", "Ringuelet"
]

TIPOS_SINIESTROS = ["choque", "caída", "atropellamiento", "volcamiento", "despiste"]
CAUSAS_SINIESTROS = ["D", "A", "EV", "MI", "NR", "PC", "VS", "?"]
PARTICIPANTES = ["A", "M", "P", "CAM", "B", "COL", "A/M", "M/P", "A/P"]

TIPOS_CAMARA = ["Pública (Municipal)", "Privada", "Seguimiento"]

ESTADOS_SEMAFORO = ["activo", "inactivo", "mantenimiento"]

TIPOS_ESCUELA = ["Escuela", "Colegio", "Instituto"]

LINEAS_COLECTIVOS = [1, 3, 5, 6, 7, 8, 9, 10, 12, 13, 15, 17, 19, 20, 21, 22, 23, 25, 27, 28, 29, 30, 32, 34, 36, 38, 39, 40, 41, 42]

def random_coord(center, range_val):
    """Genera coordenada aleatoria dentro de rango"""
    return center + random.uniform(-range_val, range_val)

def random_date(start_year=2024):
    """Genera fecha aleatoria"""
    start = datetime(start_year, 1, 1)
    end = datetime.now()
    delta = end - start
    random_days = random.randint(0, delta.days)
    return (start + timedelta(days=random_days)).strftime("%Y-%m-%d")

def generate_siniestros(filename, count=500):
    """Genera CSV de siniestros"""
    print(f"Generando {count} siniestros...")
    with open(filename, 'w', newline='', encoding='utf-8') as f:
        writer = csv.DictWriter(f, fieldnames=['lat', 'lng', 'nombre', 'tipo', 'fecha', 'causa', 'participantes', 'descripcion', 'barrio'])
        writer.writeheader()
        
        for i in range(count):
            lat = random_coord(LAT_CENTER, LAT_RANGE)
            lng = random_coord(LNG_CENTER, LNG_RANGE)
            writer.writerow({
                'lat': f"{lat:.6f}",
                'lng': f"{lng:.6f}",
                'nombre': f"Siniestro {i+1}",
                'tipo': random.choice(TIPOS_SINIESTROS),
                'fecha': random_date(),
                'causa': random.choice(CAUSAS_SINIESTROS),
                'participantes': random.choice(PARTICIPANTES),
                'descripcion': f"Evento de tráfico en La Plata #{i+1}",
                'barrio': random.choice(BARRIOS)
            })
    print(f"✅ {filename} creado con {count} registros")

def generate_cameras_publicas(filename, count=500):
    """Genera CSV de cámaras públicas"""
    print(f"Generando {count} cámaras públicas...")
    with open(filename, 'w', newline='', encoding='utf-8') as f:
        writer = csv.DictWriter(f, fieldnames=['camera_number', 'lat', 'lng', 'address', 'barrio', 'type', 'domes', 'fixed', 'lpr', 'corridor', 'school_corridor', 'monitoring'])
        writer.writeheader()
        
        for i in range(count):
            lat = random_coord(LAT_CENTER, LAT_RANGE)
            lng = random_coord(LNG_CENTER, LNG_RANGE)
            writer.writerow({
                'camera_number': 1000 + i,
                'lat': f"{lat:.6f}",
                'lng': f"{lng:.6f}",
                'address': f"Calle {random.randint(1, 150)} esquina {random.randint(1, 150)}",
                'barrio': random.choice(BARRIOS),
                'type': 'Pública (Municipal)',
                'domes': random.randint(1, 3),
                'fixed': random.randint(1, 4),
                'lpr': random.randint(0, 2),
                'corridor': f"Ruta {random.randint(1, 20)}",
                'school_corridor': random.choice(['TRUE', 'FALSE']),
                'monitoring': random.choice(['TRUE', 'FALSE'])
            })
    print(f"✅ {filename} creado con {count} registros")

def generate_cameras_privadas(filename, count=500):
    """Genera CSV de cámaras privadas"""
    print(f"Generando {count} cámaras privadas...")
    with open(filename, 'w', newline='', encoding='utf-8') as f:
        writer = csv.DictWriter(f, fieldnames=['nombre', 'lat', 'lng', 'address', 'barrio', 'tipo'])
        writer.writeheader()
        
        nombres = ["Escuela", "Comercio", "Farmacia", "Banco", "Hospital", "Oficina", "Fábrica", "Depósito", "Garage", "Supermercado"]
        
        for i in range(count):
            lat = random_coord(LAT_CENTER, LAT_RANGE)
            lng = random_coord(LNG_CENTER, LNG_RANGE)
            writer.writerow({
                'nombre': f"{random.choice(nombres)} {i+1}",
                'lat': f"{lat:.6f}",
                'lng': f"{lng:.6f}",
                'address': f"Calle {random.randint(1, 150)} #{random.randint(100, 9999)}",
                'barrio': random.choice(BARRIOS),
                'tipo': random.choice(TIPOS_ESCUELA + ['Comercio', 'Hospital', 'Banco'])
            })
    print(f"✅ {filename} creado con {count} registros")

def generate_semaforos(filename, count=500):
    """Genera CSV de semáforos"""
    print(f"Generando {count} semáforos...")
    with open(filename, 'w', newline='', encoding='utf-8') as f:
        writer = csv.DictWriter(f, fieldnames=['nombre', 'lat', 'lng', 'estado', 'barrio'])
        writer.writeheader()
        
        for i in range(count):
            lat = random_coord(LAT_CENTER, LAT_RANGE)
            lng = random_coord(LNG_CENTER, LNG_RANGE)
            writer.writerow({
                'nombre': f"Semáforo {i+1}",
                'lat': f"{lat:.6f}",
                'lng': f"{lng:.6f}",
                'estado': random.choice(ESTADOS_SEMAFORO),
                'barrio': random.choice(BARRIOS)
            })
    print(f"✅ {filename} creado con {count} registros")

def generate_robos(filename, count=500):
    """Genera CSV de robos automotor"""
    print(f"Generando {count} robos automotor...")
    with open(filename, 'w', newline='', encoding='utf-8') as f:
        writer = csv.DictWriter(f, fieldnames=['lat', 'lng', 'fecha', 'resultado', 'observaciones', 'año'])
        writer.writeheader()
        
        resultados = ["Asiste Policia y Libera", "Hallazgo de Automotor", "Sin Recurso Policial", "Intervencion Policial", "Recuperado"]
        
        for i in range(count):
            lat = random_coord(LAT_CENTER, LAT_RANGE)
            lng = random_coord(LNG_CENTER, LNG_RANGE)
            year = random.choice([2023, 2024])
            fecha = random_date(year)
            writer.writerow({
                'lat': f"{lat:.6f}",
                'lng': f"{lng:.6f}",
                'fecha': fecha,
                'resultado': random.choice(resultados),
                'observaciones': random.choice(BARRIOS),
                'año': year
            })
    print(f"✅ {filename} creado con {count} registros")

def generate_escuelas(filename, count=500):
    """Genera CSV de escuelas y colegios"""
    print(f"Generando {count} escuelas/colegios...")
    with open(filename, 'w', newline='', encoding='utf-8') as f:
        writer = csv.DictWriter(f, fieldnames=['nombre', 'lat', 'lng', 'address', 'barrio', 'tipo', 'nivel'])
        writer.writeheader()
        
        niveles = ["Primaria", "Secundaria", "Primaria y Secundaria", "Superior"]
        
        for i in range(count):
            lat = random_coord(LAT_CENTER, LAT_RANGE)
            lng = random_coord(LNG_CENTER, LNG_RANGE)
            writer.writerow({
                'nombre': f"Instituto {i+1}",
                'lat': f"{lat:.6f}",
                'lng': f"{lng:.6f}",
                'address': f"Calle {random.randint(1, 150)} #{random.randint(100, 9999)}",
                'barrio': random.choice(BARRIOS),
                'tipo': random.choice(TIPOS_ESCUELA),
                'nivel': random.choice(niveles)
            })
    print(f"✅ {filename} creado con {count} registros")

def generate_aforos(filename, count=500):
    """Genera CSV de aforos/flujo vehicular"""
    print(f"Generando {count} puntos de aforo...")
    with open(filename, 'w', newline='', encoding='utf-8') as f:
        writer = csv.DictWriter(f, fieldnames=['nombre', 'lat', 'lng', 'flujo_hora', 'velocidad_promedio', 'congestion', 'fecha'])
        writer.writeheader()
        
        for i in range(count):
            lat = random_coord(LAT_CENTER, LAT_RANGE)
            lng = random_coord(LNG_CENTER, LNG_RANGE)
            writer.writerow({
                'nombre': f"Aforo {i+1}",
                'lat': f"{lat:.6f}",
                'lng': f"{lng:.6f}",
                'flujo_hora': random.randint(50, 2000),
                'velocidad_promedio': random.randint(15, 60),
                'congestion': random.choice(['Bajo', 'Medio', 'Alto', 'Crítico']),
                'fecha': random_date()
            })
    print(f"✅ {filename} creado con {count} registros")

def generate_colectivos(filename, count=500):
    """Genera CSV de líneas de colectivos"""
    print(f"Generando {count} paradas de colectivos...")
    with open(filename, 'w', newline='', encoding='utf-8') as f:
        writer = csv.DictWriter(f, fieldnames=['numero_linea', 'lat', 'lng', 'parada', 'barrio', 'empresa'])
        writer.writeheader()
        
        empresas = ["UALP", "Transportes La Plata", "Central de Transportes", "Líneas Urbanas"]
        
        for i in range(count):
            lat = random_coord(LAT_CENTER, LAT_RANGE)
            lng = random_coord(LNG_CENTER, LNG_RANGE)
            writer.writerow({
                'numero_linea': random.choice(LINEAS_COLECTIVOS),
                'lat': f"{lat:.6f}",
                'lng': f"{lng:.6f}",
                'parada': f"Parada {i+1}",
                'barrio': random.choice(BARRIOS),
                'empresa': random.choice(empresas)
            })
    print(f"✅ {filename} creado con {count} registros")

def generate_lpr_cameras(filename, count=500):
    """Genera CSV de cámaras LPR (Lectoras de Patentes)"""
    print(f"Generando {count} cámaras LPR...")
    with open(filename, 'w', newline='', encoding='utf-8') as f:
        writer = csv.DictWriter(f, fieldnames=['id_camara', 'lat', 'lng', 'address', 'barrio', 'direccion_lectura', 'resolucion', 'activa'])
        writer.writeheader()
        
        direcciones = ["Norte-Sur", "Sur-Norte", "Este-Oeste", "Oeste-Este", "Ambas"]
        resoluciones = ["1080p", "2K", "4K", "5MP", "8MP"]
        
        for i in range(count):
            lat = random_coord(LAT_CENTER, LAT_RANGE)
            lng = random_coord(LNG_CENTER, LNG_RANGE)
            writer.writerow({
                'id_camara': f"LPR_{2000+i}",
                'lat': f"{lat:.6f}",
                'lng': f"{lng:.6f}",
                'address': f"Calle {random.randint(1, 150)} esquina {random.randint(1, 150)}",
                'barrio': random.choice(BARRIOS),
                'direccion_lectura': random.choice(direcciones),
                'resolucion': random.choice(resoluciones),
                'activa': random.choice(['TRUE', 'FALSE'])
            })
    print(f"✅ {filename} creado con {count} registros")

def generate_barrios(filename):
    """Genera GeoJSON de barrios de La Plata"""
    print("Generando GeoJSON de barrios...")
    
    # Polígonos simplificados de barrios de La Plata
    features = []
    
    barrios_coords = {
        "Centro": [
            [[-57.94, -34.91], [-57.93, -34.91], [-57.93, -34.92], [-57.94, -34.92], [-57.94, -34.91]]
        ],
        "Zona Norte": [
            [[-57.94, -34.88], [-57.93, -34.88], [-57.93, -34.90], [-57.94, -34.90], [-57.94, -34.88]]
        ],
        "Zona Sur": [
            [[-57.94, -34.93], [-57.93, -34.93], [-57.93, -34.95], [-57.94, -34.95], [-57.94, -34.93]]
        ],
        "Este": [
            [[-57.92, -34.91], [-57.91, -34.91], [-57.91, -34.92], [-57.92, -34.92], [-57.92, -34.91]]
        ],
        "Oeste": [
            [[-57.96, -34.91], [-57.95, -34.91], [-57.95, -34.92], [-57.96, -34.92], [-57.96, -34.91]]
        ],
    }
    
    for barrio, coords in barrios_coords.items():
        features.append({
            "type": "Feature",
            "geometry": {
                "type": "Polygon",
                "coordinates": coords
            },
            "properties": {
                "nombre": barrio,
                "zona": barrio,
                "color": f"#{random.randint(0, 0xFFFFFF):06x}"
            }
        })
    
    geojson = {
        "type": "FeatureCollection",
        "features": features
    }
    
    with open(filename, 'w', encoding='utf-8') as f:
        json.dump(geojson, f, indent=2, ensure_ascii=False)
    
    print(f"✅ {filename} creado con {len(features)} barrios")

def generate_corredores_escolares(filename):
    """Genera GeoJSON de corredores escolares"""
    print("Generando GeoJSON de corredores escolares...")
    
    features = []
    
    # 10 corredores escolares imaginarios
    for i in range(10):
        lat1 = random_coord(LAT_CENTER, LAT_RANGE)
        lng1 = random_coord(LNG_CENTER, LNG_RANGE)
        lat2 = lat1 + random.uniform(-0.05, 0.05)
        lng2 = lng1 + random.uniform(-0.05, 0.05)
        
        features.append({
            "type": "Feature",
            "geometry": {
                "type": "LineString",
                "coordinates": [
                    [lng1, lat1],
                    [lng2, lat2]
                ]
            },
            "properties": {
                "nombre": f"Corredor Escolar {i+1}",
                "tipo": "Corredor Escolar",
                "escuelas": f"Escuela {random.randint(1, 500)}, Escuela {random.randint(1, 500)}"
            }
        })
    
    geojson = {
        "type": "FeatureCollection",
        "features": features
    }
    
    with open(filename, 'w', encoding='utf-8') as f:
        json.dump(geojson, f, indent=2, ensure_ascii=False)
    
    print(f"✅ {filename} creado con {len(features)} corredores")

if __name__ == "__main__":
    base_path = "DATOS_EJEMPLO_LA_PLATA"
    
    print("🚀 Generando datos de ejemplo para La Plata...\n")
    
    # Generar todos los CSVs
    generate_siniestros(f"{base_path}/01_siniestros.csv", 500)
    generate_cameras_publicas(f"{base_path}/02_cameras_publicas.csv", 500)
    generate_cameras_privadas(f"{base_path}/03_cameras_privadas.csv", 500)
    generate_semaforos(f"{base_path}/04_semaforos.csv", 500)
    generate_robos(f"{base_path}/05_robos_automotor.csv", 500)
    generate_escuelas(f"{base_path}/06_escuelas_colegios.csv", 500)
    generate_aforos(f"{base_path}/07_aforos_flujo.csv", 500)
    generate_colectivos(f"{base_path}/08_colectivos_lineas.csv", 500)
    generate_lpr_cameras(f"{base_path}/09_cameras_lpr.csv", 500)
    
    # Generar GeoJSONs
    generate_barrios(f"{base_path}/10_barrios.geojson")
    generate_corredores_escolares(f"{base_path}/11_corredores_escolares.geojson")
    
    print("\n✅ ¡Todos los archivos generados exitosamente!")
    print(f"📁 Ubicación: {base_path}/")
