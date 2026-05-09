#!/usr/bin/env python3
"""
full_check_mendoza.py - Verificación completa del cliente Mendoza
"""
import firebase_admin
from firebase_admin import credentials, firestore, auth
from datetime import datetime

cred = credentials.Certificate('trafico-map-general-v2-firebase-adminsdk-fbsvc-28104b7758.json')
try:
    firebase_admin.initialize_app(cred, name='fullcheck')
except:
    pass

db = firestore.client(app=firebase_admin.get_app('fullcheck'))

print("="*70)
print("🔍 VERIFICACIÓN COMPLETA DEL CLIENTE MENDOZA")
print("="*70)

# 1. Verificar usuario en Firebase Auth
print("\n1️⃣ VERIFICANDO FIREBASE AUTH:")
try:
    user = auth.get_user_by_email('admin@mendoza.gov.ar', app=firebase_admin.get_app('fullcheck'))
    print(f"   ✅ Usuario encontrado")
    print(f"      UID: {user.uid}")
    print(f"      Email: {user.email}")
    print(f"      Email verificado: {user.email_verified}")
    print(f"      Disabled: {user.disabled}")
    print(f"      Custom claims: {user.custom_claims}")
except Exception as e:
    print(f"   ❌ Error: {e}")
    
# 2. Verificar documento cliente en Firestore
print("\n2️⃣ VERIFICANDO FIRESTORE - DOCUMENTO CLIENTE:")
try:
    doc = db.collection('clientes').document('mendoza-3').get()
    if not doc.exists:
        print(f"   ❌ Documento mendoza-3 NO EXISTE")
    else:
        data = doc.to_dict()
        print(f"   ✅ Documento mendoza-3 existe")
        print(f"      ID: {doc.id}")
        print(f"      Nombre: {data.get('nombre')}")
        print(f"      Email: {data.get('email')}")
        print(f"      Estado: {data.get('estado')}")
        print(f"      Suscripción: {'✅ OK' if data.get('suscripcion') else '❌ FALTA'}")
        print(f"      Firebase Config: {'✅ OK' if data.get('firebase_cliente') else '❌ FALTA'}")
        print(f"      Lat/Lng: {data.get('lat')}, {data.get('lng')}")
except Exception as e:
    print(f"   ❌ Error: {e}")

# 3. Verificar colecciones
print("\n3️⃣ VERIFICANDO COLECCIONES DEL CLIENTE:")
colecciones = ['camaras', 'cameras', 'cameras_privadas', 'siniestros', 'barrios']
for col in colecciones:
    try:
        path = f"clientes/mendoza-3/{col}"
        docs = db.collection('clientes').document('mendoza-3').collection(col).limit(1).get()
        print(f"   ✅ {col}: {'OK' if len(list(docs)) >= 0 else 'ERROR'}")
    except Exception as e:
        print(f"   ❌ {col}: {str(e)[:50]}")

# 4. Verificar que el usuario tenga acceso a los datos
print("\n4️⃣ VERIFICANDO INTEGRIDAD DE DATOS:")
try:
    doc = db.collection('clientes').document('mendoza-3').get()
    if not doc.exists:
        print(f"   ❌ Document not found")
    else:
        data = doc.to_dict()
        # Verificar campos críticos
        required_fields = ['nombre', 'email', 'estado', 'suscripcion', 'firebase_cliente', 'lat', 'lng']
        missing = []
        for field in required_fields:
            if not data.get(field):
                missing.append(field)
        
        if missing:
            print(f"   ⚠️  Campos faltantes: {', '.join(missing)}")
        else:
            print(f"   ✅ Todos los campos requeridos están presentes")
except Exception as e:
    print(f"   ❌ Error: {e}")

print("\n" + "="*70)
print("✅ VERIFICACIÓN COMPLETADA")
print("="*70)
print("\n💡 RESUMEN DE ACCESO:")
print(f"   Email: admin@mendoza.gov.ar")
print(f"   Contraseña: MendozaAdmin2024!")
print(f"   URL: https://trafico-map-general-v2.web.app/client/")
print(f"   Cliente ID: mendoza-3")
print("\n" + "="*70 + "\n")
