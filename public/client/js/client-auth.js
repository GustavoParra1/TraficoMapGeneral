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
  }

  async init() {
    console.log("🔐 ClientAuth inicializando...");
    
    // ✅ PASO 1: Escuchar autenticación contra Firebase GENERAL
    firebase.auth().onAuthStateChanged(async (user) => {
      if (user) {
        console.log("✅ Usuario autenticado en Firebase General:", user.email);
        this.user = user;
        
        try {
          // ✅ PASO 2: Obtener credenciales de Firebase del cliente
          console.log("📡 Solicitando credenciales del cliente...");
          const getConfigFn = firebase.functions().httpsCallable('getClientFirebaseConfig');
          const response = await getConfigFn({});
          
          if (!response.data.success) {
            throw new Error("No se pudieron obtener credenciales");
          }
          
          const { firebaseConfig, clienteId, nombre, suscripcion } = response.data;
          
          console.log(`✅ Credenciales recibidas para: ${nombre} (${clienteId})`);
          
          // ✅ PASO 3: Instanciar Firebase del CLIENTE dinámicamente
          console.log("🔧 Instanciando Firebase del cliente...");
          
          // Si ya existe una app, eliminarla
          if (this.clientFirebaseApp) {
            firebase.app(this.clientFirebaseApp.name).delete();
          }
          
          // Crear instancia nueva de Firebase con credenciales del cliente
          this.clientFirebaseApp = firebase.initializeApp(firebaseConfig, `client-${clienteId}`);
          this.clientAuth = this.clientFirebaseApp.auth();
          this.clientDb = this.clientFirebaseApp.firestore();
          
          console.log("✅ Firebase del cliente instanciado");
          
          // ✅ PASO 4: Guardar datos del cliente
          this.clientData = {
            id: clienteId,
            nombre: nombre,
            plan: suscripcion.plan,
            estado: suscripcion.estado
          };
          
          // ✅ Verificar que suscripción esté activa
          if (suscripcion.estado !== 'activo') {
            throw new Error(`Suscripción ${suscripcion.estado}. Contacta administración.`);
          }
          
          console.log("📋 Datos del cliente:", this.clientData);
          
          // ✅ Mostrar panel del cliente
          this.showClientPanel();
          
        } catch (error) {
          console.error("❌ Error obteniendo credenciales:", error);
          this.showError(`Error: ${error.message}`);
          this.logout();
        }
      } else {
        console.log("👤 Usuario NO autenticado");
        this.user = null;
        this.clientData = null;
        this.showLoginForm();
      }
    });
  }

  showLoginForm() {
    console.log("🎨 Mostrando formulario de login...");
    const app = document.getElementById('app');
    app.innerHTML = `
      <div class="login-container">
        <div class="login-card">
          <h1><i class="bi bi-map"></i> TraficoMap</h1>
          <p class="text-muted">Panel del Cliente</p>
          
          <form id="loginForm">
            <div class="mb-3">
              <label class="form-label">Email</label>
              <input type="email" class="form-control" id="loginEmail" placeholder="admin@municipio.gov.ar" required>
            </div>
            
            <div class="mb-3">
              <label class="form-label">Contraseña</label>
              <input type="password" class="form-control" id="loginPassword" placeholder="Contraseña" required>
            </div>
            
            <button type="submit" class="btn btn-login mb-3">
              <i class="bi bi-box-arrow-in-right"></i> Iniciar Sesión
            </button>
          </form>
          
          <div id="loginAlert"></div>
          
          <hr>
          <small class="text-muted">
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
      console.log("🔐 Intentando login en Firebase General:", email);
      // Autenticar contra Firebase GENERAL (trafico-map-general-v2)
      await firebase.auth().signInWithEmailAndPassword(email, password);
      console.log("✅ Login exitoso en Firebase General");
      // El onAuthStateChanged lo maneja automáticamente
    } catch (error) {
      console.error("❌ Error de login:", error);
      this.showError(this.getErrorMessage(error.code));
    }
  }

  showLoginForm() {
    console.log("🎨 Mostrando formulario de login...");
    const app = document.getElementById('app');
    app.innerHTML = `
      <div class="login-container">
        <div class="login-card">
          <h1><i class="bi bi-map"></i> TraficoMap</h1>
          <p class="text-muted">Panel del Cliente</p>
          
          <form id="loginForm">
            <div class="mb-3">
              <label class="form-label">Email</label>
              <input type="email" class="form-control" id="loginEmail" placeholder="admin@municipio.gov.ar" required>
            </div>
            
            <div class="mb-3">
              <label class="form-label">Contraseña</label>
              <input type="password" class="form-control" id="loginPassword" placeholder="Contraseña" required>
            </div>
            
            <button type="submit" class="btn btn-login mb-3">
              <i class="bi bi-box-arrow-in-right"></i> Iniciar Sesión
            </button>
          </form>
          
          <div id="loginAlert"></div>
          
          <hr>
          <small class="text-muted">
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
              <span style="font-size: 14px;" id="userEmail">${this.user.email}</span>
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
      
      // Cerrar sesión de Firebase General
      await firebase.auth().signOut();
      
      // Limpiar datos
      this.user = null;
      this.clientData = null;
      this.clientFirebaseApp = null;
      this.clientAuth = null;
      this.clientDb = null;
      
      console.log("✅ Sesión cerrada");
    } catch (error) {
      console.error("❌ Error al cerrar sesión:", error);
      this.showError("Error al cerrar sesión");
    }
  }

  showError(message) {
    console.error("❌", message);
    const alertDiv = document.getElementById('loginAlert');
    if (alertDiv) {
      alertDiv.innerHTML = `
        <div class="alert alert-danger alert-dismissible fade show" role="alert">
          <i class="bi bi-exclamation-circle"></i> ${message}
          <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
        </div>
      `;
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
