/**
 * Main Module
 * Punto de entrada de la aplicación
 * Orquesta la inicialización de todos los módulos
 */

import { loadConfig, getMunicipioConfig, getMapConfig, isFeatureEnabled } from './js/config-loader.js';
import { initializeFirebase } from './js/firebase-config.js';
import { initializeMap, drawZoneLayer } from './js/map.js';
import { onAuthStateChange, isAuthenticated } from './js/auth.js';

/**
 * Función principal de inicialización
 */
async function initApp() {
  try {
    console.log('🚀 Iniciando TraficoMapGeneral...');
    
    // 1. Cargar configuración
    const config = await loadConfig();
    const municipio = getMunicipioConfig();
    console.log(`📍 Municipio: ${municipio.nombre}, ${municipio.pais}`);
    
    // 2. Inicializar Firebase
    await initializeFirebase(config);
    
    // 3. Inicializar mapa
    const mapConfig = getMapConfig();
    initializeMap('map', mapConfig.mapBase);
    
    // 4. Cargar datos GeoJSON si existen
    try {
      const response = await fetch(`/data/${config.datos.archivoBarrios}`);
      if (response.ok) {
        const geoJsonData = await response.json();
        drawZoneLayer(geoJsonData);
      }
    } catch (error) {
      console.warn('⚠️ No se pudieron cargar datos GeoJSON:', error.message);
    }
    
    // 5. Escuchar cambios de autenticación
    onAuthStateChange((user) => {
      if (user) {
        console.log('✅ Usuario autenticado:', user.email);
        updateUIForAuthenticatedUser();
      } else {
        console.log('❌ No hay usuario autenticado');
        updateUIForUnauthenticatedUser();
      }
    });
    
    // 6. Log de features habilitadas
    console.log('📊 Features habilitados:');
    if (isFeatureEnabled('chat')) console.log('  ✅ Chat');
    if (isFeatureEnabled('video_hls')) console.log('  ✅ Video HLS');
    if (isFeatureEnabled('analytics')) console.log('  ✅ Analytics');
    if (isFeatureEnabled('patrols')) console.log('  ✅ Patrullas');
    
    console.log('✅ Aplicación inicializada correctamente');
    
  } catch (error) {
    console.error('🔴 Error iniciando aplicación:', error);
    showErrorMessage('Error iniciando la aplicación. Verifique la consola.');
  }
}

/**
 * Actualiza la UI para usuario autenticado
 */
function updateUIForAuthenticatedUser() {
  const userEmail = document.getElementById('user-email');
  if (userEmail) {
    userEmail.textContent = getUserEmail();
  }
  
  // Mostrar elementos solo para usuarios autenticados
  const authElements = document.querySelectorAll('[data-auth-required]');
  authElements.forEach(el => {
    el.style.display = 'block';
  });
}

/**
 * Actualiza la UI para usuario no autenticado
 */
function updateUIForUnauthenticatedUser() {
  // Ocultar elementos que requieren autenticación
  const authElements = document.querySelectorAll('[data-auth-required]');
  authElements.forEach(el => {
    el.style.display = 'none';
  });
}

/**
 * Muestra mensaje de error
 * @param {string} message - Mensaje a mostrar
 */
function showErrorMessage(message) {
  const errorDiv = document.createElement('div');
  errorDiv.style.cssText = `
    position: fixed;
    top: 20px;
    right: 20px;
    background: #dc2626;
    color: white;
    padding: 15px 20px;
    border-radius: 8px;
    box-shadow: 0 4px 6px rgba(0,0,0,0.1);
    font-size: 14px;
    z-index: 9999;
  `;
  errorDiv.textContent = message;
  document.body.appendChild(errorDiv);
  
  setTimeout(() => {
    errorDiv.remove();
  }, 5000);
}

/**
 * Obtiene email del usuario actual
 * @returns {string} Email del usuario
 */
function getUserEmail() {
  const user = firebase.auth().currentUser;
  return user ? user.email : 'Anónimo';
}

// Iniciar la aplicación cuando el DOM esté listo
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initApp);
} else {
  initApp();
}

// Exportar funciones útiles
export { initApp, showErrorMessage };
