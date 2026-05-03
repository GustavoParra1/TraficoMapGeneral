@echo off
REM Script para iniciar TraficoMap Server
REM Ejecuta: node server.js en puerto 5000

title TraficoMap Server - Creador de Ciudades
echo.
echo ╔════════════════════════════════════════════╗
echo ║  TraficoMap - Servidor de Creación de Ciudades
echo ║  Puerto: 5000
echo ║  URL: http://localhost:5000
echo ╚════════════════════════════════════════════╝
echo.
echo Iniciando servidor...
echo.

REM Certificar que estamos en la carpeta correcta
cd /d "%~dp0"

REM Iniciar servidor
node server.js

REM Si Node.js no está instalado, mostrar error
if errorlevel 1 (
    echo.
    echo ❌ ERROR: Node.js no está instalado o no se encontró.
    echo    Descargalo desde: https://nodejs.org/
    echo.
    pause
    exit /b 1
)
