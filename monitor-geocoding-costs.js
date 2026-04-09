#!/usr/bin/env node

/**
 * Script para monitorear los costos de Google Maps Geocoding API
 * Ejecutar: node monitor-geocoding-costs.js
 * 
 * Muestra en tiempo real:
 * - Total de requests
 * - Costo estimado actual
 * - Tasa de éxito
 * - Desglose por ciudad y tipo de búsqueda
 */

const BASE_URL = 'http://localhost:5000';

async function fetchStats() {
  try {
    const response = await fetch(`${BASE_URL}/api/geocode-stats`);
    if (!response.ok) {
      console.error('❌ Error:', response.statusText);
      return null;
    }
    return await response.json();
  } catch (error) {
    console.error('❌ Error conectando con el servidor:', error.message);
    return null;
  }
}

function formatStats(stats) {
  console.clear();
  
  console.log('╔═══════════════════════════════════════════════════════════════╗');
  console.log('║         📊 MONITOR DE COSTOS - GOOGLE MAPS GEOCODING          ║');
  console.log('╚═══════════════════════════════════════════════════════════════╝\n');
  
  // Estadísticas principales
  console.log('📈 ESTADÍSTICAS GENERALES:');
  console.log(`   Total de requests: ${stats.totalRequests}`);
  console.log(`   ✅ Exitosos: ${stats.successfulRequests}`);
  console.log(`   ❌ Fallidos: ${stats.failedRequests}`);
  console.log(`   📊 Tasa de éxito: ${stats.successRate}\n`);
  
  // Costos
  console.log('💰 COSTOS ESTIMADOS:');
  console.log(`   Costo por request: ${stats.costs.costPerRequest}`);
  console.log(`   Total de requests exitosos: ${stats.costs.successfulRequestsCount}`);
  console.log(`   💵 COSTO TOTAL ESTIMADO: ${stats.costs.estimatedTotalCost}`);
  console.log(`   Precio de referencia: ${stats.costs.costPerThousand} por 1000 requests\n`);
  
  // Desglose por fuente
  console.log('🔍 BÚSQUEDAS POR TIPO:');
  Object.entries(stats.requestsBySource).forEach(([source, count]) => {
    const percentage = ((count / stats.totalRequests) * 100).toFixed(1);
    const cost = (count * 0.007).toFixed(2);
    console.log(`   ${source}: ${count} (${percentage}%) - Costo: $${cost}`);
  });
  console.log();
  
  // Desglose por ciudad
  console.log('🏙️  BÚSQUEDAS POR CIUDAD:');
  Object.entries(stats.requestsByCity).forEach(([city, count]) => {
    const percentage = ((count / stats.totalRequests) * 100).toFixed(1);
    const cost = (count * 0.007).toFixed(2);
    console.log(`   ${city}: ${count} (${percentage}%) - Costo: $${cost}`);
  });
  console.log();
  
  // Información del servidor
  console.log('⏱️  INFORMACIÓN DEL SERVIDOR:');
  console.log(`   Tiempo en línea: ${stats.uptime.minutes} minutos (${stats.uptime.hours} horas)`);
  console.log(`   Tiempo promedio de respuesta: ${stats.averageResponseTime}\n`);
  
  // Últimos requests
  console.log('🕐 ÚLTIMOS 10 REQUESTS:');
  const recentRequests = stats.lastRequests.slice(0, 10);
  recentRequests.forEach((req, index) => {
    const status = req.success ? '✅' : '❌';
    const time = new Date(req.timestamp).toLocaleTimeString();
    console.log(`   ${index + 1}. [${time}] ${status} "${req.query}" (${req.city}) - ${req.responseTime}ms`);
  });
  console.log();
  
  // Proyecciones
  const daysData = stats.uptime.milliseconds / (1000 * 60 * 60 * 24);
  const requestsPerDay = daysData > 0 ? (stats.totalRequests / daysData).toFixed(0) : 0;
  const costPerDay = (requestsPerDay * 0.007).toFixed(2);
  const costPerMonth = ((requestsPerDay * 30) * 0.007).toFixed(2);
  
  console.log('📈 PROYECCIONES:');
  console.log(`   Requests por día (promedio): ${requestsPerDay}`);
  console.log(`   Costo diario estimado: $${costPerDay}`);
  console.log(`   Costo mensual estimado: $${costPerMonth}`);
  console.log(`   Costo anual estimado: $${(costPerMonth * 12).toFixed(2)}\n`);
  
  console.log('═══════════════════════════════════════════════════════════════\n');
}

async function startMonitoring(interval = 5000) {
  console.log('🚀 Iniciando monitoreo...\n');
  
  // Mostrar estadísticas iniciales
  let stats = await fetchStats();
  if (stats) {
    formatStats(stats);
  }
  
  // Actualizar cada X segundos
  setInterval(async () => {
    stats = await fetchStats();
    if (stats) {
      formatStats(stats);
    }
  }, interval);
}

// Detectar argumentos de línea de comandos
const args = process.argv.slice(2);
let interval = 5000; // 5 segundos por defecto

if (args.includes('--help') || args.includes('-h')) {
  console.log(`
Uso: node monitor-geocoding-costs.js [opciones]

Opciones:
  --interval <ms>     Intervalo de actualización en milisegundos (default: 5000)
  --once              Mostrar estadísticas una sola vez y salir
  -h, --help          Mostrar esta ayuda

Ejemplos:
  node monitor-geocoding-costs.js              # Monitoreo cada 5 segundos
  node monitor-geocoding-costs.js --once       # Mostrar una vez y salir
  node monitor-geocoding-costs.js --interval 10000  # Monitoreo cada 10 segundos
  `);
  process.exit(0);
}

if (args.includes('--once')) {
  (async () => {
    const stats = await fetchStats();
    if (stats) {
      formatStats(stats);
    }
  })();
} else {
  const intervalIndex = args.indexOf('--interval');
  if (intervalIndex !== -1 && args[intervalIndex + 1]) {
    interval = parseInt(args[intervalIndex + 1]);
  }
  startMonitoring(interval);
}
