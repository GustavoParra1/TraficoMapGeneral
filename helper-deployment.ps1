# helper-deployment.ps1
# 
# Script auxiliar para Fase 2B: Automatiza pasos después de crear-cliente.ps1
# 
# Uso:
#   .\helper-deployment.ps1 -cliente "La Plata" -firebaseProjectId "laplatamaps" -tipo usuarios
#   .\helper-deployment.ps1 -cliente "La Plata" -firebase AdminFirebaseKey "./admin-key.json" -tipo suscripcion
#

param(
    [Parameter(Mandatory = $true)]
    [string]$cliente,
    
    [Parameter(Mandatory = $false)]
    [string]$firebaseProjectId,
    
    [Parameter(Mandatory = $false)]
    [string]$adminFirebaseKey,
    
    [Parameter(Mandatory = $true)]
    [ValidateSet("usuarios", "suscripcion", "completo")]
    [string]$tipo = "usuarios"
)

# Colores para output
function Write-Success { Write-Host $args -ForegroundColor Green }
function Write-Error-Custom { Write-Host $args -ForegroundColor Red }
function Write-Warning-Custom { Write-Host $args -ForegroundColor Yellow }
function Write-Info { Write-Host $args -ForegroundColor Cyan }

# Banner
Write-Info "╔════════════════════════════════════════╗"
Write-Info "║  FASE 2B: Helper Deployment           ║"
Write-Info "╚════════════════════════════════════════╝"

Write-Info "`n🔧 Configuración:"
Write-Info "  • Cliente: $cliente"
Write-Info "  • Tipo: $tipo"

# Validar que Node.js está instalado
Write-Info "`n📋 Validando requisitos..."

$nodeExists = $null -ne (Get-Command node -ErrorAction SilentlyContinue)
if (-not $nodeExists) {
    Write-Error-Custom "❌ Node.js no está instalado o no está en el PATH"
    exit 1
}

$nodeVersion = node --version
Write-Success "✅ Node.js: $nodeVersion"

# Crear directorio de trabajo del cliente
$clientePath = Join-Path $PSScriptRoot "cliente-$(([uri]::EscapeUriString($cliente)) -replace '%20', '-')"

if (-not (Test-Path $clientePath)) {
    Write-Error-Custom "❌ Directorio del cliente no encontrado: $clientePath"
    Write-Warning-Custom "Ejecuta primero: .\crear-cliente.ps1"
    exit 1
}

Write-Success "✅ Directorio del cliente encontrado"

# Función para crear usuarios
function Deploy-Users {
    param(
        [string]$projectId
    )

    Write-Info "`n🔐 Creando usuarios en Firebase Auth..."
    
    # Verificar que existe usuarios-iniciales.json
    $usuariosFile = Join-Path $clientePath "usuarios-iniciales.json"
    if (-not (Test-Path $usuariosFile)) {
        Write-Error-Custom "❌ No encontrado: $usuariosFile"
        return $false
    }

    # Verificar que existe firebase-service-account.json
    $keyFile = Join-Path $clientePath "firebase-service-account.json"
    if (-not (Test-Path $keyFile)) {
        Write-Warning-Custom "⚠️  No encontrado: $keyFile"
        Write-Info "   Debes obtenerlo de Firebase Console:"
        Write-Info "   1. Ve a: https://console.firebase.google.com/project/$projectId/settings/serviceaccounts/adminsdk"
        Write-Info "   2. Haz clic en 'Generar nueva clave privada'"
        Write-Info "   3. Guarda como: $keyFile"
        return $false
    }

    # Ejecutar script Node.js
    try {
        Push-Location $clientePath
        
        Write-Info "`n📝 Ejecutando crear-usuarios-firebase.js..."
        & node (Join-Path $PSScriptRoot "crear-usuarios-firebase.js") `
            --proyecto=$projectId

        if ($LASTEXITCODE -eq 0) {
            Write-Success "✅ Usuarios creados exitosamente"
            
            # Mostrar resultado si existe
            $resultFile = Join-Path $clientePath "usuarios-creados.json"
            if (Test-Path $resultFile) {
                $resultado = Get-Content $resultFile | ConvertFrom-Json
                Write-Info "`n📊 Resumen:"
                Write-Success "   ✅ Exitosos: $($resultado.exitosos)"
                if ($resultado.errores -gt 0) {
                    Write-Error-Custom "   ❌ Errores: $($resultado.errores)"
                }
            }
            return $true
        } else {
            Write-Error-Custom "❌ Error creando usuarios"
            return $false
        }
    } catch {
        Write-Error-Custom "❌ Error: $_"
        return $false
    } finally {
        Pop-Location
    }
}

# Función para crear suscripción
function Deploy-Subscription {
    param(
        [string]$plan = "profesional",
        [string]$adminKey
    )

    Write-Info "`n💳 Creando suscripción en Firebase admin..."
    
    # Verificar que existe firebase-service-account.json para admin
    if ($adminKey -and -not (Test-Path $adminKey)) {
        Write-Error-Custom "❌ No encontrado: $adminKey"
        return $false
    }

    try {
        # Obtener plan del config.json del cliente
        $configFile = Join-Path $clientePath "config.json"
        if (Test-Path $configFile) {
            $config = Get-Content $configFile | ConvertFrom-Json
            $plan = $config.suscripcion.plan
        }

        Write-Info "`n📝 Ejecutando crear-suscripcion.js..."
        
        $arguments = @(
            (Join-Path $PSScriptRoot "crear-suscripcion.js")
            "--cliente=$cliente"
            "--plan=$plan"
        )
        
        if ($adminKey) {
            $arguments += "--firebase-admin-key=$adminKey"
        }

        & node $arguments

        if ($LASTEXITCODE -eq 0) {
            Write-Success "✅ Suscripción creada exitosamente"
            
            # Mostrar resultado
            $resultFile = Join-Path (Get-Location) "suscripcion-creada.json"
            if (Test-Path $resultFile) {
                $resultado = Get-Content $resultFile | ConvertFrom-Json
                Write-Info "`n📊 Detalles:"
                Write-Info "   • Plan: $($resultado.plan)"
                Write-Info "   • Próxima renovación: $($resultado.proxima_renovacion)"
                Write-Info "   • Documento: $($resultado.documento)"
            }
            return $true
        } else {
            Write-Error-Custom "❌ Error creando suscripción"
            return $false
        }
    } catch {
        Write-Error-Custom "❌ Error: $_"
        return $false
    }
}

# Ejecución principal
$exito = $true

switch ($tipo) {
    "usuarios" {
        if (-not $firebaseProjectId) {
            Write-Error-Custom "❌ Debes especificar -firebaseProjectId"
            exit 1
        }
        $exito = Deploy-Users -projectId $firebaseProjectId
    }
    
    "suscripcion" {
        $exito = Deploy-Subscription -adminKey $adminFirebaseKey
    }
    
    "completo" {
        if (-not $firebaseProjectId) {
            Write-Error-Custom "❌ Debes especificar -firebaseProjectId"
            exit 1
        }
        
        $exito = Deploy-Users -projectId $firebaseProjectId
        if ($exito) {
            $exito = Deploy-Subscription -adminKey $adminFirebaseKey
        }
    }
}

# Resumen final
Write-Info "`n" + "="*50
if ($exito) {
    Write-Success "✅ Proceso completado exitosamente"
} else {
    Write-Error-Custom "❌ Proceso completado con errores"
}

Write-Info "`n📋 Próximos pasos:"
Write-Info "1. Verificar que los usuarios fueron creados en Firebase Auth"
Write-Info "2. Verificar que la suscripción está en trafico-map-general-v2"
Write-Info "3. Desplegar el cliente: firebase deploy --only hosting"
Write-Info "4. Probar acceso: $cliente app desde el navegador"

exit ($exito ? 0 : 1)
