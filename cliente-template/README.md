# Cliente Template - TraficoMap SaaS

Template reusable para crear nuevas instancias de TraficoMap por municipio.

## Estructura

```
cliente-template/
├── public/
│   ├── index.html              # HTML adaptado para config.json
│   ├── config.json             # Configuración del cliente (PERSONALIZAR POR CLIENTE)
│   ├── css/                    # Estilos (mismo del demo)
│   ├── js/
│   │   ├── app.js              # Adaptado para leer window.CONFIG (PERSONALIZADO)
│   │   ├── verificar-suscripcion.js   # Verifica suscripción contra admin Firebase
│   │   └── [otros módulos JS]  # Copiados del demo sin cambios
│   └── data/
│       ├── cities-config.json  # Configuración de ciudades (demo)
│       └── [datos por cliente] # Barrios, siniestros, cámaras, etc.
├── firebase/
│   └── firestore.rules         # Reglas Firestore genéricas (sin sufijos de ciudad)
└── README.md
```

## Pasos para crear un nuevo cliente

### 1. Duplicar la carpeta template

```bash
cp -r cliente-template cliente-CIUDAD
```

### 2. Personalizar `config.json`

Editar `cliente-CIUDAD/public/config.json`:

```json
{
  "metadata": {
    "cliente": "Municipio de La Plata",
    "fecha_creacion": "2024-01-18",
    "version": "2.0",
    "soporte": "soporte@traficomap.com"
  },
  "ciudad": {
    "id": "la-plata",
    "nombre": "La Plata",
    "provincia": "Buenos Aires",
    "coordenadas": {
      "lat": -34.9215,
      "lng": -57.9544
    },
    "dominio_registrado": "laplatamaps.municip.gov.ar"
  },
  "suscripcion": {
    "id": "SUB_12345",
    "plan": "profesional",
    "fecha_inicio": "2024-01-18",
    "fecha_expiracion": "2025-01-18",
    "estado": "activo",
    "stripe_id": "sub_stripe_12345"
  },
  "firebase_cliente": {
    "apiKey": "AIza...",
    "authDomain": "laplatamaps.firebaseapp.com",
    "projectId": "laplatamaps",
    "storageBucket": "laplatamaps.appspot.com",
    "messagingSenderId": "123456789",
    "appId": "1:123456789:web:abc123def456"
  },
  "firebase_verificacion": {
    "projectId": "trafico-map-general-v2",
    "apiKey": "AIza...",
    "authDomain": "trafico-map-general-v2.firebaseapp.com"
  },
  "caracteristicas": {
    "patrullas_enabled": true,
    "chat_enabled": true,
    "video_enabled": true,
    "limite_usuarios": 50,
    "limite_siniestros": 100000,
    "limite_camaras": 5000
  },
  "admin": {
    "email": "admin@laplatamaps.municip.gov.ar",
    "nombre": "Admin La Plata"
  }
}
```

**Campos críticos:**
- `ciudad.id`: ID único de la ciudad (usado en Firebase)
- `suscripcion.id`: ID de suscripción (validado en verificar-suscripcion.js)
- `firebase_cliente`: Credenciales del Firebase del CLIENTE (crear nuevo proyecto)
- `firebase_verificacion`: Siempre apunta a `trafico-map-general-v2` (tu Firebase)

### 3. Crear Firebase Project para el cliente

En Firebase Console:

1. Crear nuevo proyecto: `laplatamaps`
2. Obtener credenciales Web
3. Copiar en `firebase_cliente` de config.json
4. Copiar `firestore.rules` desde este template
5. Desplegar reglas: `firebase deploy --only firestore:rules`

### 4. Cargar datos de la ciudad

En `public/data/`:
- `barrios.geojson` - Polígonos de barrios
- `siniestros.csv` - Siniestros históricos
- `cameras.geojson` - Cámaras públicas
- `private_cameras.csv` - Cámaras privadas
- `linea1.geojson`, `linea2.geojson` - Líneas de colectivos

Ver formato esperado en `/EJEMPLO_*.csv` del proyecto raíz.

### 5. Configurar `cities-config.json`

Editar `public/data/cities-config.json` para incluir la nueva ciudad:

```json
{
  "id": "la-plata",
  "name": "La Plata",
  "provincia": "Buenos Aires",
  "coordinates": {
    "lat": -34.9215,
    "lng": -57.9544
  },
  "zoom": 12,
  "files": {
    "barrios": "data/barrios.geojson",
    "siniestros": "data/siniestros.csv",
    "cameras": "data/cameras.geojson",
    "private_cameras": "data/private_cameras.csv"
  },
  "optionalLayers": {
    "semaforos": "data/semaforos.csv",
    "colegios": "data/colegios.csv",
    "corredores": "data/corredores.geojson"
  }
}
```

### 6. Desplegar

**Opción A: Netlify/Vercel**
```bash
npm run build
npm run deploy
```

**Opción B: Manual**
```bash
cd cliente-CIUDAD/public
# Subir contenido a servidor web o Firebase Hosting
```

## Sistema de Verificación de Suscripción

El archivo `verificar-suscripcion.js` verifica automáticamente:

1. **Antes de cargar la app**: Conecta a `firebase_verificacion` (tu Firebase)
2. **Busca documento**: `/subscripciones/{suscripcion_id}` en tu Firebase
3. **Valida**:
   - ✅ Documento existe
   - ✅ `estado` = "activo"
   - ✅ `fecha_expiracion` > fecha actual
   - ✅ Mostrar alerta si expira en <7 días
4. **Si falla**: Bloquea la interfaz con modal de error

Cache: Valida 1 vez por hora (localStorage).

## Archivos Clave Adaptados

### 1. `index.html` (ADAPTADO)
- Carga `config.json` antes que nada
- Inicializa Firebase con `window.CONFIG?.firebase_cliente`
- NO muestra selector de ciudad
- Carga `verificar-suscripcion.js` antes de `app.js`

### 2. `app.js` (ADAPTADO - Línea 83)
```javascript
// ANTES (demo):
let currentCity = 'mar-del-plata';

// AHORA (template):
let currentCity = window.CONFIG?.ciudad?.id || 'cordoba';
```

### 3. `verificar-suscripcion.js` (NUEVO)
- 215 líneas
- Función: `verificarSuscripcion()`
- Ejecuta automáticamente al cargar
- Puede re-verificar: `window.reVerificarSuscripcion()`

### 4. `firestore.rules` (GENÉRICO)
- Sin sufijos de ciudad en colecciones
- Roles: `user`, `operador`, `admin`
- Seguridad: DENY-all por defecto

## Configuración por Plan (ejemplo)

```json
// Plan BÁSICO
"caracteristicas": {
  "patrullas_enabled": false,
  "chat_enabled": false,
  "video_enabled": false,
  "limite_usuarios": 10,
  "limite_siniestros": 10000
}

// Plan PROFESIONAL
"caracteristicas": {
  "patrullas_enabled": true,
  "chat_enabled": true,
  "video_enabled": false,
  "limite_usuarios": 50,
  "limite_siniestros": 100000
}

// Plan ENTERPRISE
"caracteristicas": {
  "patrullas_enabled": true,
  "chat_enabled": true,
  "video_enabled": true,
  "limite_usuarios": 500,
  "limite_siniestros": 1000000
}
```

## Mantenimiento

### Actualizar template
Si necesitas cambios en app.js o módulos:

1. Edita en `/public/js/` (demo)
2. TEST completamente
3. Copia a `/cliente-template/public/js/`
4. Aplica a clientes existentes (coordinar)

### Rotar suscripción
Para renovar cliente:

1. Editar en su `config.json`: `fecha_expiracion`
2. O actualizar directamente en `/subscripciones/{id}` de tu Firebase
3. Cliente verá alerta automáticamente

## Troubleshooting

### "Suscripción expirada"
- Verificar `config.json`: `suscripcion.fecha_expiracion`
- Verificar en tu Firebase: `/subscripciones/{id}`
- Ejecutar: `window.reVerificarSuscripcion()` en console

### "Ciudad no encontrada"
- Verificar `config.json`: `ciudad.id` existe en `cities-config.json`
- Verificar carpeta `public/data/` tiene archivos para esa ciudad

### Firebase auth falla
- Verificar `firebase_cliente` en config.json
- Verificar reglas Firestore (copiar desde `firebase/firestore.rules`)
- Verificar usuario existe en el Firebase del cliente

### Mapa vacío (sin capas)
- Verificar archivos en `public/data/` (barrios.geojson, siniestros.csv, etc.)
- Verificar rutas en `cities-config.json`
- Verificar en DevTools → Network si archivos cargan

## Próximos Pasos (Fase 2B)

- Script PowerShell: `crear-cliente.ps1` (automatiza pasos 1-5)
- Panel Admin: Gestionar clientes, suscripciones, renovaciones
- API Firebase: Crear clientes sin UI manual
