/**
 * 🏙️ STREET VIEW: Visor de Google Street View
 */

const StreetViewLayer = (() => {
  const GOOGLE_MAPS_API_KEY = 'AIzaSyBp2ZiKA4lYieyjX_aJJjE023NeqKrRhJc';
  
  let isEnabled = false;
  let streetViewPanorama = null;
  let panelElement = null;
  let toggleButton = null;

  /**
   * Inicializa el Street View
   */
  const init = () => {
    // Crear contenedor del panel Street View
    panelElement = document.createElement('div');
    panelElement.id = 'street-view-panel';
    panelElement.style.cssText = `
      position: fixed;
      right: -400px;
      top: 60px;
      width: 400px;
      height: calc(100vh - 120px);
      background: #fff;
      box-shadow: -2px 0 8px rgba(0,0,0,0.15);
      z-index: 1000;
      transition: right 0.3s ease-out;
      border-radius: 4px 0 0 4px;
      overflow: hidden;
      display: flex;
      flex-direction: column;
    `;
    document.body.appendChild(panelElement);

    // Crear header del panel
    const header = document.createElement('div');
    header.style.cssText = `
      background: #263238;
      color: white;
      padding: 12px;
      display: flex;
      justify-content: space-between;
      align-items: center;
      font-weight: bold;
      font-size: 14px;
    `;
    header.innerHTML = `
      <span>🏙️ Street View</span>
      <button id="close-street-view" style="background: none; border: none; color: white; cursor: pointer; font-size: 18px;">✕</button>
    `;
    panelElement.appendChild(header);

    // Crear contenedor para el panorama
    const panoramaDiv = document.createElement('div');
    panoramaDiv.id = 'street-view-panorama';
    panoramaDiv.style.cssText = `
      flex: 1;
      background: #ccc;
    `;
    panelElement.appendChild(panoramaDiv);

    // Event listener para cerrar el panel
    document.getElementById('close-street-view').addEventListener('click', () => {
      hide();
    });

    console.log('✅ StreetViewLayer inicializado');
  };

  /**
   * Muestra Street View en una ubicación específica
   */
  const showAt = (lat, lng, address = '') => {
    if (!panelElement) {
      console.warn('⚠️ Street View panel no inicializado');
      return;
    }

    // Crear panorama si no existe
    if (!streetViewPanorama) {
      streetViewPanorama = new google.maps.StreetViewPanorama(
        document.getElementById('street-view-panorama'),
        {
          position: { lat, lng },
          pov: { heading: 0, pitch: 0 },
          zoom: 1,
          showRoadLabels: true,
          addressControl: true,
          fullscreenControl: true,
          motionTrackingControl: true,
          panControl: true,
          zoomControl: true
        }
      );
      
      console.log(`🏙️ Street View creado en: ${lat}, ${lng}`);
    } else {
      // Actualizar posición del panorama existente
      streetViewPanorama.setPosition({ lat, lng });
      console.log(`🏙️ Street View actualizado a: ${lat}, ${lng}`);
    }

    // Mostrar panel
    panelElement.style.right = '0px';
    
    // Actualizar header con dirección
    const header = panelElement.querySelector('div:first-child');
    if (address) {
      const addressSpan = header.querySelector('span');
      addressSpan.textContent = `🏙️ ${address.substring(0, 50)}...`;
      addressSpan.title = address;
    }

    isEnabled = true;
    console.log(`✅ Street View mostrado`);
  };

  /**
   * Oculta el panel de Street View
   */
  const hide = () => {
    if (!panelElement) return;
    
    panelElement.style.right = '-400px';
    isEnabled = false;
    console.log(`❌ Street View ocultado`);
  };

  /**
   * Toggle Street View
   */
  const toggle = () => {
    if (isEnabled) {
      hide();
    } else {
      console.warn('⚠️ Selecciona una ubicación primero');
    }
  };

  /**
   * Obtiene estado actual
   */
  const getIsEnabled = () => isEnabled;

  /**
   * Limpia recursos
   */
  const cleanup = () => {
    if (streetViewPanorama) {
      streetViewPanorama = null;
    }
    hide();
  };

  return {
    init,
    showAt,
    hide,
    toggle,
    getIsEnabled,
    cleanup
  };
})();

console.log('✅ StreetViewLayer cargado');
