# setup-client-user.ps1
# Script para configurar usuario cliente con Node.js

param(
    [string]$email,
    [string]$password
)

if (-not $email -or -not $password) {
    Write-Host "`n📖 USO:" -ForegroundColor Cyan
    Write-Host "   .\setup-client-user.ps1 -email 'admin@laplatamaps.com.ar' -password 'MiContraseña123!'" -ForegroundColor Yellow
    Write-Host ""
    exit
}

Write-Host "`n🔍 Verificando Node.js..." -ForegroundColor Blue
$nodeCheck = & node --version 2>&1
if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Node.js no está instalado" -ForegroundColor Red
    Write-Host "📥 Descárgalo desde: https://nodejs.org/" -ForegroundColor Yellow
    exit
}

Write-Host "✅ Node.js $nodeCheck encontrado" -ForegroundColor Green

Write-Host "`n🔍 Verificando firebase-admin..." -ForegroundColor Blue
$npmList = & npm list firebase-admin 2>&1
if ($npmList -match "firebase-admin") {
    Write-Host "✅ firebase-admin instalado" -ForegroundColor Green
} else {
    Write-Host "📥 Instalando firebase-admin..." -ForegroundColor Yellow
    & npm install firebase-admin
}

Write-Host "`n🚀 Ejecutando setup..." -ForegroundColor Blue
& node (Join-Path $PSScriptRoot "setup-client-user.js") $email $password
