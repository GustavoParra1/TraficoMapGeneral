// migrar_operarios_patrullas.cjs
// Script Node.js para migrar datos de _datos a documentos individuales

const admin = require('firebase-admin');
const serviceAccount = require('./service-account-key.json'); // Cambia el path si tu key tiene otro nombre

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

async function migrarOperariosYPatrullas(clienteId) {
  // Migrar operarios
  const opDoc = await db.collection(`clientes/${clienteId}/operadores`).doc('_datos').get();
  if (opDoc.exists) {
    const { nombres = [] } = opDoc.data();
    for (const nombre of nombres) {
      if (nombre) {
        await db.collection(`clientes/${clienteId}/operadores`).doc(nombre).set({ nombre });
        console.log(`✔ Operario migrado: ${nombre}`);
      }
    }
  } else {
    console.log('No se encontró _datos en operadores');
  }

  // Migrar patrullas
  const patDoc = await db.collection(`clientes/${clienteId}/patrullas`).doc('_datos').get();
  if (patDoc.exists) {
    const { dominios = [] } = patDoc.data();
    for (const dominio of dominios) {
      if (dominio) {
        await db.collection(`clientes/${clienteId}/patrullas`).doc(dominio).set({ dominio });
        console.log(`✔ Patrulla migrada: ${dominio}`);
      }
    }
  } else {
    console.log('No se encontró _datos en patrullas');
  }

  console.log('✅ Migración finalizada');
}

// Cambia el ID según corresponda
migrarOperariosYPatrullas('la-plata');
