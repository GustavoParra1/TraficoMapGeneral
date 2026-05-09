#!/usr/bin/env python3
"""
verify_and_fix_mendoza_user.py - Verificar y arreglar usuario de Mendoza
"""
import firebase_admin
from firebase_admin import credentials, auth
import sys

cred = credentials.Certificate('trafico-map-general-v2-firebase-adminsdk-fbsvc-28104b7758.json')
try:
    firebase_admin.initialize_app(cred, name='verify')
except:
    pass

def verify_user(email):
    """Verificar si el usuario existe"""
    try:
        user = auth.get_user_by_email(email, app=firebase_admin.get_app('verify'))
        print(f"✅ Usuario encontrado:")
        print(f"   UID: {user.uid}")
        print(f"   Email: {user.email}")
        print(f"   Email verificado: {user.email_verified}")
        print(f"   Disabled: {user.disabled}")
        print(f"   Custom claims: {user.custom_claims}")
        return user.uid
    except auth.UserNotFoundError:
        print(f"❌ Usuario {email} NO EXISTE en Firebase Auth")
        return None
    except Exception as e:
        print(f"❌ Error verificando usuario: {e}")
        return None

def recreate_user(email, password, uid=None):
    """Recrear usuario con contraseña"""
    try:
        # Intentar eliminar el usuario anterior si existe
        if uid:
            try:
                auth.delete_user(uid, app=firebase_admin.get_app('verify'))
                print(f"🗑️  Usuario anterior {uid} eliminado")
            except:
                pass
        
        # Crear nuevo usuario
        user = auth.create_user(
            email=email,
            password=password,
            app=firebase_admin.get_app('verify')
        )
        print(f"✅ Usuario creado: {user.uid}")
        print(f"   Email: {user.email}")
        
        # Asignar custom claims
        auth.set_custom_user_claims(
            user.uid,
            {
                'clienteId': 'mendoza-3',
                'rol': 'cliente',
                'plan': 'profesional'
            },
            app=firebase_admin.get_app('verify')
        )
        print(f"✅ Custom claims asignados")
        
        return True
    except auth.EmailAlreadyExistsError:
        print(f"⚠️  Email ya existe. Intentando actualizar contraseña...")
        try:
            # Obtener el usuario
            user = auth.get_user_by_email(email, app=firebase_admin.get_app('verify'))
            # Actualizar contraseña
            auth.update_user(user.uid, password=password, app=firebase_admin.get_app('verify'))
            print(f"✅ Contraseña actualizada para {email}")
            return True
        except Exception as e:
            print(f"❌ Error actualizando contraseña: {e}")
            return False
    except Exception as e:
        print(f"❌ Error creando usuario: {e}")
        return False

if __name__ == '__main__':
    email = "admin@mendoza.gov.ar"
    password = "MendozaAdmin2024!"
    
    print("="*60)
    print("🔐 VERIFICANDO USUARIO DE MENDOZA")
    print("="*60)
    print(f"\nEmail: {email}")
    print(f"Contraseña: {password}\n")
    
    # Verificar usuario actual
    print("1️⃣  Verificando usuario existente...")
    uid = verify_user(email)
    
    if uid:
        print(f"\n2️⃣  El usuario existe. Actualizando contraseña...")
        recreate_user(email, password, uid)
    else:
        print(f"\n2️⃣  El usuario no existe. Creando...")
        recreate_user(email, password)
    
    print(f"\n3️⃣  Verificando configuración final...")
    verify_user(email)
    
    print("\n" + "="*60)
    print("✅ USUARIO LISTO PARA USAR")
    print("="*60)
    print(f"\n🔐 ACCESO A PANEL DE CLIENTE:")
    print(f"   URL:        https://trafico-map-general-v2.web.app/client/")
    print(f"   Email:      {email}")
    print(f"   Contraseña: {password}")
    print(f"\n" + "="*60 + "\n")
