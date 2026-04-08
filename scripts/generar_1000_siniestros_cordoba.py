#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Generar 1000 siniestros ficticios para Córdoba capital
Con direcciones reales y coordenadas dentro de los bounds de Córdoba
"""

import csv
import random
from datetime import datetime, timedelta

# Direcciones reales de Córdoba (calles principales)
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
    "Sarmiento", "Mitre", "Pinto", "Condarco"
]

NUMEROS_CALLE = list(range(100, 2500, 50))

# Intersecciones populares para generar direcciones
INTERSECCIONES = [
    ("9 de Julio", "Marcelo T. de Alvear"),
    ("Vélez Sársfield", "Caseros"),
    ("Rivadavia", "Duarte Quirós"),
    ("Belgrano", "Junín"),
    ("Av. Colón", "Entre Ríos"),
    ("Av. Hipólito Yrigoyen", "La Rioja"),
    ("San Juan", "Ituzaingó"),
    ("Pueyrredón", "San Luis"),
    ("Av. Leandro N. Alem", "Belgrano"),
    ("Av. Argentina", "Corrientes"),
]

# Códigos de causa (válidos)
CAUSAS = [
    "D",  # Desconocida
    "A",  # Atropello
    "AV",  # Accidente vehicular
    "EV",  # Exceso de velocidad
    "FV",  # Falta de visibilidad
    "G",  # Giro indebido
    "MI",  # Mala iluminación
    "MR",  # Mala ruta
    "NR",  # No respeta semáforo
    "NSD", # No se detiene
    "P",   # Polizontes/carga
    "PC",  # Poca concentración
    "PI",  # Peatón imprudente
    "VS",  # Velocidad sesgo
    "DF",  # Desperfecto del freno
    "DESCOMPENSAN",  # Descompensación del conductor
    "IC",  # Imprudencia del conductor
    "PERSECUCIÓN",  # Persecución policial
    "?"   # Indefinido
]

# Códigos de participantes (válidos)
PARTICIPANTES = [
    "A",        # Auto
    "M",        # Moto
    "P",        # Peatón
    "CAM",      # Camión
    "B",        # Bicicleta
    "COL",      # Colectivo
    "CTA",      # Camioneta
    "BOMBEROS", # Bomberos
    "PERRO",    # Perro
    "POLICIA",  # Policía
    "MONOPATIN",# Monopatín
    "AMB",      # Ambulancia
    "PATRULLA", # Patrulla
    "CABALLO"   # Caballo
]

# Descripciones de siniestros según tipo
DESCRIPCIONES = {
    "AV": [
        "Choque frontal entre dos vehículos",
        "Colisión por alcance",
        "Choque en intersección",
        "Choque lateral",
        "Vuelco de vehículo",
    ],
    "EV": [
        "Accidente por exceso de velocidad",
        "Choque a alta velocidad",
        "Pérdida de control por velocidad",
    ],
    "A": [
        "Atropello de peatón",
        "Atropello fatal",
        "Atropello con lesiones",
        "Atropello sin respeto de semáforo",
    ],
    "P": [
        "Peatón imprudente cruzando",
        "Peatón distraído",
        "Cruce indebido de peatón",
    ],
    "G": [
        "Giro indebido",
        "Giro sin señalizar",
        "Giro en zona prohibida",
    ],
    "NSD": [
        "No se detiene en semáforo en rojo",
        "No se detiene en ALTO",
        "No respeta paso de peatones",
    ],
    "PC": [
        "Poca concentración del conductor",
        "Conductor distraído",
        "Conductor cansado",
    ],
    "FV": [
        "Falta de visibilidad por lluvia",
        "Falta de visibilidad por niebla",
        "Falta de visibilidad por polvareda",
    ],
    "MI": [
        "Mala iluminación de calle",
        "Mala iluminación del vehículo",
        "Falta de iluminación nocturna",
    ]
}

# Coordenadas de Córdoba (bounds)
LAT_MIN, LAT_MAX = -31.4400, -31.3850
LNG_MIN, LNG_MAX = -64.2200, -64.1350

# Fechas variadas en 2024 (abril a diciembre)
FECHA_INICIO = datetime(2024, 4, 1)
FECHA_FIN = datetime(2024, 12, 31)

def generar_coordenada():
    """Generar coordenada dentro de los bounds de Córdoba"""
    lat = random.uniform(LAT_MIN, LAT_MAX)
    lng = random.uniform(LNG_MIN, LNG_MAX)
    return round(lat, 4), round(lng, 4)

def generar_direccion():
    """Generar una dirección realista de Córdoba"""
    if random.random() < 0.3:  # 30% con intersección
        calle1, calle2 = random.choice(INTERSECCIONES)
        return f"{calle1} y {calle2}"
    else:  # 70% con calle y número
        calle = random.choice(CALLES_CORDOBA)
        numero = random.choice(NUMEROS_CALLE)
        return f"{calle} {numero}"

def generar_participantes():
    """Generar combinación de participantes"""
    count = random.randint(1, 3)
    partes = random.sample(PARTICIPANTES, min(count, len(PARTICIPANTES)))
    return "/".join(partes)

def generar_descripcion(causa):
    """Generar descripción según causa"""
    descripciones = DESCRIPCIONES.get(causa, ["Siniestro vial"])
    return random.choice(descripciones)

def generar_fecha():
    """Generar fecha aleatoria en el rango"""
    tiempo_entre = FECHA_FIN - FECHA_INICIO
    dias_random = random.randint(0, tiempo_entre.days)
    fecha_random = FECHA_INICIO + timedelta(days=dias_random)
    return fecha_random.strftime("%m/%d/%Y")

def generar_1000_siniestros():
    """Generar 1000 siniestros y guardar en CSV"""
    
    siniestros = []
    
    for i in range(1000):
        lat, lng = generar_coordenada()
        nombre = generar_direccion()
        causa = random.choice(CAUSAS)
        participantes = generar_participantes()
        fecha = generar_fecha()
        descripcion = generar_descripcion(causa)
        
        siniestro = {
            "lat": lat,
            "lng": lng,
            "nombre": nombre,
            "causa": causa,
            "participantes": participantes,
            "fecha": fecha,
            "descripcion": descripcion
        }
        
        siniestros.append(siniestro)
        
        if (i + 1) % 100 == 0:
            print(f"✓ Generados {i + 1} siniestros...")
    
    # Guardar en CSV
    output_path = r"c:\Users\gparra\TraficoMapGeneral\public\data\siniestros_cordoba_1000.csv"
    
    with open(output_path, 'w', newline='', encoding='utf-8') as f:
        writer = csv.DictWriter(f, fieldnames=["lat", "lng", "nombre", "causa", "participantes", "fecha", "descripcion"])
        writer.writeheader()
        writer.writerows(siniestros)
    
    print(f"\n✅ {len(siniestros)} siniestros guardados en: {output_path}")
    return siniestros

if __name__ == "__main__":
    generar_1000_siniestros()
