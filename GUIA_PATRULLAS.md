# 🚓 Guía de Integración de Sistema de Patrullas

## Descripción General

El sistema de patrullas permite rastrear unidades móviles en tiempo real dentro de TraficoMapGeneral. Incluye:

- **GPS en Tiempo Real**: Actualización continua de ubicación
- **Chat**: Comunicación entre patrullas y centro de control
- **Sistema de Emergencia**: Activación rápida de alertas
- **Multi-municipio**: Soporte para múltiples ciudades/jurisdicciones
- **Estadísticas**: Velocidad, precisión, altitud

## Arquitectura

```
TraficoMapGeneral/
├── public/
│   ├── patrulla-app/
│   │   └── index.html          # Aplicación móvil para patrullas
│   ├── js/
│   │   └── patrulla-layer.js   # Módulo para mostrar patrullas en mapa
│   ├── centro-control/         # (Próximo) Centro de dispatching
│   └── app.js                  # Integración principal
├── firestore.rules              # Reglas de seguridad multi-municipio
└── firebase.json

MapaTraficoFinal/ (SIN CAMBIOS)
├── patrulla/                    # Original - no tocado
└── public/                      # Original - no tocado
```

## Firebase Collections (Multi-municipio)

### Patrullas
```
patrullas_{ciudadId}/{patenteMóvil}/
  ├── lat: number
  ├── lng: number
  ├── online: boolean
  ├── emergencia: boolean
  ├── estado: 'activo' | 'emergencia' | 'pausa'
  ├── accuracy: number (metros)
  ├── speed: number (m/s)
  ├── timestamp: timestamp
  └── gps_history/{} (subcolección)
```

### Chat
```
chat_{ciudadId}/{patenteMóvil}/messages/
  ├── text: string
  ├── from: string (patente)
  ├── to: string ('centro-control')
  ├── timestamp: timestamp
  └── leido: boolean
```

### WebRTC Signaling (futuro)
```
webrtc_{ciudadId}/{patenteMóvil}/
  ├── offer: RTCSessionDescription
  ├── answer: RTCSessionDescription
  ├── iceCandidates: array
  └── timestamp: timestamp
```

## Firebase Rules (Firestore)

Las reglas implementadas en `firestore.rules` garantizan:

```javascript
// Solo patrullas pueden escribir en su propia ubicación
match /patrullas_{municipio}/{patrolId} {
  allow write: if isPatrulla() && 
               getUserMunicipio() == municipio;
}

// Chat: lectura dentro del municipio
match /chat_{municipio}/{patrolId}/messages/{messageId} {
  allow read: if getUserMunicipio() == municipio;
}

// Separación completa entre municipios
```

**Tokens JWT requeridos:**
```javascript
{
  "municipio": "cordoba",        // Requerido
  "rol": "patrulla",              // 'patrulla', 'centro-control', 'admin'
  "patente": "PATRULLA_01",       // Identificador único
  "admin": false
}
```

## Pasos para Integración

### 1. Crear Usuario Patrulla en Firebase Auth

```javascript
// En Firebase Console o dentro de tu app
const newUser = await admin.auth().createUser({
  email: "patrulla@cordoba.gov.ar",
  password: generateSecurePassword(),
  customClaims: {
    municipio: "cordobita",
    rol: "patrulla",
    patente: "PATRULLA_01",
    admin: false
  }
});

// Guardar en Firestore
await db.collection('users').doc(newUser.uid).set({
  email: newUser.email,
  municipio: "cordoba",
  rol: "patrulla",
  patenteMóvil: "PATRULLA_01",
  createdAt: admin.firestore.FieldValue.serverTimestamp()
});
```

### 2. Registrar Nuevo Municipio

Actualizar `cities-config.json`:

```json
{
  "ciudades": {
    "cordoba": {
      "nombre": "Córdoba Capital",
      "latitud": -31.4135,
      "longitud": -64.1892,
      "zoom": 13,
      "capas": [...],
      "patrullas": {
        "enabled": true,
        "dataCollection": "patrullas_cordoba",
        "chatCollection": "chat_cordoba"
      }
    }
  }
}
```

### 3. Integración en app.js

```javascript
// Importar el módulo
const PatullaLayer = class { /* ... */ };

// Crear instancia cuando se carga la ciudad
const patullaLayer = new PatullaLayer(map, currentCity, db);
patullaLayer.show();

// Añadir checkbox en sidebar para mostrar/ocultar
document.getElementById('toggle-patrullas').addEventListener('change', (e) => {
  if (e.target.checked) {
    patullaLayer.show();
  } else {
    patullaLayer.hide();
  }
});

// Mostrar estadísticas
setInterval(() => {
  const total = patullaLayer.count();
  const online = patullaLayer.countOnline();
  const emergencia = patullaLayer.countEmergencia();
  
  console.log(`Patrullas: ${total} | Online: ${online} | Emergencia: ${emergencia}`);
}, 5000);
```

### 4. Interfaz Centro de Control (Próximo)

Crear `/public/centro-control/index.html`:

```html
<h2>🎛️ Centro de Control</h2>
<div id="patrullas-list"></div>
<div id="chat-panel"></div>
<div id="mapa-despacho"></div>
```

## URLs de Acceso

- **Mapa Principal**: `https://trafico-map-general-v2.web.app/`
- **App Patrullas**: `https://trafico-map-general-v2.web.app/patrulla-app/`
- **Centro Control**: `https://trafico-map-general-v2.web.app/centro-control/` (próximo)

## Testing Local

```bash
# 1. Iniciar servidor
npm start

# 2. Acceder a app patrullas
http://localhost:5000/patrulla-app/

# 3. Autenticarse con patrulla@cordoba.gov.ar

# 4. Activar GPS

# 5. Ver ubicación en tiempo real en mapa principal
http://localhost:5000/
```

## Características Implementadas

✅ GPS en tiempo real (watchPosition)
✅ Actualización a Firestore cada 5 segundos
✅ Markers en Leaflet con distintos iconos
✅ Chat basado en Firestore
✅ Control de emergencia
✅ Multi-municipio con colecciones separadas
✅ Firestore Rules de seguridad

## Características Proximamente

🟡 WebRTC para video P2P
🟡 Centro de control dispatcher
🟡 Historial GPS persistente
🟡 Geofencing (alertas de área)
🟡 Sincronización con sistema de 911
🟡 Grabación de video en Cloud Storage
🟡 Métricas de rendimiento

## Costos

| Feature | Costo |
|---------|-------|
| GPS + Chat | Firestore reads/writes (~$0.06 por 100k ops) |
| WebRTC | Gratis (P2P, no requiere servidor) |
| HLS (alternativa) | ~$0.065 por GB transmitido |
| Storage video | $0.020 por GB/mes |

**Estimado mensual (10 patrullas, 8 horas/día):**
- GPS updates: 10 × 8h × 3600s ÷ 5s = 57,600 writes = $0.35
- Chat: ~500 mensajes/día × 30 = $0.03
- **Total: ~$0.40/mes** ✨ (Sin video streamingg)

## Troubleshooting

### GPS no funciona
- Verificar permisos en navegador
- Usar HTTPS (necesario para geolocation)
- Comprobar `enableHighAccuracy: true`

### Chat no sincroniza
- Revisar Firestore Rules (verificar token.municipio)
- Comprobar colecciones existen: `chat_{municipio}` 
- Ver errores en Firebase Console

### Patrillas no aparecen en mapa
- Confirmar coordenadas (lat/lng) en Firestore
- Revisar zoom y bounds del mapa
- Activar GPS en app patrullas

### Múltiples municipios no funcionan
- Verificar custom claims en Firebase Auth
- Confirmar estructura: `patrullas_MUNICIPIO`
- Revisar Firestore Rules (match path)

## Contacto & Soporte

Para problemas o sugerencias:
- Firebase Console: https://console.firebase.google.com/u/0/project/trafico-map-general-v2/
- Logs: `console.log()` en navegador + Firebase emulator
