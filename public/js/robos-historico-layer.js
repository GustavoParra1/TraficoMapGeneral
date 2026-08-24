/**
 * 🚗 ROBOS HISTÓRICO LAYER
 * Módulo para visualizar y filtrar robos de vehículos reportados por VECINOS
 * (no incluye la lista oficial masiva que carga el administrador, esa se ve
 * con el checkbox "Mostrar Robos" de arriba).
 *
 * Datos: Firestore - clientes/{clienteId}/denuncias_historico/*
 * filtrados por categoria === 'vehiculos' y subcategoria en
 * ['robo_auto', 'robo_moto', 'robo_bicicleta'] (se excluye
 * 'rotura_vehiculo', que no es un robo — ver categories-taxonomy.js).
 *
 * denuncias_historico ya se archiva automáticamente al crearse cada denuncia
 * (Cloud Function onDenunciaCreada), y NO se borra si luego se elimina la
 * denuncia original desde el panel — por eso un robo reportado por un
 * vecino sigue apareciendo acá aunque se borre de "Denuncias".
 */

window.RobosHistoricoLayer = (() => {
  // Subcategorías de 'vehiculos' que son robos (se excluye
  // 'rotura_vehiculo' y 'otro_vehiculos', que no son robos).
  const ROBOS_SUBCATEGORIAS = ['robo_auto', 'robo_moto', 'robo_bicicleta'];

  let robosData = [];
  let filteredRobos = [];
  let clusterGroup = null;
  let map = null;
  let isVisible = false;
  let barriosGeoJson = null;
  let unsubscribe = null;

  // 🆕 Renderer Canvas con "tolerance": agrega un margen invisible alrededor
  // de cada marcador que también cuenta como clickeable/tocable, sin agrandar
  // el punto visualmente. radius:6 es ~12px de diámetro — un blanco muy
  // chico para un dedo real. El renderer SVG (default de Leaflet) no
  // soporta esta opción; por eso se fuerza Canvas acá.
  const touchRenderer = L.canvas({ tolerance: 15 });

  // Filtros activos
  // "causa" ahora representa la subcategoría del robo (auto, moto, bicicleta)
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
    console.log('🚦 RobosHistoricoLayer inicializado');
    loadRobosFromFirestore();
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
   * Obtener color por subcategoría (usa el color de la categoría "accidentes"
   * de categories-taxonomy.js; si esa taxonomía no está cargada, usa un
   * color por defecto).
   */
  function getCauseColor(subcategoria) {
    if (typeof CATEGORIES_TAXONOMY !== 'undefined' && CATEGORIES_TAXONOMY.vehiculos) {
      return CATEGORIES_TAXONOMY.vehiculos.color || '#f97316';
    }
    return '#f97316';
  }

  /**
   * Obtener la fecha real de un robo probando distintos campos posibles.
   * Los documentos importados masivamente NO tienen 'timestamp': tienen
   * 'created_at' (Firestore Timestamp) y/o 'FECHA' (string "dd/mm/aa").
   * Antes el código solo miraba 'timestamp', por eso el orderBy y los
   * filtros de año descartaban silenciosamente todos los documentos.
   */
  function getRoboDate(s) {
    if (!s) return null;

    if (s.timestamp) {
      if (s.timestamp instanceof Date) return s.timestamp;
      if (s.timestamp.toMillis) return new Date(s.timestamp.toMillis());
      const d = new Date(s.timestamp);
      if (!isNaN(d)) return d;
    }

    if (s.created_at) {
      if (s.created_at instanceof Date) return s.created_at;
      if (s.created_at.toMillis) return new Date(s.created_at.toMillis());
      const d = new Date(s.created_at);
      if (!isNaN(d)) return d;
    }

    // Fallback: parsear "FECHA" tipo "23/04/25" (dd/mm/aa)
    const fechaStr = s.FECHA || s.fecha;
    if (typeof fechaStr === 'string' && fechaStr.includes('/')) {
      const [dd, mm, yy] = fechaStr.split('/');
      if (dd && mm && yy) {
        const year = yy.length === 2 ? `20${yy}` : yy;
        const d = new Date(`${year}-${mm}-${dd}`);
        if (!isNaN(d)) return d;
      }
    }

    return null;
  }

  /**
   * Obtener etiqueta de subcategoría (robo_auto, robo_moto, robo_bicicleta) usando
   * categories-taxonomy.js.
   */
  function getCauseLabel(subcategoria) {
    if (typeof getSubcategoryInfo === 'function') {
      return getSubcategoryInfo('vehiculos', subcategoria).label;
    }
    return subcategoria || 'Sin especificar';
  }

  /**
   * Cargar robos desde Firestore en tiempo real
   */
  function loadRobosFromFirestore() {
    if (!window.restoredClienteData) {
      console.warn('⚠️ RobosHistoricoLayer: restoredClienteData no disponible. Reintentando en 2s...');
      setTimeout(loadRobosFromFirestore, 2000);
      return;
    }

    // El campo actual es 'id'
    const clienteId = window.restoredClienteData.id || window.restoredClienteData.clienteId || window.restoredClienteData.idl;
    
    if (!clienteId) {
      console.warn('⚠️ RobosHistoricoLayer: id/clienteId/idl no encontrado. Estructura disponible:', Object.keys(window.restoredClienteData));
      setTimeout(loadRobosFromFirestore, 2000);
      return;
    }

    // Esperar a que window.db esté disponible
    if (!window.db) {
      console.warn('⚠️ RobosHistoricoLayer: window.db no disponible, reintentando en 1s...');
      setTimeout(loadRobosFromFirestore, 1000);
      return;
    }

    try {
      // Listener en tiempo real sobre denuncias_historico, filtrando en el
      // cliente por categoria === 'vehiculos' y subcategoria de robo. Se
      // filtra en el cliente (no con .where() en la query) para no requerir
      // un índice compuesto de Firestore.
      console.log(`🚗 RobosHistoricoLayer: Escuchando clientes/${clienteId}/denuncias_historico (categoria=vehiculos, robos)`);
      unsubscribe = window.db
        .collection(`clientes/${clienteId}/denuncias_historico`)
        .orderBy('timestamp', 'desc')
        .onSnapshot(
          (snap) => {
            robosData = [];
            snap.forEach((doc) => {
              const data = doc.data();
              if (data.categoria === 'vehiculos' && ROBOS_SUBCATEGORIAS.includes(data.subcategoria)) {
                robosData.push({
                  id: doc.id,
                  ...data
                });
              }
            });

            console.log(
              `🚗 ${robosData.length} robos históricos (reportados por vecinos) cargados`
            );
            
            // DEBUG: Mostrar estructura del primer robo
            if (robosData.length > 0) {
              console.log('📍 === PRIMER ROBO HISTÓRICO ===');
              console.log('📍 Objeto completo:', JSON.stringify(robosData[0], null, 2));
              console.log('📍 Campos disponibles:', Object.keys(robosData[0]));
              console.log(`📍 lat type: ${typeof robosData[0].lat}, value: ${robosData[0].lat}`);
              console.log(`📍 lng type: ${typeof robosData[0].lng}, value: ${robosData[0].lng}`);
              
              // Contar cuántos tienen coordenadas
              const conCoords = robosData.filter(s => s.lat && s.lng).length;
              const sinCoords = robosData.length - conCoords;
              console.log(`📍 Con coordenadas válidas: ${conCoords}/${robosData.length}`);
              console.log(`📍 Sin coordenadas: ${sinCoords}`);
              
              // Mostrar tipos de datos para lat/lng en los primeros 5
              console.log('📍 Tipos de lat/lng en primeros 5:');
              robosData.slice(0, 5).forEach((s, i) => {
                console.log(`  [${i}] lat=${s.lat} (${typeof s.lat}), lng=${s.lng} (${typeof s.lng})`);
              });
            }

            // Obtener barrios para filtrado
            if (!barriosGeoJson) {
              cargarBarrios();
            }

            updateRobosFilters();
            applyFilters();
          },
          (error) => {
            console.error('❌ Error escuchando robos históricos:', error);
          }
        );
    } catch (error) {
      console.error('❌ Error inicializando listener de robos:', error);
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
        console.log('🗺️ Barrios cargados para robos históricos');
      })
      .catch((err) => console.warn('⚠️ No se pudieron cargar barrios:', err));
  }

  /**
   * Actualizar opciones de filtros
   */
  function updateRobosFilters() {
    const causas = new Set();
    const años = new Set();

    robosData.forEach((s) => {
      if (s.subcategoria) causas.add(s.subcategoria);
      const date = getRoboDate(s);
      if (date) {
        const year = date.getFullYear().toString();
        años.add(year);
      }
    });

    // Actualizar selectores
    const causaSelect = document.getElementById('robos-causa-filter');
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

    const yearSelect = document.getElementById('robos-year-filter');
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
    filteredRobos = robosData.filter((s) => {
      // Filtro de subcategoría (robo_auto, robo_moto, robo_bicicleta — la key "causa" se
      // mantiene por compatibilidad con app.js/setFilter, pero compara
      // contra el campo real 'subcategoria' de la denuncia)
      if (filters.causa !== 'all' && s.subcategoria !== filters.causa) {
        return false;
      }

      // Filtro de año
      if (filters.year !== 'all') {
        const date = getRoboDate(s);
        if (!date || date.getFullYear().toString() !== filters.year) {
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
      `🚗 ${filteredRobos.length} robos pasan el filtro`
    );
    renderRobos();
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
   * Renderizar robos en el mapa
   */
  function renderRobos() {
    clusterGroup.clearLayers();

    console.log(`🎯 Renderizando ${filteredRobos.length} robos filtrados...`);
    console.log('🎯 Primeros 3 robos filtrados:');
    filteredRobos.slice(0, 3).forEach((s, i) => {
      console.log(`  [${i}] lat=${s.lat}, lng=${s.lng}, subcategoria=${s.subcategoria}, vecino=${s.vecino}`);
    });
    
    let renderizados = 0;
    let saltados = 0;
    
    filteredRobos.forEach((robo) => {
      if (!robo.lat || !robo.lng) {
        saltados++;
        if (saltados <= 3) { // Only log first 3 for brevity
          console.log(`⊘ Robo saltado (sin coords): lat=${robo.lat}, lng=${robo.lng}`, robo);
        }
        return;
      }

      const color = getCauseColor(robo.subcategoria);
      const causeLabel = getCauseLabel(robo.subcategoria);
      renderizados++;
      const fecha = formatDate(getRoboDate(robo));

      // Círculo marcador — mismo estilo que RoboLayer (la lista
      // oficial de 4056), con borde oscuro fijo en vez de borde del mismo
      // color que el relleno, para que se vean como "la misma familia" de
      // marcador en el mapa.
      const marker = L.circleMarker([robo.lat, robo.lng], {
        renderer: touchRenderer,
        radius: 6,
        fillColor: color,
        color: '#333',
        weight: 1,
        opacity: 1,
        fillOpacity: 0.7,
        interactive: true
      });

      // Popup con el mismo formato "plano" que usa RoboLayer (la lista
      // oficial), adaptado a los campos reales de una denuncia de vecino.
      const popupContent = `
        <div style="font-size: 12px; width: 200px; max-height: 200px; overflow-y: auto;">
          <strong style="color: ${color}">🚗 Robo Automotor (vecino)</strong><br>
          <strong>Tipo:</strong> ${causeLabel}<br>
          <strong>Fecha:</strong> ${fecha}<br>
          ${robo.texto ? `<strong>Descripción:</strong> ${robo.texto}<br>` : ''}
          <strong>Reportado por:</strong> ${robo.vecino || 'Anónimo'}<br>
          <strong>Estado:</strong> ${robo.estado || 'nueva'}
          ${robo.hasImage && robo.imageUrl ? `
            <br><img src="${robo.imageUrl}" style="max-width: 100%; border-radius: 4px; max-height: 120px; margin-top: 6px;">
          ` : ''}
        </div>
      `;

      marker.bindPopup(popupContent);
      marker.on('mouseover', function () { this.openPopup(); });

      clusterGroup.addLayer(marker);
    });

    console.log(`🚦 Renderizados: ${renderizados}, Saltados (sin coords): ${saltados}`);

    if (!map.hasLayer(clusterGroup) && isVisible) {
      map.addLayer(clusterGroup);
    }

    console.log(
      `🚦 ${clusterGroup.getLayers().length} marcadores de robos en mapa`
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
      console.warn('⚠️ RobosHistoricoLayer.toggle(): map no disponible');
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
    console.log(`🚦 RobosHistoricoLayer ${show ? 'visible' : 'oculto'}`);
  }

  /**
   * Obtener metadatos
   */
  function getMetadata() {
    return {
      name: 'Robos (vecinos)',
      layers: clusterGroup,
      icon: '🚗',
      color: '#f97316',
      count: filteredRobos.length,
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
    loadRobosFromFirestore,
    applyFilters,
    renderRobos,
    setFilter,
    toggle,
    getMetadata,
    destroy
  };
})();
