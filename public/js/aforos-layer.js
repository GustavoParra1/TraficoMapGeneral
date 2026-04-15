/**
 * 📊 AFOROS LAYER: Visualización de datos de flujo vehicular por ubicación
 * Integración con cámaras públicas para geolocalización real
 * Soporta múltiples ciudades, años, horas y tipos de vehículos
 */

const AforosLayer = (() => {
  let map = null;
  let aforosData = [];
  let aforosMarkers = [];
  let camerasMap = {}; // Mapa de ID de cámara -> coordenadas y datos
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
    console.log('🚗 Map instance validado:', map && map.getZoom !== undefined ? '✅ VÁLIDO (Leaflet)' : '❌ INVÁLIDO');
  };

  /**
   * Carga coordenadas de cámaras públicas desde GeoJSON
   */
  const loadCamerasCoordinates = async (geojsonPath) => {
    try {
      const response = await fetch(geojsonPath);
      const geojson = await response.json();
      
      // Crear mapa de cámaras por ID
      geojson.features.forEach(feature => {
        const cameraId = feature.properties.camera_number || feature.properties.id;
        const [lng, lat] = feature.geometry.coordinates;
        
        camerasMap[cameraId] = {
          lat: lat,
          lng: lng,
          address: feature.properties.address,
          barrio: feature.properties.barrio,
          type: feature.properties.type
        };
      });
      
      console.log(`✅ ${Object.keys(camerasMap).length} cámaras cargadas desde GeoJSON`);
      return true;
    } catch (error) {
      console.error('❌ Error cargando coordenadas de cámaras:', error);
      return false;
    }
  };

  /**
   * Carga datos CSV de aforos y cámaras, formando un conjunto integrado
   */
  const loadFromCSV = async (csvPath, citiesConfig, currentCityKey) => {
    try {
      // RESETEAR datos anteriores antes de cargar nuevos
      aforosData = [];
      camerasMap = {};
      filteredData = [];
      console.log('🔄 Datos de aforos reseteados para nueva ciudad');
      
      // Obtener ruta de cámaras públicas desde configuración
      let camerasPath = 'data/cameras.geojson';
      
      // Buscar la ciudad en el array cities para obtener la ruta correcta de cámaras
      if (citiesConfig && citiesConfig.cities && Array.isArray(citiesConfig.cities)) {
        const cityConfig = citiesConfig.cities.find(c => c.id === currentCityKey);
        if (cityConfig && cityConfig.files && cityConfig.files.cameras) {
          camerasPath = cityConfig.files.cameras;
        }
      }
      
      // Paso 1: Cargar coordenadas de cámaras
      console.log(`📷 Cargando cámaras desde: ${camerasPath}`);
      const camerasLoaded = await loadCamerasCoordinates(camerasPath);
      if (!camerasLoaded) {
        console.warn('⚠️ No se pudieron cargar las coordenadas de cámaras, continuando sin geolocalización real...');
      }
      
      // Paso 2: Cargar datos de aforos
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
   * Obtiene coordenadas reales de la cámara correspondiente
   * Si no existe, retorna null (sin fallback a coordenadas falsas)
   */
  const getCoordinatesForRecord = (record) => {
    const cameraId = record.cameraId;
    if (camerasMap[cameraId]) {
      return camerasMap[cameraId];
    }
    // Sin fallback: si no hay cámara, no mostrar marcador
    return null;
  };

  /**
   * Renderiza marcadores en el mapa usando Leaflet
   * Integra coordenadas reales de cámaras públicas
   */
  const renderMarkers = async (cityName) => {
    console.log(`🚗 renderMarkers() INICIADO para ciudad: ${cityName}`);
    console.log(`📊 aforosData.length: ${aforosData.length}, filteredData.length: ${filteredData.length}`);
    console.log(`📷 camerasMap.length: ${Object.keys(camerasMap).length}`);
    console.log(`📷 camerasMap primeras 5 cámaras:`, Object.keys(camerasMap).slice(0, 5));
    
    // Verificar que hay datos disponibles
    if (aforosData.length === 0) {
      console.warn('⚠️ No hay datos de aforos cargados aún. Esperando...');
      return;
    }
    
    if (!map) {
      console.error('❌ Mapa no inicializado en renderMarkers()');
      return;
    }
    
    if (Object.keys(camerasMap).length === 0) {
      console.warn('⚠️ Advertencia: No hay coordenadas de cámaras cargadas. Intenta cargar cameras.geojson');
    }
    
    console.log(`✅ Mapa disponible (Leaflet)`);
    
    // Limpiar marcadores existentes
    clearMarkers();
    
    // Agrupar datos filtrados por cameraId
    const aggregatedByCamera = {};
    
    filteredData.forEach(record => {
      if (!aggregatedByCamera[record.cameraId]) {
        aggregatedByCamera[record.cameraId] = {
          cameraId: record.cameraId,
          direccion: record.direccion,
          total: 0,
          count: 0,
          byType: {},
          records: []
        };
      }
      
      aggregatedByCamera[record.cameraId].total += record.total;
      aggregatedByCamera[record.cameraId].count++;
      aggregatedByCamera[record.cameraId].records.push(record);
      
      if (!aggregatedByCamera[record.cameraId].byType[record.vehicleType]) {
        aggregatedByCamera[record.cameraId].byType[record.vehicleType] = 0;
      }
      aggregatedByCamera[record.cameraId].byType[record.vehicleType] += record.total;
    });
    
    console.log(`📊 Datos agregados por cámara - ${Object.keys(aggregatedByCamera).length} cámaras con datos`);
    
    let processedCount = 0;
    let skippedCount = 0;
    const camerasWithData = Object.values(aggregatedByCamera);
    const maxTotal = Math.max(...camerasWithData.map(d => d.total), 1);
    
    for (const [cameraId, data] of Object.entries(aggregatedByCamera)) {
      try {
        // Obtener coordenadas reales de la cámara
        const coords = camerasMap[cameraId];
        
        if (!coords) {
          console.warn(`⚠️ Cámara ${cameraId} sin coordenadas en camerasMap`);
          skippedCount++;
          continue;
        }
        
        // Calcular color basado en volumen total
        const intensity = (data.total / maxTotal) * 100;
        const color = getColorByIntensity(intensity);
        const radius = 5 + (intensity / 15);
        
        // Crear popup con información
        const popupHTML = createPopupHTML(data);
        
        // Crear marcador de Leaflet
        const marker = L.circleMarker([coords.lat, coords.lng], {
          radius: radius,
          fillColor: color,
          color: '#fff',
          weight: 2,
          opacity: 1,
          fillOpacity: 0.7
        }).addTo(map);
        
        // Agregar popup
        marker.bindPopup(popupHTML);
        
        // Agregar tooltip
        marker.bindTooltip(`Cámara ${cameraId}: ${data.total} vehículos`, {
          permanent: false,
          direction: 'auto'
        });
        
        aforosMarkers.push(marker);
        processedCount++;
        
      } catch (error) {
        console.error(`❌ Error creando marcador para cámara ${cameraId}:`, error.message);
      }
    }
    
    console.log(`✅ ${processedCount} cámaras con aforos renderizadas en el mapa (${skippedCount} saltadas)`);
  };

  /**
   * Crea HTML para popup de información de un punto de aforo
   * Con design mejorado y jerarquía clara: Fecha > Hora > Tipo de Vehículo
   */
  const createPopupHTML = (data) => {
    // Función para convertir fecha de MM/DD/YYYY a DD/MM/YYYY
    const formatDate = (dateStr) => {
      const [month, day, year] = dateStr.split('/');
      return `${day}/${month}/${year}`;
    };

    // Ordenar registros por fecha (más reciente primero) luego por hora
    const sortedRecords = [...(data.records || [])].sort((a, b) => {
      const dateA = new Date(a.year, parseInt(a.month) - 1, 1);
      const dateB = new Date(b.year, parseInt(b.month) - 1, 1);
      if (dateB - dateA !== 0) return dateB - dateA;
      
      // Si es misma fecha, ordenar por hora (extraer número de inicio del rango)
      const hourA = parseInt(a.hora.split(' ')[0]);
      const hourB = parseInt(b.hora.split(' ')[0]);
      return hourB - hourA;
    });

    // Agrupar por fecha > hora
    const recordsByDateAndHour = {};
    sortedRecords.forEach(record => {
      const dateKey = formatDate(record.fecha);
      const hourKey = record.hora;
      
      if (!recordsByDateAndHour[dateKey]) {
        recordsByDateAndHour[dateKey] = {};
      }
      if (!recordsByDateAndHour[dateKey][hourKey]) {
        recordsByDateAndHour[dateKey][hourKey] = [];
      }
      recordsByDateAndHour[dateKey][hourKey].push(record);
    });

    let html = `
      <div style="font-size: 13px; max-width: 340px; font-family: sans-serif;">
        <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 12px; border-radius: 6px 6px 0 0; margin: -8px -8px 12px -8px;">
          <h3 style="margin: 0; font-size: 16px; font-weight: 600;">📊 Cámara ${data.cameraId}</h3>
          <p style="margin: 4px 0 0 0; font-size: 11px; opacity: 0.9;">${data.direccion}</p>
        </div>
        
        <div style="padding: 0 8px; max-height: 450px; overflow-y: auto;">
          <div style="background: #f0f4ff; padding: 10px; border-radius: 4px; margin-bottom: 10px;">
            <div style="font-weight: 700; color: #667eea; font-size: 14px;">∑ ${data.total.toLocaleString()} vehículos</div>
            <div style="font-size: 11px; color: #666; margin-top: 3px;">📍 ${data.count} mediciones (incluye todos los rangos horarios)</div>
          </div>

          <div style="border-top: 2px solid #e5e7eb; padding-top: 8px;">
            <div style="font-weight: 600; color: #333; margin-bottom: 8px; font-size: 12px;">📅 Desglose por Fecha y Hora:</div>
    `;

    // Crear accordion por fecha
    let dateIdx = 0;
    Object.entries(recordsByDateAndHour).forEach(([dateKey, hourData]) => {
      const totalByDate = Object.values(hourData).flat().reduce((sum, r) => sum + r.total, 0);
      const hourCount = Object.keys(hourData).length;
      const dateExpandId = `date-${data.cameraId}-${dateIdx}`;
      
      html += `
        <div style="margin-bottom: 8px; border: 2px solid #ddd; border-radius: 4px; overflow: hidden; background: white;">
          <div onclick="var el = document.getElementById('${dateExpandId}'); el.style.display = el.style.display === 'none' ? 'block' : 'none'; this.style.backgroundColor = this.style.backgroundColor === 'rgb(245, 247, 250)' ? '#fff' : 'rgb(245, 247, 250)';" 
               style="cursor: pointer; padding: 10px; background: #fff; font-weight: 600; font-size: 12px; display: flex; justify-content: space-between; align-items: center; user-select: none; transition: background 0.2s; border-bottom: 1px solid #eee;">
            <span>📅 ${dateKey} (${hourCount} mediciones)</span>
            <span style="background: #667eea; color: white; padding: 3px 8px; border-radius: 12px; font-size: 11px; font-weight: 700;">${totalByDate}</span>
          </div>
          
          <div id="${dateExpandId}" style="display: none; padding: 8px; background: #fafafa;">
      `;

      // Mostrar cada hora bajo esta fecha
      Object.entries(hourData).forEach(([hourKey, hourRecords], hourIdx) => {
        const totalByHour = hourRecords.reduce((sum, r) => sum + r.total, 0);
        const hourExpandId = `hour-${data.cameraId}-${dateIdx}-${hourIdx}`;
        
        html += `
          <div style="margin-bottom: 6px; border: 1px solid #e5e7eb; border-radius: 3px; background: white; overflow: hidden;">
            <div onclick="var el = document.getElementById('${hourExpandId}'); el.style.display = el.style.display === 'none' ? 'block' : 'none'; this.style.backgroundColor = this.style.backgroundColor === 'rgb(240, 244, 255)' ? '#fff' : 'rgb(240, 244, 255)';" 
                 style="cursor: pointer; padding: 6px 8px; background: #fff; font-weight: 500; font-size: 11px; display: flex; justify-content: space-between; align-items: center; user-select: none; transition: background 0.2s;">
              <span style="color: #555;">🕐 ${hourKey}</span>
              <span style="background: #f59e0b; color: white; padding: 2px 6px; border-radius: 8px; font-size: 10px; font-weight: 600;">${totalByHour}</span>
            </div>
            
            <div id="${hourExpandId}" style="display: none; padding: 6px 8px; background: #f9fafc; border-top: 1px solid #e5e7eb; font-size: 10px;">
        `;

        // Detalles por tipo de vehículo para esta hora
        const typesByHour = {};
        hourRecords.forEach(record => {
          if (!typesByHour[record.vehicleType]) {
            typesByHour[record.vehicleType] = 0;
          }
          typesByHour[record.vehicleType] += record.total;
        });

        Object.entries(typesByHour).forEach(([type, count]) => {
          const percentage = ((count / totalByHour) * 100).toFixed(0);
          const colors = {
            'auto': '#3b82f6',
            'moto': '#f59e0b',
            'bici': '#10b981',
            'colectivo': '#8b5cf6',
            'camiones': '#ef4444'
          };
          const color = colors[type] || '#666';

          html += `
            <div style="display: flex; justify-content: space-between; align-items: center; padding: 3px 0; margin: 2px 0; border-bottom: 1px dotted #e5e7eb;">
              <span style="color: ${color}; font-weight: 500;">• ${type}</span>
              <span style="background: ${color}; color: white; padding: 1px 4px; border-radius: 3px; font-weight: 600; font-size: 9px;">${count} (${percentage}%)</span>
            </div>
          `;
        });

        html += `
            </div>
          </div>
        `;
      });

      html += `
          </div>
        </div>
      `;
      dateIdx++;
    });

    html += `
          </div>
        </div>
      </div>
    `;

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
    aforosMarkers.forEach(marker => {
      if (map.hasLayer(marker)) {
        map.removeLayer(marker);
      }
    });
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
   * Toggle de visibilidad (Leaflet)
   */
  const toggle = (visible) => {
    aforosMarkers.forEach(marker => {
      if (visible) {
        map.addLayer(marker);
      } else {
        map.removeLayer(marker);
      }
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
