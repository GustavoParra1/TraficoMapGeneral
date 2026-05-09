/**
 * Diagnóstico para Admin Panel - Ejecutar en console del navegador
 * Copia y pega en F12 -> Console
 */

async function diagnosticoAdmin() {
  console.clear();
  console.log("🔍 INICIANDO DIAGNÓSTICO DEL ADMIN PANEL\n");
  
  // 1. Verificar si Firebase está inicializado
  console.log("1️⃣ Verificando Firebase...");
  if (!firebase || !db) {
    console.error("❌ Firebase NO está inicializado");
    return;
  }
  console.log("✅ Firebase está inicializado");
  
  // 2. Verificar usuario actual
  console.log("\n2️⃣ Verificando usuario autenticado...");
  const user = firebase.auth().currentUser;
  if (!user) {
    console.error("❌ No hay usuario autenticado");
    return;
  }
  console.log(`✅ Usuario: ${user.email}`);
  
  // 3. Obtener claims del token
  console.log("\n3️⃣ Verificando custom claims...");
  const idTokenResult = await user.getIdTokenResult(true);
  console.log("Custom claims:", idTokenResult.claims);
  
  const role = idTokenResult.claims.role;
  const rol = idTokenResult.claims.rol;
  
  if (role === 'admin' || rol === 'admin') {
    console.log("✅ Usuario tiene permisos de admin");
  } else {
    console.error("❌ Usuario NO tiene permisos de admin");
    console.error(`   - role: ${role}`);
    console.error(`   - rol: ${rol}`);
    return;
  }
  
  // 4. Intentar leer colección de clientes
  console.log("\n4️⃣ Intentando leer colección 'clientes'...");
  try {
    const snapshot = await db.collection('clientes').get();
    console.log(`✅ Lectura exitosa. Clientes encontrados: ${snapshot.size}`);
    
    snapshot.docs.forEach(doc => {
      console.log(`   - ${doc.id}: ${doc.data().nombre} (${doc.data().estado})`);
    });
  } catch (error) {
    console.error("❌ Error al leer clientes:", error.message);
    console.error("   Código:", error.code);
    
    if (error.code === 'permission-denied') {
      console.error("   📋 Las Firestore Rules deniegan acceso. Verifica:");
      console.error("      - ¿El usuario tiene role='admin' en custom claims?");
      console.error("      - ¿Las Firestore Rules permiten isSuperAdmin()?");
    }
  }
  
  // 5. Intentar leer colección de subscripciones
  console.log("\n5️⃣ Intentando leer colección 'subscripciones'...");
  try {
    const snapshot = await db.collection('subscripciones').get();
    console.log(`✅ Lectura exitosa. Suscripciones encontradas: ${snapshot.size}`);
  } catch (error) {
    console.error("❌ Error al leer subscripciones:", error.message);
  }
  
  // 6. Intentar leer colección de billing
  console.log("\n6️⃣ Intentando leer colección 'billing'...");
  try {
    const snapshot = await db.collection('billing').get();
    console.log(`✅ Lectura exitosa. Billing encontrado: ${snapshot.size}`);
  } catch (error) {
    console.error("❌ Error al leer billing:", error.message);
  }
  
  console.log("\n✅ DIAGNÓSTICO COMPLETADO");
}

// Ejecutar diagnóstico
diagnosticoAdmin();
