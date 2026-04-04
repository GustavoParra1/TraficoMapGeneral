/**
 * Firebase Configuration Module
 * Carga la configuración de Firebase desde el archivo de configuración
 * Permite múltiples instancias para diferentes municipios
 */

export let firebaseConfig = null;
export let database = null;
export let auth = null;

/**
 * Inicializa Firebase con la configuración específica del municipio
 * @param {Object} config - Objeto de configuración desde config.json
 */
export async function initializeFirebase(config) {
  firebaseConfig = config.firebase;
  
  // Importar dinámicamente Firebase (solo en el cliente)
  if (typeof window !== 'undefined') {
    const { initializeApp } = await import('https://www.gstatic.com/firebasejs/9.22.0/firebase-app.js');
    const { getDatabase } = await import('https://www.gstatic.com/firebasejs/9.22.0/firebase-database.js');
    const { getAuth } = await import('https://www.gstatic.com/firebasejs/9.22.0/firebase-auth.js');
    
    const app = initializeApp(firebaseConfig);
    database = getDatabase(app);
    auth = getAuth(app);
    
    console.log('✅ Firebase initialized for:', config.municipio.nombre);
  }
}

export function getFirebaseConfig() {
  return firebaseConfig;
}

export function getDatabase() {
  if (!database) {
    throw new Error('Firebase no inicializado. Llama a initializeFirebase() primero.');
  }
  return database;
}

export function getAuth() {
  if (!auth) {
    throw new Error('Firebase no inicializado. Llama a initializeFirebase() primero.');
  }
  return auth;
}
