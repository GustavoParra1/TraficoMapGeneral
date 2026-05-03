# TraficoMap Admin API - Cloud Functions

## Overview
API REST orquestada por Cloud Functions que maneja:
- Creación de clientes
- Gestión de suscripciones
- Procesamiento de pagos
- Control de usuarios admin

## Base URL
```
https://us-central1-trafico-map-general-v2.cloudfunctions.net/adminApi
```

## Endpoints

### 1. POST /criarCliente
Crear nuevo cliente con toda su infraestructura

**Request:**
```json
{
  "nombreCliente": "La Plata",
  "email": "admin@laplata.gov.ar",
  "plan": "profesional",
  "ciudad": "La Plata",
  "telefono": "+54 221 4234500"
}
```

**Response (200):**
```json
{
  "success": true,
  "cliente": {
    "id": "cli_1704067200000_abc123def456",
    "nombre": "La Plata",
    "email": "admin@laplata.gov.ar",
    "plan": "profesional",
    "estado": "activo",
    "api_key": "sk_1704067200000_abc123def456789...",
    "created_at": "2024-01-01T12:00:00.000Z"
  },
  "subscripcion": {
    "id": "sub_1704067200000",
    "cliente_id": "cli_1704067200000_abc123def456",
    "plan": "profesional",
    "precio_mensual": 5000,
    "precio_anual": 60000,
    "expiration_date": "2025-01-01T12:00:00.000Z"
  },
  "billing": {
    "id": "fac_1704067200000",
    "cliente_id": "cli_1704067200000_abc123def456",
    "monto": 60000,
    "estado": "pendiente"
  },
  "admin_user": {
    "email": "admin-cli_1704067200000_abc123def456@trafico-map.clients",
    "password": "Temp@Secure123!Pass",
    "uid": "firebase_uid_here"
  }
}
```

**Error (400/500):**
```json
{
  "error": "Descripción del error"
}
```

---

### 2. POST /cambiarPlan
Cambiar plan de una suscripción

**Request:**
```json
{
  "subscripcionId": "sub_1704067200000",
  "nuevoPlan": "enterprise"
}
```

**Response (200):**
```json
{
  "success": true,
  "cambio": {
    "fecha": "2024-01-15T12:00:00.000Z",
    "plan_anterior": "profesional",
    "plan_nuevo": "enterprise",
    "precio_anterior": 5000,
    "precio_nuevo": 15000
  },
  "nueva_suscripcion": {
    "plan": "enterprise",
    "precio_mensual": 15000
  }
}
```

**Notas:**
- Si hay diferencia de precio, se crea automáticamente una factura
- Se registra en historial de cambios
- Los cambios son retroactivos al mes actual

---

### 3. POST /registrarPago
Registrar pago de una factura

**Request:**
```json
{
  "facturaId": "fac_1704067200000",
  "metodo_pago": "transferencia",
  "referencias": {
    "numero_comprobante": "CPF20240115001",
    "banco": "Santander"
  }
}
```

**Response (200):**
```json
{
  "success": true,
  "factura_id": "fac_1704067200000",
  "estado": "pagada",
  "fecha_pago": "2024-01-15T12:00:00.000Z"
}
```

---

### 4. POST /updateCustomClaims
Actualizar claims de usuario (role, permisos)

**Request:**
```json
{
  "uid": "firebase_uid_abc123",
  "claims": {
    "role": "operator",
    "cliente_id": "cli_1704067200000_abc123def456",
    "permisos": ["read", "update"]
  }
}
```

**Response (200):**
```json
{
  "success": true,
  "uid": "firebase_uid_abc123",
  "claims": {
    "role": "operator",
    "cliente_id": "cli_1704067200000_abc123def456"
  }
}
```

---

### 5. POST /toggleUserStatus
Activar/desactivar usuario

**Request:**
```json
{
  "uid": "firebase_uid_abc123",
  "disabled": true
}
```

**Response (200):**
```json
{
  "success": true,
  "uid": "firebase_uid_abc123",
  "disabled": true
}
```

---

### 6. POST /renovarSubscripcion
Renovar suscripción por 1 año adicional

**Request:**
```json
{
  "subscripcionId": "sub_1704067200000"
}
```

**Response (200):**
```json
{
  "success": true,
  "subscripcion_id": "sub_1704067200000",
  "nuevo_vencimiento": "2026-01-01T12:00:00.000Z",
  "factura": {
    "id": "fac_renewal_1704067200000",
    "monto": 60000,
    "estado": "pendiente"
  }
}
```

---

### 7. GET /health
Verificar estado de la API

**Request:**
```bash
curl https://us-central1-trafico-map-general-v2.cloudfunctions.net/adminApi/health
```

**Response (200):**
```json
{
  "status": "OK",
  "timestamp": "2024-01-15T12:00:00.000Z",
  "version": "1.0.0"
}
```

---

## Planes y Precios

| Plan | Precio Mensual | Precio Anual |
|------|---|---|
| Básico | $1,000 | $12,000 |
| Profesional | $5,000 | $60,000 |
| Enterprise | $15,000 | $180,000 |

---

## Integración con Admin Panel

Estos endpoints son llamados desde el admin panel (`/admin/js/` managers):

1. **clientes-manager.js** → Llama `/criarCliente`
2. **subscripciones-manager.js** → Llama `/cambiarPlan` y `/renovarSubscripcion`
3. **billing-manager.js** → Llama `/registrarPago`
4. **usuarios-manager.js** → Llama `/updateCustomClaims` y `/toggleUserStatus`

---

## Firestore Collections Afectadas

- `clientes/` - Documentos de clientes
- `subscripciones/` - Suscripciones activas
- `billing/` - Facturas y pagos

---

## Error Handling

### Validación
```json
{ "error": "Faltan datos requeridos" }
{ "error": "Plan inválido" }
```

### No Encontrado (404)
```json
{ "error": "Suscripción no encontrada" }
{ "error": "Factura no encontrada" }
```

### Server Error (500)
```json
{ "error": "mensaje de error detallado" }
```

---

## Deployment

### Deploy a Firebase
```bash
firebase deploy --only functions
```

### Verificar Deploy
```bash
firebase functions:list
```

---

## Logging

Todas las operaciones se loguean en Firebase Functions Console:
- ✅ Operaciones exitosas
- ❌ Errores
- 🔄 Cambios de estado
- 💰 Transacciones

Ver logs:
```bash
firebase functions:log
```

---

## Security

- ✅ CORS habilitado para admin.trafico-map-general-v2.web.app
- ✅ Validación de entrada en cada endpoint
- ✅ Custom claims para autorización
- ✅ Firestore security rules bloquean acceso directo

---

## Próximas Fases

- 📧 Envío automático de emails de confirmación
- 📄 Generación de PDFs de facturas
- 🔗 Integración con pasarelas de pago (Stripe, MercadoPago)
- 📊 Webhooks para sincronización con sistemas externos
