// ========================================
// VECINO APP - Denuncias
// ========================================
let db = null, auth = null, storage = null;
let municipio = null, clienteId = null;
let vecinoNombre = '', vecinoEmail = '';
let fotoSeleccionada = null;
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