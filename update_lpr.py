#!/usr/bin/env python
"""Update cameras.geojson with LPR data from MapaTraficoFinal CSV"""
import csv
import json

def main():
    # Find all unique LPR camera numbers from source CSV
    lpr_cameras = set()
    csv_path = r'C:\Users\gparra\MapaTraficoFinal\public\Camaras.CSV1.csv'
    
    print("📖 Reading MapaTraficoFinal CSV...")
    try:
        with open(csv_path, 'r', encoding='utf-8') as f:
            reader = csv.DictReader(f)
            for row in reader:
                lpr_value = row.get('LPR', '').strip()
                if lpr_value:  # Not empty
                    camera_num = row.get('N CAMARA', '').strip()
                    if camera_num:
                        try:
                            lpr_cameras.add(int(camera_num))
                        except ValueError:
                            pass
    except Exception as e:
        print(f"❌ Error reading CSV: {e}")
        return False
    
    print(f"✅ Found {len(lpr_cameras)} unique LPR cameras")
    print(f"   List: {sorted(list(lpr_cameras))}")
    
    # Update cameras.geojson
    geojson_path = r'C:\Users\gparra\TraficoMapGeneral\public\data\cameras.geojson'
    
    print("\n🔄 Updating cameras.geojson...")
    try:
        with open(geojson_path, 'r', encoding='utf-8') as f:
            geojson_data = json.load(f)
        
        before = sum(1 for f in geojson_data['features'] if f.get('properties', {}).get('lpr') == 1)
        
        updated = 0
        for feature in geojson_data['features']:
            props = feature.get('properties', {})
            try:
                camera_num = int(props.get('camera_number', 0))
                if camera_num in lpr_cameras and props.get('lpr') != 1:
                    props['lpr'] = 1
                    updated += 1
            except (ValueError, TypeError):
                pass
        
        after = sum(1 for f in geojson_data['features'] if f.get('properties', {}).get('lpr') == 1)
        
        with open(geojson_path, 'w', encoding='utf-8') as f:
            json.dump(geojson_data, f, ensure_ascii=False, indent=2)
        
        print(f"   Before: {before} LPR cameras")
        print(f"   Updated: {updated} cameras")
        print(f"   After: {after} LPR cameras")
        print(f"✅ cameras.geojson updated successfully!")
        return True
        
    except Exception as e:
        print(f"❌ Error updating GeoJSON: {e}")
        return False

if __name__ == '__main__':
    success = main()
    exit(0 if success else 1)
