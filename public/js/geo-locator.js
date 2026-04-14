/**
 * 🗺️ GEO-LOCATOR: Búsqueda de direcciones
 * Usa Google Maps Geocoding API directamente desde el navegador
 */

const GeoLocator = (() => {
  const GOOGLE_MAPS_API_KEY = 'AIzaSyBp2ZiKA4lYieyjX_aJJjE023NeqKrRhJc';
  const SEARCH_RADIUS_KM = 1; // Radio de búsqueda en km
  
  let addressIndex = [];
  let locationMarker = null;
  let radiusCircle = null;
  let map = null;
  let currentCity = 'mar-del-plata'; // Ciudad actual
  let currentLocation = null; // Ubicación actual del búsqueda

  /**
   * Normaliza texto: elimina acentos, convierte a minúsculas, limpia espacios
   */
  const normalizeText = (text) => {
    return text
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '') // Elimina acentos y diéresis
      .replace(/\s+/g, ' ') // Normaliza espacios
      .trim();
  };

  /**
   * Carga todas las direcciones del GeoJSON de siniestros
   */
  const loadAddresses = (geojsonData, city = 'cordoba') => {
    if (!geojsonData || !geojsonData.features) {
      console.warn('⚠️ GeoLocator: No hay features en GeoJSON');
      return;
    }

    currentCity = city;
    addressIndex = [];
    const addressSet = new Set();

    geojsonData.features.forEach(feature => {
      if (!feature.properties || !feature.properties.nombre) return;
      
      const address = feature.properties.nombre.trim();
      const normalized = normalizeText(address);

      if (!addressSet.has(normalized)) {
        addressSet.add(normalized);
        addressIndex.push({
          original: address,
          normalized: normalized,
          lat: feature.properties.lat || feature.geometry.coordinates?.[1],
          lng: feature.properties.lng || feature.geometry.coordinates?.[0],
          coordinates: feature.geometry.coordinates,
          source: 'local'
        });
      }
    });

    console.log(`✅ GeoLocator: ${addressIndex.length} direcciones cargadas`);
  };

  /**
   * Calcula distancia de Levenshtein (similitud de strings)
   */
  const levenshteinDistance = (str1, str2) => {
    const len1 = str1.length;
    const len2 = str2.length;
    const matrix = Array(len2 + 1).fill(null).map(() => Array(len1 + 1).fill(0));

    for (let i = 0; i <= len1; i++) matrix[0][i] = i;
    for (let j = 0; j <= len2; j++) matrix[j][0] = j;

    for (let j = 1; j <= len2; j++) {
      for (let i = 1; i <= len1; i++) {
        const indicator = str1[i - 1] === str2[j - 1] ? 0 : 1;
        matrix[j][i] = Math.min(
          matrix[j][i - 1] + 1,
          matrix[j - 1][i] + 1,
          matrix[j - 1][i - 1] + indicator
        );
      }
    }

    return matrix[len2][len1];
  };

  /**
   * Busca direcciones que coincidan con la consulta
   * ESTRATEGIA MEJORADA:
   * 1. Si es CRUCE -> consulta Google Maps directamente (rápido y fiable)
   * 2. Si es dirección normal -> intenta datos locales, fallback a Google Maps
   */
  const search = async (query) => {
    if (!query || query.trim().length === 0) return [];

    const normalized = normalizeText(query);
    const results = [];
    const seen = new Set();

    // Detectar si es búsqueda por cruce (contiene "y" o "e" como separador)
    const intersectionMatch = normalized.match(/^(.+?)\s+(?:y|e)\s+(.+)$/);
    const isIntersection = intersectionMatch !== null;

    if (isIntersection) {
      console.log(`🔄 Búsqueda por CRUCE detectada: "${intersectionMatch[1]}" Y "${intersectionMatch[2]}"`);
      console.log(`🚀 Saltando a Google Maps directamente para cruces...`);
      
      // PARA CRUCES: ir directamente a Google Maps (PASO 3)
      try {
        const cityBounds = {
          'cordoba': {
            name: 'Córdoba, Argentina',
            latMin: -31.55, latMax: -31.25,
            lngMin: -64.35, lngMax: -64.00
          },
          'rosario': {
            name: 'Rosario, Argentina',
            latMin: -33.00, latMax: -32.80,
            lngMin: -60.80, lngMax: -60.50
          },
          'mar-del-plata': {
            name: 'Mar del Plata, Argentina',
            latMin: -38.05, latMax: -37.95,
            lngMin: -57.65, lngMax: -57.45
          }
        };
        
        const config = cityBounds[currentCity] || cityBounds['cordoba'];
        const googleQuery = `${query}, ${config.name}`;
        
        const googleUrl = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(googleQuery)}&key=${GOOGLE_MAPS_API_KEY}`;
        console.log(`  📡 Google Maps: ${googleQuery}`);
        
        const response = await fetch(googleUrl);
        const data = await response.json();

        if (data.results && data.results.length > 0) {
          const result = data.results[0];
          const lat = result.geometry.location.lat;
          const lng = result.geometry.location.lng;
          const formattedAddress = result.formatted_address;
          
          const isWithinBounds = 
            lat >= config.latMin && lat <= config.latMax &&
            lng >= config.lngMin && lng <= config.lngMax;
          
          if (isWithinBounds) {
            console.log(`✅ Cruce encontrado en Google Maps:`, formattedAddress);
            
            results.push({
              original: formattedAddress,
              normalized: normalizeText(formattedAddress),
              lat: lat,
              lng: lng,
              coordinates: [lng, lat],
              matchType: 'google_cruce',
              relevance: 100,
              source: 'google-maps',
              googleResponse: result
            });
            
            return results; // Retorna el resultado del cruce
          } else {
            console.warn(`⚠️ Cruce FUERA de bounds: ${formattedAddress}`);
          }
        } else {
          console.warn(`⚠️ No se encontraron resultados para: ${googleQuery}`);
        }
      } catch (error) {
        console.error(`❌ Error al consultar Google Maps:`, error);
      }
      
      return results; // Retorna vacío si no encontró cruce
    }

    // PARA DIRECCIONES NORMALES: búsqueda local + fallback a Google Maps
    console.log(`🔍 Búsqueda normal de dirección: "${query}"`);


    // PASO 1: Búsqueda exacta o parcial en datos locales
    addressIndex.forEach(address => {
      const { original, normalized: normAddr, coordinates } = address;

      // Búsqueda exacta - coincidencia completa
      if (normAddr === normalized) {
        const key = `${coordinates[0]}-${coordinates[1]}`;
        if (!seen.has(key)) {
          seen.add(key);
          results.push({
            ...address,
            relevance: 100,
            matchType: 'exacta'
          });
        }
        return;
      }

      // Búsqueda parcial - la dirección contiene la consulta
      if (normAddr.includes(normalized)) {
        const key = `${coordinates[0]}-${coordinates[1]}`;
        if (!seen.has(key)) {
          seen.add(key);
          results.push({
            ...address,
            relevance: 90,
            matchType: 'parcial'
          });
        }
        return;
      }
    });

    // PASO 2: Si no hay resultados, intenta fuzzy matching para direcciones normales
    if (results.length === 0) {
      console.log(`📍 No se encontraron coincidencias locales. Intentando fuzzy matching...`);
      
      const fuzzyResults = [];
      addressIndex.forEach(address => {
        const { original, normalized: normAddr, coordinates } = address;
        
        // Buscar por palabra clave (cualquier palabra en la consulta)
        const queryWords = normalized.split(/\s+/).filter(w => w.length > 2);
        let matchedWords = 0;

        queryWords.forEach(word => {
          if (normAddr.includes(word)) {
            matchedWords++;
          }
        });

        // Calcular distancia de Levenshtein para similitud general
        const distance = levenshteinDistance(normalized, normAddr);
        const similarity = 1 - (distance / Math.max(normalized.length, normAddr.length));

        if (matchedWords > 0 || similarity > 0.5) {
          const key = `${coordinates[0]}-${coordinates[1]}`;
          if (!seen.has(key)) {
            seen.add(key);
            fuzzyResults.push({
              ...address,
              relevance: Math.round((matchedWords * 15 + similarity * 100) / 2),
              matchType: matchedWords > 0 ? 'palabra_clave' : 'similar'
            });
          }
        }
      });

      // Ordenar por relevancia y tomar top 20
      fuzzyResults.sort((a, b) => b.relevance - a.relevance);
      results.push(...fuzzyResults.slice(0, 20));
    }

    // PASO 3: Si SIGUE sin resultados, usar Google Maps Geocoding API directamente (para direcciones normales)
    if (results.length === 0) {
      console.log(`🌐 Sin resultados locales. Consultando Google Maps Geocoding API...`);
      
      try {
        // Configurar ciudad según municipio con bounds para limitar búsqueda
        const cityBounds = {
          'cordoba': {
            name: 'Córdoba, Argentina',
            latMin: -31.55, latMax: -31.25,    // Ampliado para toda la zona urbana y periférica
            lngMin: -64.35, lngMax: -64.00
          },
          'rosario': {
            name: 'Rosario, Argentina',
            latMin: -33.00, latMax: -32.80,
            lngMin: -60.80, lngMax: -60.50
          },
          'mar-del-plata': {
            name: 'Mar del Plata, Argentina',
            latMin: -38.05, latMax: -37.95,    // Ampliado para abarcar toda la ciudad
            lngMin: -57.65, lngMax: -57.45
          }
        };
        
        const config = cityBounds[currentCity] || cityBounds['cordoba'];
        const googleQuery = `${query}, ${config.name}`;
        
        const googleUrl = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(googleQuery)}&key=${GOOGLE_MAPS_API_KEY}`;
        console.log(`  📡 Llamando Google Maps: ${query} in ${config.name}`);
        
        const response = await fetch(googleUrl);
        const data = await response.json();

        if (data.results && data.results.length > 0) {
          const result = data.results[0];
          const lat = result.geometry.location.lat;
          const lng = result.geometry.location.lng;
          const formattedAddress = result.formatted_address;
          
          // Validar que el resultado esté DENTRO de los bounds
          const isWithinBounds = 
            lat >= config.latMin && lat <= config.latMax &&
            lng >= config.lngMin && lng <= config.lngMax;
          
          if (isWithinBounds) {
            console.log(`✅ Encontrado en Google Maps (dentro de bounds):`, formattedAddress);
            
            results.push({
              original: formattedAddress,
              normalized: normalizeText(formattedAddress),
              lat: lat,
              lng: lng,
              coordinates: [lng, lat],
              matchType: 'google_address',
              relevance: 90,
              source: 'google-maps',
              googleResponse: result
            });
          } else {
            console.warn(`⚠️ Resultado de Google Maps FUERA de bounds: ${formattedAddress} (Lat: ${lat}, Lng: ${lng})`);
            console.warn(`   Bounds esperados: Lat [${config.latMin}, ${config.latMax}], Lng [${config.lngMin}, ${config.lngMax}]`);
          }
        } else {
          console.warn(`⚠️ Google Maps no encontró resultados para: ${googleQuery}`);
        }
      } catch (error) {
        console.error(`❌ Error al consultar Google Maps:`, error);
      }
    }

    // Ordenar resultados finales
    results.sort((a, b) => {
      const priorityOrder = { exacta: 0, cruce: 1, parcial: 2, cruce_fuzzy: 3, google_cruce: 4, google_address: 5, palabra_clave: 6, similar: 7 };
      const priorityA = priorityOrder[a.matchType] ?? 8;
      const priorityB = priorityOrder[b.matchType] ?? 8;
      
      if (priorityA !== priorityB) return priorityA - priorityB;
      return b.relevance - a.relevance;
    });

    return results.slice(0, 50); // Máximo 50 resultados
  };

  /**
   * Calcula la distancia entre dos puntos usando fórmula Haversine
   * @returns {number} Distancia en km
   */
  const calculateDistance = (lat1, lng1, lat2, lng2) => {
    const R = 6371; // Radio de la Tierra en km
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLng = (lng2 - lng1) * Math.PI / 180;
    const a = 
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
      Math.sin(dLng / 2) * Math.sin(dLng / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  };

  /**
   * Filtra cámaras por distancia (dentro de 1km)
   */
  const filterCamerasByDistance = () => {
    console.log('🔍🔍🔍 filterCamerasByDistance() INICIADO');
    
    if (!currentLocation) {
      console.warn('⚠️ currentLocation no disponible');
      return;
    }
    
    const { lat, lng } = currentLocation;
    console.log(`📍 Filtrando cámaras desde: lat=${lat}, lng=${lng}`);
    
    // Filtrar cámaras públicas - SIN window.
    if (typeof CamerasLayer !== 'undefined' && typeof CamerasLayer.setLocationFilter === 'function') {
      console.log('✅ Llamando CamerasLayer.setLocationFilter()');
      CamerasLayer.setLocationFilter(lat, lng, SEARCH_RADIUS_KM);
    } else {
      console.warn('⚠️ CamerasLayer.setLocationFilter NO disponible');
    }
    
    // Filtrar cámaras privadas - SIN window.
    if (typeof PrivateCamerasLayer !== 'undefined' && typeof PrivateCamerasLayer.setLocationFilter === 'function') {
      console.log('✅ Llamando PrivateCamerasLayer.setLocationFilter()');
      PrivateCamerasLayer.setLocationFilter(lat, lng, SEARCH_RADIUS_KM);
    } else {
      console.warn('⚠️ PrivateCamerasLayer.setLocationFilter NO disponible');
    }
    
    console.log('🔍🔍🔍 filterCamerasByDistance() FINALIZADO');
  };

  /**
   * Muestra un marcador en la ubicación de la dirección
   */
  const showLocation = (address) => {
    console.log('📍 showLocation() llamado con:', address);
    
    if (!map) {
      console.error('❌ Mapa no inicializado');
      return;
    }

    if (!address) {
      console.error('❌ Dirección undefined');
      return;
    }

    // Obtener coordenadas - pueden venir en diferentes formatos
    let lat, lng;
    
    if (address.coordinates && Array.isArray(address.coordinates)) {
      // Formato GeoJSON: [lng, lat]
      [lng, lat] = address.coordinates;
    } else if (address.lat && address.lng) {
      // Formato directo: {lat, lng}
      lat = address.lat;
      lng = address.lng;
    } else {
      console.error('❌ No se pudieron obtener coordenadas', address);
      return;
    }
    
    
    console.log(`📍 Marcador en: lat=${lat}, lng=${lng}`);
    
    const original = address.original || `Lat: ${lat.toFixed(4)}, Lng: ${lng.toFixed(4)}`;

    // Remover marcador anterior si existe
    if (locationMarker) {
      map.removeLayer(locationMarker);
    }
    
    // Remover círculo anterior si existe
    if (radiusCircle) {
      map.removeLayer(radiusCircle);
    }

    // Guardar ubicación actual
    currentLocation = { lat, lng };

    // Crear nuevo marcador con ícono azul (default Leaflet)
    locationMarker = L.marker([lat, lng], {
      icon: L.icon({
        iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
        shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
        iconSize: [25, 41],
        iconAnchor: [12, 41],
        popupAnchor: [1, -34],
        shadowSize: [41, 41]
      })
    })
      .bindPopup(`<strong>📍 ${original}</strong><br>Lat: ${lat.toFixed(4)}<br>Lng: ${lng.toFixed(4)}`)
      .addTo(map);
    
    // Crear círculo rojo de 1km alrededor de la ubicación
    radiusCircle = L.circle([lat, lng], {
      radius: SEARCH_RADIUS_KM * 1000, // Convertir km a metros
      color: '#FF0000', // Rojo puro
      weight: 3,
      opacity: 1,
      fillColor: '#FF0000',
      fillOpacity: 0.2
    }).addTo(map);
    
    console.log(`🔴 Círculo de ${SEARCH_RADIUS_KM}km creado y añadido al mapa`);

    // Filtrar cámaras por distancia
    filterCamerasByDistance();
    
    // ✅ Auto-activar checkboxes de cámaras
    const cameraCheckbox = document.getElementById('cameras-checkbox');
    const privateCameraCheckbox = document.getElementById('private-cameras-checkbox');
    
    if (cameraCheckbox && !cameraCheckbox.checked) {
      console.log('✅ Activando checkbox de cámaras públicas');
      cameraCheckbox.checked = true;
      cameraCheckbox.dispatchEvent(new Event('change', { bubbles: true }));
    }
    
    if (privateCameraCheckbox && !privateCameraCheckbox.checked) {
      console.log('✅ Activando checkbox de cámaras privadas');
      privateCameraCheckbox.checked = true;
      privateCameraCheckbox.dispatchEvent(new Event('change', { bubbles: true }));
    }

    // Centrar mapa en la ubicación
    map.setView([lat, lng], 16);
    locationMarker.openPopup();

    // Guardar última ubicación para Street View manual
    window.lastSearchLocation = { lat, lng, address: original };

    console.log(`📍 Marcador mostrado: ${original}`);
  };

  /**
   * Limpia el marcador actual y el círculo
   */
  const clearMarker = () => {
    if (locationMarker && map) {
      map.removeLayer(locationMarker);
      locationMarker = null;
    }
    
    if (radiusCircle && map) {
      map.removeLayer(radiusCircle);
      radiusCircle = null;
    }
    
    currentLocation = null;
    
    // Limpiar filtros de distancia de cámaras
    if (typeof CamerasLayer !== 'undefined' && CamerasLayer.clearLocationFilter) {
      CamerasLayer.clearLocationFilter();
    }
    if (typeof PrivateCamerasLayer !== 'undefined' && PrivateCamerasLayer.clearLocationFilter) {
      PrivateCamerasLayer.clearLocationFilter();
    }
    
    console.log('🧹 Marcador y círculo limpiados');
  };

  /**
   * Inicializa el módulo
   */
  const init = (leafletMap) => {
    map = leafletMap;
    console.log('✅ GeoLocator inicializado');
  };

  return {
    init,
    loadAddresses,
    search,
    showLocation,
    clearMarker,
    calculateDistance,
    getCurrentLocation: () => currentLocation,
    getSearchRadius: () => SEARCH_RADIUS_KM,
    getIndex: () => addressIndex,
    getAllAddresses: () => addressIndex.map(a => a.original)
  };
})();

console.log('✅ GeoLocator cargado');
