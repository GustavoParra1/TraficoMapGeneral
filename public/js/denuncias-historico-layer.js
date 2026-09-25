/**
 * 📋 DENUNCIAS HISTÓRICO LAYER
 * Módulo para visualizar y filtrar denuncias permanentes (vecinal + pánicos)
 * Datos: Firestore - clientes/{clienteId}/denuncias_historico/*
 * 
 * Opción B: Mantiene registro histórico permanente incluso si son eliminadas de la app.
 * Combina contribuciones de ciudadanos (vecinos) con datos de control de emergencias.
 */

window.DenunciasHistoricoLayer = (() => {
  let denunciasData = [];
  // 🆕 (2026-09) Espejo de denuncias de todos los barrios, exclusivo de
  // "mardelplata" (clientes/mardelplata/denuncias_ciudad, llenada por la
  // Cloud Function onDenunciaCreada / backfillDenunciasCiudad). Se guarda
  // aparte de denunciasData (que sigue siendo SOLO denuncias_historico de
  // este cliente, sin tocar) y se combinan recién al filtrar/renderizar.
  let denunciasCiudadData = [];
  let unsubscribeCiudad = null;
  let filteredDenuncias = [];
  let denunciasLayer = null;
  let map = null;
  let isVisible = false;
  let barriosGeoJson = null;
  let unsubscribe = null;
  // 🆕 (2026-09) Filtro geográfico propio del cliente: oculta en el mapa
  // cualquier denuncia que geométricamente pertenezca a un barrio distinto
  // y CONOCIDO (de los 124 polígonos del catastro, vía
  // SiniestrosLayer.getBarrioForPoint) al del cliente logueado. Esto es
  // necesario porque las denuncias son colaborativas: un vecino de
  // Constitución puede estar parado en López de Gomara y cargar una
  // denuncia ahí — si López de Gomara todavía no existe como cliente, esa
  // denuncia queda guardada en la colección de Constitución (porque es
  // donde el vecino está logueado), pero no le pertenece geográficamente y
  // no debe mostrarse en el mapa de Constitución.
  // Si el punto cae fuera de todos los polígonos conocidos, no hay certeza
  // de nada, así que se sigue mostrando (para no ocultar de más por error).
  // "mardelplata" queda TOTALMENTE exento de este filtro (ver
  // esMardelplata más abajo): su función es mostrar justamente la unión de
  // todos los barrios, así que ni siquiera se evalúa la geometría ahí.
  let clientePropioBarrioSlug = null; // normalizado, ej: "constitucion"
  let esMardelplata = false;

  /**
   * Normaliza un nombre de barrio para comparar de forma consistente sin
   * importar si viene en mayúsculas, con tildes, con espacios o con
   * guiones (ej: "CONSTITUCION", "Constitución", "constitucion",
   * "lopez-de-gomara" y "López de Gómara" deben normalizar todos igual).
   */
  function normalizarNombreBarrio(nombre) {
    if (!nombre || typeof nombre !== 'string') return '';
    return nombre
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '') // saca tildes/diacríticos
      .toLowerCase()
      .trim()
      .replace(/[\s_]+/g, '-') // espacios/guiones bajos -> guion
      .replace(/-+/g, '-');
  }
  // 🆕 (2026-09) Ver comentario en el onSnapshot: colapsa varios rebuilds
  // seguidos (ráfaga de escrituras en Firestore) en uno solo.
  let renderDebounceTimer = null;
  const RENDER_DEBOUNCE_MS = 400;

  // Mapa de colores por categoría principal
  const categoriasColores = {
    personas: '#dc2626',           // Rojo
    vehiculos: '#f97316',           // Naranja
    propiedad: '#7c3aed',           // Púrpura
    infraestructura: '#0891b2',     // Cyan
    accidentes: '#06b6d4',          // Cyan claro
    emergencias: '#dc2626',         // Rojo (pánico)
    seguridad: '#8b5cf6'            // Púrpura claro
  };

  // 🆕 Ícono por categoría (2026-02): antes cada denuncia era un círculo de
  // 6px sin distinción visual entre tipos — difícil de tocar en mobile y sin
  // pista de qué era cada punto de un vistazo (a diferencia de referencias
  // como voybien.com.ar, que usan un ícono distinto por categoría). Ahora
  // cada marcador es un ícono de 34px con emoji sobre círculo de color, vía
  // L.divIcon en vez de L.circleMarker — al ser un <div> real del DOM (no
  // SVG/canvas), el área táctil es el ícono completo, sin necesidad del
  // truco de "tolerance" que se usaba antes.
  const categoriasIconos = {
    personas: '🏃',
    vehiculos: '🚗',
    propiedad: '🏠',
    infraestructura: '🔧',
    accidentes: '💥',
    emergencias: '🚨',
    seguridad: '🛡️'
  };

  function getCategoryIcon(categoria) {
    return categoriasIconos[categoria] || '📍';
  }

  // Filtros activos
  const filters = {
    globalBarrio: 'all',
    year: 'all',
    categoria: 'all',
    estado: 'all' // nueva, cerrada, todas
  };

  /**
   * Inicializa el módulo
   */
  function init(leafletMap) {
    map = leafletMap;
    denunciasLayer = L.layerGroup();
    console.log('📋 DenunciasHistoricoLayer inicializado');
    loadDenunciasFromFirestore();
  }

  /**
   * Obtener información de una categoría
   */
  function getCategoryColor(categoria) {
    return categoriasColores[categoria] || '#666666';
  }

  /**
   * Cargar denuncias desde Firestore en tiempo real
   */
  function loadDenunciasFromFirestore() {
    if (!window.restoredClienteData) {
      console.warn('⚠️ DenunciasHistoricoLayer: restoredClienteData no disponible. Reintentando en 2s...');
      setTimeout(loadDenunciasFromFirestore, 2000);
      return;
    }

    // El campo actual es 'id'
    const clienteId = window.restoredClienteData.id || window.restoredClienteData.clienteId || window.restoredClienteData.idl;
    
    if (!clienteId) {
      console.warn('⚠️ DenunciasHistoricoLayer: id/clienteId/idl no encontrado. Estructura disponible:', Object.keys(window.restoredClienteData));
      setTimeout(loadDenunciasFromFirestore, 2000);
      return;
    }

    // 🆕 (2026-09) Barrio propio del cliente logueado (normalizado) y flag
    // de mardelplata, para el filtro geográfico "solo mi barrio" en
    // applyFilters(). mardelplata queda exento: su barrio_slug (si tuviera)
    // no importa porque el filtro nuevo ni siquiera se evalúa para ese
    // cliente.
    esMardelplata = clienteId === 'mardelplata';
    clientePropioBarrioSlug = normalizarNombreBarrio(
      window.restoredClienteData.barrio_slug || ''
    );
    if (!esMardelplata && !clientePropioBarrioSlug) {
      console.warn(
        '⚠️ DenunciasHistoricoLayer: cliente sin barrio_slug propio — el filtro geográfico "solo mi barrio" queda inactivo para este cliente (se sigue mostrando todo, para no ocultar de más por error).'
      );
    }

    // Esperar a que window.db esté disponible
    if (!window.db) {
      console.warn('⚠️ DenunciasHistoricoLayer: window.db no disponible, reintentando en 1s...');
      setTimeout(loadDenunciasFromFirestore, 1000);
      return;
    }

    try {
      // Listener en tiempo real - usar window.db
      console.log(`📋 DenunciasHistoricoLayer: Escuchando clientes/${clienteId}/denuncias_historico`);
      unsubscribe = window.db
        .collection(`clientes/${clienteId}/denuncias_historico`)
        .orderBy('timestamp', 'desc')
        .onSnapshot(
          (snap) => {
            denunciasData = [];
            snap.forEach((doc) => {
              denunciasData.push({
                id: doc.id,
                ...doc.data()
              });
            });

            console.log(
              `📋 ${denunciasData.length} denuncias históricas cargadas`
            );

            // 🆕 Se sacó el bloque de debug que imprimía JSON.stringify del
            // primer objeto completo + detalle de lat/lng de los primeros 5
            // en CADA actualización de Firestore (2026-02). Era debug de
            // cuando se armó esta capa, ya cumplió su función — dejarlo
            // corriendo en producción, en cada onSnapshot, era puro costo de
            // performance sin beneficio (y explicaba buena parte de los
            // cientos de mensajes en consola que se veían en mobile).

            // 🆕 (2026-09) Antes esto llamaba a updateDenunciasFilters()+
            // applyFilters() directo acá, y applyFilters() termina en
            // renderDenuncias(), que hace denunciasLayer.clearLayers() y
            // reconstruye TODOS los íconos desde cero. Cualquier escritura en
            // la colección (una denuncia nueva de otro vecino, o sobre todo
            // una importación masiva que escribe muchos documentos seguidos)
            // disparaba este onSnapshot una y otra vez, así que los íconos se
            // destruían y recreaban constantemente — si el usuario tocaba uno
            // justo en ese momento, el toque caía sobre un <div> que Leaflet
            // acababa de eliminar y el evento se perdía sin ningún error
            // visible (parecía "a veces no abre", en cualquier parte del
            // mapa, según qué tan seguido estuviera pasando esto). Se
            // debounce acá: varios onSnapshot seguidos dentro de la ventana
            // colapsan en un solo rebuild real, usando siempre los datos más
            // recientes.
            scheduleRender();

            // 🚨 Alimentar el heatmap de ZonaRiesgoLayer con las denuncias
            // de vecinos (filtra internamente siniestros/robos y descarta
            // el resto). Se llama en cada actualización del snapshot, así
            // que el heatmap queda al día con cada denuncia nueva. No toca
            // los íconos de Denuncias, así que no necesita el debounce.
            if (typeof ZonaRiesgoLayer !== 'undefined') {
              ZonaRiesgoLayer.setDenunciasVecinos(denunciasData);
            }
            // 🆕 Alertas preventivas activas (2026-09): misma fuente cruda
            // (denunciasData), AlertasPreventivasLayer filtra internamente
            // los pánicos activos (categoria === 'panico' && estado !==
            // 'cerrada'). Se llama en cada actualización del snapshot, así
            // el panel de pánicos activos queda al día solo.
            if (typeof AlertasPreventivasLayer !== 'undefined') {
              AlertasPreventivasLayer.setPanicosVecinos(denunciasData);
            }
          },
          (error) => {
            console.error('❌ Error escuchando denuncias históricas:', error);
          }
        );
    } catch (error) {
      console.error('❌ Error inicializando listener de denuncias:', error);
    }

    // 🆕 (2026-09) Solo para "mardelplata": segundo listener, independiente
    // del de arriba, sobre clientes/mardelplata/denuncias_ciudad (la copia
    // de solo lectura que llena la Cloud Function con las denuncias de
    // TODOS los barrios). No reemplaza ni modifica el listener de
    // denuncias_historico de este cliente — solo suma una fuente más para
    // el render. Para cualquier otro clienteId esto ni se ejecuta.
    if (clienteId === 'mardelplata') {
      try {
        console.log('📋 DenunciasHistoricoLayer: Escuchando clientes/mardelplata/denuncias_ciudad');
        unsubscribeCiudad = window.db
          .collection('clientes/mardelplata/denuncias_ciudad')
          .onSnapshot(
            (snap) => {
              denunciasCiudadData = [];
              snap.forEach((doc) => {
                denunciasCiudadData.push({ id: doc.id, ...doc.data() });
              });
              console.log(`📋 ${denunciasCiudadData.length} denuncias de barrios (ciudad) cargadas`);
              scheduleRender();
            },
            (error) => {
              console.error('❌ Error escuchando denuncias_ciudad:', error);
            }
          );
      } catch (error) {
        console.error('❌ Error inicializando listener de denuncias_ciudad:', error);
      }
    }
  }

  /**
   * Actualizar opciones de filtros disponibles
   */
  function updateDenunciasFilters() {
    const categorias = new Set();
    const años = new Set();

    denunciasData.forEach((d) => {
      if (d.categoria) categorias.add(d.categoria);
      if (d.timestamp) {
        const date =
          d.timestamp instanceof Date
            ? d.timestamp
            : new Date(d.timestamp.toMillis?.() || d.timestamp);
        const year = date.getFullYear().toString();
        años.add(year);
      }
    });

    // Actualizar selectores si existen
    const categoriaSelect = document.getElementById('denuncias-categoria-filter');
    if (categoriaSelect) {
      const currentVal = categoriaSelect.value;
      categoriaSelect.innerHTML = '<option value="all">Todas</option>';
      Array.from(categorias)
        .sort()
        .forEach((cat) => {
          const option = document.createElement('option');
          option.value = cat;
          option.textContent = `${getCategoryLabel(cat)}`;
          categoriaSelect.appendChild(option);
        });
      categoriaSelect.value = currentVal;
    }

    const yearSelect = document.getElementById('denuncias-year-filter');
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
   * Obtener etiqueta de categoría
   */
  function getCategoryLabel(categoria) {
    if (typeof CATEGORIES_TAXONOMY !== 'undefined' && CATEGORIES_TAXONOMY[categoria]) {
      const info = getCategoryInfo(categoria);
      return `${info.icon} ${info.label}`;
    }
    // 🩹 Legacy (2026-08): algunas denuncias viejas guardan la SUBcategoría
    // directamente en el campo `categoria` (ej: 'luminarias', 'panico',
    // 'semaforos') en vez de la categoría principal + subcategoria. Antes
    // esos casos caían al fallback de abajo y salían pelados en el filtro.
    // Buscamos coincidencia entre las subcategorías de la taxonomía para
    // mostrarlas con su propio ícono y etiqueta.
    if (typeof CATEGORIES_TAXONOMY !== 'undefined') {
      for (const mainKey in CATEGORIES_TAXONOMY) {
        const sub = CATEGORIES_TAXONOMY[mainKey].subcategories?.[categoria];
        if (sub) {
          return `${sub.icon} ${sub.label}`;
        }
      }
    }
    return categoria || 'Sin categoría';
  }

  /**
   * 🆕 (2026-09) Debounce del rebuild de marcadores — ver comentario en el
   * onSnapshot de loadDenunciasFromFirestore() para el porqué.
   */
  function scheduleRender() {
    if (renderDebounceTimer) clearTimeout(renderDebounceTimer);
    renderDebounceTimer = setTimeout(() => {
      renderDebounceTimer = null;
      updateDenunciasFilters();
      applyFilters();
    }, RENDER_DEBOUNCE_MS);
  }

  /**
   * Aplicar filtros actuales y re-renderizar
   */
  function applyFilters() {
    // 🆕 (2026-09) Fuente combinada: denuncias_historico de este cliente +
    // (solo si aplica) el espejo de todos los barrios en denuncias_ciudad.
    // Para cualquier cliente que no sea mardelplata, denunciasCiudadData
    // queda siempre vacío, así que el resultado es idéntico a antes.
    const fuente = [...denunciasData, ...denunciasCiudadData];
    filteredDenuncias = fuente.filter((d) => {
      // 🆕 (2026-09) Filtro geográfico "solo mi barrio": oculta denuncias
      // que geométricamente pertenecen a otro barrio, distinto y CONOCIDO,
      // al del cliente logueado. No aplica a mardelplata (ve la unión de
      // todos los barrios) ni cuando falta algún dato necesario para
      // decidir con certeza (en esos casos se prefiere mostrar de más
      // antes que ocultar de más por error).
      if (
        !esMardelplata &&
        clientePropioBarrioSlug &&
        d.lat &&
        d.lng &&
        typeof SiniestrosLayer !== 'undefined' &&
        typeof SiniestrosLayer.getBarrioForPoint === 'function'
      ) {
        const barrioDelPunto = SiniestrosLayer.getBarrioForPoint(d.lat, d.lng);
        if (barrioDelPunto) {
          const barrioDelPuntoNormalizado = normalizarNombreBarrio(barrioDelPunto);
          if (barrioDelPuntoNormalizado !== clientePropioBarrioSlug) {
            return false;
          }
        }
        // Si getBarrioForPoint no devuelve nada (cae fuera de los 124
        // polígonos conocidos), no hay certeza de nada — se sigue
        // mostrando.
      }

      // Filtro de categoría
      if (filters.categoria !== 'all' && d.categoria !== filters.categoria) {
        return false;
      }

      // Filtro de estado
      if (filters.estado !== 'all' && d.estado !== filters.estado) {
        return false;
      }

      // Filtro de año
      if (filters.year !== 'all') {
        const date =
          d.timestamp instanceof Date
            ? d.timestamp
            : new Date(d.timestamp?.toMillis?.() || d.timestamp);
        if (date.getFullYear().toString() !== filters.year) {
          return false;
        }
      }

      // Filtro de barrio (punto en polígono)
      if (filters.globalBarrio !== 'all' && d.lat && d.lng) {
        if (!isInBarrio(d.lat, d.lng, filters.globalBarrio)) {
          return false;
        }
      }

      return true;
    });

    console.log(
      `📋 ${filteredDenuncias.length} denuncias pasan el filtro`
    );
    renderDenuncias();
  }

  /**
   * Verificar si un punto está en un barrio (punto en polígono)
   */
  function isInBarrio(lat, lng, barrio) {
    if (!barriosGeoJson) return true;

    for (const feature of barriosGeoJson.features) {
      if (
        (feature.properties.BARRIO || feature.properties.barrio) ===
        barrio
      ) {
        // Usar turf.js para punto en polígono si está disponible
        if (typeof turf !== 'undefined') {
          const point = turf.point([lng, lat]);
          if (turf.booleanPointInPolygon(point, feature)) {
            return true;
          }
        }
        return true; // Fallback: asumir que está dentro
      }
    }

    return false;
  }

  /**
   * Renderizar denuncias en el mapa
   */
  function renderDenuncias() {
    denunciasLayer.clearLayers();

    filteredDenuncias.forEach((denuncia) => {
      if (!denuncia.lat || !denuncia.lng) return;

      const color = getCategoryColor(denuncia.categoria);
      const icon = getCategoryIcon(denuncia.categoria);
      const categoryLabel = getCategoryLabel(denuncia.categoria);
      const subLabel = denuncia.subcategoria
        ? getSubcategoryInfoLabel(denuncia.categoria, denuncia.subcategoria)
        : '';

      // Ícono de categoría: círculo de color con emoji adentro, borde blanco
      // y sombra para que se lea bien sobre cualquier fondo del mapa.
      const divIcon = L.divIcon({
        className: 'denuncia-marker-icon',
        html: `<div style="width:34px;height:34px;border-radius:50%;background:${color};display:flex;align-items:center;justify-content:center;font-size:17px;border:2.5px solid #fff;box-shadow:0 2px 6px rgba(0,0,0,0.35);">${icon}</div>`,
        iconSize: [34, 34],
        iconAnchor: [17, 17],
        popupAnchor: [0, -18]
      });

      const marker = L.marker([denuncia.lat, denuncia.lng], { icon: divIcon });
      // 🆕 A diferencia de L.circleMarker (Path), acá "bubblingMouseEvents" no
      // existe como opción: el ícono es un <div> real y el click burbujea por
      // el DOM nativo hasta el contenedor del mapa, disparando el listener
      // global de ZonaRiesgoLayer (map.on('click', onMapClick)), que abre su
      // propio popup en las mismas coordenadas y cierra este popup recién
      // abierto. Se corta la propagación nativa acá.
      marker.on('click', (e) => L.DomEvent.stopPropagation(e));

      // Popup con información
      const popupContent = `
        <div style="font-size: 12px; max-width: 250px;">
          <div style="font-weight: bold; color: ${color}; margin-bottom: 6px;">
            ${categoryLabel}
            ${denuncia.emergencia ? '🚨' : ''}
          </div>
          ${subLabel ? `<div style="font-size: 11px; color: #666; margin-bottom: 4px;">${subLabel}</div>` : ''}
          <div style="margin-bottom: 6px; white-space: pre-wrap; max-height: 100px; overflow-y: auto;">
            ${denuncia.texto || 'Sin descripción'}
          </div>
          <div style="font-size: 10px; color: #999; margin-bottom: 4px;">
            <strong>Reportado por:</strong> ${denuncia.vecino || 'Anónimo'}
          </div>
          ${denuncia.origenClienteId ? `
          <div style="font-size: 10px; color: #999; margin-bottom: 4px;">
            <strong>🏘️ Barrio:</strong> ${denuncia.origenClienteId}
          </div>
          ` : ''}
          <div style="font-size: 10px; color: #999; margin-bottom: 4px;">
            <strong>Fecha:</strong> ${formatDate(denuncia.timestamp)}
          </div>
          <div style="font-size: 10px; color: #999;">
            <strong>Estado:</strong> ${denuncia.estado || 'nueva'}
            ${denuncia.leida ? ' ✓ Leída' : ''}
          </div>
          ${denuncia.hasImage && denuncia.imageUrl ? `
            <div style="margin-top: 8px;">
              <img src="${denuncia.imageUrl}" style="max-width: 100%; border-radius: 4px; max-height: 150px;">
            </div>
          ` : ''}
        </div>
      `;

      marker.bindPopup(popupContent);

      denunciasLayer.addLayer(marker);
    });

    if (!map.hasLayer(denunciasLayer) && isVisible) {
      map.addLayer(denunciasLayer);
    }

    console.log(
      `📋 ${denunciasLayer.getLayers().length} marcadores renderizados en mapa`
    );
  }

  /**
   * Obtener etiqueta de subcategoría
   */
  function getSubcategoryInfoLabel(mainCategory, subcategory) {
    if (typeof getSubcategoryInfo === 'function') {
      const info = getSubcategoryInfo(mainCategory, subcategory);
      return `${info.icon} ${info.label}`;
    }
    return subcategory;
  }

  /**
   * Formatear timestamp para mostrar
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
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  /**
   * Establecer filtro
   */
  function setFilter(filterName, value) {
    if (filterName in filters) {
      filters[filterName] = value;
      console.log(`📋 Filtro ${filterName} = ${value}`);
      applyFilters();
    }
  }

  /**
   * Mostrar/ocultar capa
   */
  function toggle(show) {
    isVisible = show;
    if (show) {
      if (!map.hasLayer(denunciasLayer)) {
        map.addLayer(denunciasLayer);
      }
    } else {
      if (map.hasLayer(denunciasLayer)) {
        map.removeLayer(denunciasLayer);
      }
    }
    console.log(`📋 DenunciasHistoricoLayer ${show ? 'visible' : 'oculto'}`);
  }

  /**
   * Obtener metadatos para la interfaz
   */
  function getMetadata() {
    return {
      name: 'Denuncias Históricas',
      layers: denunciasLayer,
      icon: '📋',
      color: '#0891b2',
      count: filteredDenuncias.length,
      filters: ['categoria', 'year', 'globalBarrio', 'estado']
    };
  }

  /**
   * Limpiar recursos
   */
  function destroy() {
    if (unsubscribe) {
      unsubscribe();
    }
    if (unsubscribeCiudad) {
      unsubscribeCiudad();
    }
    if (map && denunciasLayer) {
      map.removeLayer(denunciasLayer);
    }
  }

  // API pública
  return {
    init,
    loadDenunciasFromFirestore,
    applyFilters,
    renderDenuncias,
    setFilter,
    toggle,
    getMetadata,
    destroy
  };
})();
