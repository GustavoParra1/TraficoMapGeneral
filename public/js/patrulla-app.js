// ========================================
// FIREBASE CONFIG
// ========================================
let firebaseConfig = null;
let db = null;
let auth = null;
let storage = null;
let fotoSeleccionada = null; // Para almacenar foto en base64

// ========================================
// WEB SPEECH API - VOZ EN CHAT
// ========================================
const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
let recognitionChat = null;
let isListeningChat = false;

if (SpeechRecognition) {
  recognitionChat = new SpeechRecognition();
  recognitionChat.lang = 'es'; // Simplificado para Android
  recognitionChat.continuous = false;
  recognitionChat.interimResults = false;
  recognitionChat.maxAlternatives = 1;
  
  recognitionChat.addEventListener('start', () => {
    isListeningChat = true;
    const btn = document.getElementById('btn-voice-chat');
    btn.classList.add('listening');
    btn.textContent = '🎤';
    console.log('✅ Voice chat START');
  });
  
  recognitionChat.addEventListener('end', () => {
    isListeningChat = false;
    const btn = document.getElementById('btn-voice-chat');
    btn.classList.remove('listening');
    btn.textContent = '🎤';
    console.log('🛑 Voice chat END');
  });
  
  recognitionChat.addEventListener('result', (e) => {
    console.log(`📝 Voice result: ${e.results.length} results`);
    let texto = '';
    for (let i = e.resultIndex; i < e.results.length; i++) {
      const transcript = e.results[i][0].transcript;
      texto += transcript + ' ';
    }
    texto = texto.trim();
    if (texto) {
      const input = document.getElementById('message-input');
      input.value = (input.value + ' ' + texto).trim();
      input.focus();
      console.log(`✅ Added to input: "${texto}"`);
    }
  });
  
  recognitionChat.addEventListener('error', (e) => {
    console.error('❌ Voice error:', e.error);
    isListeningChat = false;
    document.getElementById('btn-voice-chat').classList.remove('listening');
  });
}

// ========================================
// PREGUNTAS RÁPIDAS / AYUDA
// ========================================
const QUICK_QUESTIONS = [
  { emoji: '📍', text: 'Solicitar refuerzo' },
  { emoji: '🚨', text: 'Reporte de emergencia' },
  { emoji: '✅', text: 'Incidente controlado' },
  { emoji: '🚗', text: 'Control de velocidad' },
  { emoji: '🛣️', text: 'Bloqueo de vía' },
  { emoji: '👤', text: 'Persona sospechosa' },
  { emoji: '💔', text: 'Accidente de tránsito' },
  { emoji: '🚨', text: 'Delito en curso' },
  { emoji: '📞', text: 'Contacto con Centro de Control' },
  { emoji: '✋', text: 'En descanso, no disponible' },
];

function initializeQuestionsPanel() {
  const container = document.getElementById('questions-container');
  container.innerHTML = QUICK_QUESTIONS.map((q, idx) => `
    <button class="question-button" data-question="${q.text}" style="
      width: 100%;
      padding: 14px 16px;
      border: none;
      border-bottom: 1px solid #e2e8f0;
      text-align: left;
      cursor: pointer;
      display: flex;
      align-items: center;
      gap: 12px;
      font-size: 15px;
      font-weight: 500;
      color: #1e293b;
      transition: all 0.2s;
      background: white;
    " onmouseover="this.style.background='#f1f5f9'; this.style.paddingLeft='20px';" onmouseout="this.style.background='white'; this.style.paddingLeft='16px';">
      <span style="font-size: 20px;">${q.emoji}</span>
      <span style="flex: 1;">${q.text}</span>
      <span style="color: #94a3b8; font-size: 13px;">→</span>
    </button>
  `).join('');

  // Agregar event listeners a cada pregunta
  document.querySelectorAll('.question-button').forEach(btn => {
    btn.addEventListener('click', () => {
      const question = btn.getAttribute('data-question');
      sendQuickMessage(question);
      // Cerrar modal
      document.getElementById('modal-questions').style.display = 'none';
    });
  });
}

async function sendQuickMessage(question) {
  try {
    console.log(`📨 Enviando pregunta rápida: "${question}"`);
    
    // Normalizar municipio
    const municipioNorm = municipio.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]/g, '');
    const coleccion = `chat_${municipioNorm}`;
    
    const mensajeData = {
      from: patrullaId,
      to: 'CENTRO_CONTROL',
      text: question,
      timestamp: firebase.firestore.FieldValue.serverTimestamp(),
      read: false,
      isQuickQuestion: true
    };

    const docRef = await db.collection(coleccion).add(mensajeData);
    console.log(`✅ Pregunta rápida enviada: ${docRef.id}`);
    
    // Refrescar chat
    await renderMessages();
  } catch (error) {
    console.error('❌ Error enviando pregunta rápida:', error);
    alert('Error: ' + error.message);
  }
}

// ========================================
// COMPRESIÓN DE IMÁGENES
// ========================================
function compressImage(base64String, callback, maxWidth = 800, maxHeight = 600, quality = 0.6) {
  console.log(`🔄 Comprimiendo: ${base64String.length} bytes`);
  const img = new Image();
  
  img.onload = () => {
    console.log(`📐 Dimensiones originales: ${img.width}x${img.height}`);
    const canvas = document.createElement('canvas');
    let width = img.width;
    let height = img.height;
    
    // Calcular nuevas dimensiones manteniendo aspect ratio
    if (width > height) {
      if (width > maxWidth) {
        height = Math.round((height * maxWidth) / width);
        width = maxWidth;
      }
    } else {
      if (height > maxHeight) {
        width = Math.round((width * maxHeight) / height);
        height = maxHeight;
      }
    }
    
    console.log(`📐 Nuevas dimensiones: ${width}x${height}`);
    canvas.width = width;
    canvas.height = height;
    
    const ctx = canvas.getContext('2d');
    ctx.drawImage(img, 0, 0, width, height);
    
    // Convertir a JPEG con compresión
    const compressedBase64 = canvas.toDataURL('image/jpeg', quality);
    console.log(`📉 Comprimido: ${base64String.length} → ${compressedBase64.length} bytes (reducción: ${Math.round((1 - compressedBase64.length / base64String.length) * 100)}%)`);
    callback(compressedBase64);
  };
  
  img.onerror = () => {
    console.error('❌ No se pudo cargar imagen para comprimir');
    console.warn('⚠️ Usando original sin comprimir');
    callback(base64String);
  };
  
  img.src = base64String;
}

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
    storage = firebase.storage();

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
      let userClienteId = null;
      let userEmail = user.email || '';
      for (let i = 0; i < 5; i++) {
        const idTokenResult = await user.getIdTokenResult(true);
        userCity = idTokenResult.claims.city;
        userClienteId = idTokenResult.claims.cliente_id;
        if (userCity) break;
        await new Promise(res => setTimeout(res, 700));
      }

      if (userCity) {
        municipio = userCity;
        // IMPORTANTE: usar SIEMPRE el custom claim 'cliente_id' cuando exista, ya que
        // es el mismo ID real del documento cliente que usa el Centro de Control
        // (ej: "constitucion-1783519219617"). El mapeo MUNICIPIO_TO_ID es solo un
        // fallback para cuentas viejas sin ese claim, y NO incluye el sufijo único,
        // por lo que si se usa, el celular termina escribiendo en una ruta distinta
        // a la que lee el Centro de Control (patrulla queda "offline" y en 0,0).
        clienteId = userClienteId || MUNICIPIO_TO_ID[municipio] || municipio.toLowerCase().replace(/\s+/g, '');
        console.log(`📍 Ciudad: ${municipio}, clienteId: ${clienteId} (claims.cliente_id=${userClienteId || 'AUSENTE'})`);
      } else {
        alert('No se encontró la ciudad asignada.');
        window.location.href = '/login.html';
        return;
      }

       const patrullaMatch = userEmail.match(/^patrulla_([a-zA-Z0-9]+)@seguridad\.com$/);
      if (patrullaMatch) {
        // Extraer SOLO los dígitos del identificador (mdp001 → 001) para que el
        // patrullaId coincida con el doc de Firestore (PATRULLA_001) y el chat
        // funcione bidireccional con el control center.
        const soloDigitos = patrullaMatch[1].replace(/\D/g, '') || patrullaMatch[1];
        const numPadrino = soloDigitos.padStart(3, '0');
        patrullaId = `PATRULLA_${numPadrino}`;
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
let clienteId = null; // Formatted city ID without spaces
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

// Mapeo de municipios a clienteId
const MUNICIPIO_TO_ID = {
  'La Plata': 'laplata',
  'la plata': 'laplata',
  'Mar del Plata': 'mardelplata',
  'mar del plata': 'mardelplata',
  'Córdoba': 'cordoba',
  'cordoba': 'cordoba',
  'Constitución': 'constitucion',
  'constitucion': 'constitucion',
  'Mendoza': 'mendoza',
  'mendoza': 'mendoza',
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

  console.log(`🚀 startTracking() iniciado - clienteId=${clienteId}, patrullaId=${patrullaId}`);

  ubicacionInterval = navigator.geolocation.watchPosition(
    (position) => {
      const { latitude, longitude, speed = 0 } = position.coords;

      document.getElementById('lat').textContent = latitude.toFixed(4);
      document.getElementById('lng').textContent = longitude.toFixed(4);
      document.getElementById('speed').textContent = Math.round(speed * 3.6);

      // Extract number from patrullaId: "patrulla_070" → "070" → "PATRULLA_070"
      const numMatch = patrullaId.match(/(\d+)$/);
      const patrolNum = numMatch ? numMatch[1].padStart(3, '0') : patrullaId.replace(/[^0-9]/g, '').padStart(3, '0');
      const patrullaDocId = `PATRULLA_${patrolNum}`;
      
      // Update GPS location in correct client-specific collection
      // IMPORTANTE: Incluir emergencia para que Centro de Control lo vea correctamente
      const updateData = {
        lat: latitude,
        lng: longitude,
        online: true,
        emergencia: emergencia,
        speed: speed,
        timestamp: firebase.firestore.FieldValue.serverTimestamp()
      };

      if (!clienteId) {
        console.error(`❌ ERROR CRÍTICO: clienteId no está definido! municipio=${municipio}, patrullaId=${patrullaId}`);
        return;
      }

      // Use clienteId to ensure correct path: clientes/{clienteId}/patrullas/
      db.collection(`clientes`).doc(clienteId).collection(`patrullas`).doc(patrullaDocId).set(updateData, { merge: true })
        .then(() => {
          console.log(`✅ Posición actualizada: ${patrullaDocId} en clientes/${clienteId}/patrullas (emergencia=${emergencia})`);
        })
        .catch(e => {
          console.error(`❌ Error actualizando posición: ${e.message}. clienteId=${clienteId}, patrullaDocId=${patrullaDocId}`);
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
  // Normalizar municipio: "La Plata" → "laplata"
  const municipioNorm = municipio.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]/g, '');
  const coleccion = `chat_${municipioNorm}`;
  console.log(`💬 listenToMessages() INICIADO`);
  console.log(`   municipio: ${municipio}`);
  console.log(`   coleccion: ${coleccion}`);
  console.log(`   patrullaId: ${patrullaId}`);

  db.collection(coleccion)
    .orderBy('timestamp', 'desc')
    .onSnapshot((snapshot) => {
      console.log(`📡 onSnapshot DISPARADO: ${snapshot.size} documentos en ${coleccion}`);
      renderMessages();
    }, (error) => {
      console.error('❌ Error CRÍTICO en listenToMessages:', error);
      console.error('   code:', error.code);
      console.error('   message:', error.message);
    });
}

// ========================================
// RENDERIZAR MENSAJES
// ========================================
async function renderMessages() {
  const container = document.getElementById('messages-container');
  // Normalizar municipio: "La Plata" → "laplata"
  const municipioNorm = municipio.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]/g, '');
  const coleccion = `chat_${municipioNorm}`;
  
  try {
    const snapshot = await db.collection(coleccion)
      .orderBy('timestamp', 'asc')
      .get();

    let messages = [];
    const patrullaIdNorm = (patrullaId || '').toUpperCase();

    console.log(`📨 renderMessages: patrullaId=${patrullaId}, patrullaIdNorm=${patrullaIdNorm}, total docs=${snapshot.size}`);

    snapshot.forEach((doc) => {
      const data = doc.data();
      const fromNorm = (data.from || '').toUpperCase();
      const toNorm = (data.to || '').toUpperCase();
      
      const isFromPatrulla = fromNorm === patrullaIdNorm || fromNorm.includes(patrullaIdNorm);
      const isCentroToPatrulla = fromNorm === 'CENTRO_CONTROL' && (toNorm === patrullaIdNorm || toNorm.includes(patrullaIdNorm));
      const isBroadcast = data.type === 'broadcast';

      if (isFromPatrulla || isCentroToPatrulla || isBroadcast) {
        console.log(`✅ Incluido: from=${data.from}, to=${data.to}, tipo=${data.type}`);
        messages.push({
          id: doc.id,
          ...data,
          timestamp: data.timestamp?.toDate(),
        });
      } else {
        console.log(`❌ Filtrado: from=${data.from}(${fromNorm}), to=${data.to}(${toNorm}), patrulla=${patrullaIdNorm}`);
      }
    });

    if (messages.length === 0) {
      console.log(`⚠️ No hay mensajes que mostrar (total snapshot: ${snapshot.size})`);
      container.innerHTML = '<div class="empty-messages">Sin mensajes</div>';
      return;
    }

    console.log(`✅ Mostrando ${messages.length} mensajes en la UI`);

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
      
      if (msg.hasImage && msg.imageUrl) {
        contentHTML += `<img src="${msg.imageUrl}" alt="Foto" class="message-image">`;
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
// PREVIEW DE FOTO EN INPUT AREA
// ========================================
function mostrarPreviewFoto(base64) {
  // Eliminar preview anterior si existe
  limpiarPreviewFoto();

  const inputArea = document.querySelector('.message-input-area');
  const preview = document.createElement('div');
  preview.id = 'foto-preview';
  preview.style.cssText = `
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 6px 12px;
    background: #e0f2fe;
    border-top: 1px solid #bae6fd;
    animation: slideIn 0.2s ease-out;
  `;
  preview.innerHTML = `
    <img src="${base64}" style="height:48px;width:48px;object-fit:cover;border-radius:6px;border:2px solid #0ea5e9;">
    <span style="font-size:13px;color:#0369a1;flex:1;">📎 Foto adjunta — presioná ✈️ para enviar</span>
    <button onclick="cancelarFoto()" style="
      background:none;border:none;cursor:pointer;
      font-size:18px;color:#ef4444;padding:2px 6px;
    " title="Cancelar foto">✕</button>
  `;
  // Insertar ANTES del input area
  inputArea.parentNode.insertBefore(preview, inputArea);
}

function limpiarPreviewFoto() {
  const prev = document.getElementById('foto-preview');
  if (prev) prev.remove();
}

function cancelarFoto() {
  fotoSeleccionada = null;
  limpiarPreviewFoto();
  console.log('🚫 Foto cancelada');
}

// ========================================
// ENVIAR MENSAJE
// ========================================
async function enviarMensaje() {
  const input = document.getElementById('message-input');
  const btn = document.getElementById('btn-send');
  const texto = input.value.trim();

  console.log('🚀 enviarMensaje llamado');
  console.log('  - Texto:', texto ? `"${texto}"` : 'VACÍO');
  console.log('  - Foto:', fotoSeleccionada ? `${fotoSeleccionada.length} bytes` : 'NO HAY');

  if (!texto && !fotoSeleccionada) {
    console.warn('⚠️ No hay texto ni foto para enviar');
    return;
  }

  try {
    btn.classList.add('sending');
    // Normalizar municipio: "La Plata" → "laplata"
    const municipioNorm = municipio.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]/g, '');
    const coleccion = `chat_${municipioNorm}`;
    
    const mensajeData = {
      from: patrullaId,
      to: 'CENTRO_CONTROL',
      timestamp: firebase.firestore.FieldValue.serverTimestamp(),
      read: false
    };

    if (texto) {
      mensajeData.text = texto;
      console.log('✍️ Agregado texto');
    }

    let imageUrl = null;
    if (fotoSeleccionada) {
      console.log(`📸 Subiendo foto a Storage: ${fotoSeleccionada.length} bytes`);
      
      // Convertir base64 a blob
      const arr = fotoSeleccionada.split(',');
      const mime = arr[0].match(/:(.*?);/)[1];
      const bstr = atob(arr[1]);
      let n = bstr.length;
      const u8arr = new Uint8Array(n);
      while (n--) {
        u8arr[n] = bstr.charCodeAt(n);
      }
      const blob = new Blob([u8arr], { type: mime });
      
      // Crear nombre único (municipioNorm sin espacios para que Storage no falle)
      const timestamp = Date.now();
      const filename = `chat_${municipioNorm}/${patrullaId}_${timestamp}.jpg`;
      
      console.log(`📤 Subiendo a Storage: ${filename}`);
      const uploadTask = await storage.ref(filename).put(blob);
      
      // Obtener URL de descarga
      imageUrl = await uploadTask.ref.getDownloadURL();
      console.log(`✅ Imagen subida. URL:`, imageUrl.substring(0, 80) + '...');
      
      mensajeData.imageUrl = imageUrl;
      mensajeData.hasImage = true;
      mensajeData.imagePath = filename;
    }

    console.log('💾 Guardando mensaje en Firestore:', coleccion);
    const docRef = await db.collection(coleccion).add(mensajeData);
    console.log('✅ Mensaje guardado con ID:', docRef.id);
    
    input.value = '';
    fotoSeleccionada = null;
    limpiarPreviewFoto();
    
    setTimeout(() => btn.classList.remove('sending'), 600);
    await renderMessages();
    console.log('✅ Chat actualizado');
  } catch (error) {
    console.error('❌ Error CRÍTICO al enviar:', error);
    console.error('   Código:', error.code);
    console.error('   Mensaje:', error.message);
    btn.classList.remove('sending');
    alert('❌ Error: ' + error.message);
  }
}

// ========================================
// EMERGENCIA
// ========================================
async function toggleEmergencia() {
  try {
    emergencia = !emergencia;
    // Extract number from patrullaId: "patrulla_070" → "070" → "PATRULLA_070"
    const numMatch = patrullaId.match(/(\d+)$/);
    const patrolNum = numMatch ? numMatch[1].padStart(3, '0') : patrullaId.replace(/[^0-9]/g, '').padStart(3, '0');
    const patrullaDocId = `PATRULLA_${patrolNum}`;
    
    // Intentar actualizar en estructura anidada - USAR clienteId, NO municipio
    console.log(`🔍 toggleEmergencia: usando clienteId=${clienteId}, patrullaDocId=${patrullaDocId}`);
    const ref = db.collection(`clientes`).doc(clienteId).collection(`patrullas`).doc(patrullaDocId);
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
    // Extract number from patrullaId: "patrulla_070" → "070" → "PATRULLA_070"
    const numMatch = patrullaId.match(/(\d+)$/);
    const patrolNum = numMatch ? numMatch[1].padStart(3, '0') : patrullaId.replace(/[^0-9]/g, '').padStart(3, '0');
    const patrullaDocId = `PATRULLA_${patrolNum}`;
    
    // USAR clienteId, NO municipio
    const ref = db.collection(`clientes`).doc(clienteId).collection(`patrullas`).doc(patrullaDocId);
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
    // USAR clienteId, NO municipio
    const snapshot = await db.collection(`clientes`).doc(clienteId).collection(`patrullas`).get();

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

  console.log(`🔍 init() VERIFICANDO estado inicial:`);
  console.log(`   - municipio: ${municipio}`);
  console.log(`   - patrullaId: ${patrullaId}`);
  console.log(`   - db: ${db ? 'OK' : 'NO'}`);
  console.log(`   - auth: ${auth ? 'OK' : 'NO'}`);

  if (!municipio || !patrullaId) {
    console.warn(`⏳ init() POSTPONIENDO: esperando municipio y patrullaId...`);
    setTimeout(() => init(), 500);  // Retry en 500ms
    return;
  }

  try {
    console.log(`✅ init(): Inicializando app`);
    initMap();
    listenToMessages();
    updateStatus();

    document.getElementById('btn-send').addEventListener('click', enviarMensaje);
    document.getElementById('message-input').addEventListener('keypress', (e) => {
      if (e.key === 'Enter') enviarMensaje();
    });

    // Botón de voz en chat
    if (recognitionChat) {
      document.getElementById('btn-voice-chat').addEventListener('click', () => {
        if (isListeningChat) {
          recognitionChat.stop();
        } else {
          document.getElementById('message-input').focus();
          recognitionChat.start();
        }
      });
    } else {
      document.getElementById('btn-voice-chat').style.opacity = '0.5';
      document.getElementById('btn-voice-chat').disabled = true;
      document.getElementById('btn-voice-chat').title = 'Navegador no soporta reconocimiento de voz';
    }

    // Botón de preguntas rápidas
    document.getElementById('btn-help-questions').addEventListener('click', () => {
      initializeQuestionsPanel();
      document.getElementById('modal-questions').style.display = 'flex';
    });

    document.getElementById('btn-camera').addEventListener('click', () => {
      try {
        console.log('📸 Botón cámara clickeado');
        const fileInput = document.getElementById('file-camera');
        if (!fileInput) {
          console.error('❌ No se encontró file-camera');
          return;
        }
        console.log('📸 Abriendo cámara...');
        fileInput.click();
      } catch (e) {
        console.error('❌ Error en btn-camera:', e);
      }
    });

    document.getElementById('btn-gallery').addEventListener('click', () => {
      try {
        console.log('🖼️ Botón galería clickeado');
        const fileInput = document.getElementById('file-gallery');
        if (!fileInput) {
          console.error('❌ No se encontró file-gallery');
          return;
        }
        console.log('🖼️ Abriendo galería...');
        fileInput.click();
      } catch (e) {
        console.error('❌ Error en btn-gallery:', e);
      }
    });

    const handleFileSelect = (e) => {
      console.log('📁 Archivo seleccionado');
      const file = e.target.files[0];
      
      if (!file) {
        console.warn('⚠️ No se seleccionó archivo');
        return;
      }

      console.log(`📄 Archivo: ${file.name} | Tipo: ${file.type} | Tamaño: ${file.size} bytes`);
      
      if (!file.type.startsWith('image/')) {
        alert('⚠️ Solo se aceptan imágenes');
        return;
      }

      if (file.size > 10000000) {
        alert('⚠️ La imagen es demasiado grande (máx 10MB)');
        return;
      }
      
      const reader = new FileReader();
      
      reader.onload = (event) => {
        try {
          const base64 = event.target.result;
          console.log(`📊 Base64 generado: ${base64.length} bytes`);
          
          // Comprimir imagen
          compressImage(base64, (compressedBase64) => {
            try {
              fotoSeleccionada = compressedBase64;
              console.log(`✅ Foto comprimida: ${compressedBase64.length} bytes`);
              e.target.value = '';
              // Mostrar preview en lugar de alert
              mostrarPreviewFoto(compressedBase64);
            } catch (err) {
              console.error('❌ Error en compresor:', err);
            }
          });
        } catch (err) {
          console.error('❌ Error al procesar base64:', err);
          alert('Error al procesar imagen');
        }
      };
      
      reader.onerror = () => {
        console.error('❌ Error al leer archivo');
        alert('Error al leer la imagen');
      };
      
      reader.readAsDataURL(file);
    };

    document.getElementById('file-camera').addEventListener('change', handleFileSelect, false);
    document.getElementById('file-gallery').addEventListener('change', handleFileSelect, false);

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

    // AUTO-INICIAR TRACKING
    console.log('🚀 Auto-iniciando GPS tracking...');
    const btn = document.getElementById('btn-start-tracking');
    btn.disabled = true;
    btn.textContent = '⏳ Conectando...';
    startTracking();
    btn.style.display = 'none';

    document.getElementById('btn-clear-messages').addEventListener('click', async () => {
      if (confirm('¿Limpiar chat? Se eliminarán todas las fotos y mensajes.')) {
        try {
          // Normalizar municipio: "La Plata" → "laplata"
          const municipioNorm = municipio.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]/g, '');
          const coleccion = `chat_${municipioNorm}`;
          const snapshot = await db.collection(coleccion).get();
          const batch = db.batch();
          let deleted = 0;
          let deletedImages = 0;

          // Primero, eliminar imágenes de Storage
          for (const doc of snapshot.docs) {
            const data = doc.data();
            if (data.to === patrullaId || data.from === patrullaId || data.type === 'broadcast') {
              // Si tiene imagen en Storage, eliminarla
              if (data.imagePath) {
                try {
                  await storage.ref(data.imagePath).delete();
                  console.log(`🗑️ Imagen eliminada: ${data.imagePath}`);
                  deletedImages++;
                } catch (err) {
                  console.warn(`⚠️ No se pudo eliminar imagen: ${data.imagePath}`, err);
                }
              }
              // Marcar documento para eliminar
              batch.delete(doc.ref);
              deleted++;
            }
          }

          if (deleted > 0) {
            await batch.commit();
            console.log(`✅ ${deleted} mensajes eliminados, ${deletedImages} fotos eliminadas del storage`);
            renderMessages();
          }
        } catch (error) {
          console.error('Error:', error);
        }
      }
    });

    // Cerrar modal de preguntas al hacer click fuera
    document.getElementById('modal-questions').addEventListener('click', (e) => {
      if (e.target.id === 'modal-questions') {
        document.getElementById('modal-questions').style.display = 'none';
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
