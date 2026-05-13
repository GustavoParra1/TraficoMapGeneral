// js/client-auth.js
// Autenticación SEGURA para clientes (municipios)
// 
// FLUJO:
// 1. Auth contra Firebase GENERAL (trafico-map-general-v2)
// 2. Obtener credenciales de Firebase del CLIENTE via Cloud Function
// 3. Instanciar Firebase del CLIENTE dinámicamente
// 4. Cargar datos del cliente desde su Firebase

class ClientAuth {
  constructor() {
    this.user = null;
    this.clientData = null;
    this.clientFirebaseApp = null;      // Instancia de Firebase del cliente
    this.clientAuth = null;             // Auth del cliente
    this.clientDb = null;               // Firestore del cliente
    this.unsubscribeStateListener = null; // Listener para cambios de estado
    this.isAccessDenied = false;        // Flag para evitar loops en acceso denegado
  }

  async init() {
    console.log("🔐 ClientAuth inicializando...");
    
    try {
      // Firebase GENERAL ya fue inicializado en index.html
      console.log("✅ Firebase GENERAL ya está inicializado");
      
      // Verificar si hay sesión guardada en sessionStorage
      const savedClienteId = sessionStorage.getItem('clienteId');
      const savedClienteData = sessionStorage.getItem('clienteData');
      
      if (savedClienteId && savedClienteData) {
        // ✅ Restaurar sesión guardada
        console.log("🔄 Restaurando sesión guardada...");
        this.clientData = JSON.parse(savedClienteData);
        await this.onClientAuthenticated(savedClienteId, this.clientData);
      } else {
        // Mostrar formulario de login
        console.log("👤 No hay sesión guardada - Mostrando login");
        this.showLoginForm();
      }
    } catch (err) {
      console.error("❌ Error fatal en init():", err);
      this.showError("Error inicializando autenticación: " + err.message);
    }
  }

  showLoginForm() {
    console.log("🎨 Mostrando formulario de login...");
    const app = document.getElementById('app');
    app.innerHTML = `
      <div style="width: 100%; height: 100vh; display: flex; align-items: center; justify-content: center; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);">
        <div style="background: white; border-radius: 12px; box-shadow: 0 10px 40px rgba(0, 0, 0, 0.2); width: 100%; max-width: 400px; padding: 40px;">
          <h1 style="color: #333; margin-bottom: 10px; font-weight: 700; text-align: center; font-size: 24px;">
            <i class="bi bi-map"></i> TraficoMap
          </h1>
          <p style="color: #999; text-align: center; margin-bottom: 30px; font-size: 14px;">Panel del Cliente</p>
          
          <form id="loginForm">
            <div style="margin-bottom: 20px;">
              <label style="display: block; margin-bottom: 8px; font-weight: 500; color: #333; font-size: 14px;">Email</label>
              <input type="email" id="loginEmail" placeholder="admin@municipio.gov.ar" required style="width: 100%; padding: 12px; border: 1px solid #ddd; border-radius: 6px; font-size: 14px; box-sizing: border-box;">
            </div>
            
            <div style="margin-bottom: 20px;">
              <label style="display: block; margin-bottom: 8px; font-weight: 500; color: #333; font-size: 14px;">Contraseña</label>
              <input type="password" id="loginPassword" placeholder="Contraseña" required autocomplete="current-password" style="width: 100%; padding: 12px; border: 1px solid #ddd; border-radius: 6px; font-size: 14px; box-sizing: border-box;">
            </div>
            
            <button type="submit" style="width: 100%; padding: 12px; background: #667eea; color: white; border: none; border-radius: 6px; font-weight: 600; cursor: pointer; margin-bottom: 15px; font-size: 14px;">
              <i class="bi bi-box-arrow-in-right"></i> Iniciar Sesión
            </button>
          </form>
          
          <div id="loginAlert"></div>
          
          <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;">
          <small style="color: #999; display: block; text-align: center; font-size: 12px;">
            ¿Problemas para acceder? Contacta con el equipo administrativo.
          </small>
        </div>
      </div>
    `;
    
    // Adjuntar evento del formulario
    document.getElementById('loginForm').addEventListener('submit', (e) => {
      e.preventDefault();
      this.handleLogin();
    });
  }

  async handleLogin() {
    const email = document.getElementById('loginEmail').value;
    const password = document.getElementById('loginPassword').value;
    
    try {
      console.log("🔐 Validando credenciales contra Firestore:", email);
      
      // ✅ PASO 1: Buscar cliente en Firestore (sin autenticar)
      const db = firebase.firestore();
      const clientesSnapshot = await db.collection('clientes')
        .where('email_admin', '==', email)
        .limit(1)
        .get();
      
      if (clientesSnapshot.empty) {
        throw new Error("Usuario no encontrado. Verifica el email.");
      }
      
      const clienteDoc = clientesSnapshot.docs[0];
      const clienteData = clienteDoc.data();
      const clienteId = clienteDoc.id;
      
      console.log("🔍 Cliente encontrado:", clienteData.nombre);
      
      // ✅ PASO 2: Validar contraseña
      const passwordStored = clienteData.contraseña || clienteData.password;
      if (passwordStored !== password) {
        throw new Error("Contraseña incorrecta.");
      }
      
      console.log("✅ Credenciales válidas");
      
      // ✅ PASO 3: Guardar datos del cliente en sessionStorage
      sessionStorage.setItem('clienteId', clienteId);
      sessionStorage.setItem('clienteData', JSON.stringify(clienteData));
      sessionStorage.setItem('email_acceso', email);
      
      console.log("✅ Login exitoso con credenciales de Firestore");
      
      // ✅ PASO 4: Cargar el cliente
      await this.onClientAuthenticated(clienteId, clienteData);
      
    } catch (error) {
      console.error("❌ Error de login:", error);
      this.showError(error.message || this.getErrorMessage(error.code || 'unknown-error'));
    }
  }

  async onClientAuthenticated(clienteId, clienteData) {
    console.log("✅ Cliente autenticado:", clienteData.nombre);
    this.clientData = clienteData;
    
    // ✅ INICIALIZAR FIREBASE DEL CLIENTE
    try {
      if (clienteData.firebase_cliente) {
        console.log("🔥 Inicializando Firebase del cliente...");
        const clientFirebaseConfig = clienteData.firebase_cliente;
        
        // Crear nueva instancia de Firebase para el cliente
        if (!this.clientFirebaseApp) {
          this.clientFirebaseApp = firebase.initializeApp(clientFirebaseConfig, `client-${clienteId}`);
          console.log("✅ Nueva instancia de Firebase creada para cliente");
        }
        
        // Obtener references de esta instancia
        this.clientDb = this.clientFirebaseApp.firestore();
        this.clientAuth = this.clientFirebaseApp.auth();
        
        console.log("✅ Firestore del cliente inicializado correctamente");
      } else {
        console.warn("⚠️ No hay credenciales firebase_cliente guardadas");
      }
    } catch (error) {
      console.error("❌ Error inicializando Firebase del cliente:", error.message);
      this.showError("Error al conectar con los datos: " + error.message);
      return;
    }
    
    // Mostrar panel del cliente
    this.showClientPanel();
    
    // Cargar datos del cliente
    setTimeout(() => {
      if (window.clientDashboard) {
        console.log("📊 Inicializando dashboard...");
        window.clientDashboard.init();
      }
    }, 500);
  }

  showClientPanel() {
    console.log("🎨 Mostrando panel del cliente...");
    const app = document.getElementById('app');
    
    app.innerHTML = `
      <!-- Navbar -->
      <div class="client-navbar">
        <div class="container-fluid">
          <div class="d-flex justify-content-between align-items-center">
            <h4>
              <i class="bi bi-building"></i> ${this.clientData.nombre}
            </h4>
            <div class="d-flex align-items-center gap-3">
              <span style="font-size: 14px;" id="userEmail">${sessionStorage.getItem('email_acceso') || 'Usuario'}</span>
              <button class="btn btn-light btn-sm" onclick="clientAuth.logout()">
                <i class="bi bi-box-arrow-right"></i> Salir
              </button>
            </div>
          </div>
        </div>
      </div>

      <!-- Content Area -->
      <div class="container-fluid">
        <div class="row">
          <!-- Sidebar -->
          <nav class="col-md-2 client-sidebar">
            <ul class="nav flex-column">
              <li class="nav-item">
                <a class="nav-link active" href="#" data-page="dashboard">
                  <i class="bi bi-speedometer2"></i> Dashboard
                </a>
              </li>
              <li class="nav-item">
                <a class="nav-link" href="#" data-page="datos">
                  <i class="bi bi-database"></i> Mis Datos
                </a>
              </li>
              <li class="nav-item">
                <a class="nav-link" href="#" data-page="cargar">
                  <i class="bi bi-cloud-upload"></i> Cargar Datos
                </a>
              </li>
              <li class="nav-item">
                <a class="nav-link" href="#" data-page="mapa">
                  <i class="bi bi-map"></i> Mapa
                </a>
              </li>
              <li class="nav-item">
                <a class="nav-link" href="#" data-page="facturacion">
                  <i class="bi bi-receipt"></i> Facturación
                </a>
              </li>
              <hr>
              <li class="nav-item">
                <a class="nav-link" href="#" data-page="api">
                  <i class="bi bi-code-square"></i> API Key
                </a>
              </li>
            </ul>
          </nav>

          <!-- Main Content -->
          <main class="col-md-10 client-content" id="clientContent">
            <!-- Contenido dinámico aquí -->
          </main>
        </div>
      </div>
    `;

    // Adjuntar eventos de navegación
    this.attachSidebarEvents();
    
    // Mostrar dashboard por defecto
    clientDashboard.clientData = this.clientData;
    clientDashboard.clientDb = this.clientDb;  // ✅ Pasar instancia de Firestore del CLIENTE
    clientDashboard.showPage('dashboard');
  }

  attachSidebarEvents() {
    const links = document.querySelectorAll('.client-sidebar .nav-link');
    links.forEach(link => {
      link.addEventListener('click', (e) => {
        e.preventDefault();
        
        // Actualizar active
        document.querySelectorAll('.client-sidebar .nav-link').forEach(l => {
          l.classList.remove('active');
        });
        link.classList.add('active');
        
        // Navegar
        const page = link.getAttribute('data-page');
        console.log("📄 Navegando a:", page);
        clientDashboard.showPage(page);
      });
    });
  }

  async logout() {
    try {
      console.log("👋 Cerrando sesión...");
      
      // Limpiar datos
      this.user = null;
      this.clientData = null;
      this.clientFirebaseApp = null;
      this.clientAuth = null;
      this.clientDb = null;
      this.isAccessDenied = false;
      
      // Limpiar almacenamiento local y sesión
      localStorage.clear();
      sessionStorage.clear();
      
      console.log("✅ Sesión cerrada completamente");
      
      // Recargar página después de un pequeño delay
      setTimeout(() => {
        window.location.href = window.location.pathname;
      }, 300);
      
    } catch (error) {
      console.error("❌ Error al cerrar sesión:", error);
      // Forzar reload incluso si hay error
      setTimeout(() => {
        window.location.href = window.location.pathname;
      }, 500);
    }
  }

  showError(message) {
    console.error("❌", message);
    
    // Determinar si es un error de acceso denegado o de login
    const esErrorAcceso = message.includes("suspendido") || 
                          message.includes("venció") || 
                          message.includes("expirado") ||
                          message.includes("No hay suscripción") ||
                          message.includes("suscripción está");
    
    if (esErrorAcceso) {
      // Pantalla profesional de acceso denegado
      const app = document.getElementById('app');
      app.innerHTML = `
        <div style="width: 100%; height: 100vh; display: flex; align-items: center; justify-content: center; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);">
          <div style="background: white; border-radius: 8px; box-shadow: 0 10px 40px rgba(0, 0, 0, 0.2); border-left: 5px solid #dc3545; width: 100%; max-width: 500px; padding: 40px; text-align: center;">
            <div style="font-size: 60px; color: #dc3545; margin-bottom: 20px;">
              <i class="bi bi-lock-fill"></i>
            </div>
            <h2 style="color: #dc3545; font-weight: 700; margin-bottom: 20px; font-size: 24px;">Acceso Denegado</h2>
            <p style="color: #666; margin-bottom: 20px; font-size: 16px;">${message}</p>
            <p style="color: #999; margin-bottom: 30px; font-size: 14px;">
              Si consideras que esto es un error, por favor contacta al equipo administrativo.
            </p>
            <div style="display: flex; gap: 10px; justify-content: center;">
              <button onclick="location.reload()" style="padding: 10px 20px; background: white; color: #667eea; border: 1px solid #667eea; border-radius: 6px; cursor: pointer; font-weight: 600;">
                <i class="bi bi-arrow-clockwise"></i> Reintentar
              </button>
              <button onclick="clientAuth.logout(); return false;" style="padding: 10px 20px; background: #dc3545; color: white; border: none; border-radius: 6px; cursor: pointer; font-weight: 600;">
                <i class="bi bi-box-arrow-left"></i> Salir
              </button>
            </div>
          </div>
        </div>
      `;
    } else {
      // Error de login en el formulario
      const alertDiv = document.getElementById('loginAlert');
      if (alertDiv) {
        alertDiv.innerHTML = `
          <div style="background: #f8d7da; color: #721c24; border: 1px solid #f5c6cb; border-radius: 6px; padding: 12px; margin-bottom: 15px;">
            <i class="bi bi-exclamation-circle"></i> ${message}
          </div>
        `;
      }
    }
  }

  // Inicializar interface del cliente
  async initClientMap() {
    console.log('🎨 Inicializando interfaz del cliente...');
    
    try {
      // Mostrar el panel normal del cliente (no un mapa)
      this.showClientPanel();
      
      console.log('✅ Panel del cliente inicializado');
      
      // ✅ AGREGAR LISTENER EN TIEMPO REAL para cambios de estado
      this.setupStateChangeListener();
      
    } catch (err) {
      console.error('❌ Error al inicializar:', err);
      this.showError('Error al cargar: ' + err.message);
    }
  }

  // Listener en tiempo real para cambios de estado del cliente
  setupStateChangeListener() {
    try {
      const clienteId = this.clientData.id;
      const db = firebase.firestore();
      
      console.log(`👁️ Escuchando cambios en estado del cliente ${clienteId}...`);
      
      // Desuscribir anterior si existe
      if (this.unsubscribeStateListener) {
        this.unsubscribeStateListener();
      }
      
      // Setup nuevo listener
      this.unsubscribeStateListener = db
        .collection('clientes')
        .doc(clienteId)
        .onSnapshot((doc) => {
          if (!doc.exists) {
            console.error('❌ Cliente no encontrado en Firestore');
            return;
          }
          
          const clienteData = doc.data();
          console.log(`📊 Estado actualizado: ${clienteData.estado}`);
          
          // Verificar si hubo cambio de estado a una condición negativa
          if (clienteData.estado !== 'activo') {
            let motivo = "";
            switch(clienteData.estado) {
              case 'suspendido':
                motivo = "Su acceso ha sido suspendido por el administrador";
                break;
              case 'inactivo':
                motivo = "Su cuenta no está activa";
                break;
              default:
                motivo = `Estado: ${clienteData.estado}`;
            }
            
            console.warn(`⚠️ Estado cambió a ${clienteData.estado}. Mostrando error...`);
            this.isAccessDenied = true;  // Marcar como acceso denegado
            this.showError(motivo);
            
            // NO hacer logout automático para evitar ciclo infinito
            // Solo mostrar error y esperar a que usuario haga click en "Salir"
          } else {
            console.log('✅ Estado verificado: activo');
            this.isAccessDenied = false;  // Limpiar flag si vuelve a activo
          }
        }, (error) => {
          console.error('❌ Error en listener de estado:', error);
        });
      
    } catch (err) {
      console.error('❌ Error setupeando listener:', err);
    }
  }

  getErrorMessage(code) {
    const messages = {
      'auth/user-not-found': 'Usuario no encontrado',
      'auth/wrong-password': 'Contraseña incorrecta',
      'auth/invalid-email': 'Email inválido',
      'auth/user-disabled': 'Usuario deshabilitado',
      'auth/too-many-requests': 'Demasiados intentos. Intenta más tarde.'
    };
    return messages[code] || 'Error de autenticación: ' + code;
  }
}

// Instancia global
const clientAuth = new ClientAuth();
console.log("✅ ClientAuth loaded");
