#!/usr/bin/env python3
"""
create-demo-laplata.py
Crear cliente demo La Plata directamente
"""

import firebase_admin
from firebase_admin import credentials, firestore, auth
from datetime import datetime
import sys

try:
    # Inicializar Firebase con credenciales
    creds = credentials.Certificate('trafico-map-general-v2-firebase-adminsdk-fbsvc-28104b7758.json')
    firebase_admin.initialize_app(creds)
    
    db = firestore.client()
    
    print("\n🚀 Creando cliente demo: La Plata\n")
    
    # Verificar si ya existe
    cliente_ref = db.collection('clientes').document('laplata')
    if cliente_ref.get().exists:
        print("⚠️ Cliente laplata ya existe")
        sys.exit(0)
    
    # Crear documento cliente
    cliente_ref.set({
        'id': 'laplata',
        'nombre': 'La Plata',
        'ciudad': 'La Plata',
        'email': 'admin@laplata.com',
        'telefono': '+54 221 1234567',
        'activo': True,
        'createdAt': datetime.now(),
        'config': {
            'lat': -34.9,
            'lng': -57.5,
            'zoom': 12
        },
        'stats': {
            'camaras': 0,
            'siniestros': 0,
            'operadores': 0,
            'patrullas': 0
        }
    })
    print("✅ Documento cliente creado: laplata")
    
    # Crear subcollecciones
    colecciones = [
        'camaras', 'siniestros', 'semaforos', 'robos',
        'escuelas', 'operadores', 'patrullas', 'listas', 'usuarios_clientes'
    ]
    
    for col in colecciones:
        cliente_ref.collection(col).document('_placeholder').set({
            '_placeholder': True,
            'createdAt': datetime.now()
        })
        print(f"  ✓ Subcollección {col}")
    
    # Crear usuario de prueba
    print("\n📝 Creando usuario de prueba...\n")
    
    usuario = auth.create_user(
        email='cliente@laplata.com',
        password='Demo123!',
        display_name='Cliente La Plata'
    )
    
    # Setear custom claims
    auth.set_custom_user_claims(usuario.uid, {
        'clienteId': 'laplata',
        'rol': 'cliente'
    })
    
    # Crear documento en usuarios collection
    db.collection('usuarios').document(usuario.uid).set({
        'uid': usuario.uid,
        'email': 'cliente@laplata.com',
        'clienteId': 'laplata',
        'rol': 'cliente',
        'nombre': 'Cliente Demo',
        'activo': True,
        'createdAt': datetime.now()
    })
    
    print(f"✅ Usuario creado: {usuario.uid}")
    
    # Resumen
    print("\n" + "="*50)
    print("✅ SETUP COMPLETADO")
    print("="*50)
    print("\n📝 Credenciales de Acceso:")
    print("  Email: cliente@laplata.com")
    print("  Password: Demo123!")
    print("\n🌐 URLs Disponibles:")
    print("  Login: https://trafico-map-general-v2.web.app/login.html")
    print("  Panel Cliente: https://trafico-map-general-v2.web.app/client-data-panel.html")
    print("  Mapa Cliente: https://trafico-map-general-v2.web.app/map-cliente.html")
    print("\n" + "="*50 + "\n")
    
except Exception as error:
    print(f"❌ Error: {str(error)}")
    import traceback
    traceback.print_exc()
    sys.exit(1)
