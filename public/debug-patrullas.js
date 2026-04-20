/**
 * Panel de Debugging para Patrullas
 * Muestra errores y estado en la interfaz
 */

(function() {
  // Esperar a que DOM esté listo
  const waitForDOM = setTimeout(() => {
    console.log('⏱️ Esperando a que DOM esté listo para panel de debugging...');
  }, 1000);

  // Capturar errores de consola
  const originalError = console.error;
  const originalWarn = console.warn;
  const errors = [];
  const warnings = [];

  console.error = function(...args) {
    errors.push(args.join(' '));
    originalError.apply(console, args);
  };

  console.warn = function(...args) {
    warnings.push(args.join(' '));
    originalWarn.apply(console, args);
  };

  // Monitorear patrulla-layer
  window.debugPatrullas = {
    getStatus: function() {
      return {
        patullaLayerExists: typeof PatullaLayer !== 'undefined',
        patullaInstanceExists: typeof window.patullaLayer !== 'undefined',
        patullaLayerCount: window.patullaLayer ? window.patullaLayer.count() : 0,
        patullaLayerOnline: window.patullaLayer ? window.patullaLayer.countOnline() : 0,
        patullaLayerEmergencia: window.patullaLayer ? window.patullaLayer.countEmergencia() : 0,
        dbExists: typeof db !== 'undefined',
        mapExists: typeof map !== 'undefined',
        currentCity: typeof currentCity !== 'undefined' ? currentCity : 'undefined',
        firebaseUser: window.auth ? auth.currentUser?.email : 'No auth'
      };
    },
    
    showStatus: function() {
      const status = this.getStatus();
      console.log('%c🔍 ESTADO DE PATRULLAS', 'background: #667eea; color: white; padding: 5px 10px; border-radius: 3px; font-weight: bold;');
      console.table(status);
      
      if (errors.length > 0) {
        console.log('%c❌ ERRORES CAPTURADOS', 'background: #dc2626; color: white; padding: 5px 10px; border-radius: 3px; font-weight: bold;');
        console.table(errors);
      }
      
      return status;
    },

    testConnection: async function() {
      console.log('%c🔌 PROBANDO CONEXIÓN A FIREBASE', 'background: #f59e0b; color: white; padding: 5px 10px; border-radius: 3px; font-weight: bold;');
      
      if (typeof db === 'undefined') {
        console.error('❌ Firestore no disponible');
        return false;
      }

      try {
        // Intentar lectura
        const snapshot = await db.collection('patrullas_mar-del-plata').limit(1).get();
        console.log(`✅ Firestore accesible (${snapshot.size} docs en muestra)`);
        return true;
      } catch (error) {
        console.error('❌ Error accediendo Firestore:', error.message);
        return false;
      }
    },

    viewFirestoreData: async function(ciudad = 'mar-del-plata') {
      console.log(`%c📊 MOSTRANDO DATOS DE ${ciudad.toUpperCase()}`, 'background: #10b981; color: white; padding: 5px 10px; border-radius: 3px; font-weight: bold;');
      
      if (typeof db === 'undefined') {
        console.error('❌ Firestore no disponible');
        return;
      }

      try {
        const snapshot = await db.collection(`patrullas_${ciudad}`).get();
        console.log(`📍 Total de patrullas en ${ciudad}: ${snapshot.size}`);
        
        const datos = [];
        snapshot.forEach(doc => {
          datos.push({
            Patente: doc.id,
            Lat: doc.data().lat?.toFixed(4),
            Lng: doc.data().lng?.toFixed(4),
            Online: doc.data().online,
            Emergencia: doc.data().emergencia,
            Estado: doc.data().estado,
            Velocidad: doc.data().speed?.toFixed(1)
          });
        });
        
        if (datos.length > 0) {
          console.table(datos);
        } else {
          console.log('(sin datos - ejecuta: crearPatrullasPrueba())');
        }
      } catch (error) {
        console.error('❌ Error:', error.message);
      }
    },

    help: function() {
      console.log(`
📚 COMANDOS DE DEBUG DISPONIBLES:

debugPatrullas.showStatus()
  → Muestra estado actual del sistema

debugPatrullas.testConnection()
  → Prueba conexión a Firebase

debugPatrullas.viewFirestoreData('cordoba')
  → Ver patrullas en Firestore

crearPatrullasPrueba()
  → Crear patrullas de prueba

simularMovimiento()
  → Simular movimiento de patrullas

verPatrullas()
  → Ver patrullas actuales

limpiarPatrullasPrueba()
  → Eliminar patrullas de prueba
      `);
    }
  };

  // Crear panel visual en la página (opcional)
  const crearPanelDebug = () => {
    const panel = document.createElement('div');
    panel.id = 'debug-patrullas-panel';
    panel.style.cssText = `
      position: fixed;
      bottom: 20px;
      right: 20px;
      background: #1f2937;
      color: #e5e7eb;
      padding: 12px;
      border-radius: 8px;
      font-family: monospace;
      font-size: 11px;
      max-width: 300px;
      z-index: 10000;
      border: 1px solid #374151;
      max-height: 300px;
      overflow-y: auto;
    `;

    const titulo = document.createElement('div');
    titulo.style.cssText = 'font-weight: bold; margin-bottom: 8px; color: #60a5fa;';
    titulo.textContent = '🔍 Debug Panel';
    panel.appendChild(titulo);

    const actualizar = () => {
      const status = window.debugPatrullas.getStatus();
      let html = `
        <div>PatullaLayer: ${status.patullaInstanceExists ? '✅' : '❌'}</div>
        <div>Patrullas: ${status.patullaLayerCount}</div>
        <div>Online: ${status.patullaLayerOnline}</div>
        <div>🚨: ${status.patullaLayerEmergencia}</div>
        <div>DB: ${status.dbExists ? '✅' : '❌'}</div>
        <div>Map: ${status.mapExists ? '✅' : '❌'}</div>
        <div>City: ${status.currentCity}</div>
      `;
      
      if (errors.length > 0) {
        html += `<div style="border-top:1px solid #374151;margin-top:8px;padding-top:8px;color:#f87171;">❌ Errors: ${errors.length}</div>`;
      }

      panel.innerHTML = titulo.outerHTML + html;
    };

    // Actualizar cada 2 segundos
    setInterval(actualizar, 2000);
    actualizar();

    // Agregar al DOM cuando esté listo
    document.addEventListener('DOMContentLoaded', () => {
      if (document.body && !document.getElementById('debug-patrullas-panel')) {
        document.body.appendChild(panel);
        console.log('✅ Debug panel agregado');
      }
    });

    // Fallback si DOMContentLoaded ya pasó
    if (document.body && !document.getElementById('debug-patrullas-panel')) {
      document.body.appendChild(panel);
    }
  };

  // Crear panel después de un breve delay
  setTimeout(crearPanelDebug, 2000);

  console.log('%c✅ Debug Patrullas cargado', 'background: #10b981; color: white; padding: 5px 10px; border-radius: 3px;');
  console.log('💡 Escribe: debugPatrullas.help()');
})();
