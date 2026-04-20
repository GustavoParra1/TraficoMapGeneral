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
    map = L.map('map').setView([-38.0, -57.55], 12);
    
    // Capa OSM
    layers.osm = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© OpenStreetMap contributors',
      maxZoom: 19,
      name: 'OpenStreetMap'
    }).addTo(map);
    
    // Capa satélite
    layers.satellite = L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
      attribution: 'Tiles &copy; Esri',
      maxZoom: 19,
      name: 'Satélite'
    });
    
    // Inicializar módulo de capas geográficas
    GeoLayers.init(map);
    
    // Inicializar módulo de siniestros
    SiniestrosLayer.init(map);
    
    // Inicializar módulo de cámaras
    CamerasLayer.init(map);
    
    // Inicializar módulo de cámaras privadas
    PrivateCamerasLayer.init(map);
    
    // Inicializar módulo de LPR (Lectores de Patentes)
    if (typeof LprLayer !== 'undefined') {
      LprLayer.init(map);
    }
    
    // Inicializar módulo de semáforos
    SemaforosLayer.init(map);
    
    // Inicializar módulo de escuelas y colegios
    ColegiosLayer.init(map);
    
    // Inicializar módulo de corredores escolares
    CorredoresLayer.init(map);
    
    // Inicializar módulo de colectivos
    ColectivosLayer.init(map);
    
    // Inicializar módulo de heatmap
    heatmapLayer.init();
    
    // Inicializar módulo de aforos
    if (typeof AforosLayer !== 'undefined') {
      AforosLayer.init(map);
    }
    
    // Inicializar módulo de robos
    if (typeof RoboLayer !== 'undefined') {
      RoboLayer.init(map);
    }
    
    // Inicializar módulo de Street View
    if (typeof StreetViewLayer !== 'undefined') {
      StreetViewLayer.init();
    }
    
    // Inicializar módulo de búsqueda de direcciones
    if (typeof GeoLocator !== 'undefined') {
      GeoLocator.init(map);
    }
    
    console.log("✅ Mapa inicializado");
  }
}

// ============================
// CONFIGURACIÓN DE CIUDADES
// ============================
let currentCity = 'mar-del-plata'; // Cambiar a mar-del-plata para usar datos reales con propiedades LPR
let citiesConfig = null;

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

// Variables globales para seguimiento de ciudad actual
let currentCityConfig = null;
let checkboxLocks = {};

// Cargar datos geográficos dinámicamente según ciudad
async function cargarDatosGeograficos(cityId = 'mar-del-plata') {
  console.log(`📍 INICIO: Cargando datos para ciudad: ${cityId}`);
  
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
  const userCities = ImportCities.getUserCities();
  
  if (userCities[cityId]) {
    cityConfig = userCities[cityId];
    console.log(`✓ Ciudad del usuario encontrada: ${cityConfig.name}`);
  } else {
    cityConfig = citiesConfig.cities.find(c => c.id === cityId);
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
      console.warn('⚠️ No hay metadata disponible en RoboLayer');
      return;
    }
    
    // Años
    const yearFilter = document.getElementById('robo-year-filter');
    if (yearFilter && metadata.years && metadata.years.length > 0) {
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
    
    // Resultados
    const resultadoFilter = document.getElementById('robo-resultado-filter');
    if (resultadoFilter && metadata.resultados && metadata.resultados.length > 0) {
      const options = resultadoFilter.querySelectorAll('option:not(:first-child)');
      options.forEach(opt => opt.remove());
      
      metadata.resultados.forEach(resultado => {
        const option = document.createElement('option');
        option.value = resultado;
        option.textContent = resultado;
        resultadoFilter.appendChild(option);
      });
      console.log(`  ✓ Resultados: ${metadata.resultados.length} disponibles`);
    }
    
    // Actualizar total de robos
    const totalSpan = document.getElementById('robo-total-count');
    if (totalSpan && metadata.total) {
      totalSpan.textContent = metadata.total.toLocaleString();
    }
    
    console.log('✅ Filtros de robos poblados correctamente');
  } catch (error) {
    console.error('❌ Error poblando filtros de robos:', error);
  }
}

// ============================
// AUTENTICACIÓN
// ============================
auth.onAuthStateChanged((user) => {
  const sidebar = document.getElementById('sidebar');
  
  if (!user) {
    // Usuario NO autenticado - mostrar login
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
    
    // Ocultar mapa
    document.getElementById('map').style.opacity = '0.3';
    
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
        <div class="sidebar-title">Ciudad</div>
        <select id="city-selector" style="width: 100%; padding: 10px; border: 2px solid #0066ff; border-radius: 4px; background-color: #fff; color: #333; font-size: 13px; font-weight: 500;">
          <option value="mar-del-plata" selected>Mar del Plata</option>
          <option value="cordoba">Córdoba</option>
          <option value="san-martin-del-mar">San Martín del Mar</option>
        </select>
        <div style="font-size: 11px; color: #888; margin-top: 8px;">
          Selecciona una ciudad para cambiar los datos
        </div>
        
        <!-- Botón para importar nueva ciudad -->
        <button id="btn-import-city" style="width: 100%; margin-top: 12px; padding: 10px; background-color: #28a745; color: white; border: none; border-radius: 4px; cursor: pointer; font-weight: 500; font-size: 12px;">
          ➕ Importar Nueva Ciudad
        </button>
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

      <div class="sidebar-section">
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

      <div class="sidebar-section">
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

          <button id="clear-robo-filters-btn" style="width: 100%; margin-top: 8px; padding: 8px; background: #555; color: white; border: none; border-radius: 4px; cursor: pointer; font-size: 12px;">
            Limpiar Filtros Robos
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
                <span style="display: inline-block; width: 12px; height: 12px; background-color: #e74c3c; border-radius: 50%; border: 1px solid #333;"></span>
                <span style="color: #1a1a1a;">Intervención Policial</span>
              </div>
              <div style="display: flex; gap: 6px; align-items: center; margin-bottom: 4px;">
                <span style="display: inline-block; width: 12px; height: 12px; background-color: #f39c12; border-radius: 50%; border: 1px solid #333;"></span>
                <span style="color: #1a1a1a;">Asiste Policía y Libera</span>
              </div>
              <div style="display: flex; gap: 6px; align-items: center; margin-bottom: 4px;">
                <span style="display: inline-block; width: 12px; height: 12px; background-color: #27ae60; border-radius: 50%; border: 1px solid #333;"></span>
                <span style="color: #1a1a1a;">Hallazgo de Automotor</span>
              </div>
              <div style="display: flex; gap: 6px; align-items: center; margin-bottom: 4px;">
                <span style="display: inline-block; width: 12px; height: 12px; background-color: #f1c40f; border-radius: 50%; border: 1px solid #333;"></span>
                <span style="color: #1a1a1a;">Sin Recurso Policial</span>
              </div>
              <div style="display: flex; gap: 6px; align-items: center; margin-bottom: 4px;">
                <span style="display: inline-block; width: 12px; height: 12px; background-color: #3498db; border-radius: 50%; border: 1px solid #333;"></span>
                <span style="color: #1a1a1a;">Seguimiento LPR</span>
              </div>
              <div style="display: flex; gap: 6px; align-items: center; margin-bottom: 4px;">
                <span style="display: inline-block; width: 12px; height: 12px; background-color: #1abc9c; border-radius: 50%; border: 1px solid #333;"></span>
                <span style="color: #1a1a1a;">LPR Detención</span>
              </div>
              <div style="display: flex; gap: 6px; align-items: center;">
                <span style="display: inline-block; width: 12px; height: 12px; background-color: #95a5a6; border-radius: 50%; border: 1px solid #333;"></span>
                <span style="color: #1a1a1a;">Otros</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div class="sidebar-section">
        <div class="sidebar-title">Centro de Control</div>
        <div class="button-group">
          <button id="btn-show-colectivos" style="width: 100%; padding: 10px; background-color: #ff9500; color: white; border: none; border-radius: 4px; cursor: pointer; font-weight: 500; font-size: 12px; text-align: left;">
            🚌 Líneas de Colectivos (Control)
          </button>
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
          <strong>Mar del Plata</strong><br>
          Buenos Aires, Argentina<br>
          <small>info@municipio.gov.ar</small>
        </div>
      </div>
    `;
    
    // Adjuntar listener al checkbox de heatmap
    heatmapLayer.attachCheckboxListener();
    
    // CARGAR CIUDADES DEL USUARIO AL INICIAR SIDEBAR
    console.log('🔄 Cargando ciudades almacenadas del usuario...');
    
    const citySelector = document.getElementById('city-selector');
    
    // VERIFICACIÓN: Asegurar que ciudades predefinidas existan
    const predefinedCities = [
      { id: 'cordoba', name: 'Córdoba' },
      { id: 'mar-del-plata', name: 'Mar del Plata' },
      { id: 'san-martin-del-mar', name: 'San Martín del Mar' }
    ];
    
    if (citySelector) {
      predefinedCities.forEach(city => {
        const existingOption = Array.from(citySelector.options).find(o => o.value === city.id);
        if (!existingOption) {
          const option = document.createElement('option');
          option.value = city.id;
          option.textContent = city.name;
          citySelector.insertBefore(option, citySelector.firstChild);
          console.log(`🔧 Re-agregada ciudad predefinida: ${city.name}`);
        }
      });
    }
    
    ImportCities.loadUserCities();
    const userCities = ImportCities.getUserCities();
    
    if (citySelector && Object.keys(userCities).length > 0) {
      console.log(`📍 Encontradas ${Object.keys(userCities).length} ciudades del usuario`);
      Object.values(userCities).forEach(city => {
        const existingOption = Array.from(citySelector.options).find(o => o.value === city.id);
        if (!existingOption) {
          const option = document.createElement('option');
          option.value = city.id;
          option.textContent = `⭐ ${city.name} (Usuario)`;
          citySelector.appendChild(option);
          console.log(`  ✓ Agregado: ${city.name}`);
        }
      });
    } else if (citySelector) {
      console.log('ℹ️ No hay ciudades del usuario almacenadas');
    }
    
    // Event listeners
    document.getElementById('logout-btn').addEventListener('click', () => {
      auth.signOut();
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
    
    // Cambiar ciudad
    if (citySelector) {
      citySelector.addEventListener('change', async (e) => {
        const newCity = e.target.value;
        console.log(`\n========================================`);
        console.log(`🏙️ EVENTO CAMBIAR CIUDAD DISPARADO: ${newCity}`);
        console.log(`========================================`);
        
        currentCity = newCity;
        
        // VERIFICACIÓN 1: Verificar que map existe
        if (!map) {
          console.error('❌ ERROR: map no existe!');
          return;
        }
        console.log('✓ Map existe');
        
        // 1. DESACTIVAR TODAS LAS CAPAS PRIMERO
        console.log('1️⃣ Desactivando capas actuales...');
        const sinCheckbox = document.getElementById('siniestros-checkbox');
        const camCheckbox = document.getElementById('cameras-checkbox');
        const privCamCheckbox = document.getElementById('private-cameras-checkbox');
        const toggleBarrios = document.getElementById('toggle-barrios');
        const colegiosCheckbox = document.getElementById('colegios-checkbox');
        const corredoresCheckbox = document.getElementById('corredores-checkbox');
        
        if (sinCheckbox && sinCheckbox.checked) {
          console.log('  • Desactivando siniestros');
          sinCheckbox.checked = false;
          SiniestrosLayer.toggle(false);
        }
        if (camCheckbox && camCheckbox.checked) {
          console.log('  • Desactivando cámaras');
          camCheckbox.checked = false;
          CamerasLayer.toggle(false);
        }
        if (privCamCheckbox && privCamCheckbox.checked) {
          console.log('  • Desactivando cámaras privadas');
          privCamCheckbox.checked = false;
          PrivateCamerasLayer.toggle(false);
        }
        if (colegiosCheckbox && colegiosCheckbox.checked) {
          console.log('  • Desactivando colegios');
          colegiosCheckbox.checked = false;
          ColegiosLayer.toggle(false);
        }
        if (corredoresCheckbox && corredoresCheckbox.checked) {
          console.log('  • Desactivando corredores');
          corredoresCheckbox.checked = false;
          CorredoresLayer.toggle(false);
        }
        
        // 2. Limpiar capas
        console.log('2️⃣ Limpiando capas de GeoLayers y Colectivos...');
        if (GeoLayers) {
          GeoLayers.clearLayers();
          console.log('  ✓ GeoLayers limpiado');
        } else {
          console.error('  ⚠️ GeoLayers no existe!');
        }
        
        // Resetear caché de colectivos
        if (ColectivosLayer && ColectivosLayer.resetCache) {
          ColectivosLayer.resetCache();
          console.log('  ✓ ColectivosLayer caché reseteado');
        }
        
        // 3. Resetear filtro global de barrio
        console.log('3️⃣ Reseteando filtros...');
        const globalBarrioSelect = document.getElementById('global-barrio-filter');
        if (globalBarrioSelect) {
          globalBarrioSelect.value = 'all';
          while (globalBarrioSelect.options.length > 1) {
            globalBarrioSelect.remove(1);
          }
          console.log('  ✓ Filtros globales reseteados');
        }
        
        // 4. CARGAR DATOS DE LA NUEVA CIUDAD
        console.log(`4️⃣ Cargando datos para: ${newCity}`);
        const bariosGeoJson = await cargarDatosGeograficos(newCity);
        
        if (!bariosGeoJson) {
          console.error('❌ No se pudo cargar bariosGeoJson');
        } else {
          console.log(`✓ bariosGeoJson cargado (${bariosGeoJson.features?.length || 0} features)`);
        }
        
        // 5. Pasar datos de barrios a todos los módulos
        console.log('5️⃣ Actualizando módulos de cámaras y siniestros...');
        if (bariosGeoJson) {
          // Actualizar SiniestrosLayer
          if (SiniestrosLayer && SiniestrosLayer.setBarriosGeoJson) {
            SiniestrosLayer.setBarriosGeoJson(bariosGeoJson);
            console.log('  ✓ SiniestrosLayer actualizado');
          } else {
            console.error('  ⚠️ SiniestrosLayer.setBarriosGeoJson no existe!');
          }
          
          if (CamerasLayer && CamerasLayer.setBarriosGeoJson) {
            CamerasLayer.setBarriosGeoJson(bariosGeoJson);
            console.log('  ✓ CamerasLayer actualizado');
          } else {
            console.error('  ⚠️ CamerasLayer.setBarriosGeoJson no existe!');
          }
          
          if (PrivateCamerasLayer && PrivateCamerasLayer.setBarriosGeoJson) {
            PrivateCamerasLayer.setBarriosGeoJson(bariosGeoJson);
            console.log('  ✓ PrivateCamerasLayer actualizado');
          } else {
            console.error('  ⚠️ PrivateCamerasLayer.setBarriosGeoJson no existe!');
          }
          
          if (SemaforosLayer && SemaforosLayer.setBarriosGeoJson) {
            SemaforosLayer.setBarriosGeoJson(bariosGeoJson);
            console.log('  ✓ SemaforosLayer actualizado');
          } else {
            console.error('  ⚠️ SemaforosLayer.setBarriosGeoJson no existe!');
          }
        }
        
        // 6. Configurar filtros para la nueva ciudad
        console.log('6️⃣ Configurando filtros de siniestros...');
        setupSinistrosFilters(bariosGeoJson);
        
        // 7. NO mostrar layers por defecto (usuario debe seleccionar)
        console.log('7️⃣ Ocultando todo por defecto (usuario debe seleccionar)...');
        if (toggleBarrios) {
          toggleBarrios.checked = false;
          if (GeoLayers.isLayerVisible('Zonas / Barrios')) {
            GeoLayers.toggleLayer('Zonas / Barrios');
          }
          console.log('  ✓ Barrios ocultados');
        }
        
        // 8. Renderizar siniestros y cámaras en memoria pero sin mostrar
        console.log('8️⃣ Renderizando datos en memoria (sin mostrar)...');
        if (sinCheckbox) {
          sinCheckbox.checked = false;
          SiniestrosLayer.toggle(false);
          console.log('  ✓ Siniestros cargados (ocultos)');
        }
        if (camCheckbox) {
          camCheckbox.checked = false;
          CamerasLayer.toggle(false);
          console.log('  ✓ Cámaras cargadas (ocultas)');
        }
        
        // 9. ACTUALIZAR PANEL DE COLECTIVOS CON LAS NUEVAS LÍNEAS
        console.log('9️⃣ Actualizando panel de colectivos y LPR...');
        if (ColectivosUI && ColectivosUI.showPanel) {
          const nuevasLineas = await ColectivosLayer.loadLineas('data', newCity);
          if (nuevasLineas && Object.keys(nuevasLineas).length > 0) {
            console.log(`  ✓ Panel de colectivos actualizado con ${Object.keys(nuevasLineas).length} líneas de ${newCity}`);
            ColectivosUI.refreshPanel();
          }
        }
        // Actualizar LPR con las nuevas cámaras
        if (typeof LprLayer !== 'undefined' && LprLayer.setData) {
          LprLayer.setData(CamerasLayer.getAll());
          console.log('  ✓ Datos de LPR actualizados para la nueva ciudad');
        }
        
        console.log(`✅ FIN: Ciudad ${newCity} cargada exitosamente`);
        console.log(`========================================\n`);
      });
      console.log('✓ Event listener para cambio de ciudad agregado');
    } else {
      console.error('❌ citySelector NO encontrado en el DOM');
    }
    
    // Toggle de barrios
    const toggleBarrios = document.getElementById('toggle-barrios');
    if (toggleBarrios) {
      toggleBarrios.addEventListener('change', (e) => {
        const isVisible = GeoLayers.toggleLayer('Zonas / Barrios');
        // Solo actualizar el checked si cambió (evitar ciclo infinito)
        if (e.target.checked !== isVisible) {
          e.target.checked = isVisible;
        }
      });
    }
    
    // Sistema de debouncing para evitar clics duplicados en checkboxes
    const checkboxLocks = {
      siniestros: false,
      cameras: false,
      privateCameras: false,
      semaforos: false,
      colegios: false,
      corredores: false
    };
    
    // Función para aplicar el filtro global a las capas visibles
    const applyGlobalBarrioFilter = () => {
      const globalBarrioSelect = document.getElementById('global-barrio-filter');
      if (!globalBarrioSelect) return;
      
      const barrio = globalBarrioSelect.value;
      
      const sinCheckbox = document.getElementById('siniestros-checkbox');
      const camCheckbox = document.getElementById('cameras-checkbox');
      const privCamCheckbox = document.getElementById('private-cameras-checkbox');
      const semaforosCheckbox = document.getElementById('semaforos-checkbox');
      
      // Aplicar filtro a las capas que están visibles, incluso si barrio es 'all'
      if (sinCheckbox && sinCheckbox.checked) {
        SiniestrosLayer.setFilter('globalBarrio', barrio !== 'all' ? barrio : 'all');
      }
      if (camCheckbox && camCheckbox.checked) {
        CamerasLayer.setFilter('globalBarrio', barrio !== 'all' ? barrio : 'all');
      }
      if (privCamCheckbox && privCamCheckbox.checked) {
        PrivateCamerasLayer.setFilter('globalBarrio', barrio !== 'all' ? barrio : 'all');
      }
      if (semaforosCheckbox && semaforosCheckbox.checked) {
        SemaforosLayer.setFilter('globalBarrio', barrio !== 'all' ? barrio : 'all');
      }
      
      // Aplicar filtro al heatmap (siempre, aunque no esté visible en checkboxes)
      heatmapLayer.setFilter('globalBarrio', barrio !== 'all' ? barrio : 'all');
    };
    
    // Toggle de siniestros
    const sinCheckbox = document.getElementById('siniestros-checkbox');
    if (sinCheckbox) {
      sinCheckbox.addEventListener('change', (e) => {
        // Prevenir clics múltiples mientras se procesa
        if (checkboxLocks.siniestros) {
          e.preventDefault();
          console.log('⏸️ Clic bloqueado en siniestros (aún procesando)');
          return;
        }
        
        checkboxLocks.siniestros = true;
        console.log('🔒 Siniestros bloqueado para procesamiento');
        
        SiniestrosLayer.toggle(e.target.checked);
        // Aplicar filtro global si se activa
        if (e.target.checked) {
          applyGlobalBarrioFilter();
        } else {
          // RESETEAR el filtro de barrio cuando se desactiva
          SiniestrosLayer.setFilter('globalBarrio', 'all');
        }
        
        // Desbloquear después de procesamiento
        setTimeout(() => {
          checkboxLocks.siniestros = false;
          console.log('🔓 Siniestros desbloqueado');
        }, 300);
      });
    }
    
    // Toggle de cámaras
    const camCheckbox = document.getElementById('cameras-checkbox');
    if (camCheckbox) {
      camCheckbox.addEventListener('change', (e) => {
        // Prevenir clics múltiples mientras se procesa
        if (checkboxLocks.cameras) {
          e.preventDefault();
          console.log('⏸️ Clic bloqueado en cámaras (aún procesando)');
          return;
        }
        
        checkboxLocks.cameras = true;
        console.log('🔒 Cámaras bloqueado para procesamiento');
        
        CamerasLayer.toggle(e.target.checked);
        // Aplicar filtro global si se activa
        if (e.target.checked) {
          applyGlobalBarrioFilter();
        } else {
          // RESETEAR el filtro de barrio cuando se desactiva
          CamerasLayer.setFilter('globalBarrio', 'all');
        }
        
        // Desbloquear después de procesamiento
        setTimeout(() => {
          checkboxLocks.cameras = false;
          console.log('🔓 Cámaras desbloqueado');
        }, 300);
      });
    }
    
    // Toggle de cámaras privadas
    const privCamCheckbox = document.getElementById('private-cameras-checkbox');
    if (privCamCheckbox) {
      privCamCheckbox.addEventListener('change', (e) => {
        // Prevenir clics múltiples mientras se procesa
        if (checkboxLocks.privateCameras) {
          e.preventDefault();
          console.log('⏸️ Clic bloqueado en cámaras privadas (aún procesando)');
          return;
        }
        
        checkboxLocks.privateCameras = true;
        console.log('🔒 Cámaras privadas bloqueado para procesamiento');
        
        PrivateCamerasLayer.toggle(e.target.checked);
        // Aplicar filtro global si se activa
        if (e.target.checked) {
          applyGlobalBarrioFilter();
        } else {
          // RESETEAR el filtro de barrio cuando se desactiva
          PrivateCamerasLayer.setFilter('globalBarrio', 'all');
        }
        
        // Desbloquear después de procesamiento
        setTimeout(() => {
          checkboxLocks.privateCameras = false;
          console.log('🔓 Cámaras privadas desbloqueado');
        }, 300);
      });
    }

    // Toggle de semáforos
    const semaforosCheckbox = document.getElementById('semaforos-checkbox');
    if (semaforosCheckbox) {
      semaforosCheckbox.addEventListener('change', (e) => {
        // Prevenir clics múltiples mientras se procesa
        if (checkboxLocks.semaforos) {
          e.preventDefault();
          console.log('⏸️ Clic bloqueado en semáforos (aún procesando)');
          return;
        }
        
        checkboxLocks.semaforos = true;
        console.log('🔒 Semáforos bloqueado para procesamiento');
        
        SemaforosLayer.toggle(e.target.checked);
        // Aplicar filtro global si se activa
        if (e.target.checked) {
          applyGlobalBarrioFilter();
        } else {
          // RESETEAR el filtro de barrio cuando se desactiva
          SemaforosLayer.setFilter('globalBarrio', 'all');
        }
        
        // Desbloquear después de procesamiento
        setTimeout(() => {
          checkboxLocks.semaforos = false;
          console.log('🔓 Semáforos desbloqueado');
        }, 300);
      });
    }

    // Toggle de escuelas y colegios
    const colegiosCheckbox = document.getElementById('colegios-checkbox');
    if (colegiosCheckbox) {
      colegiosCheckbox.addEventListener('change', (e) => {
        // Prevenir clics múltiples mientras se procesa
        if (checkboxLocks.colegios) {
          e.preventDefault();
          console.log('⏸️ Clic bloqueado en colegios (aún procesando)');
          return;
        }
        
        checkboxLocks.colegios = true;
        console.log('🔒 Colegios bloqueado para procesamiento');
        
        ColegiosLayer.toggle(e.target.checked);
        // Aplicar filtro global si se activa
        if (e.target.checked) {
          applyGlobalBarrioFilter();
        } else {
          // RESETEAR el filtro de barrio cuando se desactiva
          ColegiosLayer.setFilter('globalBarrio', 'all');
        }
        
        // Desbloquear después de procesamiento
        setTimeout(() => {
          checkboxLocks.colegios = false;
          console.log('🔓 Colegios desbloqueado');
        }, 300);
      });
    }

    // Toggle de corredores escolares
    const corredoresCheckbox = document.getElementById('corredores-checkbox');
    if (corredoresCheckbox) {
      corredoresCheckbox.addEventListener('change', (e) => {
        // Prevenir clics múltiples mientras se procesa
        if (checkboxLocks.corredores) {
          e.preventDefault();
          console.log('⏸️ Clic bloqueado en corredores (aún procesando)');
          return;
        }
        
        checkboxLocks.corredores = true;
        console.log('🔒 Corredores bloqueado para procesamiento');
        
        CorredoresLayer.toggle(e.target.checked);
        
        // Desbloquear después de procesamiento
        setTimeout(() => {
          checkboxLocks.corredores = false;
          console.log('🔓 Corredores desbloqueado');
        }, 300);
      });
    }

    // Toggle de aforos (flujo vehicular)
    const aforosCheckbox = document.getElementById('aforos-checkbox');
    if (aforosCheckbox && typeof AforosLayer !== 'undefined') {
      aforosCheckbox.addEventListener('change', async (e) => {
        if (checkboxLocks.aforos) {
          e.preventDefault();
          console.log('⏸️ Clic bloqueado en aforos (aún procesando)');
          return;
        }
        
        checkboxLocks.aforos = true;
        console.log('🔒 Aforos bloqueado para procesamiento - valor checkbox:', e.target.checked);
        
        try {
          if (e.target.checked) {
            // Renderizar marcadores cuando se activa
            console.log('📊 Iniciando renderización de marcadores de aforos...');
            await AforosLayer.renderMarkers(currentCity);
            console.log('📊 renderMarkers() completado, mostrando marcadores...');
            AforosLayer.toggle(true);
          } else {
            // Solo ocultarlos cuando se desactiva
            console.log('📊 Ocultando marcadores de aforos...');
            AforosLayer.toggle(false);
          }
          
          // Mostrar/ocultar stats
          const statsPanel = document.getElementById('aforos-stats');
          if (statsPanel) {
            statsPanel.style.display = e.target.checked ? 'block' : 'none';
          }
        } catch (error) {
          console.error('❌ Error al procesar aforos:', error);
        }
        
        setTimeout(() => {
          checkboxLocks.aforos = false;
          console.log('🔓 Aforos desbloqueado');
        }, 300);
      });
    }


    // Event listeners para filtros de aforos
    const aforosYearFilter = document.getElementById('aforos-year-filter');
    const aforosMonthFilter = document.getElementById('aforos-month-filter');
    const aforosDayofweekFilter = document.getElementById('aforos-dayofweek-filter');
    const aforosStartHourFilter = document.getElementById('aforos-start-hour-filter');
    const aforosEndHourFilter = document.getElementById('aforos-end-hour-filter');
    const aforosVehicleTypeFilter = document.getElementById('aforos-vehicle-type-filter');
    const clearAforosFiltersBtn = document.getElementById('clear-aforos-filters-btn');

    const applyAforosFilters = async () => {
      if (typeof AforosLayer === 'undefined') return;
      
      const filters = {
        year: aforosYearFilter?.value === 'all' ? null : parseInt(aforosYearFilter?.value),
        month: aforosMonthFilter?.value === 'all' ? null : parseInt(aforosMonthFilter?.value),
        dayOfWeek: aforosDayofweekFilter?.value === 'all' ? null : aforosDayofweekFilter?.value,
        hourFrom: aforosStartHourFilter?.value === 'all' ? null : parseInt(aforosStartHourFilter?.value),
        hourTo: aforosEndHourFilter?.value === 'all' ? null : parseInt(aforosEndHourFilter?.value),
        vehicleType: aforosVehicleTypeFilter?.value === 'all' ? null : aforosVehicleTypeFilter?.value
      };
      
      console.log('📊 Aplicando filtros de aforos:', filters);
      AforosLayer.applyFilters(filters);
      
      // Solo re-renderizar si el checkbox está marcado
      const aforosCheckbox = document.getElementById('aforos-checkbox');
      if (aforosCheckbox && aforosCheckbox.checked) {
        console.log('📊 Re-renderizando marcadores con filtros...');
        await AforosLayer.renderMarkers(currentCity);
      }
      
      // Actualizar estadísticas
      const stats = AforosLayer.getStatistics();
      const totalVehiclesSpan = document.getElementById('aforos-total-vehicles');
      if (totalVehiclesSpan && stats) {
        totalVehiclesSpan.textContent = stats.totalVehicles?.toLocaleString() || '0';
      }
    };

    if (aforosYearFilter) aforosYearFilter.addEventListener('change', applyAforosFilters);
    if (aforosMonthFilter) aforosMonthFilter.addEventListener('change', applyAforosFilters);
    if (aforosDayofweekFilter) aforosDayofweekFilter.addEventListener('change', applyAforosFilters);
    if (aforosStartHourFilter) aforosStartHourFilter.addEventListener('change', applyAforosFilters);
    if (aforosEndHourFilter) aforosEndHourFilter.addEventListener('change', applyAforosFilters);
    if (aforosVehicleTypeFilter) aforosVehicleTypeFilter.addEventListener('change', applyAforosFilters);

    if (clearAforosFiltersBtn) {
      clearAforosFiltersBtn.addEventListener('click', () => {
        // Resetear todos los filtros
        if (aforosYearFilter) aforosYearFilter.value = 'all';
        if (aforosMonthFilter) aforosMonthFilter.value = 'all';
        if (aforosDayofweekFilter) aforosDayofweekFilter.value = 'all';
        if (aforosStartHourFilter) aforosStartHourFilter.value = 'all';
        if (aforosEndHourFilter) aforosEndHourFilter.value = 'all';
        if (aforosVehicleTypeFilter) aforosVehicleTypeFilter.value = 'all';
        
        console.log('🧹 Filtros de aforos limpiados');
        applyAforosFilters();
      });
    }

    // ==========================================
    // FUNCIONALIDAD DE ROBOS
    // ==========================================
    const roboCheckbox = document.getElementById('robo-checkbox');
    const roboFiltersDiv = document.getElementById('robo-filters');
    const roboYearFilter = document.getElementById('robo-year-filter');
    const roboResultadoFilter = document.getElementById('robo-resultado-filter');
    const roboHeatmapCheckbox = document.getElementById('robo-heatmap-checkbox');
    const clearRoboFiltersBtn = document.getElementById('clear-robo-filters-btn');
    const roboTotalSpan = document.getElementById('robo-total-count');

    // Mapa de calor de robos
    let roboHeatmapInstance = null;
    
    const renderRoboHeatmap = () => {
      if (!map || typeof RoboLayer === 'undefined') return;
      
      // Obtener datos de robos
      const roboData = RoboLayer.getVisibleRobos?.() || [];
      if (!roboData || roboData.length === 0) {
        console.warn('⚠️ No hay datos de robos para el heatmap');
        return;
      }
      
      // Convertir a formato heatmap [lat, lng, intensidad]
      const heatmapData = roboData.map(robo => [robo.lat, robo.lng, 0.6]);
      
      // Remover heatmap anterior
      if (roboHeatmapInstance) {
        map.removeLayer(roboHeatmapInstance);
      }
      
      // Crear nuevo heatmap
      roboHeatmapInstance = L.heatLayer(heatmapData, {
        radius: 30,
        blur: 25,
        maxZoom: 17,
        gradient: {
          0.0: '#0099ff',  // Azul (baja densidad)
          0.25: '#00ff00', // Verde
          0.5: '#ffff00',  // Amarillo
          0.75: '#ff7700', // Naranja
          1.0: '#ff0000'   // Rojo (alta densidad)
        }
      });
      
      map.addLayer(roboHeatmapInstance);
      console.log('🔥 Heatmap de robos renderizado');
    };
    
    if (roboHeatmapCheckbox) {
      roboHeatmapCheckbox.addEventListener('change', (e) => {
        if (e.target.checked) {
          renderRoboHeatmap();
        } else {
          if (roboHeatmapInstance) {
            map.removeLayer(roboHeatmapInstance);
            roboHeatmapInstance = null;
          }
        }
      });
    }

    if (roboCheckbox) {
      roboCheckbox.addEventListener('change', (e) => {
        if (typeof RoboLayer === 'undefined') return;
        
        console.log('🚗 Toggle robos:', e.target.checked);
        
        // Si se desactivan robos, desactivar heatmap también
        if (!e.target.checked && roboHeatmapCheckbox) {
          roboHeatmapCheckbox.checked = false;
          if (roboHeatmapInstance) {
            map.removeLayer(roboHeatmapInstance);
            roboHeatmapInstance = null;
          }
        }
        
        // Mostrar/ocultar filtros
        if (roboFiltersDiv) {
          roboFiltersDiv.style.display = e.target.checked ? 'block' : 'none';
        }
        
        RoboLayer.toggle(e.target.checked);
        
        // Aplicar filtros globales si se activa
        if (e.target.checked) {
          applyGlobalBarrioFilter();
        } else {
          RoboLayer.setFilter('globalBarrio', 'all');
        }
      });
    }

    const applyRoboFilters = () => {
      if (typeof RoboLayer === 'undefined') return;
      
      const filters = {
        year: roboYearFilter?.value === 'all' ? 'all' : roboYearFilter?.value,
        resultado: roboResultadoFilter?.value === 'all' ? 'all' : roboResultadoFilter?.value
      };
      
      console.log('🚗 Aplicando filtros de robos:', filters);
      RoboLayer.setFilter('year', filters.year);
      RoboLayer.setFilter('resultado', filters.resultado);
      
      // Actualizar estadísticas
      const metadata = RoboLayer.getMetadata();
      if (roboTotalSpan && metadata) {
        roboTotalSpan.textContent = metadata.total?.toLocaleString() || '0';
      }
      
      // Re-renderizar heatmap si está activo
      if (roboHeatmapCheckbox?.checked) {
        renderRoboHeatmap();
      }
    };

    if (roboYearFilter) roboYearFilter.addEventListener('change', applyRoboFilters);
    if (roboResultadoFilter) roboResultadoFilter.addEventListener('change', applyRoboFilters);

    if (clearRoboFiltersBtn) {
      clearRoboFiltersBtn.addEventListener('click', () => {
        if (roboYearFilter) roboYearFilter.value = 'all';
        if (roboResultadoFilter) roboResultadoFilter.value = 'all';
        
        console.log('🧹 Filtros de robos limpiados');
        applyRoboFilters();
      });
    }

    // Botón para mostrar panel de colectivos
    const btnShowColectivos = document.getElementById('btn-show-colectivos');
    console.log('🚌 btnShowColectivos:', btnShowColectivos ? 'ENCONTRADO' : 'NO ENCONTRADO');
    if (btnShowColectivos) {
      btnShowColectivos.addEventListener('click', async () => {
        console.log('🚌 Click en botón de colectivos');
        if (typeof ColectivosUI !== 'undefined' && ColectivosUI.show) {
          try {
            await ColectivosUI.show();
            console.log('✅ Panel de colectivos mostrado');
          } catch (e) {
            console.error('❌ Error mostrando panel de colectivos:', e);
          }
        } else {
          console.warn('⚠️ ColectivosUI no está disponible');
        }
      });
      console.log('✅ Event listener asignado a btnShowColectivos');
    } else {
      console.error('❌ NO SE ENCONTRÓ btnShowColectivos - el HTML puede no estar listo');
    }
    
    document.getElementById('center-map-btn').addEventListener('click', () => {
      if (map) {
        map.setView([-38.0, -57.55], 12);
        console.log('✅ Mapa centrado');
      }
    });
    
    document.getElementById('reset-view-btn').addEventListener('click', async () => {
      console.log('🔄 RESETEO COMPLETO INICIADO...');
      
      // 0. Obtener ciudad actualmente seleccionada (NO cambiar a Mar del Plata)
      const citySelector = document.getElementById('city-selector');
      const currentCity = citySelector?.value || 'mar-del-plata';
      console.log(`  • Ciudad actual seleccionada: ${currentCity}`);
      
      // 1. Resetear vista del mapa a la ciudad actual
      if (map && citiesConfig) {
        // Buscar la configuración de la ciudad en citiesConfig
        const cityConfig = citiesConfig.cities.find(c => c.id === currentCity);
        if (cityConfig && cityConfig.coordinates) {
          const lat = cityConfig.coordinates.lat;
          const lng = cityConfig.coordinates.lng;
          const zoom = cityConfig.zoom || 12;
          map.setView([lat, lng], zoom);
          console.log(`  ✓ Mapa centrado en ${currentCity} (${lat}, ${lng})`);
        } else {
          console.warn(`⚠️ Configuración de ciudad no encontrada para ${currentCity}`);
        }
      }
      
      // 1.5 Cerrar cualquier popup abierto en el mapa
      if (map) {
        map.closePopup();
        // Limpiar todos los popups
        for (let i = 0; i < map._layers.length; i++) {
          if (map._layers[i] && map._layers[i].closePopup) {
            map._layers[i].closePopup();
          }
        }
        Object.values(map._layers).forEach(layer => {
          if (layer && layer.closePopup && typeof layer.closePopup === 'function') {
            layer.closePopup();
          }
        });
      }
      console.log('  ✓ Popups cerrados');
      
      // 2. Desactivar todos los checkboxes restantes
      const sinCheckbox = document.getElementById('siniestros-checkbox');
      const camCheckbox = document.getElementById('cameras-checkbox');
      const privCamCheckbox = document.getElementById('private-cameras-checkbox');
      const semaforosCheckbox = document.getElementById('semaforos-checkbox');
      const heatmapCheckbox = document.getElementById('heatmap-checkbox');
      const toggleBarrios = document.getElementById('toggle-barrios');
      const colegiosCheckbox = document.getElementById('colegios-checkbox');
      const corredoresCheckbox = document.getElementById('corredores-checkbox');
      
      if (sinCheckbox && sinCheckbox.checked) {
        sinCheckbox.checked = false;
        SiniestrosLayer.toggle(false);
      }
      if (camCheckbox && camCheckbox.checked) {
        camCheckbox.checked = false;
        CamerasLayer.toggle(false);
      }
      if (privCamCheckbox && privCamCheckbox.checked) {
        privCamCheckbox.checked = false;
        PrivateCamerasLayer.toggle(false);
      }
      if (semaforosCheckbox && semaforosCheckbox.checked) {
        semaforosCheckbox.checked = false;
        SemaforosLayer.toggle(false);
      }
      if (heatmapCheckbox && heatmapCheckbox.checked) {
        heatmapCheckbox.checked = false;
        heatmapLayer.toggle(false);
      }
      if (colegiosCheckbox && colegiosCheckbox.checked) {
        colegiosCheckbox.checked = false;
        ColegiosLayer.toggle(false);
      }
      if (corredoresCheckbox && corredoresCheckbox.checked) {
        corredoresCheckbox.checked = false;
        CorredoresLayer.toggle(false);
      }
      
      const aforosCheckbox = document.getElementById('aforos-checkbox');
      if (aforosCheckbox && aforosCheckbox.checked) {
        aforosCheckbox.checked = false;
        AforosLayer.toggle(false);
      }
      if (toggleBarrios && toggleBarrios.checked) {
        toggleBarrios.checked = false;
        if (GeoLayers.isLayerVisible('Zonas / Barrios')) {
          GeoLayers.toggleLayer('Zonas / Barrios');
        }
      }
      console.log('  ✓ Todos los checkboxes desactivados');
      
      // 3. Limpiar filtros de siniestros
      const yearFilter = document.getElementById('year-filter');
      const causeFilter = document.getElementById('cause-filter');
      const participantFilter = document.getElementById('participant-filter');
      const startHourFilter = document.getElementById('start-hour-filter');
      const endHourFilter = document.getElementById('end-hour-filter');
      const streetFilter = document.getElementById('street-filter');
      
      if (yearFilter) yearFilter.value = 'all';
      if (causeFilter) causeFilter.value = 'all';
      if (participantFilter) participantFilter.value = 'all';
      if (startHourFilter) startHourFilter.value = 'all';
      if (endHourFilter) endHourFilter.value = 'all';
      if (streetFilter) streetFilter.value = '';
      console.log('  ✓ Filtros de siniestros limpiados');
      
      // Limpiar filtros de aforos
      const aforosYearFilter = document.getElementById('aforos-year-filter');
      const aforosMonthFilter = document.getElementById('aforos-month-filter');
      const aforosDayofweekFilter = document.getElementById('aforos-dayofweek-filter');
      const aforosStartHourFilter = document.getElementById('aforos-start-hour-filter');
      const aforosEndHourFilter = document.getElementById('aforos-end-hour-filter');
      const aforosVehicleTypeFilter = document.getElementById('aforos-vehicle-type-filter');
      
      if (aforosYearFilter) aforosYearFilter.value = 'all';
      if (aforosMonthFilter) aforosMonthFilter.value = 'all';
      if (aforosDayofweekFilter) aforosDayofweekFilter.value = 'all';
      if (aforosStartHourFilter) aforosStartHourFilter.value = 'all';
      if (aforosEndHourFilter) aforosEndHourFilter.value = 'all';
      if (aforosVehicleTypeFilter) aforosVehicleTypeFilter.value = 'all';
      console.log('  ✓ Filtros de aforos limpiados');
      // 4. Resetear filtro global de barrio
      const globalBarrioSelect = document.getElementById('global-barrio-filter');
      if (globalBarrioSelect) {
        globalBarrioSelect.value = 'all';
        console.log('  ✓ Filtro global de barrio reseteado');
      }
      
      // 5. Limpiar búsqueda de direcciones
      const addressSearchInput = document.getElementById('address-search-input');
      const addressResults = document.getElementById('address-results');
      const addressClearBtn = document.getElementById('address-clear-btn');
      
      if (addressSearchInput) {
        addressSearchInput.value = '';
      }
      if (addressResults) {
        addressResults.style.display = 'none';
        addressResults.innerHTML = '';
      }
      if (addressClearBtn) {
        addressClearBtn.style.display = 'none';
      }
      
      // Limpiar marcador de dirección si existe
      if (typeof GeoLocator !== 'undefined' && GeoLocator.clearMarker) {
        GeoLocator.clearMarker();
      }
      console.log('  ✓ Búsqueda de direcciones limpiada');
      
      console.log('✅ RESETEO COMPLETO FINALIZADO');
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
    
    // Re-renderizar selector LPR después de que autenticación complete el sidebar
    if (typeof LprLayer !== 'undefined' && LprLayer.renderLprSelector) {
      console.log('🔧 Re-renderizando selector LPR después de autenticación...');
      setTimeout(() => {
        LprLayer.renderLprSelector();
      }, 100);
    }
    
    // Cargar datos geográficos Y siniestros PRIMERO
    console.log(`📍 INICIALIZANDO CARGA DE DATOS DE ${currentCity.toUpperCase()}`);
    cargarDatosGeograficos(currentCity).then((bariosGeoJson) => {
      console.log('✅ PROMESA cargarDatosGeograficos() RESUELTA');
      console.log('   - bariosGeoJson:', bariosGeoJson ? `${bariosGeoJson.features?.length} features` : 'NULL');
      
      // Pasar datos de barrios a módulos de cámaras para point-in-polygon
      if (bariosGeoJson) {
        console.log('📍 Pasando barios a CamerasLayer y PrivateCamerasLayer...');
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
      const currentCityId = document.getElementById('city-selector')?.value || 'cordoba';
      ColectivosLayer.loadLineas(`data`, currentCityId)
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

      const filters = ['year-filter', 'cause-filter', 'participant-filter', 'start-hour-filter', 'end-hour-filter'];
      
      filters.forEach(filterId => {
        const element = document.getElementById(filterId);
        if (element) {
          element.addEventListener('change', (e) => {
            const filterMap = {
              'year-filter': 'year',
              'cause-filter': 'cause',
              'participant-filter': 'participant',
              'start-hour-filter': 'startHour',
              'end-hour-filter': 'endHour'
            };
            console.log('Filter changed:', filterId, '=', e.target.value);
            SiniestrosLayer.setFilter(filterMap[filterId], e.target.value);
          });
        }
      });
      
      // Filtro de calle (text input)
      const streetFilter = document.getElementById('street-filter');
      if (streetFilter) {
        streetFilter.addEventListener('input', (e) => {
          console.log('Street filter:', e.target.value);
          SiniestrosLayer.setFilter('street', e.target.value);
        });
      }
      
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

      // ==========================================
      // Filtros de Cámaras
      // ==========================================
      const cameraFilters = ['barrio-cameras-filter', 'type-cameras-filter', 'corridor-cameras-filter', 'camera-type-filter'];
      
      cameraFilters.forEach(filterId => {
        const element = document.getElementById(filterId);
        if (element) {
          element.addEventListener('change', (e) => {
            const filterMap = {
              'barrio-cameras-filter': 'barrio',
              'type-cameras-filter': 'type',
              'corridor-cameras-filter': 'corridor',
              'camera-type-filter': 'cameraType'
            };
            console.log('Camera filter changed:', filterId, '=', e.target.value);
            CamerasLayer.setFilter(filterMap[filterId], e.target.value);
          });
        }
      });

      // Botón limpiar filtros de cámaras
      const clearCamerasBtn = document.getElementById('clear-cameras-filters-btn');
      if (clearCamerasBtn) {
        clearCamerasBtn.addEventListener('click', () => {
          console.log('🧹 Limpiando filtros de cámaras');
          
          // Deseleccionar checkbox de cámaras
          const camCheckbox = document.getElementById('cameras-checkbox');
          if (camCheckbox) camCheckbox.checked = false;
          
          // Resetear todos los selectores de filtros de cámaras
          const cameraFilterSelects = [
            'barrio-cameras-filter',
            'type-cameras-filter',
            'corridor-cameras-filter',
            'camera-type-filter'
          ];
          
          cameraFilterSelects.forEach(selectId => {
            const element = document.getElementById(selectId);
            if (element) {
              element.value = 'all';
            }
          });
          
          // Limpiar filtros de cámaras
          CamerasLayer.clearFilters();
          
          // Ocultar capa de cámaras
          CamerasLayer.toggle(false);
          
          console.log('✅ Filtros de cámaras limpiados');
        });
      }

    };
  }
});

// ==========================================
// FUNCIONALIDAD DE IMPORTACIÓN DE CIUDADES
// ==========================================
const setupImportCities = () => {
  console.log('🔧 Configurando sistema de importación de ciudades');
  
  // Crear modal EN EL BODY, no en el sidebar
  const modalHtml = `
    <div id="import-modal" style="display: none; position: fixed; top: 0; left: 0; right: 0; bottom: 0; background-color: rgba(0,0,0,0.7); z-index: 50000; overflow-y: auto; padding: 40px 20px;">
      <div style="background-color: white; margin: 0 auto; padding: 30px; border-radius: 8px; max-width: 500px; box-shadow: 0 4px 20px rgba(0,0,0,0.3); position: relative;">
        <h2 style="margin-top: 0; margin-bottom: 20px; color: #333;">📍 Importar Nueva Ciudad</h2>
        
        <div style="margin-bottom: 15px;">
          <label style="display: block; font-weight: 500; margin-bottom: 5px;">Nombre de la Ciudad:</label>
          <input type="text" id="import-city-name" placeholder="ej: La Plata" style="width: 100%; padding: 10px; border: 1px solid #ddd; border-radius: 4px; box-sizing: border-box;">
        </div>
        
        <div style="margin-bottom: 15px;">
          <div style="display: flex; gap: 8px; align-items: flex-start;">
            <div style="flex: 1;">
              <label style="display: block; font-weight: 500; margin-bottom: 5px;">Barrios (GeoJSON o CSV):</label>
              <input type="file" id="import-file-barrios" accept=".json,.geojson,.csv" style="width: 100%; padding: 8px; border: 1px solid #ddd; border-radius: 4px;">
              <div style="font-size: 11px; color: #666; margin-top: 5px;">Debe tener geometría de polígonos</div>
            </div>
            <button type="button" class="help-button" data-help="barrios" style="margin-top: 24px;">?</button>
          </div>
        </div>
        
        <div style="margin-bottom: 15px;">
          <div style="display: flex; gap: 8px; align-items: flex-start;">
            <div style="flex: 1;">
              <label style="display: block; font-weight: 500; margin-bottom: 5px;">Siniestros (GeoJSON o CSV):</label>
              <input type="file" id="import-file-siniestros" accept=".json,.geojson,.csv" style="width: 100%; padding: 8px; border: 1px solid #ddd; border-radius: 4px;">
              <div style="font-size: 11px; color: #666; margin-top: 5px;">CSV: lat, lng, fecha, causa, participante</div>
            </div>
            <button type="button" class="help-button" data-help="siniestros" style="margin-top: 24px;">?</button>
          </div>
        </div>
        
        <div style="margin-bottom: 15px;">
          <div style="display: flex; gap: 8px; align-items: flex-start;">
            <div style="flex: 1;">
              <label style="display: block; font-weight: 500; margin-bottom: 5px;">Cámaras Públicas (GeoJSON o CSV):</label>
              <input type="file" id="import-file-cameras" accept=".json,.geojson,.csv" style="width: 100%; padding: 8px; border: 1px solid #ddd; border-radius: 4px;">
              <div style="font-size: 11px; color: #666; margin-top: 5px;">CSV: lat, lng, nombre, tipo</div>
            </div>
            <button type="button" class="help-button" data-help="cameras" style="margin-top: 24px;">?</button>
          </div>
        </div>
        
        <div style="margin-bottom: 20px;">
          <div style="display: flex; gap: 8px; align-items: flex-start;">
            <div style="flex: 1;">
              <label style="display: block; font-weight: 500; margin-bottom: 5px;">Cámaras Privadas (GeoJSON o CSV):</label>
              <input type="file" id="import-file-private-cameras" accept=".json,.geojson,.csv" style="width: 100%; padding: 8px; border: 1px solid #ddd; border-radius: 4px;">
              <div style="font-size: 11px; color: #666; margin-top: 5px;">CSV: lat, lng, nombre</div>
            </div>
            <button type="button" class="help-button" data-help="private_cameras" style="margin-top: 24px;">?</button>
          </div>
        </div>
        
        <div style="margin-bottom: 20px; padding: 15px; background-color: #f9f9f9; border-radius: 4px; border: 1px solid #ddd;">
          <h3 style="margin: 0 0 12px 0; font-size: 13px; color: #333;">📋 Capas Opcionales</h3>
          <div style="font-size: 11px; color: #666; margin-bottom: 10px;">Sube archivos adicionales (todos opcionales)</div>
          
          <div style="margin-bottom: 10px;">
            <div style="display: flex; gap: 8px; align-items: center;">
              <label style="display: block; font-size: 11px; margin-bottom: 0; flex: 1;">🚦 Semáforos:</label>
              <button type="button" class="help-button" data-help="semaforos" style="padding: 4px 8px !important; margin: 0 !important; font-size: 11px !important;">?</button>
            </div>
            <input type="file" id="import-file-semaforos" accept=".json,.geojson,.csv" style="width: 100%; padding: 6px; border: 1px solid #ddd; border-radius: 4px; font-size: 11px; margin-top: 3px;">
          </div>
          
          <div style="margin-bottom: 10px;">
            <div style="display: flex; gap: 8px; align-items: center;">
              <label style="display: block; font-size: 11px; margin-bottom: 0; flex: 1;">🏫 Colegios/Escuelas:</label>
              <button type="button" class="help-button" data-help="colegios" style="padding: 4px 8px !important; margin: 0 !important; font-size: 11px !important;">?</button>
            </div>
            <input type="file" id="import-file-colegios" accept=".json,.geojson,.csv" style="width: 100%; padding: 6px; border: 1px solid #ddd; border-radius: 4px; font-size: 11px; margin-top: 3px;">
          </div>
          

          <div style="margin-bottom: 10px;">
            <div style="display: flex; gap: 8px; align-items: center;">
              <label style="display: block; font-size: 11px; margin-bottom: 0; flex: 1;">🛣️ Corredores Escolares:</label>
              <button type="button" class="help-button" data-help="corredores" style="padding: 4px 8px !important; margin: 0 !important; font-size: 11px !important;">?</button>
            </div>
            <input type="file" id="import-file-corredores" accept=".json,.geojson,.csv" style="width: 100%; padding: 6px; border: 1px solid #ddd; border-radius: 4px; font-size: 11px; margin-top: 3px;">
          </div>
          
          <div style="margin-bottom: 10px;">
            <div style="display: flex; gap: 8px; align-items: center;">
              <label style="display: block; font-size: 11px; margin-bottom: 0; flex: 1;">📊 Flujo Vehicular:</label>
              <button type="button" class="help-button" data-help="flujo" style="padding: 4px 8px !important; margin: 0 !important; font-size: 11px !important;">?</button>
            </div>
            <input type="file" id="import-file-flujo" accept=".json,.geojson,.csv" style="width: 100%; padding: 6px; border: 1px solid #ddd; border-radius: 4px; font-size: 11px; margin-top: 3px;">
          </div>
          
          <div style="margin-bottom: 10px;">
            <div style="display: flex; gap: 8px; align-items: center;">
              <label style="display: block; font-size: 11px; margin-bottom: 0; flex: 1;">🚗 Robo Automotor:</label>
              <button type="button" class="help-button" data-help="robo" style="padding: 4px 8px !important; margin: 0 !important; font-size: 11px !important;">?</button>
            </div>
            <input type="file" id="import-file-robo" accept=".json,.geojson,.csv" style="width: 100%; padding: 6px; border: 1px solid #ddd; border-radius: 4px; font-size: 11px; margin-top: 3px;">
          </div>

          <div style="margin-bottom: 10px; padding-top: 10px; border-top: 1px solid #ddd;">
            <div style="display: flex; gap: 8px; align-items: center;">
              <label style="display: block; font-size: 11px; margin-bottom: 0; flex: 1;">🚌 Líneas de Colectivos (múltiples):</label>
              <button type="button" class="help-button" data-help="lineas-colectivos" style="padding: 4px 8px !important; margin: 0 !important; font-size: 11px !important;">?</button>
            </div>
            <input type="file" id="import-file-lineas" accept=".json,.geojson" multiple style="width: 100%; padding: 6px; border: 1px solid #ddd; border-radius: 4px; font-size: 11px; margin-top: 3px;">
            <div style="font-size: 10px; color: #666; margin-top: 3px;">Selecciona múltiples archivos linea*.geojson. Ej: linea1.geojson, linea2.geojson, etc.</div>
          </div>
          

        </div>
        
        <div style="display: flex; gap: 10px;">
          <button id="btn-import-cancel" style="flex: 1; padding: 12px; background-color: #6c757d; color: white; border: none; border-radius: 4px; cursor: pointer; font-weight: 500;">Cancelar</button>
          <button id="btn-import-submit" style="flex: 1; padding: 12px; background-color: #0066ff; color: white; border: none; border-radius: 4px; cursor: pointer; font-weight: 500;">Crear Ciudad</button>
        </div>
        
        <div id="import-status" style="margin-top: 15px; padding: 10px; border-radius: 4px; display: none;"></div>
      </div>
    </div>
  `;
  
  document.body.insertAdjacentHTML('beforeend', modalHtml);
  
  const modal = document.getElementById('import-modal');
  const btnImport = document.getElementById('btn-import-city');
  const btnCancel = document.getElementById('btn-import-cancel');
  const btnSubmit = document.getElementById('btn-import-submit');
  const citySelector = document.getElementById('city-selector');

  console.log('🔍 Elementos buscados:', {
    modal: !!modal,
    btnImport: !!btnImport,
    btnCancel: !!btnCancel,
    btnSubmit: !!btnSubmit,
    citySelector: !!citySelector
  });

  if (!modal || !btnImport || !btnCancel || !btnSubmit) {
    console.error('❌ No se pudo crear el modal de importación. Faltantes:', {
      'import-modal': !!modal,
      'btn-import-city': !!btnImport,
      'btn-import-cancel': !!btnCancel,
      'btn-import-submit': !!btnSubmit
    });
    console.log('📝 Intentando agregar listeners sin modal...'); 
    return;
  }

  console.log('✅ Todos los elementos encontrados correctamente');

  // Agregar event listeners para los botones de ayuda dentro del modal
  modal.addEventListener('click', (e) => {
    // Buscar el botón más cercano clickeado
    const helpBtn = e.target.closest('button.help-button[data-help]');
    if (helpBtn) {
      e.stopPropagation();
      e.preventDefault();
      const layerType = helpBtn.getAttribute('data-help');
      if (layerType && typeof FormatHelp !== 'undefined') {
        console.log('📞 Abriendo ayuda para:', layerType);
        FormatHelp.showHelp(layerType);
      }
    }
  });

  // Cargar ciudades guardadas del usuario
  if (typeof ImportCities !== 'undefined') {
    ImportCities.loadUserCities();
  }

  // Actualizar selector con ciudades del usuario
  const updateCitySelector = () => {
    if (!citySelector || typeof ImportCities === 'undefined') return;
    
    const userCities = ImportCities.getUserCities();
    const currentOptions = Array.from(citySelector.options).map(o => o.value);
    
    // ASEGURAR que ciudades predefinidas siempre existan
    const predefinedCities = [
      { id: 'cordoba', name: 'Córdoba' },
      { id: 'mar-del-plata', name: 'Mar del Plata' },
      { id: 'san-martin-del-mar', name: 'San Martín del Mar' }
    ];
    
    // Verificar que todas las ciudades predefinidas existan como opciones
    predefinedCities.forEach(city => {
      const existingOption = Array.from(citySelector.options).find(o => o.value === city.id);
      if (!existingOption) {
        const option = document.createElement('option');
        option.value = city.id;
        option.textContent = city.name;
        // Insertar al principio
        citySelector.insertBefore(option, citySelector.firstChild);
        console.log(`🔧 Re-agregada ciudad predefinida: ${city.name}`);
      }
    });
    
    // Agregar ciudades del usuario
    Object.values(userCities).forEach(city => {
      if (!currentOptions.includes(city.id)) {
        const option = document.createElement('option');
        option.value = city.id;
        option.textContent = `⭐ ${city.name} (Usuario)`;
        citySelector.appendChild(option);
        console.log(`✅ Agregada ciudad del usuario: ${city.name}`);
      }
    });
  };

  // Abrir modal
  if (btnImport) {
    btnImport.addEventListener('click', () => {
      console.log('✅ Click en botón de importar detectado');
      if (!modal) {
        console.error('❌ Modal no existe. Intentando recargar...');
        setTimeout(() => location.reload(), 500);
        return;
      }
      console.log('🔓 Abriendo modal de importación');
      modal.style.display = 'block';
    });
    console.log('✅ Event listener agregado a btn-import-city');
  } else {
    console.error('❌ btn-import-city no encontrado en el DOM');
  }

  // Cerrar modal
  btnCancel.addEventListener('click', () => {
    console.log('Cerrando modal de importación');
    modal.style.display = 'none';
    document.getElementById('import-city-name').value = '';
    document.getElementById('import-file-barrios').value = '';
    document.getElementById('import-file-siniestros').value = '';
    document.getElementById('import-file-cameras').value = '';
    document.getElementById('import-file-private-cameras').value = '';
    // Limpiar capas opcionales
    document.getElementById('import-file-semaforos').value = '';
    document.getElementById('import-file-colegios').value = '';
    document.getElementById('import-file-corredores').value = '';
    document.getElementById('import-file-flujo').value = '';
    document.getElementById('import-file-robo').value = '';
    document.getElementById('import-file-lineas').value = '';
  });

  // Cerrar modal al hacer clic fuera
  modal.addEventListener('click', (e) => {
    if (e.target === modal) {
      modal.style.display = 'none';
    }
  });

  // Procesar importación
  btnSubmit.addEventListener('click', async () => {
    console.log('📥 Iniciando importación de ciudad - Validando...');
    const status = document.getElementById('import-status');
    const cityName = document.getElementById('import-city-name').value.trim();

    if (!cityName) {
      status.style.display = 'block';
      status.style.backgroundColor = '#f8d7da';
      status.style.color = '#721c24';
      status.textContent = '❌ Debes ingresar un nombre de ciudad';
      return;
    }

    const files = {
      barrios: document.getElementById('import-file-barrios').files[0],
      siniestros: document.getElementById('import-file-siniestros').files[0],
      cameras: document.getElementById('import-file-cameras').files[0],
      private_cameras: document.getElementById('import-file-private-cameras').files[0],
      // Capas opcionales
      semaforos: document.getElementById('import-file-semaforos').files[0],
      colegios: document.getElementById('import-file-colegios').files[0],
      corredores: document.getElementById('import-file-corredores').files[0],
      flujo: document.getElementById('import-file-flujo').files[0],
      robo: document.getElementById('import-file-robo').files[0]
    };

    // Recopilar múltiples líneas de colectivos
    const lineasFiles = Array.from(document.getElementById('import-file-lineas').files);

    if (!files.barrios) {
      status.style.display = 'block';
      status.style.backgroundColor = '#f8d7da';
      status.style.color = '#721c24';
      status.textContent = '❌ Debes subir al menos el archivo de Barrios';
      return;
    }

    try {
      status.style.display = 'block';
      status.style.backgroundColor = '#d1ecf1';
      status.style.color = '#0c5460';
      status.textContent = '⏳ Procesando archivos...';

      const cityData = await ImportCities.createCityFromFiles(cityName, files);
      
      console.log('✅ Ciudad importada exitosamente:', cityData);

      // ===== PROCESAR LÍNEAS DE COLECTIVOS =====
      if (lineasFiles.length > 0) {
        console.log(`📥 Procesando ${lineasFiles.length} líneas de colectivos...`);
        const lineasManifest = [];
        const cityId = cityData.id;

        // Procesar cada archivo de línea
        for (const file of lineasFiles) {
          try {
            const fileContent = await new Promise((resolve, reject) => {
              const reader = new FileReader();
              reader.onload = (e) => resolve(e.target.result);
              reader.onerror = (e) => reject(e);
              reader.readAsText(file);
            });

            const geoJsonData = JSON.parse(fileContent);
            
            // Extraer número de la línea del archivo o de las propiedades
            let numeroLinea = file.name.match(/linea(\d+[A-Za-z]*)/)?.[1] || file.name.replace(/\.geojson?$/i, '');
            
            // Si hay propiedades en features, intentar obtener el número de ahí
            if (geoJsonData.features && geoJsonData.features.length > 0) {
              const props = geoJsonData.features[0].properties;
              if (props && props.numero) {
                numeroLinea = props.numero;
              }
            }

            console.log(`  ✓ Línea ${numeroLinea} cargada (${file.name})`);
            
            // Guardar archivo en localStorage con clave única
            const storageKey = `colectivos_${cityId}_linea${numeroLinea}`;
            localStorage.setItem(storageKey, fileContent);

            // Agregar al manifest de líneas para esta ciudad
            lineasManifest.push({
              numero: numeroLinea,
              archivo: file.name,
              storageKey: storageKey
            });
          } catch (err) {
            console.warn(`  ⚠️ Error procesando ${file.name}:`, err.message);
          }
        }

        // Guardar manifest de líneas para la ciudad
        if (lineasManifest.length > 0) {
          const lineasStorageKey = `colectivos_${cityId}_manifest`;
          localStorage.setItem(lineasStorageKey, JSON.stringify(lineasManifest));
          console.log(`✅ ${lineasManifest.length} líneas de colectivos guardadas para ${cityName}`);
        }
      }

      // Agregar al selector
      const option = document.createElement('option');
      option.value = cityData.id;
      option.textContent = `⭐ ${cityData.name} (Usuario)`;
      citySelector.appendChild(option);
      
      console.log(`📍 Seleccionando ciudad: ${cityData.id}`);
      citySelector.value = cityData.id;

      status.style.backgroundColor = '#d4edda';
      status.style.color = '#155724';
      status.textContent = `✅ Ciudad "${cityName}" importada exitosamente. Cargando...`;

      setTimeout(() => {
        modal.style.display = 'none';
        // Trigger ciudad change event
        citySelector.dispatchEvent(new Event('change'));
      }, 2000);
    } catch (err) {
      console.error('Error importando:', err);
      status.style.display = 'block';
      status.style.backgroundColor = '#f8d7da';
      status.style.color = '#721c24';
      status.textContent = `❌ Error: ${err.message}`;
    }
  });

  // Cargar ciudades guardadas al iniciar
  setTimeout(() => {
    updateCitySelector();
  }, 500);
};

// Inicializar mapa al cargar
iniciarMapa();

// Inicializar sistema de importación de ciudades (CON DELAY para asegurar que el sidebar esté listo)
setTimeout(() => {
  console.log('⏳ Ejecutando setupImportCities() después del delay');
  setupImportCities();
}, 1000);

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
