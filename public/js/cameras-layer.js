// ====================================================
// MÓDULO: Carga y Filtrado de Cámaras de Monitoreo
// ====================================================

const CamerasLayer = (() => {
  let camerasData = [];
  let filteredCameras = [];
  let camerasLayer = null;
  let map = null;
  let isVisible = false;
  let barriosGeoJson = null; // Para filtrado geográfico

  // Colores por tipo de cámara
  const typeColors = {
    'Pública (Municipal)': '#00AA00',  // Verde
    'Privada': '#FF8C42',               // Naranja
    'Escolar': '#FFD93D',               // Amarillo
    'Seguimiento': '#4D96FF'            // Azul
  };

  // Filtros activos
  const filters = {
    globalBarrio: 'all',  // Filtro global de barrio
    barrio: 'all',
    type: 'all',
    corridor: 'all',
    cameraType: 'all'  // "all", "dome", "fixed", "lpr"
  };

  /**
   * Inicializa el módulo
   */
  function init(leafletMap) {
    map = leafletMap;
    console.log('✅ CamerasLayer inicializado');
  }

  /**
   * Carga las cámaras desde GeoJSON (para datos importados/data URLs)
   */
  function loadCamerasFromGeoJson(geojson) {
    try {
      camerasData = geojson.features || [];
      
      console.log(`✅ Cargadas ${camerasData.length} cámaras desde GeoJSON`);
      
      // Extraer valores únicos para filtros
      updateFilterOptions();
      
      // Renderizar cámaras
      applyFilters();
      
      return camerasData;
    } catch (error) {
      console.error('❌ Error cargando cámaras desde GeoJSON:', error);
      return [];
    }
  }

  /**
   * Carga las cámaras desde GeoJSON
   */
  async function loadCameras(geojsonPath) {
    try {
      const response = await fetch(geojsonPath);
      const geojson = await response.json();
      camerasData = geojson.features || [];
      
      console.log(`✅ Cargadas ${camerasData.length} cámaras`);
      
      // Extraer valores únicos para filtros
      updateFilterOptions();
      
      return camerasData;
    } catch (error) {
      console.error('❌ Error cargando cámaras:', error);
      return [];
    }
  }

  /**
   * Actualiza las opciones de los filtros
   */
  function updateFilterOptions() {
    const barrios = new Set();
    const types = new Set();
    const corridors = new Set();

    camerasData.forEach(feature => {
      const props = feature.properties || {};
      
      if (props.barrio) barrios.add(props.barrio);
      if (props.type) types.add(props.type);
      if (props.corridor) corridors.add(props.corridor);
    });

    // Actualizar selectores
    updateSelect('barrio-cameras-filter', Array.from(barrios).sort());
    updateSelect('type-cameras-filter', Array.from(types).sort());
    updateSelect('corridor-cameras-filter', Array.from(corridors).sort());

    console.log('✅ Filtros actualizados');
  }

  /**
   * Actualiza un selector con nuevas opciones
   */
  function updateSelect(id, options) {
    const select = document.getElementById(id);
    if (!select) return;

    // Guardar valor actual
    const currentValue = select.value;

    // Limpiar opciones (excepto la primera)
    while (select.options.length > 1) {
      select.remove(1);
    }

    // Agregar nuevas opciones
    options.forEach(option => {
      const optElement = document.createElement('option');
      optElement.value = option;
      optElement.textContent = option;
      select.appendChild(optElement);
    });

    // Restaurar valor
    select.value = currentValue || 'all';
  }

  /**
   * Verifica si un punto [lng, lat] está dentro de un polígono GeoJSON
   */
  function pointInPolygon(point, polygon) {
    if (!polygon) return false;
    
    const [lng, lat] = point;
    let inside = false;

    if (polygon.type === 'Polygon') {
      const coords = polygon.coordinates[0];
      for (let i = 0, j = coords.length - 1; i < coords.length; j = i++) {
        const xi = coords[i][0], yi = coords[i][1];
        const xj = coords[j][0], yj = coords[j][1];
        
        const intersect = ((yi > lat) !== (yj > lat))
          && (lng < (xj - xi) * (lat - yi) / (yj - yi) + xi);
        if (intersect) inside = !inside;
      }
    } else if (polygon.type === 'MultiPolygon') {
      for (const poly of polygon.coordinates) {
        const coords = poly[0];
        let insideCurrent = false;
        for (let i = 0, j = coords.length - 1; i < coords.length; j = i++) {
          const xi = coords[i][0], yi = coords[i][1];
          const xj = coords[j][0], yj = coords[j][1];
          
          const intersect = ((yi > lat) !== (yj > lat))
            && (lng < (xj - xi) * (lat - yi) / (yj - yi) + xi);
          if (intersect) insideCurrent = !insideCurrent;
        }
        if (insideCurrent) {
          inside = true;
          break;
        }
      }
    }
    
    return inside;
  }

  /**
   * Obtiene el barrio que contiene un punto
   */
  function getBarrioForPoint(point) {
    if (!barriosGeoJson) return null;
    
    for (const feature of barriosGeoJson.features) {
      if (pointInPolygon(point, feature.geometry)) {
        return feature.properties?.soc_fomen;
      }
    }
    
    return null;
  }

  /**
   * Aplica los filtros y renderiza las cámaras
   */
  function applyFilters() {
    filteredCameras = camerasData.filter(feature => {
      const props = feature.properties;
      const coords = feature.geometry?.coordinates;

      // Filtro por barrio global (prioritario) - usar point-in-polygon
      if (filters.globalBarrio !== 'all') {
        if (coords && coords.length === 2) {
          const cameraBarrio = getBarrioForPoint(coords);
          if (cameraBarrio !== filters.globalBarrio) {
            return false;
          }
        } else {
          return false;
        }
      }

      // Filtro por barrio (nombre directo)
      if (filters.barrio !== 'all' && props.barrio !== filters.barrio) {
        return false;
      }

      // Filtro por tipo
      if (filters.type !== 'all' && props.type !== filters.type) {
        return false;
      }

      // Filtro por corredor
      if (filters.corridor !== 'all' && props.corridor !== filters.corridor) {
        return false;
      }

      // Filtro por tipo de cámara (domos, fijas, LPR)
      if (filters.cameraType !== 'all') {
        if (filters.cameraType === 'dome' && !props.domes) return false;
        if (filters.cameraType === 'fixed' && !props.fixed) return false;
        if (filters.cameraType === 'lpr' && !props.lpr) return false;
      }

      return true;
    });

    renderCameras();
    updateCount();

    console.log(`🎥 ${filteredCameras.length} cámaras después de filtros`);
  }

  /**
   * Renderiza las cámaras en el mapa
   */
  function renderCameras() {
    // Limpiar capa anterior
    if (camerasLayer && map.hasLayer(camerasLayer)) {
      map.removeLayer(camerasLayer);
    }

    // Crear grupo sin clustering
    camerasLayer = L.featureGroup();

    // Crear un icono personalizado con número de cámara
    const createCameraIcon = (type, cameraNumber, domos, fixed, lpr) => {
      // Colores más claros para las cámaras públicas
      const colorMap = {
        'Pública (Municipal)': '#66CC99',  // Verde más claro
        'Privada': '#FFB366',               // Naranja más claro
        'Escolar': '#FFEB99',               // Amarillo más claro
        'Seguimiento': '#99CCFF'            // Azul más claro
      };
      
      const color = colorMap[type] || '#CCCCCC';
      
      // Extraer solo números del código de cámara (eliminar prefijos como SMM, MAR, etc.)
      let cameraNum = '?';
      if (cameraNumber) {
        const numMatch = cameraNumber.toString().match(/\d+/);
        cameraNum = numMatch ? numMatch[0] : cameraNumber;
      }

      return L.divIcon({
        html: `<div style="
          background: linear-gradient(135deg, ${color}, ${color}dd);
          color: #333;
          border-radius: 50%;
          width: 32px;
          height: 32px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 13px;
          font-weight: bold;
          border: 2px solid white;
          box-shadow: 0 2px 6px rgba(0,0,0,0.4);
          font-family: Arial, sans-serif;
          line-height: 1;
        ">
          ${cameraNum}
        </div>`,
        iconSize: [32, 32],
        className: 'camera-icon'
      });
    };

    // Agregar marcadores
    filteredCameras.forEach(feature => {
      const props = feature.properties;
      const coords = feature.geometry.coordinates;
      const lat = coords[1];
      const lon = coords[0];

      const icon = createCameraIcon(props.type, props.camera_number, props.domes, props.fixed, props.lpr);
      const marker = L.marker([lat, lon], { icon });

      // Crear popup
      let popupContent = `
        <div style="font-size: 12px; max-width: 250px;">
          <strong>Cámara #${props.camera_number}</strong><br>
          <strong>📍 ${props.address || 'Dirección no disponible'}</strong><br>
          <small>Barrio: ${props.barrio || 'N/A'}</small><br>
          <small>Tipo: ${props.type || 'N/A'}</small><br>
          <strong>Equipamiento:</strong><br>
          • Domos: ${props.domes || 0}<br>
          • Fijas: ${props.fixed || 0}<br>
          • LPR: ${props.lpr || 0}<br>
          <strong>Total: ${props.total_cameras}</strong>
      `;

      if (props.corridor) {
        popupContent += `<br><small>Corredor: ${props.corridor}</small>`;
      }
      if (props.school_corridor) {
        popupContent += '<br><small><strong>🏫 Corredor Escolar</strong></small>';
      }
      if (props.monitoring) {
        popupContent += '<br><small><strong>🔍 Videovigilancia Activa</strong></small>';
      }

      popupContent += '</div>';

      marker.bindPopup(popupContent);
      camerasLayer.addLayer(marker);
    });

    // Agregar capa al mapa
    if (isVisible) {
      map.addLayer(camerasLayer);
    }
  }

  /**
   * Actualiza el contador de cámaras
   */
  function updateCount() {
    const countSpan = document.getElementById('total-cameras-count');
    if (countSpan) {
      countSpan.textContent = filteredCameras.length;
    }
  }

  /**
   * Setter para filtros
   */
  function setFilter(filterName, value) {
    if (filters.hasOwnProperty(filterName)) {
      filters[filterName] = value;
      applyFilters();
    }
  }

  /**
   * Setter para datos de barrios
   */
  function setBarriosGeoJson(barriosData) {
    barriosGeoJson = barriosData;
    console.log('✅ CamerasLayer: Datos de barrios cargados');
  }

  /**
   * Getter para filtros
   */
  function getFilter(filterName) {
    return filters[filterName];
  }

  /**
   * Toggle de visibilidad
   */
  function toggle(visible) {
    isVisible = visible;

    if (visible) {
      applyFilters();
      
      if (!camerasLayer || !map.hasLayer(camerasLayer)) {
        applyFilters();
      }
    } else {
      if (camerasLayer && map.hasLayer(camerasLayer)) {
        map.removeLayer(camerasLayer);
      }
    }
  }

  /**
   * Limpiar filtros
   */
  function clearFilters() {
    filters.barrio = 'all';
    filters.type = 'all';
    filters.corridor = 'all';
    filters.cameraType = 'all';
    filters.globalBarrio = 'all';

    // Reset selects - con verificación de existencia
    const safeSetElement = (id, value) => {
      const el = document.getElementById(id);
      if (el) {
        el.value = value;
      }
    };

    safeSetElement('barrio-cameras-filter', 'all');
    safeSetElement('type-cameras-filter', 'all');
    safeSetElement('corridor-cameras-filter', 'all');
    safeSetElement('camera-type-filter', 'all');

    applyFilters();
  }

  // API pública
  return {
    init,
    load: loadCameras,
    loadFromGeoJson: loadCamerasFromGeoJson,
    applyFilters,
    setFilter,
    getFilter,
    setBarriosGeoJson,
    toggle,
    clearFilters,
    getFiltered: () => filteredCameras,
    getAll: () => camerasData
  };
})();
