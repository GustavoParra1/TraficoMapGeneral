// ====================================
// MÓDULO DE CORREDORES ESCOLARES
// ====================================

const CorredoresLayer = (() => {
  let map = null;
  let layerGroup = null;
  let allData = [];
  let visibleData = [];
  let isVisible = false;

  const init = (mapInstance) => {
    map = mapInstance;
    layerGroup = L.layerGroup().addTo(map);
    console.log('✅ CorredoresLayer inicializado');
  };

  const load = async (filePath) => {
    try {
      const response = await fetch(filePath + '?t=' + Date.now());
      const geoJson = await response.json();
      allData = geoJson.features || [];
      visibleData = [...allData];
      console.log(`✅ Cargados ${allData.length} corredores escolares`);
    } catch (error) {
      console.error('❌ Error cargando corredores:', error);
    }
  };

  const loadFromGeoJson = (geoJson) => {
    allData = geoJson.features || [];
    visibleData = [...allData];
    console.log(`✅ Cargados ${allData.length} corredores escolares desde GeoJSON`);
  };

  const toggle = (visible) => {
    isVisible = visible;
    if (visible) {
      render();
    } else {
      clear();
    }
  };

  const render = () => {
    clear();
    
    visibleData.forEach((feature) => {
      let layer;
      
      if (feature.geometry.type === 'LineString') {
        const coords = feature.geometry.coordinates.map(c => [c[1], c[0]]);
        layer = L.polyline(coords, {
          color: '#8B00FF', // Púrpura vibrante para corredores
          weight: 4,
          opacity: 0.8
        });
      } else if (feature.geometry.type === 'Polygon') {
        const coords = feature.geometry.coordinates[0].map(c => [c[1], c[0]]);
        layer = L.polygon(coords, {
          color: '#8B00FF',
          weight: 3,
          opacity: 0.7,
          fillColor: '#8B00FF',
          fillOpacity: 0.15
        });
      }
      
      if (layer) {
        const props = feature.properties;
        const popupContent = `
          <div style="font-size: 12px; max-width: 200px;">
            <strong style="color: #8B00FF;">${props.Name || 'Corredor'}</strong><br>
            ${props.description ? `<em>${props.description}</em>` : ''}
          </div>
        `;
        
        layer.bindPopup(popupContent);
        layer.addTo(layerGroup);
      }
    });

    console.log(`🚌 ${visibleData.length} corredores renderizados`);
  };

  const clear = () => {
    layerGroup.clearLayers();
  };

  const clearFilters = () => {
    visibleData = [...allData];
  };

  const setBarriosGeoJson = (bariosGeoJson) => {
    // Guardar referencias a barrios para filtrado
    console.log('🚌 CorredoresLayer: Datos de barrios cargados');
  };

  const setFilter = (filterType, filterValue) => {
    if (filterType === 'globalBarrio') {
      // Los corredores no tienen barrio, así que mostrar todos
      visibleData = [...allData];
      
      if (isVisible) {
        render();
      }
    }
  };

  const getAll = () => allData;

  return {
    init,
    load,
    loadFromGeoJson,
    toggle,
    render,
    clear,
    clearFilters,
    setBarriosGeoJson,
    setFilter,
    getAll
  };
})();
