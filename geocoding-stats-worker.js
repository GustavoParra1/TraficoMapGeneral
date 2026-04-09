#!/usr/bin/env node

/**
 * Script para guardar estadísticas de geocoding en un archivo
 * Se ejecuta automáticamente cada hora
 * 
 * Uso en package.json:
 * "geocoding-stats-worker": "node geocoding-stats-worker.js"
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const STATS_FILE = path.join(__dirname, 'geocoding-stats-archive.json');
const SAVE_INTERVAL = 3600000; // 1 hora en milisegundos

const BASE_URL = 'http://localhost:5000';

/**
 * Fetch estadísticas desde el servidor
 */
async function fetchStats() {
  try {
    const response = await fetch(`${BASE_URL}/api/geocode-stats`);
    if (!response.ok) return null;
    return await response.json();
  } catch (error) {
    console.error('❌ Error fetching stats:', error.message);
    return null;
  }
}

/**
 * Cargar archivo de estadísticas previas
 */
function loadStatsArchive() {
  try {
    if (fs.existsSync(STATS_FILE)) {
      const data = fs.readFileSync(STATS_FILE, 'utf8');
      return JSON.parse(data);
    }
  } catch (error) {
    console.error('⚠️  Error cargando archivo de estadísticas:', error.message);
  }
  return {
    snapshots: [],
    summary: {
      totalRequestsAllTime: 0,
      totalCostAllTime: 0,
      peaks: {
        maxDailyRequests: 0,
        maxDailyCost: 0,
        date: null
      }
    }
  };
}

/**
 * Guardar estadísticas en archivo
 */
function saveStatsArchive(archive) {
  try {
    fs.writeFileSync(STATS_FILE, JSON.stringify(archive, null, 2));
    console.log(`✅ Estadísticas guardadas en ${STATS_FILE}`);
  } catch (error) {
    console.error('❌ Error guardando estadísticas:', error.message);
  }
}

/**
 * Procesar y guardar snapshot de estadísticas
 */
async function saveSnapshot() {
  const stats = await fetchStats();
  if (!stats) {
    console.error('❌ No se pudieron obtener estadísticas');
    return;
  }

  const archive = loadStatsArchive();
  const costValue = parseFloat(stats.costs.estimatedTotalCost.replace('$', ''));
  
  // Crear snapshot
  const snapshot = {
    timestamp: new Date().toISOString(),
    date: new Date().toLocaleDateString('es-AR'),
    stats: {
      totalRequests: stats.totalRequests,
      successfulRequests: stats.successfulRequests,
      failedRequests: stats.failedRequests,
      estimatedCost: costValue,
      successRate: stats.successRate,
      averageResponseTime: stats.averageResponseTime,
      uptime: stats.uptime
    },
    breakdown: {
      bySource: stats.requestsBySource,
      byCity: stats.requestsByCity
    }
  };

  // Agregar a snapshots
  archive.snapshots.push(snapshot);
  
  // Actualizar resumen
  archive.summary.totalRequestsAllTime += stats.totalRequests;
  archive.summary.totalCostAllTime = (archive.summary.totalCostAllTime + costValue).toFixed(2);
  
  // Verificar peaks
  if (stats.totalRequests > archive.summary.peaks.maxDailyRequests) {
    archive.summary.peaks.maxDailyRequests = stats.totalRequests;
    archive.summary.peaks.maxDailyCost = costValue.toFixed(2);
    archive.summary.peaks.date = new Date().toISOString();
  }

  // Mantener solo los últimos 90 días de snapshots (24 snapshots/día * 90 días)
  if (archive.snapshots.length > 2160) {
    archive.snapshots = archive.snapshots.slice(-2160);
  }

  saveStatsArchive(archive);
  
  // Mostrar resumen
  console.log(`\n📊 REPORTE DE ESTADÍSTICAS (${new Date().toLocaleString('es-AR')})`);
  console.log(`   Total de requests: ${snapshot.stats.totalRequests}`);
  console.log(`   Costo estimado: $${snapshot.stats.estimatedCost.toFixed(2)}`);
  console.log(`   Tasa de éxito: ${snapshot.stats.successRate}`);
  console.log(`   Snapshots guardados: ${archive.snapshots.length}`);
  console.log(`   Costo total acumulado: $${archive.summary.totalCostAllTime}`);
}

/**
 * Generar reporte mensual
 */
function generateMonthlyReport() {
  const archive = loadStatsArchive();
  if (archive.snapshots.length === 0) {
    console.log('No hay datos para generar reporte');
    return;
  }

  const now = new Date();
  const currentMonth = now.getMonth();
  const currentYear = now.getFullYear();

  const monthlySnapshots = archive.snapshots.filter(snap => {
    const date = new Date(snap.timestamp);
    return date.getMonth() === currentMonth && date.getFullYear() === currentYear;
  });

  if (monthlySnapshots.length === 0) {
    console.log('No hay datos para el mes actual');
    return;
  }

  const totalRequests = monthlySnapshots.reduce((sum, s) => sum + s.stats.totalRequests, 0);
  const totalCost = monthlySnapshots.reduce((sum, s) => sum + s.stats.estimatedCost, 0);
  const avgResponseTime = (monthlySnapshots.reduce((sum, s) => {
    const time = parseInt(s.stats.averageResponseTime);
    return sum + time;
  }, 0) / monthlySnapshots.length).toFixed(0);

  console.log(`\n📅 REPORTE MENSUAL - ${now.toLocaleString('es-AR', { month: 'long', year: 'numeric' })}`);
  console.log(`   Snapshots: ${monthlySnapshots.length}`);
  console.log(`   Total requests: ${totalRequests}`);
  console.log(`   Costo total: $${totalCost.toFixed(2)}`);
  console.log(`   Tiempo promedio: ${avgResponseTime}ms`);
  console.log(`   Costo promedio/día: $${(totalCost / monthlySnapshots.length).toFixed(2)}`);
  
  // Proyección a mes completo (30 días)
  const projectedCost = (totalCost / monthlySnapshots.length * 30).toFixed(2);
  console.log(`   Proyección para mes completo: $${projectedCost}`);
}

/**
 * Iniciar worker
 */
function start() {
  console.log('🚀 Iniciando worker de estadísticas de geocoding...');
  console.log(`📁 Archivo de datos: ${STATS_FILE}`);
  console.log(`⏱️  Intervalo de guardado: cada 1 hora\n`);

  // Guardar snapshot inicial
  saveSnapshot();

  // Guardar cada hora
  setInterval(saveSnapshot, SAVE_INTERVAL);

  // Generar reporte mensual cada día a las 00:00
  const now = new Date();
  const tomorrow = new Date(now);
  tomorrow.setDate(tomorrow.getDate() + 1);
  tomorrow.setHours(0, 0, 0, 0);

  const timeUntilMidnight = tomorrow - now;

  setTimeout(() => {
    generateMonthlyReport();
    setInterval(generateMonthlyReport, 24 * 60 * 60 * 1000); // Diariamente
  }, timeUntilMidnight);

  // Permitir comandos en la consola
  process.stdin.on('data', (input) => {
    const command = input.toString().trim().toLowerCase();
    
    switch (command) {
      case 'stats':
        saveSnapshot();
        break;
      case 'report':
        generateMonthlyReport();
        break;
      case 'help':
        console.log(`
Comandos disponibles:
  stats   - Guardar snapshot actual de estadísticas
  report  - Mostrar reporte del mes actual
  help    - Mostrar esta ayuda
  exit    - Salir
        `);
        break;
      case 'exit':
        console.log('👋 Finalizando worker...');
        process.exit(0);
        break;
      default:
        if (input.toString().trim()) {
          console.log('Comando no reconocido. Escriba "help" para ver opciones.');
        }
    }
  });
}

// Iniciar
start();

// Manejar errores no capturados
process.on('uncaughtException', (error) => {
  console.error('❌ Error no capturado:', error);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('❌ Promise rechazada sin manejo:', reason);
});
