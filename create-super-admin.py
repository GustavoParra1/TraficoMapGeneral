#!/usr/bin/env python3
"""
create-super-admin.py
Crear usuario super_admin para acceso al panel de administración
"""

import firebase_admin
from firebase_admin import credentials, auth
from datetime import datetime
import sys

try:
    # Inicializar Firebase
    creds = credentials.Certificate('trafico-map-general-v2-firebase-adminsdk-fbsvc-28104b7758.json')
    try:
        firebase_admin.delete_app(firebase_admin.get_app())
    except:
        pass
    firebase_admin.initialize_app(creds)
    
    print("\n🔐 Creando Super Admin\n")
    
    # Crear usuario admin
    try:
        usuario = auth.create_user(
            email='admin@traficomap.com',
            password='Admin123!',
            display_name='Super Admin'
        )
    except auth.EmailAlreadyExistsError:
        print("⚠️ El usuario admin@traficomap.com ya existe")
        # Obtener el usuario
        usuario = auth.get_user_by_email('admin@traficomap.com')
    
    # Setear custom claims para super_admin
    auth.set_custom_user_claims(usuario.uid, {
        'rol': 'super_admin',
        'permisos': ['*']
    })
    
    print(f"✅ Usuario Super Admin creado: {usuario.uid}")
    
    # Resumen
    print("\n" + "="*50)
    print("✅ SUPER ADMIN CREADO")
    print("="*50)
    print("\n📝 Credenciales Super Admin:")
    print("  Email: admin@traficomap.com")
    print("  Password: Admin123!")
    print("\n🌐 URLs Disponibles:")
    print("  Login: https://trafico-map-general-v2.web.app/login.html")
    print("  Admin Panel: https://trafico-map-general-v2.web.app/admin")
    print("\n" + "="*50 + "\n")
    
except Exception as error:
    print(f"❌ Error: {str(error)}")
    import traceback
    traceback.print_exc()
    sys.exit(1)
