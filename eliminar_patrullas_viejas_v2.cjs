const admin = require("firebase-admin");
const serviceAccount = require("./serviceAccountKey.json");

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

(async function eliminarPatrullasViejas() {
  const municipio = "la-plata";
  const coleccion = `patrullas_laplata`;
  console.log(`Buscando patrullas en la coleccion: ${coleccion}...`);
  
  const snapshot = await db.collection(coleccion).get();
  let eliminadas = 0;
  let total = 0;

  if (snapshot.empty) {
    console.log("No se encontraron documentos.");
    return;
  }

  for (const doc of snapshot.docs) {
    total++;
    const id = doc.id;
    // Solo mantener IDs que empiecen con PATRULLA_
    if (!/^PATRULLA_/.test(id)) {
      await db.collection(coleccion).doc(id).delete();
      console.log(`Eliminada: ${id}`);
      eliminadas++;
    }
  }

  console.log(`\nEliminacion completada. Total analizados: ${total}, Eliminados: ${eliminadas}`);
  process.exit(0);
})();

