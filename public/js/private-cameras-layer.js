// ====================================================
// MÓDULO: Carga y Filtrado de Cámaras Privadas
// ====================================================

const PrivateCamerasLayer = (() => {
  let privateCamerasData = [];
  let filteredPrivateCameras = [];
  let privateCamerasLayer = null;
  let map = null;
  let isVisible = false;
  let barriosGeoJson = null; // Para filtrado geográfico

  // Color para cámaras privadas
  const privateColor = '#FF6B9D'; // Rosa/Magenta

  // Filtros activos
  const filters = {
    globalBarrio: 'all',  // Filtro global de barrio
    name: ''
  };

  /**
   * Inicializa el módulo
   */
  function init(leafletMap) {
    map = leafletMap;
    console.log('✅ PrivateCamerasLayer inicializado');
  }

  /**
   * Carga las cámaras privadas desde GeoJSON
   */
  /**
   * Carga las cámaras privadas desde GeoJSON (para datos importados/data URLs)
   */
  function loadPrivateCamerasFromGeoJson(geojson) {
    try {
      privateCamerasData = geojson.features || [];
      
      console.log(`✅ Cargadas ${privateCamerasData.length} cámaras privadas desde GeoJSON`);
      
      // Renderizar cámaras
      applyFilters();
      
      return privateCamerasData;
    } catch (error) {
      console.error('❌ Error cargando cámaras privadas desde GeoJSON:', error);
      return [];
    }
  }

  async function loadPrivateCameras(geojsonPath) {
    try {
      const response = await fetch(geojsonPath);
      const geojson = await response.json();
      privateCamerasData = geojson.features || [];
      
      console.log(`✅ Cargadas ${privateCamerasData.length} cámaras privadas`);
      
      return privateCamerasData;
    } catch (error) {
      console.error('❌ Error cargando cámaras privadas:', error);
      return [];
    }
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
   * Aplica los filtros y renderiza las cámaras privadas
   */
  function applyFilters() {
    filteredPrivateCameras = privateCamerasData.filter(feature => {
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

      // Filtro por nombre
      if (filters.name && !props.name.toLowerCase().includes(filters.name.toLowerCase())) {
        return false;
      }

      return true;
    });

    renderPrivateCameras();
    updateCount();

    console.log(`🎥 ${filteredPrivateCameras.length} cámaras privadas después de filtros`);
  }

  /**
   * Renderiza las cámaras privadas en el mapa
   */
  function renderPrivateCameras() {
    // Limpiar capa anterior
    if (privateCamerasLayer && map.hasLayer(privateCamerasLayer)) {
      map.removeLayer(privateCamerasLayer);
    }

    // Crear grupo sin clustering
    privateCamerasLayer = L.featureGroup();

    // Crear icono para cámaras privadas
    const createPrivateCameraIcon = () => {
      return L.divIcon({
        html: `<div style="
          background: ${privateColor};
          color: white;
          border-radius: 50%;
          width: 24px;
          height: 24px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 12px;
          font-weight: bold;
          border: 2px solid white;
          box-shadow: 0 2px 4px rgba(0,0,0,0.3);
        ">
          🔒
        </div>`,
        iconSize: [24, 24],
        className: 'private-camera-icon'
      });
    };

    // Agregar marcadores
    filteredPrivateCameras.forEach(feature => {
      const props = feature.properties;
      const coords = feature.geometry.coordinates;
      const lat = coords[1];
      const lon = coords[0];

      const icon = createPrivateCameraIcon();
      const marker = L.marker([lat, lon], { icon });

      // Crear popup
      let popupContent = `
        <div style="font-size: 12px; max-width: 250px;">
          <strong>🔒 Cámara Privada</strong><br>
          <strong>📍 ${props.name || 'Sin nombre'}</strong><br>
      `;

      if (props.description) {
        popupContent += `<small>${props.description}</small><br>`;
      }

      if (props.camera_type) {
        popupContent += `<small>Tipo: ${props.camera_type}</small><br>`;
      }

      popupContent += '</div>';

      marker.bindPopup(popupContent);
      privateCamerasLayer.addLayer(marker);
    });

    // Agregar capa al mapa
    if (isVisible) {
      map.addLayer(privateCamerasLayer);
    }
  }

  /**
   * Actualiza el contador de cámaras privadas
   */
  function updateCount() {
    const countSpan = document.getElementById('total-private-cameras-count');
    if (countSpan) {
      countSpan.textContent = filteredPrivateCameras.length;
    }
  }

  /**
   * Setter para datos de barrios
   */
  function setBarriosGeoJson(barriosData) {
    barriosGeoJson = barriosData;
    console.log('✅ PrivateCamerasLayer: Datos de barrios cargados');
  }

  /**
   * Getter de filtro
   */
  function getFilter(filterName) {
    return filters[filterName];
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
   * Toggle de visibilidad
   */
  function toggle(visible) {
    isVisible = visible;

    if (visible) {
      applyFilters();
      
      if (!privateCamerasLayer || !map.hasLayer(privateCamerasLayer)) {
        applyFilters();
      }
    } else {
      if (privateCamerasLayer && map.hasLayer(privateCamerasLayer)) {
        map.removeLayer(privateCamerasLayer);
      }
    }
  }

  /**
   * Limpiar filtros
   */
  function clearFilters() {
    filters.name = '';
    filters.globalBarrio = 'all';

    // Reset input - con verificación de existencia
    const safeSetElement = (id, value) => {
      const el = document.getElementById(id);
      if (el) {
        el.value = value;
      }
    };

    safeSetElement('private-camera-name-filter', '');

    applyFilters();
  }

  // API pública
  return {
    init,
    load: loadPrivateCameras,
    loadFromGeoJson: loadPrivateCamerasFromGeoJson,
    applyFilters,
    setFilter,
    getFilter,
    setBarriosGeoJson,
    toggle,
    clearFilters,
    getFiltered: () => filteredPrivateCameras,
    getAll: () => privateCamerasData
  };
})();
