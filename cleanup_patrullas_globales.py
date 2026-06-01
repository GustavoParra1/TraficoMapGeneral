#!/usr/bin/env python3
"""
Script para limpiar la colección global patrullas_laplata (ya no se usa)
Ahora todo está en clientes/{clienteId}/patrullas/
"""

import firebase_admin
from firebase_admin import credentials
from firebase_admin import firestore
import os

# Inicializar Firebase
cred = credentials.Certificate('serviceAccountKey.json')
firebase_admin.initialize_app(cred)
db = firestore.client()

# Ciudades a limpiar
ciudades = ['laplata', 'constitucion', 'mendoza', 'cordoba', 'salta', 'jujuy', 'lapampa', 'miramar', 'necochea', 'sanjuan']

print("🗑️ Iniciando limpieza de colecciones globales de patrullas...")

for ciudad in ciudades:
    coleccion = f'patrullas_{ciudad}'
    try:
        docs = db.collection(coleccion).stream()
        count = 0
        for doc in docs:
            doc.reference.delete()
            count += 1
        
        if count > 0:
            print(f"  ✅ Eliminados {count} documento(s) de {coleccion}")
        else:
            print(f"  ℹ️ {coleccion} ya estaba vacía")
    except Exception as e:
        print(f"  ⚠️ Colección {coleccion} no existe o error: {e}")

print("\n✅ Limpieza completada. Todas las patrullas están ahora en clientes/{clienteId}/patrullas/")
