import firebase_admin
from firebase_admin import credentials, auth

cred = credentials.Certificate('trafico-map-general-v2-firebase-adminsdk-fbsvc-28104b7758.json')
try:
    app = firebase_admin.get_app()
    firebase_admin.delete_app(app)
except:
    pass

firebase_admin.initialize_app(cred)

try:
    # Obtener el usuario de Mendoza
    user = auth.get_user_by_email('admin@mendoza.gov.ar')
    print(f"\n✅ Usuario encontrado: {user.uid}")
    print(f"   Email: {user.email}")
    print(f"   Custom claims actuales: {user.custom_claims}")
except Exception as e:
    print(f"❌ Error: {e}")
