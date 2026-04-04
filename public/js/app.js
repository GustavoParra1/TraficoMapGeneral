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
    
    console.log("✅ Mapa inicializado");
  }
}

// Cargar datos geográficos
async function cargarDatosGeograficos() {
  console.log('📍 Cargando datos geográficos...');
  
  try {
    // Cargar barrios desde archivo JSON
    const response = await fetch('data/barrios.json');
    if (response.ok) {
      const bariosData = await response.json();
      GeoLayers.loadEmbeddedGeoJson('Zonas / Barrios', bariosData, true); // true = mostrar
      console.log('✓ Datos de barrios cargados');
    }
    
    // Cargar siniestros
    const sinResponse = await fetch('data/siniestros_con_ubicacion.geojson');
    if (sinResponse.ok) {
      await SiniestrosLayer.load('data/siniestros_con_ubicacion.geojson');
      console.log('✓ Datos de siniestros cargados');
    }
  } catch (error) {
    console.warn('⚠️ Datasets geográficos no disponibles aún:', error);
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
        <div class="sidebar-title">Capas Geográficas</div>
        <div class="button-group">
          <label style="display: flex; align-items: center; gap: 8px; font-size: 12px; cursor: pointer;">
            <input type="checkbox" id="toggle-barrios" checked>
            <span>Zonas / Barrios</span>
          </label>
          <label style="display: flex; align-items: center; gap: 8px; font-size: 12px; cursor: pointer; margin-top: 8px;">
            <input type="checkbox" id="siniestros-checkbox">
            <span>Mostrar Siniestros (<span id="total-siniestros-count">0</span>)</span>
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
            Barrio:
            <select id="barrio-filter" style="width: 100%; padding: 4px;"><option value="all">Todos</option></select>
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
    
    // Toggle de barrios
    const toggleBarrios = document.getElementById('toggle-barrios');
    if (toggleBarrios) {
      toggleBarrios.addEventListener('change', (e) => {
        const isVisible = GeoLayers.toggleLayer('Zonas / Barrios');
        toggleBarrios.checked = isVisible;
      });
    }
    
    // Toggle de siniestros
    const sinCheckbox = document.getElementById('siniestros-checkbox');
    if (sinCheckbox) {
      sinCheckbox.addEventListener('change', (e) => {
        SiniestrosLayer.toggle(e.target.checked);
      });
    }
    
    document.getElementById('center-map-btn').addEventListener('click', () => {
      map.setView([-38.0, -57.55], 12);
    });
    
    document.getElementById('reset-view-btn').addEventListener('click', () => {
      map.setView([-38.0, -57.55], 12);
    });
    
    // Mostrar mapa
    document.getElementById('map').style.opacity = '1';
    
    // Inicializar mapa si no existe
    iniciarMapa();
    
    // Cargar datos geográficos Y siniestros PRIMERO
    cargarDatosGeograficos().then(() => {
      console.log('✅ Datos cargados, configurando filtros...');
      // LUEGO configurar event listeners
      setupSinistrosFilters();
    });
    
    // Función para configurar event listeners de filtros
    const setupSinistrosFilters = () => {
      const filters = ['year-filter', 'barrio-filter', 'cause-filter', 'participant-filter', 'start-hour-filter', 'end-hour-filter'];
      
      filters.forEach(filterId => {
        const element = document.getElementById(filterId);
        if (element) {
          element.addEventListener('change', (e) => {
            const filterMap = {
              'year-filter': 'year',
              'barrio-filter': 'barrio',
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
          console.log('Clearing filters');
          SiniestrosLayer.clearFilters();
        });
      }
    };
  }
});

// Inicializar mapa al cargar
iniciarMapa();
