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
app.use(cors({ origin: true }));
app.use(express.json());

// ============================================================================
// FUNCIÓN 1: CREAR CLIENTE
// ============================================================================
/**
 * Orquestar creación completa de cliente:
 * 1. Crear documento en clientes/
 * 2. Crear usuarios admin/operador en Firebase Auth
 * 3. Crear suscripción inicial
 * 4. Crear factura inicial
 * 5. Crear proyecto independiente (simulado)
 */
app.post('/criarCliente', async (req, res) => {
  try {
    const { 
      nombreCliente, 
      email, 
      plan, 
      ciudad, 
      telefono,
      firebaseConfig  // ✅ NUEVO: Credenciales de Firebase del cliente
    } = req.body;

    // Validación
    if (!nombreCliente || !email || !plan) {
      return res.status(400).json({ error: 'Faltan datos requeridos' });
    }

    // ✅ Validar que Firebase config esté presente
    if (!firebaseConfig || !firebaseConfig.projectId) {
      return res.status(400).json({ 
        error: 'Credenciales de Firebase requeridas (projectId, apiKey, etc.)' 
      });
    }

    const planesValidos = ['basico', 'profesional', 'enterprise'];
    if (!planesValidos.includes(plan)) {
      return res.status(400).json({ error: 'Plan inválido' });
    }

    console.log(`🚀 Creando cliente: ${nombreCliente}`);
    console.log(`📱 Firebase Project: ${firebaseConfig.projectId}`);

    // PASO 1: Crear documento en clientes/ (con credenciales de Firebase)
    const clienteId = firebaseConfig.projectId; // Usar projectId como cliente ID
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
      firebase_project_id: firebaseConfig.projectId,
      
      // ✅ GUARDAR CREDENCIALES DEL CLIENTE
      firebase_cliente: {
        apiKey: firebaseConfig.apiKey,
        authDomain: firebaseConfig.authDomain,
        projectId: firebaseConfig.projectId,
        storageBucket: firebaseConfig.storageBucket,
        messagingSenderId: firebaseConfig.messagingSenderId,
        appId: firebaseConfig.appId,
        databaseURL: firebaseConfig.databaseURL || ''
      },
      
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
