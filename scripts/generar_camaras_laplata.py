#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Generar cámaras públicas y privadas para La Plata
Con direcciones reales y coordenadas dentro de La Plata
"""

import csv
import random
import json
from datetime import datetime

# Calles principales de La Plata
CALLES_LAPLATA = [
    "7", "8", "9", "10", "11", "12", "13", "14", "15", "16",
    "17", "18", "19", "20", "21", "22", "23", "24", "25", "26",
    "27", "28", "29", "30", "31", "32", "33", "34", "35", "36",
    "37", "38", "39", "40", "41", "42", "43", "44", "45", "46",
    "47", "48", "50", "51", "52", "53", "54", "55", "56", "57",
    "58", "59", "60", "61", "62", "63", "64", "65", "66", "68",
    "69", "70", "71", "72", "Calle 1", "Calle 2", "Av. 7", "Av. 13",
    "Av. 1", "Av. 44", "Av. 72", "Diag. 73", "Diag. 74", "Diag. 77"
]

NUMEROS_CALLE = list(range(100, 3000, 50))

# Barrios reales de La Plata
BARRIOS_LAPLATA = [
    "Centro", "Casco Urbano", "Barrio Villa Elvira", "Barrio San Carlos",
    "Barrio Aeropuerto", "Barrio Tolosa", "Barrio República de la Ciencia",
    "Barrio Alberdi", "Barrio Rivadavia", "Barrio Arana",
    "Barrio Gonnet", "Barrio Ferlini", "Barrio Olivera", "Barrio Abella",
    "Barrio Circunvalación", "Barrio Lisandro de la Torre"
]

# Tipos de ubicación (tipo de lugar donde está la cámara)
UBICACIONES = [
    "Centro Comercial", "Banco", "Municipalidad", "Policía",
    "Supermercado", "Plaza Pública", "Parque", "Comercio",
    "Empresa Privada", "Escuela", "Hospital", "Edificio Público",
    "Parking", "Estación", "Tienda", "Farmacia",
    "Hotel", "Restaurante", "Edificio de Oficinas", "Iglesia",
    "Biblioteca", "Museo", "Teatro", "Laboratorio",
    "Clínica", "Financiera", "Inmobiliaria", "Consultorios",
    "Residencial", "Galería Comercial", "Gastronomía", "Entretenimiento"
]

# Coordenadas de La Plata
# Centro aprox: [-34.9, -57.956]
# Bounds: lat [-34.85, -34.95], lng [-57.90, -58.00]
LAT_MIN, LAT_MAX = -34.95, -34.85
LNG_MIN, LNG_MAX = -57.99, -57.92

def generar_coordenada():
    """Generar coordenada dentro de los bounds de La Plata"""
    lat = random.uniform(LAT_MIN, LAT_MAX)
    lng = random.uniform(LNG_MIN, LNG_MAX)
    return round(lat, 6), round(lng, 6)

def generar_direccion():
    """Generar una dirección realista de La Plata (calle/avenida + número)"""
    calle = random.choice(CALLES_LAPLATA)
    numero = random.choice(NUMEROS_CALLE)
    return f"Calle {calle} nº {numero}"

def generar_camaras_publicas_csv(cantidad=50):
    """Generar cámaras públicas en CSV"""
    filas = []
    
    for i in range(cantidad):
        camera_number = 1000 + i
        lat, lng = generar_coordenada()
        address = generar_direccion()
        barrio = random.choice(BARRIOS_LAPLATA)
        ubicacion = random.choice(UBICACIONES)
        
        domes = random.randint(0, 2)
        fixed = random.randint(0, 2)
        lpr = random.randint(0, 1)
        
        filas.append({
            'camera_number': camera_number,
            'lat': lat,
            'lng': lng,
            'address': address,
            'barrio': barrio,
            'ubicacion': ubicacion,
            'domes': domes,
            'fixed': fixed,
            'lpr': lpr
        })
    
    return filas

def generar_camaras_privadas_csv(cantidad=50):
    """Generar cámaras privadas en CSV"""
    filas = []
    
    for i in range(cantidad):
        camera_number = 2000 + i
        lat, lng = generar_coordenada()
        address = generar_direccion()
        barrio = random.choice(BARRIOS_LAPLATA)
        ubicacion = random.choice(UBICACIONES)
        
        domes = random.randint(0, 2)
        fixed = random.randint(0, 2)
        lpr = random.randint(0, 1)
        
        filas.append({
            'camera_number': camera_number,
            'lat': lat,
            'lng': lng,
            'address': address,
            'barrio': barrio,
            'ubicacion': ubicacion,
            'domes': domes,
            'fixed': fixed,
            'lpr': lpr
        })
    
    return filas

def guardar_csv(filas, filename):
    """Guardar datos en CSV"""
    if not filas:
        return
    
    headers = filas[0].keys()
    
    with open(filename, 'w', newline='', encoding='utf-8') as f:
        writer = csv.DictWriter(f, fieldnames=headers)
        writer.writeheader()
        writer.writerows(filas)
    
    print(f"✓ Guardado: {filename} ({len(filas)} filas)")

def guardar_geojson(filas, filename, tipo="público"):
    """Guardar datos en GeoJSON"""
    features = []
    
    for fila in filas:
        feature = {
            "type": "Feature",
            "geometry": {
                "type": "Point",
                "coordinates": [fila['lng'], fila['lat']]
            },
            "properties": {
                "camera_number": fila['camera_number'],
                "nombre": f"Cámara {fila['camera_number']}",
                "address": fila['address'],
                "barrio": fila['barrio'],
                "ubicacion": fila['ubicacion'],
                "tipo": tipo,
                "domes": fila['domes'],
                "fixed": fila['fixed'],
                "lpr": fila['lpr']
            }
        }
        features.append(feature)
    
    geojson = {
        "type": "FeatureCollection",
        "features": features
    }
    
    with open(filename, 'w', encoding='utf-8') as f:
        json.dump(geojson, f, indent=2, ensure_ascii=False)
    
    print(f"✓ Guardado: {filename} ({len(features)} features)")

def main():
    print("🎥 Generando cámaras para La Plata...")
    print(f"\n📍 Bounds: Lat [{LAT_MIN}, {LAT_MAX}], Lng [{LNG_MIN}, {LNG_MAX}]")
    
    # Generar cámaras públicas
    print("\n📷 Generando 50 cámaras PÚBLICAS...")
    camaras_publicas = generar_camaras_publicas_csv(50)
    guardar_csv(camaras_publicas, 'camaras_publicas_laplata.csv')
    guardar_geojson(camaras_publicas, 'camaras_publicas_laplata.geojson', 'público')
    
    # Generar cámaras privadas
    print("\n🔒 Generando 50 cámaras PRIVADAS...")
    camaras_privadas = generar_camaras_privadas_csv(50)
    guardar_csv(camaras_privadas, 'camaras_privadas_laplata.csv')
    guardar_geojson(camaras_privadas, 'camaras_privadas_laplata.geojson', 'privado')
    
    print("\n✅ Generación completada!")
    print("\n📊 Resumen:")
    print(f"   - Cámaras públicas: {len(camaras_publicas)} (CSV + GeoJSON)")
    print(f"   - Cámaras privadas: {len(camaras_privadas)} (CSV + GeoJSON)")
    print(f"   - Total: {len(camaras_publicas) + len(camaras_privadas)} cámaras")
    
    # Mostrar algunas coordenadas de ejemplo
    print("\n🎯 Ejemplos de coordenadas generadas:")
    print(f"   Cámara Pública 1: {camaras_publicas[0]['lat']}, {camaras_publicas[0]['lng']}")
    print(f"   Cámara Privada 1: {camaras_privadas[0]['lat']}, {camaras_privadas[0]['lng']}")

if __name__ == '__main__':
    main()
