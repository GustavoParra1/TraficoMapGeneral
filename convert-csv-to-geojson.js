const fs = require('fs');
const csv = require('csv-parse/sync');

// Leer CSV con encoding UTF-8
const csvContent = fs.readFileSync('public/data/SINIESTROS.csv', 'utf-8');

// Parsear CSV
const records = csv.parse(csvContent, {
  columns: true,
  delimiter: ',',
  skip_empty_lines: true
});

console.log(`Leyendo ${records.length} registros del CSV`);
console.log('Primeras columnas:', Object.keys(records[0]));

// Convertir a GeoJSON
const features = records.map(record => {
  const lon = parseFloat(record.longitud || record.LONGITUD || 0);
  const lat = parseFloat(record.latitud || record.LATITUD || 0);
  
  return {
    type: 'Feature',
    geometry: {
      type: 'Point',
      coordinates: [lon, lat]
    },
    properties: record
  };
});

const geojson = {
  type: 'FeatureCollection',
  features: features
};

// Escribir con encoding UTF-8
fs.writeFileSync('public/data/siniestros_con_ubicacion.geojson', JSON.stringify(geojson, null, 2), 'utf-8');
console.log(`✅ GeoJSON convertido: ${features.length} siniestros`);
