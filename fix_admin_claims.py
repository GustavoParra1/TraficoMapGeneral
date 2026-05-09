#!/usr/bin/env python3
"""
Script para verificar y corregir claims del usuario admin
"""
import firebase_admin
from firebase_admin import credentials, auth
import os

# Inicializar Firebase con credenciales
cred_path = 'credentials.json'
if not os.path.exists(cred_path):
    print("❌ No encontré credentials.json")
    print("📝 Por favor coloca tu archivo de credenciales de Firebase en: credentials.json")
    exit(1)

cred = credentials.Certificate(cred_path)
firebase_admin.initialize_app(cred)

# Email del admin que necesita corregir
admin_email = "admin@trafico-map.com"

try:
    # Obtener el usuario
    user = auth.get_user_by_email(admin_email)
    print(f"\n✅ Usuario encontrado: {user.email}")
    print(f"   UID: {user.uid}")
    print(f"   Custom claims actuales: {user.custom_claims}")
    
    # Actualizar custom claims para que sea admin
    new_claims = {
        'role': 'admin',
        'rol': 'admin',  # Mantener ambos formatos por compatibilidad
        'email': admin_email
    }
    
    print(f"\n📝 Actualizando custom claims a: {new_claims}")
    auth.set_custom_user_claims(user.uid, new_claims)
    print("✅ Custom claims actualizados exitosamente")
    
    # Verificar
    user_updated = auth.get_user(user.uid)
    print(f"\n✅ Custom claims verificados: {user_updated.custom_claims}")
    
except firebase_admin.exceptions.FirebaseError as e:
    print(f"❌ Error de Firebase: {e}")
    exit(1)
except Exception as e:
    print(f"❌ Error: {e}")
    exit(1)

print("\n✅ Proceso completado")
print("💡 El usuario admin podrá ahora acceder al panel en https://trafico-map-general-v2.web.app/admin/")
