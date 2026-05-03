/**
 * VERIFICAR-SUSCRIPCION.js
 * 
 * Verifica con el Firebase administrativo que la suscripción
 * del cliente sigue activa y válida
 * 
 * CARGA EN: index.html (ANTES de app.js)
 */

console.log('🔐 Sistema de verificación de suscripción LISTO');

let verificacionCache = null;
let verificacionTimeout = 3600000; // 1 hora

/**
 * Verificar estado de suscripción
 */
async function verificarSuscripcion() {
  try {
    console.log('🔐 Iniciando verificación de suscripción...');

    // 1. Obtener datos del config
    const suscripcionId = window.CONFIG?.suscripcion?.id;
    if (!suscripcionId) {
      console.warn('⚠️ No hay suscripcion_id en CONFIG. Continuando sin verificación (DEMO).');
      return true; // Permitir en modo demo
    }

    // 2. Usar caché si está fresca
    if (verificacionCache && 
        (Date.now() - verificacionCache.timestamp) < verificacionTimeout) {
      console.log('✅ Verificación de suscripción (DESDE CACHE)', {
        valida: verificacionCache.valida,
        minutos_restantes: Math.floor((verificacionTimeout - (Date.now() - verificacionCache.timestamp)) / 60000)
      });
      return verificacionCache.valida;
    }

    // 3. Inicializar Firebase Administrativo (tu Firebase)
    const tuFirebaseConfig = window.CONFIG?.firebase_verificacion;
    if (!tuFirebaseConfig?.projectId) {
      console.warn('⚠️ No hay firebase_verificacion en CONFIG');
      return true; // Permitir en modo demo
    }

    // Crear app secundaria para verificación
    const adminApp = firebase.initializeApp(tuFirebaseConfig, 'admin-verificacion');
    const adminAuth = adminApp.auth();
    const adminDb = adminApp.firestore();

    // Obtener token del usuario actual
    const currentUser = firebase.auth().currentUser;
    if (!currentUser) {
      console.warn('⚠️ Usuario no autenticado');
      guardarVerificacion(false);
      return false;
    }

    const idToken = await currentUser.getIdToken();

    // 4. Realizar consulta a Firestore administrativo
    console.log('📋 Buscando datos de suscripción:', suscripcionId);
    
    const subscripcionRef = await adminDb
      .collection('subscripciones')
      .doc(suscripcionId)
      .get();

    if (!subscripcionRef.exists) {
      console.error('❌ Suscripción NO ENCONTRADA:', suscripcionId);
      mostrarMensajeError(
        'Suscripción no válida',
        'No pudimos encontrar tu suscripción en nuestros registros. Contacta al soporte.'
      );
      guardarVerificacion(false);
      return false;
    }

    const suscripcionData = subscripcionRef.data();
    console.log('📋 Datos de suscripción encontrados:', suscripcionData);

    // 5. Verificar estado
    if (suscripcionData.estado !== 'activo') {
      console.error('❌ Suscripción NO ACTIVA. Estado:', suscripcionData.estado);
      mostrarMensajeError(
        `Suscripción ${suscripcionData.estado}`,
        `Tu suscripción está ${suscripcionData.estado}. Por favor contacta al administrador.`
      );
      guardarVerificacion(false);
      return false;
    }

    // 6. Verificar fecha de expiración
    const fechaExpiracion = suscripcionData.fecha_expiracion?.toDate?.() || 
                            new Date(suscripcionData.fecha_expiracion);
    
    if (fechaExpiracion < new Date()) {
      console.error('❌ Suscripción EXPIRADA', { fecha: fechaExpiracion });
      mostrarMensajeError(
        'Suscripción expirada',
        'Tu suscripción ha expirado. Por favor renuévala para continuar.'
      );
      guardarVerificacion(false);
      return false;
    }

    // 7. Calcular días hasta expiración
    const diasRestantes = Math.ceil(
      (fechaExpiracion - new Date()) / (1000 * 60 * 60 * 24)
    );
    console.log(`✅ Suscripción VÁLIDA. ${diasRestantes} días restantes`, {
      fecha_expiracion: fechaExpiracion.toLocaleDateString('es-AR'),
      plan: suscripcionData.plan
    });

    // 8. Alerta si está por vencer
    if (diasRestantes < 7) {
      console.warn(`⚠️ ALERTA: Tu suscripción vence en ${diasRestantes} días`);
      mostrarAlerta(`Tu suscripción vence en ${diasRestantes} días. Renuévala pronto.`);
    }

    // 9. Mostrar indicador visual
    mostrarIndicadorSuscripcion(suscripcionData, diasRestantes);

    guardarVerificacion(true);
    return true;

  } catch (error) {
    console.error('❌ Error verificando suscripción:', error);
    mostrarMensajeError(
      'Error de verificación',
      'Hubo un error al verificar tu suscripción. Por favor intenta de nuevo.'
    );
    return false;
  }
}

/**
 * Guardar resultado en caché
 */
function guardarVerificacion(valida) {
  verificacionCache = {
    valida: valida,
    timestamp: Date.now()
  };
}

/**
 * Mostrar indicador de suscripción en la UI
 */
function mostrarIndicadorSuscripcion(data, diasRestantes) {
  setTimeout(() => {
    const badge = document.getElementById('suscripcion-badge');
    if (!badge) return;

    let texto = `Plan: ${data.plan}`;
    if (diasRestantes < 7) {
      texto += ` | 🔴 Vence en ${diasRestantes} días`;
      badge.classList.add('expiring');
    } else {
      texto += ` | ✅ Vence en ${diasRestantes} días`;
    }
    
    badge.textContent = texto;
    badge.style.display = 'block';
  }, 500);
}

/**
 * Mostrar mensaje de error bloqueante
 */
function mostrarMensajeError(titulo, mensaje) {
  const blocker = document.createElement('div');
  blocker.style.cssText = `
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background-color: rgba(0,0,0,0.95);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 10000;
    backdrop-filter: blur(3px);
  `;
  
  const contenido = document.createElement('div');
  contenido.style.cssText = `
    background: white;
    padding: 40px;
    border-radius: 12px;
    text-align: center;
    max-width: 450px;
    box-shadow: 0 10px 40px rgba(0,0,0,0.3);
  `;
  
  contenido.innerHTML = `
    <h1 style="
      color: #d32f2f;
      margin: 0 0 15px 0;
      font-size: 28px;
    ">❌ ${titulo}</h1>
    <p style="
      color: #666;
      margin: 0 0 25px 0;
      font-size: 16px;
      line-height: 1.6;
    ">${mensaje}</p>
    <button onclick="location.reload()" style="
      background: #d32f2f;
      color: white;
      border: none;
      padding: 12px 30px;
      border-radius: 6px;
      cursor: pointer;
      font-size: 16px;
      font-weight: 600;
    ">Reintentar</button>
  `;
  
  blocker.appendChild(contenido);
  document.body.appendChild(blocker);

  // Bloquear interfaz
  document.getElementById('app-container').style.opacity = '0.3';
  document.getElementById('app-container').style.pointerEvents = 'none';
}

/**
 * Mostrar alerta no bloqueante (notificación)
 */
function mostrarAlerta(mensaje) {
  console.warn(`⚠️ ALERTA: ${mensaje}`);
  
  // Opcionalmente mostrar toast o notificación en UI
  const notif = document.createElement('div');
  notif.style.cssText = `
    position: fixed;
    bottom: 20px;
    right: 20px;
    background: #ff9800;
    color: white;
    padding: 15px 20px;
    border-radius: 4px;
    z-index: 9999;
    box-shadow: 0 2px 8px rgba(0,0,0,0.2);
    animation: slideIn 0.3s ease-in-out;
  `;
  notif.textContent = `⚠️ ${mensaje}`;
  notif.id = 'subscription-alert';
  
  // Auto-remover después de 5 segundos
  setTimeout(() => {
    notif.style.animation = 'slideOut 0.3s ease-in-out';
    setTimeout(() => notif.remove(), 300);
  }, 5000);
  
  document.body.appendChild(notif);
}

/**
 * Ejecutar verificación al cargar
 * 
 * Espera a que Firebase esté completamente inicializado
 */
window.addEventListener('DOMContentLoaded', async () => {
  console.log('🔐 Página cargada. Esperando Firebase...');
  
  // Esperar a que Firebase Auth esté listo
  let intentos = 0;
  const maxIntentos = 30; // 30 segundos máximo
  
  const esperar = setInterval(async () => {
    intentos++;
    
    if (firebase.auth()) {
      clearInterval(esperar);
      
      // Esperar autenticación del usuario
      firebase.auth().onAuthStateChanged(async (user) => {
        if (user) {
          console.log('✅ Usuario autenticado:', user.email);
          const esValida = await verificarSuscripcion();
          
          if (!esValida) {
            console.error('🚫 ACCESO DENEGADO - Suscripción no válida');
          } else {
            console.log('✅ ACCESO PERMITIDO - Suscripción válida');
            // El app se carga normalmente
          }
        }
      });
    } else if (intentos >= maxIntentos) {
      clearInterval(esperar);
      console.error('❌ Firebase no inicializó a tiempo');
    }
  }, 1000);
});

// Permitir re-verificación manual
window.reVerificarSuscripcion = async () => {
  console.log('🔄 Re-verificando suscripción...');
  verificacionCache = null; // Limpiar caché
  return await verificarSuscripcion();
};
