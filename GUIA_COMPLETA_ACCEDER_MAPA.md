# 🗺️ GUÍA COMPLETA: ACCEDER AL MAPA Y CONFIGURAR PATRULLAS EN MENDOZA

## 📍 PASO 1: ACCEDER AL MAPA

### URL del Mapa:
```
https://trafico-map-general-v2.web.app/control-center-v2/
```

### Credenciales para Mendoza:
```
Email:     operador-mendoza-01@seguridad.com
Contraseña: control123
```

---

## 🔐 PASO 2: FLUJO de CARGA DEL MAPA (QUÉ ARCHIVOS SE CARGAN)

Cuando entras al mapa, esto ocurre:

### 2.1 - El navegador carga primero:
```
1. public/index.html
   ➜ Referencia: public/control-center-v2/index.html
      
2. public/control-center-v2/index.html
   ✓ Lee ciudad actual de localStorage
   ✓ Carga Firebase SDK
   ✓ Llama a auth-manager.js
```

### 2.2 - Luego autenticación (auth-manager.js)
```
firebase.auth().signInWithEmailAndPassword(email, password)
   ↓
✓ Valida credenciales contra Firebase Auth
✓ Lee custom claims: { role: 'operador', city: 'mendoza' }
✓ Verifica que tengas rol 'operador' o 'admin'
   ↓
✓ ACCESO PERMITIDO al mapa
```

### 2.3 - Luego carga configuración de ciudades
```
public/data/cities-config.json
   ↓
   Lee estructura:
   {
     "id": "mendoza",
     "name": "Mendoza",
     "coordinates": { "lat": -32.8895, "lng": -68.8458 },
     "zoom": 12
   }
```

### 2.4 - Luego carga datos de Mendoza desde Firestore:
```
Firebase Firestore → De qué colecciones lee:

1. /patrullas_mendoza/*
   ➜ Lee cada patrulla registrada en Mendoza
   ➜ Muestra ubicación GPS actual de cada una
   
2. /chat_mendoza/*
   ➜ Lee mensajes entre patrullas y operador

3. /messages_mendoza/*
   ➜ Lee alertas y notificaciones

4. /webrtc_mendoza/*
   ➜ Lee información de video llamadas
```

### 2.5 - Finalmente renderiza:
```
✓ Mapa de Mendoza centrado en -32.8895, -68.8458
✓ Capas de: cámaras, siniestros, patrullas, alertas, etc.
✓ Panel lateral con lista de patrullas conectadas
✓ Chat en tiempo real
```

---

## 👮‍♂️ PASO 3: CÓMO CREAR PATRULLAS Y OPERADORES EN MENDOZA

### Esto es lo que hicimos (igual a La Plata):

#### ARCHIVO 1: `setup-users.js`
**Ubicación:** `TraficoMapGeneral/setup-users.js`

En este archivo definimos QUIÉN son los usuarios de Mendoza:

```javascript
// ========== MENDOZA ==========
{
  email: 'patrulla-mendoza-01@seguridad.com',
  password: 'patrulla123',
  role: 'patrulla',      // Patrulla de calle
  city: 'mendoza',
  displayName: 'Patrulla Mendoza 01'
},
{
  email: 'patrulla-mendoza-02@seguridad.com',
  password: 'patrulla123',
  role: 'patrulla',
  city: 'mendoza',
  displayName: 'Patrulla Mendoza 02'
},
{
  email: 'operador-mendoza-01@seguridad.com',
  password: 'control123',
  role: 'operador',      // Centro de control
  city: 'mendoza',
  displayName: 'Operador Mendoza 01'
}
```

**Cambiar número de patrullas:** Solo agregas más filas con patrulla-mendoza-03, 04, 05, etc.

---

#### ARCHIVO 2: `firestore.rules`
**Ubicación:** `TraficoMapGeneral/firestore.rules`

Define PERMISOS de lectura/escritura por ciudad:

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
  allow delete: if isAuthenticated();
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

---

#### ARCHIVO 3: `public/data/cities-config.json`
**Ubicación:** `TraficoMapGeneral/public/data/cities-config.json`

Define CONFIGURACIÓN de Mendoza en el mapa:

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
    "dataCollection": "patrullas_mendoza",      // Nombre colección Firestore
    "chatCollection": "chat_mendoza",
    "messagesCollection": "messages_mendoza",
    "webrtcCollection": "webrtc_mendoza"
  }
}
```

---

#### ARCHIVO 4: `public/testing-patrullas.js`
**Ubicación:** `TraficoMapGeneral/public/testing-patrullas.js`

Define COORDENADAS para pruebas de patrullas:

```javascript
// Mendoza
const mendozaPatrullas = [
  { nombre: "Patrulla 01", lat: -32.8895, lng: -68.8458 },  // Centro
  { nombre: "Patrulla 02", lat: -32.8950, lng: -68.8500 },  // Norte
  { nombre: "Patrulla 03", lat: -32.8850, lng: -68.8400 },  // Sur
];
```

---

#### ARCHIVO 5: `public/control-center-v2/index.html`
**Ubicación:** `TraficoMapGeneral/public/control-center-v2/index.html`

Define ZOOM y COORDENADAS del mapa:

```javascript
const CITY_COORDS = {
  // ... otras ciudades ...
  mendoza: {
    center: [-68.8458, -32.8895],
    zoom: 11
  }
};
```

---

## 🚀 PASO 4: EJECUTAR EL SETUP (Como se hizo con La Plata)

### 4.1 - Actualizar setup-users.js
Editar archivo y agregar los usuarios de Mendoza (ya está hecho ✅)

### 4.2 - Crear usuarios en Firebase
```bash
npm run setup-users
```

**Output esperado:**
```
✅ Creados: 3 (patrulla-mendoza-01, patrulla-mendoza-02, operador-mendoza-01)
✅ Ya existentes: 15
✅ Errores: 0
```

### 4.3 - Desplegar cambios
```bash
firebase deploy --only firestore,hosting
```

O en VS Code:
```
Ctrl + Shift + P → Tasks: Run Task → Firebase Deploy
```

---

## ✅ PASO 5: VERIFICAR QUE FUNCIONA

### 5.1 - Entrar como Operador
```
URL: https://trafico-map-general-v2.web.app/control-center-v2/
Email: operador-mendoza-01@seguridad.com
Password: control123
```

### 5.2 - Ver mapa con Mendoza
```
✓ El mapa carga centrado en Mendoza (-32.8895, -68.8458)
✓ Se ve panel lateral con "Patrullas Conectadas"
✓ Se ve chat en tiempo real
```

### 5.3 - Crear patrullas de prueba (opcional)
En la consola del navegador (F12):
```javascript
// Crea patrullas de prueba en el mapa
crearPatrullasPrueba()
```

---

## 📊 COMPARACIÓN: LA PLATA vs MENDOZA

| Elemento | La Plata | Mendoza | Archivo |
|----------|----------|---------|---------|
| **Email Patrulla** | patrulla-la-plata-01@seguridad.com | patrulla-mendoza-01@seguridad.com | setup-users.js |
| **Email Operador** | operador-la-plata-01@seguridad.com | operador-mendoza-01@seguridad.com | setup-users.js |
| **Colección DB** | patrullas_laplata | patrullas_mendoza | firestore.rules, cities-config.json |
| **Ciudad ID** | laplata | mendoza | cities-config.json |
| **Coordenadas** | -34.9205, -57.9557 | -32.8895, -68.8458 | cities-config.json, index.html |
| **Zoom Default** | 12 | 12 | cities-config.json, index.html |

---

## 🔄 SI QUIERES AGREGAR MÁS PATRULLAS EN MENDOZA

### Opción 1: Editar manualmente setup-users.js
1. Abrir `setup-users.js`
2. Buscar sección `// ========== MENDOZA ==========`
3. Copiar and pegar bloque de patrulla-mendoza-01
4. Cambiar el número: patrulla-mendoza-03, 04, 05, etc.
5. Ejecutar: `npm run setup-users`

### Opción 2: Usar el script automático
```bash
npm run create-city
# Responder preguntas, incluyendo número de patrullas deseado
```

---

## 🐛 TROUBLESHOOTING

### Problema: "Login no funciona"
**Solución:**
1. Verificar que ejecutaste `npm run setup-users` ✓
2. Verificar que ejecutaste `firebase deploy` ✓
3. Limpiar cache: Ctrl+Shift+Delete en navegador

### Problema: "No veo patrullas de Mendoza"
**Solución:**
1. Verificar que seleccionaste "Mendoza" en selector de ciudad
2. Verificar que firestore.rules tiene bloques de mendoza
3. Ejecutar: `crearPatrullasPrueba()` en consola para crear patrullas de prueba

### Problema: "Permiso denegado en Firestore"
**Solución:**
1. Verificar que firestore.rules tiene `allow read/write: if isAuthenticated();`
2. Verificar que tu usuario tiene role 'operador' o 'admin'
3. Redeploy firestore rules: `firebase deploy --only firestore:rules`

---

## 📝 RESUMEN: LO QUE OCURRE INTERNAMENTE

Cuando logueas como **operador-mendoza-01@seguridad.com**:

```
1️⃣ AUTENTICACIÓN
   ├─ Firebase Auth valida credenciales
   ├─ Lee custom claims: { role: 'operador', city: 'mendoza' }
   └─ Redirige a control-center-v2/

2️⃣ CARGA MAPA
   ├─ Lee cities-config.json → Busca "mendoza"
   ├─ Centra en -32.8895, -68.8458
   ├─ Establece zoom = 12
   └─ Conecta a Firestore

3️⃣ CONECTA A FIRESTORE
   ├─ Lee /patrullas_mendoza/
   ├─ Lee /chat_mendoza/
   ├─ Escucha eventos en tiempo real
   └─ Muestra patrullas en mapa

4️⃣ RENDERIZA UI
   ├─ Mapa con patrullas de Mendoza
   ├─ Panel lateral con lista de patrullas
   ├─ Chat en tiempo real
   └─ Botones de control
```

---

## 🎯 PRÓXIMOS PASOS

**Cuando quieras agregar una nueva ciudad:**

1. Ejecuta: `npm run create-city`
2. Responde las 7 preguntas (nombre, ID, coordenadas, patrullas, operadores)
3. Ejecuta: `npm run setup-users`
4. Ejecuta: `firebase deploy`
5. ¡Listo!

El script automatizará todos estos 5 archivos. ✨
