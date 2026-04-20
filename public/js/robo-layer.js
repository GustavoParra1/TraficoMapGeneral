/**
 * 🚗 ROBO AUTOMOTOR LAYER
 * Módulo para visualizar y filtrar robos de vehículos en el mapa
 * VERSION: 2025-04-15
 */

const RoboLayer = (() => {
  let roboData = [];
  let filteredRobo = [];
  let roboLayer = null;
  let map = null;
  let isVisible = false;
  let barriosGeoJson = null;

  // Colores para resultados de robos - COLORES DISTINTIVOS
  const resultadoColors = {
    'Asiste Policia y Libera': '#f39c12',      // 🟠 Naranja vibrante
    'Hallazgo de Automotor': '#27ae60',        // 🟢 Verde oscuro
    'Intervencion Policial': '#e74c3c',        // 🔴 Rojo
    'Sin Recurso Policial': '#f1c40f',         // 🟡 Amarillo
    'Seguimiento LPR': '#3498db',              // 🔵 Azul
    'LPR Detencion': '#1abc9c',                // 🔷 Cian/Verde menta
    'Otros': '#95a5a6'                         // ⚫ Gris
  };

  // Función helper para parsear líneas CSV correctamente
  function parseCSVLine(line) {
    const result = [];
    let current = '';
    let inQuotes = false;
    
    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      const nextChar = line[i + 1];
      
      if (char === '"') {
        if (inQuotes && nextChar === '"') {
          current += '"';
          i++; // Skip next quote
        } else {
          inQuotes = !inQuotes;
        }
      } else if (char === ',' && !inQuotes) {
        result.push(current.trim());
        current = '';
      } else {
        current += char;
      }
    }
    
    result.push(current.trim());
    return result;
  }

  // Filtros activos
  const filters = {
    globalBarrio: 'all',
    year: 'all',
    resultado: 'all'
  };

  /**
   * Inicializa el módulo
   */
  function init(leafletMap) {
    map = leafletMap;
    roboLayer = L.layerGroup();
    console.log('🚗 RoboLayer inicializado');
  }

  /**
   * Carga robos desde CSV - maneja tanto archivos procesados como originales Excel
   * Formato esperado: lat,lng,fecha,resultado,observaciones (o detección automática)
   */
  function loadRoboFromCSV(csvPath) {
    console.log(`🚗 loadRoboFromCSV() iniciado para: ${csvPath}`);
    
    // Si el archivo procesado no tiene suficientes registros, intentar archivo original
    let actualPath = csvPath;
    if (csvPath.includes('robos-mar-del-plata.csv')) {
      actualPath = 'data/robo automotor - Hoja 1.csv'; // Intentar con el original también
    }
    
    return fetch(actualPath || csvPath)
      .then(response => {
        if (!response.ok) {
          // Si no encontramos el original, usar el procesado
          if (actualPath !== csvPath) {
            console.log(`⚠️ Original no encontrado, usando: ${csvPath}`);
            return fetch(csvPath).then(r => r.text());
          }
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        return response.text();
      })
      .then(csvText => {
        console.log(`🚗 CSV cargado, tamaño: ${csvText.length} caracteres`);
        
        roboData = [];
        const lines = csvText.split('\n').filter(l => l.trim()); // Eliminar líneas vacías
        console.log(`🚗 Total de líneas: ${lines.length}`);
        
        // Parsear encabezado - manejar espacios y caracteres especiales
        const headerLine = lines[0];
        const headers = headerLine.split(',').map(h => h.trim().toLowerCase());
        console.log(`🚗 Headers: ${headers.join(', ')}`);
        
        // Detectar índices de columnas automáticamente
        let latIdx = null;
        let lngIdx = null;
        let fechaIdx = null;
        let resultadoIdx = null;
        let obsIdx = null;
        
        // PASO 1: Buscar columnas por nombre (más flexible)
        for (let i = 0; i < headers.length; i++) {
          const h = headers[i];
          // Latitud
          if ((h.includes('lat') || h.includes('latitud') || h === 'lat') && latIdx === null) {
            latIdx = i;
          }
          // Longitud
          if ((h.includes('lng') || h.includes('longitud') || h.includes('lon') || h === 'lng') && lngIdx === null) {
            lngIdx = i;
          }
          if (h.includes('fecha') && fechaIdx === null) {
            fechaIdx = i;
          }
          if ((h.includes('resultado') || h.includes('evento') || h.includes('tipo') || h.includes('estado')) && resultadoIdx === null) {
            resultadoIdx = i;
          }
          if ((h.includes('obs') || h.includes('dir') || h.includes('descripcion') || h.includes('detalle')) && obsIdx === null) {
            obsIdx = i;
          }
        }
        
        // PASO 2: Si no encontramos coordenadas, buscar en los datos
        if (latIdx === null || lngIdx === null) {
          console.log(`🚗 Detectando columnas por contenido...`);
          
          // Analizar todas las filas para encontrar números en rangos correctos
          const columnTypes = new Array(headers.length).fill(0);
          
          for (let i = 1; i < Math.min(lines.length, 100); i++) { // Analizar hasta 100 filas
            const values = parseCSVLine(lines[i]);
            
            for (let j = 0; j < values.length; j++) {
              try {
                const numVal = parseFloat(values[j].trim().replace(',', '.'));
                if (!isNaN(numVal)) {
                  // Detectar latitudes (-40 a -33)
                  if (latIdx === null && -40 <= numVal && numVal <= -33) {
                    columnTypes[j]++;
                  }
                  // Detectar longitudes (-62 a -54)
                  if (lngIdx === null && -62 <= numVal && numVal <= -54) {
                    columnTypes[j]++;
                  }
                }
              } catch (e) {
                // Ignorar errores de parseo
              }
            }
          }
          
          // Asignar basándose en frecuencia
          for (let j = 0; j < columnTypes.length; j++) {
            if (columnTypes[j] > 5) { // Si más del 5% de valores son válidos
              if (latIdx === null && headers[j].includes('lat')) {
                latIdx = j;
              } else if (lngIdx === null && headers[j].includes('lng')) {
                lngIdx = j;
              } else if (latIdx === null) {
                latIdx = j; // Asumir primera columna válida para lat
              } else if (lngIdx === null) {
                lngIdx = j; // Segunda columna válida para lng
              }
            }
          }
          
          if (latIdx === null) latIdx = 0; // Fallback
          if (lngIdx === null) lngIdx = 1; // Fallback
        }
        
        console.log(`🚗 Índices detectados: lat[${latIdx}], lng[${lngIdx}], fecha[${fechaIdx}], resultado[${resultadoIdx}]`);
        
        // Cargar datos
        for (let i = 1; i < lines.length; i++) {
          const line = lines[i].trim();
          if (!line) continue;
          
          const values = parseCSVLine(line);
          
          if (latIdx === null || lngIdx === null || values.length < Math.max(latIdx, lngIdx) + 1) {
            continue;
          }
          
          const lat = parseFloat(values[latIdx].replace(',', '.'));
          const lng = parseFloat(values[lngIdx].replace(',', '.'));
          const fecha = fechaIdx !== null && fechaIdx < values.length ? values[fechaIdx] : '';
          const resultado = resultadoIdx !== null && resultadoIdx < values.length ? values[resultadoIdx] : 'Otros';
          const observaciones = obsIdx !== null && obsIdx < values.length ? values[obsIdx] : '';
          
          // Validar coordenadas (rango amplio para Argentina)
          if (!isNaN(lat) && !isNaN(lng) && lat < -20 && lat > -56 && lng < -50 && lng > -75) {
            roboData.push({
              lat,
              lng,
              fecha,
              resultado: resultado.substring(0, 50), // Limitar a 50 caracteres
              observaciones: observaciones.substring(0, 100), // Limitar a 100 caracteres
              year: extraerYear(fecha)
            });
          }
        }
        
        console.log(`🚗 ${roboData.length} robos cargados desde CSV`);
        applyFilters();
        return roboData;
      })
      .catch(error => {
        console.warn('⚠️ Error cargando robos:', error);
        return [];
      });
  }

  /**
   * Carga robos desde GeoJSON
   */
  function loadRoboFromGeoJSON(geojson) {
    try {
      roboData = [];
      
      if (!geojson.features || !Array.isArray(geojson.features)) {
        console.warn('⚠️ GeoJSON inválido para robos');
        return;
      }
      
      geojson.features.forEach(feature => {
        const coords = feature.geometry?.coordinates;
        if (!coords || coords.length !== 2) return;
        
        const props = feature.properties || {};
        roboData.push({
          lat: coords[1],
          lng: coords[0],
          fecha: props.fecha || props.date || '',
          resultado: props.resultado || props.result || 'Otros',
          observaciones: props.observaciones || props.notes || '',
          year: extraerYear(props.fecha || props.date || '')
        });
      });
      
      console.log(`🚗 ${roboData.length} robos cargados desde GeoJSON`);
      applyFilters();
    } catch (error) {
      console.error('Error cargando GeoJSON de robos:', error);
    }
  }

  /**
   * Extrae el año de una fecha en formato DD/MM/YYYY o YYYY-MM-DD
   */
  function extraerYear(fecha) {
    if (!fecha) return new Date().getFullYear();
    
    const partes = fecha.split(/[/-]/);
    if (partes.length === 3) {
      let year = parseInt(partes[2]);
      // Si es DD/MM/YYYY, el año está al final
      if (year > 1900) return year;
      // Si es YYYY-MM-DD, el año está al inicio
      if (partes[0] > 1900) return parseInt(partes[0]);
    }
    
    return new Date().getFullYear();
  }

  /**
   * Parsear línea CSV respetando comillas
   */
  function parseCSVLine(line) {
    const result = [];
    let current = '';
    let insideQuotes = false;
    
    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      const nextChar = line[i + 1];
      
      if (char === '"') {
        if (insideQuotes && nextChar === '"') {
          current += '"';
          i++;
        } else {
          insideQuotes = !insideQuotes;
        }
      } else if (char === ',' && !insideQuotes) {
        result.push(current.trim());
        current = '';
      } else {
        current += char;
      }
    }
    
    result.push(current.trim());
    return result;
  }

  /**
   * Aplica los filtros actuales
   */
  function applyFilters() {
    filteredRobo = roboData.filter(robo => {
      // Filtro por año
      if (filters.year !== 'all') {
        if (robo.year !== parseInt(filters.year)) {
          return false;
        }
      }
      
      // Filtro por resultado
      if (filters.resultado !== 'all') {
        if (robo.resultado !== filters.resultado) {
          return false;
        }
      }
      
      // Filtro por barrio global (si hay datos de barrios)
      if (filters.globalBarrio !== 'all' && barriosGeoJson) {
        const roboPoint = L.latLng(robo.lat, robo.lng);
        const barrioEncontrado = barriosGeoJson.features.some((feature) => {
          try {
            if (feature.properties?.soc_fomen !== filters.globalBarrio) return false;
            return isPointInPolygon(roboPoint, feature.geometry);
          } catch (e) {
            return false;
          }
        });
        if (!barrioEncontrado) return false;
      }
      
      return true;
    });
    
    console.log(`🚗 ${filteredRobo.length} robos después de filtros`);
    renderRobos();
  }

  /**
   * Verifica si un punto está dentro de un polígono
   */
  function isPointInPolygon(point, geometry) {
    if (!geometry || !geometry.coordinates) return false;
    
    try {
      if (geometry.type === 'MultiPolygon') {
        return geometry.coordinates.some(poly => isPointInPolygonRing(point, poly));
      } else if (geometry.type === 'Polygon') {
        return isPointInPolygonRing(point, geometry.coordinates);
      }
    } catch (e) {
      return false;
    }
    
    return false;
  }

  /**
   * Verifica si un punto está en una secuencia de anillos (exterior e interiores)
   */
  function isPointInPolygonRing(point, rings) {
    if (!rings || rings.length === 0) return false;
    
    // Verificar anillo exterior
    const exterior = rings[0];
    if (!raycastAlgorithm(point, exterior)) return false;
    
    // Verificar anillos interiores (huecos)
    for (let i = 1; i < rings.length; i++) {
      if (raycastAlgorithm(point, rings[i])) return false;
    }
    
    return true;
  }

  /**
   * Algoritmo de raycast para verificar punto en polígono
   */
  function raycastAlgorithm(point, ring) {
    let inside = false;
    for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
      const p1 = L.latLng(ring[i][1], ring[i][0]);
      const p2 = L.latLng(ring[j][1], ring[j][0]);
      
      if ((p1.lng > point.lng) !== (p2.lng > point.lng) &&
          point.lat < (p2.lat - p1.lat) * (point.lng - p1.lng) / (p2.lng - p1.lng) + p1.lat) {
        inside = !inside;
      }
    }
    return inside;
  }

  /**
   * Renderiza los robos en el mapa
   */
  function renderRobos() {
    if (!map) return;
    
    // Limpiar capa anterior
    if (roboLayer) {
      roboLayer.clearLayers();
    }
    
    filteredRobo.forEach(robo => {
      const color = resultadoColors[robo.resultado] || resultadoColors['Otros'];
      
      const marker = L.circleMarker([robo.lat, robo.lng], {
        radius: 6,
        fillColor: color,
        color: '#333',
        weight: 1,
        opacity: 1,
        fillOpacity: 0.7,
        interactive: true
      });
      
      // Popup con información del robo
      const popupContent = `
        <div style="font-size: 12px; width: 200px; max-height: 200px; overflow-y: auto;">
          <strong style="color: ${color}">🚗 Robo Automotor</strong><br>
          <strong>Resultado:</strong> ${robo.resultado}<br>
          <strong>Fecha:</strong> ${robo.fecha}<br>
          ${robo.observaciones ? `<strong>Notas:</strong> ${robo.observaciones}<br>` : ''}
          <strong>Coordenadas:</strong> ${robo.lat.toFixed(4)}, ${robo.lng.toFixed(4)}
        </div>
      `;
      
      marker.bindPopup(popupContent);
      marker.on('mouseover', function() { this.openPopup(); });
      marker.on('mouseout', function() { this.closePopup(); });
      
      roboLayer.addLayer(marker);
    });
    
    if (isVisible && map) {
      map.addLayer(roboLayer);
    }
    
    console.log(`🚗 ${filteredRobo.length} robos renderizados`);
  }

  /**
   * Obtiene metadata (años, resultados, etc.)
   */
  function getMetadata() {
    const years = [...new Set(roboData.map(r => r.year))].sort((a, b) => a - b);
    const resultados = [...new Set(roboData.map(r => r.resultado))].sort();
    
    return {
      years,
      resultados,
      total: filteredRobo.length
    };
  }

  /**
   * Set filter
   */
  function setFilter(filterName, value) {
    if (filterName === 'globalBarrio') {
      filters.globalBarrio = value;
    } else if (filterName === 'year') {
      filters.year = value;
    } else if (filterName === 'resultado') {
      filters.resultado = value;
    }
    
    applyFilters();
  }

  /**
   * Clear filters
   */
  function clearFilters() {
    filters.year = 'all';
    filters.resultado = 'all';
    filters.globalBarrio = 'all';
    applyFilters();
  }

  /**
   * Toggle visibility
   */
  function toggle(show) {
    isVisible = show;
    
    if (show) {
      // Si se muestra, re-renderizar los robos
      applyFilters();
    } else {
      // Si se oculta, limpiar la capa del mapa
      if (roboLayer && map) {
        map.removeLayer(roboLayer);
      }
      roboLayer.clearLayers();
    }
    
    console.log(`🚗 RoboLayer ${show ? 'mostrado' : 'ocultado'}`);
  }

  /**
   * Set barrios data para filtrado geográfico
   */
  function setBarriosData(barriosGeo) {
    barriosGeoJson = barriosGeo;
  }

  /**
   * Clear markers
   */
  function clearMarkers() {
    if (roboLayer) {
      roboLayer.clearLayers();
    }
  }

  // API Pública
  return {
    init,
    loadRoboFromCSV,
    loadRoboFromGeoJSON,
    applyFilters,
    renderRobos,
    getMetadata,
    setFilter,
    clearFilters,
    toggle,
    setBarriosData,
    clearMarkers,
    getVisibleRobos: () => filteredRobo
  };
})();
