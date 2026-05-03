# FASE 2B: Scripts de Automatización - Estado Actual

**Fecha:** $(Get-Date -Format 'yyyy-MM-dd HH:mm')  
**Status:** 🔄 EN PROGRESO - Fase de helpers completada

## Resumen

Fase 2B implementa la **automatización completa del deployment de clientes** mediante scripts PowerShell y Node.js que permiten crear un nuevo cliente con un solo comando.

## Archivos Creados en Fase 2B

### 1. **crear-cliente.ps1** (Principal)
**Ubicación:** `c:\Users\gparra\TraficoMapGeneral\crear-cliente.ps1`  
**Líneas:** 435+  
**Estado:** ✅ COMPLETO

**Propósito:** Orquesta la creación completa de un cliente nuevo en 10 pasos

**Parámetros:**
```powershell
-municipio "La Plata" [REQUERIDO]
-email "admin@laplatamaps.gov.ar" [REQUERIDO]  
-dominio "laplatamaps.municip.gov.ar" [REQUERIDO]
-firebase_project_id "laplatamaps" [OPCIONAL - auto-generado]
-provincia "Buenos Aires" [OPCIONAL]
-lat -34.9215 -lng -57.9544 [OPCIONAL - centro del mapa]
-plan "profesional" [basico|profesional|enterprise]
-numPatrullas 5 -numOperadores 2 [OPCIONAL]
```

**Ejemplo de uso:**
```powershell
.\crear-cliente.ps1 -municipio "La Plata" -email "admin@laplatamaps.gov.ar" -dominio "laplatamaps.municip.gov.ar"
```

**10 Pasos que automatiza:**

| # | Paso | Descripción | Manual? |
|---|------|-------------|---------|
| 1 | Validar requisitos | Verifica PowerShell 5.0+, Firebase CLI, Node.js, Git | N |
| 2 | Verificar template | Valida que `/cliente-template/` existe | N |
| 3 | Confirmar config | Muestra resumen y pide confirmación | Sí |
| 4 | Duplicar template | Copia a `cliente-{slug}/` | N |
| 5 | Personalizar config | Inyecta datos del cliente en config.json | N |
| 6 | Guide Firebase | Abre console.firebase.google.com para crear proyecto | Sí |
| 7 | Generar usuarios | Crea admin, operadores, patrullas en usuarios-iniciales.json | N |
| 8 | Setup Firestore rules | Copia rules genéricas, muestra cómo deploying | N |
| 9 | Crear firebase.json | Genera configuración de hosting y Firestore | N |
| 10 | Git init + commit | Inicializa repo git y primer commit | N |

**Características:**
- ✅ Validación de prerequisitos con mensajes claros
- ✅ Generación segura de contraseñas
- ✅ Colores en output (Green/Red/Yellow/Cyan)
- ✅ Confirmaciones antes de pasos críticos
- ✅ Plan-based configuration (diferentes límites según plan)
- ✅ Guardado de credenciales en `usuarios-iniciales.json`
- ✅ Auto-generación de Firebase Project IDs desde nombre del municipio
- ✅ Instrucciones claras para pasos manuales
- ✅ Resumen final con next steps

---

### 2. **crear-usuarios-firebase.js** (Helper)
**Ubicación:** `c:\Users\gparra\TraficoMapGeneral\crear-usuarios-firebase.js`  
**Líneas:** 200+  
**Estado:** ✅ COMPLETO

**Propósito:** Crea usuarios en Firebase Auth usando firebase-service-account.json

**Requisitos previos:**
1. Firebase project ya creado
2. `firebase-service-account.json` guardado en el directorio del cliente
3. `usuarios-iniciales.json` generado por crear-cliente.ps1

**Uso:**
```bash
node crear-usuarios-firebase.js --proyecto=laplatamaps
```

**Proceso:**
1. Lee `usuarios-iniciales.json` (admin + operadores + patrullas)
2. Para cada usuario:
   - ✅ Crea en Firebase Auth
   - ✅ Guarda documento en `/users/{uid}` en Firestore
   - ✅ Asigna custom claims (role)
3. Reporta exitosos/errores
4. Guarda resultado en `usuarios-creados.json`

**Usuarios creados:**
- 1 Admin (role: admin)
- N Operadores (role: operador)
- N Patrullas (role: patrulla con placa asociada)

**Salida:**
```json
{
  "exitosos": 7,
  "errores": 0,
  "detalles": [
    {
      "email": "admin@laplatamaps.gov.ar",
      "role": "admin",
      "uid": "Hks9dJ2k...",
      "estado": "exitoso"
    }
    // más usuarios...
  ]
}
```

---

### 3. **crear-suscripcion.js** (Helper)
**Ubicación:** `c:\Users\gparra\TraficoMapGeneral\crear-suscripcion.js`  
**Líneas:** 200+  
**Estado:** ✅ COMPLETO

**Propósito:** Crea documento de suscripción en tu Firebase (trafico-map-general-v2)

**Nota Importante:** Este script crea la suscripción en **tu Firebase**, no en el del cliente. Es para verificación desde el servidor.

**Requisitos:**
1. Credenciales de Firebase admin (trafico-map-general-v2)
2. Node.js con firebase-admin SDK

**Uso:**
```bash
node crear-suscripcion.js --cliente="La Plata" --plan="profesional" --firebase-admin-key="./admin-key.json"
```

**Documento creado en `/suscripciones/{cliente}`:**
```json
{
  "cliente_id": "La Plata",
  "plan": "profesional",
  "estado": "activa",
  "creado_en": "2024-XX-XX...",
  "proximo_renovacion": "2024-XX-XX...",
  "caracteristicas": {
    "cameras": 50,
    "users": 5,
    "storage_gb": 25,
    "features": ["cameras", "patrullas", "chat"],
    "patrullas_enabled": true,
    "chat_enabled": true,
    "analytics_enabled": true,
    "custom_alerts": 10
  },
  "limites": {
    "camaras_activas": 50,
    "usuarios": 5,
    "almacenamiento_gb": 25
  },
  "uso_actual": {
    "camaras": 0,
    "usuarios": 0,
    "almacenamiento_gb": 0
  }
}
```

**Planes soportados:**
- **basico**: 10 cámaras, 2 usuarios, 5GB storage
- **profesional**: 50 cámaras, 5 usuarios, 25GB storage, chat habilitado
- **enterprise**: 500 cámaras, 50 usuarios, 100GB storage, API access

---

### 4. **helper-deployment.ps1** (Orquestador)
**Ubicación:** `c:\Users\gparra\TraficoMapGeneral\helper-deployment.ps1`  
**Líneas:** 220+  
**Estado:** ✅ COMPLETO

**Propósito:** Ejecuta los pasos posteriores a `crear-cliente.ps1` (usuarios y suscripción)

**Parámetros:**
```powershell
-cliente "La Plata" [REQUERIDO]
-firebaseProjectId "laplatamaps" [REQUERIDO para usuarios]
-adminFirebaseKey "./admin-key.json" [OPCIONAL para suscripción]
-tipo "usuarios|suscripcion|completo" [REQUERIDO]
```

**Uso - Crear solo usuarios:**
```powershell
.\helper-deployment.ps1 -cliente "La Plata" -firebaseProjectId "laplatamaps" -tipo usuarios
```

**Uso - Crear todo:**
```powershell
.\helper-deployment.ps1 -cliente "La Plata" -firebaseProjectId "laplatamaps" -adminFirebaseKey "./admin-key.json" -tipo completo
```

**Que hace:**
1. Valida que Node.js esté instalado
2. Localiza el directorio del cliente
3. Según tipo:
   - **usuarios**: Ejecuta `crear-usuarios-firebase.js`
   - **suscripcion**: Ejecuta `crear-suscripcion.js`
   - **completo**: Ejecuta ambos en secuencia

**Output:**
- ✅ Status en tiempo real
- ✅ Resumen de resultados
- ✅ Próximos pasos

---

## Flujo Completo (End-to-End)

```
1. PREPARACIÓN
   └─ Verifica: PowerShell, Firebase CLI, Node.js, Git, template

2. CREAR CLIENTE (crear-cliente.ps1)
   ├─ Crea carpeta cliente-{slug}
   ├─ Duplica template
   ├─ Genera config.json personalizado
   ├─ Genera usuarios-iniciales.json
   ├─ Crea firebase.json
   ├─ Guía creación Firebase Project
   └─ Git init + primer commit
   
   OUTPUT: cliente-{slug}/ listo, usuarios-iniciales.json guardado

3. CREAR USUARIOS (helper-deployment.ps1 -tipo usuarios)
   ├─ Obtiene firebase-service-account.json
   ├─ Ejecuta crear-usuarios-firebase.js
   ├─ Para cada usuario:
   │  ├─ Crea en Firebase Auth
   │  ├─ Guarda en Firestore /users/{uid}
   │  └─ Asigna custom claims
   └─ Genera usuarios-creados.json
   
   OUTPUT: Usuarios activos en Firebase Auth del cliente

4. CREAR SUSCRIPCIÓN (helper-deployment.ps1 -tipo suscripcion)
   ├─ Obtiene credenciales admin (trafico-map-general-v2)
   ├─ Ejecuta crear-suscripcion.js
   ├─ Crea documento en /suscripciones/{cliente}
   └─ Genera suscripcion-creada.json
   
   OUTPUT: Suscripción verificable desde tu API

5. DESPLEGAR
   ├─ firebase deploy --only hosting
   └─ Cliente accesible en dominio configurado
```

---

## Estado de Implementación

### ✅ Completado
- `crear-cliente.ps1` (script principal - 435 líneas)
- `crear-usuarios-firebase.js` (user creation - 200 líneas)
- `crear-suscripcion.js` (subscription - 200 líneas)
- `helper-deployment.ps1` (orchestrator - 220 líneas)

### 🔄 Pendiente
- [ ] Testing end-to-end
- [ ] Manejo de errores mejorado
- [ ] Logging a archivo
- [ ] Rollback capabilities
- [ ] Deployment a Netlify/Vercel (opcional)

### ⏳ Próximos (Fase 2C)
- Admin panel para gestionar clientes
- Dashboard de suscripciones
- Billing automático
- API de provisioning

---

## Próximos Pasos

### Fase 2B.1 - Testing (AHORA)
```powershell
# 1. Preparar entorno de testing
$testDir = "c:\test-cliente-laplatamaps"
mkdir $testDir
cd $testDir

# 2. Ejecutar script completo (dry-run)
.\crear-cliente.ps1 -municipio "La Plata (Test)" -email "test@laplatamaps.test" -dominio "test.laplatamaps.local" -WhatIf

# 3. Crear con valores reales
.\crear-cliente.ps1 -municipio "La Plata" -email "admin@laplatamaps.gov.ar" -dominio "laplatamaps.municip.gov.ar"

# 4. Crear usuarios (con mock Firebase project)
.\helper-deployment.ps1 -cliente "La Plata" -firebaseProjectId "laplatamaps-test" -tipo usuarios

# 5. Verificar resultados
ls cliente-la-plata/
cat cliente-la-plata/usuarios-iniciales.json
```

### Fase 2B.2 - Producción
```powershell
# Crear cliente real
.\crear-cliente.ps1 -municipio "Córdoba" -email "admin@cordoba.gov.ar" -dominio "trafico.cordoba.gov.ar"

# Deploy de usuarios y suscripción
.\helper-deployment.ps1 -cliente "Córdoba" -firebaseProjectId "cordoba-trafico-map" -tipo completo

# Verificar en Firebase
# 1. trafico-map-general-v2 > Firestore > suscripciones
# 2. cordoba-trafico-map > Authentication > Users
# 3. cordoba-trafico-map > Firestore > users collection
```

---

## Referencia de Errores Comunes

| Error | Causa | Solución |
|-------|-------|----------|
| "PowerShell 5.0+ requerido" | PowerShell <5.0 | Actualiza a Windows PowerShell 5.0+ o PowerShell 7+ |
| "Firebase CLI no encontrado" | Firebase no instalado | Ejecuta `npm install -g firebase-tools` |
| "Node.js no encontrado" | Node no en PATH | Instala Node.js desde nodejs.org |
| "Template no encontrado" | `/cliente-template/` no existe | Ejecuta primero Fase 2A |
| "firebase-service-account.json no encontrado" | Credenciales no descargadas | Descarga desde Firebase Console |
| "Admin Firebase key no encontrado" | Credenciales de trafico-map-general-v2 no encontradas | Descarga desde Firebase Console para trafico-map-general-v2 |

---

## Arquitectura del Sistema

```
trafico-map-general-v2 (TU FIREBASE - CENTRAL)
  ├─ Firestore:
  │  └─ suscripciones/
  │     ├─ {cliente1} → plan, estado, límites, uso
  │     ├─ {cliente2}
  │     └─ ...
  │
  └─ Cloud Functions:
     └─ verificar-suscripcion() → valida cliente en clientes app

CLIENTE FIREBASE (INDEPENDIENTE PER CLIENTE)
  ├─ Firestore:
  │  ├─ config/
  │  │  └─ settings → config.json
  │  ├─ users/ → usuarios y sus roles
  │  ├─ cameras/
  │  ├─ patrullas/
  │  └─ events/
  │
  ├─ Authentication:
  │  ├─ admin@cliente.gov.ar
  │  ├─ operador1@cliente.gov.ar
  │  └─ patrulla01@cliente.gov.ar
  │
  └─ Hosting:
     └─ index.html → carga window.CONFIG desde config.json

CLIENTE APP (EN NAVEGADOR)
  ├─ index.html carga config.json
  ├─ window.CONFIG = config.json
  ├─ Inicializa Firebase del CLIENTE
  ├─ Verifica suscripción contra trafico-map-general-v2
  └─ App funciona si suscripción es válida
```

---

## Documentación Relacionada

- [ARQUITECTURA_SAAS.md](./ARQUITECTURA_SAAS.md) - Diseño SaaS completo
- [ESTADO_FASE_2A.md](./ESTADO_FASE_2A.md) - Estado anterior (Template)
- [CAMBIOS_v2.1.md](./CAMBIOS_v2.1.md) - Cambios en la arquitectura

---

**Última actualización:** $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')  
**Próximo milestone:** ✅ Testing completo de Fase 2B
