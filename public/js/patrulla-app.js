// ========================================
// FIREBASE CONFIG
// ========================================
let firebaseConfig = null;
let db = null;
let auth = null;
let fotoSeleccionada = null; // Para almacenar foto en base64

async function initializeFirebase() {
  try {
    const response = await fetch('../config.json');
    const config = await response.json();
    firebaseConfig = config.firebase;

    if (!firebase.apps.length) {
      firebase.initializeApp(firebaseConfig);
    }

    db = firebase.firestore();
    auth = firebase.auth();

    console.log('✅ Firebase initialized');

    auth.onAuthStateChanged(async (user) => {
      if (!user) {
        console.warn('🛑 No autenticado');
        setTimeout(() => {
          window.location.href = '/login.html';
        }, 2000);
        return;
      }

      console.log('✅ Usuario autenticado:', user.email);

      let userCity = null;
      let userEmail = user.email || '';
      for (let i = 0; i < 5; i++) {
        const idTokenResult = await user.getIdTokenResult(true);
        userCity = idTokenResult.claims.city;
        if (userCity) break;
        await new Promise(res => setTimeout(res, 700));
      }

      if (userCity) {
        municipio = userCity;
        console.log(`📍 Ciudad: ${municipio}`);
      } else {
        alert('No se encontró la ciudad asignada.');
        window.location.href = '/login.html';
        return;
      }

      const patrullaMatch = userEmail.match(/^patrulla_([a-zA-Z0-9]+)@seguridad\.com$/);
      if (patrullaMatch) {
        patrullaId = `patrulla_${patrullaMatch[1]}`;
        localStorage.setItem('patrullaId', patrullaId);
        setTimeout(() => {
          document.getElementById('patrulla-id').textContent = `📱 ${patrullaId}`;
          const modal = document.getElementById('modal');
          if (modal) modal.classList.remove('active');
        }, 500);
      }

      window.authReady = true;
      window.dispatchEvent(new Event('authReady'));
    });
  } catch (error) {
    console.error('❌ Firebase error:', error);
  }
}

initializeFirebase();

// ========================================
// VARIABLES
// ========================================
let map = null;
let patrullaId = null;
let municipio = null;
let myMarker = null;
let emergencia = false;
let ubicacionInterval = null;
let isInitialized = false;

const CITY_COORDS = {
  'laplata': [-34.9205, -57.9549],
  'mardelplata': [-38.0, -57.55],
  'cordoba': [-31.4201, -64.1888],
  'constitucion': [-35.2822, -57.4447],
  'mendoza': [-32.8892, -68.8455],
};

// ========================================
// INICIALIZAR MAPA
// ========================================
function initMap() {
  if (map) return;
  
  const coords = CITY_COORDS[municipio] || [-34.92, -57.95];
  map = L.map('map').setView(coords, 15);

  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '© OpenStreetMap',
    maxZoom: 19
  }).addTo(map);

  console.log('✅ Mapa inicializado');
}

// ========================================
// INICIAR UBICACIÓN
// ========================================
function startTracking() {
  if (!navigator.geolocation) {
    alert('Geolocalización no soportada');
    return;
  }

  ubicacionInterval = navigator.geolocation.watchPosition(
    (position) => {
      const { latitude, longitude, speed = 0 } = position.coords;

      document.getElementById('lat').textContent = latitude.toFixed(4);
      document.getElementById('lng').textContent = longitude.toFixed(4);
      document.getElementById('speed').textContent = Math.round(speed * 3.6);

      const sanitizedPatrullaId = patrullaId.toUpperCase().replace(/[^A-Z0-9_]/g, '');
      const patrullaDocId = `PATRULLA_${sanitizedPatrullaId}`;
      
      // Intentar guardar en estructura anidada primero
      db.collection(`clientes/${municipio}/patrullas`).doc(patrullaDocId).update({
        lat: latitude,
        lng: longitude,
        online: true,
        speed: speed,
        timestamp: firebase.firestore.FieldValue.serverTimestamp()
      }).catch(() => {
        // Si no existe en anidada, intentar colección global
        db.collection(`patrullas_${municipio}`).doc(patrullaDocId).update({
          lat: latitude,
          lng: longitude,
          online: true,
          speed: speed,
          timestamp: firebase.firestore.FieldValue.serverTimestamp()
        }).catch(e => console.warn('⚠️ Error:', e));
      });

      if (myMarker) {
        myMarker.setLatLng([latitude, longitude]);
      } else {
        myMarker = L.marker([latitude, longitude], { title: patrullaId }).addTo(map);
      }

      map.setView([latitude, longitude], 15);
    },
    (error) => {
      console.error('❌ GPS error:', error);
      alert('⚠️ Error de GPS. Verifica permisos.');
    },
    { enableHighAccuracy: true, maximumAge: 0, timeout: 10000 }
  );
}

// ========================================
// ESCUCHAR MENSAJES
// ========================================
function listenToMessages() {
  const coleccion = `chat_${municipio}`;

  db.collection(coleccion)
    .orderBy('timestamp', 'desc')
    .onSnapshot(() => {
      renderMessages();
    }, (error) => {
      console.warn('⚠️ Error:', error);
    });
}

// ========================================
// RENDERIZAR MENSAJES
// ========================================
async function renderMessages() {
  const container = document.getElementById('messages-container');
  const coleccion = `chat_${municipio}`;
  
  try {
    const snapshot = await db.collection(coleccion)
      .orderBy('timestamp', 'asc')
      .get();

    let messages = [];
    const patrullaIdNorm = (patrullaId || '').toUpperCase();

    snapshot.forEach((doc) => {
      const data = doc.data();
      const fromNorm = (data.from || '').toUpperCase();
      const toNorm = (data.to || '').toUpperCase();
      
      const isFromPatrulla = fromNorm === patrullaIdNorm || fromNorm.includes(patrullaIdNorm);
      const isCentroToPatrulla = fromNorm === 'CENTRO_CONTROL' && (toNorm === patrullaIdNorm || toNorm.includes(patrullaIdNorm));
      const isBroadcast = data.type === 'broadcast';

      if (isFromPatrulla || isCentroToPatrulla || isBroadcast) {
        messages.push({
          id: doc.id,
          ...data,
          timestamp: data.timestamp?.toDate(),
        });
      }
    });

    if (messages.length === 0) {
      container.innerHTML = '<div class="empty-messages">Sin mensajes</div>';
      return;
    }

    container.innerHTML = '';

    messages.forEach((msg) => {
      const isOutgoing = msg.from === patrullaId || (msg.from || '').toUpperCase().includes(patrullaIdNorm);
      const isBroadcast = msg.type === 'broadcast';

      const div = document.createElement('div');
      div.className = `message ${isBroadcast ? 'broadcast' : (isOutgoing ? 'outgoing' : 'incoming')}`;

      const timeStr = msg.timestamp
        ? msg.timestamp.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })
        : '--:--';

      let fromText = msg.from === 'CENTRO_CONTROL' ? '🎛️ Centro' : msg.from;
      if (isBroadcast) fromText = '📢 BROADCAST';

      let contentHTML = '';
      
      if (msg.hasImage && msg.image) {
        contentHTML += `<img src="${msg.image}" alt="Foto" class="message-image">`;
      }
      
      if (msg.text) {
        contentHTML += `<div class="message-content">${msg.text}</div>`;
      }

      div.innerHTML = `
        ${contentHTML}
        <div class="message-meta">${fromText} · ${timeStr}</div>
      `;

      container.appendChild(div);
    });

    container.scrollTop = container.scrollHeight;
  } catch (error) {
    console.error('Error:', error);
  }
}

// ========================================
// ENVIAR MENSAJE
// ========================================
async function enviarMensaje() {
  const input = document.getElementById('message-input');
  const btn = document.getElementById('btn-send');
  const texto = input.value.trim();

  if (!texto && !fotoSeleccionada) return;

  try {
    btn.classList.add('sending');
    const coleccion = `chat_${municipio}`;
    
    const mensajeData = {
      from: patrullaId,
      to: 'CENTRO_CONTROL',
      timestamp: firebase.firestore.FieldValue.serverTimestamp(),
      read: false
    };

    if (texto) {
      mensajeData.text = texto;
    }

    if (fotoSeleccionada) {
      mensajeData.image = fotoSeleccionada;
      mensajeData.hasImage = true;
    }

    await db.collection(coleccion).add(mensajeData);
    
    input.value = '';
    fotoSeleccionada = null;
    document.getElementById('file-input').value = '';
    
    setTimeout(() => btn.classList.remove('sending'), 600);
    renderMessages();
  } catch (error) {
    console.error('❌ Error:', error);
    btn.classList.remove('sending');
  }
}

// ========================================
// EMERGENCIA
// ========================================
async function toggleEmergencia() {
  try {
    emergencia = !emergencia;
    const sanitizedPatrullaId = patrullaId.toUpperCase().replace(/[^A-Z0-9_]/g, '');
    const patrullaDocId = `PATRULLA_${sanitizedPatrullaId}`;
    
    // Intentar actualizar en estructura anidada
    const ref = db.collection(`clientes/${municipio}/patrullas`).doc(patrullaDocId);
    const docSnap = await ref.get();
    
    if (!docSnap.exists) {
      // Si no existe, crear
      await ref.set({
        emergencia: emergencia,
        online: true,
        createdAt: firebase.firestore.FieldValue.serverTimestamp(),
      });
    } else {
      await ref.update({ emergencia: emergencia });
    }

    updateStatus();
  } catch (error) {
    console.error('Error:', error);
  }
}

// ========================================
// ACTUALIZAR STATUS
// ========================================
async function updateStatus() {
  try {
    const sanitizedPatrullaId = patrullaId.toUpperCase().replace(/[^A-Z0-9_]/g, '');
    const patrullaDocId = `PATRULLA_${sanitizedPatrullaId}`;
    
    const ref = db.collection(`clientes/${municipio}/patrullas`).doc(patrullaDocId);
    const doc = await ref.get();

    if (doc.exists) {
      const data = doc.data();
      emergencia = data.emergencia || false;

      const dot = document.getElementById('status-dot');
      const text = document.getElementById('status-text');
      const btnEmergencia = document.getElementById('btn-emergencia');
      const btnSalir = document.getElementById('btn-salir-emergencia');

      if (emergencia) {
        dot.classList.add('emergencia');
        text.textContent = '🚨 EMERGENCIA';
        btnEmergencia.classList.add('emergencia-activa');
        btnSalir.style.display = 'flex';
      } else {
        dot.classList.remove('emergencia');
        text.textContent = '✅ En línea';
        btnEmergencia.classList.remove('emergencia-activa');
        btnSalir.style.display = 'none';
      }
    }
  } catch (error) {
    console.error('Error:', error);
  }
}

// ========================================
// SELECCIONAR PATRULLA
// ========================================
async function showSelectPatrullaModal() {
  const select = document.getElementById('patrulla-options');
  select.innerHTML = '<option value="">-- Cargando --</option>';

  try {
    const snapshot = await db.collection(`clientes/${municipio}/patrullas`).get();

    select.innerHTML = '<option value="">-- Selecciona patrulla --</option>';

    snapshot.forEach((doc) => {
      const option = document.createElement('option');
      option.value = doc.id;
      option.textContent = `🚓 ${doc.id}`;
      select.appendChild(option);
    });
  } catch (error) {
    console.error('Error:', error);
  }
}

function loadPatrollaFromStorage() {
  const stored = localStorage.getItem('patrullaId');
  if (stored) {
    patrullaId = stored;
    return true;
  }
  return false;
}

// ========================================
// EVENT LISTENERS
// ========================================
document.addEventListener('DOMContentLoaded', async () => {
  if (!window.authReady) {
    await new Promise(resolve => window.addEventListener('authReady', resolve, { once: true }));
  }

  const hasPatrulla = loadPatrollaFromStorage();
  const userEmail = auth?.currentUser?.email || '';
  const isPatrulla = userEmail && /^patrulla_/.test(userEmail);

  if (hasPatrulla && patrullaId) {
    document.getElementById('patrulla-id').textContent = `📱 ${patrullaId}`;
    setTimeout(() => init(), 100);
  } else if (!isPatrulla) {
    await showSelectPatrullaModal();
    document.getElementById('btn-continue').addEventListener('click', () => {
      const select = document.getElementById('patrulla-options');
      const selected = select.value.trim();
      if (!selected) {
        alert('Selecciona una patrulla');
        return;
      }
      patrullaId = selected;
      localStorage.setItem('patrullaId', patrullaId);
      document.getElementById('patrulla-id').textContent = `📱 ${patrullaId}`;
      document.getElementById('modal').classList.remove('active');
      setTimeout(() => init(), 200);
    });
    document.getElementById('modal').classList.add('active');
  }
});

function init() {
  if (isInitialized) return;

  try {
    initMap();
    listenToMessages();
    updateStatus();

    document.getElementById('btn-send').addEventListener('click', enviarMensaje);
    document.getElementById('message-input').addEventListener('keypress', (e) => {
      if (e.key === 'Enter') enviarMensaje();
    });

    document.getElementById('btn-photo').addEventListener('click', () => {
      console.log('🎥 Abriendo selector de fotos...');
      const fileInput = document.getElementById('file-input');
      fileInput.click();
    });

    document.getElementById('file-input').addEventListener('change', (e) => {
      console.log('📁 Evento change disparado');
      const file = e.target.files[0];
      console.log('📄 Archivo:', file);
      
      if (file) {
        const reader = new FileReader();
        reader.onload = (event) => {
          fotoSeleccionada = event.target.result;
          console.log('✅ Foto cargada en memoria:', fotoSeleccionada.substring(0, 50) + '...');
          alert('📸 Foto lista para enviar. Pulsa ✈️ para enviar.');
        };
        reader.onerror = () => {
          console.error('❌ Error al leer archivo');
        };
        reader.readAsDataURL(file);
      }
    }, false);

    document.getElementById('btn-emergencia').addEventListener('click', toggleEmergencia);
    document.getElementById('btn-salir-emergencia').addEventListener('click', () => {
      if (emergencia) toggleEmergencia();
    });

    document.getElementById('btn-start-tracking').addEventListener('click', () => {
      const btn = document.getElementById('btn-start-tracking');
      btn.disabled = true;
      btn.textContent = '⏳ Conectando...';
      startTracking();
      btn.style.display = 'none';
    });

    document.getElementById('btn-clear-messages').addEventListener('click', async () => {
      if (confirm('¿Limpiar chat?')) {
        try {
          const coleccion = `chat_${municipio}`;
          const snapshot = await db.collection(coleccion).get();
          const batch = db.batch();
          let deleted = 0;

          snapshot.forEach((doc) => {
            const data = doc.data();
            if (data.to === patrullaId || data.from === patrullaId || data.type === 'broadcast') {
              batch.delete(doc.ref);
              deleted++;
            }
          });

          if (deleted > 0) {
            await batch.commit();
            console.log(`✅ ${deleted} mensajes eliminados`);
            renderMessages();
          }
        } catch (error) {
          console.error('Error:', error);
        }
      }
    });

    setInterval(updateStatus, 10000);

    isInitialized = true;
    console.log('✅ App lista');
  } catch (error) {
    console.error('❌ Error:', error);
  }
}

// ========================================
// LOGOUT
// ========================================
function logout() {
  if (confirm('¿Cerrar sesión?')) {
    window.location.href = '/login.html';
  }
}
