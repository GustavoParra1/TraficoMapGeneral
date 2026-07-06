// ====================================================
// MÓDULO: Carga y Filtrado de Semáforos
// ====================================================

const SemaforosLayer = (() => {
  let semaforosData = [];
  let filteredSemaforos = [];
  let semaforosLayer = null;
  let map = null;
  let isVisible = false;
  let barriosGeoJson = null; // Para filtrado geográfico por barrio

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
      
      console.log(`✅ Cargados ${semaforosData.length} semáforos`);
      
      // Renderizar semáforos
      applyFilters();
      
      return semaforosData;
    } catch (error) {
      console.error('❌ Error cargando semáforos desde GeoJSON:', error);
      return [];
    }
  }

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
    
    return {
      type: 'FeatureCollection',
      features: features
    };
  };

  async function loadSemaforos(geojsonPath) {
    try {
      const response = await fetch(geojsonPath);
      
      let geojson;
      if (geojsonPath.endsWith('.csv')) {
        const csvText = await response.text();
        geojson = parseCSVtoGeoJSON(csvText);
      } else {
        geojson = await response.json();
      }
      
      semaforosData = geojson.features || [];
      
      console.log(`✅ Cargados ${semaforosData.length} semáforos`);
      
      // Renderizar semáforos después de cargar
      applyFilters();
      
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
    filteredSemaforos = semaforosData.filter((feature, idx) => {
      const props = feature.properties;
      const coords = feature.geometry?.coordinates;

      // Filtro por nombre
      if (filters.name && !props.name?.toLowerCase().includes(filters.name.toLowerCase())) {
        return false;
      }

      // Filtro por barrio (si está seteado)
      if (filters.globalBarrio !== 'all' && barriosGeoJson) {
        const barrio = getBarrioForPoint(coords);
        if (barrio !== filters.globalBarrio) {
          return false;
        }
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

    // Crear icono para semáforos (SVG limpio y discreto)
    const createSemaforoIcon = () => {
      return L.divIcon({
        html: `<svg width="14" height="22" viewBox="0 0 14 22" style="filter: drop-shadow(0px 1px 2px rgba(0,0,0,0.3));">
          <rect x="3" y="2" width="8" height="18" rx="4" fill="#444" stroke="none"/>
          <circle cx="7" cy="6" r="3" fill="#ff4444"/>
          <circle cx="7" cy="11" r="3" fill="#ffdd44"/>
          <circle cx="7" cy="16" r="3" fill="#44ff44"/>
        </svg>`,
        iconSize: [14, 22],
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
      const coords = feature.geometry?.coordinates;
      
      if (!coords || coords.length < 2) {
        console.warn('⚠️ Semáforo sin coordenadas válidas:', feature);
        return;
      }
      
      const lat = coords[1];
      const lon = coords[0];

      const icon = createSemaforoIcon();
      const marker = L.marker([lat, lon], { icon });

      // Crear popup
      let popupContent = `
        <div style="font-size: 12px; max-width: 250px;">
          <strong>🚦 Semáforo #${feature.properties.id || 'N/A'}</strong><br>
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
      
      // Agregar tooltip con el número de semáforo
      marker.bindTooltip(`Semáforo #${feature.properties.id || 'N/A'}`, {
        permanent: false,
        direction: 'top',
        offset: [0, -10]
      });
      
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
   * Verifica si un punto [lng, lat] está dentro de un polígono
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
      for (let polyIdx = 0; polyIdx < polygon.coordinates.length; polyIdx++) {
        const poly = polygon.coordinates[polyIdx];
        if (!poly || !poly[0]) continue;
        
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
   * Obtiene el barrio que contiene un punto [lng, lat]
   */
  function getBarrioForPoint(point) {
    if (!barriosGeoJson || !point) {
      return null;
    }
    
    for (const feature of barriosGeoJson.features) {
      const geometry = feature.geometry;
      if (pointInPolygon(point, geometry)) {
        return feature.properties?.nombre || feature.properties?.soc_fomen || null;
      }
    }
    
    return null;
  }

  /**
   * Setter para filtro
   */
  function setFilter(filterName, value) {
    if (filters.hasOwnProperty(filterName)) {
      filters[filterName] = value;
      applyFilters();
    }
  }

  /**
   * Setter para barrios GeoJSON
   */
  function setBarriosGeoJson(barrios) {
    barriosGeoJson = barrios;
    console.log(`✅ SemaforosLayer: ${barrios?.features?.length || 0} barrios cargados`);
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
    setFilter,
    setBarriosGeoJson,
    getSemaforosData: () => semaforosData,
    getFilteredSemaforos: () => filteredSemaforos
  };
})();
