/**
 * Firebase Initialization Script
 * PASO 1: Carga config.json
 * PASO 2: Inicializa Firebase GENERAL para autenticación
 * PASO 3: ClientAuth se encargará de cambiar a Firebase del CLIENTE después de auth
 */

console.log('📋 firebase-init.js iniciando...');

// Variable global para config
window.CONFIG = window.CONFIG || {};
window.firebaseInitPromise = null; // Promise que se resuelve cuando Firebase esté listo

// Esperar a que Firebase esté disponible
function waitForFirebase() {
  return new Promise((resolve) => {
    const checkFirebase = setInterval(() => {
      if (typeof firebase !== 'undefined' && firebase.initializeApp) {
        console.log('✅ Firebase SDK disponible');
        clearInterval(checkFirebase);
        resolve();
      }
    }, 100);
    
    // Timeout de 10 segundos
    setTimeout(() => {
      console.warn('⚠️ Firebase SDK no disponible después de 10 segundos');
      clearInterval(checkFirebase);
      resolve();
    }, 10000);
  });
}

async function loadClientConfig() {
  try {
    // Esperar a que Firebase SDK esté listo
    await waitForFirebase();
    
    console.log('📋 Cargando config.json...');
    
    // Intenta cargar config.json desde la carpeta public
    const configPath = '/config.json';
    const response = await fetch(configPath, {
      method: 'GET',
      headers: { 'Accept': 'application/json' }
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const config = await response.json();
    
    // Validar que config tiene los campos requeridos (estructura plana + clienteConfig)
    if (!config || !config.projectId || !config.apiKey) {
      console.error('❌ Config inválido, no tiene projectId o apiKey:', config);
      throw new Error('Config.json incompleto - falta projectId o apiKey');
    }
    
    console.log('✅ Config.json cargado correctamente:', {
      projectId: config.projectId,
      cliente_projectId: config.clienteConfig?.projectId || 'no configurado'
    });
    
    // Asignar a variable global
    window.CONFIG = config;
    
    // ✅ PASO 2: Inicializar Firebase GENERAL para autenticación
    if (typeof firebase !== 'undefined' && firebase.apps && firebase.apps.length === 0) {
      console.log('🔥 Inicializando Firebase GENERAL para autenticación...');
      firebase.initializeApp(config); // Usar estructura plana del config
      console.log('✅ Firebase GENERAL inicializado correctamente:', config.projectId);
    } else {
      console.log('ℹ️ Firebase ya estaba inicializado');
    }
    
    return config;
  } catch (error) {
    console.error('❌ Error cargando config:', error.message);
    console.warn('⚠️ Usando config predeterminada (dev)');
    
    // Config de desarrollo por defecto
    window.CONFIG = {
      apiKey: "AIzaSyCkYYx5n-gKaKtTqOv2R1Glz1D_TA_Y5KA",
      authDomain: "trafico-map-general-v2.firebaseapp.com",
      projectId: "trafico-map-general-v2",
      storageBucket: "trafico-map-general-v2.firebasestorage.app",
      messagingSenderId: "540631719751",
      appId: "1:540631719751:web:bd410f1bbee18e9fabb662",
      clienteConfig: {
        apiKey: "AIzaSyAY2jYGrXdwv3eyH19r8p7sw7iy5V5ApXg",
        authDomain: "laplatamaps-52a3b.firebaseapp.com",
        projectId: "laplatamaps-52a3b",
        storageBucket: "laplatamaps-52a3b.firebasestorage.app",
        messagingSenderId: "9948736453",
        appId: "1:9948736453:web:0f607caf88bb9478bdf9ac"
      },
      ciudad: "La Plata",
      clientId: "user123"
    };

    if (typeof firebase !== 'undefined' && firebase.apps && firebase.apps.length === 0) {
      console.log('🔥 Inicializando Firebase GENERAL con config de desarrollo...');
      try {
        firebase.initializeApp(window.CONFIG);
        console.log('✅ Firebase GENERAL inicializado con config dev');
      } catch (firebaseError) {
        console.error('❌ Error inicializando Firebase:', firebaseError);
      }
    }
    
    return window.CONFIG;
  }
}

// Ejecutar al cargar y guardar promise global
console.log('⏳ Esperando a que Firebase esté listo...');
window.firebaseInitPromise = loadClientConfig().then(() => {
  console.log('✅ Firebase GENERAL completamente inicializado. Sistema listo para autenticación.');
  return window.CONFIG;
}).catch(err => {
  console.error('❌ Error en loadClientConfig:', err);
  return window.CONFIG;
});

// Exponerla también como función si se necesita llamarla de nuevo
window.loadClientConfig = loadClientConfig;
