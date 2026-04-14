/**
 * 🏙️ STREET VIEW: Visor de Google Street View - VERSIÓN SIMPLIFICADA
 */

const StreetViewLayer = (() => {
  let streetViewPanorama = null;
  let panelElement = null;
  let isDragging = false;
  let dragOffset = { x: 0, y: 0 };

  /**
   * Inicializa el Street View
   */
  const init = () => {
    // Crear contenedor del panel Street View
    panelElement = document.createElement('div');
    panelElement.id = 'street-view-panel';
    panelElement.style.cssText = `
      position: fixed !important;
      right: 20px !important;
      top: 20px !important;
      width: 380px !important;
      height: 420px !important;
      background: #fff !important;
      box-shadow: 0 4px 20px rgba(0,0,0,0.3) !important;
      z-index: 9999 !important;
      border-radius: 8px !important;
      overflow: hidden !important;
      visibility: hidden;
      opacity: 0;
      display: flex !important;
      flex-direction: column !important;
      transition: opacity 0.3s ease !important;
    `;
    document.body.appendChild(panelElement);

    // Crear header del panel (draggable)
    const header = document.createElement('div');
    header.id = 'street-view-header';
    header.style.cssText = `
      background: #263238;
      color: white;
      padding: 12px 16px;
      display: flex;
      justify-content: space-between;
      align-items: center;
      font-weight: bold;
      font-size: 14px;
      cursor: move;
      user-select: none;
      flex-shrink: 0;
    `;
    header.innerHTML = `
      <span>🏙️ Street View</span>
      <button id="close-street-view" style="background: none; border: none; color: white; cursor: pointer; font-size: 18px; padding: 0; width: 24px; height: 24px;">✕</button>
    `;
    panelElement.appendChild(header);

    // Crear contenedor para el panorama
    const panoramaDiv = document.createElement('div');
    panoramaDiv.id = 'street-view-panorama';
    panoramaDiv.style.cssText = `
      flex: 1;
      background: #000000;
      width: 100% !important;
      height: 100% !important;
      overflow: hidden !important;
      display: block !important;
      visibility: visible !important;
      opacity: 1 !important;
      z-index: 999;
    `;
    panelElement.appendChild(panoramaDiv);

    // Event listener para cerrar el panel
    document.getElementById('close-street-view').addEventListener('click', (e) => {
      e.stopPropagation();
      hide();
    });

    // ===== HACER EL PANEL DRAGGABLE =====
    header.addEventListener('mousedown', (e) => {
      if (e.target.tagName === 'BUTTON') return;
      
      isDragging = true;
      const rect = panelElement.getBoundingClientRect();
      dragOffset.x = e.clientX - rect.left;
      dragOffset.y = e.clientY - rect.top;
      header.style.background = '#1a202c';
    });

    document.addEventListener('mousemove', (e) => {
      if (!isDragging) return;
      
      let newX = e.clientX - dragOffset.x;
      let newY = e.clientY - dragOffset.y;
      
      // Limitar a los bordes con más margen
      newX = Math.max(-100, Math.min(newX, window.innerWidth - 280));
      newY = Math.max(-100, Math.min(newY, window.innerHeight - 320));
      
      panelElement.style.right = 'auto';
      panelElement.style.bottom = 'auto';
      panelElement.style.left = newX + 'px';
      panelElement.style.top = newY + 'px';
    });

    document.addEventListener('mouseup', () => {
      isDragging = false;
      const hdr = document.getElementById('street-view-header');
      if (hdr) hdr.style.background = '#263238';
    });

    console.log('✅ StreetViewLayer inicializado');
  };

  /**
   * Muestra Street View en una ubicación específica
   */
  const showAt = (lat, lng, address = '') => {
    if (!panelElement) {
      console.warn('⚠️ Panel no inicializado');
      return;
    }

    console.log(`📍 showAt() StreetViewPanorama VERSION - lat=${lat}, lng=${lng}`);

    // RESETEAR posición a esquina superior derecha
    panelElement.style.right = '20px';
    panelElement.style.top = '20px';
    panelElement.style.left = 'auto';
    panelElement.style.bottom = 'auto';

    // PASO 1: Hacer visible el panel COMPLETAMENTE
    panelElement.style.visibility = 'visible';
    panelElement.style.opacity = '1';
    panelElement.style.display = 'flex';

    // PASO 1B: Hacer visible el panorama también
    const panoramaDiv = document.getElementById('street-view-panorama');
    if (panoramaDiv) {
      panoramaDiv.style.visibility = 'visible';
      panoramaDiv.style.opacity = '1';
      panoramaDiv.style.display = 'block';
      panoramaDiv.style.backgroundColor = '#000000';
      panoramaDiv.style.width = '100%';
      panoramaDiv.style.height = '100%';
      console.log('✅ Panorama DIV visible');
    }

    // Actualizar título con dirección
    const titleEl = document.getElementById('street-view-title');
    if (titleEl && address) {
      titleEl.textContent = `🏙️ ${address.substring(0, 45)}`;
      titleEl.title = address;
    }

    console.log('✅ Panel mostrado y visible');

    // PASO 2: Esperar 100ms para que el browser renderice TODO
    setTimeout(() => {
      const pano = document.getElementById('street-view-panorama');
      if (!pano) {
        console.error('❌ street-view-panorama no existe');
        return;
      }

      const width = pano.offsetWidth;
      const height = pano.offsetHeight;
      console.log(`📐 Dimensiones obtenidas: ${width}x${height}`);

      if (width > 0 && height > 0) {
        console.log('🚀 Contenedor listo, creando panorama...');
        createPanorama(lat, lng);
      } else {
        console.error('❌ Contenedor sin dimensiones');
      }
    }, 100);
  };

  /**
   * Crea Street View usando iframe embebido - ENFOQUE SIMPLE
   */
  const createPanoramaWithIframe = (lat, lng) => {
    console.log('🔧 createPanoramaWithIframe() lat:', lat, 'lng:', lng);
    
    const panoramaDiv = document.getElementById('street-view-panorama');
    if (!panoramaDiv) {
      console.error('❌ Div #street-view-panorama no encontrado');
      return false;
    }

    // Force visibility
    panoramaDiv.style.visibility = 'visible';
    panoramaDiv.style.opacity = '1';
    panoramaDiv.style.display = 'block';
    panoramaDiv.style.width = '100%';
    panoramaDiv.style.height = '100%';
    panoramaDiv.style.backgroundColor = '#ffffff';

    console.log(`📏 Dimensiones contenedor: ${panoramaDiv.offsetWidth}x${panoramaDiv.offsetHeight}`);

    // Limpiar HTML previo
    panoramaDiv.innerHTML = '';

    try {
      // Crear iframe con Google Maps Street View
      const iframeUrl = `https://www.google.com/maps/embed/v1/streetview?key=AIzaSyBp2ZiKA4lYieyjX_aJJjE023NeqKrRhJc&location=${lat},${lng}&heading=0&pitch=0&fov=90`;
      
      console.log('⚙️ Creando iframe de Google Maps Street View');
      
      const iframe = document.createElement('iframe');
      iframe.src = iframeUrl;
      iframe.style.cssText = `
        width: 100%;
        height: 100%;
        border: none;
        border-radius: 0;
        margin: 0;
        padding: 0;
      `;
      iframe.title = 'Google Maps Street View';
      iframe.allow = 'fullscreen';
      
      panoramaDiv.appendChild(iframe);
      
      console.log(`✅ iframe creado: ${iframeUrl.substring(0, 80)}...`);
      console.log(`🌍 Street View Street View con iframe en: ${lat}, ${lng}`);
      return true;

    } catch (error) {
      console.error('❌ Error:', error.message);
      return false;
    }
  };

  /**
   * Crea el Street View Panorama - VERSIÓN CORREGIDA
   */
  const createPanorama = (lat, lng) => {
    console.log('🔧 createPanorama() INICIADO');
    
    if (typeof google === 'undefined' || !google.maps || !google.maps.StreetViewPanorama) {
      console.error('❌ Google Maps StreetViewPanorama no disponible');
      return false;
    }

    const panoramaDiv = document.getElementById('street-view-panorama');
    if (!panoramaDiv) {
      console.error('❌ Div #street-view-panorama no encontrado');
      return false;
    }

    // FORZAR visibilidad AGRESIVA
    panoramaDiv.style.visibility = 'visible';
    panoramaDiv.style.display = 'block';
    panoramaDiv.style.opacity = '1';
    panoramaDiv.style.width = '100%';
    panoramaDiv.style.height = '100%';
    panoramaDiv.style.backgroundColor = '#000000';
    panoramaDiv.style.pointerEvents = 'auto';
    
    console.log(`📐 Panorama dimensions: ${panoramaDiv.offsetWidth}x${panoramaDiv.offsetHeight}`);
    console.log(`🎯 Location: ${lat}, ${lng}`);

    // Limpiar contenido previo
    panoramaDiv.innerHTML = '';
    
    const location = { lat: parseFloat(lat), lng: parseFloat(lng) };

    try {
      console.log('⚙️ Creando StreetViewPanorama...');
      
      // Crear el panorama DESPUÉS de 50ms
      setTimeout(() => {
        streetViewPanorama = new google.maps.StreetViewPanorama(
          panoramaDiv,
          {
            position: location,
            zoom: 1,
            pov: { heading: 0, pitch: 0 },
            disableDefaultUI: false,
            addressControl: true,
            panControl: true,
            zoomControl: true,
            fullscreenControl: true,
            motionTrackingControl: true,
            linksControl: true,
            scrollwheel: true,
            clickToGo: true
          }
        );

        console.log('✅ StreetViewPanorama creado');
        console.log(`   Canvas elements: ${panoramaDiv.querySelectorAll('canvas').length}`);
        
        // FORCE RESIZE inmediatamente Y después
        if (google.maps && google.maps.event) {
          google.maps.event.trigger(streetViewPanorama, 'resize');
          console.log('↻ Resize event#1 disparado');
          
          setTimeout(() => {
            google.maps.event.trigger(streetViewPanorama, 'resize');
            console.log('↻ Resize event#2 disparado @ 150ms');
          }, 150);
        }

        // Event listener para status
        google.maps.event.addListenerOnce(streetViewPanorama, 'status_changed', () => {
          const status = streetViewPanorama.getStatus();
          console.log(`📊 Street View Status: ${status}`);
          if (status === google.maps.StreetViewStatus.OK) {
            console.log('✅✅✅ Street View VISIBLE!');
            // Forzar último resize
            setTimeout(() => {
              google.maps.event.trigger(streetViewPanorama, 'resize');
            }, 200);
          }
        });

      }, 50); // Esperar 50ms para que el DOM esté completamente listo

      return true;

    } catch (error) {
      console.error('❌ Error creando StreetViewPanorama:', error.message);
      return false;
    }
  };

  /**
   * Oculta el panel de Street View
   */
  const hide = () => {
    if (!panelElement) return;
    
    panelElement.style.visibility = 'hidden';
    panelElement.style.opacity = '0';
    console.log(`❌ Street View ocultado`);
  };

  /**
   * Toggle Street View
   */
  const toggle = () => {
    if (panelElement.style.display === 'none') {
      console.warn('⚠️ No hay ubicación para mostrar');
    } else {
      hide();
    }
  };

  /**
   * Limpia recursos
   */
  const cleanup = () => {
    if (streetViewPanorama) {
      try {
        streetViewPanorama.setVisible(false);
        streetViewPanorama = null;
      } catch (e) {}
    }
    hide();
  };

  return {
    init,
    showAt,
    hide,
    toggle,
    cleanup
  };
})();

console.log('✅ StreetViewLayer cargado');
