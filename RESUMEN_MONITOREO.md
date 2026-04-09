# ✅ Sistema de Monitoreo de Costos Implementado

## Resumen de Cambios

### 1. **Actualización server.js**
Se agregó el sistema de monitoreo:
- Objeto `geocodingStats` para registrar requests
- Función `logGeocodingRequest()` que captura: query, ciudad, tipo, éxito y tiempo de respuesta
- Registro automático en cada búsqueda (`/api/geocode`)
- Nuevo endpoint `/api/geocode-stats` con estadísticas detalladas

**Archivos modificados:**
- `server.js` (líneas 24-67 y 230-258)

### 2. **Nuevos Scripts Creados**

#### `monitor-geocoding-costs.js`
**Monitor en tiempo real con interfaz CLI**
- Actualización cada 5 segundos (configurable)
- Estadísticas en tiempo real
- Cálculo automático de costos
- Proyecciones diarias, mensuales y anuales
- Histórico de últimos 10 requests
- Desglose por tipo y ciudad

**Ejecutar:**
```bash
# Monitoreo continuo
node monitor-geocoding-costs.js

# Una sola vez
node monitor-geocoding-costs.js --once

# Con intervalo personalizado (cada 10 seg)
node monitor-geocoding-costs.js --interval 10000
```

#### `geocoding-stats-worker.js`
**Worker para persistencia de datos**
- Guarda snapshots cada 1 hora
- Mantiene historial de 90 días
- Archivo: `geocoding-stats-archive.json`
- Reportes mensuales automáticos
- Interfaz interactiva (stats, report, help)

**Ejecutar:**
```bash
node geocoding-stats-worker.js
```

### 3. **Documentación Creada**

#### `MONITOREO_COSTOS.md` (Documentación Completa)
- Guía de endpoints
- Interpretación de datos
- Integración con sistemas externos
- Optimizaciones para reducir costos
- Scripts de alertas
- Troubleshooting

#### `GUIA_RAPIDA_COSTOS.js` (Referencia Rápida)
- Visualización clara de opciones
- Ejemplos de uso
- Presupuestos recomendados
- Troubleshooting rápido

## Flujo de Datos

```
Usuario busca dirección
        ↓
/api/geocode (Google Maps)
        ↓
logGeocodingRequest() registra datos
        ↓
geocodingStats en memoria
        ↓
/api/geocode-stats devuelve stats actuales
        ↓
↙─────────────────┴─────────────────────╖
│                                       │
monitor-geocoding-costs.js        geocoding-stats-worker.js
│                                       │
Pantalla en tiempo real          geocoding-stats-archive.json
```

## Cálculo de Costos

```
Fórmula: Requests × $0.007 = Costo Total

Ejemplo:
- 145 requests totales
- 138 exitosos (7 fallidos NO se cobran)
- Costo: 138 × $0.007 = $0.97
```

## Características Principales

| Característica | Implementación |
|---|---|
| **Conteo de requests** | ✅ En memoria + archivo opcional |
| **Cálculo de costos** | ✅ Automático basado en $7/1000 |
| **Desglose por tipo** | ✅ Intersección, midpoint, dirección simple |
| **Desglose por ciudad** | ✅ Mar del Plata, Córdoba, etc |
| **Monitoreo en vivo** | ✅ CLI actualizado cada 5 seg |
| **Historial** | ✅ Últimos 100 requests en memoria |
| **Persistencia** | ✅ Snapshots horarios en archivo |
| **Proyecciones** | ✅ Diarias, mensuales, anuales |
| **Alertas** | ✅ Scripts de ejemplo incluidos |
| **Reports** | ✅ Mensuales automáticos |

## Uso Rápido

**Paso 1:** Asegurar que server.js está corriendo
```bash
npm start
# ✅ TraficoMapGeneral server listening on http://localhost:5000
```

**Paso 2:** Abrir nueva terminal y monitorear costos
```bash
node monitor-geocoding-costs.js
```

**Paso 3:** Ver estadísticas en tiempo real
```
╔═══════════════════════════════════════════════════════════════╗
║         📊 MONITOR DE COSTOS - GOOGLE MAPS GEOCODING          ║
╚═══════════════════════════════════════════════════════════════╝

📈 ESTADÍSTICAS GENERALES:
   Total de requests: 145
   ✅ Exitosos: 138
   ❌ Fallidos: 7
   📊 Tasa de éxito: 95.17%

💰 COSTOS ESTIMADOS:
   Costo por request: $0.0070
   💵 COSTO TOTAL ESTIMADO: $0.97
```

## Integración Avanzada (Opcional)

### PM2 para Producción
```javascript
// ecosystem.config.js
module.exports = {
  apps: [
    {
      name: 'trafico-map-api',
      script: './server.js',
      env: { NODE_ENV: 'production' }
    },
    {
      name: 'geocoding-monitor',
      script: './monitor-geocoding-costs.js'
    },
    {
      name: 'geocoding-stats',
      script: './geocoding-stats-worker.js'
    }
  ]
};
```

Ejecutar:
```bash
pm2 start ecosystem.config.js
pm2 logs
```

### Alertas por Webhook
```bash
# Si costo supera cierto umbral, notificar
COST=$(curl -s http://localhost:5000/api/geocode-stats | jq '.costs.estimatedTotalCost')
if [ "$COST" > "10" ]; then
  curl -X POST https://hooks.slack.com/... -d "Alerta: Costo supera $10"
fi
```

## Archivos del Sistema

```
TraficoMapGeneral/
├── server.js (✏️ MODIFICADO)
│   ├── geocodingStats object
│   ├── logGeocodingRequest()
│   └── /api/geocode-stats endpoint
│
├── monitor-geocoding-costs.js (✨ NUEVO)
│   └── CLI monitor en tiempo real
│
├── geocoding-stats-worker.js (✨ NUEVO)
│   └── Worker de persistencia
│
├── MONITOREO_COSTOS.md (✨ NUEVO)
│   └── Documentación completa
│
├── GUIA_RAPIDA_COSTOS.js (✨ NUEVO)
│   └── Referencia rápida
│
└── geocoding-stats-archive.json (📁 AUTO CREADO)
    └── Historial de requests (archivos de geocoding-stats-worker.js)
```

## Próximos Pasos

1. ✅ **Sistema implementado** - Inicia server y prueba
2. 📊 **Monitorea costos** - Ejecuta monitor-geocoding-costs.js
3. 📈 **Analiza patrones** - Revisa MONITOREO_COSTOS.md
4. 🚀 **Produce** - Usa PM2 para ejecución automática
5. ⚠️ **Configura alertas** - Implementa notificaciones si necesario

## Soporte Técnico

**Error: No se conecta con el servidor**
```bash
# Verificar que server.js está corriendo
curl http://localhost:5000/api/health
# Debería retornar: {"status":"ok",...}
```

**Estadísticas a cero**
- Normal: Resetean cuando reinicia el servidor
- Solución: Ejecuta `geocoding-stats-worker.js` para persistencia

**¿Quieres persistencia completa?**
- Ejecuta worker: `node geocoding-stats-worker.js`
- Guarda snapshots en archivo
- Accede a historial con `/api/geocode-stats`

---

**Implementación completada** ✅  
**Última actualización:** 9 de abril de 2026
