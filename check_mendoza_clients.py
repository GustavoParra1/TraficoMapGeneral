#!/usr/bin/env python3
"""
check_mendoza_clients.py - Verificar todos los clientes Mendoza
"""
import firebase_admin
from firebase_admin import credentials, firestore

cred = credentials.Certificate('trafico-map-general-v2-firebase-adminsdk-fbsvc-28104b7758.json')
try:
    firebase_admin.initialize_app(cred, name='check')
except:
    pass
db = firestore.client(app=firebase_admin.get_app('check'))

# Ver todos los clientes Mendoza
docs = db.collection('clientes').where('nombre', '==', 'Mendoza').stream()
clientes = list(docs)
print(f'📋 Clientes Mendoza encontrados: {len(clientes)}\n')

for doc in clientes:
    data = doc.to_dict()
    print(f'✅ {doc.id}:')
    print(f'   Email: {data.get("email")}')
    print(f'   Estado: {data.get("estado")}')
    print(f'   Plan: {data.get("plan")}')
    print(f'   Lat/Lng: {data.get("lat")}, {data.get("lng")}')
    print(f'   Suscripción: {data.get("suscripcion")}')
    print(f'   Firebase Config: {"✅ OK" if data.get("firebase_cliente") else "❌ FALTA"}')
    print()
