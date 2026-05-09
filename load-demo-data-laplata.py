#!/usr/bin/env python3
"""
load-demo-data-laplata.py
Carga datos de prueba al cliente La Plata
"""

import firebase_admin
from firebase_admin import credentials, firestore
from datetime import datetime
import csv
import sys

try:
    # Inicializar Firebase
    creds = credentials.Certificate('trafico-map-general-v2-firebase-adminsdk-fbsvc-28104b7758.json')
    try:
        firebase_admin.delete_app(firebase_admin.get_app())
    except:
        pass
    firebase_admin.initialize_app(creds)
    
    db = firestore.client()
    cliente_id = 'laplata'
    
    print("\n📊 Cargando datos de prueba para La Plata\n")
    
    # Datos de prueba: Siniestros
    siniestros = [
        {'lat': -34.92, 'lng': -57.54, 'tipo': 'Choque', 'severidad': 'Leve', 'fecha': '2024-01-15'},
        {'lat': -34.91, 'lng': -57.55, 'tipo': 'Choque', 'severidad': 'Moderado', 'fecha': '2024-01-16'},
        {'lat': -34.88, 'lng': -57.56, 'tipo': 'Atropello', 'severidad': 'Grave', 'fecha': '2024-01-17'},
        {'lat': -34.90, 'lng': -57.52, 'tipo': 'Volcadura', 'severidad': 'Leve', 'fecha': '2024-01-18'},
        {'lat': -34.95, 'lng': -57.50, 'tipo': 'Choque', 'severidad': 'Moderado', 'fecha': '2024-01-19'},
    ]
    
    # Datos de prueba: Cámaras
    camaras = [
        {'lat': -34.92, 'lng': -57.54, 'nombre': 'Cámara Centro 01', 'tipo': 'Faja', 'estado': 'Activo'},
        {'lat': -34.91, 'lng': -57.55, 'nombre': 'Cámara Casco 02', 'tipo': 'Faja', 'estado': 'Activo'},
        {'lat': -34.88, 'lng': -57.56, 'nombre': 'Cámara Ruta 03', 'tipo': 'Faja', 'estado': 'Activo'},
        {'lat': -34.90, 'lng': -57.52, 'nombre': 'Cámara Autopista 04', 'tipo': 'LPR', 'estado': 'Activo'},
        {'lat': -34.95, 'lng': -57.50, 'nombre': 'Cámara Zona Alta 05', 'tipo': 'Faja', 'estado': 'Inactivo'},
    ]
    
    # Guardar siniestros
    doc_count = 0
    for sin in siniestros:
        sin['timestamp'] = datetime.now()
        db.collection('clientes').document(cliente_id).collection('siniestros').add(sin)
        doc_count += 1
    
    print(f"✅ {doc_count} siniestros cargados")
    
    # Guardar cámaras
    doc_count = 0
    for cam in camaras:
        cam['timestamp'] = datetime.now()
        db.collection('clientes').document(cliente_id).collection('camaras').add(cam)
        doc_count += 1
    
    print(f"✅ {doc_count} cámaras cargadas")
    
    # Actualizar stats del cliente
    db.collection('clientes').document(cliente_id).update({
        'stats': {
            'siniestros': len(siniestros),
            'camaras': len(camaras),
            'operadores': 0,
            'patrullas': 0
        },
        'lastDataUpdate': datetime.now()
    })
    
    print("\n" + "="*50)
    print("✅ DATOS DE PRUEBA CARGADOS")
    print("="*50)
    print("\n📊 Resumen:")
    print(f"  • Siniestros: {len(siniestros)}")
    print(f"  • Cámaras: {len(camaras)}")
    print("\n🎯 Próximo paso:")
    print("  1. Ir a: https://trafico-map-general-v2.web.app/login.html")
    print("  2. Login: cliente@laplata.com / Demo123!")
    print("  3. Verá datos en el Panel Cliente y en el Mapa")
    print("\n" + "="*50 + "\n")
    
except Exception as error:
    print(f"❌ Error: {str(error)}")
    import traceback
    traceback.print_exc()
    sys.exit(1)
