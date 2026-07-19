// ========================================
// VECINO APP - Denuncias
// ========================================
let db = null, auth = null, storage = null;
let municipio = null, clienteId = null;
let vecinoNombre = '', vecinoEmail = '';
let fotoSeleccionada = null;

// ========================================
// PÁNICO POR RADIO - Variables nuevas
// ========================================
let messaging = null;
let miUltimaUbicacion = null; // { lat, lng } - actualizada por el watch de geolocalización
let watchIdUbicacion = null;
const VAPID_KEY = 'BLVqLV44MjFG0JbNIt5wvP6mTD-_SIrKy3fXSiubSGT7pXWvauVA6soiDcPbGr7m9wA2AC2ZDj0p3O6JsEKOwKI';
const RADIO_ALERTA_METROS = 300;

// ========================================
// SISTEMA DE DEBUG/LOGGING
// ========================================
let debugLogs = [];
const maxLogs = 50;

function addLog(msg, type = 'info') {
  const timestamp = new Date().toLocaleTimeString('es-AR');
  const logEntry = `[${timestamp}] ${msg}`;
  debugLogs.unshift(logEntry);
  if (debugLogs.length > maxLogs) debugLogs.pop();
  
  const panel = document.getElementById('debug-panel');
  if (panel) {
    const logDiv = document.createElement('div');
    logDiv.className = `debug-log ${type}`;
    logDiv.textContent = logEntry;
    panel.insertBefore(logDiv, panel.firstChild);
    // Limitar DOM
    while (panel.children.length > maxLogs) {
      panel.removeChild(panel.lastChild);
    }
  }
}

// Capturar console logs
const originalLog = console.log;
const originalError = console.error;
const originalWarn = console.warn;

console.log = function(...args) {
  originalLog.apply(console, args);
  addLog(args.join(' '), 'info');
};
console.error = function(...args) {
  originalError.apply(console, args);
  addLog('❌ ' + args.join(' '), 'error');
};
console.warn = function(...args) {
  originalWarn.apply(console, args);
  addLog('⚠️ ' + args.join(' '), 'warning');
};

// Web Speech API - Speech Recognition
const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
let recognition = null;
let isListening = false;

// Detectar idioma del navegador
function getLanguage() {
  const nav = (navigator.language || navigator.userLanguage || 'es-AR').toLowerCase();
  if (nav.includes('es')) return 'es-AR'; // Español Argentina
  return 'en-US'; // fallback inglés
}

// Debug: mostrar info del navegador
function debugInfo() {
  const userAgent = navigator.userAgent;
  console.log('🔍 DEBUG INFO:', {
    browser: userAgent,
    language: getLanguage(),
    isAndroid: /Android/i.test(userAgent),
    isChrome: /Chrome/i.test(userAgent),
    hasWebkitSpeech: !!window.webkitSpeechRecognition,
    hasSpeechRecognition: !!window.SpeechRecognition,
    hasMediaDevices: !!navigator.mediaDevices
  });
}
debugInfo();

if (SpeechRecognition) {
  recognition = new SpeechRecognition();
  recognition.lang = 'es'; // Idioma simplificado para Android
  recognition.continuous = false;
  recognition.interimResults = false; // Desactivado para Android
  recognition.maxAlternatives = 1;
  
  recognition.addEventListener('start', () => {
    isListening = true;
    const btn = document.getElementById('btn-voice');
    btn.classList.add('listening');
    btn.textContent = '🎤 Grabando...';
    document.getElementById('voice-status').textContent = '🎤 Escuchando tu voz...';
    console.log('✅ Speech recognition iniciado', { lang: recognition.lang });
  });
  
  recognition.addEventListener('end', () => {
    isListening = false;
    const btn = document.getElementById('btn-voice');
    btn.classList.remove('listening');
    btn.textContent = '🎤 Voz';
    console.log('🛑 Speech recognition terminado');
  });
  
  recognition.addEventListener('result', (e) => {
    console.log(`📝 RESULT EVENT: resultIndex=${e.resultIndex}, results.length=${e.results.length}`);
    addLog(`📝 RESULT EVENT recibido!`, 'success');
    
    let texto = '';
    for (let i = e.resultIndex; i < e.results.length; i++) {
      const transcript = e.results[i][0].transcript;
      const confidence = e.results[i][0].confidence;
      console.log(`📝 [${i}] isFinal=${e.results[i].isFinal} conf=${(confidence*100).toFixed(0)}%: "${transcript}"`);
      addLog(`📝 [${i}] "${transcript}" (${(confidence*100).toFixed(0)}%)`, 'info');
      texto += transcript + ' ';
    }
    
    texto = texto.trim();
    if (!texto) {
      console.warn('⚠️ Texto vacío');
      addLog('⚠️ Texto vacío en resultado', 'warning');
      return;
    }
    
    const textarea = document.getElementById('texto');
    textarea.value = (textarea.value + ' ' + texto).trim();
    document.getElementById('voice-status').textContent = `✅ Agregado: "${texto}"`;
    addLog(`✅ AGREGADO AL TEXTAREA: "${texto}"`, 'success');
    console.log('✅ Textarea ahora:', textarea.value);
  });
  
  recognition.addEventListener('error', (e) => {
    const errorMap = {
      'no-speech': '❌ No escuché tu voz. Intenta de nuevo.',
      'audio-capture': '❌ No se pudo acceder al micrófono.',
      'network': '❌ Error de conexión. Intenta de nuevo.',
      'permission-denied': '❌ Permiso denegado. Permite acceso a micrófono.',
      'not-allowed': '❌ El micrófono no está permitido en esta app.',
      'service-not-allowed': '❌ El servicio no está disponible.',
      'bad-grammar': '❌ Error de gramática en el reconocimiento.',
      'aborted': 'Reconocimiento abortado por el usuario.'
    };
    const msg = errorMap[e.error] || `❌ Error de voz: ${e.error}`;
    document.getElementById('voice-status').textContent = msg;
    console.error('❌ Speech error:', e.error);
    addLog(`❌ Speech error ${e.error}: ${msg}`, 'error');
    isListening = false;
    document.getElementById('btn-voice').classList.remove('listening');
  });
}

const MUNICIPIO_TO_ID = {
  'La Plata': 'laplata', 'la plata': 'laplata',
  'Mar del Plata': 'mardelplata', 'mar del plata': 'mardelplata',
  'Córdoba': 'cordoba', 'cordoba': 'cordoba',
  'Mendoza': 'mendoza', 'mendoza': 'mendoza'
};
async function initFirebase() {
  try {
    const response = await fetch('../config.json');
    const config = await response.json();
    if (!firebase.apps.length) firebase.initializeApp(config.firebase);
    db = firebase.firestore();
    auth = firebase.auth();
    storage = firebase.storage();
    if (firebase.messaging && firebase.messaging.isSupported && firebase.messaging.isSupported()) {
      messaging = firebase.messaging();
    } else {
      console.warn('⚠️ Firebase Messaging no soportado en este navegador');
    }
    console.log('✅ Firebase initialized (vecino)');
    auth.onAuthStateChanged(async (user) => {
      if (!user) {
        console.warn('🛑 No autenticado');
        setTimeout(() => { window.location.href = '/login.html'; }, 1500);
        return;
      }
      console.log('✅ Vecino autenticado:', user.email);
      vecinoEmail = user.email || '';
      let userCity = null;
      for (let i = 0; i < 5; i++) {
        const t = await user.getIdTokenResult(true);
        userCity = t.claims.city;
        if (t.claims.cliente_id) clienteId = t.claims.cliente_id;
        if (userCity) break;
        await new Promise(r => setTimeout(r, 600));
      }
      if (!userCity) { alert('No se encontró la ciudad asignada.'); window.location.href = '/login.html'; return; }
      municipio = userCity;
      if (!clienteId) clienteId = MUNICIPIO_TO_ID[municipio] || municipio.toLowerCase().replace(/\s+/g, '');
      console.log(`📍 Ciudad: ${municipio}, clienteId: ${clienteId}`);
    // Obtener datos del vecino desde Firestore (nombre + estado de suscripción)
      let datosVecino = null;
      try {
        const snap = await db.collection(`clientes/${clienteId}/vecinos`).where('email', '==', vecinoEmail).limit(1).get();
        if (!snap.empty) {
          datosVecino = snap.docs[0].data();
          vecinoNombre = datosVecino.nombre || vecinoEmail;
        } else {
          vecinoNombre = vecinoEmail;
        }
      } catch (e) { vecinoNombre = vecinoEmail; }
      document.querySelector('.app-header h1').textContent = `📢 ${vecinoNombre}`;
      // Verificar suscripción: habilitado === true Y habilitado_hasta === mes actual
      const mesActual = new Date().toISOString().slice(0, 7); // "2026-06"
      const habilitado = datosVecino && datosVecino.habilitado === true && datosVecino.habilitado_hasta === mesActual;
      if (!habilitado) {
        bloquearApp();
        return;
      }
      cargarMisDenuncias();
      iniciarTrackingUbicacion();
      configurarNotificaciones();
      cargarAlertasCercanas();
      mostrarBannerInstalacion();
    });
  } catch (e) {
    console.error('❌ Firebase error:', e);
  }
}
initFirebase();
// ========================================
// FOTO
// ========================================
function procesarFoto(e) {
  const file = e.target.files[0];
  if (!file || !file.type.startsWith('image/')) return;
  const reader = new FileReader();
  reader.onload = (ev) => {
    fotoSeleccionada = ev.target.result;
    document.getElementById('foto-preview').innerHTML = `<img src="${fotoSeleccionada}">`;
  };
  reader.readAsDataURL(file);
}
document.getElementById('file-foto').addEventListener('change', procesarFoto);
document.getElementById('file-camara').addEventListener('change', procesarFoto);
// ========================================
// VOZ A TEXTO
// ========================================
if (recognition) {
  document.getElementById('btn-voice').addEventListener('click', () => {
    console.log('🎤 Click en btn-voice, isListening:', isListening);
    
    if (!SpeechRecognition) {
      addLog('❌ SpeechRecognition no disponible', 'error');
      alert('Tu navegador no soporta reconocimiento de voz. Usa Chrome, Edge o Safari recientes.');
      return;
    }
    
    if (isListening) {
      console.log('⏹️ Deteniendo grabación');
      recognition.stop();
      return;
    }
    
    // SIN pedir getUserMedia - dejar que recognition.start() maneje todo
    try {
      console.log('🎙️ Iniciando Speech Recognition (sin getUserMedia)...');
      document.getElementById('texto').focus();
      document.getElementById('voice-status').textContent = '⏳ Iniciando micrófono...';
      recognition.start();
      
    } catch (err) {
      console.error('❌ Error al iniciar recognition:', err.name, err.message);
      addLog(`❌ Error: ${err.name} - ${err.message}`, 'error');
      document.getElementById('voice-status').textContent = `❌ Error: ${err.message}`;
    }
  });
} else {
  console.warn('⚠️ Web Speech API no disponible');
  addLog('⚠️ Web Speech API no disponible en este navegador', 'warning');
  document.getElementById('btn-voice').style.opacity = '0.5';
  document.getElementById('btn-voice').disabled = true;
  document.getElementById('btn-voice').title = 'Tu navegador no soporta reconocimiento de voz';
  document.getElementById('voice-status').textContent = '⚠️ Navegador no soportado';
}
// ========================================
// ENVIAR DENUNCIA
// ========================================
document.getElementById('btn-enviar').addEventListener('click', async () => {
  const categoria = document.getElementById('categoria').value;
  const texto = document.getElementById('texto').value.trim();
  const btn = document.getElementById('btn-enviar');
  if (!texto && !fotoSeleccionada) { alert('Escribí una descripción o adjuntá una foto'); return; }
  btn.disabled = true; btn.textContent = 'Enviando...';
  try {
    const denuncia = {
      categoria: categoria,
      texto: texto,
      vecino: vecinoNombre,
      vecinoEmail: vecinoEmail,
      estado: 'nueva',
      hasImage: false,
      timestamp: firebase.firestore.FieldValue.serverTimestamp()
    };
    // GPS opcional
    try {
      const pos = await new Promise((res, rej) => navigator.geolocation.getCurrentPosition(res, rej, { timeout: 5000 }));
      denuncia.lat = pos.coords.latitude;
      denuncia.lng = pos.coords.longitude;
    } catch (e) { console.warn('Sin GPS'); }
    // Subir foto si hay
    if (fotoSeleccionada) {
      const arr = fotoSeleccionada.split(',');
      const mime = arr[0].match(/:(.*?);/)[1];
      const bstr = atob(arr[1]);
      let n = bstr.length;
      const u8 = new Uint8Array(n);
      while (n--) u8[n] = bstr.charCodeAt(n);
      const blob = new Blob([u8], { type: mime });
      const filename = `denuncias_${clienteId}/${Date.now()}.jpg`;
      const up = await storage.ref(filename).put(blob);
      denuncia.imageUrl = await up.ref.getDownloadURL();
      denuncia.imagePath = filename;
      denuncia.hasImage = true;
    }
    await db.collection(`clientes/${clienteId}/denuncias`).add(denuncia);
    console.log('✅ Denuncia enviada');
    document.getElementById('texto').value = '';
    fotoSeleccionada = null;
    document.getElementById('foto-preview').innerHTML = '';
    alert('✅ Denuncia enviada correctamente');
    cargarMisDenuncias();
  } catch (e) {
    console.error('❌ Error enviando denuncia:', e);
    alert('Error: ' + e.message);
  } finally {
    btn.disabled = false; btn.textContent = 'Enviar Denuncia';
  }
});
// ========================================
// LISTAR MIS DENUNCIAS + CHAT
// ========================================
function cargarMisDenuncias() {
  db.collection(`clientes/${clienteId}/denuncias`)
    .where('vecinoEmail', '==', vecinoEmail)
    .onSnapshot((snap) => {
      const cont = document.getElementById('lista-denuncias');
      const docs = snap.docs.map(d => ({ id: d.id, ...d.data() }))
        .sort((a, b) => (b.timestamp?.toMillis?.() || 0) - (a.timestamp?.toMillis?.() || 0));
      if (docs.length === 0) { cont.innerHTML = '<div class="empty">Sin denuncias aún</div>'; return; }
      cont.innerHTML = '';
      docs.forEach(d => {
        const fecha = d.timestamp?.toDate ? d.timestamp.toDate().toLocaleString('es-AR') : '--';
        const div = document.createElement('div');
        div.className = 'card denuncia-item';
        div.innerHTML = `
          <span class="denuncia-cat">${d.categoria || ''}</span>
          <button onclick="eliminarDenuncia('${d.id}')" title="Eliminar denuncia"
            style="float:right;background:none;border:none;cursor:pointer;font-size:18px;color:#ef4444;">🗑️</button>
          <div class="denuncia-fecha">${fecha}</div>
          ${d.hasImage && d.imageUrl ? `<img src="${d.imageUrl}" style="max-width:100%;border-radius:8px;margin:8px 0;">` : ''}
          <div>${d.texto || ''}</div>
          ${d.categoria === 'panico' && d.estado !== 'cerrada' ? `
            <button class="btn" style="background:#dc2626;color:#fff;margin-top:8px;padding:8px 14px;width:auto;"
              onclick="cerrarMiAlerta('${d.id}')">🔕 Cerrar alerta</button>
          ` : ''}
          <div class="chat-box" id="chat-${d.id}"></div>
          <div class="chat-input-row">
            <input type="text" id="input-${d.id}" placeholder="Responder...">
            <button onclick="enviarChat('${d.id}')">Enviar</button>
          </div>
        `;
        cont.appendChild(div);
        escucharChat(d.id);
      });
    }, (err) => console.error('Error denuncias:', err));
}
function escucharChat(denunciaId) {
  db.collection(`clientes/${clienteId}/denuncias/${denunciaId}/mensajes`)
    .orderBy('timestamp', 'asc')
    .onSnapshot((snap) => {
      const box = document.getElementById('chat-' + denunciaId);
      if (!box) return;
      box.innerHTML = '';
      snap.forEach(doc => {
        const m = doc.data();
        const mine = m.from === 'VECINO';
        const div = document.createElement('div');
        div.className = 'msg ' + (mine ? 'mine' : 'theirs');
        div.textContent = (mine ? '' : '🎛️ ') + (m.text || '');
        box.appendChild(div);
      });
    });
}
async function enviarChat(denunciaId) {
  const input = document.getElementById('input-' + denunciaId);
  const text = input.value.trim();
  if (!text) return;
  await db.collection(`clientes/${clienteId}/denuncias/${denunciaId}/mensajes`).add({
    from: 'VECINO',
    text: text,
    timestamp: firebase.firestore.FieldValue.serverTimestamp()
  });
  input.value = '';
}

// ========================================
// ELIMINAR DENUNCIA (una sola) — espejo del "limpiar chat" de la patrulla
// ========================================
async function eliminarDenuncia(denunciaId) {
  if (!confirm('¿Eliminar esta denuncia? Se borrará la foto y los mensajes asociados.')) return;
  try {
    const ref = db.collection(`clientes/${clienteId}/denuncias`).doc(denunciaId);
    const snap = await ref.get();
    const data = snap.exists ? snap.data() : null;
    // 1) Borrar la foto de Storage si existe
    if (data && data.imagePath) {
      try {
        await storage.ref(data.imagePath).delete();
        console.log(`🗑️ Imagen eliminada: ${data.imagePath}`);
      } catch (err) {
        console.warn(`⚠️ No se pudo eliminar imagen: ${data.imagePath}`, err);
      }
    }
    // 2) Borrar los mensajes del sub-chat de la denuncia
    try {
      const mensajes = await db.collection(`clientes/${clienteId}/denuncias/${denunciaId}/mensajes`).get();
      const batch = db.batch();
      mensajes.forEach((m) => batch.delete(m.ref));
      if (!mensajes.empty) await batch.commit();
      console.log(`🗑️ ${mensajes.size} mensaje(s) eliminado(s)`);
    } catch (err) {
      console.warn('⚠️ No se pudieron eliminar los mensajes:', err);
    }
    // 3) Borrar la denuncia
    await ref.delete();
    console.log(`✅ Denuncia ${denunciaId} eliminada`);
    // La lista se actualiza sola por el onSnapshot de cargarMisDenuncias()
  } catch (e) {
    console.error('❌ Error eliminando denuncia:', e);
    alert('Error eliminando denuncia: ' + e.message);
  }
}

function bloquearApp() {
  const cont = document.querySelector('.container');
  if (cont) {
    cont.innerHTML = `
      <div class="card" style="text-align:center; border-top:4px solid #ef4444;">
        <h2 style="color:#ef4444;">⛔ Suscripción vencida</h2>
        <p style="margin:12px 0; color:#475569;">
          Tu suscripción al servicio de denuncias no está activa para este mes.
        </p>
        <p style="color:#64748b; font-size:14px;">
          Por favor contactá al municipio para regularizar el pago y volver a usar la app.
        </p>
      </div>
    `;
  }
  console.warn('⛔ Vecino no habilitado — app bloqueada');
} 

function logout() {
  if (confirm('¿Cerrar sesión?')) { auth.signOut().then(() => window.location.href = '/login.html'); }
}
// ========================================
// BOTÓN DE PÁNICO / EMERGENCIA
// ========================================
async function enviarPanico() {
  if (!confirm('🚨 ¿Enviar alerta de EMERGENCIA al centro de control? Úsalo solo en caso de urgencia real.')) return;
  const btn = document.getElementById('btn-panico');
  btn.disabled = true;
  btn.textContent = 'Enviando alerta...';
  try {
    const denuncia = {
      categoria: 'panico',
      texto: '🚨 ALERTA DE EMERGENCIA — solicita asistencia inmediata',
      vecino: vecinoNombre,
      vecinoEmail: vecinoEmail,
      estado: 'nueva',
      prioridad: 'urgente',
      emergencia: true,
      leida: false,
      hasImage: false,
      timestamp: firebase.firestore.FieldValue.serverTimestamp()
    };
    // GPS (importante en emergencia): intentamos una lectura fresca de máxima
    // precisión, pero si tarda o falla, usamos la última ubicación ya conocida
    // (la que viene actualizando iniciarTrackingUbicacion en background) en vez
    // de enviar el pánico sin coordenadas.
    try {
      const pos = await new Promise((res, rej) => navigator.geolocation.getCurrentPosition(res, rej, { timeout: 8000, enableHighAccuracy: true }));
      if (!esUbicacionInvalida(pos.coords.latitude, pos.coords.longitude)) {
        denuncia.lat = pos.coords.latitude;
        denuncia.lng = pos.coords.longitude;
      } else {
        console.warn('⚠️ GPS fresco devolvió una ubicación inválida (0,0), la descarto');
      }
    } catch (e) {
      console.warn('Sin GPS fresco en emergencia, uso la última ubicación conocida:', e.message);
    }
    // Si el GPS fresco no dio una ubicación válida, recurrimos a la última conocida
    if (denuncia.lat == null && miUltimaUbicacion && !esUbicacionInvalida(miUltimaUbicacion.lat, miUltimaUbicacion.lng)) {
      denuncia.lat = miUltimaUbicacion.lat;
      denuncia.lng = miUltimaUbicacion.lng;
    }
    if (denuncia.lat == null) {
      console.warn('⚠️ No hay ninguna ubicación válida conocida: el pánico se enviará sin GPS');
    }
    await db.collection(`clientes/${clienteId}/denuncias`).add(denuncia);
    console.log('🚨 Alerta de emergencia enviada');
    alert('🚨 Alerta enviada. El centro de control fue notificado.');
    cargarMisDenuncias();
  } catch (e) {
    console.error('❌ Error enviando alerta:', e);
    alert('Error enviando alerta: ' + e.message);
  } finally {
    btn.disabled = false;
    btn.textContent = '🚨 EMERGENCIA';
  }
}

// ========================================
// BANNER: "Instalá la app para recibir alertas"
// ========================================
function mostrarBannerInstalacion() {
  const cont = document.getElementById('banner-instalar-container');
  if (!cont) return;

  const yaInstalada =
    window.matchMedia('(display-mode: standalone)').matches ||
    window.navigator.standalone === true; // Safari iOS

  if (yaInstalada) return; // ya la tiene instalada, no molestar

  if (localStorage.getItem('banner_instalar_cerrado') === '1') return;

  const ua = navigator.userAgent;
  const esIOS = /iPad|iPhone|iPod/.test(ua) && !window.MSStream;
  const esAndroid = /Android/.test(ua);

  let mensaje;
  if (esIOS) {
    mensaje = `
      <strong>📲 Instalá la app para recibir alertas</strong>
      Sin instalarla no vas a recibir notificaciones. Abrí esta página en <b>Safari</b>,
      tocá el botón compartir <code>⬆️</code> y elegí <b>"Agregar a inicio"</b>.
    `;
  } else if (esAndroid) {
    mensaje = `
      <strong>📲 Instalá la app para recibir alertas</strong>
      Tocá el menú <code>⋮</code> de Chrome y elegí <b>"Instalar app"</b> o
      <b>"Agregar a pantalla de inicio"</b>. Así vas a recibir avisos aunque tengas el celular bloqueado.
    `;
  } else {
    mensaje = `
      <strong>📲 Instalá la app para recibir alertas</strong>
      Buscá la opción "Instalar" o "Agregar a pantalla de inicio" en el menú de tu navegador.
    `;
  }

  cont.innerHTML = `
    <div class="banner-instalar">
      <button class="cerrar-banner" onclick="cerrarBannerInstalacion()">✕</button>
      ${mensaje}
    </div>
  `;
}

function cerrarBannerInstalacion() {
  localStorage.setItem('banner_instalar_cerrado', '1');
  const cont = document.getElementById('banner-instalar-container');
  if (cont) cont.innerHTML = '';
}

// ========================================
// TRACKING DE UBICACIÓN (para poder recibir alertas de vecinos cercanos)
// ========================================
function esUbicacionInvalida(lat, lng) {
  // (0,0) es el caso más común de valor "basura"; también protegemos contra
  // null/undefined/NaN o coordenadas fuera del rango físicamente posible.
  if (lat == null || lng == null) return true;
  if (Number.isNaN(lat) || Number.isNaN(lng)) return true;
  if (lat === 0 && lng === 0) return true;
  if (Math.abs(lat) > 90 || Math.abs(lng) > 180) return true;
  return false;
}

function iniciarTrackingUbicacion() {
  if (!navigator.geolocation) {
    console.warn('⚠️ Geolocalización no disponible en este navegador');
    return;
  }

  let ultimoGuardado = 0;
  const INTERVALO_MIN_MS = 30000; // no escribir en Firestore más seguido que cada 30s

  watchIdUbicacion = navigator.geolocation.watchPosition(async (pos) => {
    // (0,0) nunca es una ubicación real de un vecino (cae en el Atlántico,
    // frente a África) — es el valor que a veces devuelve el navegador cuando
    // algo falla silenciosamente. Lo descartamos para no ensuciar los datos.
    if (esUbicacionInvalida(pos.coords.latitude, pos.coords.longitude)) {
      console.warn('⚠️ Ubicación (0,0) descartada, no se guarda');
      return;
    }

    miUltimaUbicacion = { lat: pos.coords.latitude, lng: pos.coords.longitude };
    renderizarAlertasCercanas(); // reevaluar la lista ya con la ubicación disponible

    const ahora = Date.now();
    if (ahora - ultimoGuardado < INTERVALO_MIN_MS) return;
    ultimoGuardado = ahora;

    try {
      const user = auth.currentUser;
      if (!user) return;
      await db.collection(`clientes/${clienteId}/vecinos`).doc(user.uid).set({
        lat: miUltimaUbicacion.lat,
        lng: miUltimaUbicacion.lng,
        ubicacion_actualizada_en: firebase.firestore.FieldValue.serverTimestamp()
      }, { merge: true });
    } catch (e) {
      console.warn('⚠️ No se pudo guardar la ubicación:', e.message);
    }
  }, (err) => {
    console.warn('⚠️ Error obteniendo ubicación en segundo plano:', err.message);
  }, { enableHighAccuracy: true, maximumAge: 15000, timeout: 10000 });
}

// ========================================
// NOTIFICACIONES PUSH (Firebase Cloud Messaging)
// ========================================
async function configurarNotificaciones() {
  if (!messaging) return;
  try {
    const permiso = await Notification.requestPermission();
    if (permiso !== 'granted') {
      console.warn('⚠️ Permiso de notificaciones no otorgado por el usuario');
      return;
    }

    // IMPORTANTE: hay que vincular explícitamente el token al Service Worker
    // real de la app (sw.js). Sin esto, el token puede quedar generado
    // "desconectado" del sw.js que efectivamente escucha onBackgroundMessage,
    // y entonces las notificaciones nunca se muestran con la app cerrada.
    if ('serviceWorker' in navigator) {
      const registration = await navigator.serviceWorker.ready;
      messaging.useServiceWorker(registration);
    } else {
      console.warn('⚠️ Este navegador no soporta Service Workers, no se pueden recibir push en segundo plano');
    }

    const token = await messaging.getToken({ vapidKey: VAPID_KEY });
    if (!token) {
      console.warn('⚠️ No se pudo obtener el token de notificaciones');
      return;
    }

    const user = auth.currentUser;
    if (!user) return;

    await db.collection(`clientes/${clienteId}/vecinos`).doc(user.uid).set({
      fcm_token: token
    }, { merge: true });
    console.log('✅ Token de notificaciones guardado');

    // Notificación recibida con la app abierta en primer plano
    messaging.onMessage((payload) => {
      console.log('📩 Notificación en primer plano:', payload);
      if (payload.data && payload.data.title) {
        alert(`${payload.data.title}\n${payload.data.body || ''}`);
      }
      cargarAlertasCercanas();
    });
  } catch (e) {
    console.error('❌ Error configurando notificaciones push:', e);
  }
}

// ========================================
// ALERTAS CERCANAS (pánicos de otros vecinos a menos de 300m)
// ========================================
function distanciaMetros(lat1, lng1, lat2, lng2) {
  const R = 6371000;
  const toRad = (d) => d * Math.PI / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

let ultimosPanicosActivos = []; // caché de los pánicos activos recibidos por Firestore

function cargarAlertasCercanas() {
  db.collection(`clientes/${clienteId}/denuncias`)
    .where('categoria', '==', 'panico')
    .onSnapshot((snap) => {
      ultimosPanicosActivos = snap.docs
        .map(d => ({ id: d.id, ...d.data() }))
        .filter(d => d.estado !== 'cerrada' && d.vecinoEmail !== vecinoEmail); // no mostrar la mía propia acá

      renderizarAlertasCercanas();
    }, (err) => console.error('Error cargando alertas cercanas:', err));
}

function renderizarAlertasCercanas() {
  const cont = document.getElementById('lista-alertas-cercanas');
  if (!cont) return;

  if (!miUltimaUbicacion) {
    cont.innerHTML = '<div class="empty">Obteniendo tu ubicación para buscar alertas cercanas...</div>';
    return;
  }

  const cercanas = ultimosPanicosActivos.filter(d => {
    if (d.lat == null || d.lng == null) return false;
    return distanciaMetros(miUltimaUbicacion.lat, miUltimaUbicacion.lng, d.lat, d.lng) <= RADIO_ALERTA_METROS;
  });

  if (cercanas.length === 0) {
    cont.innerHTML = '<div class="empty">Sin alertas activas cerca tuyo</div>';
    return;
  }

  cont.innerHTML = '';
  cercanas.forEach(d => {
    const fecha = d.timestamp?.toDate ? d.timestamp.toDate().toLocaleString('es-AR') : '--';
    const dist = Math.round(distanciaMetros(miUltimaUbicacion.lat, miUltimaUbicacion.lng, d.lat, d.lng));
    const div = document.createElement('div');
    div.id = `alerta-cercana-${d.id}`;
    div.className = 'card denuncia-item panico-cercano';
    div.innerHTML = `
      <span class="denuncia-cat">🚨 EMERGENCIA</span>
      <div class="denuncia-fecha">${fecha} · a ${dist}m de vos</div>
      <div><strong>${d.vecino || 'Vecino'}</strong> activó una alerta</div>
      <div class="chat-box" id="chat-alerta-${d.id}"></div>
      <div class="chat-input-row">
        <input type="text" id="input-alerta-${d.id}" placeholder="Escribirle...">
        <button onclick="enviarChatAlerta('${d.id}')">Enviar</button>
      </div>
    `;
    cont.appendChild(div);
    escucharChatAlerta(d.id);
  });

  irAAlertaPendienteSiCorresponde();
}

// ========================================
// NAVEGACIÓN DIRECTA DESDE LA NOTIFICACIÓN PUSH
// ========================================
let alertaPendienteDeNotificacion = null;

function irAAlertaPendienteSiCorresponde() {
  if (!alertaPendienteDeNotificacion) return;
  const el = document.getElementById('alerta-cercana-' + alertaPendienteDeNotificacion);
  if (!el) return; // todavía no está en la lista (puede tardar un instante en llegar por Firestore)

  el.scrollIntoView({ behavior: 'smooth', block: 'center' });
  el.style.outline = '3px solid #dc2626';
  setTimeout(() => { el.style.outline = ''; }, 4000);
  alertaPendienteDeNotificacion = null; // ya la resolvimos, no volver a saltar
}

// Si la app se abrió directo desde la notificación (?panico=ID en la URL)
(function leerAlertaDesdeURL() {
  const params = new URLSearchParams(window.location.search);
  const id = params.get('panico');
  if (id) alertaPendienteDeNotificacion = id;
})();

// Si la app ya estaba abierta, el Service Worker nos avisa por mensaje
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.addEventListener('message', (event) => {
    if (event.data && event.data.tipo === 'ir_a_alerta' && event.data.denunciaId) {
      alertaPendienteDeNotificacion = event.data.denunciaId;
      irAAlertaPendienteSiCorresponde(); // por si la lista ya estaba renderizada
    }
  });
}

function escucharChatAlerta(denunciaId) {
  db.collection(`clientes/${clienteId}/denuncias/${denunciaId}/mensajes`)
    .orderBy('timestamp', 'asc')
    .onSnapshot((snap) => {
      const box = document.getElementById('chat-alerta-' + denunciaId);
      if (!box) return;
      box.innerHTML = '';
      snap.forEach(doc => {
        const m = doc.data();
        const mine = m.autor_uid === auth.currentUser?.uid;
        const div = document.createElement('div');
        div.className = 'msg ' + (mine ? 'mine' : 'theirs');
        const nombre = mine ? '' : `${m.autor_nombre || 'Vecino'}: `;
        div.textContent = nombre + (m.text || '');
        box.appendChild(div);
      });
    });
}

async function enviarChatAlerta(denunciaId) {
  const input = document.getElementById('input-alerta-' + denunciaId);
  const text = input.value.trim();
  if (!text) return;
  const user = auth.currentUser;
  if (!user) return;
  await db.collection(`clientes/${clienteId}/denuncias/${denunciaId}/mensajes`).add({
    from: 'VECINO',
    autor_uid: user.uid,
    autor_nombre: vecinoNombre,
    text: text,
    timestamp: firebase.firestore.FieldValue.serverTimestamp()
  });
  input.value = '';
}

async function cerrarMiAlerta(denunciaId) {
  if (!confirm('¿Cerrar esta alerta de emergencia?')) return;
  try {
    await db.collection(`clientes/${clienteId}/denuncias`).doc(denunciaId).update({
      estado: 'cerrada',
      cerrado_por: 'vecino',
      cerrado_en: firebase.firestore.FieldValue.serverTimestamp()
    });
    console.log('✅ Alerta cerrada por el vecino');
  } catch (e) {
    console.error('❌ Error cerrando alerta:', e);
    alert('Error cerrando la alerta: ' + e.message);
  }
}
