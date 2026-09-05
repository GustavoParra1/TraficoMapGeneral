// factores-riesgo-layer.js
// 🆕 Feature "Factores de riesgo (luminarias, cámaras, visibilidad)" (2026-09)
//
// Combina DOS fuentes de datos:
//  1) Denuncias de infraestructura que YA cargan los vecinos desde su app
//     (categoria === 'infraestructura', tipos: luminarias, semaforos,
//     baches, pozo, carril_bloqueado, otro) — expuestas por
//     ZonaRiesgoLayer.getFactoresRiesgoVecinos().
//  2) Observaciones de campo que carga el ADMIN a mano desde el mapa
//     (iluminación / cámaras visibles / visibilidad), guardadas en
//     Firestore en clientes/{clienteId}/factores_riesgo_admin — este
//     módulo es dueño de esa colección: la escucha, la escribe y la
//     dibuja en el mapa.
//
// Requiere que ZonaRiesgoLayer ya esté inicializado (para el filtro de
// barrio oficial) y que exista una sesión real de Firebase Auth (mismo
// requisito que el resto de las escrituras del panel de cliente).

const FactoresRiesgoLayer = (() => {
  let map = null;
  let clienteId = null;
  let clientDb = null;
  let markersGroup = null;
  let modoCarga = false;
  let clickHandler = null;
  let observaciones = []; // [{ id, lat, lng, iluminacion, camaras, visibilidad, nota, puntaje, fecha, autor }]

  const COLECCION = 'factores_riesgo_admin';

  /**
   * Puntaje simple (sin IA): cada factor problemático suma puntos.
   * 0-1: bajo riesgo (verde). 2-3: riesgo medio (amarillo). 4+: alto (rojo).
   */
  function calcularPuntaje({ iluminacion, camaras, visibilidad }) {
    let puntaje = 0;
    if (iluminacion === 'mala') puntaje += 2;
    else if (iluminacion === 'regular') puntaje += 1;
    if (camaras === 'no') puntaje += 1;
    if (visibilidad === 'con_problemas') puntaje += 1;
    return puntaje;
  }

  function colorPorPuntaje(puntaje) {
    if (puntaje >= 3) return '#dc2626'; // rojo - alto riesgo
    if (puntaje >= 1) return '#f59e0b'; // amarillo - riesgo medio
    return '#22c55e'; // verde - bajo riesgo
  }

  function init(leafletMap) {
    map = leafletMap;
    // Mismo criterio que siniestros-historico-layer.js / robos-historico-layer.js:
    // resolver clienteId y la instancia de Firestore desde las globals que
    // ya arma map.html, en vez de requerir que quien llama a init() las
    // conozca de antemano.
    clienteId = window.restoredClienteId || null;
    clientDb = window.clientDb || window.db;
    markersGroup = L.layerGroup();

    if (!clienteId) {
      console.warn('⚠️ FactoresRiesgoLayer: no hay clienteId (window.restoredClienteId) — no se va a poder leer ni escribir observaciones.');
      return;
    }

    escucharObservaciones();
    console.log('✅ FactoresRiesgoLayer inicializado');
  }

  /**
   * Escucha en tiempo real la colección de observaciones del admin. Igual
   * patrón que siniestros-historico-layer.js / robos-historico-layer.js:
   * un onSnapshot que redibuja todo cuando hay cambios.
   */
  function escucharObservaciones() {
    if (!clientDb || !clienteId) {
      console.warn('⚠️ FactoresRiesgoLayer: falta clientDb o clienteId, no se puede escuchar la colección.');
      return;
    }
    clientDb.collection(`clientes/${clienteId}/${COLECCION}`)
      .onSnapshot(
        (snapshot) => {
          observaciones = snapshot.docs.map((doc) => {
            const d = doc.data();
            return {
              id: doc.id,
              lat: d.lat,
              lng: d.lng,
              iluminacion: d.iluminacion,
              camaras: d.camaras,
              visibilidad: d.visibilidad,
              nota: d.nota || '',
              puntaje: calcularPuntaje(d),
              fecha: d.timestamp && d.timestamp.toDate ? d.timestamp.toDate() : null,
              autor: d.autor || null
            };
          });
          render();
        },
        (error) => {
          console.error('❌ Error escuchando factores_riesgo_admin:', error);
        }
      );
  }

  function render() {
    if (!map || !markersGroup) return;
    markersGroup.clearLayers();

    observaciones.forEach((obs) => {
      if (typeof obs.lat !== 'number' || typeof obs.lng !== 'number') return;
      const marker = L.circleMarker([obs.lat, obs.lng], {
        radius: 9,
        color: '#1a1a1a',
        weight: 1,
        fillColor: colorPorPuntaje(obs.puntaje),
        fillOpacity: 0.85
      });
      marker.bindPopup(`
        <div style="font-size:12px; min-width:180px;">
          <strong>📋 Observación de campo</strong><br/>
          💡 Iluminación: ${etiquetaIluminacion(obs.iluminacion)}<br/>
          📷 Cámaras visibles: ${obs.camaras === 'si' ? 'Sí' : 'No'}<br/>
          👁️ Visibilidad: ${obs.visibilidad === 'con_problemas' ? 'Con obstrucciones' : 'Sin problemas'}<br/>
          ${obs.nota ? `📝 ${obs.nota}<br/>` : ''}
          <span style="color:#888; font-size:10px;">${obs.fecha ? obs.fecha.toLocaleDateString('es-AR') : ''}</span>
        </div>
      `);
      marker.addTo(markersGroup);
    });
  }

  function etiquetaIluminacion(valor) {
    if (valor === 'buena') return 'Buena';
    if (valor === 'regular') return 'Regular';
    if (valor === 'mala') return 'Mala';
    return 'Sin dato';
  }

  function mostrarMarcadores() {
    if (markersGroup && map) markersGroup.addTo(map);
  }

  function ocultarMarcadores() {
    if (markersGroup && map) map.removeLayer(markersGroup);
  }

  /**
   * Activa el "modo carga": el próximo click en el mapa abre el
   * formulario de observación en ese punto. Se cancela solo después de
   * guardar (o se puede cancelar a mano con cancelarCargaObservacion()).
   */
  function iniciarCargaObservacion(onAbrirFormulario) {
    if (modoCarga) return; // ya está esperando un click
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

  function cancelarCargaObservacion() {
    if (clickHandler) {
      map.off('click', clickHandler);
      clickHandler = null;
    }
    modoCarga = false;
    if (map) map.getContainer().style.cursor = '';
  }

  /**
   * Guarda una observación nueva en Firestore. Requiere que ya exista una
   * sesión real de Firebase Auth (la misma que arregla client-auth.js) —
   * si no, firestore.rules la va a rechazar con "Missing or insufficient
   * permissions", igual que pasaba antes con las otras colecciones.
   */
  async function guardarObservacion(lat, lng, { iluminacion, camaras, visibilidad, nota }) {
    if (!clientDb || !clienteId) {
      throw new Error('FactoresRiesgoLayer no está inicializado con clienteId/clientDb.');
    }
    const autor = (firebase.auth().currentUser && firebase.auth().currentUser.email) || 'desconocido';
    await clientDb.collection(`clientes/${clienteId}/${COLECCION}`).add({
      lat,
      lng,
      iluminacion,
      camaras,
      visibilidad,
      nota: nota || '',
      autor,
      timestamp: firebase.firestore.FieldValue.serverTimestamp()
    });
    // El onSnapshot de escucharObservaciones() va a traer este doc solo,
    // no hace falta actualizar `observaciones` a mano acá.
  }

  async function eliminarObservacion(id) {
    if (!clientDb || !clienteId) return;
    await clientDb.collection(`clientes/${clienteId}/${COLECCION}`).doc(id).delete();
  }

  /**
   * Resumen combinado: observaciones del admin (promedio de puntaje) +
   * denuncias de infraestructura de vecinos (conteo por tipo). Todo
   * recortado al barrio oficial vía ZonaRiesgoLayer, para que "Factores de
   * riesgo" respete el mismo alcance que "Zonas calientes" y "Horarios de
   * mayor riesgo".
   */
  function getResumen() {
    const propias = (typeof ZonaRiesgoLayer !== 'undefined')
      ? ZonaRiesgoLayer.filtrarPorBarrioOficialExterno(observaciones)
      : observaciones;

    const totalObs = propias.length;
    const promedioPuntaje = totalObs > 0
      ? propias.reduce((acc, o) => acc + o.puntaje, 0) / totalObs
      : 0;
    const conProblemas = propias.filter((o) => o.puntaje >= 1).length;

    const vecinos = (typeof ZonaRiesgoLayer !== 'undefined')
      ? ZonaRiesgoLayer.getFactoresRiesgoVecinos()
      : { porTipo: {}, total: 0, sinBarrioOficial: true };

    return {
      admin: { total: totalObs, promedioPuntaje, conProblemas },
      vecinos,
      sinBarrioOficial: vecinos.sinBarrioOficial
    };
  }

  /**
   * 🆕 Observaciones del admin recortadas al barrio oficial, SIN agregar
   * (a diferencia de getResumen, que ya las promedia). Insumo para cruzar
   * celda por celda contra ZonaRiesgoLayer.getZonasCalientes() en el
   * ranking "Índice de riesgo por cuadra" (ver app.js).
   */
  function getObservacionesFiltradas() {
    return (typeof ZonaRiesgoLayer !== 'undefined')
      ? ZonaRiesgoLayer.filtrarPorBarrioOficialExterno(observaciones)
      : observaciones;
  }

  return {
    init,
    iniciarCargaObservacion,
    cancelarCargaObservacion,
    guardarObservacion,
    eliminarObservacion,
    mostrarMarcadores,
    ocultarMarcadores,
    getResumen,
    getObservacionesFiltradas,
    isEnModoCarga: () => modoCarga
  };
})();

console.log('✅ factores-riesgo-layer.js loaded');
