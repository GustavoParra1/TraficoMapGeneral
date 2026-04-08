#!/usr/bin/env python3
import json

# Cargar primer siniestro
with open('public/data/siniestros_cordoba.geojson') as f:
    sin_data = json.load(f)
    if sin_data['features']:
        sin = sin_data['features'][0]
        print('PRIMER SINIESTRO:')
        print(f'  Coordinates: {sin["geometry"]["coordinates"]}')
        print(f'  Propiedades: {list(sin["properties"].keys())[:5]}')

# Cargar primer barrio
with open('public/data/barrios_cordoba_ejemplo.geojson') as f:
    bar_data = json.load(f)
    if bar_data['features']:
        bar = bar_data['features'][0]
        print('\nPRIMER BARRIO:')
        print(f'  Nombre: {bar["properties"].get("nombre")}')
        print(f'  Geometry type: {bar["geometry"]["type"]}')
        # Mostrar primeras coordenadas del primer anillo
        coords = bar['geometry']['coordinates']
        if bar['geometry']['type'] == 'Polygon':
            print(f'  First coord (Polygon): {coords[0][0]}')
        elif bar['geometry']['type'] == 'MultiPolygon':
            print(f'  First coord (MultiPolygon): {coords[0][0][0]}')
        print(f'  Total features (barrios): {len(bar_data["features"])}')

print('\n--- Checking if siniestro point is inside any barrio polygon ---')

# Simple point-in-polygon test
def point_in_polygon(point, polygon):
    lng, lat = point
    inside = False

    if polygon['type'] == 'Polygon':
        coords = polygon['coordinates'][0]
        for i in range(len(coords)):
            j = (i + 1) % len(coords)
            xi, yi = coords[i]
            xj, yj = coords[j]
            
            intersect = ((yi > lat) != (yj > lat)) and (lng < (xj - xi) * (lat - yi) / (yj - yi) + xi)
            if intersect:
                inside = not inside
    
    elif polygon['type'] == 'MultiPolygon':
        for poly in polygon['coordinates']:
            for i in range(len(poly[0])):
                j = (i + 1) % len(poly[0])
                xi, yi = poly[0][i]
                xj, yj = poly[0][j]
                
                intersect = ((yi > lat) != (yj > lat)) and (lng < (xj - xi) * (lat - yi) / (yj - yi) + xi)
                if intersect:
                    inside = not inside
            
            if inside:
                break
    
    return inside

# Test if first siniestro is in any barrio
sin = sin_data['features'][0]
sin_coords = sin['geometry']['coordinates']

print(f'\nTesting siniestro at {sin_coords}...')
found = False
for i, feature in enumerate(bar_data['features']):
    if point_in_polygon(sin_coords, feature['geometry']):
        print(f'✅ ENCONTRADO en barrio #{i}: {feature["properties"].get("nombre")}')
        found = True
        break

if not found:
    print('❌ Siniestro NO está en ningún barrio!')
    print(f'\nVerificando bounds de barrios...')
    all_lngs = []
    all_lats = []
    for feature in bar_data['features']:
        coords = feature['geometry']['coordinates']
        if feature['geometry']['type'] == 'Polygon':
            for ring in coords:
                for lng, lat in ring:
                    all_lngs.append(lng)
                    all_lats.append(lat)
        elif feature['geometry']['type'] == 'MultiPolygon':
            for poly in coords:
                for ring in poly:
                    for lng, lat in ring:
                        all_lngs.append(lng)
                        all_lats.append(lat)
    
    print(f'Barrios bounds:')
    print(f'  Longitude: {min(all_lngs):.6f} to {max(all_lngs):.6f}')
    print(f'  Latitude: {min(all_lats):.6f} to {max(all_lats):.6f}')
    print(f'\nSiniestro coordinates: {sin_coords}')
