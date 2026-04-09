/**
 * Script de prueba para validar el endpoint /api/geocode con Google Maps
 * Ejecutar con: node test_google_maps_geocode.js
 */

const BASE_URL = 'http://localhost:5000';

async function testGeocoding(address, city = 'cordoba') {
  const url = `${BASE_URL}/api/geocode?address=${encodeURIComponent(address)}&city=${city}`;
  
  console.log(`\n🔍 Probando: "${address}" en ${city}`);
  console.log(`📡 URL: ${url}\n`);
  
  try {
    const response = await fetch(url);
    const data = await response.json();
    
    if (data.success) {
      console.log(`✅ ÉXITO`);
      console.log(`   Dirección: ${data.address}`);
      console.log(`   Coordenadas: ${data.lat.toFixed(6)}, ${data.lng.toFixed(6)}`);
      console.log(`   Fuente: ${data.source}`);
    } else {
      console.log(`❌ ERROR: ${data.message}`);
    }
  } catch (error) {
    console.error(`❌ FALLO EN LA SOLICITUD:`, error.message);
  }
}

async function runTests() {
  console.log('═══════════════════════════════════════════════════════════');
  console.log('   PRUEBAS DE GEOCODING CON GOOGLE MAPS');
  console.log('═══════════════════════════════════════════════════════════');
  
  // Pruebas para Córdoba
  console.log('\n📍 PRUEBAS EN CÓRDOBA:');
  await testGeocoding('Primera Junta', 'cordoba');
  await testGeocoding('San Martín y Rivadavia', 'cordoba');
  
  // Pruebas para Mar del Plata
  console.log('\n📍 PRUEBAS EN MAR DEL PLATA:');
  await testGeocoding('Sígueme', 'mar-del-plata');
  await testGeocoding('Mitre y San Martín', 'mar-del-plata');
  
  // Prueba con ambigüedad
  console.log('\n📍 PRUEBAS CON INTERSECCIONES:');
  await testGeocoding('Rivadavia y San Martín', 'cordoba');
  await testGeocoding('Luro y 12 de Octubre', 'mar-del-plata');
  
  console.log('\n═══════════════════════════════════════════════════════════\n');
}

runTests();
