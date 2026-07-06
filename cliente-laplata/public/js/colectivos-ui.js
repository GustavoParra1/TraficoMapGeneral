/**
 * 🎛️ UI para Colectivos - Control Panel profesional
 * Interfaz moderna para seleccionar líneas y ver cobertura de cámaras
 */

const ColectivosUI = (() => {
  let panelElement = null;
  let activeLineNumber = null;

  /**
   * Crea el HTML del panel de control de colectivos
   */
  const createPanel = () => {
    const html = `
      <div id="colectivos-panel" class="colectivos-panel">
        <!-- HEADER -->
        <div class="colectivos-header">
          <h3>🚌 Líneas de Transporte</h3>
          <div class="colectivos-header-actions">
            <button id="colectivos-manage-cities" class="btn-manage-cities" title="Gestionar ciudades">
              🏙️
            </button>
            <button id="colectivos-toggle-all" class="btn-toggle-all" title="Mostrar/Ocultar todas">
              <i class="icon">👁️</i>
            </button>
            <button id="colectivos-close" class="btn-close">✕</button>
          </div>
        </div>

        <!-- SEARCH & FILTERS -->
        <div class="colectivos-search-bar">
          <input 
            type="text" 
            id="colectivos-search" 
            placeholder="Buscar línea (ej: 501, 511)..."
            class="search-input"
          >
          <span class="search-icon">🔍</span>
        </div>

        <!-- STATS -->
        <div class="colectivos-stats">
          <div class="stat-item">
            <span class="stat-label">Líneas:</span>
            <span class="stat-value" id="colectivos-count">0</span>
          </div>
          <div class="stat-item">
            <span class="stat-label">Activas:</span>
            <span class="stat-value" id="colectivos-active-count">0</span>
          </div>
        </div>

        <!-- LISTA DE LÍNEAS -->
        <div class="colectivos-list-container">
          <div id="colectivos-list" class="colectivos-list">
            <div class="loading">Cargando líneas...</div>
          </div>
        </div>

        <!-- PANEL DE DETALLES -->
        <div id="colectivos-detail-panel" class="colectivos-detail-panel" style="display: none;">
          <div class="detail-header">
            <button id="detail-back" class="btn-back">← Volver</button>
            <h4 id="detail-title">Línea N/A</h4>
          </div>
          <div id="detail-content" class="detail-content">
            <!-- Se llenará dinámicamente -->
          </div>
        </div>

        <!-- PANEL DE GESTIÓN DE CIUDADES -->
        <div id="cities-management-panel" class="cities-management-panel" style="display: none;">
          <div class="detail-header">
            <button id="cities-back" class="btn-back">← Volver</button>
            <h4>🏙️ Gestionar Ciudades</h4>
          </div>
          <div class="cities-management-content">
            <div id="cities-list" class="cities-list">
              <div class="loading">Cargando ciudades...</div>
            </div>
          </div>
        </div>
      </div>

      <style>
        .colectivos-panel {
          position: fixed;
          left: 0;
          top: 80px;
          width: 320px;
          height: calc(100vh - 80px);
          background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);
          border-right: 2px solid #00d4ff;
          display: flex;
          flex-direction: column;
          z-index: 1000;
          box-shadow: 3px 0 15px rgba(0, 212, 255, 0.2);
          color: #ecf0f1;
          font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
          overflow: hidden;
        }

        .colectivos-header {
          padding: 15px;
          background: linear-gradient(90deg, #0f3460 0%, #1a1a2e 100%);
          border-bottom: 2px solid #00d4ff;
          display: flex;
          justify-content: space-between;
          align-items: center;
        }

        .colectivos-header h3 {
          margin: 0;
          font-size: 16px;
          color: #00d4ff;
          font-weight: 600;
          text-transform: uppercase;
          letter-spacing: 1px;
        }

        .colectivos-header-actions {
          display: flex;
          gap: 8px;
        }

        .btn-toggle-all,
        .btn-close,
        .btn-manage-cities {
          background: transparent;
          border: 1px solid #00d4ff;
          color: #00d4ff;
          padding: 6px 10px;
          border-radius: 4px;
          cursor: pointer;
          font-size: 14px;
          transition: all 0.3s ease;
        }

        .btn-toggle-all:hover,
        .btn-close:hover,
        .btn-manage-cities:hover {
          background: #00d4ff;
          color: #1a1a2e;
          box-shadow: 0 0 10px rgba(0, 212, 255, 0.5);
        }

        .colectivos-search-bar {
          padding: 12px;
          position: relative;
        }

        .search-input {
          width: 100%;
          padding: 10px 35px 10px 12px;
          border: 1px solid #00d4ff;
          background: rgba(0, 212, 255, 0.05);
          color: #ecf0f1;
          border-radius: 4px;
          font-size: 13px;
          transition: all 0.3s ease;
        }

        .search-input:focus {
          outline: none;
          background: rgba(0, 212, 255, 0.1);
          border-color: #00ff88;
          box-shadow: 0 0 10px rgba(0, 212, 255, 0.3);
        }

        .search-icon {
          position: absolute;
          right: 20px;
          top: 50%;
          transform: translateY(-50%);
          pointer-events: none;
          opacity: 0.5;
        }

        .colectivos-stats {
          display: flex;
          gap: 12px;
          padding: 10px 12px;
          background: rgba(0, 212, 255, 0.05);
          border-bottom: 1px solid #00d4ff;
        }

        .stat-item {
          flex: 1;
          display: flex;
          justify-content: space-between;
          align-items: center;
          font-size: 12px;
          padding: 6px;
          background: rgba(0, 0, 0, 0.3);
          border-radius: 4px;
        }

        .stat-label {
          color: #00d4ff;
          font-weight: 600;
        }

        .stat-value {
          color: #00ff88;
          font-weight: bold;
          font-size: 14px;
        }

        .colectivos-list-container {
          flex: 1;
          overflow-y: auto;
          padding: 8px;
        }

        .colectivos-list {
          display: flex;
          flex-direction: column;
          gap: 6px;
        }

        .linea-item {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 12px;
          background: rgba(255, 255, 255, 0.05);
          border: 1px solid transparent;
          border-radius: 6px;
          cursor: pointer;
          transition: all 0.3s ease;
          border-left: 4px solid;
          user-select: none;
        }

        .linea-item:hover {
          background: rgba(0, 212, 255, 0.1);
          border-color: rgba(0, 212, 255, 0.5);
          transform: translateX(5px);
        }

        .linea-item.active {
          background: rgba(0, 212, 255, 0.15);
          border-color: #00ff88;
          box-shadow: 0 0 10px rgba(0, 212, 255, 0.3);
        }

        .linea-color-indicator {
          width: 20px;
          height: 20px;
          border-radius: 50%;
          border: 2px solid #ecf0f1;
          flex-shrink: 0;
        }

        .linea-info {
          flex: 1;
          min-width: 0;
        }

        .linea-number {
          font-weight: bold;
          color: #00d4ff;
          font-size: 14px;
        }

        .linea-coverage {
          font-size: 11px;
          color: #00ff88;
          margin-top: 2px;
        }

        .linea-toggle {
          width: 24px;
          height: 24px;
          border-radius: 4px;
          background: transparent;
          border: 1px solid #00d4ff;
          color: #00d4ff;
          cursor: pointer;
          font-size: 12px;
          transition: all 0.3s ease;
          flex-shrink: 0;
        }

        .linea-toggle:hover {
          background: #00d4ff;
          color: #1a1a2e;
        }

        .linea-toggle.active {
          background: #00d4ff;
          color: #1a1a2e;
        }

        .loading {
          text-align: center;
          padding: 40px 20px;
          color: #00d4ff;
          font-style: italic;
        }

        /* Panel de detalles */
        .colectivos-detail-panel {
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);
          display: flex;
          flex-direction: column;
          z-index: 1001;
        }

        /* Panel de gestión de ciudades */
        .cities-management-panel {
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);
          display: flex;
          flex-direction: column;
          z-index: 1001;
        }

        .cities-management-content {
          flex: 1;
          overflow-y: auto;
          padding: 15px;
        }

        .cities-list {
          display: flex;
          flex-direction: column;
          gap: 10px;
        }

        .city-item {
          padding: 12px;
          background: rgba(0, 212, 255, 0.05);
          border: 1px solid #00d4ff;
          border-radius: 4px;
          display: flex;
          justify-content: space-between;
          align-items: center;
        }

        .city-item-info {
          flex: 1;
        }

        .city-item-name {
          color: #00d4ff;
          font-weight: 600;
          margin-bottom: 4px;
        }

        .city-item-type {
          color: #888;
          font-size: 12px;
        }

        .btn-delete-city {
          background: #ff4444;
          border: 1px solid #ff6666;
          color: white;
          padding: 6px 12px;
          border-radius: 4px;
          cursor: pointer;
          font-size: 12px;
          transition: all 0.3s ease;
        }

        .btn-delete-city:hover {
          background: #ff6666;
          box-shadow: 0 0 10px rgba(255, 68, 68, 0.5);
        }

        .btn-delete-city:disabled {
          background: #999;
          border-color: #888;
          cursor: not-allowed;
          opacity: 0.7;
        }

        .detail-header {
          padding: 15px;
          background: linear-gradient(90deg, #0f3460 0%, #1a1a2e 100%);
          border-bottom: 2px solid #00d4ff;
          display: flex;
          align-items: center;
          gap: 12px;
        }

        .btn-back {
          background: transparent;
          border: 1px solid #00d4ff;
          color: #00d4ff;
          padding: 6px 10px;
          border-radius: 4px;
          cursor: pointer;
          transition: all 0.3s ease;
        }

        .btn-back:hover {
          background: #00d4ff;
          color: #1a1a2e;
        }

        .detail-header h4 {
          margin: 0;
          flex: 1;
          color: #00ff88;
          font-size: 16px;
        }

        .detail-content {
          flex: 1;
          overflow-y: auto;
          padding: 15px;
        }

        .detail-section {
          margin-bottom: 20px;
        }

        .detail-section-title {
          color: #00d4ff;
          font-weight: 600;
          font-size: 12px;
          text-transform: uppercase;
          margin-bottom: 10px;
          padding-bottom: 8px;
          border-bottom: 1px solid #00d4ff;
        }

        .coverage-stat {
          display: flex;
          justify-content: space-between;
          padding: 10px;
          background: rgba(0, 212, 255, 0.05);
          border-left: 3px solid #00d4ff;
          margin-bottom: 8px;
          border-radius: 4px;
        }

        .coverage-stat-label {
          color: #00d4ff;
        }

        .coverage-stat-value {
          color: #00ff88;
          font-weight: bold;
        }

        .camera-list {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }

        .camera-item {
          padding: 10px;
          background: rgba(0, 212, 255, 0.05);
          border-left: 3px solid #00ff88;
          border-radius: 4px;
          font-size: 12px;
        }

        .camera-name {
          color: #00d4ff;
          font-weight: 600;
          margin-bottom: 2px;
        }

        .camera-distance {
          color: #00ff88;
          font-size: 11px;
        }

        .btn-focus {
          width: 100%;
          padding: 12px;
          background: linear-gradient(90deg, #00d4ff 0%, #00ff88 100%);
          color: #1a1a2e;
          border: none;
          border-radius: 4px;
          font-weight: 600;
          cursor: pointer;
          margin-top: 15px;
          transition: all 0.3s ease;
        }

        .btn-focus:hover {
          transform: scale(1.02);
          box-shadow: 0 0 15px rgba(0, 212, 255, 0.5);
        }

        /* Scrollbar personalizado */
        .colectivos-list-container::-webkit-scrollbar,
        .detail-content::-webkit-scrollbar {
          width: 6px;
        }

        .colectivos-list-container::-webkit-scrollbar-track,
        .detail-content::-webkit-scrollbar-track {
          background: rgba(0, 212, 255, 0.05);
          border-radius: 10px;
        }

        .colectivos-list-container::-webkit-scrollbar-thumb,
        .detail-content::-webkit-scrollbar-thumb {
          background: rgba(0, 212, 255, 0.3);
          border-radius: 10px;
        }

        .colectivos-list-container::-webkit-scrollbar-thumb:hover,
        .detail-content::-webkit-scrollbar-thumb:hover {
          background: rgba(0, 212, 255, 0.6);
        }
      </style>
    `;

    const container = document.createElement('div');
    container.innerHTML = html;
    
    // Extraer el panel element
    const panelDiv = container.firstElementChild;
    
    // Extraer y aplicar los estilos
    const styleElement = container.querySelector('style');
    if (styleElement) {
      document.head.appendChild(styleElement);
      console.log('✅ Estilos de colectivos aplicados al documento');
    }
    
    return panelDiv;
  };

  /**
   * Renderiza la lista de líneas disponibles
   */
  const renderLineasList = (lineas) => {
    console.log('🚌 renderLineasList() llamado con lineas:', lineas);
    
    const listContainer = document.getElementById('colectivos-list');
    if (!listContainer) {
      console.error('❌ colectivos-list no encontrado en DOM');
      return;
    }

    if (!lineas || lineas.length === 0) {
      console.warn('⚠️ Sin líneas para renderizar');
      listContainer.innerHTML = '<div class="loading">Sin líneas de colectivos</div>';
      document.getElementById('colectivos-count').textContent = '0';
      document.getElementById('colectivos-active-count').textContent = '0';
      return;
    }

    console.log(`✅ Renderizando ${lineas.length} líneas`);
    const activeCount = lineas.filter(l => l.enabled).length;
    document.getElementById('colectivos-count').textContent = lineas.length;
    document.getElementById('colectivos-active-count').textContent = activeCount;

    listContainer.innerHTML = lineas.map(linea => {
      const coverage = linea.coverageInfo?.porcentajeCobertura || 0;
      const coverageColor = coverage > 75 ? '#00ff88' : coverage > 40 ? '#ffbb00' : '#ff6b6b';

      return `
        <div class="linea-item ${linea.enabled ? 'active' : ''}" data-linea="${linea.numeroLinea}">
          <div class="linea-color-indicator" style="background-color: ${linea.color}; border-color: ${linea.color};"></div>
          
          <div class="linea-info">
            <div class="linea-number">Línea ${linea.numeroLinea}</div>
            ${coverage > 0 ? `<div class="linea-coverage" style="color: ${coverageColor};">📡 ${coverage.toFixed(0)}% cobertura</div>` : ''}
          </div>
          
          <button 
            class="linea-toggle ${linea.enabled ? 'active' : ''}"
            data-linea="${linea.numeroLinea}"
            title="${linea.enabled ? 'Ocultar' : 'Mostrar'}"
          >
            ${linea.enabled ? '👁️' : '✓'}
          </button>
        </div>
      `;
    }).join('');

    console.log('✅ HTML generado y agregado al DOM');

    // Event listeners
    document.querySelectorAll('.linea-item').forEach(item => {
      item.addEventListener('click', (e) => {
        if (e.target.closest('.linea-toggle')) return;
        const numeroLinea = item.dataset.linea;
        console.log('🚌 Click en línea:', numeroLinea);
        showDetailPanel(numeroLinea);
      });
    });

    document.querySelectorAll('.linea-toggle').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const numeroLinea = btn.dataset.linea;
        console.log('🚌 Toggle línea:', numeroLinea);
        const newState = ColectivosLayer.toggleLinea(numeroLinea);
        
        btn.classList.toggle('active', newState);
        document.querySelector(`[data-linea="${numeroLinea}"]`).classList.toggle('active', newState);
        
        setTimeout(() => renderLineasList(ColectivosLayer.getLineasFiltradas()), 200);
      });
    });
  };

  /**
   * Muestra el panel de detalles de una línea
   */
  const showDetailPanel = (numeroLinea) => {
    const linea = ColectivosLayer.getLinea(numeroLinea);
    if (!linea) return;

    activeLineNumber = numeroLinea;
    const listContainer = document.querySelector('.colectivos-list-container');
    const detailPanel = document.getElementById('colectivos-detail-panel');
    const detailTitle = document.getElementById('detail-title');
    const detailContent = document.getElementById('detail-content');

    detailTitle.innerHTML = `<span style="color: ${linea.color};">●</span> Línea ${numeroLinea}`;

    const cameras = ColectivosLayer.getCamerasParaLinea(numeroLinea);
    const coverage = linea.coverageInfo;

    let html = '';

    // Stats
    if (coverage) {
      html += `
        <div class="detail-section">
          <div class="detail-section-title">📊 Cobertura</div>
          <div class="coverage-stat">
            <span class="coverage-stat-label">Cámaras cercanas:</span>
            <span class="coverage-stat-value">${coverage.camarasCercanas || 0}</span>
          </div>
          <div class="coverage-stat">
            <span class="coverage-stat-label">Cobertura:</span>
            <span class="coverage-stat-value">${coverage.porcentajeCobertura?.toFixed(1) || 0}%</span>
          </div>
        </div>
      `;
    }

    // Cámaras
    if (cameras.length > 0) {
      html += `
        <div class="detail-section">
          <div class="detail-section-title">📹 Cámaras cercanas (radio 150m)</div>
          <div class="camera-list">
            ${cameras.slice(0, 10).map(cam => `
              <div class="camera-item">
                <div class="camera-name">${cam.nombre || cam.numero || 'Cámara'}</div>
                <div class="camera-distance">📍 ${cam.distancia.toFixed(0)}m de la ruta</div>
              </div>
            `).join('')}
            ${cameras.length > 10 ? `<div style="text-align: center; color: #00d4ff; font-size: 11px; margin-top: 10px;">... y ${cameras.length - 10} más</div>` : ''}
          </div>
        </div>
      `;
    } else {
      html += `
        <div class="detail-section">
          <div style="padding: 20px; text-align: center; color: #ff6b6b;">
            ⚠️ Sin cámaras en esta ruta<br>
            <small>No hay cámaras a menos de 150m de la línea</small>
          </div>
        </div>
      `;
    }

    // Botón Focus
    html += `
      <button class="btn-focus" id="btn-focus-linea">📍 Centrar en línea</button>
    `;

    detailContent.innerHTML = html;
    listContainer.style.display = 'none';
    detailPanel.style.display = 'flex';

    // Mostrar cámaras cercanas en el mapa
    ColectivosLayer.showCamerasForLinea(numeroLinea);

    document.getElementById('btn-focus-linea').addEventListener('click', () => {
      ColectivosLayer.focusLinea(numeroLinea);
    });
  };

  /**
   * Oculta el panel de detalles
   */
  const hideDetailPanel = () => {
    const listContainer = document.querySelector('.colectivos-list-container');
    const detailPanel = document.getElementById('colectivos-detail-panel');
    listContainer.style.display = 'block';
    detailPanel.style.display = 'none';
    activeLineNumber = null;
    
    // Limpiar marcadores de cámaras
    ColectivosLayer.clearCameraMarkers();
  };

  /**
   * Renderiza el panel de gestión de ciudades
   */
  const renderCitiesManagement = () => {
    const citiesList = document.getElementById('cities-list');
    if (!citiesList) return;

    // Obtener ciudades predefinidas y del usuario
    const predefinedCities = [
      { id: 'cordoba', name: 'Córdoba', type: 'predefinida' },
      { id: 'mar-del-plata', name: 'Mar del Plata', type: 'predefinida' }
    ];

    const userCities = ImportCities?.getUserCities?.() || {};
    const currentCity = document.getElementById('city-selector')?.value;

    let html = '';

    // Mostrar ciudades predefinidas
    predefinedCities.forEach(city => {
      html += `
        <div class="city-item">
          <div class="city-item-info">
            <div class="city-item-name">📍 ${city.name}</div>
            <div class="city-item-type">Sistema (no se puede eliminar)</div>
          </div>
          <button class="btn-delete-city" disabled>🔒</button>
        </div>
      `;
    });

    // Mostrar ciudades del usuario
    Object.values(userCities).forEach(city => {
      const isCurrent = city.id === currentCity;
      html += `
        <div class="city-item">
          <div class="city-item-info">
            <div class="city-item-name">⭐ ${city.name} ${isCurrent ? '(Actual)' : ''}</div>
            <div class="city-item-type">Usuario importado</div>
          </div>
          <button class="btn-delete-city" data-city-id="${city.id}" ${isCurrent ? 'disabled' : ''} title="${isCurrent ? 'No se puede eliminar la ciudad activa' : 'Eliminar de localStorage'}">
            ${isCurrent ? '✓ Activa' : '✕ Eliminar'}
          </button>
        </div>
      `;
    });

    if (Object.keys(userCities).length === 0) {
      html += '<div class="loading" style="color: #888;">No hay ciudades importadas del usuario</div>';
    }

    citiesList.innerHTML = html;

    // Agregar event listeners a botones de eliminar
    document.querySelectorAll('.btn-delete-city').forEach(btn => {
      if (!btn.disabled) {
        btn.addEventListener('click', (e) => {
          const cityId = btn.getAttribute('data-city-id');
          if (cityId && typeof ImportCities !== 'undefined') {
            if (confirm(`¿Eliminar la ciudad ${userCities[cityId]?.name}? Se borrará de localStorage pero las carpetas de datos quedarán intactas en el servidor.`)) {
              console.log(`🗑️ Eliminando ciudad del usuario: ${cityId}`);
              ImportCities.deleteCity(cityId);
              
              // Si es la ciudad activa, cambiar a Córdoba
              const citySelector = document.getElementById('city-selector');
              if (citySelector && citySelector.value === cityId) {
                citySelector.value = 'cordoba';
                citySelector.dispatchEvent(new Event('change'));
              }

              // Actualizar selector y re-renderizar
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

              // Remover opción del selector
              const option = Array.from(citySelector.options).find(o => o.value === cityId);
              if (option) {
                option.remove();
                console.log(`✅ Opción removida del selector: ${cityId}`);
              }

              // Re-renderizar el panel
              setTimeout(() => {
                renderCitiesManagement();
                console.log(`✅ Ciudad ${cityId} eliminada de localStorage`);
              }, 300);
            }
          }
        });
      }
    });
  };

  /**
   * Inicializa la UI
   */
  const init = async () => {
    console.log('🚌 ColectivosUI.init() llamado');
    panelElement = createPanel();
    document.body.appendChild(panelElement);
    console.log('✅ Panel creado y agregado al DOM');

    // Event listeners
    const closeBtn = document.getElementById('colectivos-close');
    const toggleAllBtn = document.getElementById('colectivos-toggle-all');
    const searchInput = document.getElementById('colectivos-search');
    const detailBackBtn = document.getElementById('detail-back');

    if (!closeBtn) console.warn('⚠️ closeBtn no encontrado');
    if (!toggleAllBtn) console.warn('⚠️ toggleAllBtn no encontrado');
    if (!searchInput) console.warn('⚠️ searchInput no encontrado');
    if (!detailBackBtn) console.warn('⚠️ detailBackBtn no encontrado');

    if (closeBtn) {
      closeBtn.addEventListener('click', () => {
        panelElement.style.display = 'none';
        console.log('🚌 Panel cerrado');
      });
    }

    if (toggleAllBtn) {
      toggleAllBtn.addEventListener('click', () => {
        const lineas = ColectivosLayer.getLineasOrganizadas();
        const allActive = lineas.every(l => l.enabled);
        ColectivosLayer.toggleAll(!allActive);
        renderLineasList(ColectivosLayer.getLineasFiltradas());
      });
    }

    if (searchInput) {
      searchInput.addEventListener('input', (e) => {
        ColectivosLayer.setFilter('searchQuery', e.target.value);
        renderLineasList(ColectivosLayer.getLineasFiltradas());
      });
    }

    if (detailBackBtn) {
      detailBackBtn.addEventListener('click', hideDetailPanel);
    }

    // Event listeners para gestión de ciudades
    const manageCitiesBtn = document.getElementById('colectivos-manage-cities');
    const citiesBackBtn = document.getElementById('cities-back');
    const citiesManagementPanel = document.getElementById('cities-management-panel');

    if (manageCitiesBtn) {
      manageCitiesBtn.addEventListener('click', () => {
        console.log('🏙️ Abriendo panel de gestión de ciudades');
        const detailPanel = document.getElementById('colectivos-detail-panel');
        if (detailPanel && detailPanel.style.display !== 'none') {
          hideDetailPanel();
        }
        renderCitiesManagement();
        if (citiesManagementPanel) {
          citiesManagementPanel.style.display = 'flex';
        }
      });
    }

    if (citiesBackBtn) {
      citiesBackBtn.addEventListener('click', () => {
        console.log('🏙️ Cerrando panel de gestión de ciudades');
        if (citiesManagementPanel) {
          citiesManagementPanel.style.display = 'none';
        }
      });
    }

    // Renderizar inicial
    console.log('🚌 Renderizando lista inicial...');
    const lineas = ColectivosLayer.getLineasOrganizadas();
    renderLineasList(lineas);
    console.log('✅ ColectivosUI.init() completado');
    return panelElement;
  };

  /**
   * Actualiza la visualización con nuevas líneas
   */
  const refresh = () => {
    renderLineasList(ColectivosLayer.getLineasFiltradas());
  };

  const show = async () => {
    console.log('🚌 ColectivosUI.show() - panelElement:', panelElement ? 'exists' : 'NULL');
    
    // Si el panel no existe, inicializarlo primero
    if (!panelElement) {
      console.log('🚌 Panel no existe, inicializando...');
      await init();
    }
    
    if (panelElement) {
      panelElement.style.display = 'flex';
      console.log('✅ Panel mostrado');
    } else {
      console.error('❌ panelElement aún es NULL después de init()');
    }
  };

  const hide = () => {
    if (panelElement) {
      panelElement.style.display = 'none';
    }
  };

  /**
   * Refresca el panel con las nuevas líneas de la ciudad actual
   */
  const refreshPanel = () => {
    console.log('🔄 ColectivosUI.refreshPanel() llamado');
    if (!ColectivosLayer) {
      console.warn('⚠️ ColectivosLayer no disponible');
      return;
    }
    
    const lineas = ColectivosLayer.getLineas();
    if (lineas && lineas.length > 0) {
      renderLineasList(lineas);
      console.log(`✅ Panel actualizado con ${lineas.length} líneas`);
    }
  };

  return {
    init,
    refresh,
    show,
    hide,
    refreshPanel,
    renderLineasList
  };
})();

console.log('✅ ColectivosUI cargado - Interfaz de control lista');
