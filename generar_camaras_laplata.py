import csv
import random
from shapely.geometry import Point, Polygon
from datetime import datetime

# La Plata coordinates (centered around -34.921, -57.955)
# Bounds: approximately -34.87 to -34.97 latitude, -57.90 to -58.00 longitude
LA_PLATA_CENTER = {
    'lat': -34.921,
    'lng': -57.955
}

BARRIOS = [
    'Centro', 'Nordelta', 'Tolosa', 'Los Hornos', 'Melchor Romero',
    'Ringuelet', 'Gonnet', 'Abasto', 'Etcheverry', 'Villa Elvira'
]

CALLES_DIRECCIONES = [
    'Calle 1 y 44', 'Calle 5 y 47', 'Calle 8 y 50', 'Calle 10 y 55',
    'Diagonal 73 y Calle 7', 'Diagonal 74 y Calle 8', 'Diagonal 80 y Calle 10',
    'Avenida 7 y Calle 50', 'Avenida 13 y Calle 60', 'Avenida 19 y Calle 70',
    'Plaza Moreno', 'Pasaje García', 'Avenida de los Trabajadores',
    'Calle 120 y 33', 'Calle 50 y 120', 'Avenida 1'
]

TIPOS_CAMARA = ['dome', 'fixed', 'lpr', 'ptz']

PROPIETARIOS = [
    'Municipalidad', 'Policía Local', 'Policía Provincia',
    'Banco Provincia', 'Banco de la Nación', 'TechCorp', 'Hotel Provincial',
    'Local Comercial', 'Tienda ABC', 'Farmacia Plus', 'Carrefour',
    'Shopping La Plata', 'Empresa de Seguridad Alpha', 'Empresa de Seguridad Beta',
	'Supermercado Central', 'Estación Terminal', 'Clínica Privada',
]

# Polígono aproximado de la circunvalación de La Plata (sentido horario)
CIRCUNVALACION_POLYGON = Polygon([
    (-34.8915, -57.9995),
    (-34.8915, -57.9000),
    (-34.9380, -57.9000),
    (-34.9710, -57.9000),
    (-34.9710, -57.9550),
    (-34.9710, -57.9995),
    (-34.9380, -57.9995),
    (-34.8915, -57.9995)
])

def generate_coords_near_laplata():
    """Generate random coordinates strictly within the circunvalación"""
    while True:
        lat = LA_PLATA_CENTER['lat'] + random.uniform(-0.05, 0.05)
        lng = LA_PLATA_CENTER['lng'] + random.uniform(-0.045, 0.045)
        point = Point(lat, lng)
        if CIRCUNVALACION_POLYGON.contains(point):
            return round(lat, 6), round(lng, 6)

def generate_public_cameras(count=50):
    """Generate public cameras data"""
    cameras = []
    for i in range(1, count + 1):
        lat, lng = generate_coords_near_laplata()
        camera = {
            'nombre': f'Cámara Pública {i}',
            'tipo': random.choice(TIPOS_CAMARA),
            'direccion': random.choice(CALLES_DIRECCIONES),
            'barrio': random.choice(BARRIOS),
            'lat': lat,
            'lng': lng,
            'estado': random.choice(['activa', 'activa', 'activa', 'mantenimiento'])
        }
        cameras.append(camera)
    return cameras

def generate_private_cameras(count=50):
    """Generate private cameras data"""
    cameras = []
    for i in range(1, count + 1):
        lat, lng = generate_coords_near_laplata()
        camera = {
            'nombre': f'Cámara Privada {i}',
            'tipo': random.choice(TIPOS_CAMARA),
            'direccion': random.choice(CALLES_DIRECCIONES),
            'barrio': random.choice(BARRIOS),
            'propietario': random.choice(PROPIETARIOS),
            'lat': lat,
            'lng': lng,
            'estado': random.choice(['activa', 'activa', 'activa', 'mantenimiento'])
        }
        cameras.append(camera)
    return cameras

# OPCIONAL: Generador de siniestros dentro de la circunvalación
def generate_siniestros(count=50):
    siniestros = []
    for i in range(1, count + 1):
        lat, lng = generate_coords_near_laplata()
        siniestro = {
            'lat': lat,
            'lng': lng,
            'nombre': f'Siniestro {i}',
            'hora': f"{random.randint(0,23):02d}:{random.randint(0,59):02d}",
            'descripcion_tipo': 'accidente',
            'fecha': datetime.now().strftime('%Y-%m-%d'),
            'causa': random.choice(['D', 'EV', 'NR', 'MI']),
            'participantes': random.choice(['A/P', 'B', 'COL']),
            'descripcion': f'Evento de tráfico en La Plata #{i}',
            'barrio': random.choice(BARRIOS)
        }
        siniestros.append(siniestro)
    return siniestros

def save_siniestros(siniestros, filename='siniestros.csv'):
    with open(filename, 'w', newline='', encoding='utf-8') as f:
        writer = csv.DictWriter(f, fieldnames=['lat', 'lng', 'nombre', 'hora', 'descripcion_tipo', 'fecha', 'causa', 'participantes', 'descripcion', 'barrio'])
        writer.writeheader()
        writer.writerows(siniestros)
    print(f'✅ {len(siniestros)} siniestros guardados en {filename}')
    return cameras

def save_public_cameras(cameras, filename='cameras_publicas.csv'):
    """Save public cameras to CSV"""
    with open(filename, 'w', newline='', encoding='utf-8') as f:
        writer = csv.DictWriter(f, fieldnames=['nombre', 'tipo', 'direccion', 'barrio', 'lat', 'lng', 'estado'])
        writer.writeheader()
        writer.writerows(cameras)
    print(f'✅ {len(cameras)} cámaras públicas guardadas en {filename}')

def save_private_cameras(cameras, filename='cameras_privadas.csv'):
    """Save private cameras to CSV"""
    with open(filename, 'w', newline='', encoding='utf-8') as f:
        writer = csv.DictWriter(f, fieldnames=['nombre', 'tipo', 'direccion', 'barrio', 'propietario', 'lat', 'lng', 'estado'])
        writer.writeheader()
        writer.writerows(cameras)
    print(f'✅ {len(cameras)} cámaras privadas guardadas en {filename}')

if __name__ == '__main__':
    print('🎥 Generando 50 cámaras públicas concentradas en La Plata...')
    public_cameras = generate_public_cameras(50)
    save_public_cameras(public_cameras, 'DATOS_EJEMPLO_LA_PLATA/cameras_publicas.csv')
    
    print('🎥 Generando 50 cámaras privadas concentradas en La Plata...')
    private_cameras = generate_private_cameras(50)
    save_private_cameras(private_cameras, 'DATOS_EJEMPLO_LA_PLATA/cameras_privadas.csv')
    
    print('\n📍 Muestra de cámaras públicas:')
    for camera in public_cameras[:3]:
        print(f"  - {camera['nombre']}: {camera['lat']}, {camera['lng']} ({camera['barrio']})")
    
    print('\n📍 Muestra de cámaras privadas:')
    for camera in private_cameras[:3]:
        print(f"  - {camera['nombre']}: {camera['lat']}, {camera['lng']} ({camera['barrio']})")

    print('\n🚦 Generando 50 siniestros dentro de la circunvalación...')
    siniestros = generate_siniestros(50)
    save_siniestros(siniestros, 'DATOS_EJEMPLO_LA_PLATA/siniestros.csv')
    print('\n📍 Muestra de siniestros:')
    for s in siniestros[:3]:
        print(f"  - {s['nombre']}: {s['lat']}, {s['lng']} ({s['barrio']})")
