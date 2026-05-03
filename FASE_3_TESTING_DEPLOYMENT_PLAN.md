# Fase 3: Testing & Deployment Plan

**Status:** Listo para comenzar 🧪  
**Duración Estimada:** 6-8 horas  
**Fecha Inicio:** Próxima disponibilidad

---

## Overview

Después de 88% de desarrollo completado:
- ✅ Admin panel UI funcional
- ✅ Cloud Functions backend (7 endpoints)
- ✅ Managers integrados
- ✅ Documentación

**Falta:**
- ⏳ Verificar que todo funciona end-to-end
- ⏳ Proteger la base de datos
- ⏳ Desplegar a producción

---

## Fase 3A: Testing (3-4 horas)

### Test 1: Cloud Functions Health Check ✅ PRIMERO

**Objetivo:** Verificar que pueden invocarse

```bash
# 1. Deploy las functions
firebase deploy --only functions

# 2. Verificar deployment
firebase functions:list

# 3. Test endpoint /health
curl https://us-central1-trafico-map-general-v2.cloudfunctions.net/adminApi/health

# Resultado esperado:
# { "status": "OK", "timestamp": "...", "version": "1.0.0" }
```

---

### Test 2: Unit Test - criarCliente

**Objetivo:** Crear nuevo cliente y verificar todo se crea

**Paso a Paso:**
```javascript
// Inputs
{
  nombreCliente: "Villa María",
  email: "admin@villa-maria.gov.ar",
  plan: "profesional",
  ciudad: "Villa María",
  telefono: "+54 353 4600000"
}

// Expected outputs después de Cloud Function:
✅ Documento en clientes/
   - id: cli_XXXXX
   - nombre: "Villa María"
   - plan: "profesional"
   - estado: "activo"

✅ Documento en subscripciones/
   - cliente_id: cli_XXXXX
   - plan: "profesional"
   - precio_mensual: 5000
   - expiration_date: 1 año desde hoy

✅ Documento en billing/
   - cliente_id: cli_XXXXX
   - monto: 60000 (5000 * 12)
   - estado: "pendiente"

✅ Usuario en Firebase Auth
   - email: admin-cli_XXXXX@trafico-map.clients
   - password: Temporal (mostrado en respuesta)
   - custom claims: { role: 'admin', cliente_id: 'cli_XXXXX' }
```

**Verificación:**
```bash
# 1. Abrir Firestore Console
https://console.firebase.google.com

# 2. Checar colecciones:
# - clientes/ → Villa María doc
# - subscripciones/ → Sub doc ligado
# - billing/ → Factura inicial

# 3. Firebase Auth Console
# - Verificar email: admin-cli_XXXXX@trafico-map.clients existe

# ✅ PASS si todo existe
```

---

### Test 3: Unit Test - cambiarPlan

**Objetivo:** Cambiar plan y verificar lado effects

```javascript
// Input
{
  subscripcionId: "sub_1704067200000",
  nuevoPlan: "enterprise"
}

// Expected:
✅ subscripciones/ actualizado
   - plan: "enterprise"
   - precio_mensual: 15000 (era 5000)

✅ billing/ con nueva factura
   - Diferencia: 10000 * 12 = $120,000
   - estado: "pendiente"

✅ Historial de cambios
   - subscripciones.cambios_plan[] incluye evento
```

---

### Test 4: Unit Test - registrarPago

**Objetivo:** Registrar pago y verificar cascada

```javascript
// Input
{
  facturaId: "fac_1704067200000",
  metodo_pago: "transferencia",
  referencias: { numero_comprobante: "CPF20240115001" }
}

// Expected:
✅ billing/ actualizado
   - pagada: true
   - estado: "pagada"
   - fecha_pago: timestamp

✅ subscripciones/ actualizado (si aplica)
   - activa: true
```

---

### Test 5: Unit Test - updateCustomClaims

**Objetivo:** Cambiar role de usuario

```javascript
// Input
{
  uid: "firebase_uid_abc123",
  claims: {
    role: "operator",
    cliente_id: "cli_1704067200000"
  }
}

// Expected:
✅ Firebase Auth: custom claims actualizados
✅ Usuario puede loguearse con nuevo rol
✅ Permisos reflejados en próximo login
```

---

### Test 6: UI Test - Admin Panel Load

**Objetivo:** Verificar que admin panel carga sin errores

```
1. Abrir http://localhost:8080/admin/
2. Verificar:
   ✅ Barra lateral con navegación
   ✅ Dashboard con 4 módulos
   ✅ No hay errores en consola (F12)
   ✅ Datos se cargan desde Firestore
3. Navegar por cada página:
   ✅ /clientes
   ✅ /subscripciones
   ✅ /billing
   ✅ /usuarios
```

---

### Test 7: UI Test - Crear Cliente (E2E)

**Objetivo:** Flujo completo desde UI

```
1. Admin Panel → Clientes
2. Click "Crear Cliente"
3. Llenar formulario:
   - Nombre: "Junín"
   - Email: admin@junin.gov.ar
   - Plan: "basico"
4. Click "Guardar"

Verificar:
✅ Modal desaparece
✅ Aparece "Cliente creado exitosamente"
✅ Nueva fila en tabla
✅ Firestore tiene docs nuevos
✅ Firebase Auth tiene usuario nuevo
```

---

### Test 8: Error Handling Test

**Objetivo:** Verificar que errores se manejan gracefully

```javascript
// Test 1: Email inválido
{
  nombreCliente: "Test",
  email: "no-es-email",
  plan: "basico"
}
// Esperado: Error "Email inválido" mostrado en UI

// Test 2: Plan inválido
{
  nombreCliente: "Test",
  email: "admin@test.com",
  plan: "super_premium"  // ← No existe
}
// Esperado: Error "Plan inválido"

// Test 3: Falta campo
{
  nombreCliente: "Test",
  // email falta
  plan: "basico"
}
// Esperado: Error "Faltan datos requeridos"
```

---

### Test 9: Performance Test

**Objetivo:** Verificar que Cloud Functions responden rápido

```bash
# Medir tiempo de respuesta de cada endpoint
for endpoint in criarCliente cambiarPlan registrarPago updateCustomClaims toggleUserStatus renovarSubscripcion; do
  time curl -X POST \
    -H "Content-Type: application/json" \
    -d '{"...": "..."}' \
    https://us-central1-trafico-map-general-v2.cloudfunctions.net/adminApi/$endpoint
done

# Objetivo: <1 segundo por endpoint
```

---

## Fase 3B: Security Rules (1-2 horas)

### Crear Firestore Rules

**Archivo:** `firestore.rules`

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    
    // Clientes - Solo admin puede leer/escribir
    match /clientes/{document=**} {
      allow read, write: if request.auth.token.role == 'admin';
    }
    
    // Subscripciones - Solo admin puede leer/escribir
    match /subscripciones/{document=**} {
      allow read, write: if request.auth.token.role == 'admin';
    }
    
    // Billing - Solo admin/billing pueden leer/escribir
    match /billing/{document=**} {
      allow read, write: if request.auth.token.role in ['admin', 'billing'];
    }
    
    // Usuarios admin - Solo admin
    match /usuarios_admin/{document=**} {
      allow read, write: if request.auth.token.role == 'admin';
    }
    
    // Acceso denegado por defecto
    match /{document=**} {
      allow read, write: if false;
    }
  }
}
```

### Deploy Rules

```bash
# Deploy rules (sin data loss)
firebase deploy --only firestore:rules
```

### Test Rules

```javascript
// Test 1: Admin puede leer
db.collection('clientes').get()  // ✅ Permitido

// Test 2: Non-admin NO puede leer
// (cambiar custom claims a role='viewer')
db.collection('clientes').get()  // ❌ Denegado

// Test 3: Billing puede leer billing/ pero no clientes/
db.collection('clientes').get()  // ❌ Denegado
db.collection('billing').get()   // ✅ Permitido
```

---

## Fase 3C: Deployment (1-2 horas)

### Deploy Cloud Functions

```bash
# 1. Chequear no hay errores
npm run lint --prefix functions/

# 2. Deploy solo functions
firebase deploy --only functions

# 3. Verificar en Console
firebase functions:list

# Output esperado:
# adminApi            https://us-central1-...
```

### Deploy Admin Panel

```bash
# 1. Build (si es necesario)
# En este caso no hay build process

# 2. Deploy hosting
firebase deploy --only hosting

# 3. Verificar en Console
# https://admin.trafico-map-general-v2.web.app

# 4. URL debe ser accesible
curl https://admin.trafico-map-general-v2.web.app
```

### Post-Deploy Verification

```bash
# 1. Health check
curl https://us-central1-trafico-map-general-v2.cloudfunctions.net/adminApi/health

# 2. Verificar CORS
curl -H "Origin: https://admin.trafico-map-general-v2.web.app" \
     -H "Access-Control-Request-Method: POST" \
     https://us-central1-trafico-map-general-v2.cloudfunctions.net/adminApi/health

# 3. Logs
firebase functions:log

# 4. Monitor
# Dashboard: https://console.firebase.google.com → Functions → Monitoring
```

---

## Fase 3D: Final Verification (1 hora)

### Checklist Final

- [ ] Admin panel carga sin errores
- [ ] Todos los endpoints responden en <1 segundo
- [ ] Crear cliente funciona end-to-end
- [ ] Cambiar plan funciona
- [ ] Registrar pago funciona
- [ ] Cambiar rol usuario funciona
- [ ] Activar/desactivar usuario funciona
- [ ] Renovar suscripción funciona
- [ ] Firestore rules protegen datos
- [ ] Errores muestran mensajes claros
- [ ] Logs en Functions Console son limpios
- [ ] Documentación está actualizada

### Rollback Plan

Si algo falla:

```bash
# Revertir último commit
git revert HEAD

# Revertir deployment
firebase deploy --only functions --force
```

---

## Timeline Sugerido

| Fase | Duración | Orden |
|------|----------|-------|
| 3A - Testing | 3-4h | 1ro |
| 3B - Security Rules | 1-2h | 2do |
| 3C - Deployment | 1-2h | 3ro |
| 3D - Final Check | 1h | 4to |
| **TOTAL** | **6-8h** | |

---

## Success Criteria

**Después de Fase 3:**
- ✅ Todos los tests pasan
- ✅ Security rules protegen datos
- ✅ Admin panel funciona en producción
- ✅ Cloud Functions responden correctamente
- ✅ Documentación final completa
- ✅ Ready for client use 🚀

---

## Next: Hands On

¿Comenzamos con Test 1: Cloud Functions Health Check?

```bash
firebase deploy --only functions
firebase functions:list
curl https://us-central1-trafico-map-general-v2.cloudfunctions.net/adminApi/health
```
