# 🧪 PLAN DE TESTING EJECUTIVO - TraficoMap Fase 2C
**Fecha:** 6 de Mayo de 2026  
**Estado:** 88% Proyecto Completo - Testing en Progreso  
**Objetivo:** Validar que Admin Panel + Cliente Template funcionan correctamente  

---

## 📋 CHECKLIST RÁPIDO (30 minutos)

### ✅ PASO 1: Verificar Git Sync (2 min)
```powershell
cd c:\Users\gusta\OneDrive\Escritorio\TraficoMapGeneral
git status
# ✓ Esperado: On branch main, nothing to commit, working tree clean
```

### ✅ PASO 2: Verificar Estructura (3 min)
```powershell
# Verificar admin panel existe
ls admin/
# ✓ Esperado: index.html, README.md, js/, css/, clientes/, billing/, etc.

# Verificar cliente-template existe
ls cliente-template/
# ✓ Esperado: config.json, public/, firebase/, README.md

# Verificar cliente-laplata (ejemplo)
ls cliente-laplata/
# ✓ Esperado: Carpeta con estructura cliente completa
```

### ✅ PASO 3: Verificar Cloud Functions (5 min)
```powershell
# Ver si functions están
ls functions/
# ✓ Esperado: index.js, package.json, README_ADMIN_API.md

# Revisar status
firebase functions:list
# ✓ Esperado: adminApi(us-central1) DEPLOYED

# O si no está deployed aún:
firebase deploy --only functions
# Esperar deployment...
```

### ✅ PASO 4: Verificar Admin Panel Localmente (10 min)

**Opción A: Con Python**
```powershell
cd c:\Users\gusta\OneDrive\Escritorio\TraficoMapGeneral\admin
python -m http.server 8080

# Luego ir a:
# http://localhost:8080/
# Debe cargar panel admin
```

**Opción B: Con Node.js**
```powershell
npm install -g http-server
cd c:\Users\gusta\OneDrive\Escritorio\TraficoMapGeneral\admin
http-server -p 8080
```

**En el navegador:**
- Ir a: `http://localhost:8080/`
- ✓ Debe cargar sin errores
- ✓ Debe ver Dashboard
- Abrir DevTools (F12) → Console
- ✓ No debe haber errores rojos

### ✅ PASO 5: Verificar Cliente Template (10 min)

```powershell
cd c:\Users\gusta\OneDrive\Escritorio\TraficoMapGeneral\cliente-template\public
python -m http.server 8081
```

**En el navegador:**
- Ir a: `http://localhost:8081/`
- ✓ Debe cargar config.json
- ✓ Debe verificar suscripción
- ✓ Debe cargar mapa
- Abrir DevTools (F12) → Console
- ✓ No debe haber errores rojos

---

## 🔍 TESTING DETALLADO (1-2 horas)

### TEST 1: Admin Panel - Dashboard
```
1. Ir a http://localhost:8080/
2. Verificar que carga Dashboard
3. Cambiar de vista:
   ✓ Clientes (debe listar)
   ✓ Suscripciones (debe listar)
   ✓ Billing (debe mostrar)
   ✓ Usuarios (debe listar)
4. Abrir DevTools → Network
   ✓ Debe conectar a Firestore
   ✓ No errores de CORS
```

### TEST 2: Admin Panel - Crear Cliente
```
1. Click en "Crear Cliente" (o similar botón)
2. Llenar formulario:
   - Nombre: "Test City"
   - Email: "admin@testcity.gov.ar"
   - Plan: "basico"
3. Click Guardar
4. Verificar en Firestore Console:
   ✓ Documento creado en /clientes/
   ✓ Documento creado en /subscripciones/
   ✓ Documento creado en /billing/
```

### TEST 3: Cliente Template - Verificar Suscripción
```
1. Ir a http://localhost:8081/
2. Debe verificar config.json automáticamente
3. Esperar validación de suscripción
4. DevTools → Console → Ver logs:
   ✓ "Verificando suscripción..."
   ✓ "Suscripción válida"
   O error si no existe
5. Si válida: Cargar mapa
   ✓ Debe aparecer mapa Leaflet
   ✓ Debe cargar ciudades
```

### TEST 4: Integración Admin → Cliente
```
1. En Admin Panel:
   - Crear nuevo cliente "Mendoza"
   - Plan: "profesional"
   
2. Obtener credenciales desde Firestore:
   - Document de cliente
   - config.json que se generó
   
3. Usar esas credenciales en cliente-template:
   - Reemplazar config.json del template
   - Reintentar http://localhost:8081/
   
4. Verificar:
   ✓ Cliente Template se conecta con nuevo Firebase
   ✓ Carga datos de Mendoza
   ✓ Mapa funciona
```

---

## 🔧 TROUBLESHOOTING

### Problema: "Cannot connect to Firestore"
**Solución:**
```
1. Verificar firebase-config.js tiene API keys correctas
2. Ir a Firebase Console
3. Verificar Firestore está habilitado
4. Verificar rules permiten lectura
```

### Problema: "Suscripción no encontrada"
**Solución:**
```
1. Verificar config.json tiene suscripcion.id
2. Verificar en Firestore `/subscripciones/`
3. Verificar fecha_expiracion es futura
```

### Problema: "CORS error"
**Solución:**
```
1. Cloud Functions están en CORS
2. Verificar firebase-config.js en admin/
3. Reintentar con incógnito (limpiar cache)
```

---

## ✅ CRITERIOS DE ÉXITO

| Componente | Test | Esperado |
|-----------|------|----------|
| **Admin Panel** | Cargar en localhost | ✓ Sin errores |
| **Admin - Clientes** | Listar clientes | ✓ Muestra datos Firestore |
| **Admin - Crear** | Crear nuevo cliente | ✓ Se crea en Firestore |
| **Cliente Template** | Cargar en localhost | ✓ Verifica suscripción |
| **Cliente - Mapa** | Render mapa | ✓ Leaflet funciona |
| **Integración** | Admin→Cliente | ✓ Datos sincronizados |
| **Cloud Functions** | /health endpoint | ✓ Retorna OK |

---

## 📊 REPORTE DE PROGRESO

- [ ] PASO 1: Git Sync ✓
- [ ] PASO 2: Estructura ✓
- [ ] PASO 3: Cloud Functions ✓
- [ ] PASO 4: Admin Panel ✓
- [ ] PASO 5: Cliente Template ✓
- [ ] TEST 1: Dashboard ✓
- [ ] TEST 2: Crear Cliente ✓
- [ ] TEST 3: Verificación Suscripción ✓
- [ ] TEST 4: Integración ✓

**Cuando todos estén ✓ = LISTO PARA PRODUCCIÓN**

---

## 🚀 PRÓXIMOS PASOS

Si todo pasa:
1. Deploy a Firebase Hosting
2. Deploy Cloud Functions
3. Verificar URLs en producción
4. Crear documentación de usuario
5. ¡LIVE! 🎉

