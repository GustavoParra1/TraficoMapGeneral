// ====================================================
// MÓDULO: Carga y Filtrado de Semáforos
// ====================================================

const SemaforosLayer = (() => {
  let semaforosData = [];
  let filteredSemaforos = [];
  let semaforosLayer = null;
  let map = null;
  let isVisible = false;

  // Color para semáforos
  const semaforoColor = '#FFD700'; // Dorado/Amarillo

  // Filtros activos
  const filters = {
    globalBarrio: 'all',
    name: ''
  };

  /**
   * Inicializa el módulo
   */
  function init(leafletMap) {
    map = leafletMap;
    console.log('✅ SemaforosLayer inicializado');
  }

  /**
   * Carga los semáforos desde GeoJSON (para datos importados/data URLs)
   */
  function loadSemaforosFromGeoJson(geojson) {
    try {
      semaforosData = geojson.features || [];
      
      console.log(`✅ Cargados ${semaforosData.length} semáforos desde GeoJSON`);
      
      // Renderizar semáforos
      applyFilters();
      
      return semaforosData;
    } catch (error) {
      console.error('❌ Error cargando semáforos desde GeoJSON:', error);
      return [];
    }
  }

  async function loadSemaforos(geojsonPath) {
    try {
      const response = await fetch(geojsonPath);
      const geojson = await response.json();
      semaforosData = geojson.features || [];
      
      console.log(`✅ Cargados ${semaforosData.length} semáforos`);
      
      return semaforosData;
    } catch (error) {
      console.error('❌ Error cargando semáforos:', error);
      return [];
    }
  }

  /**
   * Aplica los filtros y renderiza los semáforos
   */
  function applyFilters() {
    filteredSemaforos = semaforosData.filter(feature => {
      const props = feature.properties;

      // Filtro por nombre
      if (filters.name && !props.name?.toLowerCase().includes(filters.name.toLowerCase())) {
        return false;
      }

      return true;
    });

    renderSemaforos();
    updateCount();

    console.log(`🚦 ${filteredSemaforos.length} semáforos después de filtros`);
  }

  /**
   * Renderiza los semáforos en el mapa
   */
  function renderSemaforos() {
    // Limpiar capa anterior
    if (semaforosLayer && map.hasLayer(semaforosLayer)) {
      map.removeLayer(semaforosLayer);
    }

    // Crear grupo sin clustering
    semaforosLayer = L.featureGroup();

    // Crear icono para semáforos
    const createSemaforoIcon = () => {
      return L.divIcon({
        html: `<div style="
          background: ${semaforoColor};
          color: #333;
          border-radius: 50%;
          width: 28px;
          height: 28px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 14px;
          font-weight: bold;
          border: 2px solid #333;
          box-shadow: 0 2px 4px rgba(0,0,0,0.3);
        ">
          🚦
        </div>`,
        iconSize: [28, 28],
        className: 'semaforo-icon'
      });
    };

    // Normalizar propiedades
    const normalizeSemaforoProps = (props) => {
      const normalized = { ...props };
      
      // Mapear nombre (buscar: name, nombre, ubicacion, descripcion)
      if (!normalized.name) {
        if (normalized.nombre) normalized.name = normalized.nombre;
        else if (normalized.ubicacion) normalized.name = normalized.ubicacion;
        else if (normalized.descripcion) normalized.name = normalized.descripcion;
      }
      
      // Mapear dirección
      if (!normalized.address) {
        if (normalized.ubicacion) normalized.address = normalized.ubicacion;
        else if (normalized.direccion) normalized.address = normalized.direccion;
        else if (normalized.dir) normalized.address = normalized.dir;
      }
      
      // Mapear tipo
      if (!normalized.tipo) {
        if (normalized.type) normalized.tipo = normalized.type;
      }
      
      return normalized;
    };

    // Agregar marcadores
    filteredSemaforos.forEach(feature => {
      const props = normalizeSemaforoProps(feature.properties);
      const coords = feature.geometry.coordinates;
      const lat = coords[1];
      const lon = coords[0];

      const icon = createSemaforoIcon();
      const marker = L.marker([lat, lon], { icon });

      // Crear popup
      let popupContent = `
        <div style="font-size: 12px; max-width: 250px;">
          <strong>🚦 Semáforo</strong><br>
          <strong>📍 ${props.name || 'Sin nombre'}</strong><br>
      `;

      if (props.address) {
        popupContent += `<small>📍 ${props.address}</small><br>`;
      }

      if (props.tipo) {
        popupContent += `<small>Tipo: ${props.tipo}</small><br>`;
      }

      popupContent += '</div>';

      marker.bindPopup(popupContent);
      semaforosLayer.addLayer(marker);
    });

    // Agregar capa al mapa
    if (isVisible) {
      map.addLayer(semaforosLayer);
    }
  }

  /**
   * Actualiza el contador de semáforos
   */
  function updateCount() {
    const countSpan = document.getElementById('total-semaforos-count');
    if (countSpan) {
      countSpan.textContent = filteredSemaforos.length;
    }
  }

  /**
   * Alternar visibilidad
   */
  function toggle(visible) {
    isVisible = visible;
    if (!semaforosLayer) return;

    if (isVisible) {
      map.addLayer(semaforosLayer);
    } else {
      if (map.hasLayer(semaforosLayer)) {
        map.removeLayer(semaforosLayer);
      }
    }
  }

  /**
   * Limpia los filtros
   */
  function clearFilters() {
    filters.globalBarrio = 'all';
    filters.name = '';
  }

  /**
   * Hace públicas las funciones
   */
  return {
    init,
    load: loadSemaforos,
    loadFromGeoJson: loadSemaforosFromGeoJson,
    applyFilters,
    toggle,
    clearFilters,
    getSemaforosData: () => semaforosData,
    getFilteredSemaforos: () => filteredSemaforos
  };
})();
