#!/usr/bin/env python3
"""
complete_mendoza_client.py - Completar configuración de cliente Mendoza
"""
import firebase_admin
from firebase_admin import credentials, firestore
from datetime import datetime, timedelta
import json

cred = credentials.Certificate('trafico-map-general-v2-firebase-adminsdk-fbsvc-28104b7758.json')
try:
    firebase_admin.initialize_app(cred, name='complete')
except:
    pass
db = firestore.client(app=firebase_admin.get_app('complete'))

def complete_mendoza_client():
    """Completar cliente Mendoza con suscripción y credenciales"""
    
    print("="*60)
    print("📋 COMPLETANDO CLIENTE MENDOZA")
    print("="*60)
    
    # Usar mendoza-3 que acaba de crearse
    cliente_id = 'mendoza-3'
    
    print(f"\n1️⃣  Obteniendo documento cliente {cliente_id}...")
    doc = db.collection('clientes').document(cliente_id).get()
    
    if not doc.exists:
        print(f"   ❌ Cliente {cliente_id} no existe")
        return False
    
    data = doc.to_dict()
    print(f"   ✅ Cliente encontrado: {data.get('nombre')}")
    
    # 2️⃣  Agregar SUSCRIPCIÓN
    print(f"\n2️⃣  Agregando suscripción...")
    
    fecha_inicio = datetime.now()
    fecha_expiracion = fecha_inicio + timedelta(days=365)  # 1 año
    
    suscripcion_data = {
        'estado': 'activo',
        'plan': data.get('plan', 'profesional'),
        'fecha_inicio': fecha_inicio,
        'fecha_expiracion': fecha_expiracion,
        'renovacion_automatica': True,
        'metodo_pago': 'tarjeta'
    }
    
    db.collection('clientes').document(cliente_id).update({
        'suscripcion': suscripcion_data
    })
    print(f"   ✅ Suscripción agregada hasta {fecha_expiracion.strftime('%d/%m/%Y')}")
    
    # 3️⃣  Agregar CREDENCIALES DE FIREBASE DEL CLIENTE
    print(f"\n3️⃣  Agregando credenciales Firebase...")
    
    # Estas son credenciales de ejemplo. En producción, cada cliente tendría su propio Firebase project
    firebase_config = {
        "apiKey": "AIzaSyCONFIG_EJEMPLO_DO_NOT_USE_IN_PRODUCTION",
        "authDomain": "trafico-map-general-v2.firebaseapp.com",
        "projectId": "trafico-map-general-v2",
        "storageBucket": "trafico-map-general-v2.appspot.com",
        "messagingSenderId": "123456789",
        "appId": "1:123456789:web:abc123def456"
    }
    
    db.collection('clientes').document(cliente_id).update({
        'firebase_cliente': firebase_config
    })
    print(f"   ✅ Credenciales Firebase agregadas")
    
    # 4️⃣  Verificar configuración final
    print(f"\n4️⃣  Verificando configuración final...")
    
    doc_updated = db.collection('clientes').document(cliente_id).get()
    data_updated = doc_updated.to_dict()
    
    print(f"   ✅ Estado: {data_updated.get('estado')}")
    print(f"   ✅ Suscripción: {data_updated.get('suscripcion', {}).get('estado')} (hasta {data_updated.get('suscripcion', {}).get('fecha_expiracion', 'N/A')})")
    print(f"   ✅ Firebase Config: OK" if data_updated.get('firebase_cliente') else "   ❌ Firebase Config: FALTA")
    
    print(f"\n{'='*60}")
    print(f"✅ CLIENTE COMPLETADO EXITOSAMENTE")
    print(f"{'='*60}")
    print(f"\n🔐 ACCESO A PANEL DE CLIENTE:")
    print(f"   URL:        https://trafico-map-general-v2.web.app/client/")
    print(f"   Email:      {data.get('email')}")
    print(f"   Contraseña: MendozaAdmin2024!")
    print(f"\n{'='*60}\n")
    
    return True

if __name__ == '__main__':
    complete_mendoza_client()
