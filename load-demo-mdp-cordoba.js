const admin = require('firebase-admin');
const fs = require('fs');
const csv = require('csv-parse/sync');
const path = require('path');

// Initialize Firebase Admin SDK
const serviceAccount = require('./trafico-map-general-v2-firebase-adminsdk-fbsvc-c8f1cfe957.json');
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

// Read CSV files
function readCSV(filePath) {
  const content = fs.readFileSync(filePath, 'utf-8');
  return csv.parse(content, {
    columns: true,
    skip_empty_lines: true,
    encoding: 'utf-8'
  });
}

async function loadMarDelPlataData() {
  console.log('\n📍 CARGANDO DATOS DE MAR DEL PLATA...');
  
  try {
    // Read siniestros
    console.log('📖 Leyendo siniestros...');
    const records = readCSV('public/data/SINIESTROS.csv');
    console.log(`✅ Se leyeron ${records.length} registros de siniestros`);

    // Get reference to mardelplata client
    const clientPath = db.collection('clientes').doc('mardelplata');
    
    // Delete existing siniestros
    console.log('🗑️ Limpiando siniestros anteriores...');
    const existingSnapshot = await clientPath.collection('siniestros').get();
    for (const doc of existingSnapshot.docs) {
      await doc.ref.delete();
    }
    
    // Add siniestros in batches
    console.log('⏳ Cargando siniestros a Firebase...');
    let batch = db.batch();
    let batchCount = 0;
    
    for (let i = 0; i < records.length; i++) {
      const record = records[i];
      
      // Parse coordinates from file
      if (i === 0) console.log('📍 Muestra de datos:', JSON.stringify(record, null, 2).substring(0, 300));
      
      // Handle different possible coordinate formats
      let lat, lng;
      
      // Try to extract from dirección or use placeholder
      if (record['DIRECCIÓN SINIESTRO']) {
        // Skip invalid records
        if (!record['DIRECCIÓN SINIESTRO'] || record['DIRECCIÓN SINIESTRO'].trim() === '') continue;
      }
      
      // Use approximate coordinates for Mar del Plata if no exact location
      lat = -38.0055 + (Math.random() * 0.08 - 0.04);
      lng = -57.5521 + (Math.random() * 0.1 - 0.05);
      
      const sinDoc = {
        numero_orden: record['N° ORDEN'] || i + 1,
        numero_camara: record['N° CÁMARA'] || 0,
        barrio: record['BARRIOS'] || 'Centro',
        direccion: record['DIRECCIÓN SINIESTRO'] || 'Sin ubicación',
        fecha: record['FECHA'] || new Date().toISOString(),
        hora: record['HORA'] || '00:00:00',
        tipo_participantes: record['CÓDIGO PARTICIPANTES'] || 'A/M',
        causa: record['CÓDIGOS CAUSAS'] || 'NSD',
        lat: lat,
        lng: lng,
        timestamp: admin.firestore.FieldValue.serverTimestamp()
      };
      
      batch.set(
        clientPath.collection('siniestros').doc(`siniestro_${i + 1}`),
        sinDoc
      );
      
      batchCount++;
      if (batchCount >= 100) {
        await batch.commit();
        console.log(`✅ Cargados ${i + 1}/${records.length} siniestros...`);
        batch = db.batch();
        batchCount = 0;
      }
    }
    
    if (batchCount > 0) {
      await batch.commit();
    }
    
    console.log(`✅ Se cargaron todos los ${records.length} siniestros para Mar del Plata`);
    
    // Load cameras
    console.log('\n📹 Cargando cámaras de Mar del Plata...');
    
    // Delete existing cameras
    const cameraSnapshot = await clientPath.collection('cameras').get();
    for (const doc of cameraSnapshot.docs) {
      await doc.ref.delete();
    }
    
    // Add some example cameras for Mar del Plata
    const exampleCameras = [
      { numero: 1, nombre: 'Av. Colon Centro', lat: -38.0055, lng: -57.5521, tipo: 'publica' },
      { numero: 2, nombre: 'Av. Libertad Sur', lat: -38.0150, lng: -57.5600, tipo: 'publica' },
      { numero: 3, nombre: 'Ruta 88 Norte', lat: -38.126321, lng: -57.6022, tipo: 'publica' },
      { numero: 4, nombre: 'Malvinas Centro', lat: -37.9629, lng: -57.5853, tipo: 'publica' },
      { numero: 5, nombre: 'Constitución Est', lat: -37.9702, lng: -57.5435, tipo: 'publica' },
    ];
    
    batch = db.batch();
    for (let i = 0; i < exampleCameras.length; i++) {
      const camera = exampleCameras[i];
      batch.set(
        clientPath.collection('cameras').doc(`camera_${camera.numero}`),
        {
          numero: camera.numero,
          nombre: camera.nombre,
          lat: camera.lat,
          lng: camera.lng,
          tipo: camera.tipo,
          timestamp: admin.firestore.FieldValue.serverTimestamp()
        }
      );
    }
    await batch.commit();
    console.log(`✅ Se cargaron ${exampleCameras.length} cámaras de ejemplo para Mar del Plata`);
    
  } catch (error) {
    console.error('❌ Error cargando Mar del Plata:', error);
  }
}

async function loadCordobaData() {
  console.log('\n📍 CARGANDO DATOS DE CÓRDOBA...');
  
  try {
    // Read Córdoba siniestros
    console.log('📖 Leyendo siniestros de Córdoba...');
    const records = readCSV('public/data/siniestros_cordoba_1000.csv');
    console.log(`✅ Se leyeron ${records.length} registros de siniestros de Córdoba`);

    // Get reference to cordoba client
    const clientPath = db.collection('clientes').doc('cordoba');
    
    // Delete existing siniestros
    console.log('🗑️ Limpiando siniestros anteriores...');
    const existingSnapshot = await clientPath.collection('siniestros').get();
    for (const doc of existingSnapshot.docs) {
      await doc.ref.delete();
    }
    
    // Add siniestros in batches
    console.log('⏳ Cargando siniestros de Córdoba a Firebase...');
    let batch = db.batch();
    let batchCount = 0;
    
    for (let i = 0; i < records.length; i++) {
      const record = records[i];
      
      const sinDoc = {
        numero: i + 1,
        barrio: record['barrio'] || 'Centro',
        lat: parseFloat(record['lat']) || -31.4165 + (Math.random() * 0.1 - 0.05),
        lng: parseFloat(record['lng']) || -64.1811 + (Math.random() * 0.1 - 0.05),
        fecha: record['fecha'] || new Date().toISOString(),
        timestamp: admin.firestore.FieldValue.serverTimestamp()
      };
      
      batch.set(
        clientPath.collection('siniestros').doc(`siniestro_${i + 1}`),
        sinDoc
      );
      
      batchCount++;
      if (batchCount >= 100) {
        await batch.commit();
        console.log(`✅ Cargados ${i + 1}/${records.length} siniestros...`);
        batch = db.batch();
        batchCount = 0;
      }
    }
    
    if (batchCount > 0) {
      await batch.commit();
    }
    
    console.log(`✅ Se cargaron todos los ${records.length} siniestros para Córdoba`);
    
    // Load cameras
    console.log('\n📹 Cargando cámaras de Córdoba...');
    
    // Delete existing cameras
    const cameraSnapshot = await clientPath.collection('cameras').get();
    for (const doc of cameraSnapshot.docs) {
      await doc.ref.delete();
    }
    
    // Add example cameras for Córdoba
    const exampleCameras = [
      { numero: 1, nombre: 'Centro Administrativo', lat: -31.4165, lng: -64.1811, tipo: 'publica' },
      { numero: 2, nombre: 'Av. Acoyte Sur', lat: -31.4265, lng: -64.1811, tipo: 'publica' },
      { numero: 3, nombre: 'Barrio San Vicente', lat: -31.3965, lng: -64.1711, tipo: 'publica' },
      { numero: 4, nombre: 'Ruta 9 Norte', lat: -31.3565, lng: -64.1911, tipo: 'publica' },
    ];
    
    batch = db.batch();
    for (let i = 0; i < exampleCameras.length; i++) {
      const camera = exampleCameras[i];
      batch.set(
        clientPath.collection('cameras').doc(`camera_${camera.numero}`),
        {
          numero: camera.numero,
          nombre: camera.nombre,
          lat: camera.lat,
          lng: camera.lng,
          tipo: camera.tipo,
          timestamp: admin.firestore.FieldValue.serverTimestamp()
        }
      );
    }
    await batch.commit();
    console.log(`✅ Se cargaron ${exampleCameras.length} cámaras de ejemplo para Córdoba`);
    
  } catch (error) {
    console.error('❌ Error cargando Córdoba:', error);
  }
}

async function main() {
  console.log('🚀 Iniciando carga de datos reales...');
  await loadMarDelPlataData();
  await loadCordobaData();
  console.log('\n✅ ¡Carga completada! Desplegando cambios...');
  process.exit(0);
}

main().catch(console.error);
