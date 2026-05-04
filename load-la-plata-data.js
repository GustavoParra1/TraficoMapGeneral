// 📦 SCRIPT PARA CARGAR DATOS DE LA PLATA A FIRESTORE
// Ejecuta esto en la consola del Admin Panel: https://trafico-map-general-v2.web.app/admin/

(async function cargarDatosLaPlata() {
  const db = firebase.firestore();
  const clientId = 'cli_1777821941319_t0ir8rbhl'; // La Plata
  
  console.log('🔄 ===== CARGANDO DATOS DE LA PLATA =====');
  console.log(`📍 Cliente ID: ${clientId}`);
  
  try {
    // Datos inline (porque no podemos leer archivos del disco desde JS del browser)
    // OPCIÓN A: Si quieres usar URLs públicas para cargar los datos:
    
    const urls = {
      cameras: 'https://trafico-map-general-v2.web.app/data/cameras-la-plata.geojson',
      private_cameras: 'https://trafico-map-general-v2.web.app/data/private-cameras-la-plata.geojson',
      siniestros: 'https://trafico-map-general-v2.web.app/data/siniestros-la-plata.geojson',
      barrios: 'https://trafico-map-general-v2.web.app/data/barrios-la-plata.geojson'
    };
    
    // Mapeo: tipo -> {colección, url}
    const dataFiles = [
      {
        tipo: 'cameras',
        url: 'https://trafico-map-general-v2.web.app/data/cameras-la-plata.geojson',
        coleccion: 'cameras',
        descripcion: '📹 Cámaras Públicas'
      },
      {
        tipo: 'private_cameras',
        url: 'https://trafico-map-general-v2.web.app/data/private-cameras-la-plata.geojson',
        coleccion: 'cameras_privadas',
        descripcion: '🔒 Cámaras Privadas'
      },
      {
        tipo: 'siniestros',
        url: 'https://trafico-map-general-v2.web.app/data/siniestros-la-plata.geojson',
        coleccion: 'siniestros',
        descripcion: '⚠️ Siniestros'
      },
      {
        tipo: 'barrios',
        url: 'https://trafico-map-general-v2.web.app/data/barrios-la-plata.geojson',
        coleccion: 'barrios',
        descripcion: '🏘️ Barrios'
      }
    ];
    
    // Procesar cada archivo
    for (const item of dataFiles) {
      console.log(`\n📥 Cargando ${item.descripcion}...`);
      
      try {
        // Descargar el GeoJSON
        const response = await fetch(item.url);
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`);
        }
        
        const geojson = await response.json();
        console.log(`🔍 GeoJSON obtenido:`, geojson);
        
        if (!geojson.features) {
          console.warn(`⚠️ No hay features en ${item.tipo}`);
          continue;
        }
        
        // Parseear GeoJSON
        const features = geojson.features;
        console.log(`📍 ${features.length} features encontrados`);
        
        // Cargar cada feature
        const ref = db.collection(`clientes/${clientId}/${item.coleccion}`);
        let contador = 0;
        
        for (const feature of features) {
          if (feature.geometry && (feature.geometry.type === 'Point' || feature.geometry.type === 'Polygon' || feature.geometry.type === 'LineString')) {
            const coords = feature.geometry.coordinates;
            
            let lat, lng;
            if (feature.geometry.type === 'Point') {
              [lng, lat] = coords;
            } else if (feature.geometry.type === 'Polygon') {
              // Usar el primer punto del polígono para zoom, pero guardar toda la geometría
              [lng, lat] = coords[0][0];
            } else if (feature.geometry.type === 'LineString') {
              // Usar el primer punto de la línea
              [lng, lat] = coords[0];
            }
            
            const docData = {
              lat,
              lng,
              tipo: feature.properties?.tipo || 'Punto',
              nombre: feature.properties?.nombre || feature.properties?.name || 'Sin nombre',
              descripcion: feature.properties?.descripcion || feature.properties?.description || '',
              properties: feature.properties || {},
              geometry: feature.geometry,
              created_at: new Date(),
              cliente_id: clientId
            };
            
            await ref.add(docData);
            contador++;
            console.log(`  ✅ [${contador}] ${docData.nombre}`);
          }
        }
        
        console.log(`✅ ${item.descripcion}: ${contador} registros cargados`);
        
      } catch (error) {
        console.error(`❌ Error en ${item.descripcion}:`, error.message);
      }
    }
    
    console.log('\n✅ ===== CARGA COMPLETADA =====');
    console.log('🎉 Ahora abre el mapa público y verás los datos de La Plata!');
    console.log('📍 URL: https://trafico-map-general-v2.web.app/');
    
  } catch (error) {
    console.error('❌ Error general:', error);
  }
})();
