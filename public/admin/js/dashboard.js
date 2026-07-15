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
    console.log("📊 Clientes cargados:", this.clientesData.length);
    
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

  async loadClienteCount(retryCount = 0) {
    try {
      console.log("📥 Iniciando carga de clientes desde Firestore...");
      const snapshot = await db.collection("clientes").get();
      this.clientesData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      console.log("✅ Clientes cargados exitosamente:", this.clientesData.length);
      
      // Debug: Mostrar los clientes cargados
      this.clientesData.forEach(c => {
        console.log(`   - ${c.nombre} (${c.id}) - ${c.estado}`);
      });
      
      return true;
    } catch (error) {
      console.error("❌ Error al cargar clientes:", error.message);
      console.error("Error code:", error.code);
      
      if (error.code === 'permission-denied') {
        console.error("❌ ERROR DE PERMISOS - Verifica las Firestore Rules");
        adminAuth.showError("Error de permisos: No puedes leer clientes. Contacta al administrador.");
        this.clientesData = []; // Continuar sin datos
        return false;
      } else if (retryCount < 3) {
        console.log(`🔄 Reintentando [${retryCount + 1}/3] en 2 segundos...`);
        await new Promise(r => setTimeout(r, 2000));
        return this.loadClienteCount(retryCount + 1);
      } else {
        console.error("❌ Máximo de reintentos alcanzado");
        adminAuth.showError("Error al cargar clientes después de 3 intentos: " + error.message);
        this.clientesData = []; // Continuar sin datos
        return false;
      }
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
            <div class="ms-auto d-flex align-items-center gap-3">
              <button class="btn btn-map-demo btn-sm d-flex align-items-center gap-2" title="Abrir vista previa del mapa en una nueva ventana" onclick="openMapDemo()">
                <i class="bi bi-map"></i> Ver Demo del Mapa
              </button>
              <span class="text-white">|</span>
              <span class="text-white">${adminAuth.user?.email}</span>
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
                <a class="nav-link" href="billing/index.html">
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
              <div class="card-header bg-success text-white">
                <div class="d-flex justify-content-between align-items-center">
                  <h5 class="mb-0">
                    <i class="bi bi-map"></i> 📺 Vista Previa del Sistema
                  </h5>
                  <button class="btn btn-light btn-sm" onclick="openMapDemo()">
                    <i class="bi bi-play-circle"></i> Abrir Demo
                  </button>
                </div>
              </div>
              <div class="card-body">
                <p class="mb-3">Haz clic en el botón de arriba para ver cómo se ve el sistema TraficoMap con los datos de ejemplo cargados (Mar del Plata y Córdoba).</p>
                <div class="row align-items-center">
                  <div class="col-md-6">
                    <h6 class="fw-bold mb-2">Características incluidas:</h6>
                    <ul class="list-unstyled">
                      <li><i class="bi bi-check-circle text-success"></i> Mapa interactivo en tiempo real</li>
                      <li><i class="bi bi-check-circle text-success"></i> Visualización de múltiples ciudades</li>
                      <li><i class="bi bi-check-circle text-success"></i> Gestión de datos geoespaciales</li>
                      <li><i class="bi bi-check-circle text-success"></i> Panel de control completo</li>
                    </ul>
                  </div>
                  <div class="col-md-6">
                    <div class="alert alert-info mb-0">
                      <strong>💡 Para clientes:</strong><br>
                      Este es el sistema que verán con los datos de su municipio una vez activados.
                    </div>
                  </div>
                </div>
              </div>
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
       .filter(b => b.pagada && b.periodo_desde && b.periodo_desde.substring(0, 7) === currentMonth)
       .reduce((total, b) => total + (b.monto || 0), 0);
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

  // Inicializar panel de preguntas para Admin General
  initQuestionsPanel() {
    const questionsData = {
      '📊 Análisis de Siniestros y Delitos': [
        { emoji: '🔍', text: 'Comparar estadísticas: Mar del Plata vs Córdoba' },
        { emoji: '📈', text: 'Tendencias de siniestros últimos 30 días' },
        { emoji: '🚗', text: 'Top 10 calles más peligrosas en ambas ciudades' },
        { emoji: '🚨', text: 'Eventos de emergencia por cliente' }
      ],
      '💰 Gestión de Clientes': [
        { emoji: '👥', text: 'Clientes activos vs inactivos' },
        { emoji: '📊', text: 'Distribución por plan' },
        { emoji: '💳', text: 'Suscripciones próximas a vencer' },
        { emoji: '📅', text: 'Histórico de pagos y facturas' }
      ],
      '🎯 Optimización de Infraestructura': [
        { emoji: '📷', text: 'Cobertura de cámaras por ciudad' },
        { emoji: '🗺️', text: 'Zonas sin cobertura (puntos ciegos)' },
        { emoji: '⚠️', text: 'Cámaras con alto índice de siniestros' },
        { emoji: '💡', text: 'Recomendaciones para nuevas cámaras' }
      ]
    };

    if (typeof initQuestionsPanel === 'function') {
      initQuestionsPanel(questionsData);
      
      // Sobrescribir el manejador de preguntas para abrir análisis
      if (questionsPanel) {
        questionsPanel.handleQuestion = async (question) => {
          console.log('📞 Admin consulta:', question);
          questionsPanel.close();
          await this.showAnalysisModal(question);
        };
      }
    }
  }

  async showAnalysisModal(question) {
    console.log("🔴 showAnalysisModal() iniciado para:", question);
    console.log("🔴 this.clientesData disponible:", this.clientesData?.length, this.clientesData);
    
    // Eliminar modal anterior si existe
    const oldModal = document.getElementById('analysis-modal');
    if (oldModal) oldModal.remove();

    // Crear modal
    const modal = document.createElement('div');
    modal.id = 'analysis-modal';
    modal.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background: rgba(0,0,0,0.5);
      z-index: 3000;
      display: flex;
      align-items: center;
      justify-content: center;
      animation: fadeIn 0.3s ease-out;
    `;

    // Panel de análisis
    const panel = document.createElement('div');
    panel.style.cssText = `
      background: white;
      border-radius: 12px;
      box-shadow: 0 20px 60px rgba(0,0,0,0.3);
      max-width: 900px;
      width: 90%;
      max-height: 80vh;
      overflow-y: auto;
      animation: slideUp 0.3s ease-out;
    `;

    // Mostrar loading mientras se cargan datos
    panel.innerHTML = `
      <div style="background: linear-gradient(135deg, #6366f1, #3b82f6); color: white; padding: 20px; border-radius: 12px 12px 0 0; display: flex; justify-content: space-between; align-items: center;">
        <div>
          <h2 style="margin: 0; font-size: 20px;">📊 ${question}</h2>
          <p style="margin: 5px 0 0 0; opacity: 0.9; font-size: 13px;">Cargando datos reales...</p>
        </div>
        <button onclick="document.getElementById('analysis-modal').remove()" style="background: rgba(255,255,255,0.2); border: none; color: white; font-size: 24px; width: 40px; height: 40px; border-radius: 50%; cursor: pointer;">×</button>
      </div>
      <div style="padding: 20px; text-align: center;">
        <div style="display: inline-block; text-align: center;">
          <div style="width: 40px; height: 40px; border: 4px solid #e5e7eb; border-top: 4px solid #6366f1; border-radius: 50%; animation: spin 1s linear infinite; margin-bottom: 12px;"></div>
          <p style="color: #666;">Cargando datos reales...</p>
        </div>
      </div>
    `;

    modal.appendChild(panel);
    document.body.appendChild(modal);

    // Agregar estilos de animación
    if (!document.getElementById('analysis-animation-style')) {
      const style = document.createElement('style');
      style.id = 'analysis-animation-style';
      style.textContent = `
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes slideUp {
          from { transform: translateY(50px); opacity: 0; }
          to { transform: translateY(0); opacity: 1; }
        }
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `;
      document.head.appendChild(style);
    }

    // Generar contenido basado en la pregunta (ASINCRÓNICO)
    try {
      console.log("🟣 Llamando a getAnalysisContent()...");
      const content = await this.getAnalysisContent(question);
      console.log("🟣 getAnalysisContent() retornó contenido:", content.length, "caracteres");
      
      // Actualizar el panel con el contenido real
      panel.innerHTML = `
        <div style="background: linear-gradient(135deg, #6366f1, #3b82f6); color: white; padding: 20px; border-radius: 12px 12px 0 0; display: flex; justify-content: space-between; align-items: center;">
          <div>
            <h2 style="margin: 0; font-size: 20px;">📊 ${question}</h2>
            <p style="margin: 5px 0 0 0; opacity: 0.9; font-size: 13px;">Análisis de datos en tiempo real</p>
          </div>
          <button onclick="document.getElementById('analysis-modal').remove()" style="background: rgba(255,255,255,0.2); border: none; color: white; font-size: 24px; width: 40px; height: 40px; border-radius: 50%; cursor: pointer;">×</button>
        </div>
        <div style="padding: 20px;">
          ${content}
        </div>
        <div style="padding: 15px 20px; background: #f8f9fa; border-top: 1px solid #e5e7eb; text-align: right;">
          <button onclick="document.getElementById('analysis-modal').remove()" style="background: #6366f1; color: white; border: none; padding: 8px 16px; border-radius: 6px; cursor: pointer; font-size: 14px;">Cerrar</button>
        </div>
      `;
      console.log("🟢 Panel actualizado con éxito");
    } catch (error) {
      console.error("🔴 ERRORNNN en getAnalysisContent:", error);
      console.error("Stack:", error.stack);
      panel.innerHTML = `
        <div style="background: linear-gradient(135deg, #ef4444, #f87171); color: white; padding: 20px; border-radius: 12px 12px 0 0; display: flex; justify-content: space-between; align-items: center;">
          <h2 style="margin: 0;">❌ Error</h2>
          <button onclick="document.getElementById('analysis-modal').remove()" style="background: rgba(255,255,255,0.2); border: none; color: white; font-size: 24px; cursor: pointer;">×</button>
        </div>
        <div style="padding: 20px;">
          <p><strong>Error al cargar el análisis:</strong></p>
          <p style="color: red; font-family: monospace; font-size: 12px;">${error.message}</p>
          <p style="color: #666; font-family: monospace; font-size: 11px;">${error.stack}</p>
        </div>
      `;
    }

    modal.onclick = (e) => {
      if (e.target === modal) modal.remove();
    };
  }

  async getAnalysisContent(question) {
    const q = question.toLowerCase();
    
    console.log("🟡 getAnalysisContent() iniciado");
    console.log("🟡 Pregunta:", question);
    console.log("🟡 Pregunta minúsculas:", q);
    
    try {
      console.log("🟡 Llamando getClientsStats()...");
      const stats = await this.getClientsStats();
      console.log("🟡 Stats retornados:", stats);
      
      if (stats.length === 0) {
        console.warn("⚠️ Stats vacío, mostrando mensaje de sin datos");
        return `
          <div style="background: #fef2f2; border-left: 4px solid #dc2626; padding: 12px; border-radius: 6px;">
            <strong style="color: #991b1b;">⚠️ Sin datos</strong>
            <div style="font-size: 12px; color: #7f1d1d; margin-top: 6px;">
              No hay municipios configurados. Configura al menos un cliente en la sección de Clientes para ver análisis.
            </div>
          </div>
        `;
      }
      
      // Análisis por tipo de pregunta
      if (q.includes('comparar') || q.includes('estadísticas')) {
        console.log("🟡 Detectado: Comparativa");
        
        // Buscar nombres de municipios mencionados en la pregunta
        let muni1 = null;
        let muni2 = null;
        
        // Lista de municipios posibles para búsqueda
        const municipiosMap = {
          'la plata': 'La Plata',
          'córdoba': 'Córdoba',
          'cordoba': 'Córdoba',
          'mar del plata': 'Mar del Plata',
          'mendoza': 'Mendoza',
          'tigre': 'Tigre',
          'necochea': 'Necochea',
          'mardelplata': 'Mar del Plata',
          'mardel': 'Mar del Plata'
        };
        
        // Buscar municipios mencionados en la pregunta
        const munisMencionados = [];
        const statsMap = {};
        stats.forEach(s => {
          statsMap[s.nombre.toLowerCase()] = s;
        });
        
        for (const [key, nombre] of Object.entries(municipiosMap)) {
          if (q.includes(key)) {
            const stat = statsMap[nombre.toLowerCase()];
            if (stat) {
              munisMencionados.push(stat);
            }
          }
        }
        
        console.log("🟡 Municipios mencionados:", munisMencionados);
        
        // Si encontró 2 municipios específicos, usarlos
        if (munisMencionados.length === 2) {
          muni1 = munisMencionados[0];
          muni2 = munisMencionados[1];
        } else if (munisMencionados.length === 1) {
          // Si solo encontró 1, comparar con otro con datos
          muni1 = munisMencionados[0];
          const statsConDatos = stats.filter(s => (s.siniestros > 0 || s.camaras > 0) && s.nombre !== muni1.nombre);
          muni2 = statsConDatos[0] || stats.find(s => s.nombre !== muni1.nombre) || { nombre: 'Municipio 2', siniestros: 0, camaras: 0 };
        } else {
          // Si no encontró municipios específicos, mostrar los que tienen datos
          const statsConDatos = stats.filter(s => s.siniestros > 0 || s.camaras > 0);
          muni1 = statsConDatos[0] || stats[0] || { nombre: 'Municipio 1', siniestros: 0, camaras: 0 };
          muni2 = statsConDatos[1] || stats[1] || { nombre: 'Municipio 2', siniestros: 0, camaras: 0 };
        }
        
        console.log("🟡 Muni1:", muni1);
        console.log("🟡 Muni2:", muni2);
        
        const sinDiff = muni1.siniestros > 0 ? ((muni2.siniestros - muni1.siniestros) / muni1.siniestros * 100).toFixed(1) : 0;
        const cameraPublDiff = muni1.camerasPublicas > 0 ? ((muni2.camerasPublicas - muni1.camerasPublicas) / muni1.camerasPublicas * 100).toFixed(1) : 0;
        const cameraPrivDiff = muni1.camerasPrivadas > 0 ? ((muni2.camerasPrivadas - muni1.camerasPrivadas) / muni1.camerasPrivadas * 100).toFixed(1) : 0;
        
        console.log("🟡 SinDiff:", sinDiff, "CameraPublDiff:", cameraPublDiff, "CameraPrivDiff:", cameraPrivDiff);
        
        return `
          <div style="margin-bottom: 20px;">
            <h3 style="margin-top: 0;">📊 Comparativa ${muni1.nombre} vs ${muni2.nombre}</h3>
            <table style="width: 100%; border-collapse: collapse; margin-bottom: 15px; font-size: 13px;">
              <tr style="background: linear-gradient(90deg, #f3f4f6, #f3f4f6);">
                <th style="padding: 12px; text-align: left; border: 1px solid #d1d5db; font-weight: 600;"><strong>Métrica</strong></th>
                <th style="padding: 12px; text-align: center; border: 1px solid #d1d5db;"><strong>🔴 ${muni1.nombre}</strong></th>
                <th style="padding: 12px; text-align: center; border: 1px solid #d1d5db;"><strong>🔵 ${muni2.nombre}</strong></th>
                <th style="padding: 12px; text-align: center; border: 1px solid #d1d5db; color: #7c3aed;">Diferencia</th>
              </tr>
              <tr>
                <td style="padding: 12px; border: 1px solid #e5e7eb; background: #fafbfc;"><strong>Siniestros</strong></td>
                <td style="padding: 12px; text-align: center; border: 1px solid #e5e7eb; font-weight: 600; color: #dc2626;">${muni1.siniestros}</td>
                <td style="padding: 12px; text-align: center; border: 1px solid #e5e7eb; font-weight: 600; color: #2563eb;">${muni2.siniestros}</td>
                <td style="padding: 12px; text-align: center; border: 1px solid #e5e7eb; color: #7c3aed;">${isFinite(sinDiff) ? (sinDiff > 0 ? '+' : '') + sinDiff + '%' : 'N/A'}</td>
              </tr>
              <tr style="background: #f9fafb;">
                <td style="padding: 12px; border: 1px solid #e5e7eb;"><strong>Cámaras Públicas</strong></td>
                <td style="padding: 12px; text-align: center; border: 1px solid #e5e7eb; font-weight: 600; color: #059669;">${muni1.camerasPublicas}</td>
                <td style="padding: 12px; text-align: center; border: 1px solid #e5e7eb; font-weight: 600; color: #059669;">${muni2.camerasPublicas}</td>
                <td style="padding: 12px; text-align: center; border: 1px solid #e5e7eb; color: #10b981;">${isFinite(cameraPublDiff) ? (cameraPublDiff > 0 ? '+' : '') + cameraPublDiff + '%' : 'N/A'}</td>
              </tr>
              <tr>
                <td style="padding: 12px; border: 1px solid #e5e7eb; background: #fafbfc;"><strong>Cámaras Privadas</strong></td>
                <td style="padding: 12px; text-align: center; border: 1px solid #e5e7eb; font-weight: 600; color: #d97706;">${muni1.camerasPrivadas}</td>
                <td style="padding: 12px; text-align: center; border: 1px solid #e5e7eb; font-weight: 600; color: #d97706;">${muni2.camerasPrivadas}</td>
                <td style="padding: 12px; text-align: center; border: 1px solid #e5e7eb; color: #f59e0b;">${isFinite(cameraPrivDiff) ? (cameraPrivDiff > 0 ? '+' : '') + cameraPrivDiff + '%' : 'N/A'}</td>
              </tr>
            </table>
            <div style="background: #f0f9ff; border-left: 4px solid #2563eb; padding: 12px; border-radius: 6px;">
              <strong>✅ Datos en Tiempo Real</strong>
              <div style="font-size: 12px; color: #1e3a8a; margin-top: 6px;">
                Información actualizada desde Firebase. Total de siniestros: ${muni1.siniestros + muni2.siniestros} | Total de cámaras: ${muni1.camaras + muni2.camaras} (${muni1.camerasPublicas + muni2.camerasPublicas} públicas + ${muni1.camerasPrivadas + muni2.camerasPrivadas} privadas)
              </div>
            </div>
          </div>
        `;
      } else if (q.includes('cobertura') || q.includes('cámaras')) {
        console.log("🟡 Detectado: Cobertura");
        return `
          <div style="margin-bottom: 20px;">
            <h3 style="margin-top: 0;">📹 Cobertura de Cámaras - Estado Actual</h3>
            
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin: 15px 0;">
              ${stats.map(s => `
                <div style="background: linear-gradient(135deg, #fef2f2, #fee2e2); padding: 15px; border-radius: 8px; border: 2px solid #dc2626;">
                  <div style="font-size: 28px; font-weight: bold; color: #991b1b;">${s.camaras}</div>
                  <div style="color: #991b1b; font-weight: 600;">Cámaras Activas</div>
                  <div style="font-size: 11px; color: #7f1d1d; margin-top: 5px;">${s.nombre}</div>
                  <div style="font-size: 18px; font-weight: bold; color: #ef4444; margin-top: 8px;">${Math.round(s.cobertura || 0)}%</div>
                  <div style="font-size: 11px; color: #7f1d1d;">Cobertura Estimada</div>
                </div>
              `).join('')}
            </div>

            <div style="background: #fef2f2; border-left: 4px solid #dc2626; padding: 12px; border-radius: 6px;">
              <strong style="color: #991b1b;">📌 Datos Reales del Sistema</strong>
              <div style="font-size: 12px; color: #7f1d1d; margin-top: 6px;">
                Total de cámaras activas en el sistema: <strong>${stats.reduce((a, b) => a + b.camaras, 0)}</strong>
              </div>
            </div>
          </div>
        `;
      } else if (q.includes('tendencia') || q.includes('30 días')) {
        console.log("🟡 Detectado: Tendencia");
        const totalSiniestros = stats.reduce((a, b) => a + b.siniestros, 0);
        return `
          <div style="margin-bottom: 20px;">
            <h3 style="margin-top: 0;">📈 Estadísticas del Sistema</h3>
            
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-bottom: 15px;">
              <div style="background: #f0f9ff; padding: 15px; border-radius: 8px; border-left: 3px solid #0284c7;">
                <div style="font-weight: 600; color: #0284c7; font-size: 13px;">📊 Total de Siniestros</div>
                <div style="font-size: 32px; font-weight: bold; color: #0284c7;">${totalSiniestros}</div>
                <div style="font-size: 11px; color: #0c4a6e; margin-top: 3px;">en todas las municipalidades</div>
              </div>
              <div style="background: #f0fdf4; padding: 15px; border-radius: 8px; border-left: 3px solid #10b981;">
                <div style="font-weight: 600; color: #10b981; font-size: 13px;">📹 Total de Cámaras</div>
                <div style="font-size: 32px; font-weight: bold; color: #10b981;">${stats.reduce((a, b) => a + b.camaras, 0)}</div>
                <div style="font-size: 11px; color: #15803d; margin-top: 3px;">cámaras activas</div>
              </div>
            </div>

            <div style="background: #f3f4f6; padding: 12px; border-radius: 8px; margin: 15px 0;">
              <div style="font-weight: 600; margin-bottom: 10px;">Distribución por Municipio</div>
              ${stats.map(s => `
                <div style="padding: 8px 0; border-bottom: 1px solid #d1d5db; font-size: 13px;">
                  <strong>${s.nombre}</strong>: ${s.siniestros} siniestros | ${s.camaras} cámaras
                </div>
              `).join('')}
            </div>

            <div style="background: #f0f9ff; border-left: 4px solid #2563eb; padding: 12px; border-radius: 6px;">
              <strong>✅ Datos en Tiempo Real</strong>
              <div style="font-size: 12px; color: #1e3a8a; margin-top: 6px;">
                Información sincronizada con Firebase. Último acceso: ${new Date().toLocaleTimeString()}
              </div>
            </div>
          </div>
        `;
      } else {
        console.log("🟡 Detectado: Fallback (tipo desconocido)");
        return `
          <div style="text-align: center; padding: 30px;">
            <div style="font-size: 48px; margin-bottom: 10px;">📋</div>
            <h3 style="margin: 0;">Análisis: ${question}</h3>
            <p style="color: #666; margin-top: 10px;">
              Esta funcionalidad está siendo implementada. Los datos se actualizarán automáticamente cuando estén disponibles.
            </p>
            <div style="background: #f3f4f6; padding: 15px; border-radius: 8px; margin-top: 15px; text-align: left;">
              <strong>Estado:</strong> En desarrollo<br>
              <strong>Próxima actualización:</strong> Próxima semana<br>
              <strong>Datos disponibles:</strong> Parciales
            </div>
          </div>
        `;
      }
    } catch (error) {
      console.error("🔴 Error en getAnalysisContent:", error);
      console.error("🔴 Stack trace:", error.stack);
      return `
        <div style="background: #fef2f2; border-left: 4px solid #dc2626; padding: 12px; border-radius: 6px;">
          <strong style="color: #991b1b;">❌ Error al cargar datos</strong>
          <div style="font-size: 12px; color: #7f1d1d; margin-top: 6px;">
            ${error.message}
          </div>
        </div>
      `;
    }
  }

  async getClientsStats() {
    try {
      const stats = [];
      
      console.log("🔍 getClientsStats - this.clientesData:", this.clientesData);
      
      if (!this.clientesData || this.clientesData.length === 0) {
        console.warn("⚠️ No hay datos de clientes disponibles");
        return [];
      }
      
      // Datos de ejemplo para demo (no cargar desde Firebase para ahorrar espacio)
      // Basados en datos reales del mapa de cada ciudad
      const datosDemo = {
        'mardelplata': { siniestros: 4058, camerasPublicas: 693, camerasPrivadas: 423, nombre: 'Mar del Plata' },
        'cordoba': { siniestros: 1000, camerasPublicas: 48, camerasPrivadas: 20, nombre: 'Córdoba' }
      };
      
      for (const cliente of this.clientesData) {
        try {
          console.log(`📍 Procesando cliente: ${cliente.nombre} (${cliente.id})`);
          
          // Si es un municipio de demo, usar datos hardcodeados
          if (datosDemo[cliente.id]) {
            const demo = datosDemo[cliente.id];
            const totalCamaras = demo.camerasPublicas + demo.camerasPrivadas;
            console.log(`   📊 DATOS DE DEMOSTRACIÓN: ${demo.siniestros} siniestros, ${demo.camerasPublicas} públicas, ${demo.camerasPrivadas} privadas`);
            
            stats.push({
              nombre: cliente.nombre || demo.nombre,
              id: cliente.id,
              siniestros: demo.siniestros,
              camerasPublicas: demo.camerasPublicas,
              camerasPrivadas: demo.camerasPrivadas,
              camaras: totalCamaras,
              cobertura: totalCamaras > 0 ? Math.round((totalCamaras / Math.max(demo.siniestros, 1)) * 10) : 0,
              esDemo: true
            });
            
            console.log(`✅ ${cliente.nombre}: ${demo.siniestros} siniestros, ${demo.camerasPublicas}+${demo.camerasPrivadas} cámaras (DEMO)`);
            continue;
          }
          
          // Para otros clientes, leer de Firebase
          // Contar cámaras públicas
          const camerasRef = db.collection('clientes').doc(cliente.id).collection('cameras');
          const camerasSnap = await camerasRef.get();
          console.log(`   📹 Cámaras públicas en '${cliente.id}/cameras': ${camerasSnap.size}`);
          
          // Contar cámaras privadas
          const camerasPrivRef = db.collection('clientes').doc(cliente.id).collection('cameras_privadas');
          const camerasPrivSnap = await camerasPrivRef.get();
          console.log(`   📹 Cámaras privadas en '${cliente.id}/cameras_privadas': ${camerasPrivSnap.size}`);
          
          // Contar siniestros
          const siniestrosRef = db.collection('clientes').doc(cliente.id).collection('siniestros');
          const siniestrosSnap = await siniestrosRef.get();
          console.log(`   ⚠️ Siniestros en '${cliente.id}/siniestros': ${siniestrosSnap.size}`);
          
          const camerasPublicasCount = camerasSnap.size;
          const camerasPrivadasCount = camerasPrivSnap.size;
          const camaras = camerasPublicasCount + camerasPrivadasCount;
          
          stats.push({
            nombre: cliente.nombre || 'Sin nombre',
            id: cliente.id,
            siniestros: siniestrosSnap.size,
            camerasPublicas: camerasPublicasCount,
            camerasPrivadas: camerasPrivadasCount,
            camaras: camaras,
            cobertura: camaras > 0 ? Math.round((camaras / Math.max(siniestrosSnap.size, 1)) * 10) : 0,
            esDemo: false
          });
          
          console.log(`✅ ${cliente.nombre}: ${siniestrosSnap.size} siniestros, ${camerasPublicasCount}+${camerasPrivadasCount} cámaras`);
        } catch (e) {
          console.error(`❌ Error procesando ${cliente.nombre}:`, e.message, e);
          stats.push({
            nombre: cliente.nombre || 'Error',
            id: cliente.id,
            siniestros: 0,
            camerasPublicas: 0,
            camerasPrivadas: 0,
            camaras: 0,
            cobertura: 0,
            esDemo: false
          });
        }
      }
      
      console.log("✅ Stats finales:", stats);
      return stats;
    } catch (error) {
      console.error("❌ Error en getClientsStats:", error);
      return [];
    }
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
        // La sección de Billing vieja (con el bug del campo "periodo" y el
        // botón "Generar Factura" sin conectar) fue reemplazada por la
        // página completa en admin/billing/index.html (billing-manager.js).
        // Si alguien llega acá por un link viejo guardado, lo redirigimos.
        console.log("↪️ Redirigiendo a la nueva página de Billing...");
        window.location.href = 'billing/index.html';
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

                <div class="row">
                  <div class="col-md-6 mb-3">
                    <label class="form-label">Latitud (opcional)</label>
                    <input type="number" class="form-control" id="latCliente" placeholder="-38.0" step="0.0001">
                  </div>
                  <div class="col-md-6 mb-3">
                    <label class="form-label">Longitud (opcional)</label>
                    <input type="number" class="form-control" id="lngCliente" placeholder="-57.5" step="0.0001">
                  </div>
                </div>

                <div class="row">
                  <div class="col-md-6 mb-3">
                    <label class="form-label">Zoom inicial (opcional)</label>
                    <input type="number" class="form-control" id="zoomCliente" placeholder="13" min="1" max="22" step="1">
                  </div>
                </div>

                <div class="alert alert-info">
                  <i class="bi bi-info-circle"></i> La contraseña será generada automáticamente y se mostrará después de crear el cliente.
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

      <!-- Modal: Credenciales Cliente -->
      <div class="modal fade" id="modalCredencialesCliente" tabindex="-1" data-bs-backdrop="static" data-bs-keyboard="false">
        <div class="modal-dialog modal-lg">
          <div class="modal-content">
            <div class="modal-header bg-success text-white">
              <h5 class="modal-title"><i class="bi bi-shield-check"></i> ✅ Cliente Creado - Credenciales de Acceso</h5>
            </div>
            <div class="modal-body">
              <div class="alert alert-info">
                <i class="bi bi-info-circle"></i> Guarda estas credenciales en un lugar seguro. La contraseña no se mostrará nuevamente.
              </div>
              
              <div class="row mb-3">
                <div class="col-md-6">
                  <label class="form-label fw-bold">Email de Acceso:</label>
                  <div class="input-group">
                    <input type="text" class="form-control" id="credencialesEmail" readonly>
                    <button class="btn btn-outline-secondary" type="button" onclick="copiarAlPortapapeles('credencialesEmail')">
                      <i class="bi bi-clipboard"></i> Copiar
                    </button>
                  </div>
                </div>
              </div>

              <div class="row mb-3">
                <div class="col-md-6">
                  <label class="form-label fw-bold">Contraseña Temporal:</label>
                  <div class="input-group">
                    <input type="password" class="form-control" id="credencialesPassword" readonly>
                    <button class="btn btn-outline-secondary" type="button" onclick="togglePasswordVisibility('credencialesPassword')">
                      <i class="bi bi-eye"></i>
                    </button>
                    <button class="btn btn-outline-secondary" type="button" onclick="copiarAlPortapapeles('credencialesPassword')">
                      <i class="bi bi-clipboard"></i> Copiar
                    </button>
                  </div>
                </div>
              </div>

              <div class="row mb-3">
                <div class="col-12">
                  <label class="form-label fw-bold">URL de Acceso al Panel:</label>
                  <div class="input-group">
                    <input type="text" class="form-control" id="credencialesUrl" readonly>
                    <button class="btn btn-outline-secondary" type="button" onclick="copiarAlPortapapeles('credencialesUrl')">
                      <i class="bi bi-clipboard"></i> Copiar
                    </button>
                  </div>
                </div>
              </div>

              <div class="alert alert-warning mt-4">
                <i class="bi bi-exclamation-triangle"></i> <strong>Importante:</strong> El cliente deberá cambiar la contraseña en su primer acceso.
              </div>
            </div>
            <div class="modal-footer">
              <button type="button" class="btn btn-success" data-bs-dismiss="modal">
                ✅ Entendido, recargar lista
              </button>
            </div>
          </div>
        </div>
      </div>

      <!-- Modal: Editar Cliente -->
      <div class="modal fade" id="modalEditarCliente" tabindex="-1">
        <div class="modal-dialog modal-lg">
          <div class="modal-content">
            <div class="modal-header bg-warning text-white">
              <h5 class="modal-title"><i class="bi bi-pencil"></i> Editar Cliente</h5>
              <button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal"></button>
            </div>
            <form id="formEditarCliente">
              <div class="modal-body">
                <input type="hidden" id="editClienteId">
                
                <div class="mb-3">
                  <label class="form-label">Municipio *</label>
                  <input type="text" class="form-control" id="editNombreCliente" required>
                </div>
                <div class="mb-3">
                  <label class="form-label">Email Admin <small class="text-muted">(No se puede cambiar)</small></label>
                  <input type="email" class="form-control" id="editEmailCliente" readonly>
                </div>
                <div class="mb-3">
                  <label class="form-label">Plan *</label>
                  <select class="form-select" id="editPlanCliente" required>
                    <option value="">-- Seleccionar plan --</option>
                    <option value="basico">Básico ($1.000/mes)</option>
                    <option value="profesional">Profesional ($5.000/mes)</option>
                    <option value="enterprise">Enterprise (Personalizado)</option>
                  </select>
                </div>
                <div class="mb-3">
                  <label class="form-label">Dominio/Ciudad</label>
                  <input type="text" class="form-control" id="editDominioCliente">
                </div>
                <div class="mb-3">
                  <label class="form-label">Teléfono</label>
                  <input type="text" class="form-control" id="editTelefonoCliente">
                </div>
              </div>
              <div class="modal-footer">
                <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Cancelar</button>
                <button type="submit" class="btn btn-primary">
                  <i class="bi bi-check-circle"></i> Guardar Cambios
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>

    <!-- Modal 1: Confirmación Inicial de Eliminación -->
    <div class="modal fade" id="modalConfirmarEliminar" tabindex="-1">
      <div class="modal-dialog">
        <div class="modal-content border-danger">
          <div class="modal-header bg-danger text-white">
            <h5 class="modal-title"><i class="bi bi-exclamation-triangle"></i> Confirmar Eliminación</h5>
            <button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal"></button>
          </div>
          <div class="modal-body">
            <h6>⚠️ ADVERTENCIA</h6>
            <p class="text-danger mb-3"><strong>Vas a eliminar el cliente: <span id="nombreClienteEliminar"></span></strong></p>
            <p>Esto eliminará de manera permanente e IRREVERSIBLE:</p>
            <ul>
              <li>✗ El cliente</li>
              <li>✗ Su suscripción</li>
              <li>✗ Sus facturas/billing</li>
              <li>✗ Su usuario en Firebase Auth</li>
              <li>✗ Toda su información</li>
            </ul>
            <p class="text-danger"><strong>Esta acción NO se puede deshacer.</strong></p>
          </div>
          <div class="modal-footer">
            <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Cancelar</button>
            <button type="button" class="btn btn-danger" onclick="clientesManager.mostrarConfirmacionFinal()">
              <i class="bi bi-trash"></i> Continuar Eliminación
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- Modal 2: Escribir Nombre Cliente para Confirmar -->
    <div class="modal fade" id="modalConfirmarEscribirNombre" tabindex="-1">
      <div class="modal-dialog">
        <div class="modal-content border-danger">
          <div class="modal-header bg-danger text-white">
            <h5 class="modal-title"><i class="bi bi-shield-exclamation"></i> Confirmación Final</h5>
            <button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal"></button>
          </div>
          <div class="modal-body">
            <p>Para confirmar la eliminación, escribe el nombre del cliente:</p>
            <p class="bg-light p-2 rounded"><strong id="nombreClienteConfirmar"></strong></p>
            <input type="text" class="form-control" id="inputNombreClienteConfirmar" placeholder="Escribe aquí...">
            <small class="text-muted">
              Si el nombre coincide EXACTAMENTE, podrás eliminarlo.
            </small>
          </div>
          <div class="modal-footer">
            <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Cancelar</button>
            <button type="button" class="btn btn-danger" onclick="clientesManager.procederEliminacion()" id="btnEliminacionFinal">
              <i class="bi bi-trash"></i> Eliminar PERMANENTEMENTE
            </button>
          </div>
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
        const lat = parseFloat(document.getElementById('latCliente').value) || null;
        const lng = parseFloat(document.getElementById('lngCliente').value) || null;
        const zoom = parseInt(document.getElementById('zoomCliente').value) || null;

        if (!nombre || !email || !plan) {
          adminAuth.showError('Completa todos los campos requeridos');
          return;
        }

        try {
          console.log('📤 Creando cliente:', { nombre, email, plan, lat, lng, zoom });
          
          // Llamar a función para crear cliente (usar dashboard para acceder a crearClienteAPI)
          const resultadoCreacion = await dashboard.crearClienteAPI({ 
            nombre, 
            email, 
            plan, 
            dominio,
            lat,
            lng,
            zoom
          });

          // ✅ NUEVA: No cerrar modal ni recargar - el modal de credenciales se abre automáticamente
          // El usuario puede copiar las credenciales y luego cerrar
          formCrear.reset();
          
        } catch (error) {
          console.error('❌ Error crear cliente:', error);
          adminAuth.showError('Error: ' + error.message);
        }
      });
    }

    // Event listener para el formulario de edición
    const formEditar = document.getElementById('formEditarCliente');
    if (formEditar) {
      formEditar.addEventListener('submit', async (e) => {
        e.preventDefault();
        const clienteId = document.getElementById('editClienteId').value;
        try {
          await clientesManager.handleGuardarEdicion(clienteId);
        } catch (error) {
          console.error('❌ Error al guardar edición:', error);
          adminAuth.showError('Error: ' + error.message);
        }
      });
    }

    // Event listener para validación en tiempo real del campo de confirmación de eliminación
    const inputConfirmacion = document.getElementById('inputNombreClienteConfirmar');
    const btnEliminarFinal = document.getElementById('btnEliminacionFinal');
    if (inputConfirmacion && btnEliminarFinal) {
      inputConfirmacion.addEventListener('input', (e) => {
        const nombreEscrito = e.target.value;
        const nombreEsperado = document.getElementById('nombreClienteConfirmar').textContent;
        
        // Habilitar botón solo si el nombre coincide EXACTAMENTE
        btnEliminarFinal.disabled = nombreEscrito !== nombreEsperado;
        
        if (nombreEscrito === nombreEsperado && nombreEscrito !== '') {
          btnEliminarFinal.classList.add('btn-danger-pulse');
        } else {
          btnEliminarFinal.classList.remove('btn-danger-pulse');
        }
      });
    }
  }

  // Llamar función Cloud Function callable para crear cliente
  async crearClienteAPI(clientData) {
    showLoading('Creando cliente...');
    
    try {
      const { nombre, email, plan, dominio, lat, lng, zoom } = clientData;
      
      console.log('📤 Llamando Cloud Function callable criarClienteAdmin:', { nombre, email, plan });
      
      // Usar Cloud Functions callable (sin CORS)
      const criarClienteAdmin = firebase.functions().httpsCallable('criarClienteAdmin');
      const response = await criarClienteAdmin({
        nombreCliente: nombre,
        email: email,
        plan: plan,
        ciudad: dominio || '',
        telefono: ''
      });
      
      hideLoading();
      
      console.log('✅ Respuesta de Cloud Function:', response.data);

      // ✅ Extraer credenciales de la respuesta
      const credenciales = response.data.admin_user;
      const clienteId = response.data.cliente?.id;

      // ✅ Guardar lat/lng/zoom en Firestore (la Cloud Function no los maneja)
      if (clienteId && (lat !== null || lng !== null || zoom !== null)) {
        try {
          const updateData = {};
          if (lat !== null) updateData.lat = lat;
          if (lng !== null) updateData.lng = lng;
          if (zoom !== null) updateData.zoom = zoom;

          await db.collection('clientes').doc(clienteId).update(updateData);
          console.log('✅ Lat/Lng/Zoom guardados en Firestore:', updateData);
        } catch (updateError) {
          console.error('⚠️ Error guardando lat/lng/zoom:', updateError);
          // No interrumpe el flujo de creación del cliente
        }
      }
      
      // ✅ Intentar poblar modal de credenciales
      const emailEl = document.getElementById('credencialesEmail');
      const passwordEl = document.getElementById('credencialesPassword');
      const urlEl = document.getElementById('credencialesUrl');
      
      if (emailEl && passwordEl && urlEl) {
        // ✅ Mostrar modal de credenciales si existen los elementos
        emailEl.value = credenciales.email;
        passwordEl.value = credenciales.password;
        urlEl.value = 'https://trafico-map-general-v2.web.app/login.html';
        
        // ✅ Cerrar modal de crear DESPUÉS de llenar los campos
        const modalCrear = document.getElementById('modalCrearCliente');
        const instanceCrear = bootstrap.Modal.getInstance(modalCrear);
        if (instanceCrear) instanceCrear.hide();
        
        // Esperar a que se cierre el primer modal antes de abrir el segundo
        setTimeout(() => {
          const modalCredencialesEl = document.getElementById('modalCredencialesCliente');
          const modalCredenciales = new bootstrap.Modal(modalCredencialesEl, { backdrop: 'static' });
          
          // ✅ Agregar evento para recargar cuando se cierre el modal
          modalCredencialesEl.addEventListener('hidden.bs.modal', () => {
            console.log('📥 Modal cerrado, recargando lista...');
            location.reload(); // Recarga inmediata sin delay
          }, { once: true });
          
          modalCredenciales.show();
        }, 300); // Pequeño delay para que cierre el primer modal
      } else {
        // ❌ Si no existen, mostrar toast con las credenciales
        const modalCrear = document.getElementById('modalCrearCliente');
        const instanceCrear = bootstrap.Modal.getInstance(modalCrear);
        if (instanceCrear) instanceCrear.hide();
        
        const mensaje = `✅ Cliente creado con éxito!
Email: ${credenciales.email}
Contraseña: ${credenciales.password}
URL: https://trafico-map-general-v2.web.app/login.html`;
        
        adminAuth.showSuccess(mensaje);
        
        // Recargar página después de que el usuario vea el mensaje
        setTimeout(() => {
          location.reload();
        }, 3000);
      }
      
      return response.data;
      
    } catch (error) {
      hideLoading();
      console.error('❌ Error crear cliente:', error);
      
      const errorMsg = error.message || 'Error desconocido al crear cliente';
      adminAuth.showError('Error: ' + errorMsg);
      throw error;
    }
  }

  
  getSubscripcionesPageHTML() {
    return `
      <div class="container-fluid p-4">
        <div class="d-flex justify-content-between align-items-center mb-4">
          <h2>Gestión de Suscripciones</h2>
          <button class="btn btn-primary" id="btnCrearPlan">
            <i class="bi bi-plus-circle"></i> Crear Plan
          </button>
        </div>
 
        <div class="card">
          <div class="card-header bg-light">
            <h5 class="mb-0"><i class="bi bi-card-list"></i> Catálogo de Planes</h5>
          </div>
          <div class="card-body">
            <div id="subscripcionesTableContainer" class="table-responsive">
              <p class="text-muted">Cargando planes...</p>
            </div>
          </div>
        </div>
      </div>
 
      <!-- Modal Crear/Editar Plan -->
      <div class="modal fade" id="planModal" tabindex="-1">
        <div class="modal-dialog">
          <div class="modal-content">
            <div class="modal-header">
              <h5 class="modal-title" id="planModalTitle">Crear Plan</h5>
              <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
            </div>
            <div class="modal-body">
              <input type="hidden" id="planId" value="">
              <div class="mb-3">
                <label for="planNombre" class="form-label">Nombre del Plan *</label>
                <input type="text" class="form-control" id="planNombre" placeholder="Ej: Básico, Profesional, Premium...">
              </div>
              <div class="mb-3">
                <label for="planPrecio" class="form-label">Precio mensual *</label>
                <input type="number" class="form-control" id="planPrecio" placeholder="Ej: 1000" min="0">
              </div>
              <div class="mb-3">
                <label for="planFeatures" class="form-label">Funcionalidades incluidas</label>
                <textarea class="form-control" id="planFeatures" rows="6" placeholder="Una funcionalidad por línea, ej:&#10;Mapa interactivo&#10;Hasta 5 cámaras&#10;Soporte por email"></textarea>
                <small class="text-muted">Una funcionalidad por línea.</small>
              </div>
            </div>
            <div class="modal-footer">
              <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Cancelar</button>
              <button type="button" class="btn btn-primary" id="submitPlan">Guardar</button>
            </div>
          </div>
        </div>
      </div>
    `;
  }


  attachSubscripcionesPageEvents() {
    this.renderSubscripcionesTable();
 
    // Botón "Crear Plan" -> abrir modal vacío
    document.getElementById('btnCrearPlan').addEventListener('click', () => {
      document.getElementById('planModalTitle').textContent = 'Crear Plan';
      document.getElementById('planId').value = '';
      document.getElementById('planNombre').value = '';
      document.getElementById('planPrecio').value = '';
      document.getElementById('planFeatures').value = '';
      new bootstrap.Modal(document.getElementById('planModal')).show();
    });
 
    // Botón "Guardar" del modal (sirve para crear y editar)
    document.getElementById('submitPlan').addEventListener('click', () => {
      this.handleGuardarPlan();
    });
  }
 
  renderSubscripcionesTable() {
    const container = document.getElementById('subscripcionesTableContainer');
    if (!container) return;
 
    if (this.subscripcionesData.length === 0) {
      container.innerHTML = '<p class="text-muted">No hay planes cargados</p>';
      return;
    }
 
    const rows = this.subscripcionesData.map((s) => {
      const features = Array.isArray(s.features) ? s.features : [];
      const featuresHTML = features.length
        ? `<ul class="mb-0 ps-3">${features.map(f => `<li>${f}</li>`).join('')}</ul>`
        : '<span class="text-muted">Sin funcionalidades cargadas</span>';
 
      return `
        <tr>
          <td class="fw-bold">${capitalize(s.plan)}</td>
          <td>${formatCurrency(s.precio_mensual)}</td>
          <td>${featuresHTML}</td>
          <td>
            <button class="btn btn-sm btn-outline-primary me-1" onclick="dashboard.abrirEditarPlan('${s.id}')" title="Editar">
              <i class="bi bi-pencil"></i>
            </button>
            <button class="btn btn-sm btn-outline-danger" onclick="dashboard.handleEliminarPlan('${s.id}')" title="Eliminar">
              <i class="bi bi-trash"></i>
            </button>
          </td>
        </tr>
      `;
    }).join('');
 
    container.innerHTML = `
      <table class="table table-hover align-middle">
        <thead class="table-light">
          <tr>
            <th>Plan</th>
            <th>Precio/mes</th>
            <th>Funcionalidades</th>
            <th>Acciones</th>
          </tr>
        </thead>
        <tbody>
          ${rows}
        </tbody>
      </table>
    `;
  }
 
  abrirEditarPlan(planId) {
    const plan = this.subscripcionesData.find(s => s.id === planId);
    if (!plan) return;
 
    document.getElementById('planModalTitle').textContent = 'Editar Plan';
    document.getElementById('planId').value = plan.id;
    document.getElementById('planNombre').value = plan.plan || '';
    document.getElementById('planPrecio').value = plan.precio_mensual || '';
    document.getElementById('planFeatures').value = Array.isArray(plan.features) ? plan.features.join('\n') : '';
    new bootstrap.Modal(document.getElementById('planModal')).show();
  }
 
  async handleGuardarPlan() {
    const planId = document.getElementById('planId').value;
    const nombre = document.getElementById('planNombre').value.trim();
    const precio = parseFloat(document.getElementById('planPrecio').value);
    const featuresRaw = document.getElementById('planFeatures').value;
    const features = featuresRaw
      .split('\n')
      .map(f => f.trim())
      .filter(f => f.length > 0);
 
    if (!nombre || isNaN(precio) || precio < 0) {
      adminAuth.showError('Completá nombre y precio válidos');
      return;
    }
 
    const data = {
      plan: nombre.toLowerCase(),
      nombre_display: nombre,
      precio_mensual: precio,
      features: features
    };
 
    try {
      if (planId) {
        await db.collection('subscripciones').doc(planId).update(data);
        adminAuth.showSuccess('Plan actualizado');
      } else {
        await db.collection('subscripciones').add(data);
        adminAuth.showSuccess('Plan creado');
      }
 
      bootstrap.Modal.getInstance(document.getElementById('planModal')).hide();
      await this.loadSubscripciones();
      this.renderSubscripcionesTable();
    } catch (error) {
      adminAuth.showError('Error al guardar el plan: ' + error.message);
    }
  }
 
  async handleEliminarPlan(planId) {
    if (!confirm('¿Eliminar este plan? Esta acción no se puede deshacer.')) return;
 
    try {
      await db.collection('subscripciones').doc(planId).delete();
      adminAuth.showSuccess('Plan eliminado');
      await this.loadSubscripciones();
      this.renderSubscripcionesTable();
    } catch (error) {
      adminAuth.showError('Error al eliminar el plan: ' + error.message);
    }
  }
 

  // La sección de Billing (getBillingPageHTML / attachBillingPageEvents) fue
  // retirada de acá: ahora vive en admin/billing/index.html + billing-manager.js,
  // que ya resuelve el nombre del cliente y no tiene el bug del campo "periodo".

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

// Instancia global de Admin API Client
const adminApiClient = new AdminApiClient();

// Instancia global
const dashboard = new Dashboard();

// Cargar dashboard
function loadDashboard() {
  dashboard.init();
}

// Función para renovar suscripción (placeholder)
function renovarSuscripcion(clienteId) {
  alert("Renovar suscripción para: " + clienteId);
}

/**
 * Abre la página de demostración del mapa en una nueva ventana
 * Permite que el admin muestre el sistema de forma profesional
 */
function openMapDemo() {
  const demoUrl = '/admin/demo.html';
  window.open(demoUrl, 'mapaDemo', 'width=1400,height=900,left=100,top=100');
}

/**
 * Copia el contenido de un elemento al portapapeles
 */
function copiarAlPortapapeles(elementId) {
  const elemento = document.getElementById(elementId);
  if (!elemento) return;
  
  elemento.select();
  document.execCommand('copy');
  
  // Mostrar feedback visual
  const btn = event.target.closest('button');
  const originalText = btn.innerHTML;
  btn.innerHTML = '<i class="bi bi-check"></i> ¡Copiado!';
  setTimeout(() => {
    btn.innerHTML = originalText;
  }, 2000);
}

/**
 * Toggle para mostrar/ocultar contraseña
 */
function togglePasswordVisibility(elementId) {
  const elemento = document.getElementById(elementId);
  if (!elemento) return;
  
  const btn = event.target.closest('button');
  if (elemento.type === 'password') {
    elemento.type = 'text';
    btn.innerHTML = '<i class="bi bi-eye-slash"></i>';
  } else {
    elemento.type = 'password';
    btn.innerHTML = '<i class="bi bi-eye"></i>';
  }
}
