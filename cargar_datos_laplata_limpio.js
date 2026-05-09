import admin from 'firebase-admin';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Config del Firebase de LA PLATA (no el tuyo)
const firebaseConfigLaPlata = {
  apiKey: "AIzaSyAY2jYGrXdwv3eyH19r8p7sw7iy5V5ApXg",
  authDomain: "laplatamaps-52a3b.firebaseapp.com",
  projectId: "laplatamaps-52a3b",
  storageBucket: "laplatamaps-52a3b.firebasestorage.app",
  messagingSenderId: "9948736453",
  appId: "1:9948736453:web:0f607caf88bb9478bdf9ac"
};

// Inicializar Firebase Admin con La Plata
const serviceAccount = JSON.parse(fs.readFileSync(path.join(__dirname, 'serviceAccountKey.json'), 'utf-8'));

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  projectId: "laplatamaps-52a3b"
});

const db = admin.firestore();

// Coordenadas de La Plata
const LAT_MIN = -34.921;
const LAT_MAX = -34.903;
const LNG_MIN = -57.955;
const LNG_MAX = -57.936;

function getRandomCoord(min, max) {
  return Math.random() * (max - min) + min;
}

function getRandomDate() {
  const start = new Date(2024, 0, 1);
  const end = new Date(2026, 5, 7);
  return new Date(start.getTime() + Math.random() * (end.getTime() - start.getTime()));
}

// Generar 500 siniestros
async function generarSiniestros() {
  console.log('📍 Generando 500 siniestros...');
  const tipos = ['choque', 'caída', 'despiste', 'volcamiento', 'atropellamiento'];
  
  const batch = db.batch();
  let count = 0;

  for (let i = 1; i <= 500; i++) {
    const siniestroRef = db.collection('siniestros').doc(`siniestro_${i}`);
    
    batch.set(siniestroRef, {
      id: `siniestro_${i}`,
      lat: getRandomCoord(LAT_MIN, LAT_MAX),
      lng: getRandomCoord(LNG_MIN, LNG_MAX),
      tipo: tipos[Math.floor(Math.random() * tipos.length)],
      descripcion: `Siniestro de tráfico en La Plata #${i}`,
      fecha: getRandomDate().toISOString(),
      ciudad: 'La Plata',
      timestamp: new Date(),
      estado: 'activo'
    });

    count++;
    if (count % 100 === 0) {
      console.log(`  ✅ ${count}/500 siniestros preparados`);
    }
  }

  await batch.commit();
  console.log('✅ 500 siniestros guardados en Firestore');
}

// Generar 500 cámaras públicas
async function generarCamarasPublicas() {
  console.log('📷 Generando 500 cámaras públicas...');
  const tipos = ['velocidad', 'semáforo', 'peaje', 'cruce', 'zona_escolar'];
  
  const batch = db.batch();
  let count = 0;

  for (let i = 1; i <= 500; i++) {
    const camaraRef = db.collection('cameras_publicas').doc(`cam_pub_${i}`);
    
    batch.set(camaraRef, {
      id: `cam_pub_${i}`,
      lat: getRandomCoord(LAT_MIN, LAT_MAX),
      lng: getRandomCoord(LNG_MIN, LNG_MAX),
      nombre: `Cámara Pública ${i}`,
      tipo: tipos[Math.floor(Math.random() * tipos.length)],
      ubicacion: `Ubicación ${i}, La Plata`,
      ciudad: 'La Plata',
      estado: 'activa',
      timestamp: new Date()
    });

    count++;
    if (count % 100 === 0) {
      console.log(`  ✅ ${count}/500 cámaras públicas preparadas`);
    }
  }

  await batch.commit();
  console.log('✅ 500 cámaras públicas guardadas en Firestore');
}

// Función principal
async function cargarDatos() {
  try {
    console.log('🚀 Iniciando carga de datos para La Plata...\n');
    
    await generarSiniestros();
    console.log('');
    await generarCamarasPublicas();
    
    console.log('\n✅ ===== CARGA COMPLETADA =====');
    console.log('📊 Resumen:');
    console.log('  - 500 siniestros cargados ✅');
    console.log('  - 500 cámaras públicas cargadas ✅');
    console.log('  - Firebase: laplatamaps-52a3b');
    console.log('  - Sin mezcla con otras ciudades\n');
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

cargarDatos();
