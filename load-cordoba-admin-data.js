#!/usr/bin/env node
/**
 * Cargar datos de Córdoba a Firebase para panel admin
 */
const admin = require("firebase-admin");
const fs = require("fs");
const csv = require("csv-parser");

// Inicializar Firebase
const serviceAccount = require("./trafico-map-general-v2-firebase-adminsdk-fbsvc-c8f1cfe957.json");
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL: "https://trafico-map-general-v2.firebaseio.com"
});

const db = admin.firestore();

async function loadCordobaSiniestros() {
  console.log("📥 Cargando siniestros de Córdoba...");
  
  let count = 0;
  const batch = db.batch();
  
  return new Promise((resolve) => {
    fs.createReadStream("public/data/siniestros_cordoba_1000.csv")
      .pipe(csv())
      .on("data", (row) => {
        try {
          const lat = parseFloat(row.lat || 0);
          const lng = parseFloat(row.lng || 0);
          
          if (lat === 0 || lng === 0) return;
          
          const docRef = db.collection("clientes").doc("cordoba").collection("siniestros").doc();
          
          batch.set(docRef, {
            lat,
            lng,
            fecha: row.fecha || "",
            causa: row.causa || "",
            descripcion: row.descripcion || "",
            timestamp: new Date().toISOString()
          });
          
          count++;
          if (count % 500 === 0) {
            console.log(`  ✓ ${count} siniestros procesados...`);
          }
        } catch (error) {
          console.error("Error procesando fila:", error);
        }
      })
      .on("end", async () => {
        await batch.commit();
        console.log(`✅ ${count} siniestros de Córdoba cargados`);
        resolve(count);
      })
      .on("error", (error) => {
        console.error("❌ Error leyendo CSV:", error);
        resolve(0);
      });
  });
}

async function loadCordobaCameras() {
  console.log("📥 Cargando cámaras de Córdoba...");
  
  let count = 0;
  const batch = db.batch();
  
  return new Promise((resolve) => {
    fs.createReadStream("public/data/camaras_cordoba_ejemplo.csv")
      .pipe(csv())
      .on("data", (row) => {
        try {
          const lat = parseFloat(row.lat || 0);
          const lng = parseFloat(row.long || 0);
          
          if (lat === 0 || lng === 0) return;
          
          const docRef = db.collection("clientes").doc("cordoba").collection("cameras").doc();
          
          batch.set(docRef, {
            lat,
            lng,
            nombre: row.nombre || `Camera ${count + 1}`,
            direccion: row.direccion || "",
            tipo: "publica",
            timestamp: new Date().toISOString()
          });
          
          count++;
          if (count % 500 === 0) {
            console.log(`  ✓ ${count} cámaras procesadas...`);
          }
        } catch (error) {
          console.error("Error procesando fila:", error);
        }
      })
      .on("end", async () => {
        if (count > 0) {
          await batch.commit();
        }
        console.log(`✅ ${count} cámaras de Córdoba cargadas`);
        resolve(count);
      })
      .on("error", (error) => {
        console.error("❌ Error leyendo CSV:", error);
        resolve(0);
      });
  });
}

async function main() {
  console.log("\n🚀 Iniciando carga de datos de Córdoba para panel admin...\n");
  
  try {
    const cbSiniestros = await loadCordobaSiniestros();
    const cbCameras = await loadCordobaCameras();
    
    console.log("\n📊 Resumen de carga Córdoba:");
    console.log(`   ${cbSiniestros} siniestros`);
    console.log(`   ${cbCameras} cámaras`);
    console.log(`\n✅ Total cargado: ${cbSiniestros + cbCameras} registros`);
    
    process.exit(0);
  } catch (error) {
    console.error("❌ Error durante la carga:", error);
    process.exit(1);
  }
}

main();
