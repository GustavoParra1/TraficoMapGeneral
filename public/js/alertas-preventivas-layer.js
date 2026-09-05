// alertas-preventivas-layer.js
// 🆕 Feature "Alertas preventivas activas" (2026-09)
//
// Combina DOS fuentes de datos:
//  1) Alertas de pánico de vecinos que YA existen (dato existente).
//     Confirmado en vecino-app.js (enviarPanico / cargarAlertasCercanas):
//     viven en `clientes/{clienteId}/denuncias` con categoria === 'panico',
//     campo `estado` ('nueva' hasta que el admin la cierra -> 'cerrada'),
//     nombre del vecino en el campo `vecino` (no nombreVecino).
//     Mismo patrón que ZonaRiesgoLayer.setDenunciasVecinos(): este módulo
//     NO abre su propio onSnapshot sobre denuncias — recibe el array crudo
//     ya traído por el listener central de app.js a través de
//     setPanicosVecinos(denuncias), y de ahí filtra los pánicos activos.
//  2) Avisos preventivos que carga el ADMIN a mano desde el panel
//     (corte de calle, operativo, alerta climática, etc.), guardados en
//     Firestore en clientes/{clienteId}/avisos_preventivos_admin — este
//     módulo SÍ es dueño de esa colección nueva: la escucha, la escribe y
//     la dibuja en el mapa (mismo criterio que factores_riesgo_admin en
//     factores-riesgo-layer.js).
//
// Requiere que exista window.restoredClienteId y window.clientDb/window.db,
// y una sesión real de Firebase Auth para poder escribir avisos.

const AlertasPreventivasLayer = (() => {
  let map = null;
  let clienteId = null;
  let clientDb = null;
  let markersGroup = null;
  let modoCarga = false;
  let clickHandler = null;

  let panicosActivos = []; // [{ lat, lng, vecino, vecinoEmail, fecha, tipo: 'panico' }]
  let avisosAdmin = [];    // [{ id, lat, lng, categoria, descripcion, vigenciaHasta, autor, fecha, tipo: 'aviso' }]

  const COLECCION_AVISOS = 'avisos_preventivos_admin'; // ⚠️ nombre nuevo propuesto, no existe todavía en tu Firestore

  const CATEGORIAS_AVISO = {
    corte_calle: { label: 'Corte de calle', color: '#f59e0b' },
    operativo: { label: 'Operativo de seguridad', color: '#3b82f6' },
    clima: { label: 'Alerta climática', color: '#0ea5e9' },
    otro: { label: 'Otro', color: '#6b7280' }
  };

  const COLOR_PANICO = '#dc2626'; // rojo - pánico activo de vecino

  function init(leafletMap) {
    map = leafletMap;
    clienteId = window.restoredClienteId || null;
    clientDb = window.clientDb || window.db;
    markersGroup = L.layerGroup();

    if (!clienteId) {
      console.warn('⚠️ AlertasPreventivasLayer: no hay clienteId (window.restoredClienteId) — no se va a poder escribir avisos.');
    }

    escucharAvisosAdmin();
    console.log('✅ AlertasPreventivasLayer inicializado');
  }

  /**
   * Recibe el array crudo de denuncias (el mismo que ya recibe
   * ZonaRiesgoLayer.setDenunciasVecinos() desde el listener central de
   * app.js) y separa los pánicos activos. Se llama cada vez que ese
   * listener trae datos nuevos, así esta capa queda al día sola.
   */
  function setPanicosVecinos(denuncias) {
    panicosActivos = (denuncias || [])
      .filter((d) => d.categoria === 'panico' && d.estado !== 'cerrada')
      .filter((d) => typeof d.lat === 'number' && typeof d.lng === 'number')
      .map((d) => ({
        lat: d.lat,
        lng: d.lng,
        vecino: d.vecino || 'Vecino',
        vecinoEmail: d.vecinoEmail || null,
        fecha: d.timestamp && d.timestamp.toDate ? d.timestamp.toDate() : null,
        tipo: 'panico'
      }));
    render();
  }

  /**
   * Escucha en tiempo real los avisos preventivos que carga el admin.
   * Mismo patrón que escucharObservaciones() en factores-riesgo-layer.js.
   */
  function escucharAvisosAdmin() {
    if (!clientDb || !clienteId) return;
    clientDb.collection(`clientes/${clienteId}/${COLECCION_AVISOS}`)
      .onSnapshot(
        (snapshot) => {
          const ahora = new Date();
          avisosAdmin = snapshot.docs
            .map((doc) => {
              const d = doc.data();
              return {
                id: doc.id,
                lat: d.lat,
                lng: d.lng,
                categoria: d.categoria || 'otro',
                descripcion: d.descripcion || '',
                vigenciaHasta: d.vigenciaHasta && d.vigenciaHasta.toDate ? d.vigenciaHasta.toDate() : null,
                autor: d.autor || null,
                fecha: d.timestamp && d.timestamp.toDate ? d.timestamp.toDate() : null,
                tipo: 'aviso'
              };
            })
            // Un aviso sin vigenciaHasta se considera activo indefinidamente;
            // si tiene fecha, se filtra automáticamente al vencer.
            .filter((a) => !a.vigenciaHasta || a.vigenciaHasta >= ahora);
          render();
        },
        (error) => {
          console.error('❌ Error escuchando avisos_preventivos_admin:', error);
        }
      );
  }

  function render() {
    if (!map || !markersGroup) return;
    markersGroup.clearLayers();

    panicosActivos.forEach((p) => {
      if (typeof p.lat !== 'number' || typeof p.lng !== 'number') return;
      const marker = L.circleMarker([p.lat, p.lng], {
        radius: 10,
        color: '#1a1a1a',
        weight: 1,
        fillColor: COLOR_PANICO,
        fillOpacity: 0.9
      });
      marker.bindPopup(`
        <div style="font-size:12px; min-width:180px;">
          <strong>🚨 Pánico activo</strong><br/>
          👤 ${p.vecino}<br/>
          <span style="color:#888; font-size:10px;">${p.fecha ? p.fecha.toLocaleString('es-AR') : ''}</span>
        </div>
      `);
      marker.addTo(markersGroup);
    });

    avisosAdmin.forEach((a) => {
      if (typeof a.lat !== 'number' || typeof a.lng !== 'number') return;
      const cat = CATEGORIAS_AVISO[a.categoria] || CATEGORIAS_AVISO.otro;
      const marker = L.circleMarker([a.lat, a.lng], {
        radius: 9,
        color: '#1a1a1a',
        weight: 1,
        fillColor: cat.color,
        fillOpacity: 0.85
      });
      marker.bindPopup(`
        <div style="font-size:12px; min-width:180px;">
          <strong>📢 ${cat.label}</strong><br/>
          ${a.descripcion ? `📝 ${a.descripcion}<br/>` : ''}
          ${a.vigenciaHasta ? `⏳ Vigente hasta: ${a.vigenciaHasta.toLocaleDateString('es-AR')}<br/>` : ''}
          <span style="color:#888; font-size:10px;">${a.fecha ? a.fecha.toLocaleDateString('es-AR') : ''}</span>
        </div>
      `);
      marker.addTo(markersGroup);
    });
  }

  function mostrarMarcadores() {
    if (markersGroup && map) markersGroup.addTo(map);
  }

  function ocultarMarcadores() {
    if (markersGroup && map) map.removeLayer(markersGroup);
  }

  /**
   * Activa el "modo carga": el próximo click en el mapa abre el
   * formulario de aviso preventivo en ese punto. Igual patrón que
   * iniciarCargaObservacion() en factores-riesgo-layer.js.
   */
  function iniciarCargaAviso(onAbrirFormulario) {
    if (modoCarga) return;
    modoCarga = true;
    map.getContainer().style.cursor = 'crosshair';

    clickHandler = (e) => {
      modoCarga = false;
      map.getContainer().style.cursor = '';
      map.off('click', clickHandler);
      clickHandler = null;
      onAbrirFormulario(e.latlng.lat, e.latlng.lng);
    };
    map.on('click', clickHandler);
  }

  function cancelarCargaAviso() {
    if (clickHandler) {
      map.off('click', clickHandler);
      clickHandler = null;
    }
    modoCarga = false;
    if (map) map.getContainer().style.cursor = '';
  }

  /**
   * Guarda un aviso preventivo nuevo en Firestore. Requiere sesión real
   * de Firebase Auth, igual que guardarObservacion() en
   * factores-riesgo-layer.js.
   * @param {Date|null} vigenciaHasta - opcional; null = sin vencimiento.
   */
  async function guardarAviso(lat, lng, { categoria, descripcion, vigenciaHasta }) {
    if (!clientDb || !clienteId) {
      throw new Error('AlertasPreventivasLayer no está inicializado con clienteId/clientDb.');
    }
    const autor = (firebase.auth().currentUser && firebase.auth().currentUser.email) || 'desconocido';
    await clientDb.collection(`clientes/${clienteId}/${COLECCION_AVISOS}`).add({
      lat,
      lng,
      categoria: categoria || 'otro',
      descripcion: descripcion || '',
      vigenciaHasta: vigenciaHasta ? firebase.firestore.Timestamp.fromDate(vigenciaHasta) : null,
      autor,
      timestamp: firebase.firestore.FieldValue.serverTimestamp()
    });
    // El onSnapshot de escucharAvisosAdmin() va a traer este doc solo.
  }

  async function eliminarAviso(id) {
    if (!clientDb || !clienteId) return;
    await clientDb.collection(`clientes/${clienteId}/${COLECCION_AVISOS}`).doc(id).delete();
  }

  /**
   * Resumen combinado: cantidad de pánicos activos + avisos admin
   * vigentes, agrupados por categoría. Sin barrio oficial por ahora
   * (a diferencia de ZonaRiesgoLayer) — se puede sumar ese filtro después
   * si hace falta acotar por barrio.
   */
  function getResumen() {
    const avisosPorCategoria = {};
    avisosAdmin.forEach((a) => {
      avisosPorCategoria[a.categoria] = (avisosPorCategoria[a.categoria] || 0) + 1;
    });

    return {
      panicosActivos: panicosActivos.length,
      avisosAdmin: {
        total: avisosAdmin.length,
        porCategoria: avisosPorCategoria
      }
    };
  }

  return {
    init,
    setPanicosVecinos,
    iniciarCargaAviso,
    cancelarCargaAviso,
    guardarAviso,
    eliminarAviso,
    mostrarMarcadores,
    ocultarMarcadores,
    getResumen,
    isEnModoCarga: () => modoCarga
  };
})();

console.log('✅ alertas-preventivas-layer.js loaded');
