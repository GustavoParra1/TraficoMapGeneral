/**
 * 🚦 SINIESTROS HISTÓRICO LAYER
 * Módulo para visualizar y filtrar siniestros viales permanentes (accidentes)
 * Datos: Firestore - clientes/{clienteId}/siniestros/*
 * 
 * Opción B: Mantiene registro histórico permanente para análisis de patrones de accidentes.
 * Incluye datos de listas oficiales + reporte comunitario de vecinos.
 */

window.SiniestrosHistoricoLayer = (() => {
  let siniestrosData = [];
  let filteredSiniestros = [];
  let clusterGroup = null;
  let map = null;
  let isVisible = false;
  let barriosGeoJson = null;
  let unsubscribe = null;

  // Mapa de colores por causa de accidente
  const causaColores = {
    'D': '#e74c3c',   // Distracción - Rojo
    'A': '#c0392b',   // Alcohol - Rojo oscuro
    'EV': '#f39c12',  // Exceso velocidad - Naranja
    'FV': '#e67e22',  // Fatiga/Sueño - Naranja oscuro
    'G': '#2980b9',   // Giro indebido - Azul
    'MI': '#9b59b6',  // Maniobra indebida - Púrpura
    'MR': '#1abc9c',  // Mala ruptura - Verde azulado
    'NR': '#27ae60',  // Niebla/Lluvia - Verde
    'PC': '#34495e',  // Problema conducción - Gris oscuro
    'PS': '#7f8c8d',  // Problema suspensión - Gris
    'OT': '#95a5a6'   // Otros - Gris claro
  };

  // Filtros activos
  const filters = {
    globalBarrio: 'all',
    year: 'all',
    causa: 'all',
    participantes: 'all' // Para filtrar por tipo de participantes involucrados
  };

  /**
   * Inicializa el módulo
   */
  function init(leafletMap) {
    map = leafletMap;
    clusterGroup = L.markerClusterGroup({
      maxClusterRadius: 80,
      spiderfyOnMaxZoom: true,
      iconCreateFunction: createCustomClusterIcon
    });
    console.log('🚦 SiniestrosHistoricoLayer inicializado');
    loadSiniestrosFromFirestore();
  }

  /**
   * Crear icono personalizado para clusters
   */
  function createCustomClusterIcon(cluster) {
    const childCount = cluster.getChildCount();
    let c = ' marker-cluster-';
    if (childCount < 10) {
      c += 'small';
    } else if (childCount < 50) {
      c += 'medium';
    } else {
      c += 'large';
    }

    return new L.DivIcon({
      html: `<div style="background: #e74c3c;"><span>${childCount}</span></div>`,
      className: 'marker-cluster' + c,
      iconSize: new L.Point(40, 40)
    });
  }

  /**
   * Obtener color por causa
   */
  function getCauseColor(causa) {
    return causaColores[causa] || '#95a5a6';
  }

  /**
   * Obtener etiqueta de causa
   */
  function getCauseLabel(causa) {
    const labels = {
      'D': 'Distracción',
      'A': 'Alcohol',
      'EV': 'Exceso de Velocidad',
      'FV': 'Fatiga/Sueño',
      'G': 'Giro Indebido',
      'MI': 'Maniobra Indebida',
      'MR': 'Mala Ruptura',
      'NR': 'Niebla/Lluvia',
      'PC': 'Problema Conducción',
      'PS': 'Problema Suspensión',
      'OT': 'Otros'
    };
    return labels[causa] || causa || 'Causa desconocida';
  }

  /**
   * Cargar siniestros desde Firestore en tiempo real
   */
  function loadSiniestrosFromFirestore() {
    if (!window.restoredClienteData) {
      console.warn('⚠️ SiniestrosHistoricoLayer: restoredClienteData no disponible. Reintentando en 2s...');
      setTimeout(loadSiniestrosFromFirestore, 2000);
      return;
    }

    // El campo actual es 'id'
    const clienteId = window.restoredClienteData.id || window.restoredClienteData.clienteId || window.restoredClienteData.idl;
    
    if (!clienteId) {
      console.warn('⚠️ SiniestrosHistoricoLayer: id/clienteId/idl no encontrado. Estructura disponible:', Object.keys(window.restoredClienteData));
      setTimeout(loadSiniestrosFromFirestore, 2000);
      return;
    }

    // Esperar a que window.db esté disponible
    if (!window.db) {
      console.warn('⚠️ SiniestrosHistoricoLayer: window.db no disponible, reintentando en 1s...');
      setTimeout(loadSiniestrosFromFirestore, 1000);
      return;
    }

    try {
      // Listener en tiempo real - usar window.db
      // ✅ CAMBIO: Usar 'siniestros' en lugar de 'siniestros_historico'
      console.log(`🚦 SiniestrosHistoricoLayer: Escuchando clientes/${clienteId}/siniestros`);
      unsubscribe = window.db
        .collection(`clientes/${clienteId}/siniestros`)
        .orderBy('timestamp', 'desc')
        .onSnapshot(
          (snap) => {
            siniestrosData = [];
            snap.forEach((doc) => {
              const data = doc.data();
              siniestrosData.push({
                id: doc.id,
                ...data
              });
            });

            console.log(
              `🚦 ${siniestrosData.length} siniestros históricos cargados`
            );
            
            // DEBUG: Mostrar estructura del primer siniestro
            if (siniestrosData.length > 0) {
              console.log('📍 === PRIMER SINIESTRO HISTÓRICO ===');
              console.log('📍 Objeto completo:', JSON.stringify(siniestrosData[0], null, 2));
              console.log('📍 Campos disponibles:', Object.keys(siniestrosData[0]));
              console.log(`📍 lat type: ${typeof siniestrosData[0].lat}, value: ${siniestrosData[0].lat}`);
              console.log(`📍 lng type: ${typeof siniestrosData[0].lng}, value: ${siniestrosData[0].lng}`);
              
              // Contar cuántos tienen coordenadas
              const conCoords = siniestrosData.filter(s => s.lat && s.lng).length;
              const sinCoords = siniestrosData.length - conCoords;
              console.log(`📍 Con coordenadas válidas: ${conCoords}/${siniestrosData.length}`);
              console.log(`📍 Sin coordenadas: ${sinCoords}`);
              
              // Mostrar tipos de datos para lat/lng en los primeros 5
              console.log('📍 Tipos de lat/lng en primeros 5:');
              siniestrosData.slice(0, 5).forEach((s, i) => {
                console.log(`  [${i}] lat=${s.lat} (${typeof s.lat}), lng=${s.lng} (${typeof s.lng})`);
              });
            }

            // Obtener barrios para filtrado
            if (!barriosGeoJson) {
              cargarBarrios();
            }

            updateSiniestrosFilters();
            applyFilters();
          },
          (error) => {
            console.error('❌ Error escuchando siniestros históricos:', error);
          }
        );
    } catch (error) {
      console.error('❌ Error inicializando listener de siniestros:', error);
    }
  }

  /**
   * Cargar GeoJSON de barrios
   */
  function cargarBarrios() {
    const clienteId = window.restoredClienteData?.clienteId;
    if (!clienteId) return;

    fetch(`/data/barrios-${clienteId}.geojson`)
      .then((r) => r.json())
      .then((data) => {
        barriosGeoJson = data;
        console.log('🗺️ Barrios cargados para siniestros históricos');
      })
      .catch((err) => console.warn('⚠️ No se pudieron cargar barrios:', err));
  }

  /**
   * Actualizar opciones de filtros
   */
  function updateSiniestrosFilters() {
    const causas = new Set();
    const años = new Set();

    siniestrosData.forEach((s) => {
      if (s.causa) causas.add(s.causa);
      if (s.timestamp) {
        const date =
          s.timestamp instanceof Date
            ? s.timestamp
            : new Date(s.timestamp.toMillis?.() || s.timestamp);
        const year = date.getFullYear().toString();
        años.add(year);
      }
    });

    // Actualizar selectores
    const causaSelect = document.getElementById('siniestros-causa-filter');
    if (causaSelect) {
      const currentVal = causaSelect.value;
      causaSelect.innerHTML = '<option value="all">Todas</option>';
      Array.from(causas)
        .sort()
        .forEach((causa) => {
          const option = document.createElement('option');
          option.value = causa;
          option.textContent = getCauseLabel(causa);
          causaSelect.appendChild(option);
        });
      causaSelect.value = currentVal;
    }

    const yearSelect = document.getElementById('siniestros-year-filter');
    if (yearSelect) {
      const currentVal = yearSelect.value;
      yearSelect.innerHTML = '<option value="all">Todos los años</option>';
      Array.from(años)
        .sort()
        .reverse()
        .forEach((year) => {
          const option = document.createElement('option');
          option.value = year;
          option.textContent = year;
          yearSelect.appendChild(option);
        });
      yearSelect.value = currentVal;
    }
  }

  /**
   * Aplicar filtros y re-renderizar
   */
  function applyFilters() {
    filteredSiniestros = siniestrosData.filter((s) => {
      // Filtro de causa
      if (filters.causa !== 'all' && s.causa !== filters.causa) {
        return false;
      }

      // Filtro de año
      if (filters.year !== 'all') {
        const date =
          s.timestamp instanceof Date
            ? s.timestamp
            : new Date(s.timestamp?.toMillis?.() || s.timestamp);
        if (date.getFullYear().toString() !== filters.year) {
          return false;
        }
      }

      // Filtro de barrio
      if (filters.globalBarrio !== 'all') {
        if (!s.lat || !s.lng) {
          return false;
        }
        if (!isInBarrio(s.lat, s.lng, filters.globalBarrio)) {
          return false;
        }
      }

      // Filtro de participantes
      if (filters.participantes !== 'all') {
        // Podría filtrar por tipo de participantes si el dato estuviera disponible
        // Por ahora es un placeholder para compatibilidad con app.js
      }

      return true;
    });

    console.log(
      `🚦 ${filteredSiniestros.length} siniestros pasan el filtro`
    );
    renderSiniestros();
  }

  /**
   * Verificar si un punto está en un barrio
   */
  function isInBarrio(lat, lng, barrio) {
    if (!barriosGeoJson) return true;

    for (const feature of barriosGeoJson.features) {
      if (
        (feature.properties.BARRIO || feature.properties.barrio) ===
        barrio
      ) {
        if (typeof turf !== 'undefined') {
          const point = turf.point([lng, lat]);
          if (turf.booleanPointInPolygon(point, feature)) {
            return true;
          }
        }
        return true;
      }
    }

    return false;
  }

  /**
   * Renderizar siniestros en el mapa
   */
  function renderSiniestros() {
    clusterGroup.clearLayers();

    console.log(`🎯 Renderizando ${filteredSiniestros.length} siniestros filtrados...`);
    console.log('🎯 Primeros 3 siniestros filtrados:');
    filteredSiniestros.slice(0, 3).forEach((s, i) => {
      console.log(`  [${i}] lat=${s.lat}, lng=${s.lng}, causa=${s.causa}, barrio=${s.barrio}`);
    });
    
    let renderizados = 0;
    let saltados = 0;
    
    filteredSiniestros.forEach((siniestro) => {
      if (!siniestro.lat || !siniestro.lng) {
        saltados++;
        if (saltados <= 3) { // Only log first 3 for brevity
          console.log(`⊘ Siniestro saltado (sin coords): lat=${siniestro.lat}, lng=${siniestro.lng}`, siniestro);
        }
        return;
      }

      const color = getCauseColor(siniestro.causa);
      const causeLabel = getCauseLabel(siniestro.causa);
      renderizados++;
      const fecha = formatDate(siniestro.timestamp);

      // Círculo marcador
      const marker = L.circleMarker([siniestro.lat, siniestro.lng], {
        radius: 7,
        fillColor: color,
        color: color,
        weight: 2,
        opacity: 0.8,
        fillOpacity: 0.7
      });

      // Popup con información detallada
      const participantes =
        siniestro.participantes_codigos || '[Sin datos]';

      const popupContent = `
        <div style="font-size: 12px; max-width: 250px;">
          <div style="font-weight: bold; color: ${color}; margin-bottom: 6px;">
            🚦 Siniestro Vial
          </div>
          <div style="font-size: 11px; color: #666; margin-bottom: 4px;">
            <strong>Causa:</strong> ${causeLabel}
          </div>
          <div style="font-size: 11px; color: #666; margin-bottom: 4px;">
            <strong>Participantes:</strong> ${participantes}
          </div>
          <div style="font-size: 10px; color: #999; margin-bottom: 4px;">
            <strong>Fecha:</strong> ${fecha}
          </div>
          ${siniestro.barrio ? `
            <div style="font-size: 10px; color: #999; margin-bottom: 4px;">
              <strong>Barrio:</strong> ${siniestro.barrio}
            </div>
          ` : ''}
          ${siniestro.calle || siniestro.ubicacion ? `
            <div style="font-size: 10px; color: #999;">
              <strong>Ubicación:</strong> ${siniestro.calle || siniestro.ubicacion}
            </div>
          ` : ''}
        </div>
      `;

      marker.bindPopup(popupContent);

      // Efectos hover
      marker.on('mouseover', function () {
        this.setStyle({
          radius: 9,
          weight: 3,
          opacity: 1,
          fillOpacity: 0.9
        });
      });

      marker.on('mouseout', function () {
        this.setStyle({
          radius: 7,
          weight: 2,
          opacity: 0.8,
          fillOpacity: 0.7
        });
      });

      clusterGroup.addLayer(marker);
    });

    console.log(`🚦 Renderizados: ${renderizados}, Saltados (sin coords): ${saltados}`);

    if (!map.hasLayer(clusterGroup) && isVisible) {
      map.addLayer(clusterGroup);
    }

    console.log(
      `🚦 ${clusterGroup.getLayers().length} marcadores de siniestros en mapa`
    );
  }

  /**
   * Formatear timestamp
   */
  function formatDate(timestamp) {
    if (!timestamp) return 'Fecha desconocida';

    let date;
    if (timestamp instanceof Date) {
      date = timestamp;
    } else if (timestamp.toMillis) {
      date = new Date(timestamp.toMillis());
    } else if (typeof timestamp === 'string') {
      date = new Date(timestamp);
    } else {
      return 'Fecha inválida';
    }

    return date.toLocaleDateString('es-AR', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    });
  }

  /**
   * Establecer filtro
   */
  function setFilter(filterName, value) {
    if (filterName in filters) {
      filters[filterName] = value;
      console.log(`🚦 Filtro ${filterName} = ${value}`);
      applyFilters();
    }
  }

  /**
   * Mostrar/ocultar capa
   * ✅ CAMBIO: Agregada validación de map para evitar errores de null
   */
  function toggle(show) {
    isVisible = show;
    if (!map) {
      console.warn('⚠️ SiniestrosHistoricoLayer.toggle(): map no disponible');
      return;
    }
    if (show) {
      if (!map.hasLayer(clusterGroup)) {
        map.addLayer(clusterGroup);
      }
    } else {
      if (map.hasLayer(clusterGroup)) {
        map.removeLayer(clusterGroup);
      }
    }
    console.log(`🚦 SiniestrosHistoricoLayer ${show ? 'visible' : 'oculto'}`);
  }

  /**
   * Obtener metadatos
   */
  function getMetadata() {
    return {
      name: 'Siniestros Históricos',
      layers: clusterGroup,
      icon: '🚦',
      color: '#e74c3c',
      count: filteredSiniestros.length,
      filters: ['causa', 'year', 'globalBarrio', 'participantes']
    };
  }

  /**
   * Limpiar recursos
   */
  function destroy() {
    if (unsubscribe) {
      unsubscribe();
    }
    if (map && clusterGroup) {
      map.removeLayer(clusterGroup);
    }
  }

  // API pública
  return {
    init,
    loadSiniestrosFromFirestore,
    applyFilters,
    renderSiniestros,
    setFilter,
    toggle,
    getMetadata,
    destroy
  };
})();
