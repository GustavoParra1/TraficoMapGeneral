/**
 * 🚌 COLECTIVOS LAYER - Sistema profesional de líneas de transporte
 * Diseño: Centro de monitoreo de seguridad con análisis de cobertura de cámaras
 * Versión: 2.0 - Multi-línea escalable
 */

const ColectivosLayer = (() => {
  // ==================== ESTADO ====================
  let lineasData = {}; // { numeroLinea: { color, enabled, layer, paradas, ... } }
  let colectivosGroup = L.layerGroup();
  let cameraMarkersGroup = L.layerGroup(); // Grupo para marcadores de cámaras cercanas
  let barriosGeoJson = null;
  let allCamerasData = [];
  let lineasYaCargadas = false; // Flag para prevenir cargas múltiples
  let activeLinea = null; // Línea actualmente activa
  let mapReference = null; // Referencia al mapa para mostrar cámaras
  let filters = {
    searchQuery: '',
    selectedOperador: 'todos',
    showCoverageAnalysis: false
  };

  // Paleta de colores para líneas (24 colores distintos)
  const colorPalette = [
    '#E74C3C', '#3498DB', '#2ECC71', '#F39C12', '#9B59B6',
    '#1ABC9C', '#E67E22', '#34495E', '#C0392B', '#27AE60',
    '#2980B9', '#D35400', '#C39BD3', '#58D68D', '#154360',
    '#7D3C98', '#D68910', '#186A3B', '#00838F', '#4527A0',
    '#B71C1C', '#00695C', '#0D47A1', '#512DA8'
  ];

  // ==================== CARGA DE DATOS ====================
  /**
   * Carga múltiples archivos GeoJSON de líneas de colectivos
   * Totalmente escalable - lee del manifest cual líneas cargar por ciudad
   */
  const loadLineas = async (baseUrl, cityId = 'default') => {
    // Si ya se cargaron, retornar datos cacheados
    if (lineasYaCargadas && Object.keys(lineasData).length > 0) {
      console.log('📦 Devolviendo líneas desde cache');
      return lineasData;
    }
    
    console.log(`🚌 Cargando líneas de colectivos para: ${cityId} desde ${baseUrl}`);
    
    try {
      // Cargar manifest con configuración escalable
      let lineasAIntentarCargar = [];
      
      try {
        const response = await fetch('data/colectivos-manifest.json');
        if (response.ok) {
          const manifest = await response.json();
          console.log(`📋 Manifest disponible con ciudades:`, Object.keys(manifest));
          console.log(`🔍 Buscando entrada en manifest para: "${cityId}" (type: ${typeof cityId})`);
          
          // Buscar la ciudad específica, si no existe usar 'default'
          lineasAIntentarCargar = manifest[cityId] || manifest['default'] || [];
          
          if (manifest[cityId]) {
            console.log(`✅ Encontrada entrada EXACTA para "${cityId}" - ${lineasAIntentarCargar.length} líneas`);
          } else {
            console.warn(`⚠️ NO ENCONTRADA entrada exacta para "${cityId}" - usando "default" (${lineasAIntentarCargar.length} líneas)`);
          }
        }
      } catch (err) {
        console.warn(`⚠️ Manifest no encontrado, usando fallback`);
        // Si no hay manifest, devolver vacío y que use lo que haya en el sistema
        lineasAIntentarCargar = [];
      }
      
      // Cargar cada archivo del manifest
      let cargadas = 0;
      for (const linea of lineasAIntentarCargar) {
        const url = `${baseUrl}/${linea.archivo}`;
        try {
          console.log(`   → Cargando: ${linea.numero}...`);
          const response = await fetch(url);
          
          if (!response.ok) {
            console.log(`   ⊘ No existe: ${linea.numero}`);
            continue;
          }
          
          const geoJsonData = await response.json();
          const totalFeatures = geoJsonData.features?.length || 0;
          console.log(`   ✅ Línea ${linea.numero}: ${totalFeatures} features`);
          
          addLinea(linea.numero, geoJsonData, { numero: linea.numero, archivo: linea.archivo });
          cargadas++;
        } catch (err) {
          console.log(`   ⊘ Error línea ${linea.numero}:`, err.message);
        }
      }

      // ===== CARGAR LÍNEAS DE USUARIOS (desde localStorage) =====
      console.log(`🔍 Buscando líneas de usuarios para: ${cityId}`);
      const lineasManifestKey = `colectivos_${cityId}_manifest`;
      const lineasManifestJson = localStorage.getItem(lineasManifestKey);
      
      if (lineasManifestJson) {
        try {
          const lineasUsuario = JSON.parse(lineasManifestJson);
          console.log(`📋 Encontradas ${lineasUsuario.length} líneas de usuario para: ${cityId}`);
          
          for (const linea of lineasUsuario) {
            try {
              console.log(`   → Cargando línea de usuario: ${linea.numero}...`);
              const geoJsonStr = localStorage.getItem(linea.storageKey);
              
              if (!geoJsonStr) {
                console.log(`   ⊘ No encontrada en storage: ${linea.numero}`);
                continue;
              }
              
              const geoJsonData = JSON.parse(geoJsonStr);
              const totalFeatures = geoJsonData.features?.length || 0;
              console.log(`   ✅ Línea ${linea.numero} (usuario): ${totalFeatures} features`);
              
              addLinea(linea.numero, geoJsonData, { numero: linea.numero, archivo: linea.archivo, origen: 'usuario' });
              cargadas++;
            } catch (err) {
              console.log(`   ⊘ Error línea de usuario ${linea.numero}:`, err.message);
            }
          }
        } catch (err) {
          console.warn(`⚠️ Error parseando manifest de usuario:`, err.message);
        }
      }
      
      const numLineas = Object.keys(lineasData).length;
      console.log(`✅ ${cargadas} líneas cargadas exitosamente (Total: ${numLineas})`);
      
      lineasYaCargadas = true;
      return numLineas > 0 ? lineasData : null;
    } catch (error) {
      console.warn('⚠️ Error al cargar colectivos:', error.message);
      return null;
    }
  };

  const loadLineaFromFile = async (url, metaData) => {
    try {
      const response = await fetch(url);
      const geoJsonData = await response.json();
      
      // Extraer número de línea del nombre de archivo o metadata
      const numeroLinea = metaData.numero || metaData.linea || extractLineNumber(url);
      
      addLinea(numeroLinea, geoJsonData, metaData);
    } catch (error) {
      console.warn(`⚠️ Error cargando línea ${metaData.numero}:`, error);
    }
  };

  const extractLineNumber = (url) => {
    const match = url.match(/linea[_-]?(\d+)/i);
    return match ? match[1] : 'N/A';
  };

  /**
   * Procesa un GeoJSON que contiene múltiples líneas
   * Espera que cada feature tenga propiedad 'numero_linea' o 'linea'
   */
  const processColectivosGeoJSON = (geoJsonData) => {
    const lineasMap = new Map();
    
    geoJsonData.features?.forEach(feature => {
      const numeroLinea = feature.properties?.numero_linea || 
                         feature.properties?.linea || 
                         feature.properties?.numero;
      
      if (!numeroLinea) return;
      
      if (!lineasMap.has(numeroLinea)) {
        lineasMap.set(numeroLinea, {
          features: [],
          properties: feature.properties
        });
      }
      
      lineasMap.get(numeroLinea).features.push(feature);
    });

    // Convertir a FeatureCollections individuales
    lineasMap.forEach((datos, numeroLinea) => {
      const geoJson = {
        type: 'FeatureCollection',
        features: datos.features
      };
      addLinea(numeroLinea, geoJson, datos.properties);
    });
  };

  /**
   * Añade una línea al sistema
   */
  const addLinea = (numeroLinea, geoJsonData, metadata = {}) => {
    try {
      if (!L) {
        throw new Error('Leaflet (L) no está disponible');
      }
      
      if (!geoJsonData || !geoJsonData.features) {
        throw new Error('GeoJSON inválido o sin features');
      }

      const colorIndex = Object.keys(lineasData).length % colorPalette.length;
      const color = colorPalette[colorIndex];

      const layer = L.geoJSON(geoJsonData, {
        style: {
          color: color,
          weight: 3,
          opacity: 0.7,
          lineCap: 'round',
          lineJoin: 'round'
        },
        pointToLayer: (feature, latlng) => {
          // Para paradas (Points)
          const isParada = feature.geometry.type === 'Point';
          
          return L.circleMarker(latlng, {
            radius: isParada ? 2 : 1,
            color: isParada ? '#ffffff' : color,
            weight: isParada ? 2 : 1,
            opacity: 1,
            fillOpacity: isParada ? 1 : 0.8,
            fillColor: color
          });
        },
        onEachFeature: (feature, layer) => {
          const props = feature.properties || {};
          const isParada = feature.geometry.type === 'Point';
          
          let popupContent = `<b>🚌 Línea ${numeroLinea}</b><br>`;
          
          if (isParada) {
            popupContent += `📍 Parada<br>`;
            if (props.nombre_parada) popupContent += `<strong>${props.nombre_parada}</strong>`;
            
            // Agregar tooltip para paradas
            const tooltipContent = props.nombre_parada || 'Parada';
            layer.bindTooltip(tooltipContent, {
              permanent: false,
              direction: 'top',
              offset: [0, -10]
            });
          } else {
            // Ruta principal
            if (props.nombre) popupContent += `${props.nombre}<br>`;
            if (props.ramal) popupContent += `Ramal: ${props.ramal}<br>`;
          }
          
          layer.bindPopup(popupContent);
        }
      });

      lineasData[numeroLinea] = {
        numeroLinea,
        color,
        enabled: false,
        layer,
        metadata: metadata || {},
        geoJsonData,
        coverageInfo: null, // Será calculado cuando se habilite
        camarasCercanas: 0,
        huecosCobertura: [] // Segmentos sin cámaras
      };

      // NO agregar al grupo aquí - solo cuando se habilite con toggleLinea()
      console.log(`   ✅ Línea ${numeroLinea} creada (desactivada por defecto)`);
    } catch (err) {
      console.error(`❌ Error en addLinea(${numeroLinea}):`, err.message || err);
      throw err;
    }
  };

  // ==================== VISUALIZACIÓN & INTERACCIÓN ====================

  /**
   * Obtiene todas las líneas organizadas para la UI
   */
  const getLineasOrganizadas = () => {
    return Object.values(lineasData)
      .sort((a, b) => {
        const numA = parseInt(a.numeroLinea);
        const numB = parseInt(b.numeroLinea);
        return numA - numB;
      });
  };

  /**
   * Toggle de visibilidad de línea
   */
  const toggleLinea = (numeroLinea, estado = null) => {
    const linea = lineasData[numeroLinea];
    if (!linea) {
      console.warn(`⚠️ Línea ${numeroLinea} no encontrada`);
      return;
    }

    const newState = estado !== null ? estado : !linea.enabled;
    linea.enabled = newState;

    if (newState) {
      // Agregar al grupo si no está ya
      if (!colectivosGroup.hasLayer(linea.layer)) {
        colectivosGroup.addLayer(linea.layer);
        console.log(`✅ Línea ${numeroLinea} agregada al mapa`);
      }
      activeLinea = numeroLinea; // Guardar como línea activa
      // Calcular análisis de cobertura cuando se activa
      setTimeout(() => analyzeLineCoverage(numeroLinea), 100);
      // Mostrar cámaras cercanas
      setTimeout(() => showCamerasForLinea(numeroLinea), 150);
    } else {
      // Remover del grupo
      if (colectivosGroup.hasLayer(linea.layer)) {
        colectivosGroup.removeLayer(linea.layer);
        console.log(`✅ Línea ${numeroLinea} removida del mapa`);
      }
      // Limpiar cámaras si era la línea activa
      if (numeroLinea.toString() === activeLinea?.toString()) {
        clearCameraMarkers();
        activeLinea = null;
      }
    }

    return newState;
  };

  /**
   * Análisis de cobertura de cámaras para una línea
   */
  const analyzeLineCoverage = (numeroLinea) => {
    const linea = lineasData[numeroLinea];
    if (!linea) return;

    // Intentar obtener cámaras de varios lugares
    let cameras = allCamerasData;
    
    if (!cameras || cameras.length === 0) {
      if (typeof CamerasLayer !== 'undefined' && CamerasLayer.getAll) {
        cameras = CamerasLayer.getAll();
      }
    }

    // Si no hay cámaras, skip el análisis pero no falles
    if (!cameras || cameras.length === 0) {
      console.log(`⚠️ Sin cámaras para analizar línea ${numeroLinea}`);
      return;
    }

    let camarasCercanas = 0;
    const radioCobertura = 150; // metros

    // Extraer todos los puntos de la ruta
    const puntos = [];
    linea.geoJsonData.features?.forEach(feature => {
      if (feature.geometry.type === 'LineString') {
        feature.geometry.coordinates.forEach(coord => {
          puntos.push(L.latLng(coord[1], coord[0]));
        });
      } else if (feature.geometry.type === 'Point') {
        puntos.push(L.latLng(feature.geometry.coordinates[1], feature.geometry.coordinates[0]));
      }
    });

    if (puntos.length === 0) {
      console.warn(`⚠️ Línea ${numeroLinea} sin puntos`);
      return;
    }

    // Calcular cobertura
    const segmentosConCobertura = new Set();
    try {
      cameras.forEach(camera => {
        if (!camera) return;
        
        // Extraer coordenadas - pueden ser objeto simple o Feature de GeoJSON
        let lat, lng;
        
        if (camera.geometry && camera.geometry.type === 'Point') {
          // Es un Feature de GeoJSON
          [lng, lat] = camera.geometry.coordinates;
        } else {
          // Es un objeto simple
          lat = camera.lat || camera.latitude;
          lng = camera.lng || camera.longitude;
        }
        
        if (!lat || !lng) return;
        
        // FILTRO: Solo cámaras públicas municipales (que tengan número/id)
        // Las cámaras privadas generalmente no tienen número
        const tieneNumero = camera.numero || camera.properties?.numero || camera.id || camera.properties?.id;
        if (!tieneNumero) {
          return; // Skip cámaras sin número (privadas)
        }
        
        const cameraPunto = L.latLng(lat, lng);
        
        puntos.forEach((punto, idx) => {
          if (cameraPunto.distanceTo(punto) <= radioCobertura) {
            camarasCercanas++;
            segmentosConCobertura.add(Math.floor(idx / 5)); // Agrupar en segmentos
          }
        });
      });
    } catch (e) {
      console.warn(`⚠️ Error analizando cobertura para línea ${numeroLinea}:`, e);
    }

    const cobertura = segmentosConCobertura.size > 0 
      ? (segmentosConCobertura.size / Math.ceil(puntos.length / 5)) * 100 
      : 0;

    linea.coverageInfo = {
      camarasCercanas: camarasCercanas,
      porcentajeCobertura: cobertura,
      timestamp: new Date()
    };

    console.log(`📊 Línea ${numeroLinea}: ${camarasCercanas} cámaras, ${cobertura.toFixed(1)}% cobertura`);
  };

  /**
   * Obtiene cámaras que cubren una línea específica (solo cámaras públicas)
   */
  const getCamerasParaLinea = (numeroLinea) => {
    const linea = lineasData[numeroLinea];
    if (!linea) return [];

    // Obtener cámaras
    let cameras = allCamerasData || [];
    if (cameras.length === 0 && typeof CamerasLayer !== 'undefined' && CamerasLayer.getAll) {
      const camFromLayer = CamerasLayer.getAll();
      if (camFromLayer && camFromLayer.length > 0) {
        cameras = camFromLayer;
      }
    }

    if (!cameras || cameras.length === 0) {
      console.log(`⚠️ Sin cámaras disponibles para línea ${numeroLinea}`);
      return [];
    }

    const radioCobertura = 150; // metros
    const camasParaLinea = [];

    const puntos = [];
    linea.geoJsonData.features?.forEach(feature => {
      if (!feature.geometry) return;
      
      if (feature.geometry.type === 'LineString') {
        feature.geometry.coordinates.forEach(coord => {
          puntos.push(L.latLng(coord[1], coord[0]));
        });
      } else if (feature.geometry.type === 'Point') {
        puntos.push(L.latLng(feature.geometry.coordinates[1], feature.geometry.coordinates[0]));
      }
    });

    if (puntos.length === 0) return [];

    try {
      cameras.forEach(camera => {
        if (!camera) return;
        
        // Extraer coordenadas - pueden ser objeto simple o Feature de GeoJSON
        let lat, lng;
        
        if (camera.geometry && camera.geometry.type === 'Point') {
          // Es un Feature de GeoJSON
          [lng, lat] = camera.geometry.coordinates;
        } else {
          // Es un objeto simple
          lat = camera.lat || camera.latitude;
          lng = camera.lng || camera.longitude;
        }
        
        if (!lat || !lng) return;
        
        // FILTRO: Solo cámaras públicas municipales (que tengan número/id)
        // Las cámaras privadas generalmente no tienen número
        const tieneNumero = camera.numero || camera.properties?.numero || camera.id || camera.properties?.id;
        
        if (!tieneNumero) {
          return; // Skip cámaras sin número (privadas)
        }
        
        const cameraPunto = L.latLng(lat, lng);
        
        const distancias = puntos.map(p => cameraPunto.distanceTo(p));
        const distanciaMinima = Math.min(...distancias);
        
        if (distanciaMinima <= radioCobertura) {
          camasParaLinea.push({
            ...camera,
            distancia: distanciaMinima
          });
        }
      });
    } catch (e) {
      console.warn(`⚠️ Error obteniendo cámaras para línea ${numeroLinea}:`, e);
    }

    return camasParaLinea.sort((a, b) => a.distancia - b.distancia);
  };

  /**
   * Centra el mapa en una línea específica
   */
  const focusLinea = (numeroLinea) => {
    const linea = lineasData[numeroLinea];
    if (!linea || !window.mymap) return;

    try {
      const bounds = L.geoJSON(linea.geoJsonData).getBounds();
      window.mymap.fitBounds(bounds, { padding: [50, 50] });
    } catch (e) {
      console.warn('Error al centrar en línea:', e);
    }
  };

  // ==================== FILTROS ====================

  const setFilter = (tipo, valor) => {
    filters[tipo] = valor;
    // Trigger UI update aquí si existe listener
  };

  const getLineasFiltradas = () => {
    return getLineasOrganizadas().filter(linea => {
      const queryMatch = !filters.searchQuery || 
                        linea.numeroLinea.toString().includes(filters.searchQuery);
      
      return queryMatch;
    });
  };

  /**
   * Muestra las cámaras cercanas a una línea en el mapa
   */
  const showCamerasForLinea = (numeroLinea) => {
    // Limpiar marcadores anteriores
    cameraMarkersGroup.clearLayers();
    
    console.log(`🚌 showCamerasForLinea(${numeroLinea}) - Obteniendo cámaras...`);
    const cameras = getCamerasParaLinea(numeroLinea);
    console.log(`📹 Cámaras obtenidas:`, cameras?.length || 0);
    
    if (!cameras || cameras.length === 0) {
      console.log(`ℹ️ Sin cámaras para línea ${numeroLinea}`);
      return;
    }

    // Agrupar cámaras por ubicación (si hay múltiples en el mismo lugar)
    const camerasAgrupadas = {};
    cameras.forEach(cam => {
      // Extraer coordenadas
      let lat, lng;
      
      if (cam.geometry && cam.geometry.type === 'Point') {
        [lng, lat] = cam.geometry.coordinates;
      } else {
        lat = cam.lat || cam.latitude;
        lng = cam.lng || cam.longitude;
      }
      
      if (!lat || !lng) return;
      
      // Usar coordenadas redondeadas como clave (agrupar cercanas)
      const key = `${lat.toFixed(5)},${lng.toFixed(5)}`;
      
      if (!camerasAgrupadas[key]) {
        camerasAgrupadas[key] = {
          lat,
          lng,
          cameras: []
        };
      }
      camerasAgrupadas[key].cameras.push(cam);
    });

    console.log(`📍 Cámaras agrupadas por ubicación:`, Object.keys(camerasAgrupadas).length);
    
    // Crear marcador para cada ubicación (mostrando solo el primero)
    Object.values(camerasAgrupadas).forEach(grupo => {
      const primeraCamara = grupo.cameras[0];
      
      // Intentar extraer el número de varias posibles ubicaciones
      let numero = null;
      
      // Intentar obtener de propiedades diréctas
      if (primeraCamara.numero) numero = primeraCamara.numero;
      else if (primeraCamara.properties?.numero) numero = primeraCamara.properties.numero;
      else if (primeraCamara.id) numero = primeraCamara.id;
      else if (primeraCamara.properties?.id) numero = primeraCamara.properties.id;
      else if (primeraCamara.properties?.['numero_camara']) numero = primeraCamara.properties['numero_camara'];
      else if (primeraCamara['numero_camara']) numero = primeraCamara['numero_camara'];
      
      // Si no encontró número, intentar extraerlo del nombre (ej: "Cámara 291")
      if (!numero) {
        const nombreCompleto = primeraCamara.nombre || primeraCamara.properties?.nombre;
        if (nombreCompleto) {
          const match = nombreCompleto.match(/\d+/);
          if (match) numero = match[0];
        }
      }
      
      numero = numero || '?';
      
      const nombre = primeraCamara.nombre || primeraCamara.properties?.nombre || `Cámara ${numero}`;
      
      console.log(`📹 Cámara encontrada - Número: ${numero}, Nombre: ${nombre}`);
      
      const marker = L.marker([grupo.lat, grupo.lng], {
        icon: L.divIcon({
          html: `<div style="
            width: 30px;
            height: 30px;
            background: #00d4ff;
            border: 2px solid #fff;
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 11px;
            font-weight: bold;
            color: white;
            box-shadow: 0 0 10px rgba(0, 212, 255, 0.6);
            font-family: Arial, sans-serif;
          ">${numero}</div>`,
          iconSize: [30, 30],
          className: 'colectivos-camera-marker'
        })
      });
      
      let popupContent = `<b>📹 ${nombre}</b><br>Distancia: ${primeraCamara.distancia?.toFixed(0) || '?'}m`;
      if (grupo.cameras.length > 1) {
        popupContent += `<br><small>(${grupo.cameras.length} cámaras en esta ubicación)</small>`;
      }
      
      marker.bindPopup(popupContent);
      marker.bindTooltip(`${nombre}`, { permanent: false, direction: 'top' });
      
      cameraMarkersGroup.addLayer(marker);
    });

    // Agregar el grupo al mapa
    if (mapReference) {
      cameraMarkersGroup.addTo(mapReference);
      console.log(`✅ ${Object.keys(camerasAgrupadas).length} ubicaciones de cámaras mostradas en el mapa`);
    } else {
      console.warn('⚠️ mapReference no disponible - Las cámaras no se mostrarán en el mapa');
    }
  };

  /**
   * Limpia los marcadores de cámaras del mapa
   */
  const clearCameraMarkers = () => {
    cameraMarkersGroup.clearLayers();
  };

  // ==================== API PÚBLICA ====================

  return {
    init: (map) => {
      console.log('🚌 ColectivosLayer.init() - Agregando grupo al mapa');
      mapReference = map; // Guardar referencia al mapa
      colectivosGroup.addTo(map);
      cameraMarkersGroup.addTo(map); // Agregar grupo de cámaras también
      console.log('✅ Grupo de colectivos agregado al mapa');
    },
    resetCache: () => {
      console.log('🔄 Reseteando caché de líneas de colectivos');
      lineasYaCargadas = false;
      Object.keys(lineasData).forEach(key => delete lineasData[key]);
      colectivosGroup.clearLayers();
      cameraMarkersGroup.clearLayers();
    },
    loadLineas,
    addLinea,
    toggleLinea,
    toggleAll: (estado) => {
      Object.keys(lineasData).forEach(num => toggleLinea(num, estado));
    },
    getLayer: () => colectivosGroup,
    getLineas: () => lineasData,
    getLineasOrganizadas,
    getLineasFiltradas,
    setFilter,
    analyzeLineCoverage,
    getCamerasParaLinea,
    focusLinea,
    showCamerasForLinea,
    clearCameraMarkers,
    setCamerasData: (cameras) => {
      allCamerasData = cameras;
      console.log(`✅ ColectivosLayer: ${cameras?.length || 0} cámaras cargadas`);
    },
    setBarriosGeoJson: (data) => { barriosGeoJson = data; },
    getLinea: (numeroLinea) => lineasData[numeroLinea],
    getCoverageInfo: (numeroLinea) => lineasData[numeroLinea]?.coverageInfo,
    __state: () => lineasData // Debug
  };
})();

console.log('✅ ColectivosLayer cargado - Sistema de múltiples líneas listo');
