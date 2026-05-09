// ====================================================
// MÓDULO: Carga y Filtrado de Siniestros
// ====================================================

const SiniestrosLayer = (() => {
  let sinistrosData = [];
  let filteredSiniestros = [];
  let sinistrosLayer = null;
  let map = null;
  let barriosGeoJson = null; // Para filtrado geográfico
  let isVisible = false; // Rastrear si la capa debe ser visible

  // Mapeo de códigos a categorías generales
  const participantMap = {
    'A': 'Auto',
    'M': 'Moto',
    'P': 'Peatón',
    'CAM': 'Camión',
    'B': 'Bicicleta'
  };

  // Colores por causa (normalizada) - Mejorados para mejor visibilidad
  const causeColors = {
    'Distracción': '#FF1744',              // Rojo vivo
    'Exceso de Velocidad': '#FF6F00',      // Naranja oscuro
    'Alcohol': '#D32F2F',                  // Rojo oscuro
    'Avería': '#FFA500',                   // Naranja
    'Falta de Visibilidad': '#FF00FF',     // Magenta
    'Giro Prohibido': '#9C27B0',           // Púrpura
    'Maniobra Indebida': '#FF4500',        // Naranja rojo
    'Maniobra Riesgosa': '#C2185B',        // Rosa oscura
    'No Respetar Norma': '#00C853',        // Verde brillante
    'No Se Puede Determinar': '#616161',   // Gris
    'Peatón': '#0D47A1',                   // Azul oscuro
    'Pierde Control': '#B71C1C',           // Rojo muy oscuro
    'Piso Inseguro': '#E91E63',            // Rosa fuerte
    'Violación de Semáforo': '#FF8F00',   // Naranja oscuro
    'Defecto Fatal': '#4A148C',            // Púrpura oscuro
    'Descompensación': '#7B1FA2',          // Púrpura oscuro
    'Inexperiencia/Conducción': '#FF8A65', // Naranja claro
    'Persecución': '#C2185B',              // Rosa oscuro
    'No Especificado': '#FF4444',          // Rojo brillante
    'Punto': '#00B8D4'                     // Cian vibrante (fallback temporal)
  };

  const causeMap = {
    'D': { name: 'Distracción', code: 'D' },
    'A': { name: 'Alcohol', code: 'A' },
    'AV': { name: 'Avería', code: 'AV' },
    'EV': { name: 'Exceso de Velocidad', code: 'EV' },
    'FV': { name: 'Falta de Visibilidad', code: 'FV' },
    'G': { name: 'Giro Prohibido', code: 'G' },
    'MI': { name: 'Maniobra Indebida', code: 'MI' },
    'MR': { name: 'Maniobra Riesgosa', code: 'MR' },
    'NR': { name: 'No Respetar Norma', code: 'NR' },
    'NSD': { name: 'No Se Puede Determinar', code: 'NSD' },
    'P': { name: 'Peatón', code: 'P' },
    'PC': { name: 'Pierde Control', code: 'PC' },
    'PI': { name: 'Piso Inseguro', code: 'PI' },
    'VS': { name: 'Violación de Semáforo', code: 'VS' },
    'DF': { name: 'Defecto Fatal', code: 'DF' },
    'DESCOMPENSAN': { name: 'Descompensación', code: 'DESCOMPENSAN' },
    'IC': { name: 'Inexperiencia/Conducción', code: 'IC' },
    'PERSECUCIÓN': { name: 'Persecución', code: 'PERSECUCIÓN' },
    '?': { name: 'No Especificado', code: '?' }
  };

  /**
   * Extrae categorías generales de un código de participantes
   * Ejemplo: "A/M" → ["Auto", "Moto"]
   */
  function extractParticipantCategories(code) {
    if (!code) return [];
    const codes = code.split('/').map(c => c.trim());
    const categories = new Set();
    codes.forEach(c => {
      if (participantMap[c]) {
        categories.add(participantMap[c]);
      }
    });
    return Array.from(categories);
  }

  /**
   * Normaliza un código de causa a su categoría general
   */
  function normalizeCause(cause) {
    if (!cause) return { name: 'No Especificado', code: 'N/A' };
    const mapping = causeMap[cause];
    if (mapping) {
      return mapping;
    }
    // Si no está mapeado, retornar con el código original
    return { name: cause, code: cause };
  }

  // Filtros activos
  const filters = {
    globalBarrio: 'all',  // Filtro global de barrio (ÚNICO filtro de barrio)
    year: 'all',
    participant: 'all',
    cause: 'all',
    startHour: 'all',
    endHour: 'all',
    street: ''
  };

  /**
   * Inicializa el módulo
   */
  function init(leafletMap) {
    map = leafletMap;
    console.log('✅ SiniestrosLayer inicializado');
  }

  /**
   * Carga los siniestros desde GeoJSON
   */
  /**
   * Carga los siniestros desde GeoJSON (para datos importados/data URLs)
   */
  function loadSinistrosFromGeoJson(geojson) {
    try {
      sinistrosData = geojson.features || [];
      
      console.log(`✅ Cargados ${sinistrosData.length} siniestros desde GeoJSON`);
      
      // Extraer valores únicos para filtros
      updateFilterOptions();
      
      return sinistrosData;
    } catch (error) {
      console.error('❌ Error cargando siniestros desde GeoJSON:', error);
      return [];
    }
  }

  async function loadSiniestros(geojsonPath) {
    try {
      // Cache busting para evitar cache del navegador
      const cacheBustUrl = geojsonPath + '?t=' + Date.now();
  
      const response = await fetch(cacheBustUrl);
      const geojson = await response.json();
      sinistrosData = geojson.features || [];
      
      console.log(`✅ Cargados ${sinistrosData.length} siniestros`);
      

      
      // Extraer valores únicos para filtros
      updateFilterOptions();
      
      // Si el layer ya está visible, renderizar ahora que los datos están listos
      if (isVisible) {
        console.log('🔄 Renderizando siniestros ahora que están cargados...');
        applyFilters();
      }
      
      return sinistrosData;
    } catch (error) {
      console.error('❌ Error cargando siniestros:', error);
      return [];
    }
  }

  /**
   * Actualiza las opciones de los filtros
   */
  function updateFilterOptions() {
    const years = new Set();
    const barrios = new Set();
    const participants = new Set();
    const causes = new Set();
    const hours = new Set();

    // Helper para buscar propiedades flexiblemente (sin importar encoding)
    const getProp = (props, keys) => {
      for (const key of keys) {
        if (props[key]) return props[key];
      }
      // Si no encuentra, buscar por coincidencia parcial (case-insensitive)
      const searchKeys = keys.map(k => k.toLowerCase());
      for (const [propKey, propVal] of Object.entries(props)) {
        if (searchKeys.some(sk => propKey.toLowerCase().includes(sk))) {
          return propVal;
        }
      }
      return null;
    };

    // Función auxiliar para normalizar propiedades
    const normalizeFilterProps = (props) => {
      const normalized = {};
      normalized.causa = getProp(props, ['causa', 'Causa', 'tipo', 'Tipo', 'CÓDIGOS CAUSAS', 'CàDIGOS CAUSAS', 'C?DIGOS CAUSAS', 'CODIGOS CAUSAS']);
      normalized.fecha = getProp(props, ['fecha', 'Fecha', 'FECHA', 'FECHA_SINIESTRO']);
      normalized.hora = getProp(props, ['hora', 'Hora', 'HORA']);
      normalized.participantes = getProp(props, ['participantes_codigos', 'Participante', 'CÓDIGO PARTICIPANTES', 'C?DIGO PARTICIPANTES', 'participantes']);
      return normalized;
    };

    sinistrosData.forEach(feature => {
      const props = normalizeFilterProps(feature.properties || {});
      
      const fecha = props.fecha;
      const hora = props.hora;
      const causa = props.causa;
      const participantes = props.participantes;
      
      if (fecha) {
        try {
          // Parsear fecha en formato DD/MM/YY o DD/MM/YYYY
          const parts = fecha.split('/');
          if (parts.length === 3) {
            const [d, m, y] = parts;
            // Si y tiene 4 dígitos (YYYY), usar directamente; si tiene 2 (YY), agregar '20'
            const year = y.length === 4 ? parseInt(y) : parseInt('20' + y);
            if (!isNaN(year)) years.add(year);
          } else {
            // Intentar parsear como ISO (YYYY-MM-DD)
            const year = new Date(fecha).getFullYear();
            if (!isNaN(year)) years.add(year);
          }
        } catch (e) {
          // Silenciosamente ignorar si no se puede parsear
        }
      }
      
      // Extraer categorías generales de participantes
      if (participantes) {
        const categories = extractParticipantCategories(participantes);
        categories.forEach(cat => participants.add(cat));
      }
      
      // Normalizar y agregar causa
      if (causa) {
        // Agregar el código original de causa para tracking
        causes.add(causa);
      }
      
      if (hora) {
        try {
          const hour = parseInt(hora.split(':')[0]);
          if (!isNaN(hour)) hours.add(hour);
        } catch (e) {
          // Ignorar horas que no se pueden parsear
        }
      }
    });

    // Actualizar selectores
    
    updateSelect('year-filter', Array.from(years).sort((a, b) => b - a));
    updateSelect('participant-filter', Array.from(participants).sort());
    
    // Formatear causas con código y descripción
    const causesFormatted = Array.from(causes).map(causeCode => {
      const mapping = causeMap[causeCode] || { name: causeCode, code: causeCode };
      return `${mapping.code} - ${mapping.name}`;
    }).sort();
    
    updateSelect('cause-filter', causesFormatted);
    
    // Para barrios, cargar desde el archivo de barrios si está disponible
    loadBarriosList();
    
    // Actualizar horas
    const sortedHours = Array.from(hours).sort((a, b) => a - b);
    updateSelect('start-hour-filter', sortedHours.map(h => h.toString().padStart(2, '0') + ':00'));
    updateSelect('end-hour-filter', sortedHours.map(h => h.toString().padStart(2, '0') + ':00'));
  }

  /**
   * Carga los datos de barrios para filtrado geográfico
   * IMPORTANTE: Solo carga si NO ya fueron seteados desde app.js (para ciudades como Córdoba)
   */
  async function loadBarriosList() {
    // Si ya hay barrios (fueron seteados desde app.js), NO cargar de nuevo
    if (barriosGeoJson && barriosGeoJson.features && barriosGeoJson.features.length > 0) {
      console.log(`✅ Datos de barrios ya disponibles (${barriosGeoJson.features.length} features)`);
      return;
    }
    
    // Solo cargar barrios.json si No hay datos seteados
    try {
      console.log(`⏳ Intentando cargar barrios desde /data/barrios.json...`);
      const response = await fetch('/data/barrios.json');
      barriosGeoJson = await response.json();
      console.log(`✅ Datos de barrios cargados para filtrado geográfico (${barriosGeoJson.features?.length || 0} features)`);
    } catch (error) {
      console.warn('⚠️ No se pudieron cargar los barrios:', error);
    }
  }

  /**
   * Verifica si un punto [lng, lat] está dentro de un polígono GeoJSON
   */
  function pointInPolygon(point, polygon) {
    if (!polygon) return false;
    
    const [lng, lat] = point;
    let inside = false;

    if (polygon.type === 'Polygon') {
      const coords = polygon.coordinates[0];
      for (let i = 0, j = coords.length - 1; i < coords.length; j = i++) {
        const xi = coords[i][0], yi = coords[i][1];
        const xj = coords[j][0], yj = coords[j][1];
        
        const intersect = ((yi > lat) !== (yj > lat))
          && (lng < (xj - xi) * (lat - yi) / (yj - yi) + xi);
        if (intersect) inside = !inside;
      }
    } else if (polygon.type === 'MultiPolygon') {
      // MultiPolygon: coordinates is array of polygons
      // Each polygon has array of rings
      for (let polyIdx = 0; polyIdx < polygon.coordinates.length; polyIdx++) {
        const poly = polygon.coordinates[polyIdx];
        
        // poly is array of rings, poly[0] is outer ring
        if (!poly || !poly[0]) {
          console.warn(`   ⚠️ MultiPolygon poly ${polyIdx} tiene estructura inválida`);
          continue;
        }
        
        const coords = poly[0];
        let insideCurrent = false;
        
        for (let i = 0, j = coords.length - 1; i < coords.length; j = i++) {
          const xi = coords[i][0], yi = coords[i][1];
          const xj = coords[j][0], yj = coords[j][1];
          
          const intersect = ((yi > lat) !== (yj > lat))
            && (lng < (xj - xi) * (lat - yi) / (yj - yi) + xi);
          if (intersect) insideCurrent = !insideCurrent;
        }
        
        if (insideCurrent) {
          inside = true;
          break;
        }
      }
    }
    
    return inside;
  }

  /**
   * Obtiene el barrio que contiene un punto
   */
  function getBarrioForPoint(point) {
    if (!barriosGeoJson) {
      console.warn('⚠️ barriosGeoJson no está disponible en SiniestrosLayer');
      return null;
    }
    
    const totalBarrios = barriosGeoJson.features?.length || 0;
    let testCounter = 0;
    
    for (let i = 0; i < totalBarrios; i++) {
      const feature = barriosGeoJson.features[i];
      
      // Verificar estructura del geometry antes de pasar a pointInPolygon
      if (!feature.geometry || !feature.geometry.coordinates) {
        continue;
      }
      
      const match = pointInPolygon(point, feature.geometry);
      
      if (match) {
        const barrio = feature.properties?.nombre || feature.properties?.soc_fomen;
        return barrio;
      }
    }
    
    return null;
  }

  /**
   * Actualiza un elemento select con opciones
   */
  function updateSelect(id, options) {
    const select = document.getElementById(id);
    if (!select) {
      console.warn(`⚠️ No se encontró select #${id}`);
      return;
    }

    const selectedValue = select.value;
    const defaultOption = select.options[0];

    // Limpiar opciones excepto la primera
    while (select.options.length > 1) {
      select.remove(1);
    }

    // Agregar nuevas opciones
    if (Array.isArray(options)) {
      options.forEach(option => {
        const opt = document.createElement('option');
        opt.value = String(option);
        opt.textContent = String(option);
        select.appendChild(opt);
      });
    }

    // Restaurar selección si existe
    if (selectedValue !== 'all' && Array.from(select.options).some(o => o.value === selectedValue)) {
      select.value = selectedValue;
    }
  }

  /**
   * Aplica los filtros actuales
   */
  function applyFilters() {
    // No hacer nada si la capa no está visible
    if (!isVisible) {
      console.log('⏭️ Saltando applyFilters: capa no visible');
      return;
    }
    
    // DEBUG: Mostrar estado de filtros
    if (filters.globalBarrio !== 'all') {
      console.log(`🔍 applyFilters() - Filtro de barrio activo:`, {
        filtroGlobalBarrio: filters.globalBarrio,
        barriosGeoJsonDisponible: !!barriosGeoJson,
        barriosCount: barriosGeoJson?.features?.length || 0,
        registrosTotales: sinistrosData.length
      });
    }
    
    let debugCount = 0;
    filteredSiniestros = sinistrosData.filter(feature => {
      const props = feature.properties || {};

      // Helper para buscar propiedades flexiblemente (sin importar encoding)
      const getProp = (keys) => {
        for (const key of keys) {
          if (props[key]) return props[key];
        }
        // Si no encuentra, buscar por coincidencia parcial (case-insensitive)
        const searchKeys = keys.map(k => k.toLowerCase());
        for (const [propKey, propVal] of Object.entries(props)) {
          if (searchKeys.some(sk => propKey.toLowerCase().includes(sk))) {
            return propVal;
          }
        }
        return null;
      };

      // Normalizar nombres de propiedades (soportar CSV con diferentes nombres de columnas)
      const fecha = getProp(['fecha', 'Fecha', 'FECHA', 'FECHA_SINIESTRO']);
      const hora = getProp(['hora', 'Hora', 'HORA']);
      const causa = getProp(['causa', 'Causa', 'tipo', 'Tipo', 'CÓDIGOS CAUSAS', 'CàDIGOS CAUSAS', 'C?DIGOS CAUSAS', 'CODIGOS CAUSAS']);
      const participantes = getProp(['participantes_codigos', 'Participante', 'CÓDIGO PARTICIPANTES', 'C?DIGO PARTICIPANTES']);
      const calle = getProp(['direccion', 'Calle', 'calle', 'DIRECCIÓN SINIESTRO', 'DIRECCION SINIESTRO']);

      // Filtro por año
      if (filters.year !== 'all') {
        try {
          let year;
          if (fecha && fecha.includes('/')) {
            // Formato DD/MM/YY o DD/MM/YYYY
            const parts = fecha.split('/');
            if (parts.length === 3) {
              const [d, m, y] = parts;
              // Si y tiene 4 dígitos, usar directamente; si tiene 2, agregar '20'
              year = y.length === 4 ? parseInt(y) : parseInt('20' + y);
            }
          } else if (fecha) {
            // Formato ISO
            year = new Date(fecha).getFullYear();
          }
          if (!year || year !== parseInt(filters.year)) return false;
        } catch (e) {
          return false;
        }
      }

      // Filtro por barrio global (prioritario)
      if (filters.globalBarrio !== 'all') {
        const coords = feature.geometry?.coordinates;
        if (coords && coords.length === 2) {
          // DEBUG: Solo para los primeros 2 siniestros, log muy detallado
          if (debugCount < 2) {
            console.log(`\n🔍🔍🔍 SINIESTRO [${debugCount}] coords: [${coords[0]}, ${coords[1]}]`);
            console.log(`   Filtro activo: "${filters.globalBarrio}"`);
            console.log(`   Buscando en ${barriosGeoJson?.features?.length || 0} barrios...`);
          }
          
          const sinBarrio = getBarrioForPoint(coords);
          
          if (debugCount < 2) {
            console.log(`   RESULTADO FINAL: sinBarrio = "${sinBarrio}"`);
            console.log(`   ¿Coincide con filtro? ${sinBarrio === filters.globalBarrio}`);
            console.log(`🔍🔍🔍\n`);
          }
          debugCount++;
          
          // Si el punto no está en ningún barrio, excluirlo
          if (sinBarrio === null) {
            return false;
          }
          
          // Si el barrio no coincide, excluirlo
          if (sinBarrio !== filters.globalBarrio) {
            return false;
          }
        } else {
          return false;
        }
      }



      // Filtro por participante (por categoría general)
      if (filters.participant !== 'all') {
        const participantCategories = extractParticipantCategories(participantes);
        if (!participantCategories.includes(filters.participant)) {
          return false;
        }
      }

      // Filtro por causa (por código)
      if (filters.cause !== 'all') {
        // El filtro está en formato "CÓDIGO - Descripción", extraer el código
        const selectedCauseCode = filters.cause.split(' - ')[0].trim();
        if (causa !== selectedCauseCode) {
          return false;
        }
      }

      // Filtro por hora
      if ((filters.startHour !== 'all' || filters.endHour !== 'all') && hora) {
        try {
          const hour = parseInt(hora.split(':')[0]);
          const startHour = filters.startHour !== 'all' ? parseInt(filters.startHour.split(':')[0]) : 0;
          const endHour = filters.endHour !== 'all' ? parseInt(filters.endHour.split(':')[0]) : 23;

          if (hour < startHour || hour > endHour) return false;
        } catch (e) {
          // Si no se puede parsear la hora, incluir el registro
        }
      }

      // Filtro por calle
      if (filters.street && !calle?.toLowerCase().includes(filters.street.toLowerCase())) {
        return false;
      }

      return true;
    });

    console.log(`📍 ${filteredSiniestros.length} siniestros tras filtrado`);
    
    // DEBUG: Mostrar estructura del primer siniestro filtrado
    if (filteredSiniestros.length > 0) {
      const first = filteredSiniestros[0];
      console.log(`🔍 Primer filtrado:`, {
        hasGeometry: !!first.geometry,
        coordinates: first.geometry?.coordinates,
        propertiesKeys: Object.keys(first.properties || {}).slice(0, 5)
      });
    }
    
    // Actualizar visualización
    renderSiniestros();
    updateCount();
  }

  /**
   * Renderiza los siniestros en el mapa
   */
  function renderSiniestros() {
    if (!map) {
      console.error('❌ NO HAY MAPA - No se puede renderizar siniestros');
      return;
    }

    console.log('🎨 Iniciando renderSiniestros()...');

    // Remover capa anterior si existe
    if (sinistrosLayer) {
      console.log('🗑️ Removiendo capa anterior');
      map.removeLayer(sinistrosLayer);
    }

    if (filteredSiniestros.length === 0) {
      console.log('⚠️ Sin siniestros para mostrar');
      return;
    }

    console.log(`🔄 Creando markerClusterGroup con ${filteredSiniestros.length} siniestros...`);

    // Crear FeatureGroup con clustering
    sinistrosLayer = L.markerClusterGroup({
      maxClusterRadius: 40,
      disableClusteringAtZoom: 16
    });

    // Normalizar propiedades de siniestro
    const normalizeSiniestroProps = (props) => {
      const normalized = { ...props };
      
      // Helper para buscar propiedades flexiblemente
      const getProp = (keys) => {
        for (const key of keys) {
          if (normalized[key]) return normalized[key];
        }
        // Si no encuentra, buscar por coincidencia parcial
        const searchKeys = keys.map(k => k.toLowerCase());
        for (const [propKey, propVal] of Object.entries(normalized)) {
          if (searchKeys.some(sk => propKey.toLowerCase().includes(sk))) {
            return propVal;
          }
        }
        return null;
      };
      
      // Mapear causa (búsqueda flexible)
      const causa = getProp(['causa', 'Causa', 'tipo', 'Tipo', 'accident_type', 'CÓDIGOS CAUSAS', 'CàDIGOS CAUSAS', 'C?DIGOS CAUSAS', 'CODIGOS CAUSAS']);
      if (causa && !normalized.causa) {
        normalized.causa = causa;
      }
      
      // Mapear descripción
      const descripcion = getProp(['descripcion', 'Descripcion', 'description', 'nombre', 'obs']);
      if (descripcion && !normalized.descripcion) {
        normalized.descripcion = descripcion;
      }
      
      // Mapear fecha
      const fecha = getProp(['fecha', 'Fecha', 'FECHA', 'FECHA_SINIESTRO']);
      if (fecha && !normalized.fecha) {
        normalized.fecha = fecha;
      }
      
      // Mapear hora
      const hora = getProp(['hora', 'Hora', 'HORA']);
      if (hora && !normalized.hora) {
        normalized.hora = hora;
      }
      
      // Mapear dirección (con variantes de encoding)
      const direccion = getProp(['direccion', 'Calle', 'calle', 'DIRECCIÓN SINIESTRO', 'DIRECCION SINIESTRO', 'DIRECCIàN SINIESTRO', 'DIRECCIøN SINIESTRO']);
      if (direccion && !normalized.direccion) {
        normalized.direccion = direccion;
      }
      
      // Mapear barrio
      const barrio = getProp(['barrio', 'Barrio', 'Barrio/Zona', 'BARRIOS', 'barrios']);
      if (barrio && !normalized.barrio) {
        normalized.barrio = barrio;
      }
      
      // Mapear participantes
      const participantes = getProp(['participantes_codigos', 'Participante', 'CÓDIGO PARTICIPANTES', 'C?DIGO PARTICIPANTES', 'participantes']);
      if (participantes && !normalized.participantes_codigos) {
        normalized.participantes_codigos = participantes;
      }
      
      return normalized;
    };

    filteredSiniestros.forEach((feature, idx) => {
      const props = normalizeSiniestroProps(feature.properties || {});
      const coords = feature.geometry?.coordinates;

      if (idx < 3) {
        console.log(`  [${idx}] coords="${JSON.stringify(coords)}"`);
      }

      if (coords && coords.length === 2) {
        const lat = coords[1];
        const lng = coords[0];

        // Usar propiedades normalizadas
        const causa = props.causa || 'N/A';
        const fecha = props.fecha || 'N/A';
        const hora = props.hora || 'N/A';
        const direccion = props.direccion || 'N/A';
        const barrio = props.barrio || 'N/A';
        const participantes = props.participantes_codigos || props.Participante || 'N/A';
        const descripcion = props.descripcion || 'N/A';
        
        // DEBUG: Log de propiedades
        if (idx < 3) {
          console.log(`  📋 [${idx}] props.causa="${props.causa}" \u2192 causa="${causa}"`);
        }

        // Seleccionar color según causa normalizada
        const normalizedCauseForColor = normalizeCause(causa);
        const color = causeColors[normalizedCauseForColor.name] || 
                     causeColors[normalizedCauseForColor.code] ||
                     causeColors[causa] || 
                     '#CCCCCC'; // Color por defecto
        
        // DEBUG: Log del color asignado
        if (idx < 3) {
          console.log(`  🎨 [${idx}] causa="${causa}" → normalizedName="${normalizedCauseForColor.name}" → color="${color}"`);
        }
        const marker = L.circleMarker([lat, lng], {
          radius: 8,
          fillColor: color,
          color: '#1a1a1a',
          weight: 2,
          opacity: 0.9,
          fillOpacity: 0.85
        });

        // Extraer categorías generales de participantes
        const participantCategories = extractParticipantCategories(participantes);
        const participantText = participantCategories.length > 0 ? participantCategories.join(', ') : participantes;

        // Normalizar causa para mostrar como "CÓDIGO - Descripción"
        const normalizedCauseForDisplay = normalizeCause(causa);
        const causeDisplayText = `${normalizedCauseForDisplay.code} - ${normalizedCauseForDisplay.name}`;

        // Popup
        const popupContent = `
          <div style="font-size: 12px; max-width: 250px;">
            <strong>⚠️ ${causeDisplayText}</strong><br>
            ${descripcion !== 'N/A' ? `<small>${descripcion}</small><br>` : ''}
            📅 ${fecha}${hora !== 'N/A' ? ` ${hora}` : ''}<br>
            ${direccion !== 'N/A' ? `📍 ${direccion}<br>` : ''}
            ${barrio !== 'N/A' ? `Barrio: ${barrio}<br>` : ''}
            ${participantText !== 'N/A' ? `Participantes: ${participantText}` : ''}
          </div>
        `;

        marker.bindPopup(popupContent);
        sinistrosLayer.addLayer(marker);
      }
    });

    console.log(`📍 Agregando ${sinistrosLayer.getLayers().length} markers al mapa...`);
    
    if (!map.hasLayer(sinistrosLayer)) {
      console.log('🎯 Viewport actual:', map.getBounds());
      console.log('🎯 Zoom level:', map.getZoom());
      map.addLayer(sinistrosLayer);
      console.log('✅ SiniestrosLayer agregada al mapa');
    } else {
      console.log('✅ SiniestrosLayer ya estaba en el mapa');
    }
  }

  /**
   * Actualiza el contador de siniestros
   */
  function updateCount() {
    const countElement = document.getElementById('total-siniestros-count');
    if (countElement) {
      countElement.textContent = filteredSiniestros.length;
    }
  }

  /**
   * Setter para filtro
   */
  function setFilter(filterName, value) {
    if (filters.hasOwnProperty(filterName)) {
      filters[filterName] = value;
      applyFilters();
    }
  }

  /**
   * Getter para filtros
   */
  function getFilter(filterName) {
    return filters[filterName];
  }

  /**
   * Toggle de visibilidad
   */
  function toggle(visible) {
    console.log(`🔀 toggle(${visible}) llamado`);
    isVisible = visible;

    if (visible) {
      // Renderizar siniestros cuando se activa
      console.log('✨ Activando capa - llamando applyFilters()...');
      applyFilters();
      
      if (!sinistrosLayer || !map.hasLayer(sinistrosLayer)) {
        console.log('⚠️ Layer no está en el mapa, renderizando de nuevo...');
        applyFilters(); // Asegurar que se renderizó
      }
    } else {
      // Ocultar siniestros
      console.log('🙈 Desactivando capa...');
      if (sinistrosLayer && map.hasLayer(sinistrosLayer)) {
        map.removeLayer(sinistrosLayer);
        console.log('✅ SiniestrosLayer removida del mapa');
      }
    }
  }

  /**
   * Limpiar filtros
   */
  function clearFilters() {
    filters.year = 'all';
    filters.barrio = 'all';
    filters.participant = 'all';
    filters.cause = 'all';
    filters.startHour = 'all';
    filters.endHour = 'all';
    filters.street = '';
    filters.globalBarrio = 'all';

    // Reset selects - con verificación de existencia
    const safeSetelement = (id, value) => {
      const el = document.getElementById(id);
      if (el) {
        el.value = value;
      }
    };
    
    safeSetelement('year-filter', 'all');
    safeSetelement('barrio-filter', 'all');
    safeSetelement('participant-filter', 'all');
    safeSetelement('cause-filter', 'all');
    safeSetelement('start-hour-filter', 'all');
    safeSetelement('end-hour-filter', 'all');
    safeSetelement('street-filter', '');

    applyFilters();
  }

  // Establecer barrios GeoJSON para filtrado geopolítico
  function setBarriosGeoJson(barrios) {
    barriosGeoJson = barrios;
  }

  // API pública
  return {
    init,
    load: loadSiniestros,
    loadFromGeoJson: loadSinistrosFromGeoJson,
    applyFilters,
    setFilter,
    getFilter,
    toggle,
    clearFilters,
    setBarriosGeoJson,
    getFiltered: () => filteredSiniestros,
    getAll: () => sinistrosData
  };
})();
