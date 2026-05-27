'use strict';
 
const functions = require('firebase-functions');
const admin = require('firebase-admin');
const express = require('express');
const cors = require('cors');
 
// ============================================================================
// INICIALIZACIÓN — debe ser LO PRIMERO, antes de cualquier uso de admin
// ============================================================================
admin.initializeApp();
 
const db = admin.firestore();
const auth = admin.auth();
 
// ============================================================================
// FUNCIÓN: crearUsuarioPanel (callable)
// ============================================================================
const { crearUsuarioPanel } = require('./crearUsuarioPanel');
exports.crearUsuarioPanel = crearUsuarioPanel;
 
// ============================================================================
// FUNCIÓN: borrarUsuarioPanel (callable)
// ============================================================================
const { borrarUsuarioPanel } = require('./borrarUsuarioPanel');
exports.borrarUsuarioPanel = borrarUsuarioPanel;
 
// ============================================================================
// FUNCIÓN: setAdminClaimsOnCreate
// Asigna claims admin automáticamente al crear un usuario admin@*
// ============================================================================
exports.setAdminClaimsOnCreate = functions.auth.user().onCreate(async (user) => {
  if (user.email && user.email.startsWith('admin@')) {
    await admin.auth().setCustomUserClaims(user.uid, {
      admin: true,
      role: 'admin',
      rol: 'admin',
      email: user.email
    });
    await admin.firestore().collection('usuarios').doc(user.uid).set({
      email: user.email,
      rol: 'admin',
      creado: admin.firestore.FieldValue.serverTimestamp()
    }, { merge: true });
    console.log(`✅ Claims admin asignados a ${user.email}`);
  }
});
 
// ============================================================================
// FUNCIÓN: setCustomClaimsOnCreate
// Asigna claims a patrullas/operarios con email @seguridad.com
// ============================================================================
exports.setCustomClaimsOnCreate = functions.auth.user().onCreate(async (user) => {
  const email = user.email || '';
  let claims = {};
 
  if (email.endsWith('@seguridad.com')) {
    const patrullaMatch = email.match(/patrulla_(\d+)/);
    claims = {
      role: 'patrulla',
      rol: 'patrulla',
      city: 'laplata',
      cliente_id: 'laplata',
      ...(patrullaMatch ? { patrulla: patrullaMatch[1] } : {})
    };
    await admin.auth().setCustomUserClaims(user.uid, claims);
    console.log(`✅ Claims asignados a ${email}`);
  } else {
    console.log(`ℹ️ Usuario sin claims automáticos: ${email}`);
  }
});
 
// ============================================================================
// FUNCIÓN: getClientFirebaseConfig (callable)
// Devuelve credenciales Firebase del cliente al usuario autenticado
// ============================================================================
exports.getClientFirebaseConfig = functions.https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'Usuario no autenticado');
  }
 
  const user = await admin.auth().getUser(context.auth.uid);
  const clienteId = user.customClaims?.cliente_id;
 
  if (!clienteId) {
    throw new functions.https.HttpsError('failed-precondition', 'Usuario sin acceso a cliente.');
  }
 
  const clienteDoc = await db.collection('clientes').doc(clienteId).get();
  if (!clienteDoc.exists) {
    throw new functions.https.HttpsError('not-found', 'Cliente no encontrado.');
  }
 
  const clienteData = clienteDoc.data();
  if (!clienteData.firebase_cliente) {
    throw new functions.https.HttpsError('failed-precondition', 'Credenciales no configuradas.');
  }
 
  return {
    success: true,
    firebaseConfig: clienteData.firebase_cliente,
    clienteId,
    nombre: clienteData.nombre,
    suscripcion: {
      plan: clienteData.plan,
      estado: clienteData.estado,
      expiration_date: clienteData.suscripcion?.expiration_date
    }
  };
});
 
// ============================================================================
// adminApi — Express HTTP para operaciones del panel de administración
// ============================================================================
const app = express();
app.use(cors({ origin: true }));
app.use(express.json());
 
// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
});
 
// Crear cliente
app.post('/criarCliente', async (req, res) => {
  try {
    const { nombreCliente, email, plan, ciudad, telefono, firebaseConfig } = req.body;
 
    if (!nombreCliente || !email || !plan) {
      return res.status(400).json({ error: 'Faltan datos requeridos' });
    }
    if (!firebaseConfig || !firebaseConfig.projectId) {
      return res.status(400).json({ error: 'Credenciales de Firebase requeridas' });
    }
    if (!['basico', 'profesional', 'enterprise'].includes(plan)) {
      return res.status(400).json({ error: 'Plan inválido' });
    }
 
    const clienteId = firebaseConfig.projectId;
    const ahora = new Date().toISOString();
    const precios = { basico: 1000, profesional: 5000, enterprise: 15000 };
 
    const datosCliente = {
      id: clienteId,
      nombre: nombreCliente,
      email,
      plan,
      estado: 'activo',
      ciudad: ciudad || '',
      telefono: telefono || '',
      created_at: ahora,
      updated_at: ahora,
      firebase_proyecto_id: firebaseConfig.projectId,
      firebase_cliente: {
        apiKey: firebaseConfig.apiKey,
        authDomain: firebaseConfig.authDomain,
        projectId: firebaseConfig.projectId,
        storageBucket: firebaseConfig.storageBucket,
        messagingSenderId: firebaseConfig.messagingSenderId,
        appId: firebaseConfig.appId,
        databaseURL: firebaseConfig.databaseURL || ''
      },
      api_key: `sk_${Date.now()}_${Math.random().toString(36).substr(2, 32)}`,
      usuarios_creados: [],
      suscripcion: {
        plan,
        estado: 'activo',
        expiration_date: new Date(new Date().setFullYear(new Date().getFullYear() + 1)).toISOString()
      }
    };
 
    await db.collection('clientes').doc(clienteId).set(datosCliente);
 
    let userAdmin;
    try {
      userAdmin = await auth.createUser({ email, displayName: `Admin - ${nombreCliente}`, disabled: false });
      await auth.setCustomUserClaims(userAdmin.uid, { role: 'admin', cliente_id: clienteId });
    } catch (error) {
      if (error.code === 'auth/email-already-exists') {
        userAdmin = await auth.getUserByEmail(email);
        await auth.setCustomUserClaims(userAdmin.uid, { role: 'admin', cliente_id: clienteId });
      } else {
        throw error;
      }
    }
 
    const subscripcionId = `sub_${Date.now()}`;
    const vencimiento = new Date();
    vencimiento.setFullYear(vencimiento.getFullYear() + 1);
 
    await db.collection('subscripciones').doc(subscripcionId).set({
      id: subscripcionId,
      cliente_id: clienteId,
      plan,
      precio_mensual: precios[plan],
      precio_anual: precios[plan] * 12,
      expiration_date: vencimiento.toISOString(),
      activa: true,
      created_at: ahora,
      updated_at: ahora,
      renovaciones: 0,
      cambios_plan: []
    });
 
    await db.collection('billing').add({
      cliente_id: clienteId,
      subscripcion_id: subscripcionId,
      monto: precios[plan] * 12,
      moneda: 'ARS',
      descripcion: `Suscripción ${plan.toUpperCase()} - Año 1`,
      estado: 'pendiente',
      creada_en: ahora,
      pagada: false
    });
 
    res.json({ success: true, cliente: datosCliente, admin_user: { email, uid: userAdmin?.uid } });
  } catch (error) {
    console.error('❌ Error creando cliente:', error);
    res.status(500).json({ error: error.message });
  }
});
 
// Cambiar plan
app.post('/cambiarPlan', async (req, res) => {
  try {
    const { subscripcionId, nuevoPlan } = req.body;
    if (!subscripcionId || !nuevoPlan) return res.status(400).json({ error: 'Faltan datos' });
 
    const precios = { basico: 1000, profesional: 5000, enterprise: 15000 };
    if (!precios[nuevoPlan]) return res.status(400).json({ error: 'Plan inválido' });
 
    const subDoc = await db.collection('subscripciones').doc(subscripcionId).get();
    if (!subDoc.exists) return res.status(404).json({ error: 'Suscripción no encontrada' });
 
    const subActual = subDoc.data();
    const cambio = {
      fecha: new Date().toISOString(),
      plan_anterior: subActual.plan,
      plan_nuevo: nuevoPlan,
      precio_anterior: subActual.precio_mensual,
      precio_nuevo: precios[nuevoPlan]
    };
 
    await db.collection('subscripciones').doc(subscripcionId).update({
      plan: nuevoPlan,
      precio_mensual: precios[nuevoPlan],
      precio_anual: precios[nuevoPlan] * 12,
      updated_at: new Date().toISOString(),
      cambios_plan: admin.firestore.FieldValue.arrayUnion(cambio)
    });
 
    res.json({ success: true, cambio });
  } catch (error) {
    console.error('❌ Error cambiando plan:', error);
    res.status(500).json({ error: error.message });
  }
});
 
// Registrar pago
app.post('/registrarPago', async (req, res) => {
  try {
    const { facturaId, metodo_pago, referencias } = req.body;
    if (!facturaId) return res.status(400).json({ error: 'ID de factura requerido' });
 
    const factDoc = await db.collection('billing').doc(facturaId).get();
    if (!factDoc.exists) return res.status(404).json({ error: 'Factura no encontrada' });
 
    const factura = factDoc.data();
    await db.collection('billing').doc(facturaId).update({
      pagada: true,
      estado: 'pagada',
      fecha_pago: new Date().toISOString(),
      metodo_pago: metodo_pago || 'transferencia',
      referencias_pago: referencias || {}
    });
 
    if (factura.subscripcion_id) {
      await db.collection('subscripciones').doc(factura.subscripcion_id).update({
        activa: true,
        updated_at: new Date().toISOString()
      });
    }
 
    res.json({ success: true, factura_id: facturaId, estado: 'pagada' });
  } catch (error) {
    console.error('❌ Error registrando pago:', error);
    res.status(500).json({ error: error.message });
  }
});
 
// Update custom claims
app.post('/updateCustomClaims', async (req, res) => {
  try {
    const { uid, claims } = req.body;
    if (!uid || !claims) return res.status(400).json({ error: 'UID y claims requeridos' });
    await auth.setCustomUserClaims(uid, claims);
    res.json({ success: true, uid, claims });
  } catch (error) {
    console.error('❌ Error actualizando claims:', error);
    res.status(500).json({ error: error.message });
  }
});
 
// Toggle user status
app.post('/toggleUserStatus', async (req, res) => {
  try {
    const { uid, disabled } = req.body;
    if (!uid || typeof disabled !== 'boolean') return res.status(400).json({ error: 'UID y disabled requeridos' });
    await auth.updateUser(uid, { disabled });
    res.json({ success: true, uid, disabled });
  } catch (error) {
    console.error('❌ Error actualizando usuario:', error);
    res.status(500).json({ error: error.message });
  }
});
 
// Renovar suscripción
app.post('/renovarSubscripcion', async (req, res) => {
  try {
    const { subscripcionId } = req.body;
    if (!subscripcionId) return res.status(400).json({ error: 'Suscripción ID requerido' });
 
    const subDoc = await db.collection('subscripciones').doc(subscripcionId).get();
    if (!subDoc.exists) return res.status(404).json({ error: 'Suscripción no encontrada' });
 
    const sub = subDoc.data();
    const nuevoVencimiento = new Date(sub.expiration_date);
    nuevoVencimiento.setFullYear(nuevoVencimiento.getFullYear() + 1);
 
    await db.collection('subscripciones').doc(subscripcionId).update({
      expiration_date: nuevoVencimiento.toISOString(),
      renovaciones: (sub.renovaciones || 0) + 1,
      updated_at: new Date().toISOString(),
      activa: true
    });
 
    await db.collection('billing').add({
      cliente_id: sub.cliente_id,
      subscripcion_id: subscripcionId,
      monto: sub.precio_anual,
      moneda: 'ARS',
      descripcion: `Renovación ${sub.plan.toUpperCase()}`,
      estado: 'pendiente',
      creada_en: new Date().toISOString(),
      pagada: false
    });
 
    res.json({ success: true, subscripcion_id: subscripcionId, nuevo_vencimiento: nuevoVencimiento.toISOString() });
  } catch (error) {
    console.error('❌ Error renovando:', error);
    res.status(500).json({ error: error.message });
  }
});
 
exports.adminApi = functions.https.onRequest(app);
 