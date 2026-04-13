const fs = require('fs');

console.log('🔄 Starting LPR update process...');

// Read CSV file
const csvPath = 'C:\\Users\\gparra\\MapaTraficoFinal\\public\\Camaras.CSV1.csv';
const geojsonPath = './public/data/cameras.geojson';

function parseCSV(text) {
  const lines = text.split('\n');
  const header = lines[0].split(',').map(h => h.trim().replace(/"/g, ''));
  const records = [];
  
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;
    
    // Handle quoted CSV values
    const regex = /("([^"]|"")*"|[^,]*)/g;
    const values = [];
    let match;
    while ((match = regex.exec(line)) !== null) {
      let value = match[0].trim();
      if (value.startsWith('"') && value.endsWith('"')) {
        value = value.slice(1, -1).replace(/""/g, '"');
      }
      values.push(value);
    }
    
    const record = {};
    header.forEach((key, idx) => {
      record[key] = values[idx] || '';
    });
    records.push(record);
  }
  
  return records;
}

try {
  // Read CSV
  const csvContent = fs.readFileSync(csvPath, 'utf-8');
  const records = parseCSV(csvContent);

  // Extract unique LPR camera numbers
  const lprCameras = new Set();
  records.forEach(row => {
    const lprValue = row['LPR'] || row['lpr'] || '';
    const cameraNum = row['N CAMARA'] || row['n camara'] || '';
    
    if (cameraNum && lprValue && lprValue.trim() && lprValue.trim() !== '0') {
      lprCameras.add(cameraNum.trim());
    }
  });

  console.log(`✅ LPR Cameras encontradas en CSV: ${lprCameras.size}`);
  const sortedLPRs = Array.from(lprCameras).sort((a, b) => parseInt(a) - parseInt(b));
  console.log(`   IDs: ${sortedLPRs.join(', ')}`);

  // Read GeoJSON
  const geojsonContent = fs.readFileSync(geojsonPath, 'utf-8');
  const geojson = JSON.parse(geojsonContent);

  // Update features
  let updatedCount = 0;
  geojson.features.forEach(feature => {
    const cameraId = String(feature.properties.camera_number || feature.properties.id || '');
    if (lprCameras.has(cameraId)) {
      if (feature.properties.lpr !== 1) {
        feature.properties.lpr = 1;
        updatedCount++;
      }
    } else {
      // Ensure non-LPR cameras have lpr: 0
      if (feature.properties.lpr !== 0) {
        feature.properties.lpr = 0;
      }
    }
  });

  // Save updated GeoJSON
  fs.writeFileSync(geojsonPath, JSON.stringify(geojson, null, 2));
  
  // Verify
  const verifyContent = fs.readFileSync(geojsonPath, 'utf-8');
  const lprCount = (verifyContent.match(/"lpr": 1/g) || []).length;

  console.log(`✅ GeoJSON actualizado`);
  console.log(`   Cámaras marcadas como LPR: ${lprCount}`);
  console.log(`   Actualización completada exitosamente`);

} catch (error) {
  console.error('❌ Error:', error.message);
  console.error(error.stack);
  process.exit(1);
}
