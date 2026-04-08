/**
 * Heatmap Layer - Mapa de Calor de Siniestros
 * Visualiza la densidad de siniestros con un mapa de calor
 */

const heatmapLayer = (() => {
  let heatmapInstance = null;
  let visible = false;
  let sinistrosData = [];

  /**
   * Cargar datos GeoJSON de siniestros
   */
  const loadSiniestros = async (geojsonPath) => {
    try {
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
    if (sinistrosData.length === 0) return [];
    
    // Convertir features a formato [lat, lng, intensity]
    // intensity es 0.5 por defecto (todas las ubicaciones tienen igual peso)
    return sinistrosData.map(item => {
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
    
    if (shouldShow) {
      // Solo renderizar si hay datos
      if (sinistrosData.length === 0) {
        console.log('🔥 Heatmap: Cargando datos de siniestros...');
        loadSiniestros('data/siniestros_con_ubicacion.geojson').then(() => {
          render();
        });
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
    console.log('🔥 Heatmap Layer inicializado - precargando datos de siniestros...');
    // Precargar datos en background
    loadSiniestros('data/siniestros_con_ubicacion.geojson');
  };

  /**
   * Adjuntar event listener al checkbox (llamar después de que el checkbox se crea en el DOM)
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
    render,
    attachCheckboxListener,
    isVisible: () => visible
  };
})();
