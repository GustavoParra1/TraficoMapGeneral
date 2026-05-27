'use strict';
 
const functions = require('firebase-functions');
const admin = require('firebase-admin');
 
exports.borrarUsuarioPanel = functions.https.onCall(async (data, context) => {
  console.log('=== borrarUsuarioPanel llamada ===', { data });
 
  // Validar autenticación
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'No hay usuario autenticado.');
  }
 
  // Validar que sea admin (acepta cualquiera de los tres claims posibles)
  const token = context.auth.token;
  const esAdmin = token.admin === true || token.rol === 'admin' || token.role === 'admin';
  if (!esAdmin) {
    console.error('[borrarUsuarioPanel] Sin permisos admin. Token:', JSON.stringify(token));
    throw new functions.https.HttpsError('permission-denied', 'Solo administradores pueden borrar usuarios.');
  }
 
  const { email } = data;
  if (!email) {
    throw new functions.https.HttpsError('invalid-argument', 'Se requiere el email del usuario a borrar.');
  }
 
  try {
    // Buscar usuario por email
    const userRecord = await admin.auth().getUserByEmail(email);
    const uid = userRecord.uid;
 
    // Eliminar de Firebase Auth
    await admin.auth().deleteUser(uid);
    console.log(`[borrarUsuarioPanel] ✅ Usuario eliminado de Auth: ${email} (${uid})`);
 
    // Limpiar de colección global usuarios (no falla si no existe)
    await admin.firestore().collection('usuarios').doc(uid).delete().catch(() => {});
 
    return { success: true, email, uid };
 
  } catch (error) {
    if (error.code === 'auth/user-not-found') {
      // Si no existe en Auth, igual devolvemos éxito (ya estaba borrado)
      console.warn(`[borrarUsuarioPanel] Usuario no encontrado en Auth: ${email}`);
      return { success: true, email, nota: 'El usuario no existía en Auth' };
    }
    console.error('[borrarUsuarioPanel] ERROR:', error);
    throw new functions.https.HttpsError('internal', error.message);
  }
});
 