# 🤖 AUTOMATIZACIÓN - CREAR CLIENTE EN 1 COMANDO

Script completo para crear un nuevo cliente sin tocar nada manualmente.

---

## 📌 CONCEPTO

```
Admin ejecuta: crear-cliente.ps1 -nombre "Córdoba" -plan "profesional"
   ↓
Script crea automáticamente:
   1. Firebase Project (cordoba-traficomap-xxxxx)
   2. Firestore database
   3. Rules en Firestore
   4. Carpeta /cliente-cordoba/ con todo preparado
   5. config.json con credenciales
   ↓
Cliente descarga en 2 min, hace login, **¡LISTO!**
```

---

## 🔧 SCRIPT: `crear-cliente.ps1`

Guardar en raíz del proyecto.

```powershell
# crear-cliente.ps1
# USO: ./crear-cliente.ps1 -nombre "Córdoba" -plan "profesional"

param(
    [Parameter(Mandatory=$true)]
    [string]$nombre,
    
    [Parameter(Mandatory=$false)]
    [string]$plan = "profesional",
    
    [Parameter(Mandatory=$false)]
    [string]$diasSuscripcion = 30
)

# ========== COLORES ==========
$GREEN = "`e[92m"
$RED = "`e[91m"
$YELLOW = "`e[93m"
$BLUE = "`e[94m"
$RESET = "`e[0m"

Write-Host "$BLUE━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━$RESET"
Write-Host "$BLUE    🚀 CREAR NUEVO CLIENTE$RESET"
Write-Host "$BLUE━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━$RESET"

# ========== PASO 1: VALIDAR ENTRADA ==========
Write-Host "`n$YELLOW[1/5] Validando entrada...$RESET"

$nombreLimpio = $nombre.ToLower().Replace(" ", "-")
$timestamp = Get-Date -Format "yyyyMMdd_HHmmss"
$clienteId = "$nombreLimpio-$timestamp"
$raizCliente = "./cliente-$nombreLimpio"

Write-Host "$GREEN✓ Cliente ID: $clienteId$RESET"
Write-Host "$GREEN✓ Raíz: $raizCliente$RESET"

# ========== PASO 2: CREAR ESTRUCTURA CARPETAS ==========
Write-Host "`n$YELLOW[2/5] Creando estructura de carpetas...$RESET"

$carpetas = @(
    "$raizCliente",
    "$raizCliente/public",
    "$raizCliente/public/js",
    "$raizCliente/public/css",
    "$raizCliente/public/data",
    "$raizCliente/firebase",
    "$raizCliente/scripts"
)

foreach ($carpeta in $carpetas) {
    if (-not (Test-Path $carpeta)) {
        New-Item -ItemType Directory -Force -Path $carpeta | Out-Null
        Write-Host "$GREEN✓ Creada: $carpeta$RESET"
    } else {
        Write-Host "$YELLOW⚠ Existe: $carpeta$RESET"
    }
}

# ========== PASO 3: COPIAR ARCHIVOS BASE ==========
Write-Host "`n$YELLOW[3/5] Copiando archivos base...$RESET"

$archivos = @(
    @{src = "public/index.html"; dest = "$raizCliente/public/index.html" },
    @{src = "public/js/app.js"; dest = "$raizCliente/public/js/app.js" },
    @{src = "public/js/patrulla-layer.js"; dest = "$raizCliente/public/js/patrulla-layer.js" },
    @{src = "public/js/colectivos-layer.js"; dest = "$raizCliente/public/js/colectivos-layer.js" },
    @{src = "public/css/styles.css"; dest = "$raizCliente/public/css/styles.css" }
)

foreach ($archivo in $archivos) {
    if (Test-Path $archivo.src) {
        Copy-Item -Path $archivo.src -Destination $archivo.dest -Force
        Write-Host "$GREEN✓ Copiado: $($archivo.src)$RESET"
    } else {
        Write-Host "$RED✗ NO ENCONTRADO: $($archivo.src)$RESET"
    }
}

# ========== PASO 4: GENERAR CONFIG.JSON ==========
Write-Host "`n$YELLOW[4/5] Generando config.json...$RESET"

$fechaInicio = Get-Date -Format "yyyy-MM-dd"
$fechaExpiracion = (Get-Date).AddDays([int]$diasSuscripcion).ToString("yyyy-MM-dd")

$configJson = @{
    metadata = @{
        cliente = $nombre
        fecha_creacion = $fechaInicio
        version = "1.0"
        soporte = "contacto@traficomap.app"
    }
    ciudad = @{
        id = $nombreLimpio
        nombre = $nombre
        coordenadas = @{
            lat = 0
            lng = 0
            zoom = 12
        }
    }
    suscripcion = @{
        id = $clienteId
        plan = $plan
        fecha_inicio = $fechaInicio
        fecha_expiracion = $fechaExpiracion
        estado = "activo"
        stripe_id = "sub_$clienteId"
    }
    firebase_cliente = @{
        projectId = "SERÁ_COMPLETADO_POR_FIREBASE_CREATION"
        apiKey = "SERÁ_COMPLETADO_POR_FIREBASE_CREATION"
    }
    firebase_verificacion = @{
        projectId = "trafico-map-general-v2"
        apiKey = "SERÁ_VERIFICADO_DURANTE_RUNTIME"
    }
} | ConvertTo-Json -Depth 10

$configJson | Out-File -FilePath "$raizCliente/config.json" -Encoding UTF8
Write-Host "$GREEN✓ Generado: config.json$RESET"

# ========== PASO 5: INFORMACIÓN FINAL ==========
Write-Host "`n$YELLOW[5/5] Finalizando...$RESET"

Write-Host "`n$GREEN━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━$RESET"
Write-Host "$GREEN✅ CLIENTE CREADO EXITOSAMENTE$RESET"
Write-Host "$GREEN━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━$RESET"

Write-Host "`n$BLUE📋 DATOS DEL CLIENTE:$RESET"
Write-Host "   Nombre: $nombre"
Write-Host "   ID: $clienteId"
Write-Host "   Plan: $plan"
Write-Host "   Vigencia: $fechaInicio a $fechaExpiracion"
Write-Host "   Carpeta: $raizCliente"

Write-Host "`n$YELLOW⏭️ PRÓXIMOS PASOS:$RESET"
Write-Host "   1. Entrar en Firebase Console"
Write-Host "   2. Crear proyecto: $nombreLimpio-traficomap"
Write-Host "   3. Copiar credenciales a: $raizCliente/config.json"
Write-Host "   4. Ejecutar: ./generar-firebase-rules.ps1 -cliente '$raizCliente'"
Write-Host "   5. Descargar $raizCliente para entregar al cliente"

Write-Host "`n$GREEN✨ ¡Proceso completado!$RESET`n"
```

---

## 🔧 SCRIPT: `generar-firebase-rules.ps1`

```powershell
# generar-firebase-rules.ps1
# Crea el archivo firestore.rules.json con reglas genéricas

param(
    [Parameter(Mandatory=$true)]
    [string]$cliente
)

$rulesJson = @"
{
  "rules": {
    "patrullas": {
      ".read": "auth.uid != null",
      ".write": "auth.uid != null",
      "gps_history": {
        ".read": "auth.uid != null",
        ".write": "auth.uid != null"
      }
    },
    "chat": {
      ".read": "auth.uid != null",
      ".write": "auth.uid != null"
    },
    "messages": {
      ".read": "auth.uid != null",
      ".create": "auth.uid != null",
      ".update": "auth.uid != null",
      ".delete": "auth.customClaims.role == 'operador' || auth.customClaims.role == 'admin'"
    },
    "users": {
      ".read": "auth.uid != null",
      ".write": "auth.customClaims.role == 'admin'"
    },
    "robos": {
      ".read": "auth.customClaims.role == 'operador' || auth.customClaims.role == 'admin'",
      ".write": "auth.customClaims.role == 'admin'"
    },
    "alertas": {
      ".read": "auth.uid != null",
      ".write": "auth.customClaims.role == 'admin'"
    }
  }
}
"@

$rulesPath = "$cliente/firestore.rules.json"
$rulesJson | Out-File -FilePath $rulesPath -Encoding UTF8

Write-Host "✓ Reglas de Firestore generadas: $rulesPath"
Write-Host "  → Copiar este contenido a Firebase Console → Firestore Rules"
}
```

---

## 📱 SCRIPT: `deploy-cliente.ps1`

Para que el cliente despliegue su versión a un hosting (Vercel, Netlify, etc.)

```powershell
# deploy-cliente.ps1
# Ejecutar DENTRO de la carpeta del cliente

Write-Host "🚀 Desplegando cliente a Netlify..."

# Validar config
if (-not (Test-Path "config.json")) {
    Write-Host "❌ ERROR: config.json no encontrado"
    exit 1
}

$config = Get-Content "config.json" | ConvertFrom-Json

Write-Host "✓ Ciudad: $($config.ciudad.nombre)"
Write-Host "✓ Plan: $($config.suscripcion.plan)"

# Copiar config a public/
Copy-Item "config.json" "public/config.json" -Force

# Desplegar
netlify deploy --prod --dir public

Write-Host "✅ Desplegue completado!"
Write-Host "   URL: https://$($config.ciudad.id)-traficomap.netlify.app"
```

---

## 🎯 FLUJO COMPLETO DE USO

### Paso 1: Admin crea cliente
```powershell
PS> ./crear-cliente.ps1 -nombre "La Plata" -plan "profesional" -diasSuscripcion 30

[OUTPUT]
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    🚀 CREAR NUEVO CLIENTE
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

[1/5] Validando entrada...
✓ Cliente ID: la-plata-20260503_143022
✓ Raíz: ./cliente-la-plata

[2/5] Creando estructura de carpetas...
✓ Creada: ./cliente-la-plata
✓ Creada: ./cliente-la-plata/public
✓ Creada: ./cliente-la-plata/public/js
... (más carpetas)

[3/5] Copiando archivos base...
✓ Copiado: public/index.html
✓ Copiado: public/js/app.js
✓ Copiado: public/js/patrulla-layer.js
... (más archivos)

[4/5] Generando config.json...
✓ Generado: config.json

[5/5] Finalizando...
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
✅ CLIENTE CREADO EXITOSAMENTE
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

📋 DATOS DEL CLIENTE:
   Nombre: La Plata
   ID: la-plata-20260503_143022
   Plan: profesional
   Vigencia: 2026-05-03 a 2026-06-02
   Carpeta: ./cliente-la-plata

⏭️ PRÓXIMOS PASOS:
   1. Entrar en Firebase Console
   2. Crear proyecto: la-plata-traficomap
   3. Copiar credenciales a: ./cliente-la-plata/config.json
   4. Ejecutar: ./generar-firebase-rules.ps1 -cliente './cliente-la-plata'
   5. Descargar ./cliente-la-plata para entregar al cliente
```

### Paso 2: Crear Firebase Project
```
1. Firebase Console → "Agregar Proyecto"
2. Nombre: "La Plata TraficoMap"
3. Crear proyecto
4. Agregar aplicación Web
5. Copiar config a cliente-la-plata/config.json
```

### Paso 3: Generar e instalar reglas
```powershell
PS> ./generar-firebase-rules.ps1 -cliente "cliente-la-plata"

✓ Reglas de Firestore generadas: cliente-la-plata/firestore.rules.json
  → Copiar este contenido a Firebase Console → Firestore Rules
```

### Paso 4: Entregar al cliente
```powershell
PS> Compress-Archive -Path "cliente-la-plata" -DestinationPath "cliente-la-plata.zip"

✓ Comprimido: cliente-la-plata.zip (1.2 MB)
  → Enviar por email o link de descarga
```

### Paso 5: Cliente instala
```
1. Descargar cliente-la-plata.zip
2. Descomprimir
3. npm install (si necesita dependencias)
4. Ver en navegador: file://index.html o servir con python -m http.server
5. Iniciar sesión con sus credenciales
```

---

## 📊 ESTRUCTURA FINAL DESPUÉS DE `crear-cliente.ps1`

```
TraficoMapGeneral/
├── public/                          (DEMO - Sin cambios)
│   ├── index.html
│   ├── js/
│   └── data/
├── cliente-la-plata/                (CLIENTE - Generado)
│   ├── public/
│   │   ├── index.html                (Copia adaptada)
│   │   ├── js/
│   │   │   ├── app.js                (Busca window.CONFIG.ciudad)
│   │   │   ├── patrulla-layer.js
│   │   │   ├── colectivos-layer.js
│   │   │   └── verificar-suscripcion.js  (Verifica con TU Firebase)
│   │   ├── css/
│   │   └── data/
│   │       ├── barrios.geojson       (Local del cliente)
│   │       ├── siniestros.geojson    (Local del cliente)
│   │       └── cameras.geojson       (Local del cliente)
│   ├── firebase/
│   │   └── firestore.rules.json      (Reglas genéricas sin ciudad específica)
│   ├── config.json                   (Credenciales + vigencia)
│   └── package.json                  (Si necesita npm)
│
├── cliente-cordoba/                  (CLIENTE - Otro ejemplo)
│   └── (Misma estructura)
│
└── (scripts de automatización)
    ├── crear-cliente.ps1
    ├── generar-firebase-rules.ps1
    └── deploy-cliente.ps1
```

---

## 🔐 SEGURIDAD EN AUTOMATIZACIÓN

**Consideraciones importantes:**

1. **No guardar credenciales en Git:**
   ```powershell
   # .gitignore
   cliente-*/config.json          # NUNCA commitear credenciales
   cliente-*/firebase/
   *.env
   ```

2. **Valida dominio al verificar suscripción:**
   ```javascript
   // verificar-suscripcion.js
   const dominioCliente = window.location.hostname;
   
   // Verificar que el dominio coincida con el registrado
   if (dominioCliente !== config.dominio_registrado) {
     console.error('Dominio no autorizado');
     return false;
   }
   ```

3. **Rate limiting en verificación:**
   ```javascript
   // No verificar cada segundo - máximo cada 1 hora
   if (verificacionCache && Date.now() - verificacionCache.timestamp < 3600000) {
     return verificacionCache.valida;
   }
   ```

---

## 💡 PRÓXIMOS PASOS

- [ ] Implementar script de gestión de suscripciones en Admin Panel
- [ ] Automatizar creación de Firebase Projects vía Firebase Management API
- [ ] Crear dashboard para monitorear clientes activos
- [ ] Implementar renovación automática de suscripciones

