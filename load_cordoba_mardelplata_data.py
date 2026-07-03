#!/usr/bin/env python3
"""
Cargar datos reales de Mar del Plata y Córdoba a Firebase
para el panel admin de comparación
"""
import firebase_admin
from firebase_admin import credentials, firestore
import csv
from datetime import datetime

# Inicializar Firebase
cred = credentials.Certificate("trafico-map-general-v2-firebase-adminsdk-fbsvc-c8f1cfe957.json")
firebase_admin.initialize_app(cred)
db = firestore.client()

def parse_fecha(fecha_str):
    """Parse fecha from various formats"""
    if not fecha_str or fecha_str.strip() == '':
        return None
    try:
        # Intentar formato MM/DD/YYYY
        return datetime.strptime(fecha_str.strip(), "%m/%d/%Y").isoformat()
    except:
        try:
            # Intentar formato DD/MM/YYYY
            return datetime.strptime(fecha_str.strip(), "%d/%m/%Y").isoformat()
        except:
            return None

def load_siniestros_mardelplata():
    """Cargar siniestros de Mar del Plata"""
    print("📥 Cargando siniestros de Mar del Plata...")
    
    count = 0
    batch = db.batch()
    
    try:
        with open("public/data/SINIESTROS.csv", "r", encoding="utf-8") as f:
            reader = csv.DictReader(f)
            for row in reader:
                # Filtrar solo Mar del Plata
                if row.get("Barrio") and "mar" not in row.get("Barrio", "").lower():
                    continue
                    
                lat = float(row.get("Latitud", 0))
                lng = float(row.get("Longitud", 0))
                
                # Solo incluir si tiene coordenadas válidas
                if lat == 0 or lng == 0:
                    continue
                
                doc_ref = db.collection("clientes").document("mardelplata").collection("siniestros").document()
                
                batch.set(doc_ref, {
                    "lat": lat,
                    "lng": lng,
                    "fecha": parse_fecha(row.get("Fecha", "")),
                    "hora": row.get("Hora", ""),
                    "causa": row.get("Causa", ""),
                    "descripcion": row.get("Descripcion", ""),
                    "timestamp": datetime.now().isoformat()
                })
                
                count += 1
                if count % 500 == 0:
                    print(f"  ✓ {count} siniestros procesados...")
                    batch.commit()
                    batch = db.batch()
    
    except FileNotFoundError:
        print("❌ Archivo SINIESTROS.csv no encontrado")
        return 0
    
    # Commit último batch
    if count % 500 != 0:
        batch.commit()
    
    print(f"✅ {count} siniestros de Mar del Plata cargados")
    return count

def load_siniestros_cordoba():
    """Cargar siniestros de Córdoba"""
    print("📥 Cargando siniestros de Córdoba...")
    
    count = 0
    batch = db.batch()
    
    try:
        with open("public/data/siniestros_cordoba_1000.csv", "r", encoding="utf-8") as f:
            reader = csv.DictReader(f)
            for row in reader:
                lat = float(row.get("lat", 0))
                lng = float(row.get("lng", 0))
                
                # Solo incluir si tiene coordenadas válidas
                if lat == 0 or lng == 0:
                    continue
                
                doc_ref = db.collection("clientes").document("cordoba").collection("siniestros").document()
                
                batch.set(doc_ref, {
                    "lat": lat,
                    "lng": lng,
                    "fecha": parse_fecha(row.get("fecha", "")),
                    "causa": row.get("causa", ""),
                    "descripcion": row.get("descripcion", ""),
                    "timestamp": datetime.now().isoformat()
                })
                
                count += 1
                if count % 500 == 0:
                    print(f"  ✓ {count} siniestros procesados...")
                    batch.commit()
                    batch = db.batch()
    
    except FileNotFoundError:
        print("❌ Archivo siniestros_cordoba_1000.csv no encontrado")
        return 0
    
    # Commit último batch
    if count % 500 != 0:
        batch.commit()
    
    print(f"✅ {count} siniestros de Córdoba cargados")
    return count

def load_cameras_mardelplata():
    """Cargar cámaras públicas de Mar del Plata"""
    print("📥 Cargando cámaras públicas de Mar del Plata...")
    
    count = 0
    batch = db.batch()
    
    try:
        with open("public/data/lprs_38.geojson", "r", encoding="utf-8") as f:
            import json
            data = json.load(f)
            for feature in data.get("features", []):
                props = feature.get("properties", {})
                coords = feature.get("geometry", {}).get("coordinates", [])
                
                if not coords or len(coords) < 2:
                    continue
                
                doc_ref = db.collection("clientes").document("mardelplata").collection("cameras").document()
                
                batch.set(doc_ref, {
                    "lat": coords[1],
                    "lng": coords[0],
                    "nombre": props.get("address", f"Camera {count+1}"),
                    "barrio": props.get("barrio", ""),
                    "timestamp": datetime.now().isoformat()
                })
                
                count += 1
                if count % 500 == 0:
                    print(f"  ✓ {count} cámaras procesadas...")
                    batch.commit()
                    batch = db.batch()
    
    except FileNotFoundError:
        print("❌ Archivo lprs_38.geojson no encontrado")
        return 0
    
    # Commit último batch
    if count % 500 != 0:
        batch.commit()
    
    print(f"✅ {count} cámaras públicas de Mar del Plata cargadas")
    return count

def load_cameras_cordoba():
    """Cargar cámaras de Córdoba"""
    print("📥 Cargando cámaras de Córdoba...")
    
    count = 0
    batch = db.batch()
    
    try:
        with open("public/data/camaras_cordoba_ejemplo.csv", "r", encoding="utf-8") as f:
            reader = csv.DictReader(f)
            for row in reader:
                try:
                    lat = float(row.get("lat", 0) or 0)
                    lng = float(row.get("long", 0) or 0)
                    
                    if lat == 0 or lng == 0:
                        continue
                    
                    doc_ref = db.collection("clientes").document("cordoba").collection("cameras").document()
                    
                    batch.set(doc_ref, {
                        "lat": lat,
                        "lng": lng,
                        "nombre": row.get("nombre", f"Camera {count+1}"),
                        "direccion": row.get("direccion", ""),
                        "tipo": "publica",
                        "timestamp": datetime.now().isoformat()
                    })
                    
                    count += 1
                    if count % 500 == 0:
                        print(f"  ✓ {count} cámaras procesadas...")
                        batch.commit()
                        batch = db.batch()
                except ValueError:
                    continue
    
    except FileNotFoundError:
        print("⚠️  Archivo camaras_cordoba_ejemplo.csv no encontrado, intentando alterno...")
        # Intentar con cameras_cordoba.geojson
        try:
            with open("public/data/cameras_cordoba.geojson", "r", encoding="utf-8") as f:
                import json
                data = json.load(f)
                for feature in data.get("features", []):
                    props = feature.get("properties", {})
                    coords = feature.get("geometry", {}).get("coordinates", [])
                    
                    if not coords or len(coords) < 2:
                        continue
                    
                    doc_ref = db.collection("clientes").document("cordoba").collection("cameras").document()
                    
                    batch.set(doc_ref, {
                        "lat": coords[1],
                        "lng": coords[0],
                        "nombre": props.get("nombre", f"Camera {count+1}"),
                        "timestamp": datetime.now().isoformat()
                    })
                    
                    count += 1
                    if count % 500 == 0:
                        print(f"  ✓ {count} cámaras procesadas...")
                        batch.commit()
                        batch = db.batch()
        except FileNotFoundError:
            print("❌ Ningún archivo de cámaras de Córdoba encontrado")
            return 0
    
    # Commit último batch
    if count % 500 != 0:
        batch.commit()
    
    print(f"✅ {count} cámaras de Córdoba cargadas")
    return count

def main():
    print("\n🚀 Iniciando carga de datos para panel admin...")
    
    # Cargar Mar del Plata
    mdp_siniestros = load_siniestros_mardelplata()
    mdp_cameras = load_cameras_mardelplata()
    
    # Cargar Córdoba
    cb_siniestros = load_siniestros_cordoba()
    cb_cameras = load_cameras_cordoba()
    
    print("\n📊 Resumen de carga:")
    print(f"  🗺️  Mar del Plata: {mdp_siniestros} siniestros, {mdp_cameras} cámaras")
    print(f"  🗺️  Córdoba: {cb_siniestros} siniestros, {cb_cameras} cámaras")
    print(f"\n✅ Total cargado: {mdp_siniestros + mdp_cameras + cb_siniestros + cb_cameras} registros")

if __name__ == "__main__":
    main()
