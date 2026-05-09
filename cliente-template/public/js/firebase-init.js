/**
 * Firebase Initialization Script
 * Carga config.json y inicializa Firebase
 * Compatible con scripts regulares (no módulos)
 */

let firebaseConfig = null;

// Cargar configuración del cliente
async function loadClientConfig() {
  try {
    console.log('📋 Cargando config.json...');
    const response = await fetch('/config.json');
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    const config = await response.json();
    console.log('✅ Config cargada:', config);
    
    // Guardar en window para disponibilidad global
    window.CONFIG = config;
    firebaseConfig = config.firebase;
    
    console.log('🔥 Firebase Config:', {
      projectId: firebaseConfig.projectId,
      authDomain: firebaseConfig.authDomain
    });
    
    // Inicializar Firebase con la configuración del cliente
    firebase.initializeApp(firebaseConfig);
    console.log('✅ Firebase inicializado con config del cliente');
    
    // Hacer disponible globalmente
    window.db = firebase.firestore();
    window.auth = firebase.auth();
    window.firebaseConfig = firebaseConfig;
    
    // Disparar evento para que otros scripts sepan que Firebase está listo
    window.dispatchEvent(new CustomEvent('firebaseReady', { detail: config }));
    
  } catch (error) {
    console.error('❌ Error cargando config:', error);
    // Fallback a configuración predeterminada para pruebas
    console.warn('⚠️ Usando config predeterminada (dev)');
    
    const devConfig = {
      apiKey: "AIzaSyAY2jYGrXdwv3eyH19r8p7sw7iy5V5ApXg",
      authDomain: "laplatamaps-52a3b.firebaseapp.com",
      projectId: "laplatamaps-52a3b",
      storageBucket: "laplatamaps-52a3b.firebasestorage.app",
      messagingSenderId: "9948736453",
      appId: "1:9948736453:web:0f607caf88bb9478bdf9ac"
    };
    
    window.CONFIG = { firebase: devConfig };
    firebaseConfig = devConfig;
    
    try {
      firebase.initializeApp(firebaseConfig);
      window.db = firebase.firestore();
      window.auth = firebase.auth();
      window.firebaseConfig = firebaseConfig;
      window.dispatchEvent(new CustomEvent('firebaseReady', { detail: window.CONFIG }));
    } catch (initError) {
      console.error('❌ Error inicializando Firebase:', initError);
    }
  }
}

// Ejecutar cuando el DOM esté listo
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', loadClientConfig);
} else {
  loadClientConfig();
}
