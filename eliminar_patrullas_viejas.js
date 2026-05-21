// Script para eliminar patrullas viejas con IDs que no sean del formato PATRULLA_XX
// Ejecutar en consola del navegador autenticado o como función temporal en el proyecto

(async function eliminarPatrullasViejas() {
  const municipio = 'la-plata'; // Cambia si es otro municipio
  const coleccion = `patrullas_${municipio.replace(/-/g, '')}`;
  const db = firebase.firestore();
  const snapshot = await db.collection(coleccion).get();
  let eliminadas = 0;
  let total = 0;
  snapshot.forEach(doc => {
    total++;
    const id = doc.id;
    // Solo mantener IDs que empiecen con PATRULLA_
    if (!/^PATRULLA_/.test(id)) {
      db.collection(coleccion).doc(id).delete();
      console.log('🗑️ Eliminada:', id);
      eliminadas++;
    }
  });
  console.log(`\n✅ Eliminación completada. Total: ${total}, Eliminadas: ${eliminadas}`);
})();
