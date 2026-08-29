/**
 * 🚨🔥 ZONA DE RIESGO LAYER
 * Heatmap combinado de siniestros + robos (lista oficial masiva + reportes
 * de vecinos) para dar una idea visual de qué zonas concentran más
 * eventos históricos. Pensado para verse liviano en el mapa del vecino
 * (solo pinta densidad — no arma marcadores individuales ni clusters) y
 * también disponible como capa más en el panel admin.
 *
 * Fuentes, todas con el mismo peso (2026-08, decisión consciente: no se
 * le da más peso a lo reportado por vecinos que a la lista oficial — la
 * densidad ya hace el trabajo sola, así que a medida que los vecinos van
 * cargando más eventos esa zona se "calienta" más sin necesidad de un
 * peso especial):
 *  - Siniestros oficiales (lista masiva subida por el admin, colección
 *    clientes/{clienteId}/siniestros)
 *  - Robos oficiales (lista masiva subida por el admin, colección
 *    clientes/{clienteId}/robo)
 *  - Siniestros reportados por vecinos (denuncias_historico,
 *    categoria === 'accidentes')
 *  - Robos reportados por vecinos (denuncias_historico,
 *    categoria === 'vehiculos' + subcategoria en
 *    robo_auto/robo_moto/robo_bicicleta — igual criterio que usa
 *    RobosHistoricoLayer, ver ese archivo)
 *
 * Al tocar el mapa con la capa activa, cuenta cuántos eventos de cada tipo
 * hay en un radio (RADIO_CONSULTA_M) alrededor del punto tocado y muestra
 * un popup con nivel de riesgo (Baja/Media/Alta) + desglose siniestros/robos.
 *
 * 🆕 (2026-08) Modo "Comparar Zona": para medir si una intervención
 * (alumbrado nuevo, más patrullaje, cámara instalada, etc.) mejoró la
 * seguridad de una zona. Se activa aparte del heatmap (checkbox propio).
 * Al tocar el mapa en este modo, en vez del popup de riesgo aparece un
 * formulario para elegir una fecha de corte (ej: cuándo se hizo la
 * intervención) y calcula cuántos eventos hubo ANTES y DESPUÉS de esa
 * fecha, en el mismo radio, usando una VENTANA SIMÉTRICA (misma cantidad
 * de días de cada lado) para que la comparación sea justa — comparar "toda
 * la historia antes" contra "2 semanas después" sobrestimaría la mejora
 * artificialmente. Si la muestra total es chica, se lo avisa al usuario en
 * vez de sugerir una tendencia que en realidad es ruido estadístico.
 */
window.ZonaRiesgoLayer = (() => {
  const RADIO_CONSULTA_M = 300; // metros para el conteo al tocar el mapa

  // Umbrales de cantidad de eventos dentro del radio de consulta para
  // clasificar el nivel de riesgo. Son un punto de partida razonable;
  // conviene ajustarlos con el volumen real de datos de cada ciudad una
  // vez que haya uso real (si todo da "Alta" o todo da "Baja", tocar
  // estos dos números).
  const UMBRAL_MEDIA = 5;
  const UMBRAL_ALTA = 20;

  // Por debajo de esta cantidad total de eventos (antes + después) el
  // comparador avisa que la muestra es chica y el resultado puede ser
  // ruido, no una tendencia real.
  const MUESTRA_MINIMA_CONFIABLE = 6;

  // Subcategorías de 'vehiculos' que cuentan como robo (mismo criterio que
  // ROBOS_SUBCATEGORIAS en robos-historico-layer.js).
  const ROBOS_SUBCATEGORIAS = ['robo_auto', 'robo_moto', 'robo_bicicleta'];

  let map = null;
  let heatInstance = null;
  let clickMarker = null;
  let isVisible = false;
  let modoComparador = false;
  let barriosGeoJson = null;
  let barrioHighlight = null;
  let filtroBarrioNombre = null;      // 🆕 barrio en estudio (o null = ciudad completa)
  let filtroBarrioFeatures = null;    // 🆕 features del barrio filtrado, precalculadas

  // Cada fuente guarda su propio array de puntos {lat, lng, tipo, fecha}.
  // fecha es un objeto Date o null si no se pudo determinar (documentos
  // importados masivamente sin campo de fecha reconocible).
  const fuentes = {
    siniestros_oficial: [],
    robos_oficial: [],
    siniestros_vecino: [],
    robos_vecino: []
  };

  function init(leafletMap) {
    // 🐛 Fix (2026-08): si init() se llama más de una vez (cambio de
    // cliente, remount del mapa) hay que desenganchar el listener del
    // mapa VIEJO antes de pisar la variable `map` — si no, el click nunca
    // se reengancha al mapa nuevo (quedaba pegado al viejo, que ya no
    // recibe clicks del usuario) y el heatmap se ve pero el click no hace
    // nada. Antes esto se evitaba con un flag `clickHandlerAttached` que
    // solo dejaba enganchar una vez en la vida del módulo — mal si el
    // mapa se recrea.
    if (map && map !== leafletMap) {
      map.off('click', onMapClick);
    }
    map = leafletMap;
    map.off('click', onMapClick); // por si init() se llama 2 veces con el mismo mapa
    map.on('click', onMapClick);
    initComparadorBarrioUI();
    console.log('🚨🔥 ZonaRiesgoLayer inicializado');
  }

  /**
   * Obtiene la fecha de un evento REPORTADO POR VECINOS (denuncias_historico)
   * probando varios campos posibles (mismo criterio que getRoboDate() en
   * robos-historico-layer.js): 'timestamp' es de fiar acá porque es el
   * momento real en que se creó la denuncia en la app.
   */
  function getEventDate(obj) {
    if (!obj) return null;

    if (obj.timestamp) {
      if (obj.timestamp instanceof Date) return obj.timestamp;
      if (obj.timestamp.toMillis) return new Date(obj.timestamp.toMillis());
      const d = new Date(obj.timestamp);
      if (!isNaN(d)) return d;
    }

    if (obj.created_at) {
      if (obj.created_at instanceof Date) return obj.created_at;
      if (obj.created_at.toMillis) return new Date(obj.created_at.toMillis());
      const d = new Date(obj.created_at);
      if (!isNaN(d)) return d;
    }

    const fechaStr = obj.FECHA || obj.fecha;
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

  function getPropFlexible(props, keys) {
    if (!props) return null;
    for (const key of keys) {
      if (props[key]) return props[key];
    }
    // Fallback: coincidencia parcial case-insensitive (mismo criterio que
    // getProp() en siniestros-layer.js, por si el nombre de columna vino
    // con variaciones de mayúsculas/encoding del CSV original).
    const searchKeys = keys.map((k) => k.toLowerCase());
    for (const [propKey, propVal] of Object.entries(props)) {
      if (searchKeys.some((sk) => propKey.toLowerCase().includes(sk))) {
        return propVal;
      }
    }
    return null;
  }

  function parseFechaFlexible(valor) {
    if (!valor) return null;
    if (valor instanceof Date) return valor;
    if (valor.toMillis) return new Date(valor.toMillis());
    if (typeof valor === 'string') {
      if (valor.includes('/')) {
        const [dd, mm, yy] = valor.split('/');
        if (dd && mm && yy) {
          const year = yy.length === 2 ? `20${yy}` : yy;
          const d = new Date(`${year}-${mm}-${dd}`);
          if (!isNaN(d)) return d;
        }
      }
      const d = new Date(valor);
      if (!isNaN(d)) return d;
    }
    return null;
  }

  /**
   * 🐛 Fix fechas (2026-08): esta es la fecha para datos OFICIALES (lista
   * masiva subida por el admin) — NO es lo mismo que getEventDate(), que
   * es para denuncias de vecinos. Al principio esta capa usaba
   * getEventDate() para todo, con 'timestamp'/'created_at' como primera
   * opción — pero en los documentos importados en lote esos campos suelen
   * reflejar cuándo se SUBIÓ el archivo a Firestore, no la fecha real del
   * siniestro/robo. Resultado: el comparador antes/después mostraba
   * siempre "0 eventos antes", porque todo terminaba con una fecha de
   * importación reciente. El campo confiable con la fecha real es
   * 'fecha'/'FECHA'/'FECHA_SINIESTRO' — el mismo que ya usa
   * siniestros-layer.js (normalizeFilterProps) para sus filtros por año,
   * que sabemos que funcionan bien. Si un documento no tiene ese campo,
   * mejor dejarlo sin fecha (se excluye del comparador) que mentir con
   * una fecha de importación.
   */
  function getFechaOficial(properties) {
    const valor = getPropFlexible(properties, ['fecha', 'FECHA_SINIESTRO', 'FECHA']);
    return parseFechaFlexible(valor);
  }

  /**
   * Carga los siniestros oficiales (GeoJSON, mismo formato que usa
   * SiniestrosLayer/heatmapLayer). Se llama desde app.js cada vez que se
   * cargan/recargan los siniestros del cliente.
   */
  function setSiniestrosOficiales(geojson) {
    fuentes.siniestros_oficial = extraerPuntosDeGeoJson(geojson, 'siniestro_oficial');
    const conFecha = fuentes.siniestros_oficial.filter((p) => p.fecha).length;
    console.log(`🚨🔥 ZonaRiesgoLayer: siniestros oficiales con fecha reconocida: ${conFecha}/${fuentes.siniestros_oficial.length}`);
    render();
  }

  /**
   * Carga los robos oficiales (GeoJSON, mismo formato que usa RoboLayer).
   */
  function setRobosOficiales(geojson) {
    fuentes.robos_oficial = extraerPuntosDeGeoJson(geojson, 'robo_oficial');
    const conFecha = fuentes.robos_oficial.filter((p) => p.fecha).length;
    console.log(`🚨🔥 ZonaRiesgoLayer: robos oficiales con fecha reconocida: ${conFecha}/${fuentes.robos_oficial.length}`);
    render();
  }

  function extraerPuntosDeGeoJson(geojson, tipo) {
    if (!geojson || !Array.isArray(geojson.features)) return [];
    return geojson.features
      .filter((f) => f.geometry && Array.isArray(f.geometry.coordinates))
      .map((f) => ({
        lat: f.geometry.coordinates[1],
        lng: f.geometry.coordinates[0],
        tipo,
        fecha: getFechaOficial(f.properties)
      }))
      .filter((p) => Number.isFinite(p.lat) && Number.isFinite(p.lng));
  }

  /**
   * Recibe el array crudo de denuncias_historico (el mismo que maneja
   * DenunciasHistoricoLayer) y separa siniestros/robos reportados por
   * vecinos. Se llama cada vez que ese listener de Firestore trae datos
   * nuevos, así que esta capa queda al día sola con cada denuncia nueva.
   */
  function setDenunciasVecinos(denuncias) {
    const siniestrosVecino = [];
    const robosVecino = [];

    (denuncias || []).forEach((d) => {
      if (typeof d.lat !== 'number' || typeof d.lng !== 'number') return;
      const fecha = getEventDate(d);

      if (d.categoria === 'accidentes') {
        siniestrosVecino.push({ lat: d.lat, lng: d.lng, tipo: 'siniestro_vecino', fecha });
      } else if (d.categoria === 'vehiculos' && ROBOS_SUBCATEGORIAS.includes(d.subcategoria)) {
        robosVecino.push({ lat: d.lat, lng: d.lng, tipo: 'robo_vecino', fecha });
      }
    });

    fuentes.siniestros_vecino = siniestrosVecino;
    fuentes.robos_vecino = robosVecino;
    render();
  }

  function getTodosLosPuntos() {
    const todos = [
      ...fuentes.siniestros_oficial,
      ...fuentes.robos_oficial,
      ...fuentes.siniestros_vecino,
      ...fuentes.robos_vecino
    ];
    // 🆕 Filtro por barrio en estudio: si hay uno seteado, solo cuentan los
    // puntos que caen dentro de su polígono (mismo criterio punto-en-polígono
    // que ya usa compararBarrioPorNombre()). Afecta al heatmap (render()) y
    // también al conteo del popup al hacer click (contarEnRadio()), porque
    // ambos pasan por acá.
    if (filtroBarrioFeatures && filtroBarrioFeatures.length > 0) {
      return todos.filter((p) => puntoEnAlgunPoligono(p, filtroBarrioFeatures));
    }
    return todos;
  }

  function render() {
    if (!map || !isVisible) return;

    const puntos = getTodosLosPuntos();

    if (heatInstance) {
      map.removeLayer(heatInstance);
      heatInstance = null;
    }
    if (puntos.length === 0) return;

    // Todos los puntos con la misma intensidad — ver nota de pesos arriba
    // en la cabecera del archivo.
    //
    // 🎚️ Ajuste de granularidad (2026-08): con radius/blur grandes y sin
    // "max" explícito, leaflet.heat satura a rojo apenas se superponen
    // pocos puntos — en una ciudad con lista oficial + reportes, terminaba
    // casi toda la ciudad roja, sin distinguir zonas de más/menos riesgo.
    // Radio y blur más chicos + "max" más alto (hace falta más densidad
    // real para llegar a rojo) dan un degradé más fiel a la cantidad de
    // eventos de cada zona.
    const heatData = puntos.map((p) => [p.lat, p.lng, 0.4]);

    heatInstance = L.heatLayer(heatData, {
      radius: 18,
      blur: 15,
      maxZoom: 17,
      max: 3.0,
      gradient: {
        0.0: '#22c55e', // Verde: baja densidad
        0.3: '#a3e635', // Verde-amarillo
        0.5: '#eab308', // Amarillo
        0.7: '#f97316', // Naranja
        1.0: '#dc2626'  // Rojo: alta densidad
      }
    });
    map.addLayer(heatInstance);
    console.log(`🚨🔥 ZonaRiesgoLayer: ${puntos.length} eventos en el heatmap`);
  }

  function toggle(show) {
    isVisible = show;
    if (show) {
      render();
    } else {
      if (heatInstance) {
        map.removeLayer(heatInstance);
        heatInstance = null;
      }
      if (clickMarker) {
        map.removeLayer(clickMarker);
        clickMarker = null;
      }
    }
    console.log(`🚨🔥 ZonaRiesgoLayer ${show ? 'visible' : 'oculto'}`);
  }

  /**
   * Activa/desactiva el modo "Comparar Zona". Es independiente del
   * heatmap: se puede usar el comparador sin tener el heatmap prendido.
   */
  function toggleComparador(show) {
    modoComparador = show;
    if (!show) {
      if (clickMarker) {
        map.removeLayer(clickMarker);
        clickMarker = null;
      }
      if (barrioHighlight) {
        map.removeLayer(barrioHighlight);
        barrioHighlight = null;
      }
    }
    console.log(`📊 ZonaRiesgoLayer: modo comparador ${show ? 'activado' : 'desactivado'}`);
  }

  /**
   * Distancia en metros entre dos coordenadas (fórmula de Haversine).
   */
  function distanciaMetros(lat1, lng1, lat2, lng2) {
    const R = 6371000;
    const rad = (x) => (x * Math.PI) / 180;
    const dLat = rad(lat2 - lat1);
    const dLng = rad(lng2 - lng1);
    const a =
      Math.sin(dLat / 2) ** 2 +
      Math.cos(rad(lat1)) * Math.cos(rad(lat2)) * Math.sin(dLng / 2) ** 2;
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  }

  function contarEnRadio(lat, lng) {
    const conteo = {
      siniestro_oficial: 0,
      robo_oficial: 0,
      siniestro_vecino: 0,
      robo_vecino: 0
    };
    getTodosLosPuntos().forEach((p) => {
      if (distanciaMetros(lat, lng, p.lat, p.lng) <= RADIO_CONSULTA_M) {
        conteo[p.tipo]++;
      }
    });
    return conteo;
  }

  /**
   * Calcula el conteo antes/después de una fecha de corte sobre un
   * conjunto de puntos YA FILTRADO espacialmente (por radio o por barrio
   * — ver compararZona()/compararBarrioPorNombre() más abajo). Usa una
   * ventana simétrica (misma cantidad de días de cada lado — ver nota en
   * la cabecera del archivo).
   */
  function compararConjunto(puntos, fechaCorte) {
    const msPorDia = 24 * 60 * 60 * 1000;
    const ahora = new Date();

    // Ventana "después": desde la fecha de corte hasta hoy.
    const diasDespues = Math.max(1, Math.round((ahora - fechaCorte) / msPorDia));
    // Ventana "antes": misma cantidad de días, inmediatamente anterior al
    // corte — así ambos lados cubren el mismo período de tiempo.
    const diasAntes = diasDespues;
    const inicioAntes = new Date(fechaCorte.getTime() - diasAntes * msPorDia);

    const antes = { siniestro_oficial: 0, robo_oficial: 0, siniestro_vecino: 0, robo_vecino: 0 };
    const despues = { siniestro_oficial: 0, robo_oficial: 0, siniestro_vecino: 0, robo_vecino: 0 };
    let sinFecha = 0;

    puntos.forEach((p) => {
      if (!p.fecha) {
        sinFecha++;
        return;
      }
      if (p.fecha >= inicioAntes && p.fecha < fechaCorte) {
        antes[p.tipo]++;
      } else if (p.fecha >= fechaCorte && p.fecha <= ahora) {
        despues[p.tipo]++;
      }
    });

    const totalAntes = Object.values(antes).reduce((a, b) => a + b, 0);
    const totalDespues = Object.values(despues).reduce((a, b) => a + b, 0);
    const cambioPct = totalAntes > 0 ? ((totalDespues - totalAntes) / totalAntes) * 100 : null;

    return { antes, despues, diasAntes, diasDespues, totalAntes, totalDespues, cambioPct, sinFecha };
  }

  /**
   * Comparador por punto + radio (el que ya existía).
   */
  function compararZona(lat, lng, fechaCorte) {
    const puntos = getTodosLosPuntos().filter(
      (p) => distanciaMetros(lat, lng, p.lat, p.lng) <= RADIO_CONSULTA_M
    );
    return compararConjunto(puntos, fechaCorte);
  }

  /**
   * 🆕 Comparador por barrio: usa turf.js (ya cargado en map.html) para
   * un test de punto-en-polígono, mismo criterio que isInBarrio() en
   * denuncias-historico-layer.js. Un barrio puede tener más de un
   * feature/polígono (islas, recortes) con el mismo nombre — un punto
   * cuenta si cae dentro de CUALQUIERA de ellos.
   */
  function getNombreBarrio(feature) {
    const p = (feature && feature.properties) || {};
    return p.nombre || p.BARRIO || p.barrio || 'Sin nombre';
  }

  function puntoEnAlgunPoligono(p, features) {
    if (typeof turf === 'undefined') return false;
    let point;
    try {
      point = turf.point([p.lng, p.lat]);
    } catch (err) {
      return false;
    }
    return features.some((f) => {
      try {
        return turf.booleanPointInPolygon(point, f);
      } catch (err) {
        return false;
      }
    });
  }

  /**
   * 🆕 Nombre del barrio (cualquiera, no solo el filtrado) donde cae un
   * punto — se usa para agregar el nombre del barrio arriba del popup de
   * riesgo cuando el click cae dentro de un polígono, en vez de dejar que
   * el popup de Zonas/Barrios (geo-layers.js) se tape con el nuestro.
   */
  function getBarrioEnPunto(lat, lng) {
    if (!barriosGeoJson || !Array.isArray(barriosGeoJson.features) || typeof turf === 'undefined') {
      return null;
    }
    let point;
    try {
      point = turf.point([lng, lat]);
    } catch (err) {
      return null;
    }
    const feature = barriosGeoJson.features.find((f) => {
      try {
        return turf.booleanPointInPolygon(point, f);
      } catch (err) {
        return false;
      }
    });
    return feature ? getNombreBarrio(feature) : null;
  }

  function setBarriosGeoJson(geojson) {
    barriosGeoJson = geojson;
    poblarSelectorBarrios();
    // 🆕 Si ya había un barrio filtrado seteado antes de que llegara el
    // GeoJSON (orden de carga no garantizado), recalcular sus features ahora.
    if (filtroBarrioNombre && Array.isArray(geojson?.features)) {
      const buscado = filtroBarrioNombre.trim().toLowerCase();
      filtroBarrioFeatures = geojson.features.filter((f) => getNombreBarrio(f).trim().toLowerCase() === buscado);
      render();
    }
  }

  /**
   * 🆕 Filtra el heatmap (y el conteo del popup al hacer click) para que
   * solo tenga en cuenta el barrio en estudio, en vez de toda la ciudad.
   * Firma (key, value) igual que el resto de las capas (SiniestrosLayer,
   * RoboLayer, etc.) para engancharse desde app.js sin caso especial. Por
   * ahora solo maneja la clave 'globalBarrio'. Pasar 'all' (o value falsy)
   * vuelve a ver todos los barrios.
   */
  function setFilter(key, value) {
    if (key !== 'globalBarrio') return;
    filtroBarrioNombre = (value && value !== 'all') ? value : null;
    if (filtroBarrioNombre && barriosGeoJson && Array.isArray(barriosGeoJson.features)) {
      // Case-insensitive + trim (mismo criterio que highlightBarrio() en
      // geo-layers.js) — el nombre que llega acá sale del selector global
      // (calculado desde los siniestros, no siempre 1:1 con el nombre tal
      // cual está en el GeoJSON), así que una comparación exacta podía
      // fallar por mayúsculas/espacios y dejar el heatmap en cero puntos.
      const buscado = filtroBarrioNombre.trim().toLowerCase();
      filtroBarrioFeatures = barriosGeoJson.features.filter(
        (f) => getNombreBarrio(f).trim().toLowerCase() === buscado
      );
    } else {
      filtroBarrioFeatures = null;
    }
    // 🔍 Diagnóstico temporal: confirmar si el nombre matchea contra el
    // GeoJSON de barrios. Si "features encontradas" da 0 con un barrio
    // elegido, el heatmap queda filtrado a cero puntos — por eso no se ve
    // nada aunque la capa esté tildada.
    console.log(`🚨🔥 ZonaRiesgoLayer.setFilter: barrio="${filtroBarrioNombre}" → ${filtroBarrioFeatures ? filtroBarrioFeatures.length : 'sin filtro'} features encontradas`);
    render();
  }

  function poblarSelectorBarrios() {
    const select = document.getElementById('comparador-barrio-select');
    if (!select || !barriosGeoJson || !Array.isArray(barriosGeoJson.features)) return;

    const nombres = Array.from(new Set(barriosGeoJson.features.map(getNombreBarrio)))
      .filter((n) => n && n !== 'Sin nombre')
      .sort((a, b) => a.localeCompare(b, 'es'));

    const valorPrevio = select.value;
    select.innerHTML =
      '<option value="">Elegí un barrio...</option>' +
      nombres.map((n) => `<option value="${n}">${n}</option>`).join('');
    if (nombres.includes(valorPrevio)) select.value = valorPrevio;
  }

  function resaltarBarrio(nombreBarrio) {
    if (barrioHighlight) {
      map.removeLayer(barrioHighlight);
      barrioHighlight = null;
    }
    if (!barriosGeoJson || !nombreBarrio) return;

    const featuresBarrio = barriosGeoJson.features.filter((f) => getNombreBarrio(f) === nombreBarrio);
    if (featuresBarrio.length === 0) return;

    barrioHighlight = L.geoJSON(
      { type: 'FeatureCollection', features: featuresBarrio },
      { style: { color: '#0ea5e9', weight: 2, fillColor: '#0ea5e9', fillOpacity: 0.1 } }
    ).addTo(map);

    try {
      map.fitBounds(barrioHighlight.getBounds(), { maxZoom: 16, padding: [20, 20] });
    } catch (err) {
      // Si el barrio no tiene geometría válida para bounds, no pasa nada.
    }
  }

  function compararBarrioPorNombre(nombreBarrio, fechaCorte) {
    if (!barriosGeoJson || !nombreBarrio) return null;
    const featuresBarrio = barriosGeoJson.features.filter((f) => getNombreBarrio(f) === nombreBarrio);
    if (featuresBarrio.length === 0) return null;

    const puntos = getTodosLosPuntos().filter((p) => puntoEnAlgunPoligono(p, featuresBarrio));
    return compararConjunto(puntos, fechaCorte);
  }

  /**
   * Engancha los controles del panel "Comparar por barrio" del sidebar
   * (ver app.js). Se llama una sola vez desde init() — los elementos ya
   * están en el DOM desde que carga la página (ocultos con display:none
   * hasta que se prende el checkbox de comparador), así que no hace falta
   * esperar ningún evento.
   */
  function initComparadorBarrioUI() {
    const btn = document.getElementById('comparador-barrio-btn');
    const select = document.getElementById('comparador-barrio-select');
    const fechaInput = document.getElementById('comparador-barrio-fecha');
    const resDiv = document.getElementById('comparador-barrio-resultado');
    if (!btn || !select || !fechaInput || !resDiv) return;

    // Fecha por defecto: hoy - 30 días (mismo criterio que el comparador
    // por punto).
    fechaInput.value = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);

    select.addEventListener('change', () => {
      resDiv.innerHTML = '';
      if (select.value) resaltarBarrio(select.value);
    });

    btn.addEventListener('click', () => {
      const nombreBarrio = select.value;
      const valor = fechaInput.value;
      const fechaCorte = valor ? new Date(`${valor}T00:00:00`) : null;

      if (!nombreBarrio) {
        resDiv.innerHTML = '<div style="font-size: 11px; color: #dc2626; margin-top: 6px;">Elegí un barrio primero.</div>';
        return;
      }
      if (!fechaCorte || isNaN(fechaCorte)) {
        resDiv.innerHTML = '<div style="font-size: 11px; color: #dc2626; margin-top: 6px;">Fecha inválida.</div>';
        return;
      }

      resaltarBarrio(nombreBarrio);
      const resultado = compararBarrioPorNombre(nombreBarrio, fechaCorte);
      if (!resultado) {
        resDiv.innerHTML = '<div style="font-size: 11px; color: #dc2626; margin-top: 6px;">No se encontró la geometría de ese barrio.</div>';
        return;
      }
      resDiv.innerHTML = renderResultadoComparador(resultado, `en el barrio "${nombreBarrio}"`);
    });
  }

  function clasificarRiesgo(total) {
    if (total >= UMBRAL_ALTA) return { nivel: 'Alta', color: '#dc2626', emoji: '🔴' };
    if (total >= UMBRAL_MEDIA) return { nivel: 'Media', color: '#f59e0b', emoji: '🟠' };
    if (total > 0) return { nivel: 'Baja', color: '#22c55e', emoji: '🟢' };
    return { nivel: 'Sin datos', color: '#94a3b8', emoji: '⚪' };
  }

  function onMapClick(e) {
    // 🔍 Diagnóstico temporal: confirmar si el click está llegando acá.
    console.log('🚨🔥 ZonaRiesgoLayer.onMapClick DISPARADO', { isVisible, modoComparador, target: e.originalEvent?.target?.tagName });

    // 🛡️ Defensa extra: si el click originó dentro de un popup nuestro
    // (además del disableClickPropagation que ya se aplica al abrirlo),
    // ignorarlo — evita que tocar "Calcular" dispare un click de mapa
    // nuevo y tape el resultado con un popup en blanco.
    if (e.originalEvent && e.originalEvent.target && e.originalEvent.target.closest) {
      if (e.originalEvent.target.closest('.leaflet-popup')) {
        console.log('🚨🔥 ZonaRiesgoLayer.onMapClick: ignorado (click dentro de un popup)');
        return;
      }
    }

    if (modoComparador) {
      onMapClickComparador(e);
      return;
    }
    if (!isVisible) return;

    const { lat, lng } = e.latlng;
    const nombreBarrio = getBarrioEnPunto(lat, lng);   // 🆕
    const conteo = contarEnRadio(lat, lng);
    const totalSiniestros = conteo.siniestro_oficial + conteo.siniestro_vecino;
    const totalRobos = conteo.robo_oficial + conteo.robo_vecino;
    const total = totalSiniestros + totalRobos;
    const riesgo = clasificarRiesgo(total);

    if (clickMarker) {
      map.removeLayer(clickMarker);
    }
    // 🆕 Círculo real de RADIO_CONSULTA_M metros (L.circle usa metros, a
    // diferencia de L.circleMarker que usa píxeles) — así se ve exactamente
    // qué área se tuvo en cuenta para el conteo, no solo un punto.
    clickMarker = L.circle([lat, lng], {
      radius: RADIO_CONSULTA_M,
      color: riesgo.color,
      weight: 2,
      fillColor: riesgo.color,
      fillOpacity: 0.12
    }).addTo(map);

    const popupContent = `
      <div style="font-size: 13px; min-width: 190px;">
        ${nombreBarrio ? `<div style="font-weight:bold;font-size:14px;margin-bottom:6px;border-bottom:1px solid #e5e7eb;padding-bottom:4px;">📍 ${nombreBarrio}</div>` : ''}
        <div style="font-weight: bold; color: ${riesgo.color}; margin-bottom: 6px;">
          ${riesgo.emoji} Riesgo ${riesgo.nivel} <span style="font-weight: normal; color: #666;">(radio ${RADIO_CONSULTA_M}m)</span>
        </div>
        <div style="margin-bottom: 4px;">💥 Siniestros: <strong>${totalSiniestros}</strong></div>
        <div style="margin-bottom: 4px;">🚗 Robos: <strong>${totalRobos}</strong></div>
        <div style="font-size: 10px; color: #999; margin-top: 6px;">
          En un radio de ${RADIO_CONSULTA_M}m — incluye lista oficial y reportes de vecinos
        </div>
      </div>
    `;
    clickMarker.bindPopup(popupContent).openPopup();
  }

  function renderResultadoComparador(r, ambitoTexto) {
    let cambioTexto = 'Sin eventos "antes" para comparar';
    let colorCambio = '#666';
    if (r.cambioPct !== null) {
      const flecha = r.cambioPct <= 0 ? '↓' : '↑';
      colorCambio = r.cambioPct <= 0 ? '#22c55e' : '#dc2626';
      cambioTexto = `${flecha} ${Math.abs(r.cambioPct).toFixed(0)}%`;
    }
    const muestraChica = (r.totalAntes + r.totalDespues) < MUESTRA_MINIMA_CONFIABLE;

    return `
      <div style="border-top: 1px solid #e5e7eb; margin-top: 8px; padding-top: 8px; font-size: 12px;">
        <table style="width: 100%; border-collapse: collapse;">
          <tr style="font-weight: bold; color: #666;">
            <td></td>
            <td style="text-align: center;">Antes</td>
            <td style="text-align: center;">Después</td>
          </tr>
          <tr>
            <td>💥 Siniestros</td>
            <td style="text-align: center;">${r.antes.siniestro_oficial + r.antes.siniestro_vecino}</td>
            <td style="text-align: center;">${r.despues.siniestro_oficial + r.despues.siniestro_vecino}</td>
          </tr>
          <tr>
            <td>🚗 Robos</td>
            <td style="text-align: center;">${r.antes.robo_oficial + r.antes.robo_vecino}</td>
            <td style="text-align: center;">${r.despues.robo_oficial + r.despues.robo_vecino}</td>
          </tr>
          <tr style="font-weight: bold; border-top: 1px solid #e5e7eb;">
            <td>Total</td>
            <td style="text-align: center;">${r.totalAntes}</td>
            <td style="text-align: center;">${r.totalDespues}</td>
          </tr>
        </table>
        <div style="margin-top: 8px; font-weight: bold; color: ${colorCambio};">
          Cambio: ${cambioTexto}
        </div>
        <div style="font-size: 10px; color: #999; margin-top: 6px;">
          Ventana de ${r.diasAntes} días antes vs ${r.diasDespues} días después de la fecha de corte, ${ambitoTexto || `en un radio de ${RADIO_CONSULTA_M}m`}.
          ${r.sinFecha > 0 ? `<br>⚠️ ${r.sinFecha} evento(s) sin fecha reconocible, no se contaron.` : ''}
        </div>
        ${muestraChica ? `<div style="font-size: 10px; color: #f59e0b; margin-top: 6px;">⚠️ Muestra chica (${r.totalAntes + r.totalDespues} eventos en total) — tomalo como indicio, no como dato concluyente.</div>` : ''}
      </div>
    `;
  }

  function onMapClickComparador(e) {
    const { lat, lng } = e.latlng;

    if (clickMarker) {
      map.removeLayer(clickMarker);
    }
    clickMarker = L.circle([lat, lng], {
      radius: RADIO_CONSULTA_M,
      color: '#0ea5e9',
      weight: 2,
      fillColor: '#0ea5e9',
      fillOpacity: 0.12
    }).addTo(map);

    // ID único por click para no chocar si se abren popups seguidos.
    const uid = `zr-cmp-${Date.now()}`;
    const fechaPorDefecto = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
      .toISOString()
      .slice(0, 10);

    function buildHtml(fechaValor, resultadoHtml) {
      return `
        <div id="${uid}" style="font-size: 13px; min-width: 220px;">
          <div style="font-weight: bold; margin-bottom: 8px;">📊 Comparar zona (radio ${RADIO_CONSULTA_M}m)</div>
          <label style="display: block; margin-bottom: 6px; font-size: 12px;">
            Fecha de la intervención:
            <input type="date" id="${uid}-fecha" value="${fechaValor}" style="width: 100%; margin-top: 4px; padding: 4px; box-sizing: border-box;">
          </label>
          <button id="${uid}-btn" style="width: 100%; padding: 7px; background: #0ea5e9; color: #fff; border: none; border-radius: 4px; cursor: pointer; font-weight: bold;">
            Calcular
          </button>
          <div id="${uid}-resultado">${resultadoHtml || ''}</div>
        </div>
      `;
    }

    // 🐛 Fix #3 (2026-08, el importante): los dos fixes anteriores
    // resolvían que el botón se enganchara y que el click no se filtrara
    // al mapa — con eso el cálculo YA se ejecutaba bien (se veía en la
    // consola), pero el resultado desaparecía al instante igual. La causa
    // real: yo estaba mutando resDiv.innerHTML "por afuera" de Leaflet, y
    // después llamaba a popup.update() para que reacomode el tamaño —
    // pero Popup.update() llama a _updateContent(), que vuelve a pintar
    // el popup con el HTML ORIGINAL que se le pasó a bindPopup() (Leaflet
    // no sabe nada del cambio que hice a mano en el DOM) — así que
    // literalmente pisaba el resultado que acababa de calcular. La forma
    // correcta es usar popup.setContent() con el HTML completo actualizado
    // (formulario + resultado), que si actualiza el estado interno de
    // Leaflet — y como eso reemplaza los elementos del DOM, hay que
    // reenganchar los listeners (disableClickPropagation + el botón)
    // cada vez.
    function attachHandlers() {
      const contenedor = document.getElementById(uid);
      const btn = document.getElementById(`${uid}-btn`);

      if (contenedor && typeof L.DomEvent !== 'undefined' && L.DomEvent.disableClickPropagation) {
        // Evita que el click en el popup se filtre al mapa y dispare un
        // click nuevo (que en modo comparador abriría otro popup encima).
        L.DomEvent.disableClickPropagation(contenedor);
      }

      if (btn) {
        btn.addEventListener('click', (ev) => {
          if (ev && ev.stopPropagation) ev.stopPropagation();

          const fechaInput = document.getElementById(`${uid}-fecha`);
          const valor = fechaInput ? fechaInput.value : '';
          const fechaCorte = valor ? new Date(`${valor}T00:00:00`) : null;
          if (!fechaCorte || isNaN(fechaCorte) || !clickMarker) return;

          const resultado = compararZona(lat, lng, fechaCorte);
          const resultadoHtml = renderResultadoComparador(resultado, `en un radio de ${RADIO_CONSULTA_M}m`);

          clickMarker.getPopup().setContent(buildHtml(valor, resultadoHtml));
          attachHandlers(); // el DOM se reemplazó: reenganchar de nuevo
        });
      }
    }

    clickMarker.bindPopup(buildHtml(fechaPorDefecto, ''), { minWidth: 240 }).openPopup();
    attachHandlers();
  }

  function getMetadata() {
    return {
      name: 'Zona de Riesgo',
      icon: '🚨',
      color: '#dc2626',
      count: getTodosLosPuntos().length
    };
  }

  // API pública
  return {
    init,
    setSiniestrosOficiales,
    setRobosOficiales,
    setDenunciasVecinos,
    setBarriosGeoJson,
    setFilter,
    toggle,
    toggleComparador,
    getMetadata,
    isVisible: () => isVisible
  };
})();
