# 🏗️ Arquitectura Multi-Tenant - TraficoMap

## 📊 Estructura

```
trafico-map-general-v2 (Firebase único)
│
├─ clientes/ (colección de clientes)
│  ├─ laplata/
│  │  ├─ config/ (lat, lng, zoom, nombre, ciudad)
│  │  ├─ camaras/ (datos cargados por cliente)
│  │  ├─ siniestros/ (datos cargados por cliente)
│  │  ├─ semaforos/
│  │  ├─ robos/
│  │  ├─ escuelas/
│  │  ├─ operadores/ (personal del cliente)
│  │  ├─ patrullas/ (vehículos del cliente)
│  │  ├─ listas/ (listas compartidas)
│  │  └─ usuarios_clientes/ (usuarios con acceso)
│  │
│  └─ cordoba/
│     └─ (igual estructura)
│
├─ usuarios/ (usuarios clientes)
│  └─ {uid}
│     ├─ email: "..."
│     ├─ clienteId: "laplata" ← CLAVE PARA AISLAR DATOS
│     ├─ rol: "cliente"
│     └─ nombre: "..."
│
└─ admins/ (super admin)
   └─ {uid}
      ├─ email: "admin@..."
      ├─ rol: "super_admin"
      └─ nombre: "..."
```

---

## 🌐 URLs y Rutas

| Ruta | Usuario | Ver | Carga Datos | Propósito |
|------|---------|-----|-------------|-----------|
| `/` | Admin Super | Córdoba + Mar del Plata | NO | Demo para vender |
| `/admin` | Admin Super | Panel usuarios/clientes | - | Gestión del sistema |
| `/client` | Cliente | Panel panel de su ciudad | CSV cámaras, siniestros, etc | Panel principal cliente |
| `/map-cliente.html` | Cliente | Mapa de su ciudad | Cargado desde su colección | Visualización de datos |

---

## 🔐 Custom Claims (Firebase Auth)

Cada usuario tiene custom claims en su token:

```javascript
// Admin Super
{
  "rol": "super_admin"
}

// Cliente (ej: La Plata)
{
  "clienteId": "laplata",
  "rol": "cliente"
}
```

### Cómo se setean?

Via Firebase Admin SDK (en Cloud Functions o servidor):
```javascript
await admin.auth().setCustomUserClaims(uid, {
  clienteId: 'laplata',
  rol: 'cliente'
});
```

---

## 🔒 Firestore Security Rules

### Helpers

```javascript
function isSuperAdmin()
  return request.auth.token.rol == 'super_admin'
  
function isClienteUser()
  return request.auth.token.clienteId != null
  
function getUserClienteId()
  return request.auth.token.clienteId
```

### Reglas Clave

1. **Colección `clientes/{clienteId}`**:
   - Un cliente solo puede leer/escribir su propia colección
   - `request.auth.token.clienteId == {clienteId}`

2. **Subcollecciones dentro de cliente**:
   - Solo el cliente con ese ID puede acceder
   - ej: `clientes/laplata/camaras/` → solo usuario con `clienteId='laplata'`

3. **Admin**:
   - Pode leer todo
   - No tiene `clienteId`

---

## 📦 Provisioning (Crear Nuevo Cliente)

### Opción 1: Script Node.js

```bash
# Instalar dependencias
npm install firebase-admin

# Ejecutar script interactivo
node provision-client.js

# Seguir prompts:
# - ID cliente (ej: rosario)
# - Nombre (ej: Rosario)
# - Ciudad: (Rosario)
# - Email: client@rosario.com
# - ¿Crear usuario? (s/n)
```

### Opción 2: Cloud Function

Via Cloud Function HTTP trigger que llama a la clase `ClientProvisioner`.

### Estructura creada automáticamente

```
clientes/rosario/
├─ config { nombre, ciudad, email, lat, lng, zoom }
├─ camaras/ (vacío, esperando datos)
├─ siniestros/ (vacío)
├─ operadores/ (vacío)
├─ patrullas/ (vacío)
├─ semaforos/ (vacío)
├─ robos/ (vacío)
├─ escuelas/ (vacío)
└─ listas/ (vacío)

usuarios/{uid}
├─ email: "client@rosario.com"
├─ clienteId: "rosario"
├─ rol: "cliente"
└─ nombre: "client"
```

---

## 📝 Flujo para Cliente

### 1. Login

```
https://trafico-map-general-v2.web.app/login.html
Email: usuario@laplata.com
Pass: xxxxxxxx
```

### 2. Panel de Cliente

```
https://trafico-map-general-v2.web.app/client-data-panel.html
- Ver info de su ciudad
- Cargar archivos CSV (cámaras, siniestros, operadores, patrullas)
- Ver estadísticas en tiempo real
- Botón "Ir al Mapa"
```

### 3. Mapa del Cliente

```
https://trafico-map-general-v2.web.app/map-cliente.html?clienteId=laplata
- Visualizar datos cargados
- Filtros por capa
- Solo ve datos de su cliente
```

---

## 👨‍💻 Archivos Importantes

| Archivo | Propósito |
|---------|-----------|
| `firestore.rules` | Reglas de seguridad multi-tenant |
| `public/js/multi-tenant-auth.js` | Utilidades de autenticación |
| `public/client-data-panel.html` | Panel para cargar datos |
| `public/map-cliente.html` | Mapa para cada cliente |
| `provision-client.js` | Script para provisionar nuevos clientes |

---

## 🚀 Setup Inicial

### 1. Desplegar Firestore Rules

```bash
cd c:\Users\gparra\TraficoMapGeneral
firebase deploy --only firestore:rules
```

### 2. Crear Admin Super

```bash
node provision-client.js
# Opción: No crear cliente, solo crear admin via Firebase Console
```

### 3. Crear Cliente Demo (La Plata)

```bash
node provision-client.js
# Opción 1: Provisionar nuevo cliente
# ID: laplata
# Nombre: La Plata
# Ciudad: La Plata
# Email: demo@laplata.com
# Crear usuario: sí
```

### 4. Desplegar

```bash
firebase deploy
```

---

## 🔄 Flujo de Datos

```
1. Cliente login
   ↓
2. Firebase Auth valida
   ↓
3. Custom claims incluyen clienteId
   ↓
4. Cliente accede a /client-data-panel.html
   ↓
5. Panel obtiene clienteId del token
   ↓
6. Carga CSV (ej: camaras.csv)
   ↓
7. Sube a: clientes/{clienteId}/camaras/
   ↓
8. Firestore Rules validan:
   request.auth.token.clienteId == {clienteId}
   ↓
9. Datos guardados y visibles en mapa

```

---

## ✅ Checklist Implementación

- [x] Firestore rules multi-tenant
- [x] Auth utilities con clienteId
- [x] Panel cliente para cargar datos
- [x] Mapa cliente
- [x] Script provisioning
- [ ] Mapa admin con demo (Córdoba + Mar del Plata)
- [ ] Panel admin para gestionar clientes/usuarios
- [ ] Deploy

---

## 📞 Soporte

Para dudas o problemas:
1. Verificar logs en Firebase Console
2. Ver mensajes en DevTools (F12 → Console)
3. Ejecutar `firebase deploy --only firestore:rules` si hay permiso denied

