/**
 * Script de verificación de Firebase
 * Se carga ANTES que los otros scripts para asegurar que db esté disponible
 */

(function() {
  // Esperar a que Firebase esté inicializado
  const checkFirebase = setInterval(() => {
    if (typeof firebase !== 'undefined' && firebase.apps && firebase.apps.length > 0) {
      clearInterval(checkFirebase);
      
      // Inicializar db como Firestore si aún no existe
      if (typeof window.db === 'undefined') {
        try {
          window.db = firebase.firestore();
          console.log('✅ Firebase Firestore inicializado globalmente como window.db');
        } catch (e) {
          console.warn('⚠️ Error inicializando Firestore:', e.message);
        }
      }
      
      // Verificar que todo esté listo
      setTimeout(() => {
        console.log('%c🔍 VERIFICACIÓN DE FIREBASE', 'background: #667eea; color: white; padding: 5px 10px; border-radius: 3px;');
        console.log('  firebase.apps:', firebase.apps.length > 0 ? '✅' : '❌');
        console.log('  firebase.auth():', typeof firebase.auth() !== 'undefined' ? '✅' : '❌');
        console.log('  firebase.firestore():', typeof firebase.firestore() !== 'undefined' ? '✅' : '❌');
        console.log('  window.db:', typeof window.db !== 'undefined' ? '✅' : '❌');
        console.log('\n💡 Patrullas testing listo: crearPatrullasPrueba()');
      }, 2000);
    }
  }, 100);

  // Timeout por seguridad después de 10 segundos
  setTimeout(() => {
    clearInterval(checkFirebase);
  }, 10000);
})();
