/**
 * MÓDULO DE IMPORTACIÓN DE CIUDADES
 * Permite que usuarios carguen sus propios datos (CSV/GeoJSON)
 * y el sistema automáticamente los integre como nuevas ciudades
 */

const ImportCities = (() => {
  let userCities = {}; // Ciudades cargadas por usuario

  // ==========================================
  // CONVERTIR CSV A GEOJSON (MEJORADO)
  // ==========================================
  const parseCSVLine = (line) => {
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
  };

  const csvToGeoJson = (csvText, latCol = 'lat', lngCol = 'lng', nameCol = 'nombre') => {
    const lines = csvText.trim().split('\n').filter(l => l.trim());
    if (lines.length < 2) return null;

    const headerLine = lines[0];
    const headers = parseCSVLine(headerLine);
    const latIndex = headers.findIndex(h => h.toLowerCase() === latCol.toLowerCase());
    const lngIndex = headers.findIndex(h => h.toLowerCase() === lngCol.toLowerCase());
    const nameIndex = headers.findIndex(h => h.toLowerCase() === nameCol.toLowerCase());

    if (latIndex === -1 || lngIndex === -1) {
      console.error('❌ CSV debe tener columnas: lat, lng');
      return null;
    }

    const features = [];
    for (let i = 1; i < lines.length; i++) {
      const values = parseCSVLine(lines[i]);
      if (values.length <= Math.max(latIndex, lngIndex)) continue;

      const lat = parseFloat(values[latIndex]);
      const lng = parseFloat(values[lngIndex]);
      const name = nameIndex >= 0 ? values[nameIndex] : `Punto ${i}`;

      if (!isNaN(lat) && !isNaN(lng)) {
        // Crear propiedades con todos los campos del CSV
        const properties = {
          nombre: name || `Punto ${i}`
        };
        
        headers.forEach((header, idx) => {
          if (idx < values.length) {
            properties[header] = values[idx];
          }
        });

        features.push({
          type: 'Feature',
          properties: properties,
          geometry: {
            type: 'Point',
            coordinates: [lng, lat]
          }
        });
      }
    }

    console.log(`✓ CSV parseado: ${features.length} features encontrados`);
    return { type: 'FeatureCollection', features };
  };

  // ==========================================
  // PROCESAR ARCHIVO SUBIDO
  // ==========================================
  const processFile = async (file, fileType) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const content = e.target.result;
          let geoJson;

          if (file.type === 'application/json' || file.name.endsWith('.json') || file.name.endsWith('.geojson')) {
            geoJson = JSON.parse(content);
          } else if (file.type === 'text/csv' || file.name.endsWith('.csv')) {
            geoJson = csvToGeoJson(content);
          } else {
            throw new Error('Formato no soportado. Usa CSV o GeoJSON');
          }

          resolve(geoJson);
        } catch (err) {
          reject(err);
        }
      };
      reader.readAsText(file);
    });
  };

  // ==========================================
  // CREAR NUEVA CIUDAD DESDE ARCHIVOS SUBIDOS
  // ==========================================
  const createCityFromFiles = async (cityName, files) => {
    console.log(`🏗️ Creando ciudad: ${cityName}`);

    const cityId = cityName.toLowerCase().replace(/\s+/g, '-');
    const cityData = {
      id: cityId,
      name: cityName,
      country: 'Argentina',
      province: 'Proporcionado por Usuario',
      coordinates: { lat: -35, lng: -59 },
      zoom: 12,
      files: {
        barrios: null,
        siniestros: null,
        cameras: null,
        private_cameras: null
      },
      optionalLayers: {
        semaforos: null,
        colegios: null,
        corredores: null,
        flujo: null,
        robo: null
      }
    };

    // Definir capas obligatorias y opcionales
    const mainLayers = ['barrios', 'siniestros', 'cameras', 'private_cameras'];
    const optionalLayersList = ['semaforos', 'colegios', 'corredores', 'flujo', 'robo'];

    // Procesar cada archivo basándose en su tipo
    for (const [fileType, file] of Object.entries(files)) {
      if (!file) continue;

      try {
        console.log(`  📄 Procesando ${fileType}...`);
        const geoJson = await processFile(file, fileType);

        // Guardar en formato compatible (usando data URLs en localStorage o base64)
        const dataStr = JSON.stringify(geoJson);
        const dataUrl = `data:application/json;base64,${btoa(dataStr)}`;

        if (mainLayers.includes(fileType)) {
          cityData.files[fileType] = dataUrl;
        } else if (optionalLayersList.includes(fileType)) {
          cityData.optionalLayers[fileType] = dataUrl;
        }
        
        console.log(`    ✓ ${fileType} procesado (${geoJson.features?.length || 0} elementos)`);
      } catch (err) {
        console.warn(`  ⚠️ Error procesando ${fileType}:`, err.message);
      }
    }

    // Calcular centroid si hay geometría
    if (cityData.files.barrios) {
      try {
        console.log('📍 Calculando centroide de barrios...');
        const barriosStr = atob(cityData.files.barrios.split(',')[1]);
        const barrios = JSON.parse(barriosStr);
        
        if (barrios.features && barrios.features.length > 0) {
          let allLats = [];
          let allLngs = [];
          
          // Recolectar todas las coordenadas
          barrios.features.forEach(f => {
            if (f.geometry && f.geometry.coordinates) {
              if (f.geometry.type === 'Polygon') {
                // Polygon: coordinates[0] es el exterior ring
                f.geometry.coordinates[0].forEach(coord => {
                  allLngs.push(coord[0]);
                  allLats.push(coord[1]);
                });
              } else if (f.geometry.type === 'MultiPolygon') {
                // MultiPolygon: array de polygons
                f.geometry.coordinates.forEach(polygon => {
                  polygon[0].forEach(coord => {
                    allLngs.push(coord[0]);
                    allLats.push(coord[1]);
                  });
                });
              } else if (f.geometry.type === 'Point') {
                // Point: [lng, lat]
                allLngs.push(f.geometry.coordinates[0]);
                allLats.push(f.geometry.coordinates[1]);
              }
            }
          });
          
          if (allLats.length > 0 && allLngs.length > 0) {
            const avgLat = allLats.reduce((a, b) => a + b) / allLats.length;
            const avgLng = allLngs.reduce((a, b) => a + b) / allLngs.length;
            
            // Calcular zoom basado en el rango de coordenadas
            const minLat = Math.min(...allLats);
            const maxLat = Math.max(...allLats);
            const minLng = Math.min(...allLngs);
            const maxLng = Math.max(...allLngs);
            
            const latRange = maxLat - minLat;
            const lngRange = maxLng - minLng;
            const maxRange = Math.max(latRange, lngRange);
            
            // Calcular zoom basado en el rango
            let zoom = 12;
            if (maxRange > 2) zoom = 10;
            else if (maxRange > 0.5) zoom = 11;
            else if (maxRange > 0.2) zoom = 12;
            else if (maxRange > 0.1) zoom = 13;
            else zoom = 14;
            
            cityData.coordinates = { lat: avgLat, lng: avgLng };
            cityData.zoom = zoom;
            
            console.log(`✅ Centroide calculado: ${avgLat.toFixed(4)}, ${avgLng.toFixed(4)}, zoom: ${zoom}`);
          }
        }
      } catch (e) {
        console.warn('⚠️ No se pudo calcular centroid:', e);
      }
    }

    userCities[cityId] = cityData;
    localStorage.setItem('userCities', JSON.stringify(userCities));
    console.log(`✅ Ciudad ${cityName} creada exitosamente`);

    return cityData;
  };

  // ==========================================
  // OBTENER CIUDADES DEL USUARIO
  // ==========================================
  const loadUserCities = () => {
    const stored = localStorage.getItem('userCities');
    if (stored) {
      userCities = JSON.parse(stored);
    }
    return userCities;
  };

  // ==========================================
  // CARGAR DATOS DE URL DATA
  // ==========================================
  const loadGeoJsonFromDataUrl = (dataUrl) => {
    try {
      if (dataUrl.startsWith('data:application/json;base64,')) {
        const base64 = dataUrl.split(',')[1];
        const json = JSON.parse(atob(base64));
        return json;
      }
      return null;
    } catch (e) {
      console.error('Error decodificando data URL:', e);
      return null;
    }
  };

  // ==========================================
  // ELIMINAR CIUDAD
  // ==========================================
  const deleteCity = (cityId) => {
    delete userCities[cityId];
    localStorage.setItem('userCities', JSON.stringify(userCities));
    console.log(`🗑️ Ciudad ${cityId} eliminada`);
  };

  return {
    createCityFromFiles,
    loadUserCities,
    loadGeoJsonFromDataUrl,
    deleteCity,
    getUserCities: () => userCities
  };
})();
