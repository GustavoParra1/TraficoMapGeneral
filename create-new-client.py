#!/usr/bin/env python3
"""
create-new-client.py - Crear nuevo cliente directamente
Uso: python create-new-client.py "Nombre" "email@ejemplo.com" "plan" "contraseña" [lat] [lng]
"""
import sys
import firebase_admin
from firebase_admin import credentials, auth, firestore
from datetime import datetime

# Inicializar Firebase
cred = credentials.Certificate('trafico-map-general-v2-firebase-adminsdk-fbsvc-28104b7758.json')
firebase_admin.initialize_app(cred)
db = firestore.client()

def sanitize_cliente_id(nombre):
    """Convertir nombre a ID válido"""
    return nombre.lower().replace(" ", "-").replace("ñ", "n")[:50]

def create_client(nombre, email, plan, password, lat=None, lng=None):
    """Provisionar nuevo cliente"""
    try:
        print(f"\n{'='*60}")
        print(f"🎯 CREANDO NUEVO CLIENTE")
        print(f"{'='*60}")
        print(f"   Nombre: {nombre}")
        print(f"   Email: {email}")
        print(f"   Plan: {plan}")
        if lat and lng:
            print(f"   Centro Mapa: ({lat}, {lng})")
        
        # Paso 1: Generar ID único
        print(f"\n1️⃣  Generando ID único...")
        cliente_id = sanitize_cliente_id(nombre)
        counter = 1
        base_id = cliente_id
        while db.collection('clientes').document(cliente_id).get().exists:
            cliente_id = f"{base_id}-{counter}"
            counter += 1
        print(f"   ✅ ID: {cliente_id}")
        
        # Paso 2: Crear usuario Firebase Auth
        print(f"\n2️⃣  Creando usuario en Firebase Auth...")
        try:
            user = auth.create_user(
                email=email,
                password=password,
                display_name=nombre
            )
            uid = user.uid
            print(f"   ✅ Usuario creado: {uid}")
        except auth.EmailAlreadyExistsError:
            print(f"   ⚠️  Email ya existe. Usando usuario existente...")
            user = auth.get_user_by_email(email)
            uid = user.uid
        
        # Paso 3: Crear documento cliente
        print(f"\n3️⃣  Creando documento cliente...")
        cliente_data = {
            'id': cliente_id,
            'nombre': nombre,
            'email': email,
            'plan': plan,
            'estado': 'activo',
            'uid': uid,
            'lat': lat or 0,
            'lng': lng or 0,
            'dominio': '',
            'created_at': datetime.now(),
            'updated_at': datetime.now(),
        }
        db.collection('clientes').document(cliente_id).set(cliente_data)
        print(f"   ✅ Documento creado")
        
        # Paso 4: Asignar custom claims
        print(f"\n4️⃣  Asignando custom claims...")
        # Primero, borrar el custom claim 'role' antiguo si existe
        try:
            auth.set_custom_user_claims(uid, None)
            print(f"   🧹 Claims anteriores limpiados")
        except:
            pass
        
        # Asignar los nuevos claims
        auth.set_custom_user_claims(uid, {
            'clienteId': cliente_id,
            'rol': 'cliente',
            'plan': plan
        })
        print(f"   ✅ Custom claims asignados: clienteId={cliente_id}, rol=cliente, plan={plan}")
        
        # Paso 5: Inicializar colecciones
        print(f"\n5️⃣  Inicializando colecciones...")
        colecciones = ['camaras', 'siniestros', 'operadores', 'patrullas', 'listas', 'semaforos']
        for col in colecciones:
            db.collection('clientes').document(cliente_id).collection(col).document('_init').set({
                'initialized': True,
                'at': datetime.now()
            })
            print(f"      ✅ {col}")
        
        # Paso 6: Crear configuración
        print(f"\n6️⃣  Creando configuración...")
        config = {
            'nombre': nombre,
            'plan': plan,
            'centro_mapa': {
                'lat': lat or -38.0,
                'lng': lng or -57.5,
                'zoom': 12
            },
            'created_at': datetime.now(),
            'modulos_activos': {
                'camaras': True,
                'siniestros': True,
                'operadores': plan != 'basico',
                'patrullas': plan in ['profesional', 'enterprise'],
            }
        }
        db.collection('clientes').document(cliente_id).collection('config').document('settings').set(config)
        print(f"   ✅ Configuración creada")
        
        # Éxito
        print(f"\n{'='*60}")
        print(f"✅ CLIENTE CREADO EXITOSAMENTE")
        print(f"{'='*60}")
        print(f"\n📊 RESUMEN:")
        print(f"   ID Cliente:     {cliente_id}")
        print(f"   Nombre:         {nombre}")
        print(f"   Email:          {email}")
        print(f"   Plan:           {plan}")
        print(f"   UID Firebase:   {uid}")
        print(f"\n🔐 ACCESO:")
        print(f"   URL:            https://trafico-map-general-v2.web.app/login.html")
        print(f"   Email:          {email}")
        print(f"   Contraseña:     {password} (cambiar en primer login)")
        print(f"\n📍 MAPA:")
        print(f"   Latitud:        {lat or '-38.0'}")
        print(f"   Longitud:       {lng or '-57.5'}")
        print(f"\n{'='*60}\n")
        
        return True
        
    except Exception as e:
        print(f"\n❌ ERROR: {str(e)}\n")
        return False

if __name__ == '__main__':
    if len(sys.argv) < 5:
        print("❌ Uso incorrecto")
        print("\nSintaxis:")
        print('  python create-new-client.py "Nombre" "email@ejemplo.com" "plan" "contraseña" [lat] [lng]')
        print("\nEjemplo:")
        print('  python create-new-client.py "Córdoba" "admin@cordoba.gov.ar" "profesional" "CordobaAdmin123!" -31.41 -64.19')
        sys.exit(1)
    
    nombre = sys.argv[1]
    email = sys.argv[2]
    plan = sys.argv[3]
    password = sys.argv[4]
    lat = float(sys.argv[5]) if len(sys.argv) > 5 else None
    lng = float(sys.argv[6]) if len(sys.argv) > 6 else None
    
    success = create_client(nombre, email, plan, password, lat, lng)
    sys.exit(0 if success else 1)
