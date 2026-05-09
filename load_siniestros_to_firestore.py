#!/usr/bin/env python3
"""
Script para cargar siniestros desde CSV a Firestore
Genera timestamps DETERMINÍSTICOS (no aleatorios) basados en hash del siniestro
Esto asegura que siempre se generen LAS MISMAS horas para MISMO CSV
"""

import csv
import firebase_admin
from firebase_admin import credentials, firestore
import json
from pathlib import Path
import os
import hashlib

# Buscar credenciales en variaciones posibles
cred_paths = [
    'cred.json',
    '../cred.json',
    os.path.expanduser('~/.firebase/cred.json'),
    'C:\\Users\\gparra\\.firebase\\cred.json',
    'trafico-map-general-v2-firebase-adminsdk-fbsvc-28104b7758.json',
    'trafico-map-general-v2-firebase-adminsdk-key.json',
    'service-account-key.json',
    'serviceAccountKey.json'
]

cred_file = None
for path in cred_paths:
    if os.path.exists(path):
        cred_file = path
        break

if not cred_file:
    print("❌ No se encontró archivo de credenciales (cred.json)")
    print("\n📝 Para obtener credenciales:")
    print("   1. Ve a Firebase Console: https://console.firebase.google.com")
    print("   2. Proyecto: trafico-map-general-v2")
    print("   3. Engranaje > Configuración del proyecto")
    print("   4. Pestaña 'Cuentas de servicio'")
    print("   5. 'Generar nueva clave privada'")
    print("   6. Guarda el archivo como 'cred.json' en este directorio")
    exit(1)

print(f"✅ Credenciales encontradas: {cred_file}")

# Inicializar Firebase
try:
    cred = credentials.Certificate(cred_file)
    firebase_admin.initialize_app(cred)
except Exception as e:
    print(f"❌ Error al inicializar Firebase: {e}")
    exit(1)

db = firestore.client()

CSV_FILE = r'DATOS_EJEMPLO_LA_PLATA\01_siniestros_50.csv'
CLIENT_ID = 'laplata'

print("🔥 Conectado a Firestore")

# 1. Limpiar datos antiguos
print(f"\n🗑️  Eliminando siniestros antiguos de {CLIENT_ID}...")
try:
    collection_ref = db.collection('clientes').document(CLIENT_ID).collection('siniestros')
    docs = collection_ref.stream()
    deleted_count = 0
    for doc in docs:
        doc.reference.delete()
        deleted_count += 1
    print(f"✅ Eliminados {deleted_count} siniestros antiguos")
except Exception as e:
    print(f"❌ Error al eliminar: {e}")

# 2. Cargar nuevos datos
print(f"\n📂 Leyendo CSV: {CSV_FILE}")
try:
    with open(CSV_FILE, 'r', encoding='utf-8') as f:
        reader = csv.DictReader(f)
        rows = list(reader)
    print(f"✅ CSV leído: {len(rows)} registros")
except Exception as e:
    print(f"❌ Error al leer CSV: {e}")
    exit(1)

# 3. Procesar y cargar cada registro
print(f"\n📤 Cargando siniestros a Firestore...")
loaded_count = 0
error_count = 0

for idx, row in enumerate(rows, 1):
    try:
        # Extraer datos
        lat = float(row.get('lat', 0))
        lng = float(row.get('lng', 0))
        causa = row.get('causa', '?').strip()
        participantes = row.get('participantes', 'A').strip()  # Mantener como string
        nombre_siniestro = row.get('nombre', f'Siniestro {idx}')
        
        # Validar coordenadas
        if lat == 0 or lng == 0:
            print(f"  ⚠️  [{idx}] Coordenadas inválidas: ({lat}, {lng})")
            error_count += 1
            continue
        
        # OBTENER HORA: Primero intentar desde CSV, sino generar determinística
        token_hora = row.get('hora', '').strip()
        if token_hora and ':' in token_hora:
            # CSV tiene hora → usarla directamente
            timestamp_hora = token_hora
        else:
            # Generar hora determinística basada en hash del nombre
            nombre_hash = hashlib.md5(nombre_siniestro.encode()).hexdigest()
            hora_deterministica = int(nombre_hash[:8], 16) % 24
            minuto_deterministica = (idx * 7) % 60
            segundo_deterministica = (idx * 13) % 60
            timestamp_hora = f"{hora_deterministica:02d}:{minuto_deterministica:02d}:{segundo_deterministica:02d}"
        
        # Usar la fecha del CSV
        fecha_str = row.get('fecha', '2026-05-09')
        timestamp = f"{fecha_str}T{timestamp_hora}.000000"
        
        print(f"  🕐 [{idx}] {nombre_siniestro:20s} → {timestamp_hora}")
        
        # Crear documento
        doc_data = {
            'lat': lat,
            'lng': lng,
            'causa': causa,
            'participantes': participantes,  # Ahora es string
            'tipo': row.get('descripcion_tipo', 'accidente'),
            'barrio': row.get('barrio', ''),
            'fecha': row.get('fecha', ''),
            'timestamp': timestamp,  # Timestamp con hora
            'coords': [lng, lat]  # GeoJSON format
        }
        
        # Cargar a Firestore
        doc_ref = db.collection('clientes').document(CLIENT_ID).collection('siniestros').document()
        doc_ref.set(doc_data)
        
        loaded_count += 1
        if idx % 10 == 0:
            print(f"  ✅ Cargados {idx}/{len(rows)} registros")
    
    except Exception as e:
        print(f"  ❌ [{idx}] Error: {e}")
        print(f"     Row data: {row}")
        error_count += 1

print(f"\n" + "="*50)
print(f"✅ Carga completada:")
print(f"   📊 Total procesados: {len(rows)}")
print(f"   ✅ Exitosos: {loaded_count}")
print(f"   ❌ Errores: {error_count}")
print(f"="*50)

# 4. Verificar datos cargados
print(f"\n🔍 Verificando datos cargados...")
try:
    docs = db.collection('clientes').document(CLIENT_ID).collection('siniestros').stream()
    count = 0
    causes = {}
    for doc in docs:
        count += 1
        data = doc.to_dict()
        causa = data.get('causa', '?')
        causes[causa] = causes.get(causa, 0) + 1
    
    print(f"✅ Total en Firestore: {count}")
    print(f"\n📊 Distribución de causas:")
    for causa, cnt in sorted(causes.items()):
        print(f"   {causa}: {cnt}")
except Exception as e:
    print(f"❌ Error al verificar: {e}")

print("\n✅ ¡Script completado! Actualiza el navegador (Ctrl+Shift+R)")
