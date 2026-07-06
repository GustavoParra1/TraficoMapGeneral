// ====================================
// MÓDULO DE ESCUELAS Y COLEGIOS
// ====================================

const ColegiosLayer = (() => {
  let map = null;
  let layerGroup = null;
  let allData = [];
  let visibleData = [];
  let isVisible = false;

  const init = (mapInstance) => {
    map = mapInstance;
    layerGroup = L.layerGroup().addTo(map);
    console.log('✅ ColegiosLayer inicializado');
  };

  const load = async (filePath) => {
    try {
      const response = await fetch(filePath + '?t=' + Date.now());
      const geoJson = await response.json();
      allData = geoJson.features || [];
      visibleData = [...allData];
      console.log(`✅ Cargadas ${allData.length} escuelas/colegios`);
      
      // Actualizar contador
      const countElement = document.getElementById('total-colegios-count');
      if (countElement) {
        countElement.textContent = allData.length;
      }
    } catch (error) {
      console.error('❌ Error cargando escuelas:', error);
    }
  };

  const loadFromGeoJson = (geoJson) => {
    allData = geoJson.features || [];
    visibleData = [...allData];
    console.log(`✅ Cargadas ${allData.length} escuelas/colegios desde GeoJSON`);
    
    // Actualizar contador
    const countElement = document.getElementById('total-colegios-count');
    if (countElement) {
      countElement.textContent = allData.length;
    }
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
    
    // Crear icono representativo de escuela
    const schoolIcon = L.divIcon({
      html: `<div style="background: linear-gradient(135deg, #FF6B6B 0%, #FF8E53 100%); border-radius: 50%; width: 32px; height: 32px; display: flex; align-items: center; justify-content: center; color: white; font-weight: bold; font-size: 18px; box-shadow: 0 2px 4px rgba(0,0,0,0.3); border: 2px solid white;">📚</div>`,
      iconSize: [32, 32],
      className: 'school-icon'
    });
    
    visibleData.forEach((feature) => {
      const coords = feature.geometry.coordinates;
      const lat = coords[1];
      const lng = coords[0];
      const props = feature.properties;

      const marker = L.marker([lat, lng], { icon: schoolIcon });

      const popupContent = `
        <div style="font-size: 12px; max-width: 200px;">
          <strong style="color: #8B4513;">${props.Name || 'Escuela'}</strong><br>
          ${props.description ? `<em>${props.description}</em><br>` : ''}
          ${props.address ? `📍 ${props.address}<br>` : ''}
          ${props.barrio ? `🏘️ ${props.barrio}` : ''}
        </div>
      `;

      marker.bindPopup(popupContent);
      marker.addTo(layerGroup);
    });

    console.log(`🏫 ${visibleData.length} escuelas renderizadas`);
  };

  const clear = () => {
    layerGroup.clearLayers();
  };

  const clearFilters = () => {
    visibleData = [...allData];
  };

  const setBarriosGeoJson = (bariosGeoJson) => {
    // Guardar referencias a barrios para filtrado
    console.log('🏫 ColegiosLayer: Datos de barrios cargados');
  };

  const setFilter = (filterType, filterValue) => {
    if (filterType === 'globalBarrio') {
      if (filterValue === 'all') {
        visibleData = [...allData];
      } else {
        visibleData = allData.filter(f => 
          f.properties.barrio && f.properties.barrio.toLowerCase().includes(filterValue.toLowerCase())
        );
      }
      
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
