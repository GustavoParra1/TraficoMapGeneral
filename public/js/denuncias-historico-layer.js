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
  let filteredDenuncias = [];
  let denunciasLayer = null;
  let map = null;
  let isVisible = false;
  let barriosGeoJson = null;
  let unsubscribe = null;

  // 🆕 Renderer Canvas con "tolerance": agrega un margen invisible alrededor
  // de cada marcador que también cuenta como clickeable/tocable, sin agrandar
  // el punto visualmente. El radius:6 del marcador es ~12px de diámetro —
  // un blanco muy chico para un dedo real, por eso costaba tanto abrir el
  // popup en mobile. El renderer SVG (default de Leaflet) no soporta esta
  // opción; por eso acá se fuerza Canvas para esta capa puntualmente.
  const touchRenderer = L.canvas({ tolerance: 15 });

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
            
            // DEBUG: Mostrar estructura
            if (denunciasData.length > 0) {
              console.log('📍 === PRIMERA DENUNCIA HISTÓRICA ===');
              console.log('📍 Objeto completo:', JSON.stringify(denunciasData[0], null, 2));
              console.log('📍 Campos:', Object.keys(denunciasData[0]));
              console.log(`📍 lat type: ${typeof denunciasData[0].lat}, value: ${denunciasData[0].lat}`);
              console.log(`📍 lng type: ${typeof denunciasData[0].lng}, value: ${denunciasData[0].lng}`);
              
              const conCoords = denunciasData.filter(d => d.lat && d.lng).length;
              console.log(`📍 Con coordenadas: ${conCoords}/${denunciasData.length}`);
              
              console.log('📍 Tipos de lat/lng en primeros 5:');
              denunciasData.slice(0, 5).forEach((d, i) => {
                console.log(`  [${i}] lat=${d.lat} (${typeof d.lat}), lng=${d.lng} (${typeof d.lng})`);
              });
            }

            // Obtener filtros disponibles
            updateDenunciasFilters();
            applyFilters();
          },
          (error) => {
            console.error('❌ Error escuchando denuncias históricas:', error);
          }
        );
    } catch (error) {
      console.error('❌ Error inicializando listener de denuncias:', error);
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
      return getCategoryInfo(categoria).label;
    }
    return categoria || 'Sin categoría';
  }

  /**
   * Aplicar filtros actuales y re-renderizar
   */
  function applyFilters() {
    filteredDenuncias = denunciasData.filter((d) => {
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
      const categoryLabel = getCategoryLabel(denuncia.categoria);
      const subLabel = denuncia.subcategoria
        ? getSubcategoryInfoLabel(denuncia.categoria, denuncia.subcategoria)
        : '';

      // Crear marcador
      const marker = L.circleMarker([denuncia.lat, denuncia.lng], {
        renderer: touchRenderer,
        radius: 6,
        fillColor: color,
        color: color,
        weight: 2,
        opacity: 0.8,
        fillOpacity: 0.6
      });

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

      // Hover effects
      marker.on('mouseover', function () {
        this.setStyle({
          radius: 8,
          weight: 3,
          opacity: 1,
          fillOpacity: 0.8
        });
      });

      marker.on('mouseout', function () {
        this.setStyle({
          radius: 6,
          weight: 2,
          opacity: 0.8,
          fillOpacity: 0.6
        });
      });

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
