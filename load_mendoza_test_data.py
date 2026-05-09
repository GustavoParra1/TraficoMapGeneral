#!/usr/bin/env python3
"""
load_mendoza_test_data.py - Cargar datos de prueba para Mendoza
"""
import firebase_admin
from firebase_admin import credentials, firestore
from datetime import datetime
import json

# Inicializar Firebase
cred = credentials.Certificate('trafico-map-general-v2-firebase-adminsdk-fbsvc-28104b7758.json')
try:
    firebase_admin.initialize_app(cred)
except:
    pass  # Ya inicializado
db = firestore.client()

def load_mendoza_data():
    """Cargar datos de prueba para Mendoza"""
    cliente_id = 'mendoza-2'
    
    print(f"\n{'='*60}")
    print(f"📊 CARGANDO DATOS DE PRUEBA PARA MENDOZA")
    print(f"{'='*60}")
    
    try:
        # Datos de siniestros de prueba (Mendoza está en -32.88, -68.81)
        siniestros = [
            {
                'id': 'sin_mendoza_001',
                'lat': -32.88,
                'lng': -68.81,
                'fecha': datetime.now(),
                'tipo': 'choque',
                'lugar': 'Centro de Mendoza',
                'participantes': 2,
                'heridos': 0,
                'muertos': 0,
                'descripcion': 'Choque en calle San Martín',
                'code': 'A/M',  # Auto y Moto
                'causa': 'No respetar semáforo',
                'hora': '14:30',
                'resultado': 'sin'
            }
        ]
        
        print(f"\n1️⃣  Cargando {len(siniestros)} siniestros...")
        siniestros_col = db.collection('clientes').document(cliente_id).collection('siniestros')
        
        # Eliminar documento _init primero
        try:
            siniestros_col.document('_init').delete()
            print(f"   🧹 Documento _init eliminado")
        except:
            pass
        
        for sin in siniestros:
            sin_id = sin.pop('id', 'sin_001')
            siniestros_col.document(sin_id).set(sin)
            print(f"   ✅ {sin_id}: ({sin['lat']}, {sin['lng']})")
        
        # Datos de cámaras
        camaras = [
            {
                'id': 'cam_mendoza_001',
                'lat': -32.88,
                'lng': -68.81,
                'nombre': 'Cámara Centro Plaza Independencia',
                'tipo': 'publica',
                'estado': 'activa',
                'descripcion': 'Cámara pública en plaza principal'
            }
        ]
        
        print(f"\n2️⃣  Cargando {len(camaras)} cámaras...")
        camaras_col = db.collection('clientes').document(cliente_id).collection('cameras')
        
        # Eliminar documento _init
        try:
            camaras_col.document('_init').delete()
        except:
            pass
        
        for cam in camaras:
            cam_id = cam.pop('id', 'cam_001')
            camaras_col.document(cam_id).set(cam)
            print(f"   ✅ {cam_id}: {cam['nombre']}")
        
        print(f"\n{'='*60}")
        print(f"✅ DATOS CARGADOS EXITOSAMENTE")
        print(f"{'='*60}\n")
        return True
        
    except Exception as e:
        print(f"\n❌ ERROR: {str(e)}\n")
        return False

if __name__ == '__main__':
    load_mendoza_data()
