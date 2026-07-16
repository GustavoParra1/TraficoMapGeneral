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
      console.log(`📊 ${todasLasDenuncias.length} denuncias`);
      renderDenuncias();
      chequearPanicos();
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
  // Contar SIN LEER (Opción A: solo las que tienen leida === false explícito)
  const sinLeer = todasLasDenuncias.filter(d => d.leida === false).length;
  const cont2 = document.getElementById('contador');
  cont2.textContent = `${lista.length} denuncia(s)` + (sinLeer > 0 ? ` · 🔴 ${sinLeer} sin leer` : '');
  if (lista.length === 0) {
    cont.innerHTML = '<div class="empty">Sin denuncias</div>';
    return;
  }
  cont.innerHTML = '';
  lista.forEach(d => {
    const fecha = d.timestamp?.toDate ? d.timestamp.toDate().toLocaleString('es-AR') : '--';
    const esPanico = d.emergencia === true || d.categoria === 'panico';
    const panicoActivo = esPanico && d.estado !== 'cerrada';
    const sinLeer = d.leida === false;
    const div = document.createElement('div');
    div.className = 'denuncia' + (esPanico ? ' panico' : '') + (sinLeer ? ' sin-leer' : '');
    div.innerHTML = `
      <div class="denuncia-head">
        <span class="cat">${esPanico ? '🚨 EMERGENCIA' : (d.categoria || 'sin categoría')}</span>
        ${sinLeer ? '<span class="badge-nuevo">NUEVA</span>' : ''}
        ${esPanico && !panicoActivo ? '<span class="badge-nuevo" style="background:#64748b;">CERRADA</span>' : ''}
        <span class="fecha">${fecha}</span>
        <button class="btn-borrar" onclick="borrarDenuncia('${d.id}')">🗑️ Borrar</button>
      </div>
      <div class="vecino-info">👤 <b>${d.vecino || 'Anónimo'}</b> · ${d.vecinoEmail || ''}</div>
      ${d.hasImage && d.imageUrl ? `<img src="${d.imageUrl}" class="foto" onclick="window.open('${d.imageUrl}','_blank')">` : ''}
      <div class="texto">${d.texto || ''}</div>
      ${d.lat && d.lng ? `<div class="vecino-info">📍 ${d.lat.toFixed(5)}, ${d.lng.toFixed(5)}</div>` : ''}
      ${esPanico && d.notificados ? `<div class="vecino-info">📡 ${d.notificados.length} vecino(s) notificado(s) en el radio</div>` : ''}
      ${sinLeer ? `<button class="btn-leida" onclick="marcarLeida('${d.id}')">✓ Marcar como leída</button>` : ''}
      ${panicoActivo ? `<button class="btn-leida" style="background:#dc2626;" onclick="cerrarAlertaAdmin('${d.id}')">🔕 Cerrar alerta</button>` : ''}
      <div class="chat-box" id="chat-${d.id}"></div>
      <div class="chat-input-row">
        <input type="text" id="input-${d.id}" placeholder="Responder al vecino...">
        <button onclick="responder('${d.id}')">Enviar</button>
      </div>
    `;
    cont.appendChild(div);
    escucharChat(d.id);
  });
  // Si venimos con #denuncia-XXX desde el mapa, saltar y resaltar
  if (location.hash.startsWith('#denuncia-')) {
    const id = location.hash.replace('#denuncia-', '');
    const target = document.getElementById('chat-' + id)?.closest('.denuncia');
    if (target) {
      target.scrollIntoView({ behavior: 'smooth', block: 'center' });
      target.style.outline = '3px solid #dc2626';
      setTimeout(() => { target.style.outline = ''; }, 4000);
    }
  }
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
        const etiqueta = mine ? '🎛️ ' : (m.autor_nombre ? `👤 ${m.autor_nombre}: ` : '👤 ');
        div.textContent = etiqueta + (m.text || '');
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
// ========================================
// BORRAR DENUNCIA INDIVIDUAL (incluye subcolección mensajes)
// ========================================
async function borrarDenuncia(denunciaId) {
  if (!confirm('¿Borrar esta denuncia de forma permanente? Esta acción no se puede deshacer.')) return;
  try {
    // 1) Borrar subcolección de mensajes
    const msgsRef = db.collection(`clientes/${clienteId}/denuncias/${denunciaId}/mensajes`);
    const msgsSnap = await msgsRef.get();
    const batch = db.batch();
    msgsSnap.forEach(doc => batch.delete(doc.ref));
    await batch.commit();
    // 2) Borrar el documento de la denuncia
    await db.collection(`clientes/${clienteId}/denuncias`).doc(denunciaId).delete();
    console.log(`🗑️ Denuncia ${denunciaId} borrada`);
  } catch (e) {
    console.error('❌ Error borrando denuncia:', e);
    alert('Error borrando denuncia: ' + (e.message || e));
  }
}
// ========================================
// BORRAR DENUNCIAS POR RANGO DE FECHAS
// ========================================
async function borrarPorRango() {
  const desdeVal = document.getElementById('fecha-desde').value;
  const hastaVal = document.getElementById('fecha-hasta').value;
  if (!desdeVal || !hastaVal) {
    alert('Selecciona ambas fechas (desde y hasta).');
    return;
  }
  const desde = new Date(desdeVal + 'T00:00:00');
  const hasta = new Date(hastaVal + 'T23:59:59');
  // Filtrar de las denuncias ya cargadas en memoria
  const objetivo = todasLasDenuncias.filter(d => {
    const t = d.timestamp?.toDate ? d.timestamp.toDate() : null;
    return t && t >= desde && t <= hasta;
  });
  if (objetivo.length === 0) {
    alert('No hay denuncias en ese rango de fechas.');
    return;
  }
  if (!confirm(`¿Borrar ${objetivo.length} denuncia(s) entre ${desdeVal} y ${hastaVal}? Esta acción no se puede deshacer.`)) return;
  try {
    for (const d of objetivo) {
      // Borrar mensajes de cada denuncia
      const msgsSnap = await db.collection(`clientes/${clienteId}/denuncias/${d.id}/mensajes`).get();
      const batch = db.batch();
      msgsSnap.forEach(doc => batch.delete(doc.ref));
      batch.delete(db.collection(`clientes/${clienteId}/denuncias`).doc(d.id));
      await batch.commit();
    }
    console.log(`🗑️ ${objetivo.length} denuncias borradas`);
    alert(`✅ ${objetivo.length} denuncia(s) borrada(s).`);
  } catch (e) {
    console.error('❌ Error en borrado por rango:', e);
    alert('Error borrando: ' + (e.message || e));
  }
}
// ========================================
// MARCAR DENUNCIA COMO LEÍDA
// ========================================
async function marcarLeida(denunciaId) {
  try {
    await db.collection(`clientes/${clienteId}/denuncias`).doc(denunciaId).update({ leida: true });
    console.log(`✓ Denuncia ${denunciaId} marcada como leída`);
  } catch (e) {
    console.error('❌ Error marcando leída:', e);
  }
}

// ========================================
// CERRAR ALERTA DE PÁNICO (desde el panel admin)
// ========================================
async function cerrarAlertaAdmin(denunciaId) {
  if (!confirm('¿Cerrar esta alerta de emergencia? Los vecinos notificados dejarán de verla como activa.')) return;
  try {
    await db.collection(`clientes/${clienteId}/denuncias`).doc(denunciaId).update({
      estado: 'cerrada',
      cerrado_por: 'admin',
      cerrado_en: firebase.firestore.FieldValue.serverTimestamp()
    });
    console.log(`✅ Alerta ${denunciaId} cerrada por el admin`);
  } catch (e) {
    console.error('❌ Error cerrando alerta:', e);
    alert('Error cerrando la alerta: ' + (e.message || e));
  }
}
// ========================================
// ALERTA SONORA PARA EMERGENCIAS NUEVAS
// ========================================
let panicosVistos = new Set();
function chequearPanicos() {
  const panicosSinLeer = todasLasDenuncias.filter(d =>
    (d.emergencia === true || d.categoria === 'panico') && d.leida === false
  );
  panicosSinLeer.forEach(p => {
    if (!panicosVistos.has(p.id)) {
      panicosVistos.add(p.id);
      sonarAlerta();
    }
  });
}
function sonarAlerta() {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain); gain.connect(ctx.destination);
    osc.type = 'square';
    osc.frequency.value = 880;
    gain.gain.value = 0.2;
    osc.start();
    setTimeout(() => { osc.frequency.value = 440; }, 250);
    setTimeout(() => { osc.stop(); ctx.close(); }, 600);
  } catch (e) { console.warn('No se pudo reproducir alerta sonora'); }
}
