#!/usr/bin/env python3
"""
Fix admin role - Cambiar custom claim de admin → super_admin
"""
import firebase_admin
from firebase_admin import credentials, auth

# Inicializar Firebase
cred = credentials.Certificate('trafico-map-general-v2-firebase-adminsdk-fbsvc-28104b7758.json')
firebase_admin.initialize_app(cred)

email = 'admin@laplatamaps.com.ar'

try:
    # Obtener usuario
    user = auth.get_user_by_email(email)
    print(f"✅ Usuario encontrado: {user.uid}")
    print(f"   Email: {user.email}")
    
    # Actualizar custom claims
    auth.set_custom_claims(user.uid, {'rol': 'super_admin'})
    print(f"✅ Custom claim actualizado: rol → super_admin")
    
    # Verificar
    user_updated = auth.get_user(user.uid)
    print(f"✅ Verificación: {user_updated.custom_claims}")
    
except Exception as e:
    print(f"❌ Error: {e}")
