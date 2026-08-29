/**
 * IMPORTADOR "MAPA DEL DELITO" -> Firestore (denuncias_historico)
 * =================================================================
 * Lee mdd_data.json (320 casos, ya parseados y categorizados desde el PDF
 * "Mapa del Delito"), geocodifica cada dirección (Nominatim/OpenStreetMap),
 * y escribe cada caso en:
 *     clientes/{clienteId}/denuncias_historico
 * usando el clienteId que corresponda según el barrio del caso.
 *
 * NO escribe en la colección "denuncias" (la de vecinos en vivo) para no
 * arriesgar disparar notificaciones/alertas en tiempo real a nadie — solo
 * toca la colección de solo-lectura que usa el mapa.
 *
 * ---------------------------------------------------------------
 * CÓMO USARLO
 * ---------------------------------------------------------------
 * 1. Necesitás Node.js 18 o más nuevo (usa fetch nativo).
 *
 * 2. Instalá la única dependencia:
 *      npm install firebase-admin
 *
 * 3. Conseguí tu Service Account Key de Firebase (si no tenés uno):
 *      - Andá a https://console.firebase.google.com/
 *      - Elegí el proyecto "trafico-map-general-v2"
 *      - ⚙️ Configuración del proyecto → Cuentas de servicio
 *      - "Generar nueva clave privada" → se descarga un .json
 *      - Guardalo en esta misma carpeta como serviceAccountKey.json
 *      - OJO: ese archivo da acceso total a tu Firestore. No lo subas a
 *        git ni lo compartas. Agregalo a tu .gitignore si no está ya.
 *
 * 4. Completá el mapa BARRIO_A_CLIENTE de abajo con los clienteId reales
 *    (a medida que los vayas creando desde el panel admin). Los que dejes
 *    en null se saltean en esta corrida — podés volver a correr el script
 *    más adelante con más barrios completados, es seguro repetirlo (usa
 *    IDs determinísticos, no duplica si un caso ya fue cargado).
 *
 * 5. Corré:
 *      node importar-mdd.js
 *
 *    Vas a ver el progreso en consola. Al final te tira un resumen por
 *    barrio: cuántos se cargaron, cuántos se saltearon (sin clienteId
 *    todavía) y cuántos fallaron al geocodificar.
 * =================================================================
 */

const fs = require('fs');
const crypto = require('crypto');
// 🩹 FIX: se usa la API modular moderna de firebase-admin (recomendada
// oficialmente desde hace varias versiones) en vez de admin.credential.cert
// / admin.firestore.Timestamp clásicos — versiones recientes (v13+)
// cambiaron cómo exponen esas rutas y rompían el require() de siempre.
const { initializeApp, cert } = require('firebase-admin/app');
const { getFirestore, Timestamp } = require('firebase-admin/firestore');

// -----------------------------------------------------------------
// 1) COMPLETÁ ACÁ los clienteId a medida que crees cada cliente desde
//    el panel admin (/admin/clientes). El de Constitución ya lo tenemos.
// -----------------------------------------------------------------
const BARRIO_A_CLIENTE = {
  'Constitución': 'constitucion-1783519219617',
  'Zacagnini': 'zacagnini-1787756378260',
  'Centro': 'centro-1787756381574',
  'Parque Montemar - El Gro': 'parque-montemar-1787756382699', // "Parque Montemar - El Grosellar"
  'Los Pinares': 'los-pinares-1785499320631',
  'Parque Luro': 'parque-luro-1787756383791',
  'Nueva Pompeya': 'pompeya-1785293622673',
  'La Perla': 'la-perla-1784108938925',
  'Caisamar y Estrada': 'caisamar-estrada-1787756384914',
  'Villa Primera': 'villa-primera-1787756386300',
  'Don Bosco': 'don-bosco-1787756387369'
};

// -----------------------------------------------------------------
// 2) Inicializar Firebase Admin
// -----------------------------------------------------------------
const serviceAccount = require('./serviceAccountKey.json');
initializeApp({
  credential: cert(serviceAccount)
});
const db = getFirestore();

// -----------------------------------------------------------------
// 3) Geocoding con Nominatim (OpenStreetMap) — gratis, sin API key.
//    Política de uso: máximo 1 request/segundo y User-Agent identificable.
//    Cacheamos por dirección para no pedir dos veces la misma.
// -----------------------------------------------------------------
const geocodeCache = new Map();

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function geocodificar(direccionCompleta) {
  if (geocodeCache.has(direccionCompleta)) {
    return geocodeCache.get(direccionCompleta);
  }

  const query = encodeURIComponent(`${direccionCompleta}, Mar del Plata, Buenos Aires, Argentina`);
  const url = `https://nominatim.openstreetmap.org/search?format=json&limit=1&q=${query}`;

  try {
    const res = await fetch(url, {
      headers: {
        // Nominatim pide un User-Agent identificable, no un browser UA genérico.
        'User-Agent': 'TraficoMapGeneral-ImportadorMDD/1.0 (uso interno, importacion historica)'
      }
    });
    const data = await res.json();
    let resultado = null;
    if (Array.isArray(data) && data.length > 0) {
      resultado = { lat: parseFloat(data[0].lat), lng: parseFloat(data[0].lon) };
    }
    geocodeCache.set(direccionCompleta, resultado);
    return resultado;
  } catch (err) {
    console.error(`   ⚠️ Error geocodificando "${direccionCompleta}":`, err.message);
    geocodeCache.set(direccionCompleta, null);
    return null;
  } finally {
    // Respetar 1 request/segundo de Nominatim.
    await sleep(1100);
  }
}

// -----------------------------------------------------------------
// 4) ID determinístico por caso, para que correr el script dos veces
//    no duplique nada (usa .doc(id).set() en vez de .add()).
// -----------------------------------------------------------------
function idDeterministico(r) {
  const base = `${r.tipo}|${r.fecha}|${r.hora}|${r.direccion_raw}`;
  return 'mdd_' + crypto.createHash('md5').update(base).digest('hex').slice(0, 20);
}

// -----------------------------------------------------------------
// 5) Convertir fecha+hora del PDF a Firestore Timestamp real
//    (para que los filtros de año/fecha del mapa funcionen bien).
// -----------------------------------------------------------------
function timestampDelCaso(r) {
  // r.fecha = "2026-08-25", r.hora = "14:20"
  const fechaHora = new Date(`${r.fecha}T${r.hora}:00-03:00`); // -03:00 = hora Argentina
  if (isNaN(fechaHora.getTime())) {
    return Timestamp.now(); // fallback, no debería pasar
  }
  return Timestamp.fromDate(fechaHora);
}

// -----------------------------------------------------------------
// 6) Main
// -----------------------------------------------------------------
async function main() {
  const registros = JSON.parse(fs.readFileSync('./mdd_data.json', 'utf-8'));
  console.log(`📋 ${registros.length} casos leídos de mdd_data.json\n`);

  const resumen = {}; // barrio -> {cargados, saltados, fallidos}
  for (const barrio of Object.keys(BARRIO_A_CLIENTE)) {
    resumen[barrio] = { cargados: 0, saltados: 0, fallidos_geocoding: 0 };
  }

  // Agrupar escrituras por clienteId para hacer batches eficientes
  const batchesPorCliente = {};

  let i = 0;
  for (const r of registros) {
    i++;
    const clienteId = BARRIO_A_CLIENTE[r.barrio];

    if (!clienteId) {
      resumen[r.barrio].saltados++;
      continue;
    }

    process.stdout.write(`\r[${i}/${registros.length}] Geocodificando: ${r.direccion_raw.slice(0, 50).padEnd(50)}`);

    const coords = await geocodificar(r.direccion_raw);
    if (!coords) {
      resumen[r.barrio].fallidos_geocoding++;
      continue;
    }

    const denuncia = {
      categoria: r.categoria,
      subcategoria: r.subcategoria,
      texto: r.descripcion,
      vecino: 'Importado (Mapa del Delito)',
      vecinoEmail: null,
      estado: 'nueva',
      hasImage: false,
      lat: coords.lat,
      lng: coords.lng,
      barrio: r.barrio,
      direccionOriginal: r.direccion_raw,
      fuente: 'importacion_pdf_mapa_delito_2026_08_26',
      timestamp: timestampDelCaso(r)
    };

    if (!batchesPorCliente[clienteId]) batchesPorCliente[clienteId] = [];
    batchesPorCliente[clienteId].push({ id: idDeterministico(r), data: denuncia, barrio: r.barrio });
  }

  console.log('\n\n📤 Escribiendo en Firestore...\n');

  for (const [clienteId, items] of Object.entries(batchesPorCliente)) {
    // Firestore permite max 500 operaciones por batch
    for (let start = 0; start < items.length; start += 450) {
      const chunk = items.slice(start, start + 450);
      const batch = db.batch();
      for (const item of chunk) {
        const ref = db.collection(`clientes/${clienteId}/denuncias_historico`).doc(item.id);
        batch.set(ref, item.data, { merge: true }); // merge:true => re-correr el script no pisa mal ni duplica
        resumen[item.barrio].cargados++;
      }
      await batch.commit();
      console.log(`   ✅ ${chunk.length} casos escritos en clientes/${clienteId}/denuncias_historico`);
    }
  }

  console.log('\n========== RESUMEN ==========');
  for (const [barrio, r] of Object.entries(resumen)) {
    const clienteId = BARRIO_A_CLIENTE[barrio] || '(sin cliente todavía)';
    console.log(`${barrio.padEnd(28)} -> ${clienteId.padEnd(30)} cargados: ${r.cargados}  saltados: ${r.saltados}  fallidos geocoding: ${r.fallidos_geocoding}`);
  }
  console.log('==============================\n');
  console.log('Listo. Los barrios con "saltados" > 0 son los que todavía no tienen clienteId configurado en BARRIO_A_CLIENTE — completalos y volvé a correr el script cuando quieras (es seguro, no duplica).');
}

main().catch((err) => {
  console.error('❌ Error fatal:', err);
  process.exit(1);
});
