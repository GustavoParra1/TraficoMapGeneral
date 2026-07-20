# TraficoMap General - Sistema de Monitoreo y Gestión Municipal SaaS

Plataforma integral para municipios: monitoreo de tráfico público (mapa interactivo) **más** un panel de gestión privado con administración de clientes, facturación, patrullas/operarios y una app de denuncias vecinales con sistema de pánico por radio geográfico.

El proyecto tiene dos grandes módulos que conviven en el mismo repositorio:

1. **Mapa público de tráfico** — visualización de siniestros, cámaras, semáforos y barrios (el módulo original).
2. **Panel de gestión / SaaS multi-cliente** — administración, facturación, patrullas, operarios, vecinos, denuncias y alertas de pánico (agregado posteriormente).

---

## 🗺️ Módulo 1: Mapa de Tráfico

### Arquitectura SaaS Multi-Municipio

Una URL compartida, múltiples municipios.

```
Login: mdp@trafico.com  → Ver datos de Mar del Plata
Login: rosario@trafico.com → Ver datos de Rosario
Login: cordoba@trafico.com → Ver datos de Córdoba
```

Ver: [ARQUITECTURA_SAAS.md](ARQUITECTURA_SAAS.md)

### Características

- 📍 Mapeo interactivo con Leaflet.js + Google Maps Geocoding
- 🔍 Búsqueda inteligente — encuentra calles e intersecciones con precisión
- 🔥 Mapa de calor de siniestros (density visualization)
- 📷 Cámaras públicas y privadas en tiempo real
- 🎚️ Filtros avanzados por año, causa, participantes, horarios
- 🌐 Multi-municipio — cada municipio con su propia cuenta y datos
- 🎨 Interfaz moderna y responsive
- ⚡ Performance optimizado con clustering
- 🔐 Autenticación Firebase por municipio
- 💰 Monitoreo de costos Google Maps API

### Datos soportados

**Siniestros (Traffic Accidents)**
- Opción A: CSV con Latitud/Longitud directo ⭐
- Opción B: CSV con Camera ID lookup
- Opción C: GeoJSON

**Cámaras Públicas** — coordenadas GPS, tipos (Municipal, Escolar, Seguimiento, Privada), equipamiento (Domos, Fijas, LPR), información de barrio/corredor/monitoreo

**Cámaras Privadas** — establecimientos (escuelas, comercios, etc.), nombre, tipo, ubicación, búsqueda por barrio

**Semáforos** — estado activo/inactivo, intersecciones, distribución geográfica

**Barrios/Zonas** — REQUERIDO: GeoJSON con polígonos, filtrado geográfico, análisis por zona

### Inicio rápido

**1. Preparar datos** — Ver [GUIA_IMPORTAR_DATOS.md](GUIA_IMPORTAR_DATOS.md)

Ejemplos disponibles: `EJEMPLO_siniestros_con_coords.csv`, `EJEMPLO_cameras_publicas.csv`, `EJEMPLO_cameras_privadas.csv`, `EJEMPLO_semaforos.csv`, `EJEMPLO_barrios.geojson`

**2. Convertir a GeoJSON**
```bash
python convert-csv-to-geojson.py
```

**3. Importar en aplicación** — Botón ➕ Importar Nueva Ciudad (nombre de ciudad, archivos de barrios/siniestros/cámaras, capas opcionales)

### Estructura de datos

**Siniestros (CSV con coords)**
```
lat,lng,nombre,tipo,fecha,barrio,descripcion
-38.0055,-57.5521,Siniestro 1,choque,15/01/2024,Centro,...
```

**Cámaras Públicas (CSV)**
```
camera_number,lat,lng,address,barrio,type,domes,fixed,lpr
100,-38.0055,-57.5521,Mitre 1200,Centro,Pública (Municipal),1,2,1
```

**Barrios (GeoJSON)**
```json
{
  "type": "Feature",
  "geometry": { "type": "Polygon", "coordinates": [[[-57.55, -38.00], ...]] },
  "properties": { "nombre": "Centro" }
}
```

### Visualización

**Marcadores de siniestros** — cluster groups automáticos, colores por causa (20 tipos diferentes), popups con causa/fecha/hora/dirección/barrio/participantes

**Iconos de cámaras** — tamaño 24px (refinado, no invasivo), bordes negro tenue (1px, 20% opacidad), números font weight 300 (delicado), verde esmeralda #77DD99

**Mapa de calor** — gradiente azul (baja) → rojo (alta densidad), toggle en panel lateral 🔥 Mapa de Calor

### Tecnología (mapa)

**Frontend:** Leaflet.js, Leaflet MarkerCluster, Leaflet Heat, Vanilla JavaScript (sin frameworks)
**Data:** GeoJSON (formato principal), CSV (importación flexible), PostGIS (queries geográficas)

### Flujo de importación

```
CSV/GeoJSON
  ↓
convert-csv-to-geojson.py (flexible coords)
  ├→ Lee CSV (múltiples encodings)
  ├→ Busca Latitud/Longitud directo ⭐
  ├→ Si no: Camera ID lookup
  ├→ Si no: Fallback [0,0]
  ↓
siniestros_con_ubicacion.geojson
  ↓
Firebase (deploy)
  ↓
Mapa (carga GeoJSON + cache busting)
  ↓
Renderiza clusters + heatmap
```

### Estadísticas (Mar del Plata, actual)

- ✅ 3,797 siniestros (Camera ID lookup)
- ✅ 693 cámaras públicas
- ✅ 423 cámaras privadas
- ✅ 1,335 semáforos
- ✅ 124 barrios/zonas

---

## 🏢 Módulo 2: Panel de Gestión / SaaS Multi-Cliente

Sistema completo de administración municipal, separado del mapa público, con Firestore como base de datos y Cloud Functions como backend.

### Roles y accesos

| Rol | Descripción | Acceso |
|---|---|---|
| `admin` / `superadmin` | Administrador del municipio/cliente | Panel completo: clientes, billing, usuarios |
| `patrulla` | Personal de patrulla en calle | App de patrullas, chat, ubicación en vivo |
| `operario` | Operador de centro de control | Panel de denuncias, chat con vecinos |
| `vecino` | Vecino registrado | App de denuncias + botón de pánico |

Los roles y el `cliente_id` se asignan vía **Firebase Auth custom claims**, seteados por las Cloud Functions al crear cada tipo de usuario.

### Estructura de datos (Firestore)

```
clientes/{clienteId}
  ├─ (datos del cliente: nombre, plan, email_admin, suscripción...)
  ├─ patrullas/{patrullaId}       — ubicación en vivo, estado, emergencia
  ├─ operarios/{operarioId}       — datos del operador
  ├─ vecinos/{uid}                — datos, lat/lng, fcm_token, ubicacion_actualizada_en
  └─ denuncias/{denunciaId}       — categoría, texto, foto, lat/lng, estado
       └─ mensajes/{mensajeId}    — chat de esa denuncia (vecino ↔ operario/vecinos cercanos)

subscripciones/{subscripcionId}   — plan, precio, vencimiento
billing/{facturaId}               — facturas, estado de pago
auditoria/{auditoriaId}           — registro de acciones (pagos, cambios de estado)
```

### Cloud Functions principales (`functions/index.js`)

**Gestión de clientes y usuarios**
- `criarClienteAdmin` — crea un cliente nuevo (Auth + Firestore + suscripción + factura inicial)
- `eliminarCliente` — borra un cliente y sus datos asociados
- `crearPatrulaAdmin` / `crearOperarioAdmin` / `crearVecinoAdmin` — crean cuentas con sus claims correspondientes
- `loginClientePanel` — login del panel del cliente contra Firestore
- `getClientFirebaseConfig` — devuelve config de Firebase según el `cliente_id` del usuario autenticado
- `setCustomClaimsOnCreate` — trigger en creación de usuario Auth (informativo; los claims reales los asignan las funciones callable de arriba)

**Billing**
- `enviarFacturaEmail` — envía una factura por email vía Gmail/nodemailer (requiere `functions/.env` con `GMAIL_USER`/`GMAIL_PASS`, una contraseña de aplicación de Gmail)
- Endpoints HTTP (`adminApi`, Express): `/cambiarPlan`, `/registrarPago`, `/renovarSubscripcion`, `/toggleUserStatus`, `/updateCustomClaims`, `/health`

**Pánico por radio** 🚨
- `onPanicoCreado` — trigger `onCreate` en `clientes/{clienteId}/denuncias/{denunciaId}`. Cuando `categoria === 'panico'`, calcula (fórmula de Haversine) qué vecinos están a menos de 300m del que activó la alerta, usando su última ubicación reportada (descartando ubicaciones de más de 6hs o con coordenadas inválidas `(0,0)`), y les manda una notificación push (FCM, payload data-only para garantizar control total del click) con los datos de la alerta.

### Apps del lado del cliente (todas PWA, Firebase v8 compat)

**App de vecinos** (`public/vecino-app/`)
- Envío de denuncias comunes (categoría, texto, foto, GPS)
- Botón de pánico 🚨 — crea una denuncia especial (`categoria: 'panico'`) con ubicación
- Tracking de ubicación en background (`watchPosition`) para poder recibir alertas de vecinos cercanos
- Sección "Alertas Cercanas" — pánicos activos de otros vecinos dentro de 300m, con chat identificado (nombre real, no anónimo) y botón para cerrar la alerta (visible para quien la activó)
- Notificaciones push reales (llegan con la app cerrada/pantalla bloqueada) vía Service Worker (`sw.js`) + Firebase Cloud Messaging
- Al tocar la notificación, navega directo a esa alerta específica con scroll y resaltado automático
- Banner de instalación PWA con instrucciones según iOS/Android (las notificaciones push solo funcionan si la app está instalada, no como pestaña normal de Chrome/Safari)

**Panel de denuncias** (`public/admin/denuncias/` + `js/denuncias-control.js`)
- Lista en tiempo real de todas las denuncias del cliente, con alerta sonora para pánicos nuevos
- Chat con el vecino, marcar como leída, borrar (individual o por rango de fechas)
- Botón "Cerrar alerta" para pánicos activos, contador de vecinos notificados

**Panel de billing** (`public/admin/billing/` + `js/billing-manager.js`)
- Dashboard de ingresos, facturas pendientes/vencidas
- Registrar pago, ver detalle de factura, enviar factura por email (real, vía `enviarFacturaEmail`)

**Dashboard admin (SPA)** (`public/admin/js/dashboard.js`)
- Rutas por hash (`#dashboard`, `#clientes`, `#subscripciones`, `#usuarios`) dentro de `admin/index.html`
- Billing y Denuncias son páginas separadas (`admin/billing/`, rutas de denuncias), no parte de esta SPA

### Notas técnicas importantes

- **Firebase v8 (compat/namespaced)** en todo el frontend — no v9 modular. Ojo al buscar documentación: métodos como `setBackgroundMessageHandler` (no `onBackgroundMessage`, que es de v9) son los correctos acá.
- **Cache busting manual**: los `<script>` se referencian con `?v=N` (ej. `vecino-app.js?v=3`). Al modificar un archivo JS referenciado así, hay que **subir ese número**, o el navegador puede seguir sirviendo una copia vieja en caché indefinidamente.
- **PWA + Service Worker**: cambios en `sw.js` requieren que el usuario reinstale la PWA (o al menos borre datos del sitio) para tomar la versión nueva — el navegador cachea el Service Worker de forma persistente.
- **Reglas de Firestore** (`firestore.rules`) hoy están abiertas (`allow read, write: if true`) — pendiente de un endurecimiento completo que requiere auditar todas las colecciones en uso antes de restringir, para no romper funcionalidad existente.

---

## 🚀 Deploy

```bash
firebase login
firebase deploy --only hosting              # solo el frontend
firebase deploy --only functions:NOMBRE     # una función específica (recomendado sobre deployar todas)
```

### Desarrollo local

```bash
# Convertir datos del mapa
python convert-csv-to-geojson.py

# Servir local
npx http-server public/
# O con Firebase
firebase serve
```

### Archivos de configuración NO versionados (gitignored, transferir manualmente entre máquinas)

- `functions/.env` — credenciales de Gmail (`GMAIL_USER`, `GMAIL_PASS`) para `enviarFacturaEmail`
- `functions/service-account-key.json` y `functions/*-firebase-adminsdk*.json` — credenciales de servicio de Firebase Admin
- `.firebaserc` — proyecto de Firebase por defecto para el CLI

---

## 🔧 Desarrollo

### Agregar nuevo tipo de datos (mapa)
1. Crear módulo en `public/js/nuevo-layer.js`
2. Seguir patrón: `init()`, `load()`, `toggle()`, `render()`
3. Cargar en `app.js`: `NuevoLayer.init(map)`
4. Agregar checkbox en HTML/app.js

### Mejorar rendimiento
- Clustering automático (MarkerCluster)
- Cache busting: `?t=timestamp`
- WebWorkers para procesamiento pesado
- Índices geográficos (PostGIS)
- Índices compuestos de Firestore para queries con múltiples `where` (ej. `categoria` + `timestamp`)

---

## 🆘 Soporte

### Problemas comunes

| Problema | Solución |
|---|---|
| Siniestros en [0,0] | Agregar lat/lng o camera ID |
| Encoding corrupto | Guardar CSV como UTF-8 |
| Caché antigua | Cache busting automático (mapa) / subir manualmente `?v=N` (apps del panel) |
| Barrios no filtran | Cargar GeoJSON primero |
| Vecino no recibe notificación push | Confirmar: app instalada como PWA (no pestaña normal), permisos de ubicación y notificaciones otorgados, `lat`/`lng` del vecino no sean `(0,0)`, token FCM guardado en Firestore |
| Falla query con `where` compuesto | Crear el índice de Firestore que pide el link de error en consola |

Ver: [GUIA_IMPORTAR_DATOS.md](GUIA_IMPORTAR_DATOS.md)

---

## 📄 Licencia

Proyecto municipal - Uso interno

---

**Última actualización:** Julio 2026
**Versión:** 3.0 (Sistema de gestión + pánico por radio geográfico)
**Base de datos del mapa:** Mar del Plata (3,797 siniestros)