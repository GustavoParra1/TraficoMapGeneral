const fs = require('fs');
const path = require('path');

/**
 * Script para convertir el CSV de cámaras privadas a GeoJSON
 * Lee: MapaTraficoFinal/public/cámaras privadas MGP- CÁMARAS PRIVADAS.csv
 * Genera: TraficoMapGeneral/public/data/private-cameras.geojson
 */

const csvFilePath = path.join(__dirname, '..', 'MapaTraficoFinal', 'public', 'cámaras privadas MGP- CÁMARAS PRIVADAS.csv');
const outputPath = path.join(__dirname, 'public', 'data', 'private-cameras.geojson');

// Crear directorio data si no existe
const dataDir = path.join(__dirname, 'public', 'data');
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

try {
  // Leer archivo CSV
  const csvContent = fs.readFileSync(csvFilePath, 'utf-8');
  const lines = csvContent.split('\n').filter(l => l.trim());
  
  if (lines.length < 2) {
    throw new Error('CSV vacío o inválido');
  }

  // Saltar primeras líneas vacías y obtener header
  let headerLine = lines[0];
  let dataStartIndex = 1;
  
  // Si la primera línea está vacía o no es el header, buscar
  if (!headerLine.includes('WKT')) {
    for (let i = 0; i < Math.min(5, lines.length); i++) {
      if (lines[i].includes('WKT') || lines[i].includes('nombre')) {
        headerLine = lines[i];
        dataStartIndex = i + 1;
        break;
      }
    }
  }

  const headers = headerLine.split(',').map(h => h.trim());
  const colIndex = {};
  headers.forEach((header, index) => {
    colIndex[header] = index;
  });

  console.log('📋 Columnas detectadas:', headers.length, headers.slice(0, 3));
  
  const features = [];
  
  // Parsear cada línea de datos
  for (let i = dataStartIndex; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;
    
    // Buscar patrón POINT
    const pointMatch = line.match(/POINT\s*\(\s*([-\d.]+)\s+([-\d.]+)\s*\)/);
    if (!pointMatch) {
      console.warn(`⚠️  Fila ${i}: sin coordenadas POINT, saltando...`);
      continue;
    }

    const lon = parseFloat(pointMatch[1]);
    const lat = parseFloat(pointMatch[2]);

    if (isNaN(lon) || isNaN(lat)) {
      console.warn(`⚠️  Fila ${i}: coordenadas inválidas`);
      continue;
    }

    // Extraer nombre y descripción del resto de la línea
    // Separar por comas pero evitar mezclar con las coordenadas
    const afterPoint = line.substring(line.indexOf('POINT') + pointMatch[0].length).trim();
    const parts = afterPoint.split(',').map(p => p.trim());
    
    const nombre = parts[0] || 'Sin nombre';
    const descripcion = parts[1] || '';
    const tipo = parts[2] || 'Privada';

    // Crear feature GeoJSON
    const feature = {
      type: 'Feature',
      geometry: {
        type: 'Point',
        coordinates: [lon, lat]
      },
      properties: {
        id: nombre,
        name: nombre,
        description: descripcion,
        type: 'Privada',
        camera_type: tipo,
        public: false
      }
    };

    features.push(feature);
  }

  if (features.length === 0) {
    throw new Error('No se pudieron extraer coordenadas del archivo');
  }

  // Crear FeatureCollection
  const geojson = {
    type: 'FeatureCollection',
    features: features
  };

  // Guardar GeoJSON
  fs.writeFileSync(outputPath, JSON.stringify(geojson, null, 2));
  console.log(`✅ GeoJSON guardado: ${outputPath}`);
  console.log(`📊 Total cámaras privadas: ${features.length}`);
  
} catch (error) {
  console.error('❌ Error:', error.message);
  process.exit(1);
}
