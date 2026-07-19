/**
 * TraficoMap Admin Panel - Cloud Functions
 * Fase 2C Backend - Orchestration Layer
 * 
 * Estas funciones orquestan las operaciones del admin panel con Firestore
 * y ejecutan helpers de Fase 2B para creación de clientes
 */

const functions = require('firebase-functions');
const admin = require('firebase-admin');
const express = require('express');
const cors = require('cors');
const nodemailer = require('nodemailer');

// Inicializar Firebase Admin
admin.initializeApp();

const db = admin.firestore();
const auth = admin.auth();

// Express app para HTTP triggers
const app = express();

// ✅ Middleware CORS personalizado (ejecutarse PRIMERO)
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS, PATCH');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, Accept, X-Requested-With');
  res.header('Access-Control-Max-Age', '3600');
  
  // Manejar preflight OPTIONS
  if (req.method === 'OPTIONS') {
    return res.sendStatus(200);
  }
  next();
});

app.use(cors({ 
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'Accept'],
  credentials: false
}));

// ✅ Parsear form-urlencoded Y JSON
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

// Importar y exportar función crearUsuarioPanel
const { crearUsuarioPanel } = require('./crearUsuarioPanel');
exports.crearUsuarioPanel = crearUsuarioPanel;

// ============================================================================
// FUNCIÓN 0: LOGIN DEL PANEL DEL CLIENTE
// ============================================================================
/**
 * Valida credenciales del panel del cliente contra Firestore y garantiza
 * que exista un usuario Firebase Auth con password sincronizada.
 */
exports.loginClientePanel = functions.https.onCall(async (data, context) => {
  const { email, password } = data || {};

  if (!email || !password) {
    throw new functions.https.HttpsError('invalid-argument', 'Faltan credenciales');
  }

  const clientesSnapshot = await db.collection('clientes')
    .where('email_admin', '==', email)
    .limit(1)
    .get();

  if (clientesSnapshot.empty) {
    throw new functions.https.HttpsError('not-found', 'Usuario no encontrado');
  }

  const clienteDoc = clientesSnapshot.docs[0];
  const clienteData = clienteDoc.data();
  const clienteId = clienteDoc.id;
  const passwordStored = clienteData.contraseña || clienteData.password;

  if (passwordStored !== password) {
    throw new functions.https.HttpsError('permission-denied', 'Contraseña incorrecta');
  }

  let userRecord;
  try {
    userRecord = await auth.getUserByEmail(email);
    // Sincronizar password del panel con Auth para permitir signInWithEmailAndPassword.
    await auth.updateUser(userRecord.uid, {
      password,
      displayName: clienteData.nombre ? `Admin - ${clienteData.nombre}` : userRecord.displayName
    });
  } catch (error) {
    if (error.code === 'auth/user-not-found') {
      userRecord = await auth.createUser({
        email,
        password,
        displayName: clienteData.nombre ? `Admin - ${clienteData.nombre}` : 'Admin Cliente',
        disabled: false
      });
    } else {
      throw error;
    }
  }

  await auth.setCustomUserClaims(userRecord.uid, {
    role: 'admin',
    cliente_id: clienteId
  });

  return {
    success: true,
    clienteId,
    clienteData
  };
});

// ============================================================================
// Cloud Function Callable: CREAR PATRULLA USUARIO
// ============================================================================
exports.crearPatrulaAdmin = functions.https.onCall(async (data, context) => {
  try {
    const { 
      email,
      password,
      displayName = '',
      ciudadId = '',
      clienteId = ''
    } = data || {};

    // Validación
    if (!email || !password) {
      throw new functions.https.HttpsError('invalid-argument', 'Email y password son requeridos');
    }
    if (!clienteId) {
      throw new functions.https.HttpsError('invalid-argument', 'clienteId es requerido');
    }

    console.log(`🚀 [crearPatrulaAdmin] Creando usuario patrulla: ${email} para cliente: ${clienteId}`);

    // 1️⃣ Crear usuario en Firebase Auth
    let userPatrulla;
    try {
      userPatrulla = await auth.createUser({
        email: email,
        password: password,
        displayName: displayName || email,
        disabled: false
      });

      console.log(`✅ Usuario patrulla creado en Auth: ${email} (uid: ${userPatrulla.uid})`);
    } catch (authError) {
      if (authError.code === 'auth/email-already-exists') {
        console.log(`⚠️ Email ya existe, obteniendo usuario existente y sincronizando password...`);
        userPatrulla = await auth.getUserByEmail(email);
        // Sincronizar la password con la que se guardará en Firestore para
        // permitir el login con las credenciales mostradas en el panel.
        await auth.updateUser(userPatrulla.uid, { password });
      } else {
        throw authError;
      }
    }

    // 2️⃣ Asignar custom claims (rol: patrulla, ciudad)
    try {
      await auth.setCustomUserClaims(userPatrulla.uid, {
        role: 'patrulla',
        city: ciudadId || 'laplata',
        cliente_id: clienteId
      });
      console.log(`✅ Custom claims asignados a patrulla: ${email}`);
    } catch (claimsError) {
      console.warn(`⚠️ Error asignando claims: ${claimsError.message}`);
      // No fallar por esto, continuar
    }

    // 3️⃣ Guardar en Firestore (estructura anidada: clientes/{clienteId}/patrullas/)
    // Extraer número de patrulla limpiamente (preservar formato de numeración)
    let numPatrulla = (displayName || email).replace(/\D/g, ''); // Extraer solo dígitos
    if (!numPatrulla) {
      numPatrulla = Math.random().toString(36).substring(7).toUpperCase().substring(0, 3);
    }
    
    // Crear nombre formato PATRULLA_XXX con número limpio
    const patenteLimpia = `PATRULLA_${numPatrulla.padStart(3, '0')}`; // Asegurar 3 dígitos: 70 → 070
    const patrnte = patenteLimpia;

    const dataPatrulla = {
      uid: userPatrulla.uid,
      email: email,
      displayName: displayName || email,
      nombre: displayName || email,  // ✅ Para compatibilidad con cliente
      numero: numPatrulla,  // ✅ Número sin formato
      usuario: email,  // ✅ Para compatibilidad con cliente
      password: password,  // ✅ Para compatibilidad con cliente
      online: false,
      emergencia: false,
      estado: 'activo',
      lat: 0,
      lng: 0,
      accuracy: 0,
      speed: 0,
      timestamp: admin.firestore.FieldValue.serverTimestamp(),
      created_at: admin.firestore.FieldValue.serverTimestamp()
    };

    // Guardar en colección de cliente (ÚNICA UBICACIÓN)
    try {
      await db.collection(`clientes/${clienteId}/patrullas`).doc(patrnte).set(dataPatrulla, { merge: true });
      console.log(`✅ Patrulla guardada en clientes/${clienteId}/patrullas:`, patrnte);
    } catch (firestoreError) {
      console.warn(`⚠️ Error guardando en Firestore: ${firestoreError.message}`);
      // No fallar por esto, el usuario está creado en Auth
    }

    // RESPUESTA
    return {
      success: true,
      patrulla: {
        uid: userPatrulla.uid,
        email: email,
        displayName: displayName || email,
        coleccion: `clientes/${clienteId}/patrullas`,
        patente: patrnte
      },
      mensaje: `Patrulla "${displayName || email}" creada exitosamente`
    };

  } catch (error) {
    console.error('❌ Error en crearPatrulaAdmin:', error);
    throw error;
  }
});

// ============================================================================
// CREAR OPERARIO (callable - sin CORS) — espejo de crearPatrulaAdmin
// ============================================================================
/**
 * Crear usuario operario vía Cloud Function callable (sin problemas CORS).
 * Crea la cuenta en Firebase Auth, asigna claims (role: operario) y guarda
 * en la estructura anidada clientes/{clienteId}/operarios.
 * Se llama desde el panel cliente con:
 *   firebase.functions().httpsCallable('crearOperarioAdmin')
 */
exports.crearOperarioAdmin = functions.https.onCall(async (data, context) => {
  try {
    const {
      email,
      password,
      displayName = '',
      ciudadId = '',
      clienteId = ''
    } = data || {};

    // Validación
    if (!email || !password) {
      throw new functions.https.HttpsError('invalid-argument', 'Email y password son requeridos');
    }
    if (!clienteId) {
      throw new functions.https.HttpsError('invalid-argument', 'clienteId es requerido');
    }

    console.log(`🚀 [crearOperarioAdmin] Creando usuario operario: ${email} para cliente: ${clienteId}`);

    // 1️⃣ Crear usuario en Firebase Auth
    let userOperario;
    try {
      userOperario = await auth.createUser({
        email: email,
        password: password,
        displayName: displayName || email,
        disabled: false
      });

      console.log(`✅ Usuario operario creado en Auth: ${email} (uid: ${userOperario.uid})`);
    } catch (authError) {
      if (authError.code === 'auth/email-already-exists') {
        console.log(`⚠️ Email ya existe, obteniendo usuario existente y sincronizando password...`);
        userOperario = await auth.getUserByEmail(email);
        // Sincronizar la password con la que se guardará en Firestore para
        // permitir el login con las credenciales mostradas en el panel.
        await auth.updateUser(userOperario.uid, { password });
      } else {
        throw authError;
      }
    }

    // 2️⃣ Asignar custom claims (rol: operario, ciudad)
    try {
      await auth.setCustomUserClaims(userOperario.uid, {
        role: 'operario',
        rol: 'operario',
        city: ciudadId || 'laplata',
        cliente_id: clienteId
      });
      console.log(`✅ Custom claims asignados a operario: ${email}`);
    } catch (claimsError) {
      console.warn(`⚠️ Error asignando claims: ${claimsError.message}`);
      // No fallar por esto, continuar
    }

    // 3️⃣ Guardar en Firestore (estructura anidada: clientes/{clienteId}/operarios/)
    const dataOperario = {
      uid: userOperario.uid,
      email: email,
      displayName: displayName || email,
      nombre: displayName || email,  // ✅ Para compatibilidad con cliente
      usuario: email,  // ✅ Para compatibilidad con cliente
      password: password,  // ✅ Para compatibilidad con cliente
      online: false,
      estado: 'activo',
      timestamp: admin.firestore.FieldValue.serverTimestamp(),
      created_at: admin.firestore.FieldValue.serverTimestamp()
    };

    try {
      await db.collection(`clientes/${clienteId}/operarios`).doc(userOperario.uid).set(dataOperario, { merge: true });
      console.log(`✅ Operario guardado en clientes/${clienteId}/operarios:`, userOperario.uid);
    } catch (firestoreError) {
      console.warn(`⚠️ Error guardando en Firestore: ${firestoreError.message}`);
      // No fallar por esto, el usuario está creado en Auth
    }

    // RESPUESTA
    return {
      success: true,
      operario: {
        uid: userOperario.uid,
        email: email,
        displayName: displayName || email,
        coleccion: `clientes/${clienteId}/operarios`
      },
      mensaje: `Operario "${displayName || email}" creado exitosamente`
    };

  } catch (error) {
    console.error('❌ Error en crearOperarioAdmin:', error);
    throw error;
  }
});

// ============================================================================
// CREAR VECINO (callable) — espejo de crearOperarioAdmin
// ============================================================================
/**
 * Crear usuario vecino vía Cloud Function callable.
 * Crea la cuenta en Firebase Auth, asigna claims (role: vecino) y guarda
 * en la estructura anidada clientes/{clienteId}/vecinos.
 * Campos extra del vecino: nombre, direccion, telefono.
 */
exports.crearVecinoAdmin = functions.https.onCall(async (data, context) => {
  try {
    const {
      email,
      password,
      displayName = '',
      direccion = '',
      telefono = '',
      ciudadId = '',
      clienteId = ''
    } = data || {};
    // Validación
    if (!email || !password) {
      throw new functions.https.HttpsError('invalid-argument', 'Email y password son requeridos');
    }
    if (!clienteId) {
      throw new functions.https.HttpsError('invalid-argument', 'clienteId es requerido');
    }
    console.log(`🚀 [crearVecinoAdmin] Creando usuario vecino: ${email} para cliente: ${clienteId}`);
    // 1️⃣ Crear usuario en Firebase Auth
    let userVecino;
    try {
      userVecino = await auth.createUser({
        email: email,
        password: password,
        displayName: displayName || email,
        disabled: false
      });
      console.log(`✅ Usuario vecino creado en Auth: ${email} (uid: ${userVecino.uid})`);
    } catch (authError) {
      if (authError.code === 'auth/email-already-exists') {
        console.log(`⚠️ Email ya existe, obteniendo usuario existente...`);
        userVecino = await auth.getUserByEmail(email);
      } else {
        throw authError;
      }
    }
    // 2️⃣ Asignar custom claims (rol: vecino, ciudad)
    try {
      await auth.setCustomUserClaims(userVecino.uid, {
        role: 'vecino',
        rol: 'vecino',
        city: ciudadId || 'laplata',
        cliente_id: clienteId
      });
      console.log(`✅ Custom claims asignados a vecino: ${email}`);
    } catch (claimsError) {
      console.warn(`⚠️ Error asignando claims: ${claimsError.message}`);
    }
    // 3️⃣ Guardar en Firestore (estructura anidada: clientes/{clienteId}/vecinos/)
    const dataVecino = {
      uid: userVecino.uid,
      email: email,
      displayName: displayName || email,
      nombre: displayName || email,
      direccion: direccion,
      telefono: telefono,
      usuario: email,
      password: password,
      online: false,
      estado: 'activo',
      timestamp: admin.firestore.FieldValue.serverTimestamp(),
      created_at: admin.firestore.FieldValue.serverTimestamp()
    };
    try {
      await db.collection(`clientes/${clienteId}/vecinos`).doc(userVecino.uid).set(dataVecino, { merge: true });
      console.log(`✅ Vecino guardado en clientes/${clienteId}/vecinos:`, userVecino.uid);
    } catch (firestoreError) {
      console.warn(`⚠️ Error guardando en Firestore: ${firestoreError.message}`);
    }
    // RESPUESTA
    return {
      success: true,
      vecino: {
        uid: userVecino.uid,
        email: email,
        displayName: displayName || email,
        coleccion: `clientes/${clienteId}/vecinos`
      },
      mensaje: `Vecino "${displayName || email}" creado exitosamente`
    };
  } catch (error) {
    console.error('❌ Error en crearVecinoAdmin:', error);
    throw error;
  }
});

// ============================================================================
// FUNCIÓN 1: CREAR CLIENTE (callable - sin CORS)
// ============================================================================
/**
 * Crear cliente vía Cloud Function callable (sin problemas CORS)
 * Se puede llamar desde el cliente con: firebase.functions().httpsCallable('criarClienteAdmin')
 */
exports.criarClienteAdmin = functions.https.onCall(async (data, context) => {
  try {
    const { 
      nombreCliente, 
      email, 
      plan, 
      ciudad = '',
      telefono = ''
    } = data || {};

    // Validación
    if (!nombreCliente || !email || !plan) {
      throw new functions.https.HttpsError('invalid-argument', 'Faltan datos requeridos (nombreCliente, email, plan)');
    }

    const planesValidos = ['basico', 'profesional', 'enterprise'];
    if (!planesValidos.includes(plan)) {
      throw new functions.https.HttpsError('invalid-argument', 'Plan inválido');
    }

    console.log(`🚀 [onCall] Creando cliente: ${nombreCliente}`);

    // ✅ NUEVA: Generar contraseña PRIMERO
    const passwordAdmin = generateSecurePassword();
    console.log(`🔐 Contraseña generada para ${nombreCliente}`);

    // Generar clienteId
    const slug = nombreCliente
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^\w\s-]/g, '')
      .replace(/\s+/g, '-')
      .substring(0, 20);
    const clienteId = `${slug}-${Date.now()}`;
    console.log(`📱 Cliente ID generado: ${clienteId}`);

    const ahora = new Date().toISOString();

    const datosCliente = {
      id: clienteId,
      nombre: nombreCliente,
      email: email,
      email_admin: email, // ✅ NUEVA: campo adicional para búsqueda
      plan: plan,
      estado: 'activo',
      ciudad: ciudad || '',
      telefono: telefono || '',
      password: passwordAdmin, // ✅ NUEVA: Guardar contraseña en el documento
      contraseña: passwordAdmin, // ✅ NUEVA: También con tilde por compatibilidad
      created_at: ahora,
      updated_at: ahora,
      firebase_project_id: null,
      firebase_cliente: null,
      api_key: generateApiKey(),
      usuarios_creados: [],
      suscripcion: {
        plan: plan,
        estado: 'activo',
        expiration_date: new Date(new Date().setFullYear(new Date().getFullYear() + 1)).toISOString()
      }
    };

    // PASO 1: Crear documento en clientes/
    await db.collection('clientes').doc(clienteId).set(datosCliente);
    console.log('✅ Documento cliente creado con contraseña temporal');

    // PASO 2: Crear usuario en Firebase Auth
    const emailAdmin = email;
    let userAdmin;
    try {
      userAdmin = await auth.createUser({
        email: emailAdmin,
        password: passwordAdmin, // ✅ Usar contraseña generada
        displayName: `Admin - ${nombreCliente}`,
        disabled: false
      });

      await auth.setCustomUserClaims(userAdmin.uid, {
        role: 'admin',
        cliente_id: clienteId
      });

      console.log(`✅ Usuario admin creado: ${emailAdmin}`);
    } catch (error) {
      if (error.code === 'auth/email-already-exists') {
        console.log('⚠️ Usuario ya existe, actualizando custom claims...');
        const existingUser = await auth.getUserByEmail(emailAdmin);
        await auth.setCustomUserClaims(existingUser.uid, {
          role: 'admin',
          cliente_id: clienteId
        });
        userAdmin = existingUser;
      } else {
        throw error;
      }
    }

    // PASO 3: Crear suscripción inicial
    const precios = { basico: 1000, profesional: 5000, enterprise: 15000 };
    const subscripcionId = `sub_${Date.now()}`;
    const vencimiento = new Date();
    vencimiento.setFullYear(vencimiento.getFullYear() + 1);

    const datosSubscripcion = {
      id: subscripcionId,
      cliente_id: clienteId,
      plan: plan,
      precio_mensual: precios[plan],
      precio_anual: precios[plan] * 12,
      expiration_date: vencimiento.toISOString(),
      activa: true,
      created_at: ahora,
      updated_at: ahora,
      renovaciones: 0,
      cambios_plan: []
    };

    await db.collection('subscripciones').doc(subscripcionId).set(datosSubscripcion);
    console.log('✅ Suscripción creada');

    // PASO 4: Crear factura inicial
    const facturaId = `fac_${Date.now()}`;
    const datosBilling = {
      id: facturaId,
      cliente_id: clienteId,
      subscripcion_id: subscripcionId,
      monto: precios[plan] * 12,
      moneda: 'ARS',
      descripcion: `Suscripción ${plan.toUpperCase()} - Año 1`,
      periodo_desde: ahora,
      periodo_hasta: vencimiento.toISOString(),
      estado: 'pendiente',
      creada_en: ahora,
      vence_en: vencimiento.toISOString(),
      pagada: false,
      fecha_pago: null,
      metodo_pago: 'pendiente',
      numero_comprobante: ''
    };

    await db.collection('billing').add(datosBilling);
    console.log('✅ Factura inicial creada');

    // RESPUESTA
    return {
      success: true,
      cliente: datosCliente,
      subscripcion: datosSubscripcion,
      billing: datosBilling,
      admin_user: { 
        email: emailAdmin, 
        uid: userAdmin?.uid,
        password: passwordAdmin // ✅ NUEVA: Devolver contraseña en respuesta
      },
      mensaje: 'Cliente creado exitosamente'
    };

  } catch (error) {
    console.error('❌ Error en criarClienteAdmin:', error);
    throw error;
  }
});

// ============================================================================
// Cloud Function Callable: ELIMINAR CLIENTE COMPLETAMENTE
// ============================================================================
exports.eliminarCliente = functions.https.onCall(async (data, context) => {
  try {
    // Validar autenticación
    if (!context.auth) {
      throw new functions.https.HttpsError('unauthenticated', 'Debe estar autenticado');
    }

    const { clienteId, nombreCliente } = data;

    if (!clienteId || !nombreCliente) {
      throw new functions.https.HttpsError('invalid-argument', 'clienteId y nombreCliente son requeridos');
    }

    console.log(`🗑️ Iniciando eliminación del cliente: ${clienteId} (${nombreCliente})`);

    // 1️⃣ Obtener cliente para encontrar el UID de Firebase Auth
    const clienteDoc = await db.collection('clientes').doc(clienteId).get();
    if (!clienteDoc.exists) {
      throw new functions.https.HttpsError('not-found', 'Cliente no encontrado');
    }

    const clienteData = clienteDoc.data();
    const firebaseUI = clienteData.firebase_uid; // UID del usuario en Firebase Auth

    // 2️⃣ Obtener subscripciones del cliente
    const subsSnapshot = await db.collection('subscripciones')
      .where('cliente_id', '==', clienteId)
      .get();
    console.log(`📋 Encontradas ${subsSnapshot.docs.length} suscripciones para eliminar`);

    // 3️⃣ Obtener facturas/billing del cliente
    const billingSnapshot = await db.collection('billing')
      .where('cliente_id', '==', clienteId)
      .get();
    console.log(`💰 Encontrados ${billingSnapshot.docs.length} registros de billing para eliminar`);

    // 4️⃣ Obtener usuarios creados por este cliente
    const usuariosSnapshot = await db.collection('usuarios')
      .where('cliente_id', '==', clienteId)
      .get();
    console.log(`👥 Encontrados ${usuariosSnapshot.docs.length} usuarios para este cliente`);

    // 5️⃣ ELIMINAR USUARIO de Firebase Auth si existe
    if (firebaseUI) {
      try {
        await auth.deleteUser(firebaseUI);
        console.log(`✅ Usuario de Auth eliminado: ${firebaseUI}`);
      } catch (authError) {
        if (authError.code !== 'auth/user-not-found') {
          console.error('⚠️ Error al eliminar usuario de Auth:', authError);
          // No lanzar error, continuar con el borrado de Firestore
        }
      }
    }

    // 6️⃣ ELIMINAR DOCUMENTOS EN BATCH
    const batch = db.batch();

    // Eliminar suscripciones
    subsSnapshot.docs.forEach(doc => {
      batch.delete(doc.ref);
    });

    // Eliminar billing/facturas
    billingSnapshot.docs.forEach(doc => {
      batch.delete(doc.ref);
    });

    // Eliminar usuario principal del cliente
    batch.delete(clienteDoc.ref);

    // Ejecutar batch
    await batch.commit();
    console.log('✅ Documentos de Firestore eliminados');

    // 7️⃣ ELIMINAR USUARIOS (opcional: mantenerlos o borrar)
    // Por ahora NO eliminamos usuarios, solo marcamos que el cliente fue eliminado
    // Esto permite auditoría de datos históricos
    if (usuariosSnapshot.docs.length > 0) {
      const usuarioBatch = db.batch();
      usuariosSnapshot.docs.forEach(doc => {
        // Opción 1: Marcar como inactivo
        usuarioBatch.update(doc.ref, { activo: false, fecha_cliente_eliminado: new Date().toISOString() });
        // Opción 2: Eliminar (descomentar si se prefiere)
        // usuarioBatch.delete(doc.ref);
      });
      await usuarioBatch.commit();
      console.log(`✅ ${usuariosSnapshot.docs.length} usuarios marcados como inactivos`);
    }

    console.log(`✅ CLIENTE COMPLETAMENTE ELIMINADO: ${clienteId} (${nombreCliente})`);

    return {
      success: true,
      mensaje: `Cliente "${nombreCliente}" eliminado permanentemente`,
      datosEliminados: {
        cliente: 1,
        subscripciones: subsSnapshot.docs.length,
        facturación: billingSnapshot.docs.length,
        usuariosAfectados: usuariosSnapshot.docs.length
      }
    };

  } catch (error) {
    console.error('❌ Error en eliminarCliente:', error);
    throw error;
  }
});

// ============================================================================
// FUNCIÓN 1: CREAR CLIENTE (Endpoint Express - Legacy)
// ============================================================================
app.post('/criarCliente', async (req, res) => {
  try {
    const { 
      nombreCliente, 
      email, 
      plan, 
      ciudad, 
      telefono,
      firebaseConfig  // Opcional: Credenciales de Firebase del cliente
    } = req.body;

    // Validación
    if (!nombreCliente || !email || !plan) {
      return res.status(400).json({ error: 'Faltan datos requeridos' });
    }

    const planesValidos = ['basico', 'profesional', 'enterprise'];
    if (!planesValidos.includes(plan)) {
      return res.status(400).json({ error: 'Plan inválido' });
    }

    console.log(`🚀 Creando cliente: ${nombreCliente}`);
    
    // Generar clienteId: si hay firebaseConfig usar projectId, sino generar slug + timestamp
    let clienteId;
    if (firebaseConfig && firebaseConfig.projectId) {
      clienteId = firebaseConfig.projectId;
      console.log(`📱 Firebase Project: ${firebaseConfig.projectId}`);
    } else {
      // Generar ID único sin firebaseConfig (común en admin panel)
      const slug = nombreCliente
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '') // Remover acentos
        .replace(/[^\w\s-]/g, '') // Remover caracteres especiales
        .replace(/\s+/g, '-') // Espacios a guiones
        .substring(0, 20); // Limitar longitud
      clienteId = `${slug}-${Date.now()}`;
      console.log(`📱 Cliente ID generado: ${clienteId}`);
    }

    const ahora = new Date().toISOString();

    const datosCliente = {
      id: clienteId,
      nombre: nombreCliente,
      email: email,
      plan: plan,
      estado: 'activo',
      ciudad: ciudad || '',
      telefono: telefono || '',
      created_at: ahora,
      updated_at: ahora,
      
      // ✅ Guardar firebaseConfig si existe, sino null
      firebase_project_id: firebaseConfig?.projectId || null,
      firebase_cliente: firebaseConfig ? {
        apiKey: firebaseConfig.apiKey,
        authDomain: firebaseConfig.authDomain,
        projectId: firebaseConfig.projectId,
        storageBucket: firebaseConfig.storageBucket,
        messagingSenderId: firebaseConfig.messagingSenderId,
        appId: firebaseConfig.appId,
        databaseURL: firebaseConfig.databaseURL || ''
      } : null,
      
      api_key: generateApiKey(),
      usuarios_creados: [],
      
      // Suscripción info
      suscripcion: {
        plan: plan,
        estado: 'activo',
        expiration_date: new Date(new Date().setFullYear(new Date().getFullYear() + 1)).toISOString()
      }
    };

    await db.collection('clientes').doc(clienteId).set(datosCliente);
    console.log('✅ Documento cliente creado con credenciales de Firebase');

    // PASO 2: Crear usuario en Firebase Auth DEL CLIENTE (no en general)
    // Crear en Firebase General para autenticación inicial
    const emailAdmin = email;
    let userAdmin;
    try {
      userAdmin = await auth.createUser({
        email: emailAdmin,
        displayName: `Admin - ${nombreCliente}`,
        disabled: false
      });

      // ✅ ASIGNAR CUSTOM CLAIMS con cliente_id
      await auth.setCustomUserClaims(userAdmin.uid, {
        role: 'admin',
        cliente_id: clienteId  // Este es el projectId del cliente
      });

      console.log(`✅ Usuario admin creado: ${emailAdmin}`);
      console.log(`✅ Custom claims asignados: cliente_id=${clienteId}`);
    } catch (error) {
      if (error.code === 'auth/email-already-exists') {
        console.log('⚠️ Usuario ya existe, actualizando custom claims...');
        // Obtener el UID del usuario existente
        const existingUser = await auth.getUserByEmail(emailAdmin);
        await auth.setCustomUserClaims(existingUser.uid, {
          role: 'admin',
          cliente_id: clienteId
        });
        userAdmin = existingUser;
      } else {
        throw error;
      }
    }

    // PASO 3: Crear suscripción inicial
    const precios = {
      basico: 1000,
      profesional: 5000,
      enterprise: 15000
    };

    const subscripcionId = `sub_${Date.now()}`;
    const vencimiento = new Date();
    vencimiento.setFullYear(vencimiento.getFullYear() + 1);

    const datosSubscripcion = {
      id: subscripcionId,
      cliente_id: clienteId,
      plan: plan,
      precio_mensual: precios[plan],
      precio_anual: precios[plan] * 12,
      expiration_date: vencimiento.toISOString(),
      activa: true,
      created_at: ahora,
      updated_at: ahora,
      renovaciones: 0,
      cambios_plan: []
    };

    await db.collection('subscripciones').doc(subscripcionId).set(datosSubscripcion);
    console.log('✅ Suscripción creada');

    // PASO 4: Crear factura inicial
    const facturaId = `fac_${Date.now()}`;
    const datosBilling = {
      id: facturaId,
      cliente_id: clienteId,
      subscripcion_id: subscripcionId,
      monto: precios[plan] * 12, // Año completo
      moneda: 'ARS',
      descripcion: `Suscripción ${plan.toUpperCase()} - Año 1`,
      periodo_desde: ahora,
      periodo_hasta: vencimiento.toISOString(),
      estado: 'pendiente',
      creada_en: ahora,
      vence_en: vencimiento.toISOString(),
      pagada: false,
      fecha_pago: null,
      metodo_pago: 'pendiente',
      numero_comprobante: ''
    };

    await db.collection('billing').add(datosBilling);
    console.log('✅ Factura inicial creada');

    // RESPUESTA EXITOSA
    res.json({
      success: true,
      cliente: datosCliente,
      subscripcion: datosSubscripcion,
      billing: datosBilling,
      admin_user: {
        email: emailAdmin,
        uid: userAdmin?.uid
      },
      mensaje: 'Cliente creado exitosamente con credenciales de Firebase'
    });

  } catch (error) {
    console.error('❌ Error creando cliente:', error);
    res.status(500).json({ error: error.message });
  }
});

// ============================================================================
// FUNCIÓN 2: CAMBIAR PLAN
// ============================================================================
/**
 * Cambiar plan de suscripción:
 * 1. Validar nuevo plan
 * 2. Actualizar subscripción
 * 3. Crear factura de diferencia (si es necesario)
 * 4. Registrar en historial de cambios
 */
app.post('/cambiarPlan', async (req, res) => {
  try {
    const { subscripcionId, nuevoPlan } = req.body;

    if (!subscripcionId || !nuevoPlan) {
      return res.status(400).json({ error: 'Faltan datos' });
    }

    const planesValidos = ['basico', 'profesional', 'enterprise'];
    if (!planesValidos.includes(nuevoPlan)) {
      return res.status(400).json({ error: 'Plan inválido' });
    }

    console.log(`🔄 Cambiando plan: ${subscripcionId} → ${nuevoPlan}`);

    // Obtener suscripción actual
    const subDoc = await db.collection('subscripciones').doc(subscripcionId).get();
    if (!subDoc.exists) {
      return res.status(404).json({ error: 'Suscripción no encontrada' });
    }

    const subActual = subDoc.data();
    const precios = {
      basico: 1000,
      profesional: 5000,
      enterprise: 15000
    };

    // Crear registro de cambio
    const cambio = {
      fecha: new Date().toISOString(),
      plan_anterior: subActual.plan,
      plan_nuevo: nuevoPlan,
      precio_anterior: subActual.precio_mensual,
      precio_nuevo: precios[nuevoPlan]
    };

    // Actualizar suscripción
    await db.collection('subscripciones').doc(subscripcionId).update({
      plan: nuevoPlan,
      precio_mensual: precios[nuevoPlan],
      precio_anual: precios[nuevoPlan] * 12,
      updated_at: new Date().toISOString(),
      cambios_plan: admin.firestore.FieldValue.arrayUnion(cambio)
    });

    // Crear factura de diferencia si el precio cambió
    if (precios[nuevoPlan] !== precios[subActual.plan]) {
      const diferencia = precios[nuevoPlan] - precios[subActual.plan];
      if (diferencia > 0) {
        // Cliente debe pagar diferencia
        const facturaDif = {
          id: `fac_diff_${Date.now()}`,
          cliente_id: subActual.cliente_id,
          subscripcion_id: subscripcionId,
          monto: diferencia * 12, // Por el año
          moneda: 'ARS',
          descripcion: `Diferencia plan: ${subActual.plan} → ${nuevoPlan}`,
          estado: 'pendiente',
          creada_en: new Date().toISOString(),
          vence_en: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000).toISOString(),
          pagada: false
        };
        await db.collection('billing').add(facturaDif);
      }
    }

    console.log('✅ Plan actualizado');

    res.json({
      success: true,
      cambio: cambio,
      nueva_suscripcion: {
        plan: nuevoPlan,
        precio_mensual: precios[nuevoPlan]
      }
    });

  } catch (error) {
    console.error('❌ Error cambiando plan:', error);
    res.status(500).json({ error: error.message });
  }
});

// ============================================================================
// FUNCIÓN 3: REGISTRAR PAGO
// ============================================================================
/**
 * Registrar pago de factura:
 * 1. Marcar como pagada
 * 2. Actualizar estado suscripción si es renovación
 * 3. Enviar email confirmación
 */
app.post('/registrarPago', async (req, res) => {
  try {
    const { facturaId, metodo_pago, referencias } = req.body;

    if (!facturaId) {
      return res.status(400).json({ error: 'ID de factura requerido' });
    }

    console.log(`💰 Registrando pago: ${facturaId}`);

    // Obtener factura
    const factDoc = await db.collection('billing').doc(facturaId).get();
    if (!factDoc.exists) {
      return res.status(404).json({ error: 'Factura no encontrada' });
    }

    const factura = factDoc.data();

    // Actualizar factura
    await db.collection('billing').doc(facturaId).update({
      pagada: true,
      estado: 'pagada',
      fecha_pago: new Date().toISOString(),
      metodo_pago: metodo_pago || 'transferencia',
      referencias_pago: referencias || {}
    });

    // Si es suscripción, actualizar estado
    if (factura.subscripcion_id) {
      await db.collection('subscripciones').doc(factura.subscripcion_id).update({
        activa: true,
        updated_at: new Date().toISOString()
      });
    }

    console.log('✅ Pago registrado');

    res.json({
      success: true,
      factura_id: facturaId,
      estado: 'pagada',
      fecha_pago: new Date().toISOString()
    });

  } catch (error) {
    console.error('❌ Error registrando pago:', error);
    res.status(500).json({ error: error.message });
  }
});

// ============================================================================
// FUNCIÓN 4: ACTUALIZAR CUSTOM CLAIMS
// ============================================================================
/**
 * Actualizar custom claims de usuario (role, permisos)
 * Llamado cuando se cambia role en usuarios-manager.js
 */
app.post('/updateCustomClaims', async (req, res) => {
  try {
    const { uid, claims } = req.body;

    if (!uid || !claims) {
      return res.status(400).json({ error: 'UID y claims requeridos' });
    }

    console.log(`🔐 Actualizando claims para: ${uid}`);

    await auth.setCustomUserClaims(uid, claims);

    console.log('✅ Custom claims actualizados');

    res.json({
      success: true,
      uid: uid,
      claims: claims
    });

  } catch (error) {
    console.error('❌ Error actualizando claims:', error);
    res.status(500).json({ error: error.message });
  }
});

// ============================================================================
// FUNCIÓN 4B: OBTENER CREDENCIALES DE FIREBASE DEL CLIENTE (SEGURO)
// ============================================================================
/**
 * Cloud Function Callable para obtener credenciales de Firebase del cliente
 * SOLO devuelve credenciales a usuario autenticado con cliente_id en claims
 * Llamado desde client-auth.js después de autenticarse
 */
exports.getClientFirebaseConfig = functions.https.onCall(async (data, context) => {
  try {
    // ✅ Validar que usuario esté autenticado
    if (!context.auth) {
      throw new functions.https.HttpsError(
        'unauthenticated',
        'Usuario no autenticado'
      );
    }

    const uid = context.auth.uid;
    const userEmail = context.auth.token.email;

    console.log(`🔐 Solicitando credenciales: ${userEmail}`);

    // ✅ Obtener custom claims del usuario
    const user = await admin.auth().getUser(uid);
    const clienteId = user.customClaims?.cliente_id;

    if (!clienteId) {
      throw new functions.https.HttpsError(
        'failed-precondition',
        'Usuario sin acceso a cliente. Contacta administración.'
      );
    }

    console.log(`✅ Cliente ID extraído: ${clienteId}`);

    // ✅ Leer credenciales de Firebase del cliente desde Firestore
    const clienteDoc = await db.collection('clientes').doc(clienteId).get();

    if (!clienteDoc.exists) {
      throw new functions.https.HttpsError(
        'not-found',
        'Cliente no encontrado en sistema'
      );
    }

    const clienteData = clienteDoc.data();

    // ✅ Validar que existan credenciales
    if (!clienteData.firebase_cliente) {
      throw new functions.https.HttpsError(
        'failed-precondition',
        'Credenciales de Firebase no configuradas. Contacta administración.'
      );
    }

    console.log(`✅ Credenciales devueltas para ${clienteId}`);

    // ✅ DEVOLVER SOLO credenciales necesarias
    return {
      success: true,
      firebaseConfig: clienteData.firebase_cliente,
      clienteId: clienteId,
      nombre: clienteData.nombre,
      suscripcion: {
        plan: clienteData.plan,
        estado: clienteData.estado,
        expiration_date: clienteData.suscripcion?.expiration_date
      }
    };

  } catch (error) {
    console.error('❌ Error obteniendo credenciales:', error.message);
    throw error;
  }
});

// ============================================================================
// FUNCIÓN 5: DISABLE/ENABLE USER
// ============================================================================
/**
 * Desactivar o reactivar usuario
 */
app.post('/toggleUserStatus', async (req, res) => {
  try {
    const { uid, disabled } = req.body;

    if (!uid || typeof disabled !== 'boolean') {
      return res.status(400).json({ error: 'UID y disabled requeridos' });
    }

    console.log(`${disabled ? '🔒' : '🔓'} ${disabled ? 'Desactivando' : 'Reactivando'} usuario: ${uid}`);

    await auth.updateUser(uid, { disabled: disabled });

    console.log('✅ Usuario actualizado');

    res.json({
      success: true,
      uid: uid,
      disabled: disabled
    });

  } catch (error) {
    console.error('❌ Error actualizando usuario:', error);
    res.status(500).json({ error: error.message });
  }
});

// ============================================================================
// FUNCIÓN 6: RENOVAR SUSCRIPCIÓN
// ============================================================================
/**
 * Renovar suscripción por 1 año
 * 1. Extender fecha de vencimiento
 * 2. Crear nueva factura
 */
app.post('/renovarSubscripcion', async (req, res) => {
  try {
    const { subscripcionId } = req.body;

    if (!subscripcionId) {
      return res.status(400).json({ error: 'Suscripción ID requerido' });
    }

    console.log(`🔄 Renovando suscripción: ${subscripcionId}`);

    // Obtener suscripción actual
    const subDoc = await db.collection('subscripciones').doc(subscripcionId).get();
    if (!subDoc.exists) {
      return res.status(404).json({ error: 'Suscripción no encontrada' });
    }

    const sub = subDoc.data();
    const fechaExp = new Date(sub.expiration_date);
    const nuevoVencimiento = new Date(fechaExp.setFullYear(fechaExp.getFullYear() + 1));

    // Actualizar suscripción
    await db.collection('subscripciones').doc(subscripcionId).update({
      expiration_date: nuevoVencimiento.toISOString(),
      renovaciones: (sub.renovaciones || 0) + 1,
      updated_at: new Date().toISOString(),
      activa: true
    });

    // Crear nueva factura
    const factura = {
      id: `fac_renewal_${Date.now()}`,
      cliente_id: sub.cliente_id,
      subscripcion_id: subscripcionId,
      monto: sub.precio_anual,
      moneda: 'ARS',
      descripcion: `Renovación ${sub.plan.toUpperCase()}`,
      periodo_desde: new Date().toISOString(),
      periodo_hasta: nuevoVencimiento.toISOString(),
      estado: 'pendiente',
      creada_en: new Date().toISOString(),
      vence_en: nuevoVencimiento.toISOString(),
      pagada: false
    };

    await db.collection('billing').add(factura);

    console.log('✅ Suscripción renovada');

    res.json({
      success: true,
      subscripcion_id: subscripcionId,
      nuevo_vencimiento: nuevoVencimiento.toISOString(),
      factura: factura
    });

  } catch (error) {
    console.error('❌ Error renovando:', error);
    res.status(500).json({ error: error.message });
  }
});

// ============================================================================
// FUNCIÓN 6B: CREAR USUARIO PANEL VIA HTTP (CORS)
// ============================================================================
app.post('/crearUsuarioPanelHttp', async (req, res) => {
  try {
    const authHeader = req.headers.authorization || '';
    const tokenFromHeader = authHeader.startsWith('Bearer ') ? authHeader.substring('Bearer '.length) : '';
    const tokenFromBody = req.body && typeof req.body.idToken === 'string' ? req.body.idToken : '';
    const idToken = tokenFromHeader || tokenFromBody;

    let isAdmin = false;
    if (idToken) {
      const decoded = await auth.verifyIdToken(idToken);
      isAdmin = !!(decoded && (decoded.admin === true || decoded.role === 'admin'));

      // Fallback con token válido: autorizar si el email autenticado es email_admin de algún cliente.
      if (!isAdmin && decoded && decoded.email) {
        const decodedEmail = String(decoded.email).toLowerCase();
        const adminByEmailSnap = await db.collection('clientes')
          .where('email_admin', '==', decoded.email)
          .limit(1)
          .get();
        if (!adminByEmailSnap.empty) {
          isAdmin = true;
        } else {
          // Segundo intento en minúsculas para compatibilidad con datos legacy.
          const adminByLowerEmailSnap = await db.collection('clientes')
            .where('email_admin', '==', decodedEmail)
            .limit(1)
            .get();
          isAdmin = !adminByLowerEmailSnap.empty;
        }
      }
    } else {
      // Fallback: validar admin por credenciales del cliente en Firestore.
      const adminEmail = req.body && req.body.adminEmail;
      const adminPassword = req.body && req.body.adminPassword;
      if (adminEmail && adminPassword) {
        const clientesSnapshot = await db.collection('clientes')
          .where('email_admin', '==', adminEmail)
          .limit(1)
          .get();
        if (!clientesSnapshot.empty) {
          const clienteData = clientesSnapshot.docs[0].data();
          const possiblePasswords = [
            clienteData.contraseña,
            clienteData.password,
            clienteData.password_plain,
            clienteData.credenciales_actualizadas && clienteData.credenciales_actualizadas.password,
            clienteData.credenciales_actualizadas && clienteData.credenciales_actualizadas.password_plain
          ].filter(Boolean);
          isAdmin = possiblePasswords.includes(adminPassword);
        }
      }
    }

    if (!isAdmin) {
      // Fallback final: validar por clientId + adminEmail (flujo panel cliente).
      const clientId = req.body && req.body.clientId;
      const adminEmail = req.body && req.body.adminEmail;
      if (clientId && adminEmail) {
        const clientDoc = await db.collection('clientes').doc(String(clientId)).get();
        if (clientDoc.exists) {
          const clientData = clientDoc.data() || {};
          const expectedEmail = String(clientData.email_admin || '').toLowerCase();
          const givenEmail = String(adminEmail || '').toLowerCase();
          if (expectedEmail && expectedEmail === givenEmail) {
            isAdmin = true;
          }
        }
      }
    }

    if (!isAdmin) {
      return res.status(401).json({ error: 'No autenticado' });
    }

    const { email, password, displayName, city, rol } = req.body || {};
    if (!email || !password || !city || !rol) {
      return res.status(400).json({ error: 'Faltan datos obligatorios.' });
    }

    const userRecord = await auth.createUser({
      email,
      password,
      displayName,
      emailVerified: false,
      disabled: false
    });

    await auth.setCustomUserClaims(userRecord.uid, { city, rol });

    await db.collection('usuarios').doc(userRecord.uid).set({
      email,
      displayName,
      city,
      rol,
      creado: admin.firestore.FieldValue.serverTimestamp()
    });

    return res.json({ uid: userRecord.uid, email });
  } catch (error) {
    if (error && error.code === 'auth/email-already-exists') {
      return res.status(409).json({ error: 'email-already-exists' });
    }
    console.error('❌ Error crearUsuarioPanelHttp:', error);
    return res.status(500).json({ error: error.message || 'internal-error' });
  }
});

// ============================================================================
// FUNCIÓN 7: HEALTH CHECK
// ============================================================================
app.get('/health', (req, res) => {
  res.json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    version: '1.0.0'
  });
});

// ============================================================================
// EXPORT FUNCTION
// ============================================================================
exports.adminApi = functions.https.onRequest(app);

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Generar API key único
 */
function generateApiKey() {
  return `sk_${Date.now()}_${Math.random().toString(36).substr(2, 32)}`;
}

/**
 * Generar password temporal seguro
 */
function generateSecurePassword() {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*';
  let password = '';
  for (let i = 0; i < 16; i++) {
    password += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return password;
}

/**
 * Log de operaciones
 */
function logOperacion(tipo, datos) {
  console.log(`[${new Date().toISOString()}] ${tipo}:`, datos);
}

// ============================================================================
// FUNCIÓN: Asignar claims automáticamente al crear usuario patrulla/operario
// ============================================================================
exports.setCustomClaimsOnCreate = functions.auth.user().onCreate(async (user) => {
  const email = user.email || '';

  // IMPORTANTE: Las cuentas de patrulla y operario se crean vía las Cloud
  // Functions callable (crearPatrulaAdmin / crearOperarioAdmin), las cuales ya
  // asignan los claims correctos (role, city, cliente_id) con la ciudad REAL
  // del cliente. Este trigger NO debe pisar esos claims, porque antes forzaba
  // role: 'patrulla' y city: 'laplata' a TODO email @seguridad.com, rompiendo
  // el rol de los operarios y la ciudad de patrullas/operarios de otras ciudades.
  console.log(`ℹ️ Usuario creado (${email}). Claims gestionados por las Cloud Functions callable.`);
});


// ============================================================================
// FUNCIÓN: CREAR OPERARIO DESDE PANEL ADMIN (CALLABLE)
// ============================================================================
/**
 * Cloud Function Callable para crear operario
 * Solo accesible por usuarios con role admin
 * Params esperados: { nombre, email, ciudad, cliente_id }
 */
exports.createOperario = functions.https.onCall(async (data, context) => {
  try {
    // Validar autenticación y permisos
    if (!context.auth) {
      throw new functions.https.HttpsError('unauthenticated', 'No autenticado');
    }
    const claims = context.auth.token;
    if (claims.role !== 'admin') {
      throw new functions.https.HttpsError('permission-denied', 'Solo admin puede crear operarios');
    }

    const { nombre, email, ciudad, cliente_id } = data;
    if (!nombre || !email || !ciudad || !cliente_id) {
      throw new functions.https.HttpsError('invalid-argument', 'Faltan datos requeridos');
    }

    // Validar formato de email
    if (!/^operario_[a-zA-Z0-9]+@seguridad\.com$/.test(email)) {
      throw new functions.https.HttpsError('invalid-argument', 'El email debe ser operario_nombre@seguridad.com');
    }

    // Crear password temporal seguro
    const password = generateSecurePassword();

    // Crear usuario en Firebase Auth
    let userRecord;
    try {
      userRecord = await admin.auth().createUser({
        email,
        displayName: nombre,
        password,
        disabled: false
      });
    } catch (err) {
      if (err.code === 'auth/email-already-exists') {
        throw new functions.https.HttpsError('already-exists', 'El email ya existe');
      }
      throw err;
    }

    // Asignar custom claims
    await admin.auth().setCustomUserClaims(userRecord.uid, {
      role: 'operario',
      rol: 'operario',
      city: ciudad,
      cliente_id: cliente_id
    });

    // Registrar en Firestore
    await db.collection(`operarios_${ciudad}`).doc(userRecord.uid).set({
      uid: userRecord.uid,
      nombre,
      email,
      ciudad,
      cliente_id,
      creado_en: new Date().toISOString(),
      activo: true
    });

    // Opcional: enviar password por email (requiere configuración de SMTP)
    // ...

    return {
      success: true,
      uid: userRecord.uid,
      email,
      password, // Mostrar solo en respuesta inmediata
      mensaje: 'Operario creado correctamente'
    };
  } catch (error) {
    console.error('❌ Error creando operario:', error);
    throw error;
  }
});

// ============================================================================
// FUNCIÓN: ENVIAR FACTURA POR EMAIL (Gmail SMTP vía nodemailer)
// ============================================================================
/**
 * Cloud Function Callable para enviar una factura por email al cliente.
 * Requiere: role admin o superadmin en los custom claims del que llama.
 * Params esperados: { facturaId, email }
 */

// Transporter reutilizable (usa credenciales de functions.config().gmail)
function getMailTransporter() {
  const gmailUser = process.env.GMAIL_USER;
  const gmailPass = process.env.GMAIL_PASS;

  if (!gmailUser || !gmailPass) {
    throw new functions.https.HttpsError(
      'failed-precondition',
      'Credenciales de Gmail no configuradas. Revisá functions/.env'
    );
  }

  return nodemailer.createTransport({
    service: 'gmail',
    auth: { user: gmailUser, pass: gmailPass }
  });
}

exports.enviarFacturaEmail = functions.https.onCall(async (data, context) => {
  // 1) Validar autenticación y rol
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'No autenticado');
  }
  const role = context.auth.token.role;
  if (role !== 'admin' && role !== 'superadmin') {
    throw new functions.https.HttpsError('permission-denied', 'Solo administradores pueden enviar facturas');
  }

  // 2) Validar datos
  const { facturaId, email } = data || {};
  if (!facturaId || !email) {
    throw new functions.https.HttpsError('invalid-argument', 'Faltan datos: facturaId, email');
  }

  // 3) Buscar la factura y el cliente asociado
  const facturaDoc = await db.collection('billing').doc(facturaId).get();
  if (!facturaDoc.exists) {
    throw new functions.https.HttpsError('not-found', 'Factura no encontrada');
  }
  const factura = facturaDoc.data();

  let clienteNombre = 'Cliente';
  if (factura.cliente_id) {
    const clienteDoc = await db.collection('clientes').doc(factura.cliente_id).get();
    if (clienteDoc.exists) {
      clienteNombre = clienteDoc.data().nombre || clienteNombre;
    }
  }

  const monto = factura.monto ? `$${Number(factura.monto).toLocaleString('es-AR')}` : '-';
  const vence = factura.vence_en ? new Date(factura.vence_en).toLocaleDateString('es-AR') : '-';

  // 4) Armar y enviar el mail
  const transporter = getMailTransporter();
  const gmailUser = process.env.GMAIL_USER;
  const mailOptions = {
    from: `TraficoMap <${gmailUser}>`,
    to: email,
    subject: `Factura ${facturaId} - TraficoMap`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #667eea;">Factura de TraficoMap</h2>
        <p>Hola,</p>
        <p>Te compartimos el detalle de tu factura:</p>
        <table style="width: 100%; border-collapse: collapse; margin: 20px 0;">
          <tr><td style="padding: 8px; border-bottom: 1px solid #eee;"><strong>Cliente</strong></td><td style="padding: 8px; border-bottom: 1px solid #eee;">${clienteNombre}</td></tr>
          <tr><td style="padding: 8px; border-bottom: 1px solid #eee;"><strong>Factura</strong></td><td style="padding: 8px; border-bottom: 1px solid #eee;">${facturaId}</td></tr>
          <tr><td style="padding: 8px; border-bottom: 1px solid #eee;"><strong>Monto</strong></td><td style="padding: 8px; border-bottom: 1px solid #eee;">${monto}</td></tr>
          <tr><td style="padding: 8px; border-bottom: 1px solid #eee;"><strong>Vencimiento</strong></td><td style="padding: 8px; border-bottom: 1px solid #eee;">${vence}</td></tr>
          <tr><td style="padding: 8px;"><strong>Estado</strong></td><td style="padding: 8px;">${factura.pagada ? 'Pagada' : 'Pendiente'}</td></tr>
        </table>
        <p>Ante cualquier consulta, respondé este mismo correo.</p>
        <p>Saludos,<br/>Equipo TraficoMap</p>
      </div>
    `
  };

  try {
    await transporter.sendMail(mailOptions);
    console.log(`✅ Email enviado a ${email} - Factura ${facturaId}`);
    return { success: true };
  } catch (error) {
    console.error('❌ Error enviando email:', error);
    throw new functions.https.HttpsError('internal', 'Error enviando el email: ' + error.message);
  }
});


/**
 * ========================================
 * PÁNICO POR RADIO - Alertas a vecinos cercanos
 * ========================================
 * Se dispara cuando se crea una denuncia con categoria === 'panico'.
 * Busca vecinos del mismo cliente/barrio dentro de un radio de 300m
 * (usando su última ubicación reportada) y les envía una notificación
 * push con los datos de la alerta para que puedan verla y comunicarse
 * con el vecino que la activó.
 */

const RADIO_ALERTA_METROS = 300;
const VENTANA_UBICACION_ACTIVA_MS = 6 * 60 * 60 * 1000; // 6 horas

function haversineMetros(lat1, lng1, lat2, lng2) {
  const R = 6371000;
  const toRad = (deg) => (deg * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

exports.onPanicoCreado = functions.firestore
  .document('clientes/{clienteId}/denuncias/{denunciaId}')
  .onCreate(async (snap, context) => {
    const denuncia = snap.data();

    if (denuncia.categoria !== 'panico') {
      return null; // no es un pánico, no hacemos nada
    }

    if (denuncia.lat == null || denuncia.lng == null || (denuncia.lat === 0 && denuncia.lng === 0)) {
      console.warn('⚠️ Pánico sin coordenadas GPS válidas, no se puede notificar por radio');
      return null;
    }

    const { clienteId, denunciaId } = context.params;

    try {
      const vecinosSnap = await db.collection(`clientes/${clienteId}/vecinos`).get();

      const ahora = Date.now();
      const cercanos = [];

      vecinosSnap.forEach((doc) => {
        const v = doc.data();

        if (!v.lat || !v.lng || !v.fcm_token) return; // sin ubicación o sin token, no se puede notificar
        if (v.email && denuncia.vecinoEmail && v.email === denuncia.vecinoEmail) return; // no notificar al que activó

        // Ignorar ubicaciones viejas (vecino con la app cerrada hace rato)
        if (v.ubicacion_actualizada_en) {
          const t = v.ubicacion_actualizada_en.toMillis
            ? v.ubicacion_actualizada_en.toMillis()
            : new Date(v.ubicacion_actualizada_en).getTime();
          if (ahora - t > VENTANA_UBICACION_ACTIVA_MS) return;
        } else {
          return; // nunca reportó ubicación
        }

        const distancia = haversineMetros(denuncia.lat, denuncia.lng, v.lat, v.lng);
        if (distancia <= RADIO_ALERTA_METROS) {
          cercanos.push({ uid: doc.id, token: v.fcm_token, distancia: Math.round(distancia) });
        }
      });

      if (cercanos.length === 0) {
        console.log(`Sin vecinos en ${RADIO_ALERTA_METROS}m para notificar (pánico ${denunciaId})`);
        return null;
      }

      const tokens = cercanos.map((c) => c.token);

      // IMPORTANTE: enviamos SOLO "data", sin campo "notification". Si mandamos
      // ambos, Android a veces muestra la notificación automáticamente por su
      // cuenta (usando el campo "notification") sin pasar por nuestro código
      // en sw.js — y entonces nuestro manejador de click nunca se ejecuta,
      // aunque la notificación se vea bien. Con "data" puro, SIEMPRE pasa por
      // nuestro setBackgroundMessageHandler, que es quien arma la notificación
      // y controla qué pasa al tocarla.
      const respuesta = await admin.messaging().sendEachForMulticast({
        tokens,
        data: {
          tipo: 'panico',
          clienteId: String(clienteId),
          denunciaId: String(denunciaId),
          lat: String(denuncia.lat),
          lng: String(denuncia.lng),
          title: '🚨 Alerta de emergencia cerca tuyo',
          body: `${denuncia.vecino || 'Un vecino'} activó una alerta a metros de tu ubicación. Tocá para ver y comunicarte.`
        }
      });

      console.log(
        `✅ Pánico ${denunciaId}: ${respuesta.successCount} notificaciones enviadas, ${respuesta.failureCount} fallidas`
      );

      await snap.ref.update({
        notificados: cercanos.map((c) => c.uid)
      });

      return null;
    } catch (error) {
      console.error('❌ Error procesando pánico por radio:', error);
      return null;
    }
  });
  