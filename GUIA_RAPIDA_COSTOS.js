#!/usr/bin/env node

/**
 * GUÍA RÁPIDA DE USO - MONITOREO DE COSTOS GOOGLE MAPS
 * 
 * Este archivo contiene instrucciones para usar las herramientas de monitoreo
 */

const fs = require('fs');
const path = require('path');

console.log(`
╔═══════════════════════════════════════════════════════════════════════════╗
║                    📊 GUÍA DE MONITOREO DE COSTOS                        ║
║                    Google Maps Geocoding API                             ║
╚═══════════════════════════════════════════════════════════════════════════╝

🎯 OBJETIVO
   Monitorear el uso y costos de Google Maps Geocoding: $7 USD por 1000 requests

═══════════════════════════════════════════════════════════════════════════

📋 HERRAMIENTAS DISPONIBLES

1️⃣  ENDPOINT DE API (En server.js)
   ────────────────────────────────
   GET /api/geocode-stats
   
   • Retorna estadísticas en JSON
   • Accesible desde cualquier cliente HTTP
   • Datos completos de costos y desglose
   
   Ejemplo:
   $ curl http://localhost:5000/api/geocode-stats | jq


2️⃣  MONITOR CLI EN TIEMPO REAL (monitor-geocoding-costs.js)
   ─────────────────────────────────────────────────────────
   • Monitoreo en vivo cada 5 segundos
   • Actualización automática de costos
   • Proyecciones diarias, mensuales y anuales
   • Histórico de últimas 10 búsquedas
   
   Uso:
   $ node monitor-geocoding-costs.js            # Monitoreo continuo
   $ node monitor-geocoding-costs.js --once     # Una sola vez
   $ node monitor-geocoding-costs.js --interval 10000  # Cada 10 seg


3️⃣  WORKER DE PERSISTENCIA (geocoding-stats-worker.js)
   ────────────────────────────────────────────────────
   • Guarda snapshots cada 1 hora
   • Archivo: geocoding-stats-archive.json
   • Reportes mensuales automáticos
   • Historial de 90 días
   
   Uso:
   $ node geocoding-stats-worker.js
   
   Comandos interactivos:
   - \"stats\"  → Guardar snapshot ahora
   - \"report\" → Ver reporte mensual
   - \"help\"   → Mostrar ayuda
   - \"exit\"   → Salir

═══════════════════════════════════════════════════════════════════════════

🚀 INSTALACIÓN RÁPIDA

Opción A: Ejecutar manualmente
   Terminal 1: npm start
   Terminal 2: node monitor-geocoding-costs.js

Opción B: Usar PM2 (recomendado para producción)
   1. Instalar PM2 globalmente:
      $ npm install -g pm2
   
   2. Copiar ecosystem.config.js (ver abajo)
   
   3. Iniciar:
      $ pm2 start ecosystem.config.js
   
   4. Monitoreo:
      $ pm2 monit
   
   5. Logs:
      $ pm2 logs trafico-map

═══════════════════════════════════════════════════════════════════════════

📁 CONFIGURACIÓN CON PM2

Crear archivo: ecosystem.config.js

module.exports = {
  apps: [
    {
      name: 'trafico-map-api',
      script: './server.js',
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '1G',
      env: {
        NODE_ENV: 'production',
        PORT: 5000
      },
      error_file: './logs/error.log',
      out_file: './logs/out.log'
    },
    {
      name: 'geocoding-monitor',
      script: './monitor-geocoding-costs.js',
      instances: 1,
      autorestart: true,
      watch: false,
      env: {
        NODE_ENV: 'production'
      },
      error_file: './logs/monitor-error.log',
      out_file: './logs/monitor-out.log'
    },
    {
      name: 'geocoding-stats',
      script: './geocoding-stats-worker.js',
      instances: 1,
      autorestart: true,
      watch: false,
      env: {
        NODE_ENV: 'production'
      },
      error_file: './logs/stats-error.log',
      out_file: './logs/stats-out.log'
    }
  ]
};

Luego ejecutar:
   $ pm2 start ecosystem.config.js
   $ pm2 startup
   $ pm2 save

═══════════════════════════════════════════════════════════════════════════

💰 INTERPRETACIÓN DE COSTOS

EJEMPLO: 1000 requests en 1 mes
   Costo: 1000 × $0.007 = $7.00/mes
   Si usas 100 requests/día = $21/mes

PRESUPUESTO RECOMENDADO:
   Bajo uso (< 100 req/día)     → $30/mes
   Uso medio (100-500 req/día)  → $150/mes
   Alto uso (500-2000 req/día)  → $500/mes

═══════════════════════════════════════════════════════════════════════════

🔍 EJEMPLOS DE USO

# Ver estadísticas actuales
$ curl -s http://localhost:5000/api/geocode-stats | jq

# Extraer solo el costo estimado
$ curl -s http://localhost:5000/api/geocode-stats | jq '.costs.estimatedTotalCost'

# Ver tasa de éxito
$ curl -s http://localhost:5000/api/geocode-stats | jq '.successRate'

# Guardar estadísticas en archivo cada hora (Linux/Mac)
$ while true; do 
    curl -s http://localhost:5000/api/geocode-stats >> geocoding-log.jsonl
    sleep 3600
  done

═══════════════════════════════════════════════════════════════════════════

⚠️  ALERTAS Y UMBRALES

Crear alerta si costo diario supera $10:
   
# Script: check-costs.sh
#!/bin/bash
COST=\$(curl -s http://localhost:5000/api/geocode-stats | grep -o 'estimatedTotalCost[^,}]*')
echo "Costo actual: \$COST"

Ejecutar con:
   $ chmod +x check-costs.sh
   $ ./check-costs.sh

═══════════════════════════════════════════════════════════════════════════

📊 ARCHIVOS GENERADOS

geocoding-stats-archive.json
   → Historial de snapshots (cada 1 hora)
   → Resumen acumulado de costos
   → Picos de uso

geocoding-log.jsonl (opcional)
   → Logs detallados de cada request
   → Use si necesita auditoría completa

═══════════════════════════════════════════════════════════════════════════

🔗 REFERENCIAS

Google Maps Pricing:
   https://developers.google.com/maps/billing-and-pricing

Geocoding API Docs:
   https://developers.google.com/maps/documentation/geocoding

═══════════════════════════════════════════════════════════════════════════

📞 SOPORTE

Si las estadísticas no se muestran:
   1. Verificar que server.js está running: curl http://localhost:5000/api/health
   2. Revisar que /api/geocode está siendo usado
   3. Chequear logs del servidor para errores

Si el monitor se desconecta:
   1. Asegurar que server.js sigue ejecutándose
   2. Revisar firewall o conexión local
   3. Reiniciar monitor con: node monitor-geocoding-costs.js

═══════════════════════════════════════════════════════════════════════════

✅ PRÓXIMOS PASOS

1. Inicia el servidor: npm start
2. En otra terminal, ejecuta el monitor: node monitor-geocoding-costs.js
3. Realiza búsquedas desde la app
4. Observa los costos en tiempo real
5. Valida que el costo estimado es correcto

═══════════════════════════════════════════════════════════════════════════
`);
