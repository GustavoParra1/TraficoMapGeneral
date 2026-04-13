#!/usr/bin/env python3
import csv
import json
from pathlib import Path

# File paths
csv_file = r"C:\Users\gparra\MapaTraficoFinal\public\Camaras.CSV1.csv"
geojson_file = r"C:\Users\gparra\TraficoMapGeneral\public\data\cameras.geojson"

print("=" * 70)
print("STEP 1: Reading CSV file and extracting LPR camera numbers")
print("=" * 70)

# Read CSV and extract LPR cameras
lpr_cameras = set()
camera_details = {}

with open(csv_file, 'r', encoding='utf-8') as f:
    reader = csv.DictReader(f)
    for row in reader:
        camera_num = row.get('N CAMARA', '').strip()
        lpr_column = row.get('LPR', '').strip()
        
        if camera_num and lpr_column:  # If both exist and LPR is not empty
            lpr_cameras.add(camera_num)
            if camera_num not in camera_details:
                camera_details[camera_num] = []
            camera_details[camera_num].append(lpr_column)

print(f"\nTotal unique LPR cameras found in CSV: {len(lpr_cameras)}")
print(f"Camera numbers with LPR: {sorted(lpr_cameras, key=lambda x: int(x) if x.isdigit() else 0)}")

print("\n" + "=" * 70)
print("STEP 2: Reading existing cameras.geojson")
print("=" * 70)

with open(geojson_file, 'r', encoding='utf-8') as f:
    geojson_data = json.load(f)

# Count LPR cameras before update
before_count = sum(1 for feature in geojson_data.get('features', []) 
                   if feature.get('properties', {}).get('lpr') == 1)

print(f"LPR cameras in GeoJSON before update: {before_count}")

print("\n" + "=" * 70)
print("STEP 3: Updating GeoJSON with LPR flag")
print("=" * 70)

updated_count = 0
for feature in geojson_data.get('features', []):
    props = feature.get('properties', {})
    camera_num = props.get('camera_number', '').strip()
    
    if camera_num in lpr_cameras:
        feature['properties']['lpr'] = 1
        updated_count += 1

print(f"Features updated with lpr = 1: {updated_count}")

# Count LPR cameras after update
after_count = sum(1 for feature in geojson_data.get('features', []) 
                  if feature.get('properties', {}).get('lpr') == 1)

print(f"LPR cameras in GeoJSON after update: {after_count}")

print("\n" + "=" * 70)
print("STEP 4: Writing updated GeoJSON back to file")
print("=" * 70)

with open(geojson_file, 'w', encoding='utf-8') as f:
    json.dump(geojson_data, f, indent=2, ensure_ascii=False)

print(f"Updated file saved: {geojson_file}")

print("\n" + "=" * 70)
print("SUMMARY")
print("=" * 70)
print(f"✓ LPR cameras found in CSV: {len(lpr_cameras)}")
print(f"✓ Camera numbers: {sorted(lpr_cameras, key=lambda x: int(x) if x.isdigit() else float('inf'))}")
print(f"✓ Before update: {before_count} LPR cameras in GeoJSON")
print(f"✓ After update: {after_count} LPR cameras in GeoJSON")
print(f"✓ Features updated: {updated_count}")
print(f"✓ File saved successfully: {geojson_file}")
print("=" * 70)
