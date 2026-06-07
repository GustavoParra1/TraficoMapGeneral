// ========================================
// DENUNCIAS - Panel de Control (operario/admin)
// ========================================
let db = null, auth = null;
let clienteId = null;
let todasLasDenuncias = [];
async function initFirebase() {
  try {
    const response = await fetch('../config.json');
    const config = await response.json();
    if (!firebase.apps.length) firebase.initializeApp(config.firebase);
    db = firebase.firestore();
    auth = firebase.auth();
    console.log('✅ Firebase initialized (denuncias)');
    // 1) Intentar obtener clienteId desde la URL (?cliente=laplata)
    const params = new URLSearchParams(window.location.search);
    const clienteUrl = params.get('cliente');
    auth.onAuthStateChanged(async (user) => {
      if (clienteUrl) {
        clienteId = clienteUrl;
        console.log(`🏢 clienteId desde URL: ${clienteId}`);
        iniciar();
        return;
      }
      // 2) Fallback: claim cliente_id del usuario logueado
      if (user) {
        const t = await user.getIdTokenResult(true);
        clienteId = t.claims.cliente_id || t.claims.city;
        console.log(`🏢 clienteId desde claims: ${clienteId}`);
        iniciar();
      } else {
        document.getElementById('lista').innerHTML = '<div class="empty">Debes iniciar sesión o indicar ?cliente=ID en la URL.</div>';
      }
    });
  } catch (e) {
    console.error('❌ Firebase error:', e);
  }
}
initFirebase();
function iniciar() {
  if (!clienteId) {
    document.getElementById('lista').innerHTML = '<div class="empty">No se pudo identificar el cliente.</div>';
    return;
  }
  document.getElementById('ciudad-label').textContent = `(${clienteId})`;
  escucharDenuncias();
}
// ========================================
// ESCUCHAR DENUNCIAS EN TIEMPO REAL
// ========================================
function escucharDenuncias() {
  db.collection(`clientes/${clienteId}/denuncias`)
    .onSnapshot((snap) => {
      todasLasDenuncias = snap.docs.map(d => ({ id: d.id, ...d.data() }))
        .sort((a, b) => (b.timestamp?.toMillis?.() || 0) - (a.timestamp?.toMillis?.() || 0));
      console.log(`📊 ${todasLasDenuncias.length} denuncias`);
      renderDenuncias();
    }, (err) => {
      console.error('Error denuncias:', err);
      document.getElementById('lista').innerHTML = '<div class="empty">Error cargando denuncias.</div>';
    });
}
// ========================================
// RENDERIZAR LISTA
// ========================================
function renderDenuncias() {
  const cont = document.getElementById('lista');
  const filtro = document.getElementById('filtro-categoria').value;
  const lista = filtro ? todasLasDenuncias.filter(d => d.categoria === filtro) : todasLasDenuncias;
  document.getElementById('contador').textContent = `${lista.length} denuncia(s)`;
  if (lista.length === 0) {
    cont.innerHTML = '<div class="empty">Sin denuncias</div>';
    return;
  }
  cont.innerHTML = '';
  lista.forEach(d => {
    const fecha = d.timestamp?.toDate ? d.timestamp.toDate().toLocaleString('es-AR') : '--';
    const div = document.createElement('div');
    div.className = 'denuncia';
    div.innerHTML = `
      <div class="denuncia-head">
        <span class="cat">${d.categoria || 'sin categoría'}</span>
        <span class="fecha">${fecha}</span>
      </div>
      <div class="vecino-info">👤 <b>${d.vecino || 'Anónimo'}</b> · ${d.vecinoEmail || ''}</div>
      ${d.hasImage && d.imageUrl ? `<img src="${d.imageUrl}" class="foto" onclick="window.open('${d.imageUrl}','_blank')">` : ''}
      <div class="texto">${d.texto || ''}</div>
      ${d.lat && d.lng ? `<div class="vecino-info">📍 ${d.lat.toFixed(5)}, ${d.lng.toFixed(5)}</div>` : ''}
      <div class="chat-box" id="chat-${d.id}"></div>
      <div class="chat-input-row">
        <input type="text" id="input-${d.id}" placeholder="Responder al vecino...">
        <button onclick="responder('${d.id}')">Enviar</button>
      </div>
    `;
    cont.appendChild(div);
    escucharChat(d.id);
  });
}
// ========================================
// CHAT POR DENUNCIA
// ========================================
function escucharChat(denunciaId) {
  db.collection(`clientes/${clienteId}/denuncias/${denunciaId}/mensajes`)
    .orderBy('timestamp', 'asc')
    .onSnapshot((snap) => {
      const box = document.getElementById('chat-' + denunciaId);
      if (!box) return;
      box.innerHTML = '';
      snap.forEach(doc => {
        const m = doc.data();
        const mine = m.from === 'CONTROL';
        const div = document.createElement('div');
        div.className = 'msg ' + (mine ? 'mine' : 'theirs');
        div.textContent = (mine ? '🎛️ ' : '👤 ') + (m.text || '');
        box.appendChild(div);
      });
    });
}
async function responder(denunciaId) {
  const input = document.getElementById('input-' + denunciaId);
  const text = input.value.trim();
  if (!text) return;
  await db.collection(`clientes/${clienteId}/denuncias/${denunciaId}/mensajes`).add({
    from: 'CONTROL',
    text: text,
    timestamp: firebase.firestore.FieldValue.serverTimestamp()
  });
  input.value = '';
}
function logout() {
  if (auth && auth.currentUser) {
    auth.signOut().finally(() => window.location.href = '/login.html');
  } else {
    window.close();
  }
}