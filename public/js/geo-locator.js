/**
 * 🗺️ GEO-LOCATOR: Búsqueda de direcciones
 * Usa Google Maps Geocoding API directamente desde el navegador
 */

const GeoLocator = (() => {
  const GOOGLE_MAPS_API_KEY = 'AIzaSyBp2ZiKA4lYieyjX_aJJjE023NeqKrRhJc';
  
  let addressIndex = [];
  let locationMarker = null;
  let map = null;
  let currentCity = 'cordoba'; // Ciudad actual

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
   * 1. Intenta búsqueda local (rápido)
   * 2. Falls back a servidor API para Nominatim (preciso)
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
      console.log(`🔄 Búsqueda por cruce detectada: "${intersectionMatch[1]}" Y "${intersectionMatch[2]}"`);
    }

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

      // Si es búsqueda por cruce, buscar ambas calles
      if (isIntersection) {
        const [, calle1, calle2] = intersectionMatch;
        const normCalle1 = normalizeText(calle1);
        const normCalle2 = normalizeText(calle2);

        // Detectar si la dirección contiene ambas calles (en cualquier orden)
        const hasIntersection = 
          (normAddr.includes(normCalle1) && normAddr.includes(normCalle2)) ||
          (normAddr.includes(normCalle2) && normAddr.includes(normCalle1));

        if (hasIntersection) {
          const key = `${coordinates[0]}-${coordinates[1]}`;
          if (!seen.has(key)) {
            seen.add(key);
            results.push({
              ...address,
              relevance: 95,
              matchType: 'cruce'
            });
          }
          return;
        }

        // Búsqueda fuzzy para cruces: si encuentra una calle, buscar similares
        const hasCalle1 = normAddr.includes(normCalle1);
        const hasCalle2 = normAddr.includes(normCalle2);
        
        if (hasCalle1 || hasCalle2) {
          const dist1 = levenshteinDistance(normCalle1, normAddr);
          const dist2 = levenshteinDistance(normCalle2, normAddr);
          const similarity = Math.max(
            1 - (dist1 / Math.max(normCalle1.length, normAddr.length)),
            1 - (dist2 / Math.max(normCalle2.length, normAddr.length))
          );

          if (similarity > 0.6) {
            const key = `${coordinates[0]}-${coordinates[1]}`;
            if (!seen.has(key)) {
              seen.add(key);
              results.push({
                ...address,
                relevance: Math.round(similarity * 80),
                matchType: 'cruce_fuzzy'
              });
            }
          }
        }
      }
    });

    // PASO 2: Si aún no hay resultados, búsqueda fuzzy general en datos locales
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

    // PASO 3: Si SIGUE sin resultados, usar Google Maps Geocoding API directamente
    if (results.length === 0) {
      console.log(`🌐 Sin resultados locales. Consultando Google Maps Geocoding API...`);
      
      try {
        // Configurar ciudad según municipio
        const cityNames = {
          'cordoba': 'Córdoba, Argentina',
          'rosario': 'Rosario, Argentina',
          'mar-del-plata': 'Mar del Plata, Argentina'
        };
        
        const cityName = cityNames[currentCity] || 'Córdoba, Argentina';
        const googleQuery = isIntersection ? `${query}, ${cityName}` : `${query}, ${cityName}`;
        
        const googleUrl = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(googleQuery)}&key=${GOOGLE_MAPS_API_KEY}`;
        console.log(`  📡 Llamando Google Maps: ${query} in ${cityName}`);
        
        const response = await fetch(googleUrl);
        const data = await response.json();

        if (data.results && data.results.length > 0) {
          const result = data.results[0];
          const lat = result.geometry.location.lat;
          const lng = result.geometry.location.lng;
          const formattedAddress = result.formatted_address;
          
          console.log(`✅ Encontrado en Google Maps:`, formattedAddress);
          
          results.push({
            original: formattedAddress,
            normalized: normalizeText(formattedAddress),
            lat: lat,
            lng: lng,
            coordinates: [lng, lat],
            matchType: isIntersection ? 'google_cruce' : 'google_address',
            relevance: 90,
            source: 'google-maps',
            googleResponse: result
          });
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

    // Crear nuevo marcador con ícono funcional
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

    // Centrar mapa en la ubicación
    map.setView([lat, lng], 16);
    locationMarker.openPopup();

    console.log(`📍 Marcador mostrado: ${original}`);
  };

  /**
   * Limpia el marcador actual
   */
  const clearMarker = () => {
    if (locationMarker && map) {
      map.removeLayer(locationMarker);
      locationMarker = null;
      console.log('🧹 Marcador limpiado');
    }
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
    getIndex: () => addressIndex,
    getAllAddresses: () => addressIndex.map(a => a.original)
  };
})();

console.log('✅ GeoLocator cargado');
