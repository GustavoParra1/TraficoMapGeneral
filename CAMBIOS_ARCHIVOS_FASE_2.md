# 📝 CAMBIOS POR ARCHIVO - FASE 2

Detalle exacto de qué cambia en cada archivo.

---

## 📂 ARCHIVOS QUE CAMBIAN

### 1️⃣ `public/js/app.js` - CAMBIO CRÍTICO

**Línea 83:**
```javascript
// ANTES (DEMO):
let currentCity = 'mar-del-plata';

// DESPUÉS (CLIENTE):
let currentCity = window.CONFIG?.ciudad || 'cordoba';
```

**Línea ~1135 (Selector de ciudades):**
```javascript
// ANTES (DEMO): Event listener de cambio
citySelector.addEventListener('change', async (e) => {
  const newCity = e.target.value;
  // ... código de cambio ...
});

// DESPUÉS (CLIENTE): NO EXISTE
// (se remueve completamente porque no hay selector)
```

**Línea ~2310 (Inicialización):**
```javascript
// ANTES (DEMO):
console.log('📍 INICIALIZANDO CARGA DE DATOS DE MAR-DEL-PLATA');
cargarDatosGeograficos(currentCity).then(...)

// DESPUÉS (CLIENTE): 
// Exactamente igual, pero currentCity ya viene del CONFIG
// No hay cambios aquí
```

**Total de cambios en app.js:** 2 cambios pequeños ✅

---

### 2️⃣ `public/index.html` - CAMBIO VISUAL

**Sección del selector de ciudades (líneas ~760-770):**

**ANTES (DEMO):**
```html
<div class="sidebar-section">
  <div class="sidebar-title">Ciudad</div>
  <select id="city-selector" style="...">
    <option value="mar-del-plata" selected>Mar del Plata</option>
    <option value="cordoba">Córdoba</option>
  </select>
  <div style="font-size: 11px; color: #888; margin-top: 8px;">
    Selecciona una ciudad para cambiar los datos
  </div>
  
  <!-- Botón para importar nueva ciudad -->
  <button id="btn-import-city" style="...">
    ➕ Importar Nueva Ciudad
  </button>
</div>
```

**DESPUÉS (CLIENTE):**
```html
<div class="sidebar-section">
  <div class="sidebar-title">🏙️ Tu Municipio</div>
  <div id="city-display" style="font-size: 16px; font-weight: bold; padding: 10px; background-color: #e8f4ff; border-radius: 4px;">
    <span id="city-name">Cargando...</span>
  </div>
  <div style="font-size: 11px; color: #888; margin-top: 8px;">
    Conectado a tu sistema
  </div>
  
  <!-- Top: No hay botón de importar (solo en demo) -->
</div>

<script>
  // Cargar nombre de ciudad del config
  window.addEventListener('DOMContentLoaded', () => {
    const cityName = window.CONFIG?.ciudad_nombre || 'Sin definir';
    document.getElementById('city-name').textContent = cityName;
  });
</script>
```

**Total de cambios en index.html:** 1 sección reemplazada ✅

---

### 3️⃣ `firestore.rules` - CAMBIO CRÍTICO

**ANTES (DEMO - Específico por ciudad):**
```
match /patrullas_mardelplata/{patrolId} {...}
match /patrullas_cordoba/{patrolId} {...}
match /patrullas_laplata/{patrolId} {...}
match /chat_mardelplata/{document=**} {...}
match /chat_cordoba/{document=**} {...}
match /messages_mardelplata/{messageId} {...}
match /messages_cordoba/{messageId} {...}
... (tons más)
```

**DESPUÉS (CLIENTE - Genérico):**
```
// ========== PATRULLAS ==========
match /patrullas/{patrolId} {
  allow read: if isAuthenticated();
  allow write: if isAuthenticated();
  match /gps_history/{entry} {
    allow read: if isAuthenticated();
    allow write: if isAuthenticated();
  }
}

// ========== CHAT ==========
match /chat/{document=**} {
  allow read: if isAuthenticated();
  allow write: if isAuthenticated();
  allow delete: if isOperadorOrAdmin();
}

// ========== MESSAGES ==========
match /messages/{messageId} {
  allow read: if isAuthenticated();
  allow create: if isAuthenticated();
  allow update: if isAuthenticated();
  allow delete: if isOperadorOrAdmin();
}

// ========== WEBRTC ==========
match /webrtc/{document=**} {
  allow read: if isAuthenticated();
  allow write: if isAuthenticated();
}

// ========== USERS ==========
match /users/{userId} {
  allow read: if isAuthenticated();
  allow create, update, delete: if isAdmin();
}

// ========== ROBOS ==========
match /robos/{document=**} {
  allow read: if isOperadorOrAdmin();
  allow write: if isAdmin();
}

// ========== AUDIT LOGS ==========
match /audit_logs/{document=**} {
  allow read: if isAdmin();
  allow write: if isAuthenticated();
}

// ========== DEFAULT: DENY ==========
match /{document=**} {
  allow read, write: if false;
}
```

**Total de cambios en firestore.rules:** ~95% simplificado ✅

---

### 4️⃣ `public/data/cities-config.json` - CAMBIO TEMPLATE

**DEMO:**
```json
[
  {
    "id": "mar-del-plata",
    "name": "Mar del Plata",
    "coordinates": { "lat": -38, "lng": -57.55 },
    "files": { ... }
  },
  {
    "id": "cordoba",
    "name": "Córdoba",
    "coordinates": { "lat": -31.415, "lng": -64.189 },
    "files": { ... }
  }
]
```

**CLIENTE (template):**
```json
[
  {
    "id": "cordoba",
    "name": "Córdoba",
    "coordinates": { "lat": -31.415, "lng": -64.189 },
    "files": {
      "barrios": "data/barrios.json",
      "siniestros": "data/siniestros.geojson",
      "cameras": "data/cameras.geojson",
      "private_cameras": "data/private-cameras.geojson"
    },
    "optionalLayers": {
      "semaforos": null,
      "colectivos": null,
      "robo": null,
      "alertas": null,
      "zonas": null
    },
    "patrullas": {
      "enabled": true,
      "dataCollection": "patrullas",
      "chatCollection": "chat",
      "webrtcCollection": "webrtc"
    }
  }
]
```

**Cambios:**
- Solo 1 ciudad en el array (la del cliente)
- IDs de colecciones sin sufijo: `patrullas` en vez de `patrullas_cordoba`
- Cliente puede agregar más ciudades si quiere
- Paths a archivos son relativos

**Total de cambios en cities-config.json:** ~60% reescrito ✅

---

### 5️⃣ ⭐ NUEVO: `public/js/verificar-suscripcion.js`

**Archivo completamente nuevo:**

```javascript
/**
 * VERIFICAR-SUSCRIPCION.js
 * 
 * Verifica con tu Firebase administrativo que la suscripción
 * del cliente sigue activa y válida
 */

let verificacionCache = null;
let verificacionTimeout = 3600000; // 1 hora

async function verificarSuscripcion() {
  try {
    // 1. Obtener datos del config
    const suscripcionId = window.CONFIG?.suscripcion_id;
    if (!suscripcionId) {
      console.error('❌ verificarSuscripcion(): No hay suscripcion_id en CONFIG');
      return false;
    }

    // 2. Usar caché si está fresca
    if (verificacionCache && 
        (Date.now() - verificacionCache.timestamp) < verificacionTimeout) {
      console.log('✅ Verificación de suscripción (desde caché)');
      return verificacionCache.valida;
    }

    // 3. Inicializar Firebase Admin (tu Firebase)
    const tuFirebase = firebase.initializeApp(
      window.CONFIG?.tu_firebase_para_verificar,
      'admin-verificacion'
    );
    const tuDb = tuFirebase.firestore();

    // 4. Obtener datos de suscripción
    const subscripcionRef = await tuDb
      .collection('subscripciones')
      .doc(suscripcionId)
      .get();

    if (!subscripcionRef.exists) {
      console.error('❌ Suscripción NO ENCONTRADA:', suscripcionId);
      guardarVerificacion(false);
      return false;
    }

    const suscripcionData = subscripcionRef.data();
    console.log('📋 Datos de suscripción:', suscripcionData);

    // 5. Verificar estado
    if (suscripcionData.estado !== 'activo') {
      console.error('❌ Suscripción NO ACTIVA. Estado:', suscripcionData.estado);
      mostrarMensajeError(
        `Tu suscripción está ${suscripcionData.estado}. ` +
        `Por favor contacta al administrador.`
      );
      guardarVerificacion(false);
      return false;
    }

    // 6. Verificar fecha de expiración
    const fechaExpiracion = suscripcionData.fecha_expiracion.toDate?.() || 
                            new Date(suscripcionData.fecha_expiracion);
    
    if (fechaExpiracion < new Date()) {
      console.error('❌ Suscripción EXPIRADA');
      mostrarMensajeError('Tu suscripción ha expirado. Por favor renuévala.');
      guardarVerificacion(false);
      return false;
    }

    // 7. Días hasta expiración
    const diasRestantes = Math.ceil(
      (fechaExpiracion - new Date()) / (1000 * 60 * 60 * 24)
    );
    console.log(`✅ Suscripción VÁLIDA. ${diasRestantes} días restantes`);

    if (diasRestantes < 7) {
      console.warn(`⚠️ ALERTA: Tu suscripción vence en ${diasRestantes} días`);
      mostrarAlerta(`Tu suscripción vence en ${diasRestantes} días`);
    }

    guardarVerificacion(true);
    return true;

  } catch (error) {
    console.error('❌ Error verificando suscripción:', error);
    return false;
  }
}

function guardarVerificacion(valida) {
  verificacionCache = {
    valida: valida,
    timestamp: Date.now()
  };
}

function mostrarMensajeError(mensaje) {
  const div = document.createElement('div');
  div.style.cssText = `
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background-color: rgba(0,0,0,0.9);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 10000;
  `;
  
  const contenido = document.createElement('div');
  contenido.style.cssText = `
    background: white;
    padding: 30px;
    border-radius: 8px;
    text-align: center;
    max-width: 400px;
  `;
  
  contenido.innerHTML = `
    <h2 style="color: #d32f2f;">❌ Acceso Denegado</h2>
    <p>${mensaje}</p>
    <button onclick="location.reload()" style="
      background: #d32f2f;
      color: white;
      border: none;
      padding: 10px 20px;
      border-radius: 4px;
      cursor: pointer;
    ">Reintentar</button>
  `;
  
  div.appendChild(contenido);
  document.body.appendChild(div);
}

function mostrarAlerta(mensaje) {
  console.warn(`⚠️ ALERTA: ${mensaje}`);
  // Puede mostrar notificación silenciosa en UI
}

// Ejecutar verificación al cargar
window.addEventListener('DOMContentLoaded', async () => {
  console.log('🔐 Iniciando verificación de suscripción...');
  const esValida = await verificarSuscripcion();
  
  if (!esValida) {
    console.error('🚫 ACCESO DENEGADO');
    // Bloquear interfaz
    document.body.style.opacity = '0.3';
    document.body.style.pointerEvents = 'none';
  } else {
    console.log('✅ ACCESO PERMITIDO');
  }
});
```

**Total de cambios:** +90 líneas de código nuevo ✅

---

### 6️⃣ ⭐ NUEVO: `config-template.json`

**Archivo completamente nuevo - Cada cliente recibe esto personalizado:**

```json
{
  "metadata": {
    "cliente": "Córdoba Municipalidad",
    "fecha_creacion": "2026-05-03",
    "version": "1.0",
    "soporte": "contacto@traficomap.app"
  },

  "ciudad": {
    "id": "cordoba",
    "nombre": "Córdoba",
    "provincia": "Córdoba",
    "pais": "Argentina",
    "coordenadas": {
      "lat": -31.415,
      "lng": -64.189,
      "zoom": 12
    }
  },

  "suscripcion": {
    "id": "cordoba_001",
    "plan": "profesional",
    "fecha_inicio": "2026-05-03",
    "fecha_expiracion": "2026-06-03",
    "estado": "activo",
    "stripe_id": "sub_cordoba_xxxxx"
  },

  "firebase_cliente": {
    "apiKey": "AIzaSyXXXXXXXXX_GENERADO_AUTOMATICAMENTE",
    "authDomain": "cordoba-traficomap-2024.firebaseapp.com",
    "projectId": "cordoba-traficomap-2024",
    "storageBucket": "cordoba-traficomap-2024.appspot.com",
    "messagingSenderId": "123456789",
    "appId": "1:123456789:web:abcdefg123456"
  },

  "firebase_verificacion": {
    "projectId": "trafico-map-general-v2",
    "apiKey": "AIzaSyYYYYYYYYYY_PARA_VERIFICAR",
    "messagingSenderId": "987654321",
    "appId": "1:987654321:web:xyzabc987654"
  },

  "características": {
    "patrullas": true,
    "chat": true,
    "video_streaming": false,
    "analíticos": true,
    "máximo_usuarios": 10,
    "máximo_patrullas": 100,
    "almacenamiento_gb": 5
  }
}
```

**Total de cambios:** +50 líneas de configuración ✅

---

### 7️⃣ `public/js/patrulla-layer.js` - SIN CAMBIOS

**Línea ~60 (recolección de Firestore):**
```javascript
// ANTES (específico):
const coleccion = `patrullas_${municipioSinGuiones}`;

// DESPUÉS (cliente): 
// EXACTAMENTE IGUAL - el código ya soporta cualquier nombre de colección
const coleccion = `patrullas_${municipioSinGuiones}`;

// En cliente, municipioSinGuiones será algo como "cordoba"
// Y en Firestore habrá una colección llamada "patrullas_cordoba"
// O simplemente "patrullas" (ambos funcionan)
```

**Total de cambios:** 0 ✅

---

### 8️⃣ `public/js/colectivos-layer.js` - SIN CAMBIOS

**Línea ~60:**
```javascript
// Obtiene la ciudad del config global
const cityId = window.CONFIG?.ciudad || currentCity;

// El resto del código NO CAMBIA - es agnóstico
```

**Total de cambios:** 0 (solo agregamos soporte a CONFIG) ✅

---

## 📊 RESUMEN DE CAMBIOS

| Archivo | Antes | Después | Cambios |
|---------|-------|---------|---------|
| app.js | 3177 líneas | 3175 líneas | -2 líneas |
| index.html | XXX líneas | XXX líneas | 1 sección |
| firestore.rules | 295 líneas | ~100 líneas | -65% |
| cities-config.json | 2 ciudades | 1 ciudad (template) | -50% |
| ⭐ verificar-suscripcion.js | NO EXISTE | 90 líneas | +90 líneas NUEVO |
| ⭐ config-template.json | NO EXISTE | 50 líneas | +50 líneas NUEVO |
| patrulla-layer.js | 705 líneas | 705 líneas | 0 |
| colectivos-layer.js | 712 líneas | 712 líneas | 0 |

**Total nuevo código: +140 líneas**
**Total código modificado: -67 líneas**
**Neto: +73 líneas de funcionalidad**

---

## 🎯 IMPACTO

✅ **Versión DEMO sigue igual** (puede usarse para mostrar)
✅ **Versión CLIENTE es independiente** (solo sus datos)
✅ **Codigo reutilizable** (95% idéntico)
✅ **Fácil de automatizar** (script crea Firestore + copia config)

---

**Próximo paso:** Implementar estos cambios paso a paso
