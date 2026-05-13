#!/usr/bin/env python3
"""
Provisión de nuevos clientes - Backend
Ejecuta desde Cloud Functions o desde servidor local
"""
import os
import json
import secrets
from datetime import datetime
from flask import Flask, request, jsonify
import firebase_admin
from firebase_admin import credentials, auth, firestore

# Inicializar Firebase si no lo está
if not firebase_admin.apps:
    cred = credentials.Certificate('trafico-map-general-v2-firebase-adminsdk-fbsvc-28104b7758.json')
    firebase_admin.initialize_app(cred)

db = firestore.client()
app = Flask(__name__)

def sanitize_cliente_id(nombre):
    """Convertir nombre a ID válido para Firestore"""
    return nombre.lower().replace(" ", "-").replace("ñ", "n")[:50]

@app.route('/api/create-client', methods=['POST'])
def create_client():
    try:
        data = request.get_json()
        
        # Validar datos
        required = ['nombre', 'email', 'plan', 'password']
        for field in required:
            if not data.get(field):
                return jsonify({'error': f'Campo requerido: {field}'}), 400
        
        nombre = data['nombre']
        email = data['email']
        plan = data['plan']
        password = data['password']
        dominio = data.get('dominio', '')
        lat = data.get('lat')
        lng = data.get('lng')
        
        print(f"📝 Creando cliente: {nombre} ({email})")
        
        # Generar ID único
        cliente_id = sanitize_cliente_id(nombre)
        # Si ya existe, agregar sufijo
        counter = 1
        base_id = cliente_id
        while db.collection('clientes').document(cliente_id).get().exists:
            cliente_id = f"{base_id}-{counter}"
            counter += 1
        
        print(f"   ID: {cliente_id}")
        
        # ===== PASO 1: Crear usuario en Firebase Auth
        print(f"   🔐 Creando usuario en Firebase Auth...")
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
        except Exception as e:
            return jsonify({'error': f'Error en Firebase Auth: {str(e)}'}), 500
        
        # ===== PASO 2: Crear documento en /clientes
        print(f"   📄 Creando documento cliente en Firestore...")
        
        # ⭐ CREDENCIALES DE FIREBASE COMPARTIDAS (trafico-map-general-v2)
        # Todos los clientes usan el mismo Firebase pero datos aislados en clientes/{clienteId}
        firebase_cliente_config = {
            'apiKey': 'AIzaSyCkYYx5n-gKaKtTqOv2R1Glz1D_TA_Y5KA',
            'authDomain': 'trafico-map-general-v2.firebaseapp.com',
            'projectId': 'trafico-map-general-v2',
            'storageBucket': 'trafico-map-general-v2.firebasestorage.app',
            'messagingSenderId': '540631719751',
            'appId': '1:540631719751:web:bd410f1bbee18e9fabb662',
            'databaseURL': 'https://trafico-map-general-v2-default-rtdb.firebaseio.com'
        }
        
        cliente_doc = {
            'id': cliente_id,
            'nombre': nombre,
            'email': email,
            'plan': plan,
            'dominio': dominio,
            'estado': 'activo',
            'uid': uid,
            'lat': lat,
            'lng': lng,
            'created_at': datetime.now(),
            'updated_at': datetime.now(),
            'firebase_cliente': firebase_cliente_config,  # ⭐ AGREGADO: Credenciales para map.html
        }
        db.collection('clientes').document(cliente_id).set(cliente_doc)
        print(f"   ✅ Documento cliente creado")
        print(f"   ✅ firebase_cliente agregado")
        
        # ===== PASO 3: Asignar custom claims
        print(f"   🔑 Asignando custom claims...")
        auth.set_custom_claims(uid, {
            'clienteId': cliente_id,
            'rol': 'cliente',
            'plan': plan
        })
        print(f"   ✅ Custom claims asignados")
        
        # ===== PASO 4: Crear colecciones vacías
        print(f"   📦 Inicializando colecciones vacías...")
        colecciones = ['camaras', 'siniestros', 'operadores', 'patrullas', 'listas', 'config']
        for col in colecciones:
            # Crear documento dummy para que exista la colección
            db.collection('clientes').document(cliente_id).collection(col).document('_init').set({
                'initialized': True,
                'at': datetime.now()
            })
        print(f"   ✅ Colecciones inicializadas")
        
        # ===== PASO 5: Crear configuración del cliente
        print(f"   ⚙️  Creando configuración...")
        config = {
            'nombre': nombre,
            'plan': plan,
            'centro_mapa': {
                'lat': lat or 0,
                'lng': lng or 0,
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
        
        # ===== RESPUESTA
        resultado = {
            'cliente_id': cliente_id,
            'email': email,
            'uid': uid,
            'plan': plan,
            'mensaje': f'✅ Cliente {nombre} creado exitosamente',
            'acceso': {
                'url': 'https://trafico-map-general-v2.web.app/login.html',
                'email': email,
                'password': '(temporal - debe cambiarla en primer login)'
            }
        }
        
        print(f"✅ CLIENTE CREADO EXITOSAMENTE")
        print(f"   ID: {cliente_id}")
        print(f"   Email: {email}")
        print(f"   Plan: {plan}")
        
        return jsonify(resultado), 201
        
    except Exception as e:
        print(f"❌ ERROR: {str(e)}")
        return jsonify({'error': str(e)}), 500

@app.route('/api/health', methods=['GET'])
def health():
    return jsonify({'status': 'ok'}), 200

if __name__ == '__main__':
    print("🚀 Servidor de provisión de clientes iniciado")
    print("   http://localhost:5000")
    app.run(debug=True, port=5000)
