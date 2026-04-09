import shutil
import os

old_file = "public/data/cameras_cordoba.geojson"
new_file = "public/data/cameras_cordoba_new.geojson"

try:
    # Remove old file if exists
    if os.path.exists(old_file):
        os.remove(old_file)
        print(f"✅ Archivo viejo eliminado: {old_file}")
    
    # Rename/move new file to old name
    shutil.move(new_file, old_file)
    print(f"✅ Archivo renombrado: {new_file} → {old_file}")
    
    # Verify file exists and has content
    if os.path.exists(old_file):
        size = os.path.getsize(old_file)
        print(f"✅ Verificación: {old_file} existe ({size} bytes)")
    
except Exception as e:
    print(f"❌ Error: {e}")
