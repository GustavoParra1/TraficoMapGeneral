#!/usr/bin/env python3
"""
Verificar usuario admin@trafico-map.com en Firebase
"""
import firebase_admin
from firebase_admin import credentials, auth

# Inicializar Firebase
cred = credentials.Certificate('trafico-map-general-v2-firebase-adminsdk-fbsvc-28104b7758.json')
firebase_admin.initialize_app(cred)

email = 'admin@trafico-map.com'

try:
    # Obtener usuario
    user = auth.get_user_by_email(email)
    print(f"✅ Usuario encontrado: {user.uid}")
    print(f"   Email: {user.email}")
    print(f"   Custom claims: {user.custom_claims}")
    
except Exception as e:
    print(f"❌ Error: {e}")
