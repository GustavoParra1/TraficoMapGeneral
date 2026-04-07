const fs = require('fs');
const path = require('path');

/**
 * Script para convertir el CSV de cámaras de MapaTraficoFinal a GeoJSON
 * Lee: MapaTraficoFinal/public/Camaras.CSV1.csv
 * Genera: TraficoMapGeneral/public/data/cameras.geojson
 */

const csvFilePath = path.join(__dirname, '..', 'MapaTraficoFinal', 'public', 'Camaras.CSV1.csv');
const outputPath = path.join(__dirname, 'public', 'data', 'cameras.geojson');

// Crear directorio data si no existe
const dataDir = path.join(__dirname, 'public', 'data');
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

try {
  // Leer archivo CSV
  const csvContent = fs.readFileSync(csvFilePath, 'utf-8');
  const lines = csvContent.split('\n');
  
  if (lines.length < 2) {
    throw new Error('CSV vacío o inválido');
  }

  // Función para parsear línea CSV respetando comillas
  function parseCSVLine(line) {
    const result = [];
    let current = '';
    let insideQuotes = false;

    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      
      if (char === '"') {
        insideQuotes = !insideQuotes;
      } else if (char === ',' && !insideQuotes) {
        result.push(current.trim().replace(/^"|"$/g, ''));
        current = '';
      } else {
        current += char;
      }
    }
    
    result.push(current.trim().replace(/^"|"$/g, ''));
    return result;
  }

  // Parsear header
  const headers = parseCSVLine(lines[0]);
  
  // Crear mapeo de índices de columnas
  const colIndex = {};
  headers.forEach((header, index) => {
    colIndex[header] = index;
  });

  console.log('📋 Columnas detectadas:', headers.length);
  
  const features = [];
  
  // Parsear cada línea
  for (let i = 1; i < lines.length; i++) {
    if (!lines[i].trim()) continue;
    
    const values = parseCSVLine(lines[i]);
    
    // Obtener coordenadas
    const lonStr = values[colIndex['Longitud']] || '';
    const latStr = values[colIndex['Latitud']] || '';
    
    if (!lonStr || !latStr) {
      continue;
    }

    // Convertir coordenadas (reemplazar comas por puntos)
    let lon = parseFloat(lonStr.replace(',', '.'));
    let lat = parseFloat(latStr.replace(',', '.'));

    if (isNaN(lon) || isNaN(lat)) {
      continue;
    }

    // Obtener otros valores
    const cameraNum = values[colIndex['N CAMARA']] || 'unknown';
    const address = values[colIndex['Direccion']] || '';
    const barrio = values[colIndex['Barrios']] || '';
    const ciudad = values[colIndex['Ciudad']] || '';
    const provincia = values[colIndex['Provincia']] || '';
    const pais = values[colIndex['Pais']] || '';
    const domos = parseInt(values[colIndex['Domos']] || '0') || 0;
    const fijas = parseInt(values[colIndex['Fijas']] || '0') || 0;
    const lpr = parseInt(values[colIndex['LPR']] || '0') || 0;
    const totalCams = parseInt(values[colIndex['Total Camaras']] || '1') || 1;
    const corridor = values[colIndex['Corredor']] || '';
    const schoolCorridor = !!values[colIndex['C. ESCOLARES']];
    const monitoring = !!values[colIndex['C. SEGUIMIENTO']];
    const streetType = values[colIndex['Tipo de Arteria']] || '';

    // Crear feature GeoJSON
    const feature = {
      type: 'Feature',
      geometry: {
        type: 'Point',
        coordinates: [lon, lat]
      },
      properties: {
        id: cameraNum,
        camera_number: cameraNum,
        address: address,
        barrio: barrio,
        city: ciudad,
        province: provincia,
        country: pais,
        domes: domos,
        fixed: fijas,
        lpr: lpr,
        total_cameras: totalCams,
        type: 'Pública (Municipal)',
        corridor: corridor,
        school_corridor: schoolCorridor,
        monitoring: monitoring,
        street_type: streetType
      }
    };

    features.push(feature);
  }

  // Crear FeatureCollection
  const geojson = {
    type: 'FeatureCollection',
    features: features
  };

  // Guardar GeoJSON
  fs.writeFileSync(outputPath, JSON.stringify(geojson, null, 2));
  console.log(`✅ GeoJSON guardado: ${outputPath}`);
  console.log(`📊 Total cámaras: ${features.length}`);
  
} catch (error) {
  console.error('❌ Error:', error.message);
  process.exit(1);
}
