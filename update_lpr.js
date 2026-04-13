const fs = require('fs');
const path = require('path');

const csvPath = 'C:\\Users\\gparra\\MapaTraficoFinal\\public\\Camaras.CSV1.csv';
const geojsonPath = 'C:\\Users\\gparra\\TraficoMapGeneral\\public\\data\\cameras.geojson';

// Read CSV and extract LPR cameras
const csvData = fs.readFileSync(csvPath, 'utf-8');
const lines = csvData.split('\n').slice(1); // Skip header

const lprCameras = new Set();

lines.forEach(line => {
  if (!line.trim()) return;
  
  // CSV parsing (simple approach for quoted fields)
  const parts = [];
  let current = '';
  let inQuotes = false;
  
  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === '"') inQuotes = !inQuotes;
    else if (char === ',' && !inQuotes) {
      parts.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }
  parts.push(current.trim());
  
  // Columns: Longitud(1), Latitud(2), Direccion(3), N CAMARA(4), Domos(5), Fijas(6), LPR(7)...
  const nCamara = parts[4] ? parts[4].replace(/"/g, '').trim() : '';
  const lpr = parts[7] ? parts[7].replace(/"/g, '').trim() : '';
  
  if (nCamara && lpr) {
    // Has both camera number and LPR value
    try {
      lprCameras.add(parseInt(nCamara));
    } catch (e) {
      //ignore
    }
  }
});

console.log(`Found ${lprCameras.size} LPR cameras`);
console.log(`List: ${Array.from(lprCameras).sort((a,b) => a-b).join(', ')}`);

// Update GeoJSON
const geojson = JSON.parse(fs.readFileSync(geojsonPath, 'utf-8'));

const before = geojson.features.filter(f => f.properties.lpr === 1).length;

geojson.features.forEach(feature => {
  const camNum = parseInt(feature.properties.camera_number);
  if (lprCameras.has(camNum)) {
    feature.properties.lpr = 1;
  }
});

const after = geojson.features.filter(f => f.properties.lpr === 1).length;

fs.writeFileSync(geojsonPath, JSON.stringify(geojson, null, 2));

console.log(`Before: ${before} LPRs`);
console.log(`After: ${after} LPRs`);
console.log(`✅ Updated!`);
