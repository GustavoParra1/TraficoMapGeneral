#!/usr/bin/env python3
"""
Script para almacenar credenciales de clientes en Firestore
Esto permite que el admin panel muestre usuario y contraseña
"""
import firebase_admin
from firebase_admin import credentials, firestore, auth
import os

# Inicializar Firebase
try:
    app = firebase_admin.get_app()
except ValueError:
    cred = credentials.Certificate('credentials.json') if os.path.exists('credentials.json') else None
    if cred:
        firebase_admin.initialize_app(cred)
    else:
        # Si no hay credentials.json, usar credenciales por defecto
        firebase_admin.initialize_app()

db = firestore.client()

def store_client_credentials(client_id, email, password):
    """Almacenar credenciales de cliente en Firestore"""
    try:
        # Obtener documento del cliente
        doc = db.collection('clientes').document(client_id).get()
        
        if not doc.exists:
            print(f"❌ Cliente {client_id} no existe")
            return False
        
        # Actualizar con credenciales
        db.collection('clientes').document(client_id).update({
            'email_admin': email,
            'contraseña': password,  # NOTA: Idealmente usar bcrypt
            'password_plain': password,  # Guardado en texto plano para mostrar (¡SEGURIDAD!)
            'url_acceso': 'https://trafico-map-general-v2.web.app/client/'
        })
        
        print(f"✅ Credenciales almacenadas para {client_id}")
        print(f"   Email: {email}")
        print(f"   Contraseña: {password}")
        return True
        
    except Exception as e:
        print(f"❌ Error: {e}")
        return False

def get_all_clients_and_update():
    """Obtener todos los clientes y asegurar que tengan credenciales"""
    try:
        print("\n📋 Obteniendo todos los clientes...\n")
        
        clientes = db.collection('clientes').get()
        
        count = 0
        for doc in clientes:
            count += 1
            client_id = doc.id
            data = doc.data()
            
            print(f"🔍 Cliente #{count}: {data.get('nombre')} ({client_id})")
            
            # Verificar si ya tiene credenciales
            if 'email_admin' in data and 'contraseña' in data:
                print(f"   ✅ Ya tiene credenciales")
                print(f"   Email: {data['email_admin']}")
                print(f"   Contraseña: {data['contraseña']}")
            else:
                print(f"   ⚠️ Falta agregar credenciales")
                # El email del cliente
                email = data.get('email', f'admin@{client_id}.local')
                # Generar contraseña por defecto si no existe
                password = data.get('contraseña', f'Temporal{client_id}2024!')
                
                if store_client_credentials(client_id, email, password):
                    print(f"   ✅ Credenciales agregadas\n")
                else:
                    print(f"   ❌ Error agregando credenciales\n")
            
            print()
        
        if count == 0:
            print("❌ No se encontraron clientes en la colección")
        else:
            print(f"\n✅ Procesados {count} clientes")
        
    except Exception as e:
        print(f"❌ Error: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    print("=" * 60)
    print("📋 ALMACENANDO CREDENCIALES DE CLIENTES EN FIRESTORE")
    print("=" * 60)
    
    get_all_clients_and_update()
    
    print("\n" + "=" * 60)
    print("✅ PROCESO COMPLETADO")
    print("=" * 60)
