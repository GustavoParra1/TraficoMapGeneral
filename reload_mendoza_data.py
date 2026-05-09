#!/usr/bin/env python3
"""
reload_mendoza_data.py - Recargar datos de Mendoza eliminando primero
"""
import firebase_admin
from firebase_admin import credentials, firestore
from datetime import datetime

# Inicializar Firebase
cred = credentials.Certificate('trafico-map-general-v2-firebase-adminsdk-fbsvc-28104b7758.json')
try:
    firebase_admin.initialize_app(cred)
except:
    pass  # Ya inicializado

db = firestore.client()

def reload_mendoza_data():
    """Recargar datos de Mendoza"""
    cliente_id = 'mendoza-2'
    
    print(f"\n{'='*60}")
    print(f"🔄 RECARGANDO DATOS DE MENDOZA")
    print(f"{'='*60}")
    
    try:
        # 1. Eliminar datos antiguos
        print(f"\n1️⃣  Eliminando documentos antiguos...")
        siniestros_col = db.collection('clientes').document(cliente_id).collection('siniestros')
        
        # Obtener todos los documentos
        docs = siniestros_col.stream()
        for doc in docs:
            doc.reference.delete()
            print(f"   🗑️  Eliminado: {doc.id}")
        
        # 2. Cargar nuevos datos de siniestros
        print(f"\n2️⃣  Cargando siniestros con propiedades completas...")
        sin_data = {
            'lat': -32.88,
            'lng': -68.81,
            'fecha': datetime.now(),
            'tipo': 'choque',
            'lugar': 'Centro de Mendoza',
            'participantes': 2,
            'heridos': 0,
            'muertos': 0,
            'descripcion': 'Choque en calle San Martín',
            'code': 'A/M',  # CRÍTICO: participantes como código
            'causa': 'VS',  # Violación de Semáforo (VS) - código corto
            'hora': '14:30',
            'resultado': 'sin'
        }
        siniestros_col.document('sin_mendoza_001').set(sin_data)
        print(f"   ✅ Siniestro creado con code='A/M'")
        
        # 3. Datos cargados exitosamente
        print(f"\n3️⃣  Datos completados")
        print(f"   ✅ Siniestro con code='A/M' cargado en Firestore")
        
        print(f"\n{'='*60}")
        print(f"✅ RECARGA COMPLETADA")
        print(f"{'='*60}\n")
        return True
        
    except Exception as e:
        print(f"\n❌ ERROR: {str(e)}\n")
        import traceback
        traceback.print_exc()
        return False

if __name__ == '__main__':
    reload_mendoza_data()
