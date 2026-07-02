// ========================================
// VECINO APP - Denuncias
// ========================================
let db = null, auth = null, storage = null;
let municipio = null, clienteId = null;
let vecinoNombre = '', vecinoEmail = '';
let fotoSeleccionada = null;

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
    // GPS (importante en emergencia)
    try {
      const pos = await new Promise((res, rej) => navigator.geolocation.getCurrentPosition(res, rej, { timeout: 8000, enableHighAccuracy: true }));
      denuncia.lat = pos.coords.latitude;
      denuncia.lng = pos.coords.longitude;
    } catch (e) { console.warn('Sin GPS en emergencia'); }
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