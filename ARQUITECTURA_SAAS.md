# 🏛️ Arquitectura SaaS Multi-Municipio

**TraficoMapGeneral** es una plataforma **SaaS** diseñada para ser deployada por múltiples municipios. Cada municipio tiene su propia cuenta y ve solo sus datos.

---

## 🎯 Estructura

### URL Única Compartida
```
https://trafico-map-general-v2.web.app/
```

### Acceso por Municipio
```
Login 1: mdp@trafico.com → Ver Mar del Plata
Login 2: rosario@trafico.com → Ver Rosario
Login 3: cordoba@trafico.com → Ver Córdoba
```

**Extracción automática del municipio desde el email:**
```
usuario@mdp.trafico.com → municipio = "mdp"
usuario-rosario@trafico.com → municipio = "rosario"
admin-cordoba@trafico.com → municipio = "cordoba"
```

---

## 📁 Estructura de Datos

```
public/
├── data/
│   ├── mdp/                      ← Datos de Mar del Plata
│   │   ├── siniestros.geojson
│   │   ├── cameras.geojson
│   │   ├── private-cameras.geojson
│   │   ├── semaforos.geojson
│   │   └── barrios.geojson
│   ├── rosario/                  ← Datos de Rosario
│   │   ├── siniestros.geojson
│   │   ├── cameras.geojson
│   │   ├── private-cameras.geojson
│   │   ├── semaforos.geojson
│   │   └── barrios.geojson
│   └── cordoba/                  ← Datos de Córdoba
│       ├── siniestros.geojson
│       ├── cameras.geojson
│       ├── private-cameras.geojson
│       ├── semaforos.geojson
│       └── barrios.geojson
└── js/
    └── municipio-auth.js         ← Nuevo módulo de autenticación
```

---

## 🔐 Autenticación

### Módulo: `municipio-auth.js`

**Funciones principales:**

#### 1️⃣ Extraer municipio del email
```javascript
const municipioId = extractMunicipioFromEmail('admin@mdp.trafico.com');
// → 'mdp'
```

#### 2️⃣ Establecer municipio actual después del login
```javascript
handleMunicipioAuth(user.email); 
// → Extrae municipio, lo guarda en sessionStorage
```

#### 3️⃣ Obtener municipio en cualquier momento
```javascript
const municipio = getMunicipio();
// → 'mdp'

const config = getMunicipioConfig();
// → { name: 'Mar del Plata', center: [...], ... }
```

---

## 📊 API - Geocoding con Municipio

### Búsqueda de dirección con municipio
```javascript
// Búsqueda: "Mitre y San Martín" en Mar del Plata
const result = await geocodeAddressWithMunicipio('Mitre y San Martín', 'mdp');
// → { lat: -38.0055, lng: -57.5521, address: '...' }
```

### URL del API
```
GET /api/geocode?address=Mitre&municipio=mdp
GET /api/geocode?address=San%20Martín%20y%20Bolívar&municipio=rosario
```

**Parámetros:**
- `address` (requerido) - Dirección o cruce a buscar
- `municipio` (opcional, default='mdp') - Id del municipio

---

## 💰 Monitoreo de Costos - Por Municipio

### Estadísticas individuales
```javascript
const stats = await getGeocodingStats();
// Retorna estadísticas SOLO del municipio actual
```

**Response:**
```json
{
  "municipio": "mdp",
  "totalRequests": 125,
  "successfulRequests": 123,
  "failedRequests": 2,
  "costs": {
    "estimatedTotalCost": "$0.86"
  },
  "successRate": "98.4%",
  "averageResponseTime": "450ms"
}
```

### API Endpoint
```
GET /api/geocode-stats?municipio=mdp
```

### Estadísticas globales (Admin)
```
GET /api/geocode-stats-all

Response:
{
  "summary": {
    "totalRequests": 500,
    "totalEstimatedCost": "$3.50"
  },
  "municipios": {
    "mdp": { "totalRequests": 125, "estimatedCost": "$0.86" },
    "rosario": { "totalRequests": 200, "estimatedCost": "$1.40" },
    "cordoba": { "totalRequests": 175, "estimatedCost": "$1.22" }
  }
}
```

---

## 🗂️ Rutas de Datos

Usar la función helper:
```javascript
const ruta = getDataPath('siniestros', 'mdp');
// → 'data/mdp/siniestros.geojson'

const ruta = getDataPath('cameras'); // Usa municipio actual
// → 'data/mdp/cameras.geojson' (si estás logueado en mdp)
```

**Tipos soportados:**
- `'siniestros'` → siniestros.geojson
- `'cameras'` → cameras.geojson
- `'cameras-private'` → private-cameras.geojson
- `'semaforos'` → semaforos.geojson
- `'barrios'` → barrios.geojson

---

## 🔄 Integración con script.js

### Después del login
```javascript
// En script.js → onAuthStateChanged:
if (user) {
  // Tu código actual...
  
  // AGREGAR ESTO:
  const municipioId = handleMunicipioAuth(user.email);
  console.log(`✅ Municipio asignado: ${municipioId}`);
}
```

### Al cargar datos
```javascript
// Antes (viejo):
fetch('public/data/siniestros.geojson')

// Después (nuevo):
const path = getDataPath('siniestros');
fetch(path)
```

### Al buscar direcciones
```javascript
// Antes:
const result = await fetch(`/api/geocode?address=${query}`);

// Después:
const result = await geocodeAddressWithMunicipio(query);
// → Automáticamente usa el municipio del usuario
```

---

## 🚀 Implementación para Nuevo Municipio

Para agregar un nuevo municipio (ej: Mendoza):

### 1. Agregar configuración
```javascript
// En municipio-auth.js
const MUNICIPIOS_CONFIG = {
  // ... existentes ...
  'mendoza': {
    name: 'Mendoza',
    center: [-32.8895, -68.8458],
    zoom: 12,
    context: ', Mendoza, Argentina'
  }
};
```

### 2. Crear carpeta de datos
```bash
mkdir public/data/mendoza
```

### 3. Agregar datos
```
public/data/mendoza/
├── siniestros.geojson
├── cameras.geojson
├── private-cameras.geojson
├── semaforos.geojson
└── barrios.geojson
```

### 4. Crear usuario en Firebase
```
Email: usuario@mendoza.trafico.com
Contraseña: [asignar]
```

✅ **¡Listo!** El usuario accede a https://trafico-map-general-v2.web.app/ y automáticamente ve datos de Mendoza.

---

## 📋 Municipios Soportados (Ahora)

| Municipio | Email | Centro | Contexto |
|-----------|-------|--------|----------|
| Mar del Plata | `*@mdp.trafico.com` | -38.00, -57.55 | Mar del Plata, Argentina |
| Rosario | `*@rosario.trafico.com` | -32.94, -60.65 | Rosario, Argentina |
| Córdoba | `*@cordoba.trafico.com` | -31.41, -64.18 | Córdoba, Argentina |

---

## 💾 Base de datos

### Firestore (Autenticación + Configuración)
```
firestore/
├── users/
│   ├── user_mdp_1/
│   │   └── municipio: 'mdp'
│   ├── user_rosario_1/
│   │   └── municipio: 'rosario'
│   └── ...
└── municipios/
    ├── mdp/
    │   ├── name: 'Mar del Plata'
    │   ├── settings: {...}
    │   └── geocoding-stats: {...}
    ├── rosario/
    └── cordoba/
```

### Storage (Datos GeoJSON)
```
storage/
├── data/mdp/siniestros.geojson
├── data/mdp/cameras.geojson
├── data/rosario/siniestros.geojson
└── ...
```

---

## 🔧 Ejemplos de Uso

### Ejemplo 1: Búsqueda de dirección
```javascript
// Usuario logueado: mdp@trafico.com
const result = await geocodeAddressWithMunicipio('9 de Julio y Córdoba');
// → Busca en Mar del Plata automáticamente

// Result:
// {
//   lat: -38.0055,
//   lng: -57.5521,
//   address: '9 de Julio y Córdoba, Mar del Plata, Argentina'
// }
```

### Ejemplo 2: Ver estadísticas
```javascript
const stats = await getGeocodingStats();
console.log(`Costos de ${currentMunicipioConfig.name}: ${stats.costs.estimatedTotalCost}`);
// → "Costos de Mar del Plata: $0.86"
```

### Ejemplo 3: Cargar datos específicos
```javascript
const municipio = getMunicipio();
const camarasPath = getDataPath('cameras');

fetch(camarasPath)
  .then(r => r.json())
  .then(data => {
    console.log(`${data.features.length} cámaras en ${currentMunicipioConfig.name}`);
  });
```

---

## ✅ Checklist de Deployment

- [ ] Módulo `municipio-auth.js` integrado en `index.html`
- [ ] Función `handleMunicipioAuth()` llamada después de login
- [ ] Carpetas de datos creadas: `public/data/{mdp,rosario,cordoba}/`
- [ ] GeoJSON cargados en cada carpeta
- [ ] Endpoints de API actualizados (`/api/geocode`, `/api/geocode-stats`)
- [ ] script.js modificado para usar `getDataPath()` y `geocodeAddressWithMunicipio()`
- [ ] Usuarios creados en Firebase Authentication por municipio
- [ ] Prueba: Login con cada usuario y verificar que ve sus datos
- [ ] Push a GitHub y deploy a Firebase

---

**Última actualización:** Abril 2026
**Versión:** 2.1 (Multi-Municipio)
