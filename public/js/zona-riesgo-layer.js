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
    map = leafletMap;
    if (!clickHandlerAttached) {
      map.on('click', onMapClick);
      clickHandlerAttached = true;
    }
    console.log('🚨🔥 ZonaRiesgoLayer inicializado');
  }

  /**
   * Obtiene la fecha de un evento probando varios campos posibles (mismo
   * criterio que getRoboDate() en robos-historico-layer.js): los
   * documentos importados masivamente no siempre tienen 'timestamp' —
   * pueden tener 'created_at' (Firestore Timestamp) o 'FECHA'/'fecha'
   * (string "dd/mm/aa" o similar).
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

  /**
   * Carga los siniestros oficiales (GeoJSON, mismo formato que usa
   * SiniestrosLayer/heatmapLayer). Se llama desde app.js cada vez que se
   * cargan/recargan los siniestros del cliente.
   */
  function setSiniestrosOficiales(geojson) {
    fuentes.siniestros_oficial = extraerPuntosDeGeoJson(geojson, 'siniestro_oficial');
    render();
  }

  /**
   * Carga los robos oficiales (GeoJSON, mismo formato que usa RoboLayer).
   */
  function setRobosOficiales(geojson) {
    fuentes.robos_oficial = extraerPuntosDeGeoJson(geojson, 'robo_oficial');
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
        fecha: getEventDate(f.properties)
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
    return [
      ...fuentes.siniestros_oficial,
      ...fuentes.robos_oficial,
      ...fuentes.siniestros_vecino,
      ...fuentes.robos_vecino
    ];
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
    if (!show && clickMarker) {
      map.removeLayer(clickMarker);
      clickMarker = null;
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

  function clasificarRiesgo(total) {
    if (total >= UMBRAL_ALTA) return { nivel: 'Alta', color: '#dc2626', emoji: '🔴' };
    if (total >= UMBRAL_MEDIA) return { nivel: 'Media', color: '#f59e0b', emoji: '🟠' };
    if (total > 0) return { nivel: 'Baja', color: '#22c55e', emoji: '🟢' };
    return { nivel: 'Sin datos', color: '#94a3b8', emoji: '⚪' };
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

    const { lat, lng } = e.latlng;
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

  /**
   * Calcula el conteo antes/después de una fecha de corte, en el mismo
   * radio, usando una ventana simétrica (misma cantidad de días de cada
   * lado — ver nota en la cabecera del archivo).
   */
  function compararZona(lat, lng, fechaCorte) {
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

    getTodosLosPuntos().forEach((p) => {
      if (distanciaMetros(lat, lng, p.lat, p.lng) > RADIO_CONSULTA_M) return;
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

  function renderResultadoComparador(r) {
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
          Ventana de ${r.diasAntes} días antes vs ${r.diasDespues} días después de la fecha de corte, en un radio de ${RADIO_CONSULTA_M}m.
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

    const formHtml = `
      <div id="${uid}" style="font-size: 13px; min-width: 220px;">
        <div style="font-weight: bold; margin-bottom: 8px;">📊 Comparar zona (radio ${RADIO_CONSULTA_M}m)</div>
        <label style="display: block; margin-bottom: 6px; font-size: 12px;">
          Fecha de la intervención:
          <input type="date" id="${uid}-fecha" value="${fechaPorDefecto}" style="width: 100%; margin-top: 4px; padding: 4px; box-sizing: border-box;">
        </label>
        <button id="${uid}-btn" style="width: 100%; padding: 7px; background: #0ea5e9; color: #fff; border: none; border-radius: 4px; cursor: pointer; font-weight: bold;">
          Calcular
        </button>
        <div id="${uid}-resultado"></div>
      </div>
    `;

    clickMarker.bindPopup(formHtml, { minWidth: 240 }).openPopup();

    // 🐛 Fix #1 (2026-08): antes esto esperaba el evento 'popupopen' del
    // mapa para enganchar el listener del botón, pero Leaflet dispara ese
    // evento de forma SINCRÓNICA dentro de .openPopup() — para cuando el
    // 'map.once(...)' se registraba (una línea más abajo), el evento ya
    // había pasado y el botón "Calcular" quedaba sin funcionalidad (se
    // veía el formulario pero tocar el botón no hacía nada). openPopup()
    // ya deja el contenido insertado en el DOM de forma sincrónica, así
    // que alcanza con enganchar el listener directo, sin esperar ningún
    // evento.
    const contenedor = document.getElementById(uid);
    const btn = document.getElementById(`${uid}-btn`);

    // 🐛 Fix #2 (2026-08): el click en "Calcular" también le llegaba al
    // listener de click del MAPA (map.on('click', onMapClick) en init()),
    // que en modo comparador vuelve a llamar onMapClickComparador() y arma
    // un popup nuevo en blanco encima del que ya tenía el resultado — daba
    // la sensación de que "el botón no hacía nada" cuando en realidad sí
    // calculaba, pero quedaba tapado al instante. L.DomEvent.disableClickPropagation
    // corta la propagación del click (y el doble-click) desde todo el
    // contenido del popup hacia el mapa.
    if (contenedor && typeof L.DomEvent !== 'undefined' && L.DomEvent.disableClickPropagation) {
      L.DomEvent.disableClickPropagation(contenedor);
    }

    if (btn) {
      console.log(`📊 ZonaRiesgoLayer: botón "Calcular" enganchado (${uid})`);
      btn.addEventListener('click', (ev) => {
        if (ev && ev.stopPropagation) ev.stopPropagation();
        console.log('📊 ZonaRiesgoLayer: click en "Calcular"');

        const fechaInput = document.getElementById(`${uid}-fecha`);
        const valor = fechaInput ? fechaInput.value : '';
        const fechaCorte = valor ? new Date(`${valor}T00:00:00`) : null;
        const resDiv = document.getElementById(`${uid}-resultado`);
        if (!fechaCorte || isNaN(fechaCorte) || !resDiv) {
          console.warn('⚠️ ZonaRiesgoLayer: fecha inválida o falta el div de resultado', { valor, resDiv });
          return;
        }

        const resultado = compararZona(lat, lng, fechaCorte);
        console.log('📊 ZonaRiesgoLayer: resultado del comparador', resultado);
        resDiv.innerHTML = renderResultadoComparador(resultado);

        // El popup cambió de tamaño con el resultado — avisarle a Leaflet
        // para que reajuste la posición y no quede cortado.
        if (clickMarker) clickMarker.getPopup().update();
      });
    } else {
      console.warn('⚠️ ZonaRiesgoLayer: no se encontró el botón del comparador en el DOM');
    }
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
    toggle,
    toggleComparador,
    getMetadata,
    isVisible: () => isVisible
  };
})();
