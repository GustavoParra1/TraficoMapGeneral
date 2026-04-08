#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Generar 600 cámaras para Córdoba capital
Con direcciones reales y coordenadas dentro de los bounds de Córdoba
"""

import csv
import random
from math import sin, cos, sqrt, atan2, radians

# Calles principales de Córdoba
CALLES_CORDOBA = [
    "9 de Julio", "Vélez Sársfield", "Rivadavia", "Duarte Quirós", 
    "Caseros", "Marcelo T. de Alvear", "Av. Hipólito Yrigoyen", 
    "Belgrano", "Junín", "Av. General Paz", "27 de Abril",
    "Entre Ríos", "La Rioja", "San Juan", "Córdoba",
    "Ituzaingó", "Av. Colón", "Av. Leandro N. Alem", "Av. Sabattini",
    "Pueyrredón", "San Luis", "San Martín", "Mendoza",
    "Chubut", "Corrientes", "Formosa", "Misiones",
    "Neuquén", "Río Negro", "Santa Cruz", "Santa Fe",
    "Tucumán", "Presidente Roca", "Fray Luis Beltrán",
    "Bv. Martín Rodríguez", "Av. Argentina", "Av. Maipú",
    "Av. Circunvalación", "Paso de los Andes", "Av. Recorridas",
    "Calle 2", "Calle 3", "Calle 4", "Calle 5",
    "Avenida Poeta Lugones", "Avenida Donato Álvarez",
    "Sarmiento", "Mitre", "Pinto", "Condarco", "Av. Colón"
]

NUMEROS_CALLE = list(range(100, 2500, 50))

# Barrios de Córdoba (reales)
BARRIOS_CORDOBA = [
    "Centro", "Nueva Córdoba", "Alta Córdoba", "Alberdi",
    "San Vicente", "Patricios", "Hipódromo", "Güemes",
    "Centro América", "San Martín", "Vélez Sársfield", "La Calera",
    "Argüello", "Residencial", "Del Carmen", "Bv. Marcelo T. de Alvear"
]

# Tipos de ubicación (tipo de lugar donde está la cámara)
UBICACIONES = [
    "Centro Comercial", "Banco", "Municipalidad", "Policía",
    "Supermercado", "Plaza Pública", "Parque", "Comercio",
    "Empresa Privada", "Escuela", "Hospital", "Edificio Público",
    "Parking", "Estación", "Tienda", "Farmacia",
    "Hotel", "Restaurante", "Cine", "Iglesia",
    "Biblioteca", "Museo", "Teatro", "Gimnasio",
    "Taller Mecánico", "Financiera", "Inmobiliaria", "Consultorios"
]

# Coordenadas de Córdoba (bounds)
LAT_MIN, LAT_MAX = -31.4400, -31.3850
LNG_MIN, LNG_MAX = -64.2200, -64.1350

def generar_coordenada():
    """Generar coordenada dentro de los bounds de Córdoba"""
    lat = random.uniform(LAT_MIN, LAT_MAX)
    lng = random.uniform(LNG_MIN, LNG_MAX)
    return round(lat, 4), round(lng, 4)

def generar_direccion():
    """Generar una dirección realista de Córdoba"""
    calle = random.choice(CALLES_CORDOBA)
    numero = random.choice(NUMEROS_CALLE)
    return f"{calle} {numero}"

def generar_600_camaras():
    """Generar 600 cámaras y guardar en CSV"""
    
    camaras = []
    
    # Empezar desde 100, generando 600 cámaras
    for i in range(600):
        camera_number = 100 + i
        lat, lng = generar_coordenada()
        address = generar_direccion()
        barrio = random.choice(BARRIOS_CORDOBA)
        ubicacion = random.choice(UBICACIONES)
        
        # domes: 0-2 (cantidad de domos)
        domes = random.randint(0, 2)
        
        # fixed: 0-2 (tipo de montaje)
        fixed = random.randint(0, 2)
        
        # lpr: 0-1 (reconocimiento de patentes)
        lpr = random.randint(0, 1)
        
        camara = {
            "camera_number": camera_number,
            "lat": lat,
            "lng": lng,
            "address": address,
            "barrio": barrio,
            "ubicacion": ubicacion,
            "domes": domes,
            "fixed": fixed,
            "lpr": lpr
        }
        
        camaras.append(camara)
        
        if (i + 1) % 100 == 0:
            print(f"✓ Generadas {i + 1} cámaras...")
    
    # Guardar en CSV
    output_path = r"c:\Users\gparra\TraficoMapGeneral\public\data\camaras_cordoba_ejemplo.csv"
    
    with open(output_path, 'w', newline='', encoding='utf-8') as f:
        writer = csv.DictWriter(f, fieldnames=["camera_number", "lat", "lng", "address", "barrio", "ubicacion", "domes", "fixed", "lpr"])
        writer.writeheader()
        writer.writerows(camaras)
    
    print(f"\n✅ {len(camaras)} cámaras guardadas en: {output_path}")
    return camaras

if __name__ == "__main__":
    generar_600_camaras()
