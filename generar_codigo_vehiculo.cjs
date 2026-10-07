// Genera el código de vinculación de un tracker GPS.
// El código se muestra UNA sola vez en pantalla (para dárselo al dueño).
// En Firestore se guarda solamente su hash, en la colección privada vehiculos_codigos.
//
// Uso (desde la carpeta donde están tus otros scripts .cjs):
//   node generar_codigo_vehiculo.cjs <IMEI> <clienteId> <ruta-a-clave.json>
// Ejemplo:
//   node generar_codigo_vehiculo.cjs 358878731342298 mardelplata ./mi-clave.json
//
// Para pasarle un auto a otro dueño (venta): agregar --reasignar al final.
// Eso quita al dueño y a los familiares actuales y genera un código nuevo.

const crypto = require('crypto');
const admin = require('firebase-admin');

const args = process.argv.slice(2).filter((a) => !a.startsWith('--'));
const reasignar = process.argv.includes('--reasignar');
const [imei, clienteId, rutaClave] = args;

if (!imei || !clienteId || !rutaClave) {
  console.error('Uso: node generar_codigo_vehiculo.cjs <IMEI> <clienteId> <ruta-a-clave.json> [--reasignar]');
  process.exit(1);
}
if (!/^[A-Za-z0-9_-]{4,40}$/.test(imei)) {
  console.error('IMEI inválido');
  process.exit(1);
}

// Sin 0/O ni 1/I para que no se confundan al dictarlo.
const ALFABETO = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // 32 símbolos
let limpio = '';
for (let i = 0; i < 8; i++) limpio += ALFABETO[crypto.randomInt(ALFABETO.length)];
const hash = crypto.createHash('sha256').update(`${imei}:${limpio}`).digest('hex');
const codigoMostrado = `${limpio.slice(0, 4)}-${limpio.slice(4)}`;

admin.initializeApp({ credential: admin.credential.cert(require(require('path').resolve(rutaClave))) });
const db = admin.firestore();

(async () => {
  const vehRef = db.collection('vehiculos').doc(imei);
  const veh = await vehRef.get();
  if (veh.exists && veh.data().duenoUid) {
    if (!reasignar) {
      console.error('❌ Ese vehículo ya tiene dueño. Si es una venta, repetí el comando con --reasignar.');
      process.exit(1);
    }
    await vehRef.update({
      duenoUid: admin.firestore.FieldValue.delete(),
      compartidoCon: [],
      robado: false,
    });
    console.log('♻️  Se quitó el dueño y los familiares anteriores.');
  }

  await db.collection('vehiculos_codigos').doc(imei).set({
    hash,
    clienteId,
    usado: false,
    creadoEn: admin.firestore.FieldValue.serverTimestamp(),
  });

  console.log('');
  console.log('✅ Código creado para el vehículo', imei, '(cliente:', clienteId + ')');
  console.log('');
  console.log('   CÓDIGO:  ' + codigoMostrado);
  console.log('');
  console.log('Anotalo ahora: no se vuelve a mostrar. Si se pierde, corré el script de nuevo.');
  process.exit(0);
})().catch((e) => {
  console.error('Error:', e.message);
  process.exit(1);
});
