# Script para subir a GitHub

Write-Host "🚀 Iniciando push a GitHub..." -ForegroundColor Cyan

# Configurar git
git config --global user.name "GustavoParra"
git config --global user.email "user@example.com"

# Inicializar repo si no existe
if (-not (Test-Path .git)) {
    Write-Host "📍 Inicializando repositorio..." -ForegroundColor Yellow
    git init
}

# Añadir archivos
Write-Host "📦 Añadiendo archivos..." -ForegroundColor Yellow
git add .

# Hacer commit
Write-Host "💾 Haciendo commit..." -ForegroundColor Yellow
git commit -m "TraficoMapGeneral: LPR selector fix and project sync"

# Cambiar rama a main si es necesario
git branch -M main

# Añadir remote si no existe
$remoteExists = git remote | Select-String "origin"
if (-not $remoteExists) {
    Write-Host "🔗 Añadiendo remote origin..." -ForegroundColor Yellow
    git remote add origin https://github.com/GustavoParra1/TraficoMapGeneral.git
}

# Push
Write-Host "⬆️  Haciendo push a GitHub..." -ForegroundColor Yellow
git push -u origin main --force

Write-Host "✅ ¡Push completado!" -ForegroundColor Green
Write-Host "📍 Repo: https://github.com/GustavoParra1/TraficoMapGeneral" -ForegroundColor Cyan
