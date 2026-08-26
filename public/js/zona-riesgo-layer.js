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

  // Subcategorías de 'vehiculos' que cuentan como robo (mismo criterio que
  // ROBOS_SUBCATEGORIAS en robos-historico-layer.js).
  const ROBOS_SUBCATEGORIAS = ['robo_auto', 'robo_moto', 'robo_bicicleta'];

  let map = null;
  let heatInstance = null;
  let clickMarker = null;
  let isVisible = false;
  let clickHandlerAttached = false;

  // Cada fuente guarda su propio array de puntos {lat, lng, tipo}
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
        tipo
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

      if (d.categoria === 'accidentes') {
        siniestrosVecino.push({ lat: d.lat, lng: d.lng, tipo: 'siniestro_vecino' });
      } else if (d.categoria === 'vehiculos' && ROBOS_SUBCATEGORIAS.includes(d.subcategoria)) {
        robosVecino.push({ lat: d.lat, lng: d.lng, tipo: 'robo_vecino' });
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

    // Todos los puntos con la misma intensidad (0.5) — ver nota de pesos
    // arriba en la cabecera del archivo.
    const heatData = puntos.map((p) => [p.lat, p.lng, 0.5]);

    heatInstance = L.heatLayer(heatData, {
      radius: 28,
      blur: 22,
      maxZoom: 17,
      gradient: {
        0.0: '#22c55e', // Verde: baja densidad
        0.4: '#eab308', // Amarillo
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
    clickMarker = L.circleMarker([lat, lng], {
      radius: 8,
      color: riesgo.color,
      weight: 2,
      fillColor: riesgo.color,
      fillOpacity: 0.5
    }).addTo(map);

    const popupContent = `
      <div style="font-size: 13px; min-width: 190px;">
        <div style="font-weight: bold; color: ${riesgo.color}; margin-bottom: 6px;">
          ${riesgo.emoji} Riesgo ${riesgo.nivel}
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
    getMetadata,
    isVisible: () => isVisible
  };
})();
