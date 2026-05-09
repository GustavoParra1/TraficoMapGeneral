#!/usr/bin/env python3
"""
setup-demo-client.py
Setup automático del cliente demo La Plata
"""

import sys
sys.path.insert(0, '.')

from provision_client import ClientProvisioner

def setup_demo():
    """Setup del cliente demo"""
    provisioner = ClientProvisioner()
    
    # Provisionar cliente La Plata
    provisioner.provisioner_cliente({
        'id': 'laplata',
        'nombre': 'La Plata',
        'ciudad': 'La Plata',
        'email': 'admin@laplata.com',
        'telefono': '+54 221 1234567',
        'crearUsuario': True,
        'emailUsuario': 'cliente@laplata.com',
        'passwordUsuario': 'Demo123!',
        'lat': -34.9,
        'lng': -57.5,
        'zoom': 12
    })
    
    print("\n✅ SETUP COMPLETADO\n")
    print("📝 Credenciales de prueba:")
    print("  Email: cliente@laplata.com")
    print("  Password: Demo123!")
    print("\n🌐 Acceso:")
    print("  URL: https://trafico-map-general-v2.web.app/login.html")

if __name__ == '__main__':
    try:
        setup_demo()
    except Exception as error:
        print(f"❌ Error: {error}")
        sys.exit(1)
