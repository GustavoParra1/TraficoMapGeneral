/**
 * Heatmap Layer - Mapa de Calor de Siniestros
 * Visualiza la densidad de siniestros con un mapa de calor
 */

const heatmapLayer = (() => {
  let heatmapInstance = null;
  let visible = false;
  let sinistrosData = [];
  let filteredSinistrosData = [];
  let currentSiniestrosPath = null;
  let barriosGeoJson = null;
  let filters = {
    globalBarrio: 'all'
  };

  /**
   * Cargar datos de siniestros (puede ser GeoJSON o CSV)
   */
  const loadSiniestros = async (geojsonPath) => {
    try {
      currentSiniestrosPath = geojsonPath;
      const cacheBustUrl = geojsonPath + '?t=' + Date.now();
      const response = await fetch(cacheBustUrl);
      const geojson = await response.json();
      
      if (geojson.features) {
        sinistrosData = geojson.features.map(feature => ({
          coords: feature.geometry?.coordinates || [0, 0],
          properties: feature.properties || {}
        }));
        
        console.log(`🔥 Heatmap: ${sinistrosData.length} siniestros cargados`);
        
        // Si el mapa de calor ya está visible, regenerar
        if (visible && heatmapInstance) {
          render();
        }
      }
    } catch (error) {
      console.error('❌ Error cargando datos para heatmap:', error);
    }
  };

  /**
   * Generar datos para el heatmap (coordenadas con intensidad)
   */
  const generateHeatmapData = () => {
    const dataToUse = (filters.globalBarrio !== 'all') ? filteredSinistrosData : sinistrosData;
    
    if (dataToUse.length === 0) return [];
    
    // Convertir features a formato [lat, lng, intensity]
    // intensity es 0.5 por defecto (todas las ubicaciones tienen igual peso)
    return dataToUse.map(item => {
      const [lng, lat] = item.coords;
      return [lat, lng, 0.5]; // Formato: [lat, lng, intensidad]
    });
  };

  /**
   * Renderizar heatmap
   */
  const render = () => {
    if (!map) return;
    
    const heatmapData = generateHeatmapData();
    
    if (heatmapData.length === 0) {
      console.warn('⚠️ No hay datos para mostrar el heatmap');
      return;
    }
    
    // Remover heatmap anterior si existe
    if (heatmapInstance) {
      map.removeLayer(heatmapInstance);
    }
    
    // Crear nuevo heatmap
    heatmapInstance = L.heatLayer(heatmapData, {
      radius: 25,
      blur: 20,
      maxZoom: 17,
      gradient: {
        0.0: '#1f77b4',  // Azul (baja densidad)
        0.25: '#2ca02c', // Verde
        0.5: '#ffdd57',  // Amarillo
        0.75: '#ff7f0e', // Naranja
        1.0: '#d62728'   // Rojo (alta densidad)
      }
    });
    
    // Agregar al mapa
    map.addLayer(heatmapInstance);
    console.log('✅ Heatmap renderizado');
  };

  /**
   * Toggle (mostrar/ocultar) heatmap
   */
  const toggle = (shouldShow) => {
    console.log(`🔥 Heatmap toggle: shouldShow=${shouldShow}, visible=${visible}`);
    visible = shouldShow;
    
    // Inicializar datos filtrados si no lo están
    if (filteredSinistrosData.length === 0 && sinistrosData.length > 0) {
      filteredSinistrosData = sinistrosData;
    }
    
    if (shouldShow) {
      // Solo renderizar si hay datos
      if (sinistrosData.length === 0) {
        console.log('🔥 Heatmap: Esperando datos de siniestros...');
      } else {
        console.log(`🔥 Heatmap: Usando ${sinistrosData.length} siniestros ya cargados`);
        render();
      }
    } else {
      // Remover heatmap
      if (heatmapInstance) {
        map.removeLayer(heatmapInstance);
        heatmapInstance = null;
      }
      console.log('🔥 Heatmap ocultado');
    }
  };

  /**
   * Inicializar
   */
  const init = () => {
    console.log('🔥 Heatmap Layer inicializado');
  };

  /**
   * Actualizar datos de siniestros (llamado cuando se carga una ciudad)
   */
  const setData = (geojsonData) => {
    if (geojsonData && geojsonData.features) {
      sinistrosData = geojsonData.features.map(feature => ({
        coords: feature.geometry?.coordinates || [0, 0],
        properties: feature.properties || {}
      }));
      
      // Inicializar datos filtrados igual a los datos originales
      filteredSinistrosData = sinistrosData;
      
      // Resetear filtros cuando se cargan nuevos datos
      filters.globalBarrio = 'all';
      
      console.log(`🔥 Heatmap: ${sinistrosData.length} siniestros desde setData`);
      
      // Si ya está visible, renderizar
      if (visible) {
        render();
      }
    }
  };

  /**
   * Verifica si un punto [lng, lat] está dentro de un polígono
   */
  const pointInPolygon = (point, polygon) => {
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
        let insideCurrent = false;
        
        for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
          const xi = poly[i][0], yi = poly[i][1];
          const xj = poly[j][0], yj = poly[j][1];
          
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
  };

  /**
   * Obtiene el barrio que contiene un punto [lng, lat]
   */
  const getBarrioForPoint = (point) => {
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
  };

  /**
   * Aplica los filtros de barrio al heatmap
   */
  const applyFilters = () => {
    if (filters.globalBarrio === 'all' || !barriosGeoJson) {
      filteredSinistrosData = sinistrosData;
    } else {
      filteredSinistrosData = sinistrosData.filter(item => {
        const barrio = getBarrioForPoint(item.coords);
        return barrio === filters.globalBarrio;
      });
    }

    // Renderizar si está visible
    if (visible && heatmapInstance) {
      render();
    }
  };

  /**
   * Setter para filtro
   */
  const setFilter = (filterName, value) => {
    if (filters.hasOwnProperty(filterName)) {
      filters[filterName] = value;
      applyFilters();
    }
  };

  /**
   * Setter para barrios GeoJSON
   */
  const setBarriosGeoJson = (barrios) => {
    barriosGeoJson = barrios;
  };

  /**
   * Adjuntar event listener al checkbox
   */
  const attachCheckboxListener = () => {
    const checkbox = document.getElementById('heatmap-checkbox');
    if (checkbox) {
      console.log('🔥 Adjuntando listener al checkbox de heatmap');
      checkbox.addEventListener('change', (e) => {
        console.log(`🔥 Checkbox changed: ${e.target.checked}`);
        toggle(e.target.checked);
      });
    } else {
      console.warn('⚠️ No se encontró el checkbox heatmap-checkbox');
    }
  };

  // API pública
  return {
    init,
    toggle,
    loadSiniestros,
    setData,
    render,
    attachCheckboxListener,
    setFilter,
    setBarriosGeoJson,
    isVisible: () => visible
  };
})();
