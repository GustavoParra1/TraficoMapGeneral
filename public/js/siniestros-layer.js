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

  // Colores por causa
  const causeColors = {
    'DISTRACCION': '#FF6B6B',
    'EXCESO DE VELOCIDAD': '#FF8C42',
    'NO RESPETO SEMAFORO': '#FFD93D',
    'NO RESPETO PRIORIDAD': '#6BCB77',
    'PEATÓN IMPRUDENTE': '#4D96FF',
    'OTRO': '#9D84B7',
    'D': '#FF6B6B', // Distracción
    'NSD': '#9D84B7', // No Especificado
    'OTHER': '#9D84B7'
  };

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

    sinistrosData.forEach(feature => {
      const props = feature.properties || {};
      
      // Convertir nombres de propiedades a estándar
      const fecha = props.fecha || props.Fecha;
      const hora = props.hora || props.Hora;
      const causa = props.causa || props.Causa;
      const participantes = props.participantes_codigos || props.Participante;
      
      if (fecha) {
        try {
          // Parsear fecha en formato DD/MM/YY
          const [d, m, y] = fecha.split('/');
          const year = parseInt('20' + y);
          years.add(year);
        } catch (e) {
          // Intentar parsear como ISO
          const year = new Date(fecha).getFullYear();
          if (!isNaN(year)) years.add(year);
        }
      }
      
      if (participantes) participants.add(participantes);
      if (causa) causes.add(causa);
      
      if (hora) {
        const hour = parseInt(hora.split(':')[0]);
        if (!isNaN(hour)) hours.add(hour);
      }
    });

    // Actualizar selectores
    updateSelect('year-filter', Array.from(years).sort((a, b) => b - a));
    updateSelect('participant-filter', Array.from(participants).sort());
    updateSelect('cause-filter', Array.from(causes).sort());
    
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

      // Normalizar nombres de propiedades
      const fecha = props.fecha || props.Fecha;
      const hora = props.hora || props.Hora;
      const causa = props.causa || props.Causa;
      const participantes = props.participantes_codigos || props.Participante;
      const calle = props.direccion || props.Calle;

      // Filtro por año
      if (filters.year !== 'all') {
        try {
          let year;
          if (fecha.includes('/')) {
            // Formato DD/MM/YY
            const [d, m, y] = fecha.split('/');
            year = parseInt('20' + y);
          } else {
            // Formato ISO
            year = new Date(fecha).getFullYear();
          }
          if (year !== parseInt(filters.year)) return false;
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



      // Filtro por participante
      if (filters.participant !== 'all' && participantes !== filters.participant) {
        return false;
      }

      // Filtro por causa
      if (filters.cause !== 'all' && causa !== filters.cause) {
        return false;
      }

      // Filtro por hora
      if (filters.startHour !== 'all' || filters.endHour !== 'all') {
        try {
          const hour = parseInt(hora.split(':')[0]);
          const startHour = filters.startHour !== 'all' ? parseInt(filters.startHour.split(':')[0]) : 0;
          const endHour = filters.endHour !== 'all' ? parseInt(filters.endHour.split(':')[0]) : 23;

          if (hour < startHour || hour > endHour) return false;
        } catch (e) {
          return false;
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

    filteredSiniestros.forEach(feature => {
      const props = feature.properties || {};
      const coords = feature.geometry?.coordinates;

      if (coords && coords.length === 2) {
        const lat = coords[1];
        const lng = coords[0];

        // Normalizar nombres de propiedades
        const causa = props.causa || props.Causa || 'N/A';
        const fecha = props.fecha || props.Fecha || 'N/A';
        const hora = props.hora || props.Hora || 'N/A';
        const direccion = props.direccion || props.Calle || 'N/A';
        const barrio = props['Barrio/Zona'] || props.barrio || 'N/A';
        const participantes = props.participantes_codigos || props.Participante || 'N/A';

        // Seleccionar color según causa
        const color = causeColors[causa] || causeColors['OTHER'];

        // Crear marcador
        const marker = L.circleMarker([lat, lng], {
          radius: 6,
          fillColor: color,
          color: '#333',
          weight: 1,
          opacity: 0.8,
          fillOpacity: 0.7
        });

        // Popup
        const popupContent = `
          <div style="font-size: 12px; max-width: 200px;">
            <strong>${causa}</strong><br>
            Fecha: ${fecha}<br>
            Hora: ${hora}<br>
            Dirección: ${direccion}<br>
            Barrio: ${barrio}<br>
            Participante: ${participantes}
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
