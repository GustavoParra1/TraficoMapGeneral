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
  let clickHandlerAttached = false;
  let barriosGeoJson = null;
  let barrioHighlight = null;
  // 🆕 Zonas calientes (2026-09): polígono oficial (del catastro de 124
  // barrios de Mar del Plata) que corresponde al barrio_slug del CLIENTE
  // actual — no confundir con `barriosGeoJson` de arriba, que sale de
  // clientes/{id}/barrios (subcolección optativa, suele estar vacía) y se
  // usa para otra cosa. Este es el que filtra "Zonas calientes" para que
  // solo cuente eventos DENTRO del barrio real del cliente — sin esto,
  // colecciones importadas a nivel ciudad (como pasa con varios clientes
  // viejos) muestran eventos de toda Mar del Plata, no solo del barrio.
  let barrioOficialFeature = null;

  // 🆕 Filtro global de barrio (2026-08): mismo bug que tenía RoboLayer —
  // el heatmap mostraba SIEMPRE todos los eventos de la ciudad, sin
  // respetar el "Filtro Global por Barrio" del sidebar. filters.globalBarrio
  // guarda el nombre del barrio seleccionado ('all' = sin filtro).
  const filters = {
    globalBarrio: 'all'
  };

  // Cada fuente guarda su propio array de puntos {lat, lng, tipo, fecha}.
  // fecha es un objeto Date o null si no se pudo determinar (documentos
  // importados masivamente sin campo de fecha reconocible).
  const fuentes = {
    siniestros_oficial: [],
    robos_oficial: [],
    siniestros_vecino: [],
    robos_vecino: [],
    denuncias_amplias: []
  };

  function init(leafletMap) {
    map = leafletMap;
    if (!clickHandlerAttached) {
      map.on('click', onMapClick);
      clickHandlerAttached = true;
    }
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
   * 🐛 Fix (2026-09): esta función replica EXACTAMENTE la misma lógica de
   * extracción de hora que ya usa siniestros-layer.js (normalizeFilterProps),
   * porque confirmamos que los siniestros oficiales SÍ traen una columna de
   * hora real (ej. "07:52:00") — el error anterior fue asumir que NINGÚN
   * dato oficial tenía hora y descartarla siempre. Los robos oficiales, en
   * cambio, no tienen esta columna en el archivo que se importa hoy — si
   * en el futuro se agrega, esta misma función la va a levantar sola sin
   * tocar nada más.
   * Devuelve la hora (0-23) como número, o null si no hay ninguna fuente
   * de hora real disponible en las propiedades del feature.
   */
  function getHoraOficial(properties) {
    if (!properties) return null;
    const horaProp = getPropFlexible(properties, ['hora', 'Hora', 'HORA']);
    if (horaProp) {
      const hourStr = horaProp.toString().split(':')[0];
      const hour = parseInt(hourStr, 10);
      if (Number.isFinite(hour) && hour >= 0 && hour <= 23) return hour;
    }
    // Igual que siniestros-layer.js: si no hay columna 'hora' separada,
    // intentar extraerla de 'timestamp' (formato "2026-05-09T09:38:28...").
    if (properties.timestamp) {
      try {
        const timePart = properties.timestamp.toString().split('T')[1];
        if (timePart) {
          const hour = parseInt(timePart.split(':')[0], 10);
          if (Number.isFinite(hour) && hour >= 0 && hour <= 23) return hour;
        }
      } catch (e) {
        // silenciosamente ignorar, igual que en siniestros-layer.js
      }
    }
    return null;
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

  /**
   * 🆕 Desglose por hora (2026-09): indica si un evento tiene HORA real
   * conocida, no solo fecha. Para denuncias de vecinos, viene de
   * timestamp/created_at (momento real de la carga). Para datos oficiales,
   * viene de getHoraOficial() arriba — el campo 'hora' del archivo
   * importado, cuando existe.
   */
  function tieneHoraReal(obj) {
    if (!obj) return false;
    return !!(obj.timestamp || obj.created_at);
  }

  function extraerPuntosDeGeoJson(geojson, tipo) {
    if (!geojson || !Array.isArray(geojson.features)) return [];
    return geojson.features
      .filter((f) => f.geometry && Array.isArray(f.geometry.coordinates))
      .map((f) => {
        const fecha = getFechaOficial(f.properties);
        const horaOficial = getHoraOficial(f.properties);
        // Si hay fecha (día) Y hora real disponibles, combinamos ambas en
        // un solo Date para que getDesgloseHorario() pueda usar .getHours().
        let fechaFinal = fecha;
        let horaValida = false;
        if (fecha && horaOficial !== null) {
          fechaFinal = new Date(fecha);
          fechaFinal.setHours(horaOficial, 0, 0, 0);
          horaValida = true;
        }
        return {
          lat: f.geometry.coordinates[1],
          lng: f.geometry.coordinates[0],
          tipo,
          fecha: fechaFinal,
          horaValida
        };
      })
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
    // 🆕 Zonas calientes (2026-09): conjunto ampliado, guardado APARTE de
    // siniestros_vecino/robos_vecino para no tocar el conteo que ya usan
    // el popup de riesgo y "Comparar Zona" — esos dos siguen viendo
    // exactamente lo mismo que antes. Acá guardamos categoria/subcategoria
    // de TODA denuncia con coordenadas, salvo 'infraestructura' (reservada
    // para la pregunta de "Factores de riesgo", no es sobre delitos).
    const denunciasAmplias = [];

    (denuncias || []).forEach((d) => {
      if (typeof d.lat !== 'number' || typeof d.lng !== 'number') return;
      const fecha = getEventDate(d);

      if (d.categoria === 'accidentes') {
        siniestrosVecino.push({ lat: d.lat, lng: d.lng, tipo: 'siniestro_vecino', fecha });
      } else if (d.categoria === 'vehiculos' && ROBOS_SUBCATEGORIAS.includes(d.subcategoria)) {
        robosVecino.push({ lat: d.lat, lng: d.lng, tipo: 'robo_vecino', fecha });
      }

      if (d.categoria && d.categoria !== 'infraestructura') {
        denunciasAmplias.push({
          lat: d.lat,
          lng: d.lng,
          categoria: d.categoria,
          subcategoria: d.subcategoria || null,
          fecha,
          horaValida: tieneHoraReal(d)
        });
      }
    });

    fuentes.siniestros_vecino = siniestrosVecino;
    fuentes.robos_vecino = robosVecino;
    fuentes.denuncias_amplias = denunciasAmplias;
    render();
  }

  function getTodosLosPuntos() {
    const todos = [
      ...fuentes.siniestros_oficial,
      ...fuentes.robos_oficial,
      ...fuentes.siniestros_vecino,
      ...fuentes.robos_vecino
    ];

    // 🆕 Filtro global de barrio: si hay uno seleccionado (!= 'all') y
    // tenemos el GeoJSON de barrios cargado, nos quedamos solo con los
    // puntos que caen dentro del polígono de ese barrio.
    if (filters.globalBarrio === 'all' || !barriosGeoJson || !Array.isArray(barriosGeoJson.features)) {
      return todos;
    }
    const featuresBarrio = barriosGeoJson.features.filter(
      (f) => getNombreBarrio(f) === filters.globalBarrio
    );
    if (featuresBarrio.length === 0) return todos; // no matcheó ningún polígono, mejor mostrar todo que mostrar nada por un nombre que no coincide

    return todos.filter((p) => puntoEnAlgunPoligono(p, featuresBarrio));
  }

  // 🆕 setFilter: mismo patrón que usan SiniestrosLayer/RoboLayer/etc. para
  // que app.js pueda avisarle a esta capa cuando cambia el barrio
  // seleccionado en el "Filtro Global por Barrio" del sidebar.
  function setFilter(filterName, value) {
    if (filterName === 'globalBarrio') {
      filters.globalBarrio = value;
      render();
    }
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
    // 🆕 soc_fomen agregado (2026-08): es la propiedad que usa el selector
    // "Filtro Global por Barrio" de app.js para poblar sus opciones — hace
    // falta reconocerla acá también para que el valor que llega a
    // setFilter('globalBarrio', ...) matchee contra el polígono correcto.
    return p.nombre || p.soc_fomen || p.BARRIO || p.barrio || 'Sin nombre';
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

  function setBarriosGeoJson(geojson) {
    barriosGeoJson = geojson;
    poblarSelectorBarrios();
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

  // 🆕 Popup combinado (2026-08): antes, si la capa "Zonas/Barrios" estaba
  // activa, su propio bindPopup frenaba el click ahí mismo (Leaflet no
  // deja que el click siga hasta el mapa cuando el layer clickeado ya
  // abrió un popup propio) — por eso el click de Zona de Riesgo nunca
  // llegaba a dispararse. Ahora geo-layers.js llama a esta función
  // directamente cuando detecta que Zona de Riesgo está activa, pasándole
  // el feature del barrio que YA sabe que clickeaste (más preciso que
  // buscarlo de nuevo acá por punto-en-polígono). Si no se pasa ningún
  // feature (click en el mapa vacío, fuera de cualquier barrio dibujado),
  // se sigue usando la búsqueda por punto-en-polígono de siempre.
  function mostrarPopupRiesgo(lat, lng, featureBarrioConocido) {
    const conteo = contarEnRadio(lat, lng);
    const totalSiniestros = conteo.siniestro_oficial + conteo.siniestro_vecino;
    const totalRobos = conteo.robo_oficial + conteo.robo_vecino;
    const total = totalSiniestros + totalRobos;
    const riesgo = clasificarRiesgo(total);

    let featureBarrio = featureBarrioConocido || null;
    if (!featureBarrio && barriosGeoJson && Array.isArray(barriosGeoJson.features)) {
      featureBarrio = barriosGeoJson.features.find((f) => puntoEnAlgunPoligono({ lat, lng }, [f])) || null;
    }
    const nombreBarrio = featureBarrio ? getNombreBarrio(featureBarrio) : null;

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
        ${nombreBarrio ? `
          <div style="font-weight: bold; margin-bottom: 4px; display:flex; align-items:center; gap:4px;">
            📍 ${nombreBarrio}
          </div>
          <div style="border-top: 1px solid #e5e7eb; margin-bottom: 6px;"></div>
        ` : ''}
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

  function onMapClick(e) {
    // 🛡️ Defensa extra: si el click originó dentro de un popup nuestro
    // (además del disableClickPropagation que ya se aplica al abrirlo),
    // ignorarlo — evita que tocar "Calcular" dispare un click de mapa
    // nuevo y tape el resultado con un popup en blanco.
    if (e.originalEvent && e.originalEvent.target && e.originalEvent.target.closest) {
      if (e.originalEvent.target.closest('.leaflet-popup')) return;
    }

    if (modoComparador) {
      onMapClickComparador(e);
      return;
    }
    if (!isVisible) return;

    mostrarPopupRiesgo(e.latlng.lat, e.latlng.lng, null);
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

  // ==========================================================================
  // 🆕 Zonas calientes (2026-09) — análisis dentro del propio barrio del
  // cliente, no comparación entre barrios distintos.
  //
  // Pesos por categoría (definidos con el cliente, "fijate vos" para
  // infraestructura → queda en 0/excluida acá: es para la pregunta de
  // "Factores de riesgo", no para "concentración de delitos"):
  //   emergencias 5 · personas 4 · vehiculos 3 · propiedad 2 ·
  //   accidentes 2 · seguridad 1.5
  // El histórico OFICIAL de robo automotor no distingue auto/moto/bici
  // (confirmado revisando robo-layer.js: una sola categoría "Robo
  // Automotor", sin ese dato) — por eso el botón "Robo automotor" no se
  // puede separar por tipo de vehículo en la parte oficial, solo en las
  // denuncias de vecinos, que sí traen subcategoría.
  // ==========================================================================
  const PESOS_CATEGORIA = {
    emergencias: 5,
    personas: 4,
    vehiculos: 3,
    propiedad: 2,
    accidentes: 2,
    seguridad: 1.5
  };
  const PESO_MAXIMO = 5; // usado para normalizar intensidad de heatmap 0-1

  function setBarrioOficial(feature) {
    barrioOficialFeature = feature || null;
  }

  function tieneBarrioOficial() {
    return !!barrioOficialFeature;
  }

  /**
   * Filtra puntos para que solo queden los que caen DENTRO del barrio
   * oficial del cliente. Si todavía no se cargó el polígono oficial
   * (setBarrioOficial nunca se llamó, o no hubo match en el catastro),
   * devuelve los puntos sin filtrar — mejor mostrar de más que ocultar
   * todo, pero la UI avisa cuando pasa esto (ver sinBarrioOficial en cada
   * resultado).
   */
  function filtrarPorBarrioOficial(puntos) {
    if (!barrioOficialFeature) return puntos;
    return puntos.filter((p) => puntoEnAlgunPoligono(p, [barrioOficialFeature]));
  }

  function pesoDePunto(p) {
    if (p.tipo === 'robo_oficial') return PESOS_CATEGORIA.vehiculos;
    if (p.tipo === 'siniestro_oficial') return PESOS_CATEGORIA.accidentes;
    if (p.categoria) return PESOS_CATEGORIA[p.categoria] || 1;
    return 1;
  }

  /**
   * Formato [lat, lng, intensidad 0-1] que espera L.heatLayer.
   * @param {boolean} intensidadPareja - true: todos los puntos pesan igual
   *   (heatmaps de una sola categoría, donde ponderar no aporta nada). 
   *   false: usa el peso real de cada punto (Combinado/Zonas más seguras).
   */
  function aFormatoHeat(puntos, intensidadPareja) {
    return puntos.map((p) => [p.lat, p.lng, intensidadPareja ? 0.5 : (pesoDePunto(p) / PESO_MAXIMO)]);
  }

  function puntosRoboAutomotor() {
    const vecinos = fuentes.denuncias_amplias.filter(
      (p) => p.categoria === 'vehiculos' && ROBOS_SUBCATEGORIAS.includes(p.subcategoria)
    );
    return filtrarPorBarrioOficial([...fuentes.robos_oficial, ...vecinos]);
  }

  function puntosPersonas() {
    const vecinos = fuentes.denuncias_amplias.filter((p) => p.categoria === 'personas');
    return filtrarPorBarrioOficial(vecinos);
  }

  function puntosSiniestrosViales() {
    const vecinos = fuentes.denuncias_amplias.filter((p) => p.categoria === 'accidentes');
    return filtrarPorBarrioOficial([...fuentes.siniestros_oficial, ...vecinos]);
  }

  function getHeatmapRoboAutomotor() {
    const puntos = puntosRoboAutomotor();
    return { datos: aFormatoHeat(puntos, true), total: puntos.length, sinBarrioOficial: !barrioOficialFeature };
  }

  function getHeatmapPersonas() {
    const puntos = puntosPersonas();
    return { datos: aFormatoHeat(puntos, true), total: puntos.length, sinBarrioOficial: !barrioOficialFeature };
  }

  function getHeatmapSiniestrosViales() {
    const puntos = puntosSiniestrosViales();
    return { datos: aFormatoHeat(puntos, true), total: puntos.length, sinBarrioOficial: !barrioOficialFeature };
  }

  function getTodosLosPuntosPonderables() {
    return filtrarPorBarrioOficial([
      ...fuentes.siniestros_oficial,
      ...fuentes.robos_oficial,
      ...fuentes.denuncias_amplias
    ]);
  }

  function getHeatmapCombinado() {
    const puntos = getTodosLosPuntosPonderables();
    return { datos: aFormatoHeat(puntos, false), total: puntos.length, sinBarrioOficial: !barrioOficialFeature };
  }

  /**
   * 🆕 Desglose por hora (2026-09): cuenta eventos por hora del día (0-23),
   * pero SOLO entre los que tienen horaValida=true (ver tieneHoraReal más
   * arriba). Los que no tienen hora real quedan aparte en "sinHora" — no se
   * inventan ni se apilan en medianoche.
   */
  function getDesgloseHorario(puntos) {
    const horas = new Array(24).fill(0);
    let sinHora = 0;
    puntos.forEach((p) => {
      if (p.horaValida && p.fecha instanceof Date && !isNaN(p.fecha)) {
        horas[p.fecha.getHours()]++;
      } else {
        sinHora++;
      }
    });
    return { horas, sinHora, total: puntos.length };
  }

  function getDesgloseHorarioRoboAutomotor() {
    return getDesgloseHorario(puntosRoboAutomotor());
  }

  function getDesgloseHorarioPersonas() {
    return getDesgloseHorario(puntosPersonas());
  }

  function getDesgloseHorarioSiniestrosViales() {
    return getDesgloseHorario(puntosSiniestrosViales());
  }

  function getDesgloseHorarioCombinado() {
    return getDesgloseHorario(getTodosLosPuntosPonderables());
  }

  /**
   * Zonas más seguras: grilla sobre el rectángulo que envuelve los eventos
   * YA filtrados al barrio oficial (o, si no hay barrio oficial cargado,
   * sobre todo lo que haya, con el aviso correspondiente en la UI). El
   * tamaño de grilla se adapta a la cantidad de puntos — con pocos eventos,
   * una grilla 8x8 fragmenta demasiado y casi todas las celdas quedan con
   * 0 o 1 evento, sin decir nada útil.
   */
  function getZonasMasSeguras(cantidadCeldas) {
    const N = Number.isFinite(cantidadCeldas) && cantidadCeldas > 0 ? cantidadCeldas : 10;
    const puntos = getTodosLosPuntosPonderables();
    const sinBarrioOficial = !barrioOficialFeature;
    if (puntos.length < 2) return { celdas: [], total: puntos.length, sinBarrioOficial };

    let minLat = Infinity, maxLat = -Infinity, minLng = Infinity, maxLng = -Infinity;
    puntos.forEach((p) => {
      if (p.lat < minLat) minLat = p.lat;
      if (p.lat > maxLat) maxLat = p.lat;
      if (p.lng < minLng) minLng = p.lng;
      if (p.lng > maxLng) maxLng = p.lng;
    });

    const LADO = Math.max(3, Math.min(8, Math.round(Math.sqrt(puntos.length))));
    const pasoLat = (maxLat - minLat) / LADO || 0.001;
    const pasoLng = (maxLng - minLng) / LADO || 0.001;

    const celdas = [];
    for (let fila = 0; fila < LADO; fila++) {
      for (let col = 0; col < LADO; col++) {
        const latMin = minLat + fila * pasoLat;
        const lngMin = minLng + col * pasoLng;
        celdas.push({
          latMin, latMax: latMin + pasoLat,
          lngMin, lngMax: lngMin + pasoLng,
          peso: 0, eventos: 0
        });
      }
    }

    puntos.forEach((p) => {
      const celda = celdas.find(
        (c) => p.lat >= c.latMin && p.lat < c.latMax && p.lng >= c.lngMin && p.lng < c.lngMax
      );
      if (celda) {
        celda.peso += pesoDePunto(p);
        celda.eventos++;
      }
    });

    const topCeldas = celdas
      .filter((c) => c.eventos > 0)
      .sort((a, b) => a.peso - b.peso)
      .slice(0, N);

    return { celdas: topCeldas, total: puntos.length, sinBarrioOficial };
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
    setBarrioOficial,
    tieneBarrioOficial,
    getHeatmapRoboAutomotor,
    getHeatmapPersonas,
    getHeatmapSiniestrosViales,
    getHeatmapCombinado,
    getDesgloseHorarioRoboAutomotor,
    getDesgloseHorarioPersonas,
    getDesgloseHorarioSiniestrosViales,
    getDesgloseHorarioCombinado,
    getZonasMasSeguras,
    getMetadata,
    isVisible: () => isVisible,
    mostrarPopupRiesgo
  };
})();
