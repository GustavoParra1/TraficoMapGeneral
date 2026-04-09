# 📊 Monitoreo de Costos - Google Maps Geocoding API

## Descripción General

Este documento explica cómo monitorear los costos de las consultas a Google Maps Geocoding API en TraficoMapGeneral.

### Precio Actual
- **$7.00 USD** por 1,000 requests exitosos
- **$0.007 USD** por request exitoso
- Los requests fallidos **NO se cobran**

## Endpoints Disponibles

### 1. API de Estadísticas

**Endpoint:** `GET /api/geocode-stats`

**Descripción:** Retorna estadísticas detalladas de uso y costo estimado.

**Ejemplo de solicitud:**
```bash
curl http://localhost:5000/api/geocode-stats
```

**Respuesta:**
```json
{
  "totalRequests": 145,
  "successfulRequests": 138,
  "failedRequests": 7,
  "requestsBySource": {
    "google-maps-intersection": 45,
    "google-maps-intersection-midpoint": 52,
    "google-maps-address": 41
  },
  "requestsByCity": {
    "mar-del-plata": 120,
    "cordoba": 25
  },
  "uptime": {
    "milliseconds": 3600000,
    "minutes": 60,
    "hours": "1.00"
  },
  "costs": {
    "costPerRequest": "$0.0070",
    "estimatedTotalCost": "$0.97",
    "successfulRequestsCount": 138,
    "costPerThousand": "$7.00"
  },
  "successRate": "95.17%",
  "averageResponseTime": "245ms",
  "lastRequests": [
    {
      "timestamp": "2026-04-09T15:30:45.123Z",
      "query": "Mitre y San Martín",
      "city": "mar-del-plata",
      "source": "google-maps-intersection",
      "success": true,
      "responseTime": 234
    }
    // ... más requests
  ]
}
```

## Herramientas de Monitoreo

### Monitor en Tiempo Real (CLI)

**Archivo:** `monitor-geocoding-costs.js`

**Características:**
- Actualización automática cada 5 segundos
- Estadísticas en tiempo real
- Proyecciones de costos diarios, mensuales y anuales
- Histórico de últimos 10 requests
- Desglose por tipo de búsqueda y ciudad

**Uso:**

```bash
# Monitoreo continuo (cada 5 segundos)
node monitor-geocoding-costs.js

# Mostrar estadísticas una sola vez
node monitor-geocoding-costs.js --once

# Personalizar intervalo de actualización (cada 10 segundos)
node monitor-geocoding-costs.js --interval 10000

# Ver ayuda
node monitor-geocoding-costs.js --help
```

**Ejemplo de salida:**
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
   Total de requests exitosos: 138
   💵 COSTO TOTAL ESTIMADO: $0.97
   Precio de referencia: $7.00 por 1000 requests

🔍 BÚSQUEDAS POR TIPO:
   google-maps-intersection: 45 (31.0%) - Costo: $0.31
   google-maps-intersection-midpoint: 52 (35.9%) - Costo: $0.36
   google-maps-address: 41 (28.3%) - Costo: $0.29

🏙️  BÚSQUEDAS POR CIUDAD:
   mar-del-plata: 120 (82.8%) - Costo: $0.84
   cordoba: 25 (17.2%) - Costo: $0.17

⏱️  INFORMACIÓN DEL SERVIDOR:
   Tiempo en línea: 60 minutos (1.00 horas)
   Tiempo promedio de respuesta: 245ms

📈 PROYECCIONES:
   Requests por día (promedio): 145
   Costo diario estimado: $1.02
   Costo mensual estimado: $30.60
   Costo anual estimado: $367.20
```

## Interpretación de Datos

### Desglose por Tipo de Búsqueda

| Tipo | Descripción | Frecuencia Esperada |
|------|-------------|-------------------|
| `google-maps-intersection` | Intersección encontrada directamente | 30-40% |
| `google-maps-intersection-midpoint` | Intersección por punto medio | 30-40% |
| `google-maps-address` | Dirección simple | 25-35% |

### Indicadores Clave

- **Tasa de Éxito:** Debería estar por encima del 90%. Si baja, revisar logs del servidor.
- **Tiempo Promedio de Respuesta:** Normalmente entre 200-400ms. Si aumenta mucho, podría indicar problemas de red o API.
- **Solicitudes Fallidas:** Revisar la ciudad y el formato de la dirección.

## Optimizaciones para Reducir Costos

1. **Cachear resultados** de búsquedas frecuentes
2. **Validar entrada** del usuario antes de enviar a Google Maps
3. **Implementar rate limiting** para evitar búsquedas duplicadas
4. **Monitorear picos** de uso y planificar presupuesto

## Integración con Monitoring Externo

### Opción 1: Script de Cron para Alerts

Crear un script `check-geocoding-costs.sh`:

```bash
#!/bin/bash

# Obtener estadísticas cada hora
node /path/to/TraficoMapGeneral/monitor-geocoding-costs.js --once | tee -a /var/log/geocoding-costs.log

# Si el costo estimado supera $10/día, enviar alerta
COST=$(curl -s http://localhost:5000/api/geocode-stats | grep -o '"estimatedTotalCost": "[^"]*' | cut -d'"' -f4 | tr -d '$')
THRESHOLD=10.00

if (( $(echo "$COST > $THRESHOLD" | bc -l) )); then
  echo "⚠️ ALERTA: Costo diario estimado supera los \$$THRESHOLD" | mail -s "Alerta de costos geocoding" admin@example.com
fi
```

### Opción 2: Integración con PM2

Agregar a `ecosystem.config.js`:

```javascript
module.exports = {
  apps: [
    {
      name: 'trafico-map',
      script: './server.js',
      env: {
        NODE_ENV: 'production'
      }
    },
    {
      name: 'geocoding-monitor',
      script: './monitor-geocoding-costs.js',
      instances: 1,
      autorestart: true,
      env: {
        NODE_ENV: 'production'
      }
    }
  ]
};
```

### Opción 3: Webhook para Notificaciones

Modificar `server.js` para enviar webhook cuando se alcance un umbral:

```javascript
const DAILY_COST_THRESHOLD = 10.00;

app.get('/api/geocode-stats', (req, res) => {
  // ... código existente ...
  
  if (parseFloat(stats.costs.estimatedTotalCost) > DAILY_COST_THRESHOLD) {
    notifyAdmin({
      type: 'cost_alert',
      currentCost: stats.costs.estimatedTotalCost,
      threshold: DAILY_COST_THRESHOLD
    });
  }
  
  res.json(stats);
});
```

## Presupuesto Recomendado

### Por Volumen de Uso

| Volumen | Requests/Día | Costo/Mes | Presupuesto Recomendado |
|---------|-------------|-----------|------------------------|
| Bajo | < 100 | < $21 | $30/mes |
| Medio | 100-500 | $21-105 | $150/mes |
| Alto | 500-2000 | $105-420 | $500/mes |
| Muy Alto | > 2000 | > $420 | > $500/mes |

## Logs y Auditoría

Los últimos 100 requests se almacenan en memoria. Para auditoría a largo plazo, considerar:

1. **Guardar estadísticas en archivo**
2. **Usar una base de datos (Firebase, MongoDB)**
3. **Integrar con Google Cloud Logging**

## Troubleshooting

### ¿El endpoint `/api/geocode-stats` devuelve un error?

```bash
# Verificar que el servidor está corriendo
curl http://localhost:5000/api/health
```

### ¿Las estadísticas se resetean cuando reinicio el servidor?

Es normal. Los stats en memoria se pierden. Para persistencia:

```javascript
// En server.js, cargar stats de un archivo al iniciar:
try {
  const saved = JSON.parse(fs.readFileSync('geocoding-stats.json'));
  Object.assign(geocodingStats, saved);
} catch (e) {}

// Y guardar cada hora:
setInterval(() => {
  fs.writeFileSync('geocoding-stats.json', JSON.stringify(geocodingStats));
}, 3600000);
```

## Referencias

- **Documentación de Precios:** https://developers.google.com/maps/billing-and-pricing/pricing
- **Geocoding API:** https://developers.google.com/maps/documentation/geocoding
- **API Key Management:** https://console.cloud.google.com/

---

**Última actualización:** 9 de abril de 2026
