#!/usr/bin/env pwsh
Write-Host "Iniciando deploy a Firebase..." -ForegroundColor Green
firebase deploy --only hosting
Write-Host "Deploy completado" -ForegroundColor Green
