/**
 * 🗺️ GEO-LOCATOR: Búsqueda de direcciones
 * Usa el endpoint /api/geocode del servidor para búsquedas precisas
 */

const GeoLocator = (() => {
  let addressIndex = [];
  let locationMarker = null;
  let map = null;
  let currentCity = 'cordoba';

  /**
   * Normaliza texto: elimina acentos, convierte a minúsculas, limpia espacios
   */
  const normalizeText = (text) => {
    return text
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/\s+/g, ' ')
      .trim();
  };

  /**
   * Carga todas las direcciones del GeoJSON de siniestros para búsqueda local
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

    console.log(`✅ GeoLocator: ${addressIndex.length} direcciones locales cargadas`);
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
   * Busca direcciones: primero locales, luego en el servidor si no encuentra
   */
  const search = async (query) => {
    if (!query || query.trim().length === 0) return [];

    const normalized = normalizeText(query);
    const results = [];
    const seen = new Set();

    // Detectar si es búsqueda por cruce
    const intersectionMatch = normalized.match(/^(.+?)\s+(?:y|e)\s+(.+)$/);
    const isIntersection = intersectionMatch !== null;

    console.log(`🔍 Buscando: "${query}" (ciudad: ${currentCity})`);

    // PASO 1: Búsqueda exacta o parcial en datos locales
    addressIndex.forEach(address => {
      const { original, normalized: normAddr, coordinates } = address;

      // Búsqueda exacta
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

      // Búsqueda parcial
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

      // Búsqueda por cruce en datos locales
      if (isIntersection) {
        const [, calle1, calle2] = intersectionMatch;
        const normCalle1 = normalizeText(calle1);
        const normCalle2 = normalizeText(calle2);

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
      }
    });

    // PASO 2: Si no hay resultados locales, buscar en el servidor
    if (results.length === 0) {
      console.log(`🌐 No encontrado localmente. Buscando en servidor...`);
      
      try {
        const response = await fetch(`/api/geocode?address=${encodeURIComponent(query)}&city=${currentCity}`);
        const data = await response.json();

        if (data.success) {
          console.log(`✅ Encontrado en servidor: ${data.address}`);
          
          results.push({
            original: data.address,
            normalized: normalizeText(data.address),
            lat: data.lat,
            lng: data.lng,
            coordinates: [data.lng, data.lat],
            matchType: data.source.includes('intersection') ? 'nominatim_cruce' : 'nominatim_address',
            relevance: 85,
            source: 'nominatim'
          });
        } else {
          console.log(`❌ No encontrado en servidor: ${data.message}`);
        }
      } catch (error) {
        console.error(`❌ Error al consultar servidor:`, error);
      }
    }

    // Ordenar resultados
    results.sort((a, b) => {
      const priorityOrder = { exacta: 0, cruce: 1, parcial: 2, nominatim_cruce: 3, nominatim_address: 4 };
      const priorityA = priorityOrder[a.matchType] ?? 5;
      const priorityB = priorityOrder[b.matchType] ?? 5;
      
      if (priorityA !== priorityB) return priorityA - priorityB;
      return b.relevance - a.relevance;
    });

    console.log(`📊 Resultados: ${results.length}`);
    return results.slice(0, 50);
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

    // Obtener coordenadas
    let lat, lng;
    
    if (address.coordinates && Array.isArray(address.coordinates)) {
      [lng, lat] = address.coordinates;
    } else if (address.lat && address.lng) {
      lat = address.lat;
      lng = address.lng;
    } else {
      console.error('❌ No se pudieron obtener coordenadas', address);
      return;
    }
    
    console.log(`📍 Marcador en: lat=${lat}, lng=${lng}`);
    
    const original = address.original || `Lat: ${lat.toFixed(4)}, Lng: ${lng.toFixed(4)}`;

    // Remover marcador anterior
    if (locationMarker) {
      map.removeLayer(locationMarker);
    }

    // Crear nuevo marcador
    locationMarker = L.marker([lat, lng], {
      icon: L.icon({
        iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-gold.png',
        shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
        iconSize: [25, 41],
        iconAnchor: [12, 41],
        popupAnchor: [1, -34],
        shadowSize: [41, 41]
      })
    })
      .bindPopup(`<strong>📍 ${original}</strong><br>Lat: ${lat.toFixed(4)}<br>Lng: ${lng.toFixed(4)}`)
      .addTo(map);

    // Centrar mapa
    map.setView([lat, lng], 16);
    locationMarker.openPopup();

    console.log(`✅ Marcador mostrado: ${original}`);
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
