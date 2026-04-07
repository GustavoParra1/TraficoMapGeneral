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
    
    // Inicializar módulo de semáforos
    SemaforosLayer.init(map);
    
    console.log("✅ Mapa inicializado");
  }
}

// ============================
// CONFIGURACIÓN DE CIUDADES
// ============================
let currentCity = 'mar-del-plata';
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

// Cargar datos geográficos dinámicamente según ciudad
async function cargarDatosGeograficos(cityId = 'mar-del-plata') {
  console.log(`📍 INICIO: Cargando datos para ciudad: ${cityId}`);
  
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
  
  let bariosGeoJson = null;
  
  try {
    // Helper para cargar datos (soporta fetch URLs y data URLs)
    const loadData = async (filePath) => {
      if (!filePath) return null;
      
      if (filePath.startsWith('data:')) {
        // Es una data URL, decodificar
        return ImportCities.loadGeoJsonFromDataUrl(filePath);
      } else {
        // Es una URL normal, hacer fetch
        const response = await fetch(filePath);
        if (response.ok) {
          return await response.json();
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
    }
    
    // PASO 3: Cargar siniestros 
    console.log(`  [3/5] Cargando siniestros desde: ${cityConfig.files.siniestros}`);
    const sinGeoJson = await loadData(cityConfig.files.siniestros);
    if (sinGeoJson) {
      SiniestrosLayer.clearFilters();
      if (cityConfig.files.siniestros.startsWith('data:')) {
        console.log(`      ℹ️ Cargando siniestros desde memoria (usuario)`);
        // Cargar siniestros desde GeoJSON en memoria (importados)
        SiniestrosLayer.loadFromGeoJson(sinGeoJson, true);
      } else {
        await SiniestrosLayer.load(cityConfig.files.siniestros);
      }
      console.log(`      ✓ Siniestros cargados`);
    }
    
    // PASO 4: Cargar cámaras públicas
    console.log(`  [4/5] Cargando cámaras públicas desde: ${cityConfig.files.cameras}`);
    const camGeoJson = await loadData(cityConfig.files.cameras);
    if (camGeoJson) {
      CamerasLayer.clearFilters();
      if (cityConfig.files.cameras.startsWith('data:')) {
        console.log(`      ℹ️ Cargando cámaras desde memoria (usuario)`);
        // Cargar cámaras desde GeoJSON en memoria (importadas)
        CamerasLayer.loadFromGeoJson(camGeoJson, true);
      } else {
        await CamerasLayer.load(cityConfig.files.cameras);
      }
      if (bariosGeoJson) {
        CamerasLayer.setBarriosGeoJson(bariosGeoJson);
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
      // Semáforos
      if (cityConfig.optionalLayers.semaforos) {
        console.log(`  [OPT] Cargando semáforos desde: ${cityConfig.optionalLayers.semaforos}`);
        const semaforosGeoJson = await loadData(cityConfig.optionalLayers.semaforos);
        if (semaforosGeoJson) {
          if (cityConfig.optionalLayers.semaforos.startsWith('data:')) {
            console.log(`       ℹ️ Cargando semáforos desde memoria (usuario)`);
            SemaforosLayer.loadFromGeoJson(semaforosGeoJson);
          } else {
            await SemaforosLayer.load(cityConfig.optionalLayers.semaforos);
          }
          console.log(`       ✓ Semáforos cargados`);
        }
      }
    }
    
    console.log(`✅ FIN: Datos de ${cityId} cargados exitosamente`);
  } catch (error) {
    console.warn('⚠️ Error cargando datos:', error);
  }
  
  return bariosGeoJson;
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
          <option value="mar-del-plata">Mar del Plata</option>
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
        <div class="sidebar-title">Filtro Global por Barrio</div>
        <select id="global-barrio-filter" style="width: 100%; padding: 8px; border: none; border-radius: 4px;">
          <option value="all">Todos los Barrios</option>
        </select>
      </div>

      <div class="sidebar-section">
        <div class="sidebar-title">Capas Geográficas</div>
        <div class="button-group">
          <label style="display: flex; align-items: center; gap: 8px; font-size: 12px; cursor: pointer;">
            <input type="checkbox" id="toggle-barrios">
            <span>Zonas / Barrios</span>
          </label>
          <label style="display: flex; align-items: center; gap: 8px; font-size: 12px; cursor: pointer; margin-top: 8px;">
            <input type="checkbox" id="siniestros-checkbox">
            <span>Mostrar Siniestros (<span id="total-siniestros-count">0</span>)</span>
          </label>
          <label style="display: flex; align-items: center; gap: 8px; font-size: 12px; cursor: pointer; margin-top: 8px;">
            <input type="checkbox" id="cameras-checkbox">
            <span>Mostrar Cámaras (<span id="total-cameras-count">0</span>)</span>
          </label>
          <label style="display: flex; align-items: center; gap: 8px; font-size: 12px; cursor: pointer; margin-top: 8px;">
            <input type="checkbox" id="private-cameras-checkbox">
            <span>Cámaras Privadas (<span id="total-private-cameras-count">0</span>)</span>
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
    
    // CARGAR CIUDADES DEL USUARIO AL INICIAR SIDEBAR
    console.log('🔄 Cargando ciudades almacenadas del usuario...');
    ImportCities.loadUserCities();
    const userCities = ImportCities.getUserCities();
    const citySelector = document.getElementById('city-selector');
    
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
        
        // 2. Limpiar capas
        console.log('2️⃣ Limpiando capas de GeoLayers...');
        if (GeoLayers) {
          GeoLayers.clearLayers();
          console.log('  ✓ GeoLayers limpiado');
        } else {
          console.error('  ⚠️ GeoLayers no existe!');
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
        
        // 5. Pasar datos de barrios a módulos de cámaras
        console.log('5️⃣ Actualizando módulos de cámaras...');
        if (bariosGeoJson) {
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
        toggleBarrios.checked = isVisible;
      });
    }
    
    // Función para aplicar el filtro global a las capas visibles
    const applyGlobalBarrioFilter = () => {
      const globalBarrioSelect = document.getElementById('global-barrio-filter');
      if (!globalBarrioSelect) return;
      
      const barrio = globalBarrioSelect.value;
      
      const sinCheckbox = document.getElementById('siniestros-checkbox');
      const camCheckbox = document.getElementById('cameras-checkbox');
      const privCamCheckbox = document.getElementById('private-cameras-checkbox');
      
      if (sinCheckbox && sinCheckbox.checked && barrio !== 'all') {
        SiniestrosLayer.setFilter('globalBarrio', barrio);
      }
      if (camCheckbox && camCheckbox.checked && barrio !== 'all') {
        CamerasLayer.setFilter('globalBarrio', barrio);
      }
      if (privCamCheckbox && privCamCheckbox.checked && barrio !== 'all') {
        PrivateCamerasLayer.setFilter('globalBarrio', barrio);
      }
    };
    
    // Toggle de siniestros
    const sinCheckbox = document.getElementById('siniestros-checkbox');
    if (sinCheckbox) {
      sinCheckbox.addEventListener('change', (e) => {
        SiniestrosLayer.toggle(e.target.checked);
        // Aplicar filtro global si se activa
        if (e.target.checked) {
          applyGlobalBarrioFilter();
        }
      });
    }
    
    // Toggle de cámaras
    const camCheckbox = document.getElementById('cameras-checkbox');
    if (camCheckbox) {
      camCheckbox.addEventListener('change', (e) => {
        CamerasLayer.toggle(e.target.checked);
        // Aplicar filtro global si se activa
        if (e.target.checked) {
          applyGlobalBarrioFilter();
        }
      });
    }
    
    // Toggle de cámaras privadas
    const privCamCheckbox = document.getElementById('private-cameras-checkbox');
    if (privCamCheckbox) {
      privCamCheckbox.addEventListener('change', (e) => {
        PrivateCamerasLayer.toggle(e.target.checked);
        // Aplicar filtro global si se activa
        if (e.target.checked) {
          applyGlobalBarrioFilter();
        }
      });
    }

    // Toggle de semáforos
    const semaforosCheckbox = document.getElementById('semaforos-checkbox');
    if (semaforosCheckbox) {
      semaforosCheckbox.addEventListener('change', (e) => {
        SemaforosLayer.toggle(e.target.checked);
      });
    }
    
    document.getElementById('center-map-btn').addEventListener('click', () => {
      if (map) {
        map.setView([-38.0, -57.55], 12);
        console.log('✅ Mapa centrado');
      }
    });
    
    document.getElementById('reset-view-btn').addEventListener('click', () => {
      if (map) {
        map.setView([-38.0, -57.55], 12);
        console.log('✅ Vista reseteada');
      }
    });
    
    // Mostrar mapa
    document.getElementById('map').style.opacity = '1';
    
    // Inicializar mapa si no existe
    iniciarMapa();
    
    // Cargar datos geográficos Y siniestros PRIMERO
    console.log('📍 INICIALIZANDO CARGA DE DATOS DE MAR DEL PLATA');
    cargarDatosGeograficos().then((bariosGeoJson) => {
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
      
      // WAIT UN POCO Y LUEGO ASEGURAR QUE TODO ESTÁ APAGADO
      setTimeout(() => {
        console.log('⏱️ Esperado 500ms, asegurando que todo está apagado...');
        const sinCheckbox = document.getElementById('siniestros-checkbox');
        const camCheckbox = document.getElementById('cameras-checkbox');
        const toggleBarrios = document.getElementById('toggle-barrios');
        
        console.log('  - sinCheckbox:', !!sinCheckbox);
        console.log('  - camCheckbox:', !!camCheckbox);
        console.log('  - toggleBarrios:', !!toggleBarrios);
        console.log('  - SiniestrosLayer:', typeof SiniestrosLayer, SiniestrosLayer ? 'exists' : 'MISSING');
        console.log('  - CamerasLayer:', typeof CamerasLayer, CamerasLayer ? 'exists' : 'MISSING');
        
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
        } else {
          console.error('❌ NO SE PUEDE APAGAR SINIESTROS: sinCheckbox=' + !!sinCheckbox + ', SiniestrosLayer=' + !!SiniestrosLayer);
        }
        
        if (camCheckbox && CamerasLayer) {
          console.log('🔄 Apagando cámaras...');
          camCheckbox.checked = false;
          CamerasLayer.toggle(false);
          console.log('  ✓ Cámaras apagadas');
        } else {
          console.error('❌ NO SE PUEDE APAGAR CAMARAS: camCheckbox=' + !!camCheckbox + ', CamerasLayer=' + !!CamerasLayer);
        }
        
        console.log('✅ INICIALIZACION COMPLETADA - TODO APAGADO');
      }, 500);
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
          if (feature.properties?.soc_fomen) {
            barrios.add(feature.properties.soc_fomen);
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
          
          if (sinCheckbox && sinCheckbox.checked) {
            SiniestrosLayer.setFilter('globalBarrio', barrio);
          }
          if (camCheckbox && camCheckbox.checked) {
            CamerasLayer.setFilter('globalBarrio', barrio);
          }
          if (privCamCheckbox && privCamCheckbox.checked) {
            PrivateCamerasLayer.setFilter('globalBarrio', barrio);
          }
          
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
          const zonesCheckbox = document.getElementById('show-zones-checkbox');
          
          if (sinCheckbox) sinCheckbox.checked = false;
          if (camCheckbox) camCheckbox.checked = false;
          if (privCamCheckbox) privCamCheckbox.checked = false;
          if (zonesCheckbox) zonesCheckbox.checked = false;
          
          // Resetear filtro global de barrio
          const globalBarrioSelect = document.getElementById('global-barrio-filter');
          if (globalBarrioSelect) {
            globalBarrioSelect.value = 'all';
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
          
          // Ocultar todas las capas
          SiniestrosLayer.toggle(false);
          CamerasLayer.toggle(false);
          PrivateCamerasLayer.toggle(false);
          GeoLayers.toggle('all', false);
          
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
            <button type="button" class="help-button" onclick="FormatHelp.showHelp('barrios')" style="margin-top: 24px;">?</button>
          </div>
        </div>
        
        <div style="margin-bottom: 15px;">
          <div style="display: flex; gap: 8px; align-items: flex-start;">
            <div style="flex: 1;">
              <label style="display: block; font-weight: 500; margin-bottom: 5px;">Siniestros (GeoJSON o CSV):</label>
              <input type="file" id="import-file-siniestros" accept=".json,.geojson,.csv" style="width: 100%; padding: 8px; border: 1px solid #ddd; border-radius: 4px;">
              <div style="font-size: 11px; color: #666; margin-top: 5px;">CSV: lat, lng, fecha, causa, participante</div>
            </div>
            <button type="button" class="help-button" onclick="FormatHelp.showHelp('siniestros')" style="margin-top: 24px;">?</button>
          </div>
        </div>
        
        <div style="margin-bottom: 15px;">
          <div style="display: flex; gap: 8px; align-items: flex-start;">
            <div style="flex: 1;">
              <label style="display: block; font-weight: 500; margin-bottom: 5px;">Cámaras Públicas (GeoJSON o CSV):</label>
              <input type="file" id="import-file-cameras" accept=".json,.geojson,.csv" style="width: 100%; padding: 8px; border: 1px solid #ddd; border-radius: 4px;">
              <div style="font-size: 11px; color: #666; margin-top: 5px;">CSV: lat, lng, nombre, tipo</div>
            </div>
            <button type="button" class="help-button" onclick="FormatHelp.showHelp('cameras')" style="margin-top: 24px;">?</button>
          </div>
        </div>
        
        <div style="margin-bottom: 20px;">
          <div style="display: flex; gap: 8px; align-items: flex-start;">
            <div style="flex: 1;">
              <label style="display: block; font-weight: 500; margin-bottom: 5px;">Cámaras Privadas (GeoJSON o CSV):</label>
              <input type="file" id="import-file-private-cameras" accept=".json,.geojson,.csv" style="width: 100%; padding: 8px; border: 1px solid #ddd; border-radius: 4px;">
              <div style="font-size: 11px; color: #666; margin-top: 5px;">CSV: lat, lng, nombre</div>
            </div>
            <button type="button" class="help-button" onclick="FormatHelp.showHelp('private_cameras')" style="margin-top: 24px;">?</button>
          </div>
        </div>
        
        <div style="margin-bottom: 20px; padding: 15px; background-color: #f9f9f9; border-radius: 4px; border: 1px solid #ddd;">
          <h3 style="margin: 0 0 12px 0; font-size: 13px; color: #333;">📋 Capas Opcionales</h3>
          <div style="font-size: 11px; color: #666; margin-bottom: 10px;">Sube archivos adicionales (todos opcionales)</div>
          
          <div style="margin-bottom: 10px;">
            <div style="display: flex; gap: 8px; align-items: center;">
              <label style="display: block; font-size: 11px; margin-bottom: 0; flex: 1;">🚦 Semáforos:</label>
              <button type="button" class="help-button" onclick="FormatHelp.showHelp('semaforos')" style="padding: 4px 8px !important; margin: 0 !important; font-size: 11px !important;">?</button>
            </div>
            <input type="file" id="import-file-semaforos" accept=".json,.geojson,.csv" style="width: 100%; padding: 6px; border: 1px solid #ddd; border-radius: 4px; font-size: 11px; margin-top: 3px;">
          </div>
          
          <div style="margin-bottom: 10px;">
            <div style="display: flex; gap: 8px; align-items: center;">
              <label style="display: block; font-size: 11px; margin-bottom: 0; flex: 1;">🏫 Colegios/Escuelas:</label>
              <button type="button" class="help-button" onclick="FormatHelp.showHelp('colegios')" style="padding: 4px 8px !important; margin: 0 !important; font-size: 11px !important;">?</button>
            </div>
            <input type="file" id="import-file-colegios" accept=".json,.geojson,.csv" style="width: 100%; padding: 6px; border: 1px solid #ddd; border-radius: 4px; font-size: 11px; margin-top: 3px;">
          </div>
          
          <div style="margin-bottom: 10px;">
            <div style="display: flex; gap: 8px; align-items: center;">
              <label style="display: block; font-size: 11px; margin-bottom: 0; flex: 1;">🚌 Colectivos:</label>
              <button type="button" class="help-button" onclick="FormatHelp.showHelp('colectivos')" style="padding: 4px 8px !important; margin: 0 !important; font-size: 11px !important;">?</button>
            </div>
            <input type="file" id="import-file-colectivos" accept=".json,.geojson,.csv" style="width: 100%; padding: 6px; border: 1px solid #ddd; border-radius: 4px; font-size: 11px; margin-top: 3px;">
          </div>
          
          <div style="margin-bottom: 10px;">
            <div style="display: flex; gap: 8px; align-items: center;">
              <label style="display: block; font-size: 11px; margin-bottom: 0; flex: 1;">🛣️ Corredores Escolares:</label>
              <button type="button" class="help-button" onclick="FormatHelp.showHelp('corredores')" style="padding: 4px 8px !important; margin: 0 !important; font-size: 11px !important;">?</button>
            </div>
            <input type="file" id="import-file-corredores" accept=".json,.geojson,.csv" style="width: 100%; padding: 6px; border: 1px solid #ddd; border-radius: 4px; font-size: 11px; margin-top: 3px;">
          </div>
          
          <div style="margin-bottom: 10px;">
            <div style="display: flex; gap: 8px; align-items: center;">
              <label style="display: block; font-size: 11px; margin-bottom: 0; flex: 1;">📊 Flujo Vehicular:</label>
              <button type="button" class="help-button" onclick="FormatHelp.showHelp('flujo')" style="padding: 4px 8px !important; margin: 0 !important; font-size: 11px !important;">?</button>
            </div>
            <input type="file" id="import-file-flujo" accept=".json,.geojson,.csv" style="width: 100%; padding: 6px; border: 1px solid #ddd; border-radius: 4px; font-size: 11px; margin-top: 3px;">
          </div>
          
          <div style="margin-bottom: 10px;">
            <div style="display: flex; gap: 8px; align-items: center;">
              <label style="display: block; font-size: 11px; margin-bottom: 0; flex: 1;">🚗 Robo Automotor:</label>
              <button type="button" class="help-button" onclick="FormatHelp.showHelp('robo')" style="padding: 4px 8px !important; margin: 0 !important; font-size: 11px !important;">?</button>
            </div>
            <input type="file" id="import-file-robo" accept=".json,.geojson,.csv" style="width: 100%; padding: 6px; border: 1px solid #ddd; border-radius: 4px; font-size: 11px; margin-top: 3px;">
          </div>
          
          <div style="margin-bottom: 10px;">
            <div style="display: flex; gap: 8px; align-items: center;">
              <label style="display: block; font-size: 11px; margin-bottom: 0; flex: 1;">🚨 Alertas:</label>
              <button type="button" class="help-button" onclick="FormatHelp.showHelp('alertas')" style="padding: 4px 8px !important; margin: 0 !important; font-size: 11px !important;">?</button>
            </div>
            <input type="file" id="import-file-alertas" accept=".json,.geojson,.csv" style="width: 100%; padding: 6px; border: 1px solid #ddd; border-radius: 4px; font-size: 11px; margin-top: 3px;">
          </div>
          
          <div>
            <div style="display: flex; gap: 8px; align-items: center;">
              <label style="display: block; font-size: 11px; margin-bottom: 0; flex: 1;">⛔ Zonas sin Cobertura:</label>
              <button type="button" class="help-button" onclick="FormatHelp.showHelp('zonas')" style="padding: 4px 8px !important; margin: 0 !important; font-size: 11px !important;">?</button>
            </div>
            <input type="file" id="import-file-zonas" accept=".json,.geojson,.csv" style="width: 100%; padding: 6px; border: 1px solid #ddd; border-radius: 4px; font-size: 11px; margin-top: 3px;">
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

  if (!modal || !btnImport) {
    console.error('❌ No se pudo crear el modal de importación');
    return;
  }

  // Cargar ciudades guardadas del usuario
  ImportCities.loadUserCities();

  // Actualizar selector con ciudades del usuario
  const updateCitySelector = () => {
    const userCities = ImportCities.getUserCities();
    const currentOptions = Array.from(citySelector.options).map(o => o.value);
    
    Object.values(userCities).forEach(city => {
      if (!currentOptions.includes(city.id)) {
        const option = document.createElement('option');
        option.value = city.id;
        option.textContent = `⭐ ${city.name} (Usuario)`;
        citySelector.appendChild(option);
      }
    });
  };

  // Abrir modal
  btnImport.addEventListener('click', () => {
    console.log('Abriendo modal de importación');
    modal.style.display = 'block';
  });

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
    document.getElementById('import-file-colectivos').value = '';
    document.getElementById('import-file-corredores').value = '';
    document.getElementById('import-file-flujo').value = '';
    document.getElementById('import-file-robo').value = '';
    document.getElementById('import-file-alertas').value = '';
    document.getElementById('import-file-zonas').value = '';
  });

  // Cerrar modal al hacer clic fuera
  modal.addEventListener('click', (e) => {
    if (e.target === modal) {
      modal.style.display = 'none';
    }
  });

  // Procesar importación
  btnSubmit.addEventListener('click', async () => {
    console.log('📥 Iniciando importación de ciudad');
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
      colectivos: document.getElementById('import-file-colectivos').files[0],
      corredores: document.getElementById('import-file-corredores').files[0],
      flujo: document.getElementById('import-file-flujo').files[0],
      robo: document.getElementById('import-file-robo').files[0],
      alertas: document.getElementById('import-file-alertas').files[0],
      zonas: document.getElementById('import-file-zonas').files[0]
    };

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

// Inicializar sistema de importación de ciudades
setTimeout(() => {
  setupImportCities();
}, 1000);
