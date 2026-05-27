const functions = require('firebase-functions');
const admin = require('firebase-admin');

// Cloud Function HTTPS para crear usuario patrulla/operario
exports.crearUsuarioPanel = functions.https.onCall(async (data, context) => {

  console.log('=== crearUsuarioPanel llamada ===', { data });
  if (!context.auth) {
    console.error('[crearUsuarioPanel] SIN context.auth', { context });
    throw new functions.https.HttpsError('unauthenticated', 'No hay usuario autenticado en context.');
  }
  console.log('[crearUsuarioPanel] context.auth:', JSON.stringify(context.auth));
  const token = context.auth.token;
  const esAdmin = token.admin === true || token.rol === 'admin' || token.role === 'admin';
  if (!esAdmin) {
    console.error('[crearUsuarioPanel] Usuario autenticado pero SIN claim admin', { token });
    throw new functions.https.HttpsError('permission-denied', 'Solo administradores pueden crear usuarios.');
  }


  let { email, password, displayName, city, rol } = data;
  if (!email || !password || !city || !rol) {
    console.error('[crearUsuarioPanel] Faltan datos obligatorios', { email, password, city, rol });
    throw new functions.https.HttpsError('invalid-argument', 'Faltan datos obligatorios.');
  }

  // Si el email no contiene @, lo completa automáticamente
  if (!email.includes('@')) {
    // Usa el nombre de la ciudad como dominio, por defecto laplata.com
    const domain = city ? city.replace(/\s|-|\./g, '').toLowerCase() + '.com' : 'laplata.com';
    email = `${email}@${domain}`;
    console.log('[crearUsuarioPanel] Email ajustado automáticamente:', email);
  }

  try {
    console.log('[crearUsuarioPanel] INICIO', { email, displayName, city, rol });
    // Crear usuario en Auth
    let userRecord;
    try {
      userRecord = await admin.auth().createUser({
        email,
        password,
        displayName,
        emailVerified: false,
        disabled: false
      });
      console.log('[crearUsuarioPanel] Usuario creado en Auth', { uid: userRecord.uid, email });
    } catch (err) {
      if (err.code === 'auth/email-already-exists') {
        console.warn('[crearUsuarioPanel] El usuario ya existe en Auth', { email });
        // Obtener el usuario existente
        userRecord = await admin.auth().getUserByEmail(email);
      } else {
        console.error('[crearUsuarioPanel] ERROR al crear usuario', err, err.stack);
        throw new functions.https.HttpsError('already-exists', 'El usuario ya existe o error en Auth: ' + err.message);
      }
    }

    // Asignar custom claims
    await admin.auth().setCustomUserClaims(userRecord.uid, { city, rol });
    console.log('[crearUsuarioPanel] Claims asignados', { uid: userRecord.uid, city, rol });

    // Guardar en Firestore (global usuarios)
    await admin.firestore().collection('usuarios').doc(userRecord.uid).set({
      email,
      displayName,
      city,
      rol,
      creado: admin.firestore.FieldValue.serverTimestamp()
    }, { merge: true });
    console.log('[crearUsuarioPanel] Guardado en usuarios global', { uid: userRecord.uid });

    // Guardar en colección específica por ciudad y rol (patrullas o operarios)
    let coleccion = '';
    let docId = '';
    if (rol === 'patrulla') {
      // Ejemplo: patrullas_laplata
      coleccion = `patrullas_${city.replace(/\s|-|\./g, '').toLowerCase()}`;
      docId = displayName.trim().toUpperCase().replace(/\W+/g, '_');
      if (!docId.startsWith('PATRULLA_')) {
        docId = 'PATRULLA_' + docId;
      }
    } else {
      // Ejemplo: operarios_laplata
      coleccion = `operarios_${city.replace(/\s|-|\./g, '').toLowerCase()}`;
      docId = displayName.trim().toUpperCase().replace(/\W+/g, '_');
      if (!docId.startsWith('OPERARIO_')) {
        docId = 'OPERARIO_' + docId;
      }
    }
    await admin.firestore().collection(coleccion).doc(docId).set({
      email,
      displayName,
      city,
      rol,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      online: false,
      estado: 'activo'
    }, { merge: true });
    console.log(`[crearUsuarioPanel] Guardado en ${coleccion}/${docId}`);

    // Si es patrulla, guardar también en patrullas_{municipio}
    if (rol === 'patrulla') {
      const municipio = city ? city.toLowerCase().replace(/-/g, '').replace(/\s+/g, '') : 'indefinido';
      const patente = displayName && displayName.trim().toUpperCase().startsWith('PATRULLA_')
        ? displayName.trim().toUpperCase()
        : 'PATRULLA_' + (displayName ? displayName.trim().toUpperCase().replace(/\W+/g, '') : 'SIN_NOMBRE');
      const patrullaData = {
        lat: -34.92,
        lng: -57.945,
        online: true,
        emergencia: false,
        estado: 'activo',
        accuracy: 10,
        speed: 0,
        timestamp: admin.firestore.FieldValue.serverTimestamp(),
        usuario: email,
        nombre: displayName,
        password
      };
      console.log('[crearUsuarioPanel] Guardando patrulla en', `patrullas_${municipio}`, patente, patrullaData);
      await admin.firestore().collection(`patrullas_${municipio}`).doc(patente).set(patrullaData, { merge: true });
      console.log('[crearUsuarioPanel] Patrulla guardada OK', { coleccion: `patrullas_${municipio}`, patente });
    }

    console.log('[crearUsuarioPanel] RETURN FINAL', { uid: userRecord.uid, email });
      return { uid: userRecord.uid, email, displayName, city, rol, coleccion, docId };
  } catch (error) {
    console.error('[crearUsuarioPanel] ERROR FINAL', error, error && error.stack);
    if (error.code && error.code.startsWith('auth/')) {
      throw new functions.https.HttpsError('already-exists', error.message);
    }
    throw new functions.https.HttpsError('internal', error.message + (error && error.stack ? ('\nSTACK: ' + error.stack) : ''));
  }
});
