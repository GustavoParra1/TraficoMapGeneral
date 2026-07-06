/**
 * 🚨 LPR LAYER: Lectores de Patentes (License Plate Readers)
 * Adaptado de la lógica probada de MapaTraficoFinal
 * Maneja la visualización de LPRs con círculo de cobertura de 2km
 * VERSION: 2025-04-10T12:00:00Z - Fix selector no se borra
 */

const LprLayer = (() => {
  let map = null;
  let lprCircleLayer = L.layerGroup();
  let lprFilteredCamerasLayer = L.layerGroup();
  let allCameras = [];
  let lprCameras = [];
  let lprCameraSelect = null;

  /**
   * Verifica si una cámara tiene LPR (mismo enfoque que MapaTraficoFinal)
   */
  const hasLPR = (camera) => {
    if (!camera.properties) return false;
    const lpr = camera.properties.lpr;
    // Verificar si lpr > 0
    if (lpr && parseInt(lpr) > 0) {
      return true;
    }
    return false;
  };

  /**
   * Popula el selector de LPR con todas las cámaras que tienen LPR
   * Usa la lógica de deduplicación de MapaTraficoFinal pero para GeoJSON
   */
  const populateLprSelector = () => {
    console.log(`🔧 [LPR] populateLprSelector() iniciado`);
    
    if (!allCameras || allCameras.length === 0) {
      console.warn('⚠️ allCameras está vacío');
      return;
    }

    // Obtener selector si aún no existe
    if (!lprCameraSelect) {
      lprCameraSelect = document.getElementById('lpr-selector');
    }
    
    if (!lprCameraSelect) {
      console.warn('⚠️ No se encontró elemento lpr-selector');
      return;
    }

    // 🎯 Agrupar cámaras por ID y filtrar siendo más inteligentes (como MapaTraficoFinal)
    const cameraMap = new Map();
    
    allCameras.forEach((feature, idx) => {
      if (!hasLPR(feature)) return;
      
      const cameraID = String(feature.properties.camera_number || feature.properties.id);
      if (!cameraID) return;
      
      // Si esta cámara ya existe en el mapa, mantener la que tenga LPR más descriptivo
      if (cameraMap.has(cameraID)) {
        const existing = cameraMap.get(cameraID);
        // Si el nuevo tiene más información, reemplazar
        if (feature.properties.lpr && parseInt(feature.properties.lpr) > parseInt(existing.properties.lpr || 0)) {
          cameraMap.set(cameraID, feature);
        }
      } else {
        // Primera vez que vemos esta cámara con LPR
        cameraMap.set(cameraID, feature);
      }
    });
    
    // Convertir el mapa a array para lprCameras
    lprCameras = Array.from(cameraMap.values());
    
    // 🔢 Ordenar por número de cámara (de menor a mayor)
    lprCameras.sort((a, b) => {
      const numA = parseInt(a.properties.camera_number || a.properties.id) || 0;
      const numB = parseInt(b.properties.camera_number || b.properties.id) || 0;
      return numA - numB;
    });
    
    console.log(`🎯 Cámaras LPR encontradas: ${lprCameras.length}`);
    console.log(`   Primeros 5:`, lprCameras.slice(0, 5).map(c => `${c.properties.camera_number} (lpr: ${c.properties.lpr})`).join(', '));

    // Poblar selector
    lprCameraSelect.innerHTML = '<option value="">-- Seleccionar LPR --</option>';
    lprCameras.forEach((feature, idx) => {
      const option = document.createElement('option');
      const cameraID = feature.properties.camera_number || feature.properties.id;
      const address = feature.properties.address || 'Sin dirección';
      const barrio = feature.properties.barrio || 'Sin barrio';
      
      option.value = idx; // Usar índice para acceso rápido
      option.textContent = `${cameraID} - ${barrio} (LPR: ${feature.properties.lpr})`;
      lprCameraSelect.appendChild(option);
    });
    
    console.log(`✅ Selector LPR populado con ${lprCameras.length} cámaras`);
  };

  /**
   * Muestra el radio de LPR seleccionado
   * Adaptado de displayLprRadius() de MapaTraficoFinal
   */
  const displayLprRadius = () => {
    console.log(`🔧 [LPR] displayLprRadius() - VERSIÓN CORREGIDA`);
    console.log(`   Map: ${map ? '✅' : '❌'}, lprCameras: ${lprCameras.length}, lprCameraSelect: ${lprCameraSelect ? '✅' : '❌'}`);
    
    if (!map) {
      console.error('❌ Mapa no inicializado');
      return;
    }
    
    // ⭐ LEER el valor ANTES de hacer cualquier cosa
    const selectIndex = lprCameraSelect.value;
    console.log(`📍 Índice seleccionado: "${selectIndex}"`);
    
    if (selectIndex === '') {
      console.log('⚠️ No hay LPR seleccionado');
      return;
    }
    
    console.log(`✅ LPR SELECCIONADO - índice: ${selectIndex}`);
    
    // Limpiar solo las capas, NO tocar el selector
    lprCircleLayer.clearLayers();
    lprFilteredCamerasLayer.clearLayers();
    console.log(`✅ Capas limpiadas (selector mantenido intact)`);

    const selectedLprCamera = lprCameras[parseInt(selectIndex)];
    if (!selectedLprCamera) {
      console.error(`❌ LPR no encontrado en índice: ${selectIndex}`);
      console.error(`   Intentó acceder a índice ${selectIndex} de array con ${lprCameras.length} elementos`);
      return;
    }

    // Extraer coordenadas (GeoJSON format: [lng, lat])
    const [lng, lat] = selectedLprCamera.geometry.coordinates;
    const center = L.latLng(lat, lng);

    console.log(`✅ LPR seleccionado: ${selectedLprCamera.properties.camera_number} en (${lat.toFixed(4)}, ${lng.toFixed(4)})`);

    // 🎯 ZOOM AUTOMÁTICO AL LPR SELECCIONADO
    map.setView(center, 15, {
      animate: true,
      duration: 1.0
    });

    // Dibujar círculo de 2km
    const circle = L.circle(center, {
      radius: 2000,
      color: 'red',
      fillColor: '#f03',
      fillOpacity: 0.2,
      weight: 2,
      dashArray: '5, 5'
    });
    circle.addTo(lprCircleLayer);
    console.log(`✅ Círculo de 2km creado y agregado`);

    // Marcador especial para el LPR seleccionado
    const selectedIcon = L.divIcon({
      className: 'lpr-selected-camera-icon',
      html: `<span style="background: #ff0000; color: white; border-radius: 50%; width: 30px; height: 30px; display: flex; align-items: center; justify-content: center; font-weight: bold;">${selectedLprCamera.properties.camera_number}</span>`,
      iconSize: [30, 30],
      iconAnchor: [15, 15]
    });
    
    L.marker(center, { icon: selectedIcon, zIndexOffset: 1000 })
      .bindPopup(`<b>🚨 LPR Seleccionado: ${selectedLprCamera.properties.camera_number}</b><br>${selectedLprCamera.properties.address}<br>Radio: 2km`)
      .addTo(lprFilteredCamerasLayer);

    // Filtrar y mostrar cámaras dentro del radio
    let camerasInRadius = 0;
    let domedCount = 0, fixedCount = 0, lprCount = 0;
    
    allCameras.forEach((feature) => {
      const [camLng, camLat] = feature.geometry.coordinates;
      const camCenter = L.latLng(camLat, camLng);
      const distance = center.distanceTo(camCenter);

      if (distance <= 2000 && feature.properties.camera_number !== selectedLprCamera.properties.camera_number) {
        camerasInRadius++;
        
        // Contar stats
        if (feature.properties.domes) domedCount += parseInt(feature.properties.domes);
        if (feature.properties.fixed) fixedCount += parseInt(feature.properties.fixed);
        if (feature.properties.lpr && parseInt(feature.properties.lpr) > 0) lprCount++;
        
        const isLPR = feature.properties.lpr && parseInt(feature.properties.lpr) > 0;
        const iconColor = isLPR ? '#ff6b00' : '#0066ff';
        const icon = L.divIcon({
          className: 'lpr-filtered-camera-icon',
          html: `<span style="background: ${iconColor}; color: white; border-radius: 50%; width: 24px; height: 24px; display: flex; align-items: center; justify-content: center; font-size: 10px; font-weight: bold;">${feature.properties.camera_number}</span>`,
          iconSize: [24, 24],
          iconAnchor: [12, 12]
        });
        
        L.marker(camCenter, { icon })
          .bindPopup(`<b>Cámara: ${feature.properties.camera_number}</b><br>${feature.properties.address}<br>Barrio: ${feature.properties.barrio}`)
          .addTo(lprFilteredCamerasLayer);
      }
    });

    console.log(`✅ ${camerasInRadius} cámaras dentro del radio de 2km - Domes: ${domedCount}, Fixed: ${fixedCount}, LPR: ${lprCount}`);
  };

  /**
   * Limpia el radio de LPR (botón "Limpiar")
   */
  const clearLprRadius = () => {
    console.log(`🔧 [LPR] clearLprRadius()`);
    lprCircleLayer.clearLayers();
    lprFilteredCamerasLayer.clearLayers();
    
    // Reset selector también
    if (lprCameraSelect) {
      lprCameraSelect.value = '';
    }
  };

  /**
   * Renderiza el selector en el UI (crea el HTML)
   */
  const renderLprSelector = () => {
    console.log(`🔧 [LPR] renderLprSelector()`);
    
    // Si el selector ya existe en DOM, usar ese
    let existingSelect = document.getElementById('lpr-selector');
    if (existingSelect) {
      lprCameraSelect = existingSelect;
      console.log('✅ Selector LPR encontrado en DOM');
      populateLprSelector();
      return;
    }

    // Buscar sidebar
    const sidebar = document.getElementById('sidebar');
    if (!sidebar) {
      console.warn('⚠️ No se encontró sidebar en DOM');
      return;
    }

    // Crear HTML del selector
    const html = `
      <div id="lpr-selector-container" class="sidebar-section lpr-section">
        <h3 class="sidebar-title">🚨 Lectores de Patentes (LPR)</h3>
        <select id="lpr-selector" class="lpr-selector">
          <option value="">-- Seleccionar LPR --</option>
        </select>
        <button id="lpr-show" class="lpr-show-btn">Mostrar Cobertura</button>
        <button id="lpr-clear" class="lpr-clear-btn">Limpiar</button>
        <div id="lpr-info" class="lpr-info" style="margin-top: 10px; padding: 8px; background: rgba(255,255,255,0.1); border-radius: 4px; color: white; font-size: 11px;">
          <p id="lpr-stats" style="margin: 0;">Cámaras LPR cargadas</p>
        </div>
      </div>

      <style>
        .lpr-section {
          background: linear-gradient(135deg, #ff5722 0%, #ff6f00 100%);
          border-radius: 6px;
          padding: 15px !important;
          margin-top: 20px;
        }
        .lpr-section .sidebar-title {
          color: white;
          margin-top: 0;
          margin-bottom: 10px;
        }
        .lpr-selector {
          width: 100%;
          padding: 8px;
          margin: 10px 0;
          border: 2px solid #ff5722;
          border-radius: 4px;
          background: white;
          color: #333;
          font-weight: 500;
          z-index: 1000;
        }
        .lpr-selector:focus {
          outline: none;
          border-color: #d32f2f;
        }
        .lpr-show-btn, .lpr-clear-btn {
          width: 48%;
          padding: 8px;
          margin: 5px 1% 5px 0;
          background: #d32f2f;
          color: white;
          border: none;
          border-radius: 4px;
          cursor: pointer;
          font-weight: bold;
          font-size: 12px;
        }
        .lpr-clear-btn {
          margin: 5px 0;
        }
        .lpr-show-btn:hover, .lpr-clear-btn:hover {
          background: #c62828;
        }
      </style>
    `;

    // Insertar en sidebar
    sidebar.insertAdjacentHTML('beforeend', html);

    // Obtener referencias
    lprCameraSelect = document.getElementById('lpr-selector');
    const showBtn = document.getElementById('lpr-show');
    const clearBtn = document.getElementById('lpr-clear');

    // Event listeners
    if (showBtn) {
      showBtn.addEventListener('click', displayLprRadius);
    }
    if (clearBtn) {
      clearBtn.addEventListener('click', clearLprRadius);
    }

    console.log('✅ Selector LPR renderizado en DOM');
    
    // Poblar selector
    populateLprSelector();
  };

  /**
   * Inicializar módulo LPR
   */
  const init = (leafletMap, camerasData) => {
    console.log('🔧 [LPR] init() llamado');
    map = leafletMap;
    
    if (!map) {
      console.error('❌ [LPR] Mapa no proporcionado a init()');
      return;
    }
    
    console.log(`✅ [LPR] Mapa asignado correctament`);
    
    // Agregar layer groups al mapa
    console.log(`🔧 [LPR] Agregando lprCircleLayer al mapa...`);
    lprCircleLayer.addTo(map);
    console.log(`✅ [LPR] lprCircleLayer agregado`);
    
    console.log(`🔧 [LPR] Agregando lprFilteredCamerasLayer al mapa...`);
    lprFilteredCamerasLayer.addTo(map);
    console.log(`✅ [LPR] lprFilteredCamerasLayer agregado`);

    // Procesar datos de cámaras
    if (camerasData) {
      if (Array.isArray(camerasData)) {
        allCameras = camerasData;
      } else if (camerasData.features) {
        allCameras = camerasData.features;
      }
      console.log(`✅ LPR init con ${allCameras.length} cámaras`);
    }

    // Renderizar selector en UI
    setTimeout(() => {
      renderLprSelector();
    }, 500);
  };

  /**
   * Actualizar datos de cámaras (para cambios de ciudad)
   */
  const setData = (camerasData) => {
    console.log('🔧 [LPR] setData() llamado');
    
    if (camerasData) {
      if (Array.isArray(camerasData)) {
        allCameras = camerasData;
      } else if (camerasData.features) {
        allCameras = camerasData.features;
      }
      console.log(`✅ LPR setData actualizado con ${allCameras.length} cámaras`);
      
      // Limpiar solo las capas NO el selector
      lprCircleLayer.clearLayers();
      lprFilteredCamerasLayer.clearLayers();
      
      // Repoblar selector
      setTimeout(() => {
        populateLprSelector();
      }, 500);
    }
  };

  return {
    init,
    setData,
    displayLprRadius,
    clearLprRadius,
    renderLprSelector
  };
})();

console.log('✅ LprLayer cargado - Sistema de Lectores de Patentes listo');
