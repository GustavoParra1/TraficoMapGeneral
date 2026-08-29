/**
 * SETEAR CUSTOM CLAIMS -> Firebase Auth
 * ===================================================================
 * Los 7 usuarios creados por crear-clientes-faltantes.js se loguean
 * bien, pero les faltan los custom claims (role, cliente_id) que las
 * Firestore Rules necesitan para autorizarlos a leer sus propios
 * datos. Sin esto, isClienteAdmin(clienteId) siempre da false.
 *
 * Este script les setea:
 *   role: 'admin'
 *   cliente_id: '<el clienteId del barrio>'
 *
 * ---------------------------------------------------------------
 * IMPORTANTE: el usuario tiene que cerrar sesión y volver a loguearse
 * (o refrescar su token) después de correr esto, porque los custom
 * claims solo se aplican en un token NUEVO — un token ya emitido no
 * se actualiza solo hasta que expira (~1 hora) o se fuerza refresh.
 * ===================================================================
 */

const { initializeApp, cert } = require('firebase-admin/app');
const { getAuth } = require('firebase-admin/auth');

const serviceAccount = require('./serviceAccountKey.json');
const app = initializeApp({ credential: cert(serviceAccount) });
const auth = getAuth(app);

// clienteId == uid, porque así los creó crear-clientes-faltantes.js
const CLIENTES_A_ARREGLAR = [
  'zacagnini-1787756378260',
  'centro-1787756381574',
  'parque-montemar-1787756382699',
  'parque-luro-1787756383791',
  'caisamar-estrada-1787756384914',
  'villa-primera-1787756386300',
  'don-bosco-1787756387369'
];

async function main() {
  for (const clienteId of CLIENTES_A_ARREGLAR) {
    try {
      await auth.setCustomUserClaims(clienteId, {
        role: 'admin',
        cliente_id: clienteId
      });
      console.log(`✅ Claims seteados para ${clienteId} (role: admin, cliente_id: ${clienteId})`);
    } catch (err) {
      console.error(`❌ Error seteando claims para ${clienteId}:`, err.message);
    }
  }
  console.log('\nListo. Cada admin tiene que cerrar sesión y volver a loguearse para que el token nuevo incluya los claims.');
}

main().catch((err) => {
  console.error('❌ Error fatal:', err);
  process.exit(1);
});
