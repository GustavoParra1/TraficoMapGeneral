/**
 * 📊 AFOROS LAYER: Visualización de datos de flujo vehicular por ubicación
 * Soporta múltiples ciudades, años, horas y tipos de vehículos
 */

const AforosLayer = (() => {
  let map = null;
  let aforosData = [];
  let aforosMarkers = [];
  let markerClusterGroup = null;
  let filteredData = [];
  
  // Estado de filtros
  let activeFilters = {
    year: 'all',
    month: 'all',
    dayOfWeek: 'all',
    hourFrom: 'all',
    hourTo: 'all',
    vehicleType: 'all'
  };

  /**
   * Inicializa la capa de aforos
   */
  const init = (mapInstance) => {
    map = mapInstance;
    console.log('🚗 AforosLayer inicializado');
    console.log('🚗 Map instance validado:', map && map.getZoom !== undefined ? '✅ VÁLIDO' : '❌ INVÁLIDO');
  };

  /**
   * Carga datos CSV de aforos y los convierte a objetos
   */
  const loadFromCSV = async (csvPath) => {
    try {
      const response = await fetch(csvPath);
      const text = await response.text();
      const lines = text.split('\n').filter(line => line.trim());
      
      // Parsear CSV
      const headers = lines[0].split(',').map(h => h.trim());
      aforosData = [];
      
      for (let i = 1; i < lines.length; i++) {
        const parts = lines[i].split(',').map(p => p.trim());
        if (parts.length < headers.length) continue;
        
        const record = {
          cameraId: parts[0],
          direccion: parts[1],
          fecha: parts[2],
          dia: parts[3],
          hora: parts[4],
          vehicleType: parts[5],
          total: parseInt(parts[6]) || 0
        };
        
        // Parsear fecha (MM/DD/YYYY)
        const [month, day, year] = record.fecha.split('/');
        record.dateObj = new Date(year, month - 1, day);
        record.year = year;
        record.month = month;
        
        aforosData.push(record);
      }
      
      console.log(`✅ ${aforosData.length} registros de aforos cargados`);
      
      // Extraer años únicos para UI
      const uniqueYears = [...new Set(aforosData.map(r => r.year))].sort();
      console.log(`   Años disponibles: ${uniqueYears.join(', ')}`);
      
      // Inicializar filteredData con todos los registros
      applyFilters({});
      console.log(`📊 filteredData inicializado con ${filteredData.length} registros`);
      
      return true;
    } catch (error) {
      console.error('❌ Error cargando aforos:', error);
      return false;
    }
  };

  /**
   * Obtiene ubicaciones únicas de aforos con coordenadas aproximadas
   */
  const getUniqueLocations = () => {
    const locations = {};
    
    aforosData.forEach(record => {
      if (!locations[record.direccion]) {
        locations[record.direccion] = {
          direccion: record.direccion,
          total: 0,
          count: 0,
          byType: {},
          records: []
        };
      }
      
      locations[record.direccion].total += record.total;
      locations[record.direccion].count++;
      locations[record.direccion].records.push(record);
      
      // Agrupar por tipo de vehículo
      if (!locations[record.direccion].byType[record.vehicleType]) {
        locations[record.direccion].byType[record.vehicleType] = 0;
      }
      locations[record.direccion].byType[record.vehicleType] += record.total;
    });
    
    return locations;
  };

  /**
   * Aplica filtros y retorna datos filtrados
   */
  const applyFilters = (filters) => {
    console.log('📊 applyFilters() llamado con:', filters);
    
    activeFilters = { ...activeFilters, ...filters };
    console.log('📊 activeFilters después de merge:', activeFilters);
    console.log('📊 aforosData.length antes de filtrar:', aforosData.length);
    
    filteredData = aforosData.filter(record => {
      // year: null o 'all' = mostrar todo, valor específico = filtrar
      if (activeFilters.year !== null && activeFilters.year !== 'all') {
        const recordYear = parseInt(record.year);
        if (recordYear !== activeFilters.year) {
          return false;
        }
      }
      
      if (activeFilters.month !== null && activeFilters.month !== 'all') {
        const recordMonth = parseInt(record.month);
        if (recordMonth !== activeFilters.month) {
          return false;
        }
      }
      
      if (activeFilters.dayOfWeek !== null && activeFilters.dayOfWeek !== 'all' && record.dia !== activeFilters.dayOfWeek) {
        return false;
      }
      
      if (activeFilters.vehicleType !== null && activeFilters.vehicleType !== 'all' && record.vehicleType !== activeFilters.vehicleType) {
        return false;
      }
      
      // Filtro por rango de horas
      if ((activeFilters.hourFrom !== null && activeFilters.hourFrom !== 'all') || (activeFilters.hourTo !== null && activeFilters.hourTo !== 'all')) {
        const horaStart = (activeFilters.hourFrom && activeFilters.hourFrom !== 'all') ? parseInt(activeFilters.hourFrom) : 0;
        const horaEnd = (activeFilters.hourTo && activeFilters.hourTo !== 'all') ? parseInt(activeFilters.hourTo) : 23;
        const recordHora = parseInt(record.hora.split(' a ')[0]);
        
        if (recordHora < horaStart || recordHora > horaEnd) {
          return false;
        }
      }
      
      return true;
    });
    
    console.log(`📊 Filtros aplicados: ${filteredData.length} registros (desde ${aforosData.length})`);
    return filteredData;
  };

  /**
   * Agrupa datos filtrados por ubicación para visualización
   */
  const getAggregatedData = () => {
    const aggregated = {};
    
    filteredData.forEach(record => {
      if (!aggregated[record.direccion]) {
        aggregated[record.direccion] = {
          direccion: record.direccion,
          total: 0,
          count: 0,
          byType: {}
        };
      }
      
      aggregated[record.direccion].total += record.total;
      aggregated[record.direccion].count++;
      
      if (!aggregated[record.direccion].byType[record.vehicleType]) {
        aggregated[record.direccion].byType[record.vehicleType] = 0;
      }
      aggregated[record.direccion].byType[record.vehicleType] += record.total;
    });
    
    return aggregated;
  };

  /**
   * Genera coordenadas aproximadas usando hash de la dirección
   * Para Mar del Plata: centro aproximado -38.0, -57.55
   */
  const getCoordinatesForAddress = (direccion) => {
    // Centro aproximado de Mar del Plata
    const centerLat = -38.0;
    const centerLng = -57.55;
    const radius = 0.05; // ~5 km de variación
    
    // Generar hash simple de la dirección (para reproducibilidad)
    let hash = 0;
    for (let i = 0; i < direccion.length; i++) {
      hash = ((hash << 5) - hash) + direccion.charCodeAt(i);
      hash = hash & hash; // Convert to 32bit integer
    }
    
    // Usar el hash para generar coordenadas determinísticas pero distribuidas
    const seed1 = (Math.sin(hash * 0.001) * 10000) % 1;
    const seed2 = (Math.cos(hash * 0.002) * 10000) % 1;
    
    return {
      lat: centerLat + (seed1 - 0.5) * radius * 2,
      lng: centerLng + (seed2 - 0.5) * radius * 2
    };
  };

  /**
   * Renderiza marcadores en el mapa
   * Versión simplificada sin geocoding en tiempo real
   */
  const renderMarkers = async (cityName) => {
    console.log(`🚗 renderMarkers() INICIADO para ciudad: ${cityName}`);
    console.log(`📊 aforosData.length: ${aforosData.length}, filteredData.length: ${filteredData.length}`);
    
    // Verificar que hay datos disponibles
    if (aforosData.length === 0) {
      console.warn('⚠️ No hay datos de aforos cargados aún. Esperando...');
      return;
    }
    
    if (!map) {
      console.error('❌ Mapa no inicializado en renderMarkers()');
      return;
    }
    
    console.log(`✅ Mapa disponible`);
    
    // Limpiar marcadores existentes
    clearMarkers();
    
    const aggregated = getAggregatedData();
    console.log(`📊 Datos agregados obtenidos - ${Object.keys(aggregated).length} ubicaciones únicas`);
    
    console.log(`🚗 Renderizando ${Object.keys(aggregated).length} ubicaciones de aforos`);
    
    let processedCount = 0;
    const maxTotal = Math.max(...Object.values(aggregated).map(d => d.total));
    
    for (const [direccion, data] of Object.entries(aggregated)) {
      try {
        // Obtener coordenadas sin geocoding
        const coords = getCoordinatesForAddress(direccion);
        
        // Calcular color basado en volumen total
        const intensity = (data.total / maxTotal) * 100;
        const color = getColorByIntensity(intensity);
        
        // Crear popup con información
        const popupHTML = createPopupHTML(data);
        
        // Crear marcador
        const marker = new google.maps.Marker({
          position: { lat: coords.lat, lng: coords.lng },
          map: map,
          title: direccion,
          icon: {
            path: google.maps.SymbolPath.CIRCLE,
            scale: 5 + (intensity / 20),
            fillColor: color,
            fillOpacity: 0.7,
            strokeColor: '#fff',
            strokeWeight: 2
          }
        });
        
        marker.addListener('click', () => {
          const infoWindow = new google.maps.InfoWindow({
            content: popupHTML
          });
          infoWindow.open(map, marker);
        });
        
        aforosMarkers.push(marker);
        processedCount++;
        
      } catch (error) {
        console.error(`❌ Error creando marcador para ${direccion}:`, error.message);
      }
    }
    
    console.log(`✅ ${processedCount} ubicaciones renderizadas en el mapa`);
  };

  /**
   * Crea HTML para popup de información de un punto de aforo
   */
  const createPopupHTML = (data) => {
    let html = `
      <div style="font-size: 12px; max-width: 250px;">
        <h4 style="margin: 0 0 8px 0; color: #0066ff;">${data.direccion}</h4>
        <div style="background: #f5f5f5; padding: 8px; border-radius: 4px; margin-bottom: 8px;">
          <div><strong>Total Vehículos:</strong> ${data.total.toLocaleString()}</div>
          <div><strong>Registros:</strong> ${data.count}</div>
          <div><strong>Promedio:</strong> ${Math.round(data.total / data.count)} vehículos</div>
        </div>
        <div style="border-top: 1px solid #ddd; padding-top: 8px;">
          <strong>Por Tipo:</strong><br>
    `;
    
    for (const [type, count] of Object.entries(data.byType)) {
      const percentage = ((count / data.total) * 100).toFixed(1);
      html += `<div>• ${type}: ${count} (${percentage}%)</div>`;
    }
    
    html += `</div></div>`;
    return html;
  };

  /**
   * Retorna color basado en intensidad de tráfico
   */
  const getColorByIntensity = (intensity) => {
    if (intensity >= 80) return '#d32f2f'; // Rojo - muy alto
    if (intensity >= 60) return '#f57c00'; // Naranja - alto
    if (intensity >= 40) return '#fbc02d'; // Amarillo - medio
    if (intensity >= 20) return '#689f38'; // Verde claro - bajo
    return '#4caf50'; // Verde - muy bajo
  };

  /**
   * Limpia todos los marcadores del mapa
   */
  const clearMarkers = () => {
    aforosMarkers.forEach(marker => marker.setMap(null));
    aforosMarkers = [];
  };

  /**
   * Obtiene estadísticas generales
   */
  const getStatistics = () => {
    if (filteredData.length === 0) {
      return {
        totalRecords: 0,
        totalVehicles: 0,
        averagePerRecord: 0,
        byVehicleType: {}
      };
    }
    
    const stats = {
      totalRecords: filteredData.length,
      totalVehicles: 0,
      byVehicleType: {},
      byHour: {},
      byDay: {},
      byYear: {}
    };
    
    filteredData.forEach(record => {
      stats.totalVehicles += record.total;
      
      // Por tipo
      if (!stats.byVehicleType[record.vehicleType]) {
        stats.byVehicleType[record.vehicleType] = 0;
      }
      stats.byVehicleType[record.vehicleType] += record.total;
      
      // Por hora
      if (!stats.byHour[record.hora]) {
        stats.byHour[record.hora] = 0;
      }
      stats.byHour[record.hora] += record.total;
      
      // Por día
      if (!stats.byDay[record.dia]) {
        stats.byDay[record.dia] = 0;
      }
      stats.byDay[record.dia] += record.total;
      
      // Por año
      if (!stats.byYear[record.year]) {
        stats.byYear[record.year] = 0;
      }
      stats.byYear[record.year] += record.total;
    });
    
    stats.averagePerRecord = Math.round(stats.totalVehicles / stats.totalRecords);
    
    return stats;
  };

  /**
   * Toggle de visibilidad
   */
  const toggle = (visible) => {
    aforosMarkers.forEach(marker => {
      marker.setVisible(visible);
    });
    console.log(`🚗 Aforos ${visible ? 'mostrados' : 'ocultados'}`);
  };

  /**
   * Obtiene metadatos para UI (años, horas, tipos de vehículos)
   */
  const getMetadata = () => {
    const metadata = {
      years: [...new Set(aforosData.map(r => r.year))].sort(),
      months: [...new Set(aforosData.map(r => r.month))].sort((a, b) => a - b),
      daysOfWeek: [...new Set(aforosData.map(r => r.dia))],
      vehicleTypes: [...new Set(aforosData.map(r => r.vehicleType))],
      hours: [...new Set(aforosData.map(r => r.hora))].sort(),
      locations: Object.keys(getUniqueLocations()).length
    };
    
    return metadata;
  };

  return {
    init,
    loadFromCSV,
    renderMarkers,
    applyFilters,
    getAggregatedData,
    getStatistics,
    getMetadata,
    toggle,
    clearMarkers,
    getUniqueLocations
  };
})();

console.log('✅ AforosLayer cargado');
