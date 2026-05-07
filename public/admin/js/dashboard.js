// js/dashboard.js
// Lógica del Dashboard Admin

class Dashboard {
  constructor() {
    this.clientesData = [];
    this.subscripcionesData = [];
    this.billingData = [];
    this.currentPage = 'dashboard';
  }

  async init() {
    console.log("Initializing Dashboard...");
    console.log("📊 Loading clientes...");
    await this.loadClienteCount();
    console.log("📊 Loading subscripciones...");
    await this.loadSubscripciones();
    console.log("📊 Loading billing...");
    await this.loadBillingData();
    console.log("🎨 Llamando render()...");
    this.render();
    console.log("✅ Init completado");
    
    // IMPORTANTE: Escuchar cambios de hash
    console.log("🔗 Agregando listener para hashchange...");
    window.addEventListener('hashchange', () => {
      const hash = window.location.hash.slice(1); // Quitar el #
      console.log("🔗 HASH CAMBIÓ A:", hash);
      if (hash) {
        this.showPage(hash);
      }
    });
    console.log("✅ Listener de hashchange agregado");
  }

  async loadClienteCount() {
    try {
      // showLoading("metricas"); // Removido - el elemento no existe en el DOM
      const snapshot = await db.collection("clientes").get();
      this.clientesData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      console.log("Clientes loaded:", this.clientesData.length);
    } catch (error) {
      console.error("Error loading clientes:", error);
      adminAuth.showError("Error al cargar clientes");
    }
  }

  async loadSubscripciones() {
    try {
      const snapshot = await db.collection("subscripciones").get();
      this.subscripcionesData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      console.log("Subscripciones loaded:", this.subscripcionesData.length);
    } catch (error) {
      console.error("Error loading subscripciones:", error);
    }
  }

  async loadBillingData() {
    try {
      const snapshot = await db.collection("billing").get();
      this.billingData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      console.log("Billing data loaded:", this.billingData.length);
    } catch (error) {
      console.error("Error loading billing data:", error);
    }
  }

  render() {
    console.log("🎨 RENDER comenzando...");
    const app = document.getElementById("app");
    app.innerHTML = this.getHTML();
    console.log("🎨 HTML renderizado");
    hideLoading();
    console.log("🎨 Adjuntando eventos...");
    this.attachEvents();
    this.attachSidebarLinks(); // Agregar listeners a los links del sidebar
    console.log("✅ Render completado");
  }

  // Adjuntar listeners a los links del sidebar
  attachSidebarLinks() {
    console.log("🔗 Adjuntando listeners a sidebar links...");
    const links = document.querySelectorAll('a[href^="#"]');
    console.log("🔗 Encontrados", links.length, "links con href^='#'");
    
    links.forEach((link, index) => {
      const href = link.getAttribute('href');
      console.log(`🔗 Link ${index}:`, href);
      
      link.addEventListener('click', (e) => {
        const clickedHref = e.currentTarget.getAttribute('href');
        console.log("👆 CLICK en link:", clickedHref);
        e.preventDefault();
        
        const page = clickedHref.slice(1); // Quitar #
        console.log("👆 Navegando a página:", page);
        
        window.location.hash = page;
        this.showPage(page);
        
        console.log("👆 showPage completado");
      });
    });
    
    console.log("✅ Listeners de sidebar adjuntados");
  }

  getHTML() {
    const totalClientes = this.clientesData.length;
    const activeClientes = this.clientesData.filter(c => c.estado === "activo").length;
    const totalIngresos = this.getMonthlyRevenue();
    const proximosAVencer = this.getExpiringSubscriptions();

    return `
      <nav class="navbar navbar-expand-lg navbar-dark navbar-admin">
        <div class="container-fluid">
          <a class="navbar-brand" href="/">
            <i class="bi bi-speedometer2"></i> Admin Panel
          </a>
          <button class="navbar-toggler" type="button" data-bs-toggle="collapse" data-bs-target="#navbarNav">
            <span class="navbar-toggler-icon"></span>
          </button>
          <div class="collapse navbar-collapse ms-auto" id="navbarNav">
            <div class="ms-auto d-flex align-items-center">
              <span class="text-white me-3">${adminAuth.user?.email}</span>
              <button class="btn btn-light btn-sm" onclick="logoutAdmin()">Logout</button>
            </div>
          </div>
        </div>
      </nav>

      <div class="container-fluid">
        <div class="row">
          <!-- Sidebar -->
          <nav class="col-md-2 sidebar">
            <ul class="nav flex-column">
              <li class="nav-item">
                <a class="nav-link active" href="#dashboard">
                  <i class="bi bi-speedometer2"></i> Dashboard
                </a>
              </li>
              <li class="nav-item">
                <a class="nav-link" href="#clientes">
                  <i class="bi bi-people"></i> Clientes
                </a>
              </li>
              <li class="nav-item">
                <a class="nav-link" href="#subscripciones">
                  <i class="bi bi-credit-card"></i> Suscripciones
                </a>
              </li>
              <li class="nav-item">
                <a class="nav-link" href="#billing">
                  <i class="bi bi-file-earmark-text"></i> Billing
                </a>
              </li>
              <li class="nav-item">
                <a class="nav-link" href="#usuarios">
                  <i class="bi bi-shield-lock"></i> Usuarios Admin
                </a>
              </li>
              <hr>
              <li class="nav-item">
                <a class="nav-link" href="#documentacion" target="_blank">
                  <i class="bi bi-book"></i> Documentación
                </a>
              </li>
            </ul>
          </nav>

          <!-- Main Content -->
          <main class="col-md-10 main-content p-4">
            
            <!-- Page Title -->
            <div class="d-flex justify-content-between align-items-center mb-4">
              <div>
                <h2 class="fw-bold mb-0">Dashboard</h2>
                <p class="text-muted small">Bienvenido, ${adminAuth.user?.email.split("@")[0]}</p>
              </div>
              <button class="btn btn-primary" data-bs-toggle="modal" data-bs-target="#crearClienteModal">
                <i class="bi bi-plus-circle"></i> Crear Cliente
              </button>
            </div>

            <!-- Metrics -->
            <div class="row mb-4" id="metricas">
              ${createMetricCard("Total Clientes", formatNumber(totalClientes), `${activeClientes} activos`, "primary")}
              ${createMetricCard("Clientes Activos", activeClientes, "En plan activo", "success")}
              ${createMetricCard("Ingresos mes", formatCurrency(totalIngresos), "MES ACTUAL", "warning")}
              ${createMetricCard("Próximos a vencer", proximosAVencer, "en los próximos 30 días", "danger")}
            </div>

            <!-- Clientes Próximos a Vencer -->
            <div class="card mb-4">
              <div class="card-header">
                <h5 class="mb-0">Suscripciones Próximas a Vencer</h5>
              </div>
              <div class="card-body">
                ${this.getExpiringTable()}
              </div>
            </div>

            <!-- Últimos Clientes Creados -->
            <div class="row">
              <div class="col-md-6 mb-4">
                <div class="card">
                  <div class="card-header">
                    <h5 class="mb-0">Últimos Clientes</h5>
                  </div>
                  <div class="card-body">
                    ${this.getLatestClientesTable()}
                  </div>
                </div>
              </div>

              <!-- Ingresos por Plan -->
              <div class="col-md-6 mb-4">
                <div class="card">
                  <div class="card-header">
                    <h5 class="mb-0">Clientes por Plan</h5>
                  </div>
                  <div class="card-body">
                    <div class="chart-container">
                      <canvas id="planChart"></canvas>
                    </div>
                  </div>
                </div>
              </div>
            </div>

          </main>
        </div>
      </div>

      <!-- Modal: Crear Cliente -->
      <div class="modal fade" id="crearClienteModal" tabindex="-1">
        <div class="modal-dialog">
          <div class="modal-content">
            <div class="modal-header">
              <h5 class="modal-title">Crear Nuevo Cliente</h5>
              <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
            </div>
            <div class="modal-body">
              <form id="crearClienteForm">
                <div class="mb-3">
                  <label class="form-label">Municipio</label>
                  <input type="text" class="form-control" id="municipio" placeholder="La Plata" required>
                </div>
                <div class="mb-3">
                  <label class="form-label">Email Admin</label>
                  <input type="email" class="form-control" id="emailAdmin" placeholder="admin@example.com" required>
                </div>
                <div class="mb-3">
                  <label class="form-label">Dominio</label>
                  <input type="text" class="form-control" id="dominio" placeholder="laplatamaps.com.ar" required>
                </div>
                <div class="mb-3">
                  <label class="form-label">Plan</label>
                  <select class="form-select" id="plan" required>
                    <option value="basico">Basico</option>
                    <option value="profesional" selected>Profesional</option>
                    <option value="enterprise">Enterprise</option>
                  </select>
                </div>
              </form>
            </div>
            <div class="modal-footer">
              <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Cancelar</button>
              <button type="button" class="btn btn-primary" id="submitCrearCliente">Crear</button>
            </div>
          </div>
        </div>
      </div>
    `;
  }

  getLatestClientesTable() {
    const latest = this.clientesData.slice(-5).reverse();
    if (latest.length === 0) {
      return "<p class='text-muted'>No hay clientes aún</p>";
    }

    const rows = latest.map(c => [
      c.nombre,
      c.plan,
      getStatusBadge(c.estado),
      formatDate(c.creado_en)
    ]);

    return createTable(["Municipio", "Plan", "Estado", "Creado"], rows);
  }

  getExpiringTable() {
    const expiring = this.subscripcionesData
      .filter(s => {
        const dias = moment(s.fecha_expiracion).diff(moment(), "days");
        return dias > 0 && dias <= 30;
      })
      .sort((a, b) => moment(a.fecha_expiracion).diff(moment(b.fecha_expiracion)));

    if (expiring.length === 0) {
      return "<p class='text-muted'>No hay suscripciones próximas a vencer</p>";
    }

    const rows = expiring.map(s => {
      const dias = moment(s.fecha_expiracion).diff(moment(), "days");
      return [
        s.cliente_id,
        capitalize(s.plan),
        formatDate(s.fecha_expiracion),
        `<span class="badge bg-warning">${dias} días</span>`,
        '<button class="btn btn-sm btn-primary" onclick="renovarSuscripcion(\''+s.cliente_id+'\')">Renovar</button>'
      ];
    });

    return createTable(["Cliente", "Plan", "Vencimiento", "Días", "Acción"], rows);
  }

  getMonthlyRevenue() {
    const currentMonth = moment().format("YYYY-MM");
    return this.billingData
      .filter(b => b.periodo === currentMonth && b.estado === "facturado")
      .reduce((total, b) => total + (b.precio || 0), 0);
  }

  getExpiringSubscriptions() {
    const now = moment();
    const thirtyDaysLater = moment().add(30, "days");
    return this.subscripcionesData.filter(s => {
      const fecha = moment(s.fecha_expiracion);
      return fecha.isBetween(now, thirtyDaysLater);
    }).length;
  }

  attachEvents() {
    document.getElementById("submitCrearCliente").addEventListener("click", () => {
      this.handleCrearCliente();
    });

    // Renderizar gráfico
    this.renderPlanChart();
  }

  async handleCrearCliente() {
    const municipio = document.getElementById("municipio").value;
    const email = document.getElementById("emailAdmin").value;
    const dominio = document.getElementById("dominio").value;
    const plan = document.getElementById("plan").value;

    if (!municipio || !email || !dominio) {
      adminAuth.showError("Completa todos los campos");
      return;
    }

    if (!isValidEmail(email)) {
      adminAuth.showError("Email inválido");
      return;
    }

    try {
      // Aquí iría la lógica de crear cliente
      // Por ahora, solo mostramos un mensaje
      adminAuth.showSuccess("Cliente creado exitosamente. Próximo paso: ejecutar crear-cliente.ps1");
      bootstrap.Modal.getInstance(document.getElementById("crearClienteModal")).hide();
    } catch (error) {
      adminAuth.showError("Error: " + error.message);
    }
  }

  renderPlanChart() {
    const ctx = document.getElementById("planChart");
    if (!ctx) return;

    const plans = ["basico", "profesional", "enterprise"];
    const countByPlan = plans.map(plan => 
      this.clientesData.filter(c => c.plan === plan).length
    );

    new Chart(ctx, {
      type: "doughnut",
      data: {
        labels: plans.map(capitalize),
        datasets: [{
          data: countByPlan,
          backgroundColor: ["#667eea", "#764ba2", "#ed8936"]
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            position: "bottom"
          }
        }
      }
    });
  }

  // Ya no necesitamos attachSidebarEvents - usamos hashchange listener en init()
  attachSidebarEvents() {
    // No-op - el hashchange listener en init() se encarga de la navegación
  }

  // Actualizar clase active en sidebar (helper)
  updateSidebarActive(page) {
    const links = document.querySelectorAll('a[href*="#"]');
    links.forEach(l => l.classList.remove('active'));
    const activeLink = document.querySelector(`a[href="#${page}"]`);
    if (activeLink) activeLink.classList.add('active');
  }

  // Mostrar página según el nombre
  showPage(page) {
    console.log("📄 showPage() - MOSTRANDO PÁGINA:", page);
    
    try {
      // Actualizar active en sidebar
      const links = document.querySelectorAll('a[href*="#"]');
      links.forEach(l => {
        l.classList.remove('active');
        if (l.getAttribute('href') === `#${page}`) {
          l.classList.add('active');
        }
      });
    } catch (e) {
      console.log("No se pudo actualizar sidebar active");
    }
    
    const mainContent = document.querySelector('.main-content');
    if (!mainContent) {
      console.error("❌ NO SE ENCONTRÓ .main-content!");
      return;
    }
    
    switch(page) {
      case 'clientes':
        console.log("📄 Renderizando CLIENTES...");
        mainContent.innerHTML = this.getClientesPageHTML();
        this.attachClientesPageEvents();
        console.log("✅ Clientes renderizados");
        break;
        
      case 'subscripciones':
        console.log("📄 Renderizando SUBSCRIPCIONES...");
        mainContent.innerHTML = this.getSubscripcionesPageHTML();
        this.attachSubscripcionesPageEvents();
        console.log("✅ Subscripciones renderizadas");
        break;
        
      case 'billing':
        console.log("📄 Renderizando BILLING...");
        mainContent.innerHTML = this.getBillingPageHTML();
        this.attachBillingPageEvents();
        console.log("✅ Billing renderizado");
        break;
        
      case 'usuarios':
        console.log("📄 Renderizando USUARIOS...");
        mainContent.innerHTML = this.getUsuariosPageHTML();
        this.attachUsuariosPageEvents();
        console.log("✅ Usuarios renderizados");
        break;
        
      case 'dashboard':
      default:
        console.log("📄 Renderizando DASHBOARD...");
        this.render();
        console.log("✅ Dashboard renderizado");
        break;
    }
  }

  // HTML para página de clientes
  getClientesPageHTML() {
    return `
      <div class="container-fluid p-4">
        <div class="d-flex justify-content-between align-items-center mb-4">
          <h2>Gestión de Clientes</h2>
          <button class="btn btn-primary" id="btnCrearCliente">
            <i class="bi bi-plus-circle"></i> Crear Cliente
          </button>
        </div>
        
        <div class="card">
          <div class="card-header bg-light">
            <h5 class="mb-0"><i class="bi bi-table"></i> Listado de Clientes</h5>
          </div>
          <div class="card-body">
            <div id="clientesTable">
              <p class="text-muted">Cargando clientes...</p>
            </div>
          </div>
        </div>
      </div>

      <!-- Modal: Crear Cliente -->
      <div class="modal fade" id="modalCrearCliente" tabindex="-1">
        <div class="modal-dialog modal-lg">
          <div class="modal-content">
            <div class="modal-header bg-primary text-white">
              <h5 class="modal-title"><i class="bi bi-plus-circle"></i> Crear Nuevo Cliente</h5>
              <button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal"></button>
            </div>
            <form id="formCrearCliente">
              <div class="modal-body">
                <div class="mb-3">
                  <label class="form-label">Municipio *</label>
                  <input type="text" class="form-control" id="nombreCliente" placeholder="Ej: Municipalidad de La Plata" required>
                </div>
                <div class="mb-3">
                  <label class="form-label">Email Admin *</label>
                  <input type="email" class="form-control" id="emailCliente" placeholder="admin@municipio.gov.ar" required>
                </div>
                <div class="mb-3">
                  <label class="form-label">Dominio</label>
                  <input type="text" class="form-control" id="dominioCliente" placeholder="laplatamaps.com.ar">
                </div>
                <div class="mb-3">
                  <label class="form-label">Plan *</label>
                  <select class="form-select" id="planCliente" required>
                    <option value="">-- Seleccionar plan --</option>
                    <option value="basico">Básico ($1.000/mes)</option>
                    <option value="profesional">Profesional ($5.000/mes)</option>
                    <option value="enterprise">Enterprise (Personalizado)</option>
                  </select>
                </div>
              </div>
              <div class="modal-footer">
                <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Cancelar</button>
                <button type="submit" class="btn btn-primary"><i class="bi bi-check-circle"></i> Crear Cliente</button>
              </div>
            </form>
          </div>
        </div>
      </div>
    `;
  }

  // Eventos de la página de clientes
  attachClientesPageEvents() {
    // Inicializar ClientesManager
    clientesManager.init();
    
    const btnCrear = document.getElementById('btnCrearCliente');
    if (btnCrear) {
      btnCrear.addEventListener('click', () => {
        const modal = new bootstrap.Modal(document.getElementById('modalCrearCliente'));
        modal.show();
      });
    }

    const formCrear = document.getElementById('formCrearCliente');
    if (formCrear) {
      formCrear.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const nombre = document.getElementById('nombreCliente').value;
        const email = document.getElementById('emailCliente').value;
        const plan = document.getElementById('planCliente').value;
        const dominio = document.getElementById('dominioCliente').value || '';

        try {
          // Llamar al manager
          if (typeof clientesManager !== 'undefined') {
            await clientesManager.createCliente({ nombre, email, plan, dominio });
            formCrear.reset();
            bootstrap.Modal.getInstance(document.getElementById('modalCrearCliente')).hide();
            adminAuth.showSuccess('Cliente creado exitosamente');
          }
        } catch (error) {
          adminAuth.showError('Error: ' + error.message);
        }
      });
    }
  }

  // ===== PÁGINA: SUBSCRIPCIONES =====
  getSubscripcionesPageHTML() {
    return `
      <div class="container-fluid p-4">
        <div class="d-flex justify-content-between align-items-center mb-4">
          <h2>Gestión de Suscripciones</h2>
          <button class="btn btn-primary" id="btnRenovarSuscripcion">
            <i class="bi bi-arrow-clockwise"></i> Renovar Plan
          </button>
        </div>
        
        <div class="card">
          <div class="card-header bg-light">
            <h5 class="mb-0"><i class="bi bi-calendar-check"></i> Suscripciones Activas</h5>
          </div>
          <div class="card-body">
            <div id="subscripcionesTableContainer" class="table-responsive">
              <p class="text-muted">Cargando suscripciones...</p>
            </div>
          </div>
        </div>
      </div>
    `;
  }

  attachSubscripcionesPageEvents() {
    // Renderizar tabla
    const container = document.getElementById('subscripcionesTableContainer');
    if (this.subscripcionesData.length === 0) {
      container.innerHTML = '<p class="text-muted">No hay suscripciones activas</p>';
    } else {
      const rows = this.subscripcionesData.map((s, idx) => {
        const diasRestantes = moment(s.fecha_expiracion).diff(moment(), 'days');
        const estadoBadge = diasRestantes > 30 ? 'bg-success' : diasRestantes > 7 ? 'bg-warning' : 'bg-danger';
        return `
          <tr>
            <td>#${idx + 1}</td>
            <td>${capitalize(s.plan)}</td>
            <td>${formatCurrency(s.precio_mensual)}</td>
            <td>${formatDate(s.fecha_expiracion)}</td>
            <td><span class="badge ${estadoBadge}">${diasRestantes} días</span></td>
            <td>
              <button class="btn btn-sm btn-primary" onclick="alert('Renovación en desarrollo')">
                <i class="bi bi-pencil"></i>
              </button>
            </td>
          </tr>
        `;
      }).join('');

      container.innerHTML = `
        <table class="table table-hover">
          <thead class="table-light">
            <tr>
              <th>ID</th>
              <th>Plan</th>
              <th>Precio/mes</th>
              <th>Fecha Expiración</th>
              <th>Restante</th>
              <th>Acciones</th>
            </tr>
          </thead>
          <tbody>
            ${rows}
          </tbody>
        </table>
      `;
    }
  }

  // ===== PÁGINA: BILLING =====
  getBillingPageHTML() {
    return `
      <div class="container-fluid p-4">
        <div class="d-flex justify-content-between align-items-center mb-4">
          <h2>Facturación</h2>
          <button class="btn btn-primary" id="btnGenerarFactura">
            <i class="bi bi-file-pdf"></i> Generar Factura
          </button>
        </div>
        
        <div class="card">
          <div class="card-header bg-light">
            <h5 class="mb-0"><i class="bi bi-file-earmark-text"></i> Historial de Facturas</h5>
          </div>
          <div class="card-body">
            <div id="billingTableContainer" class="table-responsive">
              <p class="text-muted">Cargando facturas...</p>
            </div>
          </div>
        </div>
      </div>
    `;
  }

  attachBillingPageEvents() {
    // Renderizar tabla
    const container = document.getElementById('billingTableContainer');
    if (this.billingData.length === 0) {
      container.innerHTML = '<p class="text-muted">No hay facturas registradas</p>';
    } else {
      const rows = this.billingData.map((b, idx) => {
        const estadoBadge = b.pagado ? 'bg-success' : 'bg-warning';
        return `
          <tr>
            <td>#${idx + 1}</td>
            <td>${b.periodo}</td>
            <td>${formatCurrency(b.monto)}</td>
            <td><span class="badge ${estadoBadge}">${b.pagado ? 'Pagado' : 'Pendiente'}</span></td>
            <td>${formatDate(b.fecha_emision)}</td>
            <td>
              <button class="btn btn-sm btn-info" onclick="alert('Descarga en desarrollo')">
                <i class="bi bi-download"></i>
              </button>
            </td>
          </tr>
        `;
      }).join('');

      container.innerHTML = `
        <table class="table table-hover">
          <thead class="table-light">
            <tr>
              <th>ID</th>
              <th>Período</th>
              <th>Monto</th>
              <th>Estado</th>
              <th>Emitida</th>
              <th>Acciones</th>
            </tr>
          </thead>
          <tbody>
            ${rows}
          </tbody>
        </table>
      `;
    }
  }

  // ===== PÁGINA: USUARIOS =====
  getUsuariosPageHTML() {
    return `
      <div class="container-fluid p-4">
        <div class="d-flex justify-content-between align-items-center mb-4">
          <h2>Usuarios Admin</h2>
          <button class="btn btn-primary" id="btnAgregarUsuario">
            <i class="bi bi-person-plus"></i> Agregar Usuario
          </button>
        </div>
        
        <div class="card">
          <div class="card-header bg-light">
            <h5 class="mb-0"><i class="bi bi-shield-lock"></i> Administradores</h5>
          </div>
          <div class="card-body">
            <div id="usuariosTableContainer" class="table-responsive">
              <p class="text-muted">Cargando usuarios...</p>
            </div>
          </div>
        </div>
      </div>
    `;
  }

  attachUsuariosPageEvents() {
    // Tabla con usuario actual
    const container = document.getElementById('usuariosTableContainer');
    const usuario = adminAuth.user?.email || 'admin@trafico-map.com';
    
    container.innerHTML = `
      <table class="table table-hover">
        <thead class="table-light">
          <tr>
            <th>Email</th>
            <th>Rol</th>
            <th>Estado</th>
            <th>Acciones</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>${usuario}</td>
            <td><span class="badge bg-primary">Admin</span></td>
            <td><span class="badge bg-success">Activo</span></td>
            <td>
              <button class="btn btn-sm btn-danger" onclick="alert('Eliminar usuario en desarrollo')">
                <i class="bi bi-trash"></i>
              </button>
            </td>
          </tr>
        </tbody>
      </table>

      <hr>

      <h5>Configurar Acceso de Cliente</h5>
      <div id="setupContainer"></div>
    `;

    // Mostrar formulario de setup
    ClientSetup.showSetupForm();
  }
}

// Instancia global
const dashboard = new Dashboard();
const clientesManager = new ClientesManager();

// Cargar dashboard
function loadDashboard() {
  dashboard.init();
}

// Función para renovar suscripción (placeholder)
function renovarSuscripcion(clienteId) {
  alert("Renovar suscripción para: " + clienteId);
}

console.log("Dashboard loaded");
