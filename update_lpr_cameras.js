#!/usr/bin/env node

const fs = require('fs');
const csv = require('csv-parse/sync');
const path = require('path');

const csvFile = 'C:\\Users\\gparra\\MapaTraficoFinal\\public\\Camaras.CSV1.csv';
const geoJsonFile = 'C:\\Users\\gparra\\TraficoMapGeneral\\public\\data\\cameras.geojson';

console.log('='.repeat(70));
console.log('STEP 1: Reading CSV file and extracting LPR camera numbers');
console.log('='.repeat(70));

// Read and parse CSV
const csvContent = fs.readFileSync(csvFile, 'utf-8');
const records = csv.parse(csvContent, {
  columns: true,
  skip_empty_lines: true,
  trim: true
});

// Extract LPR cameras
const lprCameras = new Set();
const cameraDetails = {};

records.forEach(row => {
  const cameraNum = (row['N CAMARA'] || '').trim();
  const lprColumn = (row['LPR'] || '').trim();
  
  if (cameraNum && lprColumn) {
    lprCameras.add(cameraNum);
    if (!cameraDetails[cameraNum]) {
      cameraDetails[cameraNum] = [];
    }
    cameraDetails[cameraNum].push(lprColumn);
  }
});

const sortedCameras = Array.from(lprCameras).sort((a, b) => {
  const aNum = parseInt(a) || 0;
  const bNum = parseInt(b) || 0;
  return aNum - bNum;
});

console.log(`\nTotal unique LPR cameras found in CSV: ${lprCameras.size}`);
console.log(`Camera numbers with LPR: [${sortedCameras.join(', ')}]`);

console.log('\n' + '='.repeat(70));
console.log('STEP 2: Reading existing cameras.geojson');
console.log('='.repeat(70));

const geoJsonData = JSON.parse(fs.readFileSync(geoJsonFile, 'utf-8'));

// Count LPR cameras before update
const beforeCount = geoJsonData.features.filter(f => f.properties.lpr === 1).length;
console.log(`LPR cameras in GeoJSON before update: ${beforeCount}`);

console.log('\n' + '='.repeat(70));
console.log('STEP 3: Updating GeoJSON with LPR flag');
console.log('='.repeat(70));

let updatedCount = 0;
geoJsonData.features.forEach(feature => {
  const cameraNum = (feature.properties.camera_number || '').trim();
  
  if (lprCameras.has(cameraNum)) {
    feature.properties.lpr = 1;
    updatedCount++;
  }
});

console.log(`Features updated with lpr = 1: ${updatedCount}`);

// Count LPR cameras after update
const afterCount = geoJsonData.features.filter(f => f.properties.lpr === 1).length;
console.log(`LPR cameras in GeoJSON after update: ${afterCount}`);

console.log('\n' + '='.repeat(70));
console.log('STEP 4: Writing updated GeoJSON back to file');
console.log('='.repeat(70));

fs.writeFileSync(geoJsonFile, JSON.stringify(geoJsonData, null, 2));
console.log(`Updated file saved: ${geoJsonFile}`);

console.log('\n' + '='.repeat(70));
console.log('SUMMARY');
console.log('='.repeat(70));
console.log(`✓ LPR cameras found in CSV: ${lprCameras.size}`);
console.log(`✓ Camera numbers: [${sortedCameras.join(', ')}]`);
console.log(`✓ Before update: ${beforeCount} LPR cameras in GeoJSON`);
console.log(`✓ After update: ${afterCount} LPR cameras in GeoJSON`);
console.log(`✓ Features updated: ${updatedCount}`);
console.log(`✓ File saved successfully: ${geoJsonFile}`);
console.log('='.repeat(70));
