// ============================
// INICIALIZAR MAPA
// ============================
let map;
let layers = {
  osm: null,
  satellite: null
};

function iniciarMapa() {
  if (!map) {
    try {
      console.log('🗺️ Iniciando mapa...');
      map = L.map('map').setView([-38.0, -57.55], 12);
      console.log('✅ Mapa Leaflet creado');
      
      // Capa OSM
      layers.osm = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap contributors',
        maxZoom: 19,
        name: 'OpenStreetMap'
      }).addTo(map);
      console.log('✅ Capa OSM añadida');
      
      // Capa satélite
      layers.satellite = L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
        attribution: 'Tiles &copy; Esri',
        maxZoom: 19,
        name: 'Satélite'
      });
      console.log('✅ Capa satélite creada');
      
      // Inicializar módulos con error handling
      const modules = [
        ['GeoLayers', () => GeoLayers.init(map)],
        ['SiniestrosLayer', () => SiniestrosLayer.init(map)],
        ['CamerasLayer', () => CamerasLayer.init(map)],
        ['PrivateCamerasLayer', () => PrivateCamerasLayer.init(map)],
        ['LprLayer', () => typeof LprLayer !== 'undefined' && LprLayer.init(map)],
        ['SemaforosLayer', () => SemaforosLayer.init(map)],
        ['ColegiosLayer', () => ColegiosLayer.init(map)],
        ['CorredoresLayer', () => CorredoresLayer.init(map)],
        ['ColectivosLayer', () => ColectivosLayer.init(map)],
        ['HeatmapLayer', () => heatmapLayer.init()],
        ['AforosLayer', () => typeof AforosLayer !== 'undefined' && AforosLayer.init(map)],
        ['RoboLayer', () => typeof RoboLayer !== 'undefined' && RoboLayer.init(map)],
        ['StreetViewLayer', () => typeof StreetViewLayer !== 'undefined' && StreetViewLayer.init()],
        ['GeoLocator', () => typeof GeoLocator !== 'undefined' && GeoLocator.init(map)]
      ];
      
      for (const [moduleName, initFn] of modules) {
        try {
          initFn();
          console.log(`✅ ${moduleName} inicializado`);
        } catch (err) {
          console.error(`❌ Error inicializando ${moduleName}:`, err);
        }
      }
      
      // Inicializar módulo de patrullas
      try {
        if (typeof PatullaLayer !== 'undefined' && db) {
          patullaLayer = new PatullaLayer(map, currentCity, db);
          console.log('✅ Módulo de patrullas inicializado');
        } else {
          console.warn('⚠️ PatullaLayer no disponible o db no inicializado');
        }
      } catch (err) {
        console.error('❌ Error inicializando PatullaLayer:', err);
      }
      
      console.log("✅ Mapa inicializado completamente");
    } catch (err) {
      console.error('❌ ERROR CRÍTICO en iniciarMapa():', err);
      console.log('📱 Abre DevTools (F12) → Console para ver detalles completos');
    }
  }
}

// ============================
// CONFIGURACIÓN DE CIUDADES
// ============================
let currentCity = window.CONFIG?.ciudad || 'la-plata'; // Lee de window.CONFIG (configuración del cliente)
let citiesConfig = null;
let patullaLayer = null; // Módulo de patrullas

async function loadCitiesConfig() {
  try {
    const response = await fetch('data/cities-config.json');
    citiesConfig = await response.json();
    console.log('✅ Configuración de ciudades cargada');
    return citiesConfig;
  } catch (error) {
    console.error('❌ Error cargando configuración de ciudades:', error);
    return null;
  }
}

// ============================
// CARGAR DATOS DESDE FIRESTORE DEL CLIENTE
// ============================
async function cargarDatosFromClienteFirestore(clienteId, clientDb) {
  // Si no se proporciona clientDb, intentar usar window.clientDb
  if (!clientDb && window.clientDb) {
    clientDb = window.clientDb;
    console.log(`🔥 Usando window.clientDb que fue inicializado en map.html`);
  }
  
  if (!clientDb) {
    console.error(`❌ No hay Firestore del cliente disponible`);
    return null;
  }
  
  console.log(`🔥 Iniciando carga de datos desde Firestore del cliente: ${clienteId}`);
  
  try {
    let bariosGeoJson = null;
    
    // Helper para convertir documentos de Firestore a GeoJSON
    const firestoreColToGeoJSON = (docs, idField = 'id') => {
      const features = [];
      docs.forEach(doc => {
        const data = doc.data();
        
        // Si ya es un feature, usarlo directamente
        if (data.type === 'Feature' && data.geometry) {
          features.push({
            ...data,
            properties: {
              ...data.properties,
              _id: doc.id,
              _docId: doc.id
            }
          });
        } else if (data.lat !== undefined && data.lng !== undefined) {
          // Convertir documento con lat/lng a Feature
          features.push({
            type: 'Feature',
            geometry: {
              type: 'Point',
              coordinates: [parseFloat(data.lng), parseFloat(data.lat)]
            },
            properties: {
              ...data,
              _id: doc.id,
              _docId: doc.id
            }
          });
        }
      });
      
      return {
        type: 'FeatureCollection',
        features: features
      };
    };
    
    // CARGAR BARRIOS
    try {
      console.log(`📍 Cargando barrios del cliente...`);
      const barrios = await clientDb.collection(`clientes/${clienteId}/barrios`).get();
      if (barrios.size > 0) {
        bariosGeoJson = firestoreColToGeoJSON(barrios.docs);
        console.log(`  ✓ ${bariosGeoJson.features.length} barrios cargados`);
        GeoLayers.loadEmbeddedGeoJson('Zonas / Barrios', bariosGeoJson, false);
        SiniestrosLayer.setBarriosGeoJson(bariosGeoJson);
      } else {
        console.log(`  ℹ️ No hay barrios en la base de datos del cliente`);
      }
    } catch (error) {
      console.warn(`⚠️ Error cargando barrios:`, error.message);
    }
    
    // CARGAR SINIESTROS
    try {
      console.log(`📍 Cargando siniestros del cliente...`);
      const siniestros = await clientDb.collection(`clientes/${clienteId}/siniestros`).get();
      if (siniestros.size > 0) {
        const sinGeoJson = firestoreColToGeoJSON(siniestros.docs);
        console.log(`  ✓ ${sinGeoJson.features.length} siniestros cargados`);
        SiniestrosLayer.clearFilters();
        SiniestrosLayer.loadFromGeoJson(sinGeoJson, true);
        heatmapLayer.setData(sinGeoJson);
        if (bariosGeoJson) {
          heatmapLayer.setBarriosGeoJson(bariosGeoJson);
        }
      } else {
        console.log(`  ℹ️ No hay siniestros en la base de datos del cliente`);
      }
    } catch (error) {
      console.warn(`⚠️ Error cargando siniestros:`, error.message);
    }
    
    // CARGAR CÁMARAS PÚBLICAS
    try {
      console.log(`📷 Cargando cámaras públicas del cliente...`);
      const cameras = await clientDb.collection(`clientes/${clienteId}/cameras`).get();
      if (cameras.size > 0) {
        const camGeoJson = firestoreColToGeoJSON(cameras.docs);
        console.log(`  ✓ ${camGeoJson.features.length} cámaras públicas cargadas`);
        CamerasLayer.clearFilters();
        await CamerasLayer.loadFromGeoJson(camGeoJson, true);
        if (bariosGeoJson) {
          CamerasLayer.setBarriosGeoJson(bariosGeoJson);
        }
        // Pasar cámaras a ColectivosLayer
        if (typeof ColectivosLayer !== 'undefined' && ColectivosLayer.setCamerasData) {
          ColectivosLayer.setCamerasData(CamerasLayer.getAll());
        }
        // Pasar cámaras a LprLayer
        if (typeof LprLayer !== 'undefined' && LprLayer.setData) {
          LprLayer.setData(CamerasLayer.getAll());
        }
      } else {
        console.log(`  ℹ️ No hay cámaras públicas en la base de datos del cliente`);
      }
    } catch (error) {
      console.warn(`⚠️ Error cargando cámaras públicas:`, error.message);
    }
    
    // CARGAR CÁMARAS PRIVADAS
    try {
      console.log(`📷 Cargando cámaras privadas del cliente...`);
      const privateCameras = await clientDb.collection(`clientes/${clienteId}/cameras_privadas`).get();
      if (privateCameras.size > 0) {
        const privCamGeoJson = firestoreColToGeoJSON(privateCameras.docs);
        console.log(`  ✓ ${privCamGeoJson.features.length} cámaras privadas cargadas`);
        PrivateCamerasLayer.clearFilters();
        PrivateCamerasLayer.loadFromGeoJson(privCamGeoJson, true);
        if (bariosGeoJson) {
          PrivateCamerasLayer.setBarriosGeoJson(bariosGeoJson);
        }
      } else {
        console.log(`  ℹ️ No hay cámaras privadas en la base de datos del cliente`);
      }
    } catch (error) {
      console.warn(`⚠️ Error cargando cámaras privadas:`, error.message);
    }
    
    // CARGAR CAPAS OPCIONALES DEL CLIENTE
    // Semáforos
    try {
      console.log(`🚦 Cargando semáforos del cliente...`);
      const semaforos = await clientDb.collection(`clientes/${clienteId}/semaforos`).get();
      if (semaforos.size > 0) {
        const semaforosGeoJson = firestoreColToGeoJSON(semaforos.docs);
        console.log(`  ✓ ${semaforosGeoJson.features.length} semáforos cargados`);
        SemaforosLayer.loadFromGeoJson(semaforosGeoJson);
        if (bariosGeoJson) {
          SemaforosLayer.setBarriosGeoJson(bariosGeoJson);
        }
      }
    } catch (error) {
      console.debug(`ℹ️ Semáforos no disponibles:`, error.message);
    }
    
    // Colegios
    try {
      console.log(`🏫 Cargando colegios del cliente...`);
      const colegios = await clientDb.collection(`clientes/${clienteId}/colegios_escuelas`).get();
      if (colegios.size > 0) {
        const colegiosGeoJson = firestoreColToGeoJSON(colegios.docs);
        console.log(`  ✓ ${colegiosGeoJson.features.length} colegios cargados`);
        ColegiosLayer.loadFromGeoJson(colegiosGeoJson);
        if (bariosGeoJson) {
          ColegiosLayer.setBarriosGeoJson(bariosGeoJson);
        }
      }
    } catch (error) {
      console.debug(`ℹ️ Colegios no disponibles:`, error.message);
    }
    
    // Corredores
    try {
      console.log(`📍 Cargando corredores del cliente...`);
      const corredores = await clientDb.collection(`clientes/${clienteId}/corredores_escolares`).get();
      if (corredores.size > 0) {
        const corredoresGeoJson = firestoreColToGeoJSON(corredores.docs);
        console.log(`  ✓ ${corredoresGeoJson.features.length} corredores cargados`);
        CorredoresLayer.loadFromGeoJson(corredoresGeoJson);
      }
    } catch (error) {
      console.debug(`ℹ️ Corredores no disponibles:`, error.message);
    }
    
    // Flujo
    try {
      console.log(`🚗 Cargando datos de flujo del cliente...`);
      const flujo = await clientDb.collection(`clientes/${clienteId}/flujo`).get();
      if (flujo.size > 0) {
        const flujoGeoJson = firestoreColToGeoJSON(flujo.docs);
        console.log(`  ✓ ${flujoGeoJson.features.length} registros de flujo cargados`);
      }
    } catch (error) {
      console.debug(`ℹ️ Flujo no disponible:`, error.message);
    }
    
    // Robo Automotor
    try {
      console.log(`🚗 Cargando robos automotores del cliente...`);
      const robos = await clientDb.collection(`clientes/${clienteId}/robo`).get();
      if (robos.size > 0) {
        const robosGeoJson = firestoreColToGeoJSON(robos.docs);
        console.log(`  ✓ ${robosGeoJson.features.length} robos cargados`);
        RoboLayer.loadRoboFromGeoJSON(robosGeoJson);
        if (bariosGeoJson) {
          RoboLayer.setBarriosData(bariosGeoJson);
        }
        setTimeout(() => {
          populateRoboFilters();
        }, 500);
      }
    } catch (error) {
      console.debug(`ℹ️ Robos no disponibles:`, error.message);
    }
    
    // Colectivos
    try {
      console.log(`🚌 Cargando líneas de colectivos del cliente...`);
      const colectivos = await clientDb.collection(`clientes/${clienteId}/colectivos`).get();
      if (colectivos.size > 0) {
        console.log(`  ✓ ${colectivos.size} líneas de colectivos cargadas`);
        const lineasData = {};
        colectivos.forEach(doc => {
          lineasData[doc.id] = doc.data();
        });
        // Pasar datos a ColectivosLayer
        if (typeof ColectivosLayer !== 'undefined') {
          ColectivosLayer.setManualData(lineasData);
        }
      }
    } catch (error) {
      console.debug(`ℹ️ Colectivos no disponibles:`, error.message);
    }
    
    console.log(`✅ Carga de datos de cliente completada`);
    
    // Habilitar checkbox de aforos después de carga
    const aforosCheckbox = document.getElementById('aforos-checkbox');
    if (aforosCheckbox) {
      aforosCheckbox.disabled = false;
      aforosCheckbox.style.opacity = '1';
    }
    
    return bariosGeoJson;
    
  } catch (error) {
    console.error(`❌ Error cargando datos del cliente desde Firestore:`, error);
    return null;
  }
}

// Variables globales para seguimiento de ciudad actual
let currentCityConfig = null;
let checkboxLocks = {};

// Cargar datos geográficos dinámicamente según ciudad
async function cargarDatosGeograficos(cityId = 'cordoba') {
  console.log(`📍 INICIO: Cargando datos para ciudad: ${cityId}`);
  console.log(`🔍 Modo cliente: ${window.isClientMode}, clienteId: ${window.restoredClienteId}`);
  
  // ✅ SI ES MODO CLIENTE: Cargar desde Firestore del cliente
  if (window.isClientMode && window.restoredClienteId) {
    console.log(`🔥 MODO CLIENTE DETECTADO - Cargando desde Firestore del cliente...`);
    return await cargarDatosFromClienteFirestore(window.restoredClienteId);
  }
  
  // Deshabilitar checkbox de aforos durante carga
  const aforosCheckbox = document.getElementById('aforos-checkbox');
  if (aforosCheckbox) {
    aforosCheckbox.disabled = true;
    aforosCheckbox.checked = false;
    aforosCheckbox.style.opacity = '0.5';
    console.log('⏸️ Checkbox de aforos deshabilitado durante carga...');
  }
  
  if (!citiesConfig) {
    citiesConfig = await loadCitiesConfig();
  }
  
  // Buscar en ciudades del usuario primero
  let cityConfig = null;
  const userCities = typeof ImportCities !== 'undefined' ? ImportCities.getUserCities() : {};
  
  if (userCities[cityId]) {
    cityConfig = userCities[cityId];
    console.log(`✓ Ciudad del usuario encontrada: ${cityConfig.name}`);
  } else {
    // citiesConfig es un array, no un objeto con .cities
    cityConfig = citiesConfig.find(c => c.id === cityId);
    if (cityConfig) {
      console.log(`✓ Ciudad predefinida encontrada: ${cityConfig.name}`);
    }
  }
  
  if (!cityConfig) {
    console.error(`❌ Ciudad no encontrada: ${cityId}`);
    return null;
  }
  
  // Guardar en variable global para acceso desde event listeners
  currentCityConfig = cityConfig;
  
  console.log(`✅ Configuración de ciudad obtenida:`, cityConfig);
  
  // PASO 1: Actualizar vista del mapa
  const lat = cityConfig.coordinates?.lat || -35;
  const lng = cityConfig.coordinates?.lng || -59;
  const zoom = cityConfig.zoom || 12;
  
  console.log(`  [1/5] Centrando mapa en: lat=${lat}, lng=${lng}, zoom=${zoom}`);
  if (map) {
    map.setView([lat, lng], zoom);
    console.log(`  ✓ Mapa centrado exitosamente`);
  }
  
  // Resetear heatmap cuando se carga una nueva ciudad
  heatmapLayer.toggle(false);
  
  let bariosGeoJson = null;
  
  try {
    // Helper para cargar datos (soporta fetch URLs y data URLs)
    // Helper: Parsear CSV respetando comillas
    const parseCSVLine = (line) => {
      const result = [];
      let current = '';
      let insideQuotes = false;
      
      for (let i = 0; i < line.length; i++) {
        const char = line[i];
        
        if (char === '"') {
          insideQuotes = !insideQuotes;
        } else if (char === ',' && !insideQuotes) {
          result.push(current.trim().replace(/^"|"$/g, ''));
          current = '';
        } else {
          current += char;
        }
      }
      
      result.push(current.trim().replace(/^"|"$/g, ''));
      return result;
    };

    // Helper: Convertir CSV a GeoJSON
    const parseCSVtoGeoJSON = (csvText) => {
      const lines = csvText.trim().split('\n');
      if (lines.length < 2) return { type: 'FeatureCollection', features: [] };
      
      const headerLine = parseCSVLine(lines[0]);
      const headers = headerLine.map(h => h.toLowerCase());
      const features = [];
      
      // Encontrar índices de lat/lng
      const latIdx = headers.indexOf('lat');
      const lngIdx = headers.indexOf('lng');
      
      if (latIdx < 0 || lngIdx < 0) {
        console.warn('⚠️ CSV no tiene columnas lat/lng válidas');
        return { type: 'FeatureCollection', features: [] };
      }
      
      for (let i = 1; i < lines.length; i++) {
        if (!lines[i].trim()) continue; // Saltar líneas vacías
        
        const values = parseCSVLine(lines[i]);
        const properties = {};
        
        // Construir propiedades
        for (let j = 0; j < headerLine.length; j++) {
          const header = headerLine[j];
          if (header.toLowerCase() !== 'lat' && header.toLowerCase() !== 'lng') {
            properties[header] = values[j] || '';
          }
        }
        
        // Extraer coordenadas
        const lat = parseFloat(values[latIdx]);
        const lng = parseFloat(values[lngIdx]);
        
        if (!isNaN(lat) && !isNaN(lng)) {
          features.push({
            type: 'Feature',
            geometry: {
              type: 'Point',
              coordinates: [lng, lat]  // GeoJSON format: [lng, lat]
            },
            properties: properties
          });
        }
      }
      
      console.log(`✅ Convertidos ${features.length} registros de CSV a GeoJSON`);
      return {
        type: 'FeatureCollection',
        features: features
      };
    };

    const loadData = async (filePath) => {
      if (!filePath) return null;
      
      if (filePath.startsWith('data:')) {
        // Es una data URL, decodificar
        return ImportCities.loadGeoJsonFromDataUrl(filePath);
      } else {
        // Es una URL normal, hacer fetch con cache busting
        const cacheBustUrl = filePath + '?t=' + Date.now();
        const response = await fetch(cacheBustUrl);
        if (response.ok) {
          // Detectar si es CSV o JSON
          if (filePath.endsWith('.csv')) {
            const csvText = await response.text();
            return parseCSVtoGeoJSON(csvText);
          } else {
            return await response.json();
          }
        }
        return null;
      }
    };
    
    // PASO 2: Cargar barrios
    console.log(`  [2/5] Cargando barrios desde: ${cityConfig.files.barrios}`);
    bariosGeoJson = await loadData(cityConfig.files.barrios);
    if (bariosGeoJson) {
      console.log(`      ✓ ${bariosGeoJson.features ? bariosGeoJson.features.length : 0} barrios cargados`);
      GeoLayers.loadEmbeddedGeoJson('Zonas / Barrios', bariosGeoJson, false);
      // Pasar barrios a SiniestrosLayer para filtrado geopolítico
      SiniestrosLayer.setBarriosGeoJson(bariosGeoJson);
    }
    
    // PASO 3: Cargar siniestros 
    console.log(`  [3/5] Cargando siniestros desde: ${cityConfig.files.siniestros}`);
    const sinGeoJson = await loadData(cityConfig.files.siniestros);
    if (sinGeoJson) {
      SiniestrosLayer.clearFilters();
      // Actualizar también el heatmap con los nuevos datos
      heatmapLayer.setData(sinGeoJson);
      // Pasar barrios al heatmap para filtrado geopolítico
      if (bariosGeoJson) {
        heatmapLayer.setBarriosGeoJson(bariosGeoJson);
      }
      if (cityConfig.files.siniestros.startsWith('data:')) {
        console.log(`      ℹ️ Cargando siniestros desde memoria (usuario)`);
        // Cargar siniestros desde GeoJSON en memoria (importados)
        SiniestrosLayer.loadFromGeoJson(sinGeoJson, true);
      } else {
        await SiniestrosLayer.load(cityConfig.files.siniestros);
      }
      console.log(`      ✓ Siniestros cargados`);
      
      // Cargar direcciones en GeoLocator para búsqueda
      if (typeof GeoLocator !== 'undefined') {
        GeoLocator.loadAddresses(sinGeoJson, cityId);
        console.log(`      ✓ Índice de direcciones cargado para búsqueda`);
      }
    }
    
    // PASO 4: Cargar cámaras públicas
    console.log(`  [4/5] Cargando cámaras públicas desde: ${cityConfig.files.cameras}`);
    const camGeoJson = await loadData(cityConfig.files.cameras);
    if (camGeoJson) {
      CamerasLayer.clearFilters();
      if (cityConfig.files.cameras.startsWith('data:')) {
        console.log(`      ℹ️ Cargando cámaras desde memoria (usuario)`);
        // Cargar cámaras desde GeoJSON en memoria (importadas)
        await CamerasLayer.loadFromGeoJson(camGeoJson, true);
      } else {
        await CamerasLayer.load(cityConfig.files.cameras);
      }
      if (bariosGeoJson) {
        CamerasLayer.setBarriosGeoJson(bariosGeoJson);
      }
      // Pasar cámaras a ColectivosLayer
      if (typeof ColectivosLayer !== 'undefined' && ColectivosLayer.setCamerasData) {
        ColectivosLayer.setCamerasData(CamerasLayer.getAll());
      }
      // Pasar cámaras a LprLayer para funcionalidad de LPR
      if (typeof LprLayer !== 'undefined' && LprLayer.setData) {
        const camerasData = CamerasLayer.getAll();
        console.log(`🔧 [DEBUG] Pasando ${camerasData?.length || 0} cámaras a LprLayer.setData()`);
        LprLayer.setData(camerasData);
      }
      console.log(`      ✓ Cámaras públicas cargadas`);
    }
    
    // PASO 5: Cargar cámaras privadas
    console.log(`  [5/5] Cargando cámaras privadas desde: ${cityConfig.files.private_cameras}`);
    if (cityConfig.files.private_cameras) {
      const privCamGeoJson = await loadData(cityConfig.files.private_cameras);
      if (privCamGeoJson) {
        PrivateCamerasLayer.clearFilters();
        if (cityConfig.files.private_cameras.startsWith('data:')) {
          console.log(`      ℹ️ Cargando cámaras privadas desde memoria (usuario)`);
          // Cargar cámaras privadas desde GeoJSON en memoria (importadas)
          PrivateCamerasLayer.loadFromGeoJson(privCamGeoJson, true);
        } else {
          await PrivateCamerasLayer.load(cityConfig.files.private_cameras);
        }
        if (bariosGeoJson) {
          PrivateCamerasLayer.setBarriosGeoJson(bariosGeoJson);
        }
        console.log(`      ✓ Cámaras privadas cargadas`);
      }
    }

    // OPCIONAL: Cargar capas opcionales si están disponibles
    if (cityConfig.optionalLayers) {
      
      // Cargar aforos si están disponibles
      if (cityConfig.optionalLayers.aforos && typeof AforosLayer !== 'undefined') {
        console.log(`  [OPT] Cargando aforos desde: ${cityConfig.optionalLayers.aforos}`);
        const aforesLoaded = await AforosLayer.loadFromCSV(cityConfig.optionalLayers.aforos, citiesConfig, currentCity);
        if (aforesLoaded) {
          console.log(`       ✓ Aforos cargados`);
          
          // Poblar los filtros de aforos con los metadatos disponibles
          setTimeout(() => {
            populateAforosFilters();
          }, 500);
        }
      }

      // Cargar robos si están disponibles
      if (cityConfig.optionalLayers.robo && typeof RoboLayer !== 'undefined') {
        console.log(`  [OPT] Cargando robos desde: ${cityConfig.optionalLayers.robo}`);
        
        // Determinar si es CSV o GeoJSON
        const roboPath = cityConfig.optionalLayers.robo;
        const isCSV = roboPath.endsWith('.csv');
        
        try {
          if (isCSV) {
            await RoboLayer.loadRoboFromCSV(roboPath);
          } else {
            const roboGeoJson = await loadData(roboPath);
            if (roboGeoJson) {
              RoboLayer.loadRoboFromGeoJSON(roboGeoJson);
            }
          }
          
          // Pasar barrios a RoboLayer para filtrado geopolítico
          if (bariosGeoJson) {
            RoboLayer.setBarriosData(bariosGeoJson);
          }
          
          console.log(`       ✓ Robos cargados`);
          
          // Poblar los filtros de robos
          setTimeout(() => {
            populateRoboFilters();
          }, 500);
        } catch (error) {
          console.warn('⚠️ Error cargando robos:', error);
        }
      }
      // Semáforos
      if (cityConfig.optionalLayers.semaforos) {
        console.log(`  [OPT] Cargando semáforos desde: ${cityConfig.optionalLayers.semaforos}`);
        const semaforosGeoJson = await loadData(cityConfig.optionalLayers.semaforos);
        if (semaforosGeoJson) {
          SemaforosLayer.loadFromGeoJson(semaforosGeoJson);
          
          // Pasar barrios a SemaforosLayer para filtrado geopolítico
          if (bariosGeoJson) {
            SemaforosLayer.setBarriosGeoJson(bariosGeoJson);
          }
          console.log(`       ✓ Semáforos cargados`);
        }
      }

      // Escuelas y Colegios
      if (cityConfig.optionalLayers.colegios) {
        console.log(`  [OPT] Cargando escuelas desde: ${cityConfig.optionalLayers.colegios}`);
        const colegiosGeoJson = await loadData(cityConfig.optionalLayers.colegios);
        if (colegiosGeoJson) {
          ColegiosLayer.loadFromGeoJson(colegiosGeoJson);
          
          // Pasar barrios a ColegiosLayer para filtrado geopolítico
          if (bariosGeoJson) {
            ColegiosLayer.setBarriosGeoJson(bariosGeoJson);
          }
          console.log(`       ✓ Escuelas cargadas`);
        }
      }

      // Corredores Escolares
      if (cityConfig.optionalLayers.corredores) {
        console.log(`  [OPT] Cargando corredores escolares desde: ${cityConfig.optionalLayers.corredores}`);
        const corredoresGeoJson = await loadData(cityConfig.optionalLayers.corredores);
        if (corredoresGeoJson) {
          CorredoresLayer.loadFromGeoJson(corredoresGeoJson);
          console.log(`       ✓ Corredores escolares cargados`);
        }
      }

      // Colectivos (múltiples líneas) - ESCALABLE POR CIUDAD
      console.log(`  [OPT] Cargando líneas de colectivos...`);
      const colectivosLoaded = await ColectivosLayer.loadLineas(`data`, cityId);
      if (colectivosLoaded && Object.keys(colectivosLoaded).length > 0) {
        // Mostrar panel de colectivos cuando hay datos
        setTimeout(() => {
          ColectivosUI.refresh();
          console.log(`       ✓ ${Object.keys(colectivosLoaded).length} líneas de colectivos cargadas`);
        }, 500);
      }
    }
    
    console.log(`✅ FIN: Datos de ${cityId} cargados exitosamente`);
    
    // Inicializar chat de patrullas
    if (typeof PatrullaChat !== 'undefined' && db) {
      window.patullaChat = new PatrullaChat(db, currentCity);
      console.log('💬 Sistema de chat de patrullas inicializado');
    }
    
    // Habilitar checkbox de aforos después de carga
    const aforosCheckbox = document.getElementById('aforos-checkbox');
    if (aforosCheckbox) {
      aforosCheckbox.disabled = false;
      aforosCheckbox.style.opacity = '1';
      console.log('✅ Checkbox de aforos habilitado');
    }

  } catch (error) {
    console.warn('⚠️ Error cargando datos:', error);
  }
  
  return bariosGeoJson;
}

// ============================
// POBLADOR DE FILTROS DE AFOROS
// ============================
function populateAforosFilters() {
  if (typeof AforosLayer === 'undefined') return;
  
  console.log('📊 Poblando filtros de aforos...');
  
  try {
    const metadata = AforosLayer.getMetadata();
    if (!metadata) {
      console.warn('⚠️ No hay metadata disponible en AforosLayer');
      return;
    }
    
    // Años
    const yearFilter = document.getElementById('aforos-year-filter');
    if (yearFilter && metadata.years && metadata.years.length > 0) {
      const currentValue = yearFilter.value;
      const options = yearFilter.querySelectorAll('option:not(:first-child)');
      options.forEach(opt => opt.remove());
      
      metadata.years.forEach(year => {
        const option = document.createElement('option');
        option.value = year;
        option.textContent = year;
        yearFilter.appendChild(option);
      });
      console.log(`  ✓ Años: ${metadata.years.join(', ')}`);
    }
    
    // Meses
    const monthFilter = document.getElementById('aforos-month-filter');
    if (monthFilter && metadata.months && metadata.months.length > 0) {
      const currentValue = monthFilter.value;
      const options = monthFilter.querySelectorAll('option:not(:first-child)');
      options.forEach(opt => opt.remove());
      
      metadata.months.forEach(month => {
        const option = document.createElement('option');
        option.value = month;
        const monthName = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 
                          'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'][month - 1];
        option.textContent = monthName || month;
        monthFilter.appendChild(option);
      });
      console.log(`  ✓ Meses: ${metadata.months.length} disponibles`);
    }
    
    // Días de la semana
    const dayofweekFilter = document.getElementById('aforos-dayofweek-filter');
    if (dayofweekFilter && metadata.daysOfWeek && metadata.daysOfWeek.length > 0) {
      const currentValue = dayofweekFilter.value;
      const options = dayofweekFilter.querySelectorAll('option:not(:first-child)');
      options.forEach(opt => opt.remove());
      
      metadata.daysOfWeek.forEach(day => {
        const option = document.createElement('option');
        option.value = day;
        const dayName = {
          'Lunes': 'Lunes',
          'Martes': 'Martes',
          'Miércoles': 'Miércoles',
          'Jueves': 'Jueves',
          'Viernes': 'Viernes',
          'Sábado': 'Sábado',
          'Domingo': 'Domingo'
        }[day] || day;
        option.textContent = dayName;
        dayofweekFilter.appendChild(option);
      });
      console.log(`  ✓ Días: ${metadata.daysOfWeek.join(', ')}`);
    }
    
    // Horas (desde)
    const startHourFilter = document.getElementById('aforos-start-hour-filter');
    if (startHourFilter && metadata.hours && metadata.hours.length > 0) {
      const currentValue = startHourFilter.value;
      const options = startHourFilter.querySelectorAll('option:not(:first-child)');
      options.forEach(opt => opt.remove());
      
      metadata.hours.forEach(hour => {
        const option = document.createElement('option');
        option.value = hour;
        option.textContent = `${hour.toString().padStart(2, '0')}:00`;
        startHourFilter.appendChild(option);
      });
      console.log(`  ✓ Horas disponibles: ${metadata.hours.length}`);
    }
    
    // Horas (hasta)
    const endHourFilter = document.getElementById('aforos-end-hour-filter');
    if (endHourFilter && metadata.hours && metadata.hours.length > 0) {
      const currentValue = endHourFilter.value;
      const options = endHourFilter.querySelectorAll('option:not(:first-child)');
      options.forEach(opt => opt.remove());
      
      metadata.hours.forEach(hour => {
        const option = document.createElement('option');
        option.value = hour;
        option.textContent = `${hour.toString().padStart(2, '0')}:00`;
        endHourFilter.appendChild(option);
      });
    }
    
    // Tipos de vehículos
    const vehicleTypeFilter = document.getElementById('aforos-vehicle-type-filter');
    if (vehicleTypeFilter && metadata.vehicleTypes && metadata.vehicleTypes.length > 0) {
      const currentValue = vehicleTypeFilter.value;
      const options = vehicleTypeFilter.querySelectorAll('option:not(:first-child)');
      options.forEach(opt => opt.remove());
      
      const vehicleTypeNames = {
        'auto': 'Automóviles',
        'moto': 'Motos',
        'bici': 'Bicicletas',
        'colectivo': 'Colectivos',
        'camiones': 'Camiones'
      };
      
      metadata.vehicleTypes.forEach(type => {
        const option = document.createElement('option');
        option.value = type;
        option.textContent = vehicleTypeNames[type] || type;
        vehicleTypeFilter.appendChild(option);
      });
      console.log(`  ✓ Tipos de vehículos: ${metadata.vehicleTypes.join(', ')}`);
    }
    
    console.log('✅ Filtros de aforos poblados correctamente');
    
  } catch (error) {
    console.error('❌ Error poblando filtros de aforos:', error);
  }
}

// ============================
// POBLADOR DE FILTROS DE ROBOS
// ============================
function populateRoboFilters() {
  if (typeof RoboLayer === 'undefined') return;
  
  console.log('🚗 Poblando filtros de robos...');
  
  try {
    const metadata = RoboLayer.getMetadata();
    if (!metadata) {
      console.error('❌ No hay metadata disponible en RoboLayer');
      return;
    }
    
    // Años
    const yearFilter = document.getElementById('robo-year-filter');
    if (yearFilter && metadata.years && metadata.years.length > 0) {
      // Limpiar opciones anteriores (excepto la primera)
      const existingOptions = yearFilter.querySelectorAll('option:not(:first-child)');
      existingOptions.forEach(opt => opt.remove());
      
      metadata.years.forEach(year => {
        const option = document.createElement('option');
        option.value = year;
        option.textContent = year;
        yearFilter.appendChild(option);
      });
      console.log(`  ✓ Años: ${metadata.years.join(', ')} (${metadata.years.length} opciones)`);
    } else {
      console.warn('⚠️ yearFilter no encontrado o sin años');
    }
    
    // Resultados
    const resultadoFilter = document.getElementById('robo-resultado-filter');
    if (resultadoFilter && metadata.resultados && metadata.resultados.length > 0) {
      // Limpiar opciones anteriores (excepto la primera)
      const existingOptions = resultadoFilter.querySelectorAll('option:not(:first-child)');
      existingOptions.forEach(opt => opt.remove());
      
      metadata.resultados.forEach(resultado => {
        const option = document.createElement('option');
        option.value = resultado;
        option.textContent = resultado;
        resultadoFilter.appendChild(option);
      });
      console.log(`  ✓ Resultados: ${metadata.resultados.length} disponibles`);
    } else {
      console.warn('⚠️ resultadoFilter no encontrado o sin resultados');
    }
    
    // Actualizar total de robos
    const totalSpan = document.getElementById('robo-total-count');
    if (totalSpan && metadata.total) {
      totalSpan.textContent = metadata.total.toLocaleString();
      console.log(`  ✓ Total: ${metadata.total}`);
    }
    
    console.log('✅ Filtros de robos poblados correctamente');
  } catch (error) {
    console.error('❌ Error poblando filtros de robos:', error);
  }
}

// ============================
// AUTENTICACIÓN
// ============================
// Track la primera autenticación para login inicial
// Usar sessionStorage para que cada ventana tenga su propio estado
let authInitialized = false;

firebase.auth().onAuthStateChanged((user) => {
  const sidebar = document.getElementById('sidebar');
  
  if (!user) {
    // ✅ VERIFICAR SI HAY SESIÓN RESTAURADA EN MODO CLIENTE
    const hasRestoredSession = window.restoredClienteId && window.restoredClienteData;
    
    if (hasRestoredSession) {
      // Hay sesión restaurada - permitir acceso sin login
      console.log('✅ Cliente con sesión restaurada - permitiendo acceso');
      return;
    }
    
    // Usuario NO autenticado
    // Solo si es la primera carga, mostrar login
    // Si pierde sesión después (logout en otra ventana), mantener el mapa funcionando
    if (!authInitialized) {
      authInitialized = true;
      sidebar.innerHTML = `
        <div style="padding: 20px;">
          <div id="logo">🗺️ TraficoMap</div>
          <div class="sidebar-section">
            <div class="sidebar-title">Usuario</div>
            <input type="email" id="login-email" placeholder="Email" style="width: 100%; padding: 8px; margin-bottom: 8px; border: none; border-radius: 4px;">
            <input type="password" id="login-password" placeholder="Contraseña" style="width: 100%; padding: 8px; margin-bottom: 8px; border: none; border-radius: 4px;">
            <button id="login-btn" style="width: 100%; margin-top: 10px;">Iniciar Sesión</button>
            <div id="error-msg" style="color: #ff6b6b; margin-top: 10px; font-size: 12px;"></div>
          </div>
        </div>
      `;
      
      // Event listeners para login
      document.getElementById('login-btn').addEventListener('click', () => {
        const email = document.getElementById('login-email').value;
        const password = document.getElementById('login-password').value;
        const errorMsg = document.getElementById('error-msg');
        
        if (!email || !password) {
          errorMsg.textContent = '❌ Ingresa email y contraseña';
          return;
        }
        
        auth.signInWithEmailAndPassword(email, password)
          .then(() => {
            errorMsg.textContent = '';
          })
          .catch((error) => {
            errorMsg.textContent = '❌ ' + error.message;
          });
      });
      
      // Ocultar mapa solo en la carga inicial
      document.getElementById('map').style.opacity = '0.3';
    } else {
      // Ya fue autenticado pero se perdió sesión (logout en otra ventana)
      // Mostrar notificación pero dejar el mapa funcionando
      console.log('⚠️ Sesión perdida en otra ventana');
      const errorDiv = document.querySelector('#error-msg');
      if (errorDiv) {
        errorDiv.textContent = '⚠️ Tu sesión fue cerrada desde otra ventana. El mapa sigue disponible.';
      }
    }
    
  } else {
    // Usuario autenticado - mostrar panel
    sidebar.innerHTML = `
      <div id="logo">🗺️ TraficoMap</div>
      <div class="sidebar-section">
        <div class="sidebar-title">Usuario</div>
        <div style="font-size: 12px; margin-bottom: 10px;">
          ${user.email}
        </div>
        <button id="logout-btn">Cerrar Sesión</button>
      </div>
      
      <div class="sidebar-section">
        <div class="sidebar-title">Mapa Base</div>
        <select id="base-map-selector" style="width: 100%; padding: 8px; border: none; border-radius: 4px;">
          <option value="osm" selected>OpenStreetMap</option>
          <option value="satellite">Satélite (Esri)</option>
        </select>
      </div>

      <div class="sidebar-section">
        <div class="sidebar-title">🗺️ Buscar Dirección</div>
        <div style="display: flex; gap: 8px;">
          <input 
            type="text" 
            id="address-search-input" 
            placeholder="Ej: Colón y Entre Ríos"
            style="flex: 1; padding: 8px; border: 1px solid #ddd; border-radius: 4px; font-size: 12px;"
          >
          <button id="address-search-btn" style="padding: 8px 12px; background-color: #0066ff; color: white; border: none; border-radius: 4px; cursor: pointer; font-size: 12px; font-weight: 500;">🔍</button>
        </div>
        <div id="address-results" style="margin-top: 8px; max-height: 150px; overflow-y: auto; display: none;">
          <!-- Resultados de búsqueda aquí -->
        </div>
        <button id="address-clear-btn" style="width: 100%; margin-top: 8px; padding: 6px; background-color: #666; color: white; border: none; border-radius: 4px; cursor: pointer; font-size: 11px; display: none;">✕ Limpiar Marcador</button>
        
        <!-- Toggle de Street View -->
        <div style="margin-top: 12px; padding: 10px; background: #e3f2fd; border: 1px solid #2196F3; border-radius: 6px; display: none;" id="street-view-toggle-container">
          <label style="display: flex; align-items: center; gap: 10px; cursor: pointer; font-size: 13px; font-weight: 600; color: #1565c0;">
            <input 
              type="checkbox" 
              id="street-view-toggle" 
              style="cursor: pointer; width: 18px; height: 18px; accent-color: #2196F3;"
            >
            <span>🏙️ Mostrar Street View</span>
          </label>
        </div>
      </div>
      
      <div class="sidebar-section">
        <div class="sidebar-title">Filtro Global por Barrio</div>
        <select id="global-barrio-filter" style="width: 100%; padding: 8px; border: none; border-radius: 4px;">
          <option value="all">Todos los Barrios</option>
        </select>
      </div>

      <div class="sidebar-section" style="position: relative; z-index: 100;">
        <div class="sidebar-title">Capas Geográficas</div>
        <div class="button-group" style="position: relative; z-index: 100;">
          <label style="display: flex; align-items: center; gap: 8px; font-size: 12px; cursor: pointer; position: relative; z-index: 100;">
            <input type="checkbox" id="toggle-barrios" style="position: relative; z-index: 101; cursor: pointer; width: 16px; height: 16px; margin: 0; padding: 0;">
            <span style="position: relative; z-index: 100;">Zonas / Barrios</span>
          </label>
          <label style="display: flex; align-items: center; gap: 8px; font-size: 12px; cursor: pointer; margin-top: 8px; position: relative; z-index: 100;">
            <input type="checkbox" id="siniestros-checkbox" style="position: relative; z-index: 101; cursor: pointer; width: 16px; height: 16px; margin: 0; padding: 0;">
            <span style="position: relative; z-index: 100;">Mostrar Siniestros (<span id="total-siniestros-count">0</span>)</span>
          </label>
          <label style="display: flex; align-items: center; gap: 8px; font-size: 12px; cursor: pointer; margin-top: 8px; position: relative; z-index: 100;">
            <input type="checkbox" id="cameras-checkbox" style="position: relative; z-index: 101; cursor: pointer; width: 16px; height: 16px; margin: 0; padding: 0;">
            <span style="position: relative; z-index: 100;">Mostrar Cámaras (<span id="total-cameras-count">0</span>)</span>
          </label>
          <label style="display: flex; align-items: center; gap: 8px; font-size: 12px; cursor: pointer; margin-top: 8px; position: relative; z-index: 100;">
            <input type="checkbox" id="private-cameras-checkbox" style="position: relative; z-index: 101; cursor: pointer; width: 16px; height: 16px; margin: 0; padding: 0;">
            <span style="position: relative; z-index: 100;">Cámaras Privadas (<span id="total-private-cameras-count">0</span>)</span>
          </label>
          <label style="display: flex; align-items: center; gap: 8px; font-size: 12px; cursor: pointer; margin-top: 8px; position: relative; z-index: 100;">
            <input type="checkbox" id="semaforos-checkbox" style="position: relative; z-index: 101; cursor: pointer; width: 16px; height: 16px; margin: 0; padding: 0;">
            <span style="position: relative; z-index: 100;">Mostrar Semáforos (<span id="total-semaforos-count">0</span>)</span>
          </label>
          <label style="display: flex; align-items: center; gap: 8px; font-size: 12px; cursor: pointer; margin-top: 8px; position: relative; z-index: 100;">
            <input type="checkbox" id="heatmap-checkbox" style="position: relative; z-index: 101; cursor: pointer; width: 16px; height: 16px; margin: 0; padding: 0;">
            <span style="position: relative; z-index: 100;">🔥 Mapa de Calor de Siniestros</span>
          </label>
          <label style="display: flex; align-items: center; gap: 8px; font-size: 12px; cursor: pointer; margin-top: 8px; position: relative; z-index: 100;">
            <input type="checkbox" id="colegios-checkbox" style="position: relative; z-index: 101; cursor: pointer; width: 16px; height: 16px; margin: 0; padding: 0;">
            <span style="position: relative; z-index: 100;">🏫 Escuelas y Colegios (<span id="total-colegios-count">0</span>)</span>
          </label>
          <label style="display: flex; align-items: center; gap: 8px; font-size: 12px; cursor: pointer; margin-top: 8px; position: relative; z-index: 100;">
            <input type="checkbox" id="corredores-checkbox" style="position: relative; z-index: 101; cursor: pointer; width: 16px; height: 16px; margin: 0; padding: 0;">
            <span style="position: relative; z-index: 100;">🚌 Corredores Escolares</span>
          </label>
          <label style="display: flex; align-items: center; gap: 8px; font-size: 12px; cursor: pointer; margin-top: 8px; position: relative; z-index: 100;">
            <input type="checkbox" id="aforos-checkbox" disabled style="position: relative; z-index: 101; cursor: pointer; width: 16px; height: 16px; margin: 0; padding: 0; opacity: 0.5;">
            <span style="position: relative; z-index: 100;">📊 Aforos - Flujo Vehicular</span>
          </label>
        </div>
        <div style="font-size: 11px; color: #666; margin-top: 8px; padding: 8px; background: #f0f0f0; border-radius: 4px;">
          📊 Haz clic en las zonas para ver detalles
        </div>
      </div>

      <div id="siniestros-filters-section" class="sidebar-section" style="display: none;">
        <div class="sidebar-title">Filtrar Siniestros</div>
        <div style="font-size: 12px;">
          <label style="display: block; margin-bottom: 8px;">
            Año:
            <select id="year-filter" style="width: 100%; padding: 4px;"><option value="all">Todos</option></select>
          </label>
          
          <label style="display: block; margin-bottom: 8px;">
            Causa:
            <select id="cause-filter" style="width: 100%; padding: 4px;"><option value="all">Todas</option></select>
          </label>
          
          <label style="display: block; margin-bottom: 8px;">
            Participante:
            <select id="participant-filter" style="width: 100%; padding: 4px;"><option value="all">Todos</option></select>
          </label>

          <label style="display: block; margin-bottom: 8px;">
            Desde Hora:
            <select id="start-hour-filter" style="width: 100%; padding: 4px;"><option value="all">Todas</option></select>
          </label>

          <label style="display: block; margin-bottom: 8px;">
            Hasta Hora:
            <select id="end-hour-filter" style="width: 100%; padding: 4px;"><option value="all">Todas</option></select>
          </label>

          <label style="display: block; margin-bottom: 8px;">
            Calle:
            <input type="text" id="street-filter" placeholder="Nombre de la calle..." style="padding: 4px;">
          </label>

          <button id="clear-filters-btn" style="width: 100%; margin-top: 8px; padding: 8px; background: #555; color: white; border: none; border-radius: 4px; cursor: pointer; font-size: 12px;">
            Limpiar Filtros
          </button>
        </div>
      </div>

      <div id="aforos-filters-section" class="sidebar-section" style="display: none;">
        <div class="sidebar-title">Filtrar Aforos</div>
        <div style="font-size: 12px;">
          <label style="display: block; margin-bottom: 8px;">
            Año:
            <select id="aforos-year-filter" style="width: 100%; padding: 4px;"><option value="all">Todos</option></select>
          </label>
          
          <label style="display: block; margin-bottom: 8px;">
            Mes:
            <select id="aforos-month-filter" style="width: 100%; padding: 4px;"><option value="all">Todos</option></select>
          </label>
          
          <label style="display: block; margin-bottom: 8px;">
            Día de la Semana:
            <select id="aforos-dayofweek-filter" style="width: 100%; padding: 4px;"><option value="all">Todos</option></select>
          </label>

          <label style="display: block; margin-bottom: 8px;">
            Desde Hora:
            <select id="aforos-start-hour-filter" style="width: 100%; padding: 4px;"><option value="all">Todas</option></select>
          </label>

          <label style="display: block; margin-bottom: 8px;">
            Hasta Hora:
            <select id="aforos-end-hour-filter" style="width: 100%; padding: 4px;"><option value="all">Todas</option></select>
          </label>

          <label style="display: block; margin-bottom: 8px;">
            Tipo Vehículo:
            <select id="aforos-vehicle-type-filter" style="width: 100%; padding: 4px;"><option value="all">Todos</option></select>
          </label>

          <button id="clear-aforos-filters-btn" style="width: 100%; margin-top: 8px; padding: 8px; background: #555; color: white; border: none; border-radius: 4px; cursor: pointer; font-size: 12px;">
            Limpiar Filtros Aforos
          </button>

          <div id="aforos-stats" style="margin-top: 12px; padding: 8px; background: #f0f0f0; border-radius: 4px; font-size: 11px; display: none;">
            <strong>Estadísticas:</strong>
            <div style="margin-top: 4px;">
              Total: <span id="aforos-total-vehicles">0</span> vehículos
            </div>
          </div>
        </div>
      </div>

      <div class="sidebar-section">
        <div class="sidebar-title">🚗 Robo Automotor</div>
        <label style="display: flex; align-items: center; gap: 8px; font-size: 12px; cursor: pointer; margin-bottom: 12px;">
          <input type="checkbox" id="robo-checkbox" style="cursor: pointer; width: 16px; height: 16px;">
          <span>Mostrar Robos</span>
        </label>
        
        <div id="robo-filters" style="display: none; font-size: 12px;">
          <label style="display: block; margin-bottom: 8px;">
            Año:
            <select id="robo-year-filter" style="width: 100%; padding: 4px;"><option value="all">Todos los Años</option></select>
          </label>
          
          <label style="display: block; margin-bottom: 8px;">
            Filtrar por Resultado:
            <select id="robo-resultado-filter" style="width: 100%; padding: 4px;"><option value="all">Todos los Resultados</option></select>
          </label>

          <label style="display: flex; align-items: center; gap: 8px; font-size: 12px; cursor: pointer; margin-top: 10px;">
            <input type="checkbox" id="robo-heatmap-checkbox" style="cursor: pointer; width: 16px; height: 16px;">
            <span>Mapa de Calor (Robos)</span>
          </label>

          <button id="clear-robo-filters-btn" style="width: 100%; margin-top: 8px; padding: 10px; background: #e74c3c; color: white; border: none; border-radius: 4px; cursor: pointer; font-size: 12px; font-weight: bold; transition: background 0.2s;" onmouseover="this.style.background='#c0392b'" onmouseout="this.style.background='#e74c3c'">
            🧹 Limpiar Filtros Robos
          </button>

          <div id="robo-stats" style="margin-top: 12px; padding: 8px; background: #f0f0f0; border-radius: 4px; font-size: 11px; color: #1a1a1a;">
            <strong>Estadísticas:</strong>
            <div style="margin-top: 4px;">
              Total: <span id="robo-total-count">0</span> robos registrados
            </div>
          </div>

          <div style="margin-top: 12px; padding: 10px; background: #f9f9f9; border-radius: 4px; border: 1px solid #ddd;">
            <strong style="display: block; margin-bottom: 8px; color: #1a1a1a;">🎨 Leyenda de Resultados:</strong>
            <div style="font-size: 10px; line-height: 1.6; color: #1a1a1a;">
              <div style="display: flex; gap: 6px; align-items: center; margin-bottom: 4px;">
                <span style="display: inline-block; width: 12px; height: 12px; background-color: #f39c12; border-radius: 50%; border: 1px solid #333;"></span>
                <span style="color: #1a1a1a;">Asiste Policía y Libera</span>
              </div>
              <div style="display: flex; gap: 6px; align-items: center; margin-bottom: 4px;">
                <span style="display: inline-block; width: 12px; height: 12px; background-color: #27ae60; border-radius: 50%; border: 1px solid #333;"></span>
                <span style="color: #1a1a1a;">Hallazgo de Automotor</span>
              </div>
              <div style="display: flex; gap: 6px; align-items: center; margin-bottom: 4px;">
                <span style="display: inline-block; width: 12px; height: 12px; background-color: #e74c3c; border-radius: 50%; border: 1px solid #333;"></span>
                <span style="color: #1a1a1a;">Persecución y Detención</span>
              </div>
              <div style="display: flex; gap: 6px; align-items: center; margin-bottom: 4px;">
                <span style="display: inline-block; width: 12px; height: 12px; background-color: #c0392b; border-radius: 50%; border: 1px solid #333;"></span>
                <span style="color: #1a1a1a;">Detención</span>
              </div>
              <div style="display: flex; gap: 6px; align-items: center; margin-bottom: 4px;">
                <span style="display: inline-block; width: 12px; height: 12px; background-color: #3498db; border-radius: 50%; border: 1px solid #333;"></span>
                <span style="color: #1a1a1a;">Seguimiento del Evento</span>
              </div>
              <div style="display: flex; gap: 6px; align-items: center; margin-bottom: 4px;">
                <span style="display: inline-block; width: 12px; height: 12px; background-color: #f1c40f; border-radius: 50%; border: 1px solid #333;"></span>
                <span style="color: #1a1a1a;">No Asiste</span>
              </div>
              <div style="display: flex; gap: 6px; align-items: center; margin-bottom: 4px;">
                <span style="display: inline-block; width: 12px; height: 12px; background-color: #9b59b6; border-radius: 50%; border: 1px solid #333;"></span>
                <span style="color: #1a1a1a;">Secuestro de Vehículo</span>
              </div>
              <div style="display: flex; gap: 6px; align-items: center; margin-bottom: 4px;">
                <span style="display: inline-block; width: 12px; height: 12px; background-color: #e67e22; border-radius: 50%; border: 1px solid #333;"></span>
                <span style="color: #1a1a1a;">Asiste Bomberos</span>
              </div>
              <div style="display: flex; gap: 6px; align-items: center; margin-bottom: 4px;">
                <span style="display: inline-block; width: 12px; height: 12px; background-color: #34495e; border-radius: 50%; border: 1px solid #333;"></span>
                <span style="color: #1a1a1a;">Persecución y Pérdida</span>
              </div>
              <div style="display: flex; gap: 6px; align-items: center;">
                <span style="display: inline-block; width: 12px; height: 12px; background-color: #1abc9c; border-radius: 50%; border: 1px solid #333;"></span>
                <span style="color: #1a1a1a;">Asiste Unidad Sanitaria</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div class="sidebar-section">
        <div class="sidebar-title">🚓 Patrullas</div>
        <label style="display: flex; align-items: center; gap: 8px; font-size: 12px; cursor: pointer; margin-bottom: 12px;">
          <input type="checkbox" id="patrullas-checkbox" style="cursor: pointer; width: 16px; height: 16px;">
          <span>Mostrar Patrullas</span>
        </label>

        <div id="patrullas-stats" style="display: none; font-size: 12px; padding: 8px; background: #f0f0f0; border-radius: 4px;">
          <strong style="color: #1a1a1a;">Estadísticas:</strong>
          <div style="margin-top: 4px; color: #1a1a1a;">
            Total: <span id="patrullas-total-count">0</span><br>
            Online: <span id="patrullas-online-count" style="color: #10b981;">0</span><br>
            Emergencia: <span id="patrullas-emergencia-count" style="color: #dc2626;">0</span>
          </div>
        </div>
      </div>

      <div class="sidebar-section">
        <div class="sidebar-title">Controles</div>
        <div class="button-group">
          <button id="center-map-btn">
            <i class="fas fa-crosshairs"></i> Centrar Mapa
          </button>
          <button id="reset-view-btn" class="secondary">
            <i class="fas fa-redo"></i> Resetear Vista
          </button>
        </div>
      </div>
      
      <div class="sidebar-section">
        <div class="sidebar-title">Información</div>
        <div id="municipio-info" style="font-size: 12px; line-height: 1.6;">
          <strong>${window.CONFIG?.ciudad?.nombre || 'Ciudad'}</strong><br>
          ${window.CONFIG?.ciudad?.provincia || 'Provincia'}, Argentina<br>
          <small>info@municipio.gov.ar</small>
        </div>
      </div>
    `;
    
    // Adjuntar listener al checkbox de heatmap
    heatmapLayer.attachCheckboxListener();
    
    // Event listeners
    document.getElementById('logout-btn').addEventListener('click', () => {
      window.close();
      setTimeout(() => { window.location.href = '/login.html'; }, 500);
    });
    
    // Selector de mapa base
    document.getElementById('base-map-selector').addEventListener('change', (e) => {
      if (e.target.value === 'osm') {
        map.removeLayer(layers.satellite);
        layers.osm.addTo(map);
      } else if (e.target.value === 'satellite') {
        map.removeLayer(layers.osm);
        layers.satellite.addTo(map);
      }
    });
    
    // ============= BUSCADOR DE DIRECCIONES =============
    const addressSearchInput = document.getElementById('address-search-input');
    const addressSearchBtn = document.getElementById('address-search-btn');
    const addressResults = document.getElementById('address-results');
    const addressClearBtn = document.getElementById('address-clear-btn');

    if (addressSearchBtn) {
      addressSearchBtn.addEventListener('click', async (e) => {
        e.preventDefault();
        const query = addressSearchInput.value.trim();
        if (query.length === 0) {
          addressResults.style.display = 'none';
          return;
        }

        if (typeof GeoLocator === 'undefined') {
          console.warn('⚠️ GeoLocator no cargado');
          return;
        }

        const results = await GeoLocator.search(query);
        console.log(`🔍 Búsqueda de "${query}": ${results.length} resultados`);

        if (results.length === 0) {
          // Mostrar sugerencias de direcciones disponibles
          const allAddresses = GeoLocator.getIndex();
          const suggestions = allAddresses.slice(0, 10); // Top 10 direcciones
          
          let html = `<div style="padding: 10px; color: #c33; font-size: 12px; border-bottom: 1px solid #ddd;">
            ❌ No se encontraron resultados para "${query}"<br>
            <span style="color: #666; font-size: 11px;">Algunas direcciones disponibles:</span>
          </div>`;
          
          suggestions.forEach((address, idx) => {
            html += `
              <div class="address-suggestion" data-address-idx="${idx}" style="padding: 8px; border-bottom: 1px solid #eee; cursor: pointer; background: #f0f0f0; margin: 2px 0; border-radius: 3px; font-size: 11px;">
                <div style="color: #0066ff; font-weight: 500;">${address.original}</div>
              </div>
            `;
          });
          
          addressResults.innerHTML = html;
          addressResults.style.display = 'block';

          // Agregar event listeners a sugerencias
          document.querySelectorAll('.address-suggestion').forEach(item => {
            item.addEventListener('click', () => {
              const idx = parseInt(item.getAttribute('data-address-idx'));
              const address = GeoLocator.getIndex()[idx];
              console.log(`✅ Seleccionado (sugerencia): ${address.original}`);
              GeoLocator.showLocation(address);
              addressResults.style.display = 'none';
              addressClearBtn.style.display = 'block';
              addressSearchInput.value = address.original;
            });
          });
          return;
        }

        // Mostrar resultados
        let html = '<div style="padding: 8px; border-top: 1px solid #ddd;">';
        results.forEach((result, idx) => {
          const lat = result.lat || (result.coordinates ? result.coordinates[1] : '?');
          const lng = result.lng || (result.coordinates ? result.coordinates[0] : '?');
          
          // Determinar icono y etiqueta según fuente
          let badge = '📎';
          let bgColor = '#f9f9f9';
          if (result.source === 'nominatim') {
            badge = '🌐';
            bgColor = '#e8f4fd';
          }
          if (result.matchType && result.matchType.includes('nominatim')) {
            badge = '🌐';
            bgColor = '#e8f4fd';
          }
          
          const matchTypeLabel = {
            'exacta': 'coincidencia exacta',
            'parcial': 'coincidencia parcial',
            'cruce': 'cruce local',
            'cruce_fuzzy': 'cruce similar',
            'nominatim_cruce': 'cruce (OpenStreetMap)',
            'nominatim_address': 'dirección (OpenStreetMap)',
            'palabra_clave': 'por palabra clave',
            'similar': 'similar'
          };
          
          const label = matchTypeLabel[result.matchType] || result.matchType || 'resultado';
          
          html += `
            <div style="padding: 10px; border-bottom: 1px solid #ddd; cursor: pointer; background: ${bgColor}; margin: 0; border-radius: 0; transition: background 0.2s;"
              data-idx="${idx}"
              onmouseover="this.style.background='#d4e8f5';"
              onmouseout="this.style.background='${bgColor}';">
              <div style="color: #0066ff; font-size: 13px; font-weight: 500;">${badge} ${result.original}</div>
              <div style="color: #666; font-size: 11px; margin-top: 3px;">📍 ${typeof lat === 'number' ? lat.toFixed(4) : lat}, ${typeof lng === 'number' ? lng.toFixed(4) : lng} <span style="color: #999; margin-left: 8px;">${label}</span></div>
            </div>
          `;
        });
        html += '</div>';
        addressResults.innerHTML = html;
        addressResults.style.display = 'block';
        
        console.log(`📊 HTML generado con ${results.length} resultados`);

        // Event listeners para resultados - usar delegación de eventos más robusta
        setTimeout(() => {
          const resultItems = document.querySelectorAll('[data-idx]');
          console.log(`🔗 Encontrados ${resultItems.length} items con data-idx`);
          
          resultItems.forEach((item) => {
            item.addEventListener('click', () => {
              const idx = parseInt(item.getAttribute('data-idx'));
              const selected = results[idx];
              console.log(`✅ CLICK en resultado[${idx}]:`, selected);
              
              if (!selected) {
                console.error('❌ Resultado undefined en índice', idx);
                return;
              }
              
              if (typeof GeoLocator === 'undefined') {
                console.error('❌ GeoLocator no disponible');
                return;
              }
              
              console.log('📍 Llamando a GeoLocator.showLocation()...');
              GeoLocator.showLocation(selected);
              addressResults.style.display = 'none';
              addressClearBtn.style.display = 'block';
              addressSearchInput.value = selected.original || 'Ubicación';
              
              // Mostrar toggle de Street View
              const toggleContainer = document.getElementById('street-view-toggle-container');
              const streetViewToggle = document.getElementById('street-view-toggle');
              if (toggleContainer) {
                toggleContainer.style.display = 'block';
                console.log('🏙️ Toggle de Street View mostrado');
                if (streetViewToggle) {
                  streetViewToggle.checked = false; // Desactivado por defecto
                  // Asegurar que el listener esté configurado
                  setupStreetViewToggle();
                }
              }
            });
          });
        }, 100);
      });
    }

    if (addressSearchInput) {
      addressSearchInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
          addressSearchBtn.click();
        }
      });
    }

    if (addressClearBtn) {
      addressClearBtn.addEventListener('click', () => {
        if (typeof GeoLocator !== 'undefined') {
          GeoLocator.clearMarker();
        }
        addressClearBtn.style.display = 'none';
        addressResults.style.display = 'none';
        addressSearchInput.value = '';
        
        // Ocultar toggle de Street View y cerrar Street View
        const toggleContainer = document.getElementById('street-view-toggle-container');
        const streetViewToggle = document.getElementById('street-view-toggle');
        if (toggleContainer) {
          toggleContainer.style.display = 'none';
        }
        if (streetViewToggle && streetViewToggle.checked) {
          streetViewToggle.checked = false;
          if (typeof StreetViewLayer !== 'undefined') {
            StreetViewLayer.hide();
          }
        }
        
        console.log('🧹 Búsqueda y marcador limpiados');
      });
    }
    
    // Mostrar mapa
    document.getElementById('map').style.opacity = '1';
    
    // Inicializar mapa si no existe
    iniciarMapa();
    
    // Cargar datos geográficos Y siniestros PRIMERO
    console.log(`📍 INICIALIZANDO CARGA DE DATOS DE ${currentCity.toUpperCase()}`);
    cargarDatosGeograficos(currentCity).then((bariosGeoJson) => {
      console.log('✅ PROMESA cargarDatosGeograficos() RESUELTA');
      console.log('   - bariosGeoJson:', bariosGeoJson ? `${bariosGeoJson.features?.length} features` : 'NULL');
      
      // Pasar datos de barrios a módulos de cámaras para point-in-polygon
      if (bariosGeoJson) {
        console.log('📍 Pasando barrios a CamerasLayer y PrivateCamerasLayer...');
        CamerasLayer.setBarriosGeoJson(bariosGeoJson);
        PrivateCamerasLayer.setBarriosGeoJson(bariosGeoJson);
        console.log('✓ Modulos actualizados con barrios');
      }
      
      // LUEGO configurar event listeners
      console.log('📍 Configurando filtros de siniestros...');
      setupSinistrosFilters(bariosGeoJson);
      console.log('✓ Filtros configurados');

      // Cargar líneas de colectivos (se inicializará cuando el usuario haga click)
      console.log('📍 Precargando líneas de colectivos...');
      ColectivosLayer.loadLineas(`data`, currentCity)
        .then(lineas => {
          if (lineas && Object.keys(lineas).length > 0) {
            console.log(`✓ ${Object.keys(lineas).length} líneas de colectivos cargadas`);
          } else {
            console.log('ℹ️ No hay líneas de colectivos disponibles');
          }
        })
        .catch(e => console.warn('⚠️ Error cargando colectivos:', e));
      
      // Asegurar que todo está apagado (SIN DELAY)
      console.log('🔧 Asegurando que todo está apagado...');
      const sinCheckbox = document.getElementById('siniestros-checkbox');
      const camCheckbox = document.getElementById('cameras-checkbox');
      const toggleBarrios = document.getElementById('toggle-barrios');
      
      if (toggleBarrios) {
        console.log('🔄 Apagando barrios...');
        toggleBarrios.checked = false;
        if (GeoLayers.isLayerVisible('Zonas / Barrios')) {
          GeoLayers.toggleLayer('Zonas / Barrios');
        }
        console.log('  ✓ Barrios apagados');
      }
      
      if (sinCheckbox && SiniestrosLayer) {
        console.log('🔄 Apagando siniestros...');
        sinCheckbox.checked = false;
        SiniestrosLayer.toggle(false);
        console.log('  ✓ Siniestros apagados');
      }
      
      if (camCheckbox && CamerasLayer) {
        console.log('🔄 Apagando cámaras...');
        camCheckbox.checked = false;
        CamerasLayer.toggle(false);
        console.log('  ✓ Cámaras apagadas');
      }
      
      console.log('✅ INICIALIZACION COMPLETADA - CONTADORES ACTUALIZADOS AL INSTANTE');
    }).catch(err => {
      console.error('❌ ERROR EN PROMESA cargarDatosGeograficos():', err);
    });
    
    // Función para configurar event listeners de filtros
    const setupSinistrosFilters = (bariosGeoJson) => {
      // ==========================================
      // Llenar Selector Global de Barrio
      // ==========================================
      const globalBarrioSelect = document.getElementById('global-barrio-filter');
      if (globalBarrioSelect && bariosGeoJson && bariosGeoJson.features) {
        const barrios = new Set();
        
        bariosGeoJson.features.forEach(feature => {
          // Soportar ambas propiedades: soc_fomen (MDP) y nombre (Córdoba)
          const barrioName = feature.properties?.nombre || feature.properties?.soc_fomen;
          if (barrioName) {
            barrios.add(barrioName);
          }
        });
        
        // Agregar opciones de barrios
        Array.from(barrios).sort().forEach(barrio => {
          const option = document.createElement('option');
          option.value = barrio;
          option.textContent = barrio;
          globalBarrioSelect.appendChild(option);
        });
        
        console.log(`✓ ${barrios.size} barrios cargados en selector global`);
      }

      // ==========================================
      // Evento de Selector Global de Barrio
      // ==========================================
      if (globalBarrioSelect) {
        globalBarrioSelect.addEventListener('change', (e) => {
          const barrio = e.target.value;
          console.log('🏘️ Barrio global seleccionado:', barrio);
          
          // Aplicar filtro SOLO a las capas que ya están visibles
          const sinCheckbox = document.getElementById('siniestros-checkbox');
          const camCheckbox = document.getElementById('cameras-checkbox');
          const privCamCheckbox = document.getElementById('private-cameras-checkbox');
          const semaforosCheckbox = document.getElementById('semaforos-checkbox');
          
          if (sinCheckbox && sinCheckbox.checked) {
            SiniestrosLayer.setFilter('globalBarrio', barrio === 'all' ? 'all' : barrio);
            console.log(`  ✓ Filtro de siniestros actualizado: ${barrio}`);
          }
          if (camCheckbox && camCheckbox.checked) {
            CamerasLayer.setFilter('globalBarrio', barrio === 'all' ? 'all' : barrio);
            console.log(`  ✓ Filtro de cámaras actualizado: ${barrio}`);
          }
          if (privCamCheckbox && privCamCheckbox.checked) {
            PrivateCamerasLayer.setFilter('globalBarrio', barrio === 'all' ? 'all' : barrio);
            console.log(`  ✓ Filtro de cámaras privadas actualizado: ${barrio}`);
          }
          if (semaforosCheckbox && semaforosCheckbox.checked) {
            SemaforosLayer.setFilter('globalBarrio', barrio === 'all' ? 'all' : barrio);
            console.log(`  ✓ Filtro de semáforos actualizado: ${barrio}`);
          }
          
          // Aplicar filtro al heatmap (siempre, aunque no esté visible)
          heatmapLayer.setFilter('globalBarrio', barrio === 'all' ? 'all' : barrio);
          console.log(`  ✓ Filtro de mapa de calor actualizado: ${barrio}`);
          
          // Solo resaltar visualmente - sin depender del checkbox
          if (barrio !== 'all') {
            GeoLayers.highlightBarrio(barrio);
          } else {
            GeoLayers.clearHighlight();
          }
        });
      }

      // ==========================================
      // CONFIGURAR LISTENERS CON EVENT DELEGATION
      // ==========================================
      const filterMap = {
        'year-filter': 'year',
        'cause-filter': 'cause',
        'participant-filter': 'participant',
        'start-hour-filter': 'startHour',
        'end-hour-filter': 'endHour'
      };

      console.log('🔷 Iniciando event delegation listeners para filtros...');
      console.log(`🔷 SiniestrosLayer existe: ${!!SiniestrosLayer}`);

      // Usar delegación de eventos en el document para que funcione con elementos creados dinámicamente
      document.addEventListener('change', (e) => {
        const allFilterIds = Object.keys(filterMap);
        if (allFilterIds.includes(e.target.id)) {
          const filterId = e.target.id;
          const filterKey = filterMap[filterId];
          console.log(`✅ EVENT DELEGADO DISPARADO - [${filterId}] valor: "${e.target.value}"`);
          
          if (!SiniestrosLayer) {
            console.error('❌ SiniestrosLayer NO EXISTE');
          } else if (!filterKey) {
            console.error(`❌ filterKey no encontrada para ${filterId}`);
          } else {
            console.log(`✅ Llamando SiniestrosLayer.setFilter("${filterKey}", "${e.target.value}")`);
            SiniestrosLayer.setFilter(filterKey, e.target.value);
          }
        }
      });

      // Filtro de calle (text input) - también con delegación
      document.addEventListener('input', (e) => {
        if (e.target.id === 'street-filter') {
          console.log('Street filter:', e.target.value);
          if (SiniestrosLayer) {
            SiniestrosLayer.setFilter('street', e.target.value);
          }
        }
      });
      
      // Botón limpiar filtros
      const clearBtn = document.getElementById('clear-filters-btn');
      if (clearBtn) {
        clearBtn.addEventListener('click', () => {
          console.log('🧹 Limpiando todos los filtros');
          
          // Deseleccionar todas las checkboxes de capas
          const sinCheckbox = document.getElementById('siniestros-checkbox');
          const camCheckbox = document.getElementById('cameras-checkbox');
          const privCamCheckbox = document.getElementById('private-cameras-checkbox');
          const semaforosCheckbox = document.getElementById('semaforos-checkbox');
          const heatmapCheckbox = document.getElementById('heatmap-checkbox');
          const zonesCheckbox = document.getElementById('toggle-barrios');
          
          if (sinCheckbox) sinCheckbox.checked = false;
          if (camCheckbox) camCheckbox.checked = false;
          if (privCamCheckbox) privCamCheckbox.checked = false;
          if (semaforosCheckbox) semaforosCheckbox.checked = false;
          if (heatmapCheckbox) heatmapCheckbox.checked = false;
          if (zonesCheckbox) zonesCheckbox.checked = false;
          
          // Resetear filtro global de barrio
          const globalBarrioSelect = document.getElementById('global-barrio-filter');
          if (globalBarrioSelect) {
            globalBarrioSelect.value = 'all';
          }
          
          // Ocultar explícitamente la capa de Zonas/Barrios si está visible
          if (GeoLayers.isLayerVisible('Zonas / Barrios')) {
            GeoLayers.toggleLayer('Zonas / Barrios');
          }
          
          // Resetear todos los selectores de filtros
          const filterSelects = [
            'year-filter',
            'barrio-filter',
            'cause-filter',
            'participant-filter',
            'start-hour-filter',
            'end-hour-filter',
            'barrio-cameras-filter',
            'type-cameras-filter',
            'corridor-cameras-filter',
            'camera-type-filter',
            'street-filter'
          ];
          
          filterSelects.forEach(selectId => {
            const element = document.getElementById(selectId);
            if (element) {
              if (element.tagName === 'SELECT') {
                element.value = 'all';
              } else if (element.tagName === 'INPUT') {
                element.value = '';
              }
            }
          });
          
          // Limpiar resaltado de barrio
          GeoLayers.clearHighlight();
          
          // Limpiar filtros de siniestros
          SiniestrosLayer.clearFilters();
          
          // Limpiar filtros de cámaras
          CamerasLayer.clearFilters();
          
          // Limpiar filtros de cámaras privadas
          PrivateCamerasLayer.clearFilters();
          
          // Limpiar filtros de semáforos
          SemaforosLayer.clearFilters();
          
          // Limpiar filtro de heatmap
          heatmapLayer.setFilter('globalBarrio', 'all');
          
          // Ocultar todas las capas
          SiniestrosLayer.toggle(false);
          CamerasLayer.toggle(false);
          PrivateCamerasLayer.toggle(false);
          SemaforosLayer.toggle(false);
          heatmapLayer.toggle(false);
          GeoLayers.toggle('all', false);
          
          // Limpiar aforos
          if (typeof AforosLayer !== 'undefined') {
            AforosLayer.clearMarkers();
            const aforosCheckbox = document.getElementById('aforos-checkbox');
            if (aforosCheckbox) aforosCheckbox.checked = false;
          }
          
          console.log('✅ Todos los filtros, checkboxes y capas han sido limpiados');
        });
      }
    };
  }
});

// ============================
// TOGGLE DE STREET VIEW
// ============================
let streetViewToggleSetup = false;

function setupStreetViewToggle() {
  const streetViewToggle = document.getElementById('street-view-toggle');
  
  console.log('🔧 setupStreetViewToggle() llamado - toggle existe:', !!streetViewToggle, 'ya configurado:', streetViewToggleSetup);
  
  if (!streetViewToggle || streetViewToggleSetup) {
    return;
  }
  
  streetViewToggle.addEventListener('change', function(e) {
    console.log('🔄 Toggle change event disparado:', this.checked);
    
    if (!window.lastSearchLocation) {
      console.warn('⚠️ Sin ubicación guardada');
      this.checked = false;
      alert('Por favor, busca una dirección primero');
      return;
    }
    
    if (this.checked) {
      // Activar Street View
      console.log('✅ Activando Street View...');
      if (typeof StreetViewLayer !== 'undefined') {
        StreetViewLayer.showAt(
          window.lastSearchLocation.lat, 
          window.lastSearchLocation.lng,
          window.lastSearchLocation.address
        );
        console.log('✅ Street View activado manualmente');
      } else {
        console.error('❌ StreetViewLayer no disponible');
      }
    } else {
      // Desactivar Street View
      console.log('❌ Desactivando Street View...');
      if (typeof StreetViewLayer !== 'undefined') {
        StreetViewLayer.hide();
        console.log('❌ Street View desactivado manualmente');
      }
    }
  });
  
  streetViewToggleSetup = true;
  console.log('✅ setupStreetViewToggle() completado - listener agregado');
}

// Llamar al setup cuando se haya renderizado el sidebar
setTimeout(() => {
  setupStreetViewToggle();
}, 300);

// Inicializar mapa al cargar
iniciarMapa();
