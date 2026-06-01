const functions = require('firebase-functions');
const admin = require('firebase-admin');

// Cloud Function HTTPS para crear usuario patrulla/operario
exports.crearUsuarioPanel = functions.https.onCall(async (data, context) => {
  // Solo permitir admins autenticados
  const isAdmin = context.auth && context.auth.token && (context.auth.token.admin === true || context.auth.token.role === 'admin');
  if (!isAdmin) {
    throw new functions.https.HttpsError('permission-denied', 'Solo administradores pueden crear usuarios.');
  }

  const { email, password, displayName, city, rol } = data;
  if (!email || !password || !city || !rol) {
    throw new functions.https.HttpsError('invalid-argument', 'Faltan datos obligatorios.');
  }

  try {
    // Crear usuario en Auth
    const userRecord = await admin.auth().createUser({
      email,
      password,
      displayName,
      emailVerified: false,
      disabled: false
    });

    // Asignar custom claims
    await admin.auth().setCustomUserClaims(userRecord.uid, { city, rol });

    // Guardar en Firestore (opcional)
    await admin.firestore().collection('usuarios').doc(userRecord.uid).set({
      email,
      displayName,
      city,
      rol,
      creado: admin.firestore.FieldValue.serverTimestamp()
    });

    return { uid: userRecord.uid, email };
  } catch (error) {
    throw new functions.https.HttpsError('internal', error.message);
  }
});
