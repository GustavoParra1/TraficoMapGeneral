# 🔐 GUÍA COMPLETA: ADMINISTRADOR GENERAL (VER TODAS LAS CIUDADES)

## 📋 RESUMEN RÁPIDO

Hay **DOS formas** de acceder al sistema:

| Rol | URL | Ver Ciudades | Acceso |
|-----|-----|-----|---------|
| **Operador de ciudad** | `/control-center-v2/` | Solo su ciudad | Email: operador-mendoza-01@seguridad.com |
| **Administrador general** | `/control-center-v2/` | TODAS las ciudades | Email: admin@seguridad-mdp.com |
| **Mapa público** | `/index.html` | TODAS a través de selector | Cualquiera |

---

## 🚀 PASO 1: ACCEDER COMO ADMINISTRADOR GENERAL

### URL para iniciar sesión:
```
https://trafico-map-general-v2.web.app/login.html
```

### Credenciales de ADMINISTRADOR:
```
Email:       admin@seguridad-mdp.com
Contraseña:  admin123
```

**Diferencia de un operador:**
- Operador La Plata: `operador-la-plata-01@seguridad.com` → Solo ve La Plata
- Admin: `admin@seguridad-mdp.com` → Ve TODAS las ciudades

---

## 📍 PASO 2: ¿QUÉ VES CUANDO ENTRAS COMO ADMIN?

### 2.1 - El sistema carga así:

```
1️⃣ Entras a login.html
    ↓
2️⃣ Haces login con admin@seguridad-mdp.com
    ↓
3️⃣ Firebase valida credenciales + custom claims
    
    Custom claims del admin:
    {
      "role": "admin",
      "city": null              ← IMPORTANTE: Acceso a TODAS
    }
    ↓
4️⃣ Te redirige a /control-center-v2/
    ↓
5️⃣ El código lee: "Si no tengo custom claim de city, busco en localStorage"
    ↓
6️⃣ Como admin, localStorage puede estar vacío
    ↓
7️⃣ Por defecto carga: mardelplata
```

### 2.2 - Lo que VES en la pantalla:

El panel lateral muestra:
- Patrullas de **Mar del Plata** (la ciudad por defecto)
- Chat de patrullas de Mar del Plata
- Mapa centrado en Mar del Plata

---

## 🔄 PASO 3: ¿CÓMO CAMBIO A OTRA CIUDAD EN EL CONTROL CENTER?

**IMPORTANTE:** El control-center-v2 NO tiene selector de ciudades visible.

**Solución:** Usa localStorage para cambiar de ciudad:

### Opción 1: Desde la Consola del Navegador (F12)

1. Abre el navegador: `https://trafico-map-general-v2.web.app/control-center-v2/`
2. Presiona `F12` para abrir Developer Tools
3. Ve a la pestaña **Console**
4. Ejecuta el comando para cambiar de ciudad:

```javascript
// Para ver Mendoza
localStorage.setItem('selectedCity', 'mendoza');
location.reload();
```

```javascript
// Para ver La Plata
localStorage.setItem('selectedCity', 'laplata');
location.reload();
```

```javascript
// Para ver Córdoba
localStorage.setItem('selectedCity', 'cordoba');
location.reload();
```

**Resultado:** La página se recarga y muestra patrullas de esa ciudad.

### Opción 2: Usar el Mapa Público

Si quieres ver un selector visual de ciudades:

1. Abre: `https://trafico-map-general-v2.web.app/index.html`
2. En la barra lateral izquierda hay un dropdown: **"Selecciona ciudad"**
3. Cambia entre: Mar del Plata, Córdoba, La Plata, San Martín del Mar, Mendoza
4. Para ver el control center en esa ciudad: Haz clic en "Control Center" (si existe botón)

---

## 👮 PASO 4: CREAR PATRULLAS Y OPERADORES EN MENDOZA (Como Admin)

### Este es el FLUJO COMPLETO que debes hacer:

#### PASO 4A: Editar el archivo setup-users.js

**Ubicación:** `TraficoMapGeneral/setup-users.js`

1. Abre el archivo en VS Code
2. Busca: `// ========== MENDOZA ==========`
3. Verifica que esté así:

```javascript
// ========== MENDOZA ==========
{
  email: 'patrulla-mendoza-01@seguridad.com',
  password: 'patrulla123',
  role: 'patrulla',
  city: 'mendoza'
},
{
  email: 'operador-mendoza-01@seguridad.com',
  password: 'control123',
  role: 'operador',
  city: 'mendoza'
}
```

**¿Quieres más patrullas?** Agrega:

```javascript
{
  email: 'patrulla-mendoza-02@seguridad.com',
  password: 'patrulla123',
  role: 'patrulla',
  city: 'mendoza'
},
{
  email: 'patrulla-mendoza-03@seguridad.com',
  password: 'patrulla123',
  role: 'patrulla',
  city: 'mendoza'
}
```

---

#### PASO 4B: Ejecutar el setup de usuarios

Abre Terminal (Powershell) en VS Code y ejecuta:

```bash
npm run setup-users
```

**Output esperado:**
```
✅ patrulla-mendoza-01@seguridad.com - Creado correctamente
✅ patrulla-mendoza-02@seguridad.com - Creado correctamente
✅ operador-mendoza-01@seguridad.com - Creado correctamente

📊 RESUMEN
✅ Creados: 3
⚠️  Ya existentes: 15
❌ Errores: 0
```

---

#### PASO 4C: Verificar que firestore.rules contiene reglas de Mendoza

**Ubicación:** `TraficoMapGeneral/firestore.rules`

Busca la sección `// ========== PATRULLAS MENDOZA ==========`

Debe contener:
```
// ========== PATRULLAS MENDOZA ==========
match /patrullas_mendoza/{patrolId} {
  allow read: if isAuthenticated();
  allow write: if isAuthenticated();
  
  match /gps_history/{document=**} {
    allow read: if isAuthenticated();
    allow write: if isAuthenticated();
  }
}

// ========== CHAT MENDOZA ==========
match /chat_mendoza/{document=**} {
  allow read: if isAuthenticated();
  allow write: if isAuthenticated();
}

// ========== MESSAGES MENDOZA ==========
match /messages_mendoza/{document=**} {
  allow read: if isAuthenticated();
  allow write: if isAuthenticated();
}

// ========== WEBRTC MENDOZA ==========
match /webrtc_mendoza/{document=**} {
  allow read: if isAuthenticated();
  allow write: if isAuthenticated();
}
```

Si NO está, agrégalo manualmente (busca el patrón y cópialo).

---

#### PASO 4D: Verificar que cities-config.json contiene Mendoza

**Ubicación:** `TraficoMapGeneral/public/data/cities-config.json`

Busca Mendoza en el array `cities`. Debe tener:

```json
{
  "id": "mendoza",
  "name": "Mendoza",
  "country": "Argentina",
  "province": "Mendoza",
  "coordinates": {
    "lat": -32.8895,
    "lng": -68.8458
  },
  "zoom": 12,
  "patrullas": {
    "enabled": true,
    "dataCollection": "patrullas_mendoza",
    "chatCollection": "chat_mendoza",
    "messagesCollection": "messages_mendoza",
    "webrtcCollection": "webrtc_mendoza"
  }
}
```

Si NO está, agrega esta entrada al array `"cities"`.

---

#### PASO 4E: Verificar que control-center-v2/index.html tiene coordenadas de Mendoza

**Ubicación:** `TraficoMapGeneral/public/control-center-v2/index.html`

Busca `const CITY_COORDS = {`

Debe contener:
```javascript
const CITY_COORDS = {
  'mardelplata': [-38.0, -57.55],
  'cordoba': [-31.4201, -64.1888],
  'laplata': [-34.9213, -57.9460],
  'san-martin-del-mar': [-38.05, -57.6],
  'mendoza': [-32.8895, -68.8458],
};
```

---

#### PASO 4F: DEPLOY (Publicar cambios)

Ejecuta en Terminal:

```bash
firebase deploy --only firestore,hosting
```

O en VS Code: 
```
Ctrl + Shift + P → Tasks: Run Task → Firebase Deploy
```

**Output esperado:**
```
✔ Deploy complete!
✔ Database Rules deploy complete
✔ Hosting file upload complete
```

---

## ✅ PASO 5: VERIFICAR QUE MENDOZA FUNCIONA

### 5.1 - Como Admin viendo Mendoza:

```
1️⃣ Entra a: https://trafico-map-general-v2.web.app/control-center-v2/
2️⃣ Login con: admin@seguridad-mdp.com / admin123
3️⃣ Abre consola (F12) y ejecuta:
   
   localStorage.setItem('selectedCity', 'mendoza');
   location.reload();

4️⃣ Espera a que cargue...
5️⃣ ¡Ver mapa de Mendoza con patrullas!
```

### 5.2 - Como Operador de Mendoza viendo solo Mendoza:

```
1️⃣ Sal de admin (logout con logout button)
2️⃣ Entra a: https://trafico-map-general-v2.web.app/login.html
3️⃣ Login con: operador-mendoza-01@seguridad.com / control123
4️⃣ Se carga automáticamente en Mendoza (por custom claim city: 'mendoza')
5️⃣ ¡Ver solo patrullas de Mendoza!
```

### 5.3 - Test de patrullas en tiempo real:

En la consola (F12) del navegador:

```javascript
// Crear patrullas de prueba en Mendoza
crearPatrullasPrueba()
```

---

## 🗺️ PASO 6: ESTRUCTURA DE ARCHIVOS (Cómo funciona internamente)

```
TraficoMapGeneral/
├── setup-users.js                    ← ⭐ Define qué usuarios existen
│   └── MENDOZA:
│       ├── patrulla-mendoza-01
│       ├── patrulla-mendoza-02
│       └── operador-mendoza-01
│
├── firestore.rules                   ← ⭐ Permisos de BD por ciudad
│   └── Contiene bloques:
│       ├── /patrullas_mendoza
│       ├── /chat_mendoza
│       ├── /messages_mendoza
│       └── /webrtc_mendoza
│
├── public/
│   ├── login.html                    ← ⭐ Página de login
│   │   └── Redirige a control-center-v2 si eres admin/operador
│   │
│   ├── control-center-v2/
│   │   └── index.html                ← ⭐ Panel de control
│   │       ├── Lee custom claim 'city'
│   │       ├── Si city=null (admin), busca en localStorage
│   │       └── Contiene CITY_COORDS con mendoza: [-32.8895, -68.8458]
│   │
│   ├── data/
│   │   └── cities-config.json        ← ⭐ Configuración de ciudades
│   │       └── Contiene entrada para mendoza
│   │
│   ├── testing-patrullas.js          ← ⭐ Coordenadas de prueba
│   │   └── mendozaPatrullas: [{...}]
│   │
│   └── js/
│       └── auth-manager.js           ← ⭐ Gestiona login y roles
│           ├── Lee custom claims
│           ├── Redirige por rol
│           └── Valida permisos
```

---

## 📊 COMPARACIÓN: ADMIN vs OPERADOR vs PATRULLA

| Característica | Admin | Operador | Patrulla |
|---|---|---|---|
| **Email** | admin@seguridad-mdp.com | operador-mendoza-01@seguridad.com | patrulla-mendoza-01@seguridad.com |
| **Contraseña** | admin123 | control123 | patrulla123 |
| **Role** | admin | operador | patrulla |
| **City** | null (TODAS) | mendoza | mendoza |
| **URL** | /control-center-v2 | /control-center-v2 | /patrulla-app |
| **Ve patrullas** | De TODAS las ciudades | Solo de Mendoza | Solo su ubicación |
| **Puede cambiar ciudad** | Sí (via localStorage) | No (bloqueado a su ciudad) | No (solo app de patrulla) |

---

## 🚀 COMANDO RÁPIDO: Agregar Nueva Ciudad (Como Admin)

Cuando quieras agregar otra ciudad nueva:

```bash
# 1. Ejecutar script de creación
npm run create-city

# Responder preguntas:
# - Nombre: Rosario
# - ID: rosario
# - Provincia: Santa Fe
# - Latitud: -32.9517
# - Longitud: -60.6631
# - Patrullas: 3
# - Operadores: 1

# 2. Crear usuarios en Firebase
npm run setup-users

# 3. Desplegar cambios
firebase deploy --only firestore,hosting
```

---

## 🐛 TROUBLESHOOTING

### Problema: "No veo selector de ciudades en control-center-v2"
**Solución:** El control-center no tiene selector visible. Usa localStorage via consola como se indicó en PASO 3.

### Problema: "Entro como admin pero solo veo Mar del Plata"
**Solución:** 
1. Eso es normal (es la ciudad por defecto)
2. Abre consola (F12) y ejecuta:
   ```javascript
   localStorage.setItem('selectedCity', 'mendoza');
   location.reload();
   ```

### Problema: "No puedo crear usuarios de Mendoza"
**Solución:**
1. Verifica que setup-users.js tenga los usuarios
2. Verifica que ejecutaste `npm run setup-users`
3. Revisa que descargaste `serviceAccountKey.json`
4. Intenta de nuevo: `npm run setup-users`

### Problema: "Permiso denegado en Firestore"
**Solución:**
1. Verifica que firestore.rules tenga bloques de mendoza
2. Ejecuta: `firebase deploy --only firestore:rules`
3. Espera 1 minuto (Firebase tarda en actualizar)
4. Recarga la página

### Problema: "La coordenada de Mendoza está en el océano"
**Solución:** Las coordenadas correctas son:
- Latitud: -32.8895
- Longitud: -68.8458
- Zoom: 12

Si ves otra cosa, edita:
- `cities-config.json`
- `control-center-v2/index.html` (CITY_COORDS)

---

## 📝 RESUMEN VISUAL: FLUJO COMPLETO

```
┌─────────────────────────────────────────────────────────────┐
│ USUARIO: admin@seguridad-mdp.com                            │
└─────────────────────────────────────────────────────────────┘
          ↓
┌─────────────────────────────────────────────────────────────┐
│ URL: https://trafico-map-general-v2.web.app/login.html      │
│ Credenciales: admin123                                       │
└─────────────────────────────────────────────────────────────┘
          ↓
┌─────────────────────────────────────────────────────────────┐
│ Firebase Auth valida                                        │
│ Custom claims: { role: 'admin', city: null }                │
│ ✅ APROBADO                                                 │
└─────────────────────────────────────────────────────────────┘
          ↓
┌─────────────────────────────────────────────────────────────┐
│ Redirige a: /control-center-v2/                             │
│ Carga por defecto: mardelplata                              │
└─────────────────────────────────────────────────────────────┘
          ↓
┌─────────────────────────────────────────────────────────────┐
│ ¿Quieres ver Mendoza?                                       │
│ Opción 1 (Consola F12):                                     │
│   localStorage.setItem('selectedCity', 'mendoza');           │
│   location.reload();                                        │
│                                                              │
│ Opción 2 (Mapa público):                                    │
│   Ir a /index.html y usar dropdown de ciudades              │
└─────────────────────────────────────────────────────────────┘
          ↓
┌─────────────────────────────────────────────────────────────┐
│ ✅ VES:                                                     │
│  - Mapa centrado en Mendoza                                 │
│  - Patrullas de Mendoza en tiempo real                     │
│  - Chat de patrullas de Mendoza                            │
│  - Panel lateral con estadísticas                          │
└─────────────────────────────────────────────────────────────┘
```

---

## 🎯 PRÓXIMO PASO

Ya tienes Mendoza lista. Ahora:

1. **Login como Admin:** `admin@seguridad-mdp.com`
2. **Cambiar a Mendoza:** Via localStorage
3. **Login como Operador Mendoza:** `operador-mendoza-01@seguridad.com`
4. **Ver patrullas en tiempo real:** En el mapa

¡Listo! 🗺️
