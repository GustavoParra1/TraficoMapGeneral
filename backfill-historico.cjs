/**
 * Script de backfill para copiar siniestros/robos/denuncias existentes 
 * a sus colecciones históricas (después de deployer las Cloud Functions)
 * 
 * Uso: node backfill-historico.js
 */

const admin = require('firebase-admin');
const serviceAccount = require('./service-account-key.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

const db = admin.firestore();

async function backfillColeccion(clienteId, nombreColeccion, nombreHistorico) {
  console.log(`\n📋 Procesando ${clienteId}/${nombreColeccion}...`);
  
  try {
    const snapshot = await db
      .collection(`clientes/${clienteId}/${nombreColeccion}`)
      .get();
    
    console.log(`   Encontrados: ${snapshot.size} documentos`);
    
    if (snapshot.size === 0) {
      console.log(`   ✓ Nada que copiar`);
      return 0;
    }
    
    let copiados = 0;
    for (const doc of snapshot.docs) {
      const data = doc.data();
      
      // Si ya está en histórico, salta
      const yaEnHistorico = await db
        .collection(`clientes/${clienteId}/${nombreHistorico}`)
        .doc(doc.id)
        .get();
      
      if (yaEnHistorico.exists) {
        console.log(`   ⊘ ${doc.id} ya existe en histórico, saltando`);
        continue;
      }
      
      // Copiar con timestamp archivoEn
      const dataConTimestamp = {
        ...data,
        archivoEn: admin.firestore.FieldValue.serverTimestamp(),
      };
      
      if (nombreColeccion === 'siniestros' || nombreColeccion === 'robos') {
        dataConTimestamp[nombreColeccion.slice(0, -1) + 'Id'] = doc.id; // siniestroId, roboId
      } else if (nombreColeccion === 'denuncias') {
        dataConTimestamp.denunciaId = doc.id;
      }
      
      await db
        .collection(`clientes/${clienteId}/${nombreHistorico}`)
        .doc(doc.id)
        .set(dataConTimestamp);
      
      copiados++;
      console.log(`   ✓ ${doc.id} copiado a ${nombreHistorico}`);
    }
    
    return copiados;
  } catch (error) {
    console.error(`   ❌ Error:`, error.message);
    return 0;
  }
}

async function main() {
  console.log('🔄 INICIANDO BACKFILL DE DATOS HISTÓRICOS\n');
  console.log('Esto copiará datos existentes a colecciones "historico"');
  console.log('Útil después de deployer las Cloud Functions\n');
  
  try {
    // Obtener todos los clientes
    const clientesSnapshot = await db.collection('clientes').get();
    console.log(`Encontrados ${clientesSnapshot.size} clientes\n`);
    
    let totalCopiados = 0;
    
    for (const clienteDoc of clientesSnapshot.docs) {
      const clienteId = clienteDoc.id;
      console.log(`\n${'='.repeat(60)}`);
      console.log(`CLIENTE: ${clienteId}`);
      console.log('='.repeat(60));
      
      const copiados1 = await backfillColeccion(clienteId, 'siniestros', 'siniestros_historico');
      const copiados2 = await backfillColeccion(clienteId, 'robos', 'robos_historico');
      const copiados3 = await backfillColeccion(clienteId, 'denuncias', 'denuncias_historico');
      
      const subtotal = copiados1 + copiados2 + copiados3;
      console.log(`\n   SUBTOTAL ${clienteId}: ${subtotal} documentos`);
      totalCopiados += subtotal;
    }
    
    console.log(`\n${'='.repeat(60)}`);
    console.log(`✅ BACKFILL COMPLETADO`);
    console.log(`Total copiados: ${totalCopiados} documentos`);
    console.log('='.repeat(60));
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error fatal:', error);
    process.exit(1);
  }
}

main();
