#!/usr/bin/env python3
import firebase_admin
from firebase_admin import credentials, auth
import os


cred_path = 'service-account-key.json'
if not os.path.exists(cred_path):
    print("❌ No encontré service-account-key.json")
    exit(1)

cred = credentials.Certificate(cred_path)
firebase_admin.initialize_app(cred)

admin_email = "admin@laplata.com"

try:
    user = auth.get_user_by_email(admin_email)
    print(f"✅ Usuario encontrado: {user.email}")
    new_claims = {
        'admin': True,
        'role': 'admin',
        'rol': 'admin',
        'email': admin_email
    }
    auth.set_custom_user_claims(user.uid, new_claims)
    print("✅ Custom claims actualizados exitosamente")
except Exception as e:
    print(f"❌ Error: {e}")
    exit(1)
