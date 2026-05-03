#Requires -Version 5.0

param(
    [Parameter(Mandatory = $true)]
    [string]$municipio,
    [Parameter(Mandatory = $true)]
    [string]$email,
    [Parameter(Mandatory = $true)]
    [string]$dominio,
    [string]$firebase_project_id = "",
    [string]$provincia = "Buenos Aires",
    [double]$lat = -34.9215,
    [double]$lng = -57.9544,
    [ValidateSet("basico", "profesional", "enterprise")]
    [string]$plan = "profesional",
    [int]$numPatrullas = 3,
    [int]$numOperadores = 2,
    [switch]$Force
)

# Funciones helper
function Write-Success { Write-Host "[OK] $args" -ForegroundColor Green }
function Write-Error-Msg { Write-Host "[ERROR] $args" -ForegroundColor Red }
function Write-Warning-Msg { Write-Host "[WARN] $args" -ForegroundColor Yellow }
function Write-Info { Write-Host "[INFO] $args" -ForegroundColor Cyan }
function New-Separator { Write-Host "=" * 60 -ForegroundColor Gray }

# Banner
Clear-Host
Write-Host "============================================================" -ForegroundColor Cyan
Write-Host "  TraficoMap - Crear Cliente (Fase 2B)" -ForegroundColor Cyan
Write-Host "============================================================" -ForegroundColor Cyan
Write-Host ""

# Validar requisitos
Write-Info "Validando requisitos..."
New-Separator

if ($PSVersionTable.PSVersion.Major -lt 5) {
    Write-Error-Msg "PowerShell 5.0+ requerido"
    exit 1
}
Write-Success "PowerShell OK"

if (-not (Get-Command firebase -ErrorAction SilentlyContinue)) {
    Write-Error-Msg "Firebase CLI no instalado"
    exit 1
}
Write-Success "Firebase CLI OK: $(firebase --version)"

if (-not (Get-Command node -ErrorAction SilentlyContinue)) {
    Write-Error-Msg "Node.js no instalado"
    exit 1
}
Write-Success "Node.js OK: $(node --version)"

if (-not (Get-Command git -ErrorAction SilentlyContinue)) {
    Write-Error-Msg "Git no instalado"
    exit 1
}
Write-Success "Git OK"

# Verificar template
if (-not (Test-Path ".\cliente-template")) {
    Write-Error-Msg "Template cliente no encontrado"
    exit 1
}
Write-Success "Template encontrado"
Write-Host ""

# Preparar variables
$municipio_slug = $municipio.ToLower() -replace '\s+', '' -replace '[^a-z0-9]', ''
if ([string]::IsNullOrEmpty($firebase_project_id)) {
    $firebase_project_id = "$municipio_slug-trafico"
}

$clientePath = ".\cliente-$municipio_slug"

Write-Host "Configuracion del cliente:" -ForegroundColor Cyan
New-Separator
Write-Info "Municipio: $municipio"
Write-Info "Slug: $municipio_slug"
Write-Info "Email: $email"
Write-Info "Dominio: $dominio"
Write-Info "Firebase Project: $firebase_project_id"
Write-Info "Plan: $plan"
Write-Host ""

# Paso 1: Duplicar template
Write-Host "Paso 1: Duplicando template..." -ForegroundColor Cyan
New-Separator

if (Test-Path $clientePath) {
    if (-not $Force) {
        Write-Warning-Msg "Carpeta ya existe. Usa -Force para sobrescribir"
        exit 1
    }
    Write-Warning-Msg "Carpeta ya existe. Eliminando..."
    Remove-Item $clientePath -Recurse -Force -ErrorAction SilentlyContinue
}

Copy-Item -Path ".\cliente-template" -Destination $clientePath -Recurse
Write-Success "Template duplicado en: $clientePath"
Write-Host ""

# Paso 2: Personalizar config.json
Write-Host "Paso 2: Personalizando config.json..." -ForegroundColor Cyan
New-Separator

$configPath = "$clientePath\public\config.json"
if (Test-Path $configPath) {
    $config = Get-Content $configPath | ConvertFrom-Json

    $config.ciudad.id = $municipio_slug
    $config.ciudad.nombre = $municipio
    $config.ciudad.provincia = $provincia
    $config.ciudad.coordenadas.lat = $lat
    $config.ciudad.coordenadas.lng = $lng

    $config.suscripcion.plan = $plan
    $config.suscripcion.fecha_inicio = (Get-Date -Format "yyyy-MM-dd")
    $config.suscripcion.estado = "activo"

    $config.admin.email = $email
    $config | ConvertTo-Json -Depth 10 | Set-Content $configPath

    Write-Success "config.json actualizado"
} else {
    Write-Warning-Msg "config.json no encontrado en $configPath"
}
Write-Host ""

# Paso 3: Usuarios iniciales
Write-Host "Paso 3: Generando usuarios..." -ForegroundColor Cyan
New-Separator

function New-Password { 
    -join ((65..90) + (97..122) + (48..57) | Get-Random -Count 12 | ForEach-Object {[char]$_})
}

$usuarios = @{
    admin = @{
        email = "admin@$dominio"
        password = New-Password
        role = "admin"
    }
    operadores = @()
    patrullas = @()
}

for ($i = 1; $i -le $numOperadores; $i++) {
    $usuarios.operadores += @{
        email = "operador$i@$dominio"
        password = New-Password
        role = "operador"
        nombre = "Operador $i"
    }
}

for ($i = 1; $i -le $numPatrullas; $i++) {
    $usuarios.patrullas += @{
        email = "patrulla$i@$dominio"
        password = New-Password
        role = "patrulla"
        nombre = "Patrulla $i"
        placa = "TRAFICO-80$i"
    }
}

$usuariosPath = "$clientePath\usuarios-iniciales.json"
$usuarios | ConvertTo-Json -Depth 10 | Set-Content $usuariosPath

Write-Success "Usuarios generados: 1 admin + $numOperadores operadores + $numPatrullas patrullas"
Write-Info "Guardado en: $usuariosPath"
Write-Host ""

# Paso 4: Firebase.json
Write-Host "Paso 4: Creando firebase.json..." -ForegroundColor Cyan
New-Separator

$firebaseJson = @{
    hosting = @{
        public = "public"
        ignore = @("firebase.json", "**/.*")
        rewrites = @(@{ source = "**"; destination = "/index.html" })
    }
} | ConvertTo-Json -Depth 10

Set-Content -Path "$clientePath\firebase.json" -Value $firebaseJson

Write-Success "firebase.json creado"
Write-Host ""

# Paso 5: Git init
Write-Host "Paso 5: Inicializando Git..." -ForegroundColor Cyan
New-Separator

Push-Location $clientePath

git init -q 2>$null
git add . 2>$null
git commit -q -m "Init: Cliente $municipio" 2>$null

Pop-Location

Write-Success "Git repositorio inicializado"
Write-Host ""

# Mostrar credenciales
Write-Host "Credenciales iniciales" -ForegroundColor Blue
New-Separator

Write-Host "ADMIN:" -ForegroundColor White
Write-Host "  Email: $($usuarios.admin.email)"
Write-Host "  Pass: $($usuarios.admin.password)"

Write-Host ""
Write-Host "OPERADORES:" -ForegroundColor White
$usuarios.operadores | ForEach-Object {
    Write-Host "  Operador: $($_.email)"
    Write-Host "  Pass: $($_.password)"
    Write-Host ""
}

Write-Host "PATRULLAS:" -ForegroundColor White
$usuarios.patrullas | ForEach-Object {
    Write-Host "  Patrulla: $($_.email)"
    Write-Host "  Pass: $($_.password)"
    Write-Host "  Placa: $($_.placa)"
    Write-Host ""
}

Write-Host "Proximos pasos" -ForegroundColor Cyan  
New-Separator

Write-Host "1. Firebase: Crear proyecto"
Write-Host "   ID: $firebase_project_id"
Write-Host "   URL: https://console.firebase.google.com/project/_/overview"
Write-Host ""
Write-Host "2. Descargar firebase-service-account.json"
Write-Host "   Destino: $clientePath\"
Write-Host ""
Write-Host "3. Crear usuarios en Firebase Auth"
Write-Host "   cd ..\helper-deployment.ps1 -cliente '$municipio' -firebaseProjectId '$firebase_project_id' -tipo usuarios"
Write-Host ""
Write-Host "4. Deploy"
Write-Host "   cd $clientePath"
Write-Host "   firebase deploy --only hosting"
Write-Host ""

Write-Success "Cliente '$municipio' creado exitosamente!"
Write-Host ""
