#!/usr/bin/env node
/**
 * Script para importar datos de DATOS_EJEMPLO_LA_PLATA a Firebase Firestore
 * Uso: node import_la_plata_data.js
 */

const admin = require('firebase-admin');
const fs = require('fs');
const path = require('path');
const csv = require('csv-parser');

// Inicializar Firebase Admin
const serviceAccount = require('./serviceAccountKey.json');
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL: "https://traficomap-4be39.firebaseio.com"
});

const db = admin.firestore();

// Ciudad objetivo
const CITY_NAME = 'La Plata Maps';
const CITY_ID = 'laplata';
const NORMALIZED_CITY_ID = CITY_ID.replace(/-/g, '');  // "laplata"

// Rutas de archivos
const DATA_DIR = path.join(__dirname, 'DATOS_EJEMPLO_LA_PLATA');

async function readCSVFile(filePath) {
  const results = [];
  return new Promise((resolve, reject) => {
    fs.createReadStream(filePath)
      .pipe(csv())
      .on('data', (data) => results.push(data))
      .on('end', () => resolve(results))
      .on('error', reject);
  });
}

async function importCameras() {
  console.log('\n🎥 Importando CÁMARAS PÚBLICAS...');
  const cameras = await readCSVFile(path.join(DATA_DIR, '02_cameras_publicas.csv'));
  
  const camerasRef = db.collection(`clientes/${CITY_ID}/cameras`);
  let count = 0;
  
  // Batch writes (Firestore límite: 500 por batch)
  let batch = db.batch();
  let batchCount = 0;
  
  for (const cam of cameras) {
    const lat = parseFloat(cam.lat);
    const lng = parseFloat(cam.lng);
    
    if (isNaN(lat) || isNaN(lng)) continue;
    
    const docRef = camerasRef.doc();
    batch.set(docRef, {
      camera_number: parseInt(cam.camera_number) || count,
      lat: lat,
      lng: lng,
      address: cam.address || '',
      barrio: cam.barrio || '',
      type: cam.type || 'Pública (Municipal)',
      domes: parseInt(cam.domes) || 0,
      fixed: parseInt(cam.fixed) || 0,
      lpr: parseInt(cam.lpr) || 0,
      corridor: cam.corridor || '',
      school_corridor: cam.school_corridor === 'TRUE' ? true : false,
      monitoring: cam.monitoring === 'TRUE' ? true : false,
      created_at: new Date(),
      city_id: CITY_ID
    });
    
    batchCount++;
    count++;
    
    // Commit batch cada 500 documentos
    if (batchCount === 500) {
      await batch.commit();
      console.log(`  ✓ ${count} cámaras públicas...`);
      batch = db.batch();
      batchCount = 0;
    }
  }
  
  // Commit últimos documentos
  if (batchCount > 0) {
    await batch.commit();
  }
  
  console.log(`✅ ${count} cámaras públicas importadas`);
  return count;
}

async function importCamerasPrivadas() {
  console.log('\n📹 Importando CÁMARAS PRIVADAS...');
  const cameras = await readCSVFile(path.join(DATA_DIR, '03_cameras_privadas.csv'));
  
  const camerasRef = db.collection(`clientes/${CITY_ID}/cameras_privadas`);
  let count = 0;
  
  let batch = db.batch();
  let batchCount = 0;
  
  for (const cam of cameras) {
    const lat = parseFloat(cam.lat);
    const lng = parseFloat(cam.lng);
    
    if (isNaN(lat) || isNaN(lng)) continue;
    
    const docRef = camerasRef.doc();
    batch.set(docRef, {
      nombre: cam.nombre || `Cámara Privada ${count}`,
      lat: lat,
      lng: lng,
      address: cam.address || '',
      barrio: cam.barrio || '',
      tipo: cam.tipo || '',
      created_at: new Date(),
      city_id: CITY_ID
    });
    
    batchCount++;
    count++;
    
    if (batchCount === 500) {
      await batch.commit();
      console.log(`  ✓ ${count} cámaras privadas...`);
      batch = db.batch();
      batchCount = 0;
    }
  }
  
  if (batchCount > 0) {
    await batch.commit();
  }
  
  console.log(`✅ ${count} cámaras privadas importadas`);
  return count;
}

async function importSiniestros() {
  console.log('\n🚗 Importando SINIESTROS...');
  const siniestros = await readCSVFile(path.join(DATA_DIR, '01_siniestros.csv'));
  
  const siniestrosRef = db.collection(`clientes/${CITY_ID}/siniestros`);
  let count = 0;
  
  let batch = db.batch();
  let batchCount = 0;
  
  for (const sin of siniestros) {
    const lat = parseFloat(sin.lat);
    const lng = parseFloat(sin.lng);
    
    if (isNaN(lat) || isNaN(lng)) continue;
    
    const docRef = siniestrosRef.doc();
    batch.set(docRef, {
      lat: lat,
      lng: lng,
      nombre: sin.nombre || `Siniestro ${count}`,
      tipo: sin.tipo || '',
      fecha: sin.fecha || new Date().toISOString().split('T')[0],
      causa: sin.causa || '',
      participantes: sin.participantes || '',
      descripcion: sin.descripcion || '',
      barrio: sin.barrio || '',
      created_at: new Date(),
      city_id: CITY_ID
    });
    
    batchCount++;
    count++;
    
    if (batchCount === 500) {
      await batch.commit();
      console.log(`  ✓ ${count} siniestros...`);
      batch = db.batch();
      batchCount = 0;
    }
  }
  
  if (batchCount > 0) {
    await batch.commit();
  }
  
  console.log(`✅ ${count} siniestros importados`);
  return count;
}

async function importSemaforos() {
  console.log('\n🚦 Importando SEMÁFOROS...');
  const semaforos = await readCSVFile(path.join(DATA_DIR, '04_semaforos.csv'));
  
  const semaforosRef = db.collection(`clientes/${CITY_ID}/semaforos`);
  let count = 0;
  
  let batch = db.batch();
  let batchCount = 0;
  
  for (const sem of semaforos) {
    const lat = parseFloat(sem.lat);
    const lng = parseFloat(sem.lng);
    
    if (isNaN(lat) || isNaN(lng)) continue;
    
    const docRef = semaforosRef.doc();
    batch.set(docRef, {
      nombre: sem.nombre || `Semáforo ${count}`,
      lat: lat,
      lng: lng,
      estado: sem.estado || 'activo',
      barrio: sem.barrio || '',
      created_at: new Date(),
      city_id: CITY_ID
    });
    
    batchCount++;
    count++;
    
    if (batchCount === 500) {
      await batch.commit();
      console.log(`  ✓ ${count} semáforos...`);
      batch = db.batch();
      batchCount = 0;
    }
  }
  
  if (batchCount > 0) {
    await batch.commit();
  }
  
  console.log(`✅ ${count} semáforos importados`);
  return count;
}

async function importRobos() {
  console.log('\n🚗💨 Importando ROBOS DE AUTOMOTORES...');
  const robos = await readCSVFile(path.join(DATA_DIR, '05_robos_automotor.csv'));
  
  const robosRef = db.collection(`clientes/${CITY_ID}/robo`);
  let count = 0;
  
  let batch = db.batch();
  let batchCount = 0;
  
  for (const robo of robos) {
    const lat = parseFloat(robo.lat);
    const lng = parseFloat(robo.lng);
    if (isNaN(lat) || isNaN(lng)) continue;
    const docRef = robosRef.doc();

    // Copiar todos los campos originales
    const roboDoc = { ...robo };
    // Normalizar año
    roboDoc.año = parseInt(robo.año) || new Date().getFullYear();
    // Normalizar fecha
    roboDoc.fecha = robo.fecha || new Date().toISOString().split('T')[0];
    // Normalizar lat/lng
    roboDoc.lat = lat;
    roboDoc.lng = lng;
    // Normalizar resultado
    roboDoc.resultado = robo.resultado || '';
    // Normalizar observaciones
    roboDoc.observaciones = robo.observaciones || '';
    // city_id y created_at
    roboDoc.city_id = CITY_ID;
    roboDoc.created_at = new Date();
    // Asegurar los tres campos de código
    roboDoc.codigo = robo.codigo || robo.resultado_codigo || robo.resultadoCodigo || '';
    roboDoc.resultado_codigo = robo.resultado_codigo || robo.codigo || robo.resultadoCodigo || '';
    roboDoc.resultadoCodigo = robo.resultadoCodigo || robo.codigo || robo.resultado_codigo || '';

    batch.set(docRef, roboDoc);
    batchCount++;
    count++;
    if (batchCount === 500) {
      await batch.commit();
      console.log(`  ✓ ${count} robos...`);
      batch = db.batch();
      batchCount = 0;
    }
  }
  
  if (batchCount > 0) {
    await batch.commit();
  }
  
  console.log(`✅ ${count} robos importados`);
  return count;
}

async function importEscuelas() {
  console.log('\n🏫 Importando ESCUELAS Y COLEGIOS...');
  const escuelas = await readCSVFile(path.join(DATA_DIR, '06_escuelas_colegios.csv'));
  
  const escuelasRef = db.collection(`clientes/${CITY_ID}/colegios`);
  let count = 0;
  
  let batch = db.batch();
  let batchCount = 0;
  
  for (const esc of escuelas) {
    const lat = parseFloat(esc.lat);
    const lng = parseFloat(esc.lng);
    
    if (isNaN(lat) || isNaN(lng)) continue;
    
    const docRef = escuelasRef.doc();
    batch.set(docRef, {
      nombre: esc.nombre || `Escuela ${count}`,
      lat: lat,
      lng: lng,
      address: esc.address || '',
      barrio: esc.barrio || '',
      tipo: esc.tipo || '',
      nivel: esc.nivel || '',
      created_at: new Date(),
      city_id: CITY_ID
    });
    
    batchCount++;
    count++;
    
    if (batchCount === 500) {
      await batch.commit();
      console.log(`  ✓ ${count} escuelas...`);
      batch = db.batch();
      batchCount = 0;
    }
  }
  
  if (batchCount > 0) {
    await batch.commit();
  }
  
  console.log(`✅ ${count} escuelas importadas`);
  return count;
}

async function run() {
  console.log('🚀 Importando datos de La Plata a Firebase Firestore...\n');
  console.log(`  📍 Ciudad: ${CITY_NAME}`);
  console.log(`  🆔 City ID: ${CITY_ID}\n`);
  
  try {
    const stats = {};
    stats.cameras = await importCameras();
    stats.private_cameras = await importCamerasPrivadas();
    stats.siniestros = await importSiniestros();
    stats.semaforos = await importSemaforos();
    stats.robos = await importRobos();
    stats.escuelas = await importEscuelas();
    
    console.log('\n✅ ===== IMPORTACIÓN COMPLETADA =====');
    console.log(`  📷 Cámaras públicas: ${stats.cameras}`);
    console.log(`  📹 Cámaras privadas: ${stats.private_cameras}`);
    console.log(`  🚗 Siniestros: ${stats.siniestros}`);
    console.log(`  🚦 Semáforos: ${stats.semaforos}`);
    console.log(`  💨 Robos: ${stats.robos}`);
    console.log(`  🏫 Escuelas: ${stats.escuelas}`);
    console.log(`\n  📊 Total: ${Object.values(stats).reduce((a,b) => a+b, 0)} registros`);
    console.log('\n✨ Los datos están listos en Firestore.\n');
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error durante importación:', error);
    process.exit(1);
  }
}

run();
