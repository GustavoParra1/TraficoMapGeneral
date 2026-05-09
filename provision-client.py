#!/usr/bin/env python3
"""
provision-client.py
Provisionar nuevos clientes en arquitectura multi-tenant
"""

import firebase_admin
from firebase_admin import credentials, firestore, auth
import os
import json
from datetime import datetime

class ClientProvisioner:
    def __init__(self):
        # Inicializar Firebase (usa credenciales del entorno)
        try:
            if not firebase_admin.get_app():
                # Si no hay credenciales, intentar usar las del proyecto
                cred = credentials.ApplicationDefault()
                firebase_admin.initialize_app(cred)
        except:
            # Si falla, intentar con archivo local
            try:
                cred = credentials.Certificate('service-account-key.json')
                firebase_admin.initialize_app(cred)
            except:
                print("❌ No se pueden cargar las credenciales de Firebase")
                print("Asegúrate de ejecutar: firebase login")
                exit(1)
        
        self.db = firestore.client()

    def provisionar_cliente(self, cliente_data):
        """Provisionar nuevo cliente"""
        try:
            print(f"\n🚀 Iniciando provisión de cliente: {cliente_data['nombre']}")
            
            # Validar datos
            required = ['id', 'nombre', 'ciudad', 'email']
            for field in required:
                if field not in cliente_data:
                    raise Exception(f"Falta dato requerido: {field}")
            
            cliente_id = cliente_data['id']
            
            # Verificar si ya existe
            if self.db.collection('clientes').document(cliente_id).get().exists:
                print(f"⚠️ Cliente {cliente_id} ya existe")
                return False
            
            # Crear documento cliente
            self.db.collection('clientes').document(cliente_id).set({
                'id': cliente_id,
                'nombre': cliente_data['nombre'],
                'ciudad': cliente_data['ciudad'],
                'email': cliente_data['email'],
                'telefono': cliente_data.get('telefono', ''),
                'activo': True,
                'createdAt': datetime.now(),
                'config': {
                    'lat': cliente_data.get('lat', -34.9),
                    'lng': cliente_data.get('lng', -57.5),
                    'zoom': cliente_data.get('zoom', 12)
                },
                'stats': {
                    'camaras': 0,
                    'siniestros': 0,
                    'operadores': 0,
                    'patrullas': 0
                }
            })
            
            print(f"✅ Documento cliente creado: {cliente_id}")
            
            # Crear subcollecciones
            colecciones = [
                'camaras', 'siniestros', 'semaforos', 'robos',
                'escuelas', 'operadores', 'patrullas', 'listas', 'usuarios_clientes'
            ]
            
            for col in colecciones:
                self.db.collection('clientes').document(cliente_id) \
                    .collection(col).document('_placeholder').set({
                        '_placeholder': True,
                        'createdAt': datetime.now()
                    })
                print(f"  ✓ Subcollección {col} lista")
            
            # Crear usuario si se solicita
            if cliente_data.get('crearUsuario'):
                email = cliente_data.get('emailUsuario', cliente_data['email'])
                password = cliente_data.get('passwordUsuario', 'Demo123!')
                
                usuario = self.crear_usuario_cliente(email, password, cliente_id)
                print(f"✅ Usuario cliente creado: {usuario['uid']}")
                print(f"   Email: {email}")
                print(f"   Password: {password}")
            
            print(f"\n✅ CLIENTE PROVISIONADO EXITOSAMENTE\n")
            return True
            
        except Exception as error:
            print(f"❌ Error en provisión: {str(error)}")
            raise

    def crear_usuario_cliente(self, email, password, cliente_id):
        """Crear usuario cliente"""
        try:
            # Crear usuario en Auth
            usuario = auth.create_user(
                email=email,
                password=password,
                display_name=email.split('@')[0]
            )
            
            # Setear custom claims
            auth.set_custom_user_claims(usuario.uid, {
                'clienteId': cliente_id,
                'rol': 'cliente'
            })
            
            # Crear documento en usuarios collection
            self.db.collection('usuarios').document(usuario.uid).set({
                'uid': usuario.uid,
                'email': email,
                'clienteId': cliente_id,
                'rol': 'cliente',
                'nombre': email.split('@')[0],
                'activo': True,
                'createdAt': datetime.now()
            })
            
            return {'uid': usuario.uid, 'email': email}
            
        except Exception as error:
            print(f"❌ Error creando usuario: {str(error)}")
            raise

    def listar_clientes(self):
        """Listar todos los clientes"""
        try:
            docs = self.db.collection('clientes').stream()
            clientes = []
            
            print("\n📋 Clientes registrados:\n")
            for doc in docs:
                data = doc.to_dict()
                clientes.append(data)
                print(f"  • {data['nombre']} ({doc.id})")
                print(f"    Ciudad: {data['ciudad']}")
                print(f"    Email: {data['email']}")
                print(f"    Activo: {'Sí' if data.get('activo') else 'No'}\n")
            
            return clientes
            
        except Exception as error:
            print(f"❌ Error listando clientes: {str(error)}")
            return []

    def obtener_stats(self, cliente_id):
        """Obtener estadísticas de un cliente"""
        try:
            cliente = self.db.collection('clientes').document(cliente_id).get()
            if not cliente.exists:
                raise Exception(f"Cliente {cliente_id} no encontrado")
            
            data = cliente.to_dict()
            colecciones = ['camaras', 'siniestros', 'operadores', 'patrullas']
            stats = {}
            
            for col in colecciones:
                docs = self.db.collection('clientes').document(cliente_id) \
                    .collection(col).stream()
                count = len([d for d in docs if d.id != '_placeholder'])
                stats[col] = count
            
            print(f"\n📊 Estadísticas de {data['nombre']}:\n")
            print(f"  Cámaras: {stats['camaras']}")
            print(f"  Siniestros: {stats['siniestros']}")
            print(f"  Operadores: {stats['operadores']}")
            print(f"  Patrullas: {stats['patrullas']}\n")
            
            return stats
            
        except Exception as error:
            print(f"❌ Error obteniendo stats: {str(error)}")
            return None


def main():
    """Modo interactivo"""
    print("""
╔═══════════════════════════════════════╗
║   PROVISIONER CLIENTE - TraficoMap   ║
╚═══════════════════════════════════════╝
""")
    
    provisioner = ClientProvisioner()
    
    print("""
Selecciona una opción:
1. Provisionar nuevo cliente
2. Listar clientes
3. Ver estadísticas
4. Salir
""")
    
    opcion = input("Opción: ").strip()
    
    if opcion == '1':
        cliente_id = input("ID del cliente (ej: laplata): ").strip()
        nombre = input("Nombre del cliente: ").strip()
        ciudad = input("Ciudad: ").strip()
        email = input("Email: ").strip()
        telefono = input("Teléfono (opcional): ").strip()
        crear_usuario = input("¿Crear usuario de prueba? (s/n): ").strip().lower() == 's'
        
        provisioner.provisionar_cliente({
            'id': cliente_id,
            'nombre': nombre,
            'ciudad': ciudad,
            'email': email,
            'telefono': telefono,
            'crearUsuario': crear_usuario,
            'emailUsuario': email,
            'passwordUsuario': 'Demo123!'
        })
        
    elif opcion == '2':
        provisioner.listar_clientes()
        
    elif opcion == '3':
        cliente_id = input("ID del cliente: ").strip()
        provisioner.obtener_stats(cliente_id)
        
    elif opcion == '4':
        print("Adiós!")
    else:
        print("Opción inválida")


if __name__ == '__main__':
    main()
