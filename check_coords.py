import json

with open('public/data/siniestros_con_ubicacion.geojson', 'r', encoding='utf-8') as f:
    data = json.load(f)

total = len(data['features'])
invalid = sum(1 for f in data['features'] if f['geometry']['coordinates'] == [0, 0])
valid = total - invalid

print(f"Total siniestros: {total}")
print(f"  - Con coordenadas válidas: {valid}")
print(f"  - Con coordenadas [0, 0]: {invalid}")

# Mostrar algunos ejemplos de coordenadas
print("\nPrimeros 5 siniestros:")
for i, f in enumerate(data['features'][:5]):
    coords = f['geometry']['coordinates']
    cam_id = f['properties'].get('Nø CµMARA', f['properties'].get('N CAMERA', 'N/A'))
    print(f"  {i+1}. Cam ID: {cam_id}, Coords: {coords}")
