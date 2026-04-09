/**
 * 🧪 Test: Verificar que Nominatim encuentra cruces en Córdoba
 * Ejecutar con: node test_nominatim_cordoba.js
 */

async function testNominatimCruce(street1, street2) {
  const cityName = 'Córdoba, Argentina';
  
  console.log(`\n🔍 Buscando: "${street1}" y "${street2}" en ${cityName}`);
  console.log('=' .repeat(60));
  
  try {
    // Buscar primera calle
    const url1 = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(street1)}, ${encodeURIComponent(cityName)}&format=json&limit=3`;
    const res1 = await fetch(url1, { headers: { 'User-Agent': 'TraficoMap/1.0' }});
    const data1 = await res1.json();
    
    console.log(`\n📍 Calle 1: "${street1}"`);
    if (data1.length > 0) {
      data1.forEach((r, i) => {
        console.log(`   [${i+1}] ${r.display_name}`);
        console.log(`       Lat: ${r.lat}, Lon: ${r.lon}`);
      });
    } else {
      console.log(`   ❌ No encontrada`);
    }
    
    // Buscar segunda calle
    const url2 = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(street2)}, ${encodeURIComponent(cityName)}&format=json&limit=3`;
    const res2 = await fetch(url2, { headers: { 'User-Agent': 'TraficoMap/1.0' }});
    const data2 = await res2.json();
    
    console.log(`\n📍 Calle 2: "${street2}"`);
    if (data2.length > 0) {
      data2.forEach((r, i) => {
        console.log(`   [${i+1}] ${r.display_name}`);
        console.log(`       Lat: ${r.lat}, Lon: ${r.lon}`);
      });
    } else {
      console.log(`   ❌ No encontrada`);
    }
    
    // Calcular punto medio
    if (data1.length > 0 && data2.length > 0) {
      const p1 = data1[0];
      const p2 = data2[0];
      const lat = (parseFloat(p1.lat) + parseFloat(p2.lat)) / 2;
      const lon = (parseFloat(p1.lon) + parseFloat(p2.lon)) / 2;
      
      console.log(`\n✅ Cruce encontrado:`);
      console.log(`   Latitud:  ${lat.toFixed(6)}`);
      console.log(`   Longitud: ${lon.toFixed(6)}`);
      console.log(`   Google Maps: https://maps.google.com/?q=${lat},${lon}`);
    }
  } catch (error) {
    console.error(`❌ Error: ${error.message}`);
  }
}

// Pruebas
(async () => {
  // Calles que probable existan en Córdoba
  await testNominatimCruce('Colón', 'Belgrano');
  await testNominatimCruce('Avenida General Paz', 'Chacabuco');
  await testNominatimCruce('Salta', 'Jujuy');
  
  console.log('\n✅ Test completado');
})();
