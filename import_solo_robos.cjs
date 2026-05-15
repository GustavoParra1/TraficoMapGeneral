#!/usr/bin/env node
/**
 * Script para importar solo robos de automotor a Firebase Firestore
 * Uso: node import_solo_robos.cjs
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
const CITY_ID = 'laplata';
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

async function importRobos() {
  console.log('\n🚗💨 Importando SOLO ROBOS DE AUTOMOTORES...');
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
    // Copiar todos los campos originales y normalizar
    const roboDoc = { ...robo };
    roboDoc.año = parseInt(robo.año) || new Date().getFullYear();
    roboDoc.fecha = robo.fecha || new Date().toISOString().split('T')[0];
    roboDoc.lat = lat;
    roboDoc.lng = lng;
    roboDoc.resultado = robo.resultado || '';
    roboDoc.observaciones = robo.observaciones || '';
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

importRobos().then(() => process.exit(0)).catch(e => { console.error(e); process.exit(1); });
