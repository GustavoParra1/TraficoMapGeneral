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

  // Colores por causa (normalizada)
  const causeColors = {
    'Distracción': '#FF6B6B',
    'Exceso de Velocidad': '#FF8C42',
    'No Respeto Semáforo': '#FFD93D',
    'No Respeto Prioridad': '#6BCB77',
    'Peatón Imprudente': '#4D96FF',
    'Otro': '#9D84B7',
    'No Especificado': '#CCCCCC'
  };

  const causeMap = {
    'DF': { name: 'Distancia de Frenado', code: 'DF' },
    'AV': { name: 'Atropello Voluntario', code: 'AV' },
    'D': { name: 'Distracción', code: 'D' },
    'A': { name: 'Alcohol', code: 'A' },
    'EV': { name: 'Exceso de Velocidad', code: 'EV' },
    'FV': { name: 'Falla en la Vía', code: 'FV' },
    'G': { name: 'Giro', code: 'G' },
    'IC': { name: 'Invasión de Carril', code: 'IC' },
    'MI': { name: 'Maniobra Imprudente', code: 'MI' },
    'MR': { name: 'Maniobra Riesgosa', code: 'MR' },
    'NR': { name: 'No Respeto prioridad de Paso', code: 'NR' },
    'NSD': { name: 'No Se Puede Determinar', code: 'NSD' },
    'P': { name: 'Perro', code: 'P' },
    'PC': { name: 'Pierde Control', code: 'PC' },
    'PERSECUCIÓN': { name: 'Persecución', code: 'PERSECUCIÓN' },
    'PI': { name: 'Peatón Imprudente', code: 'PI' },
    'VS': { name: 'Violación de Semáforo', code: 'VS' }
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
      const response = await fetch(geojsonPath);
      const geojson = await response.json();
      sinistrosData = geojson.features || [];
      
      console.log(`✅ Cargados ${sinistrosData.length} siniestros`);
      
      // Extraer valores únicos para filtros
      updateFilterOptions();
      
      // NO renderizar hasta que el usuario marque el checkbox
      // applyFilters() se llamará en toggle() cuando el usuario lo active
      
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

    // Función auxiliar para normalizar propiedades
    const normalizeFilterProps = (props) => {
      const normalized = {};
      normalized.causa = props.causa || props.Causa || props.tipo || props.Tipo || props['CÓDIGOS CAUSAS'] || props['C?DIGOS CAUSAS'];
      normalized.fecha = props.fecha || props.Fecha || props['FECHA'];
      normalized.hora = props.hora || props.Hora || props['HORA'];
      normalized.participantes = props.participantes_codigos || props.Participante || props['CÓDIGO PARTICIPANTES'] || props['C?DIGO PARTICIPANTES'];
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
          // Parsear fecha en formato DD/MM/YY
          const parts = fecha.split('/');
          if (parts.length === 3) {
            const [d, m, y] = parts;
            const year = parseInt('20' + y);
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
   * (Nota: El selector de barrio se llena desde app.js en setupSinistrosFilters)
   */
  async function loadBarriosList() {
    try {
      const response = await fetch('data/barrios.json');
      barriosGeoJson = await response.json();
      console.log(`✅ Datos de barrios cargados para filtrado geográfico`);
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
      for (const poly of polygon.coordinates) {
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
    if (!barriosGeoJson) return null;
    
    for (const feature of barriosGeoJson.features) {
      if (pointInPolygon(point, feature.geometry)) {
        return feature.properties?.soc_fomen;
      }
    }
    
    return null;
  }

  /**
   * Actualiza un elemento select con opciones
   */
  function updateSelect(id, options) {
    const select = document.getElementById(id);
    if (!select) return;

    const selectedValue = select.value;
    const defaultOption = select.options[0];

    // Limpiar opciones excepto la primera
    while (select.options.length > 1) {
      select.remove(1);
    }

    // Agregar nuevas opciones
    options.forEach(option => {
      const opt = document.createElement('option');
      opt.value = option;
      opt.textContent = option;
      select.appendChild(opt);
    });

    // Restaurar selección si existe
    if (selectedValue !== 'all' && Array.from(select.options).some(o => o.value === selectedValue)) {
      select.value = selectedValue;
    }
  }

  /**
   * Aplica los filtros actuales
   */
  function applyFilters() {
    filteredSiniestros = sinistrosData.filter(feature => {
      const props = feature.properties || {};

      // Normalizar nombres de propiedades (soportar CSV con diferentes nombres de columnas)
      const fecha = props.fecha || props.Fecha || props['FECHA'];
      const hora = props.hora || props.Hora || props['HORA'];
      const causa = props.causa || props.Causa || props.tipo || props.Tipo || props['CÓDIGOS CAUSAS'] || props['C?DIGOS CAUSAS'];
      const participantes = props.participantes_codigos || props.Participante || props['CÓDIGO PARTICIPANTES'] || props['C?DIGO PARTICIPANTES'];
      const calle = props.direccion || props.Calle || props.calle || props['DIRECCIÓN SINIESTRO'];

      // Filtro por año
      if (filters.year !== 'all') {
        try {
          let year;
          if (fecha && fecha.includes('/')) {
            // Formato DD/MM/YY
            const parts = fecha.split('/');
            if (parts.length === 3) {
              const [d, m, y] = parts;
              year = parseInt('20' + y);
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
          const sinBarrio = getBarrioForPoint(coords);
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
    
    // Actualizar visualización
    renderSiniestros();
    updateCount();
  }

  /**
   * Renderiza los siniestros en el mapa
   */
  function renderSiniestros() {
    if (!map) return;

    // Remover capa anterior si existe
    if (sinistrosLayer) {
      map.removeLayer(sinistrosLayer);
    }

    if (filteredSiniestros.length === 0) {
      console.log('⚠️ Sin siniestros para mostrar');
      return;
    }

    // Crear FeatureGroup con clustering
    sinistrosLayer = L.markerClusterGroup({
      maxClusterRadius: 40,
      disableClusteringAtZoom: 16
    });

    // Normalizar propiedades de siniestro
    const normalizeSiniestroProps = (props) => {
      const normalized = { ...props };
      
      // Mapear causa (buscar: causa, Causa, tipo, Tipo, accident_type, CÓDIGOS CAUSAS)
      if (!normalized.causa) {
        if (normalized.tipo) normalized.causa = normalized.tipo;
        else if (normalized.Tipo) normalized.causa = normalized.Tipo;
        else if (normalized.Causa) normalized.causa = normalized.Causa;
        else if (normalized.accident_type) normalized.causa = normalized.accident_type;
        else if (normalized['CÓDIGOS CAUSAS']) normalized.causa = normalized['CÓDIGOS CAUSAS'];
        else if (normalized['C?DIGOS CAUSAS']) normalized.causa = normalized['C?DIGOS CAUSAS'];
      }
      
      // Mapear descripción (buscar: descripcion, description, nombre, observaciones)
      if (!normalized.descripcion) {
        if (normalized.description) normalized.descripcion = normalized.description;
        else if (normalized.nombre) normalized.descripcion = normalized.nombre;
        else if (normalized.Descripcion) normalized.descripcion = normalized.Descripcion;
        else if (normalized.obs) normalized.descripcion = normalized.obs;
      }
      
      // Mapear fecha
      if (!normalized.fecha) {
        if (normalized.Fecha) normalized.fecha = normalized.Fecha;
        else if (normalized['FECHA']) normalized.fecha = normalized['FECHA'];
      }
      
      // Mapear hora
      if (!normalized.hora) {
        if (normalized.Hora) normalized.hora = normalized.Hora;
        else if (normalized['HORA']) normalized.hora = normalized['HORA'];
      }
      
      // Mapear dirección
      if (!normalized.direccion) {
        if (normalized.Calle) normalized.direccion = normalized.Calle;
        else if (normalized.calle) normalized.direccion = normalized.calle;
        else if (normalized['DIRECCIÓN SINIESTRO']) normalized.direccion = normalized['DIRECCIÓN SINIESTRO'];
        else if (normalized['DIRECCI?N SINIESTRO']) normalized.direccion = normalized['DIRECCI?N SINIESTRO'];
      }
      
      // Mapear barrio
      if (!normalized.barrio) {
        if (normalized.Barrio) normalized.barrio = normalized.Barrio;
        else if (normalized['Barrio/Zona']) normalized.barrio = normalized['Barrio/Zona'];
        else if (normalized['BARRIOS']) normalized.barrio = normalized['BARRIOS'];
      }
      
      // Mapear participantes
      if (!normalized.participantes_codigos) {
        if (normalized.Participante) normalized.participantes_codigos = normalized.Participante;
        else if (normalized['CÓDIGO PARTICIPANTES']) normalized.participantes_codigos = normalized['CÓDIGO PARTICIPANTES'];
        else if (normalized['C?DIGO PARTICIPANTES']) normalized.participantes_codigos = normalized['C?DIGO PARTICIPANTES'];
      }
      
      return normalized;
    };

    filteredSiniestros.forEach(feature => {
      const props = normalizeSiniestroProps(feature.properties || {});
      const coords = feature.geometry?.coordinates;

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

        // Seleccionar color según causa normalizada
        const normalizedCauseForColor = normalizeCause(causa);
        const color = causeColors[normalizedCauseForColor.name] || 
                     causeColors[normalizedCauseForColor.code] ||
                     causeColors[causa] || 
                     '#CCCCCC'; // Color por defecto

        // Crear marcador
        const marker = L.circleMarker([lat, lng], {
          radius: 6,
          fillColor: color,
          color: '#333',
          weight: 1,
          opacity: 0.8,
          fillOpacity: 0.7
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

    map.addLayer(sinistrosLayer);
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
    isVisible = visible;

    if (visible) {
      // Renderizar siniestros cuando se activa
      applyFilters();
      
      if (!sinistrosLayer || !map.hasLayer(sinistrosLayer)) {
        applyFilters(); // Asegurar que se renderizó
      }
    } else {
      // Ocultar siniestros
      if (sinistrosLayer && map.hasLayer(sinistrosLayer)) {
        map.removeLayer(sinistrosLayer);
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
    getFiltered: () => filteredSiniestros,
    getAll: () => sinistrosData
  };
})();
