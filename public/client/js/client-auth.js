// js/client-auth.js
// Autenticación para clientes (municipios)

class ClientAuth {
  constructor() {
    this.user = null;
    this.clientData = null;
  }

  async init() {
    console.log("🔐 ClientAuth inicializando...");
    
    // Escuchar cambios de autenticación
    firebase.auth().onAuthStateChanged(async (user) => {
      if (user) {
        console.log("✅ Usuario autenticado:", user.email);
        this.user = user;
        
        // Obtener datos del cliente
        try {
          // Obtener token con claims
          const tokenResult = await user.getIdTokenResult();
          const clienteId = tokenResult.claims.cliente_id;
          
          if (!clienteId) {
            console.error("❌ No hay cliente_id en custom claims");
            this.showError("Error de configuración. Contacta al administrador.");
            this.logout();
            return;
          }
          
          console.log("🔑 Cliente ID del token:", clienteId);
          
          // Leer directamente el cliente por su ID
          const clienteDoc = await firebase.firestore().collection('clientes').doc(clienteId).get();
          
          if (clienteDoc.exists) {
            this.clientData = clienteDoc.data();
            this.clientData.id = clienteDoc.id;
            console.log("📋 Datos del cliente:", this.clientData);
            
            // Mostrar dashboard
            this.showClientPanel();
          } else {
            console.error("❌ Cliente no encontrado en Firestore");
            this.showError("Cliente no encontrado. Contacta al administrador.");
            this.logout();
          }
        } catch (error) {
          console.error("❌ Error cargando datos del cliente:", error);
          this.showError("Error al cargar datos: " + error.message);
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
      console.log("🔐 Intentando login:", email);
      await firebase.auth().signInWithEmailAndPassword(email, password);
      console.log("✅ Login exitoso");
    } catch (error) {
      console.error("❌ Error de login:", error);
      this.showError(this.getErrorMessage(error.code));
    }
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
      await firebase.auth().signOut();
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
