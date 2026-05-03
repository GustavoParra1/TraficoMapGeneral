/**
 * Billing Manager
 * Gestiona facturación, pagos, reportes e ingresos
 */

class BillingManager {
  constructor() {
    this.facturasData = [];
    this.filteredData = [];
    this.searchQuery = '';
    this.filters = {
      estado: 'todos',
      periodo: 'mes_actual'
    };
    this.reportData = {
      totalIngresos: 0,
      facturasPendientes: 0,
      ingresosPorMes: {}
    };
  }

  /**
   * Inicializa y carga datos
   */
  async init() {
    try {
      console.log('💰 Inicializando BillingManager...');
      await this.loadFacturas();
      await this.generateReports();
      this.renderFacturasTable();
      this.attachEvents();
      console.log('✅ BillingManager iniciado');
    } catch (error) {
      console.error('❌ Error:', error);
      this.showError('Error: ' + error.message);
    }
  }

  /**
   * Carga todas las facturas
   */
  async loadFacturas() {
    try {
      const snapshot = await db.collection('billing').get();

      this.facturasData = await Promise.all(
        snapshot.docs.map(async (doc) => {
          const bill = doc.data();
          let cliente = {};

          if (bill.cliente_id) {
            const clienteDoc = await db.collection('clientes').doc(bill.cliente_id).get();
            if (clienteDoc.exists) {
              cliente = clienteDoc.data();
            }
          }

          return {
            id: doc.id,
            ...bill,
            cliente_nombre: cliente.nombre || 'Desconocido'
          };
        })
      );

      this.applyFilters();
      console.log(`📊 Cargadas ${this.facturasData.length} facturas`);
    } catch (error) {
      console.error('Error cargando facturas:', error);
      throw error;
    }
  }

  /**
   * Genera reportes
   */
  async generateReports() {
    try {
      let totalIngresos = 0;
      let facturasPendientes = 0;
      const ingresosPorMes = {};

      this.facturasData.forEach(factura => {
        // Total ingresos
        if (factura.pagada) {
          totalIngresos += factura.monto;
        }

        // Facturas pendientes
        if (factura.estado === 'pendiente') {
          facturasPendientes += factura.monto;
        }

        // Ingresos por mes
        const mes = factura.periodo_desde.substring(0, 7); // YYYY-MM
        ingresosPorMes[mes] = (ingresosPorMes[mes] || 0) + (factura.pagada ? factura.monto : 0);
      });

      this.reportData = {
        totalIngresos,
        facturasPendientes,
        ingresosPorMes
      };

      console.log('📈 Reportes generados');
    } catch (error) {
      console.error('Error generando reportes:', error);
    }
  }

  /**
   * Obtiene una factura
   */
  async getFactura(facturaId) {
    try {
      const doc = await db.collection('billing').doc(facturaId).get();
      if (doc.exists) {
        return { id: doc.id, ...doc.data() };
      }
      throw new Error('Factura no encontrada');
    } catch (error) {
      console.error('Error obteniendo factura:', error);
      throw error;
    }
  }

  /**
   * Obtiene facturas de un cliente
   */
  async getFacturasCliente(clienteId) {
    try {
      const snapshot = await db.collection('billing')
        .where('cliente_id', '==', clienteId)
        .orderBy('creada_en', 'desc')
        .get();

      return snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
    } catch (error) {
      console.error('Error obteniendo facturas del cliente:', error);
      return [];
    }
  }

  /**
   * Crea una factura manualmente
   */
  async crearFactura(facturaData) {
    try {
      if (!facturaData.cliente_id || !facturaData.monto) {
        throw new Error('Faltan datos: cliente_id, monto');
      }

      const factura = {
        id: generateId('fac'),
        cliente_id: facturaData.cliente_id,
        subscripcion_id: facturaData.subscripcion_id || '',
        monto: facturaData.monto,
        moneda: 'ARS',
        descripcion: facturaData.descripcion || 'Suscripción TraficoMap',
        periodo_desde: facturaData.periodo_desde || new Date().toISOString(),
        periodo_hasta: facturaData.periodo_hasta || new Date(Date.now() + 30*24*60*60*1000).toISOString(),
        estado: 'pendiente',
        creada_en: new Date().toISOString(),
        vence_en: new Date(Date.now() + 15*24*60*60*1000).toISOString(),
        pagada: false,
        fecha_pago: null,
        metodo_pago: facturaData.metodo_pago || 'transferencia',
        numero_comprobante: facturaData.numero_comprobante || ''
      };

      await db.collection('billing').add(factura);
      console.log('✅ Factura creada:', factura.id);

      await this.loadFacturas();
      this.showSuccess('Factura creada');

      return factura;
    } catch (error) {
      console.error('Error creando factura:', error);
      throw error;
    }
  }

  /**
   * Registra un pago
   */
  async registrarPago(facturaId, metodo_pago, referencias) {
    try {
      console.log('Registrando pago con Cloud Function:', facturaId);

      const resultado = await adminApi.registrarPago(facturaId, metodo_pago, referencias);

      console.log('Pago registrado por Cloud Function:', resultado);
      await this.loadFacturas();
      await this.generateReports();
      this.showSuccess('Pago registrado');

      return true;
    } catch (error) {
      console.error('Error registrando pago:', error);
      throw error;
    }
  }

  /**
   * Envía factura por email
   */
  async enviarPorEmail(facturaId, email) {
    try {
      // TODO: Implementar integración con SendGrid/Resend
      console.log('📧 Enviando factura a:', email);

      // Simulado por ahora
      await new Promise(resolve => setTimeout(resolve, 1000));

      this.showSuccess(`Factura enviada a ${email}`);
      return true;
    } catch (error) {
      console.error('Error enviando email:', error);
      throw error;
    }
  }

  /**
   * Descarga factura como PDF
   */
  async descargarPDF(facturaId) {
    try {
      // TODO: Implementar generación de PDF con jsPDF
      alert('Descarga de PDF - próximamente');
    } catch (error) {
      console.error('Error descargando PDF:', error);
    }
  }

  /**
   * Obtiene ingresos del mes actual
   */
  getIngresosMesActual() {
    const ahora = new Date();
    const mesActual = `${ahora.getFullYear()}-${String(ahora.getMonth() + 1).padStart(2, '0')}`;
    return this.reportData.ingresosPorMes[mesActual] || 0;
  }

  /**
   * Obtiene facturas vencidas sin pagar
   */
  getFacturasVencidas() {
    const hoy = new Date();
    return this.facturasData.filter(f =>
      !f.pagada && new Date(f.vence_en) < hoy
    );
  }

  /**
   * Busca facturas
   */
  searchFacturas(query) {
    this.searchQuery = query.toLowerCase();
    this.applyFilters();
  }

  /**
   * Aplica filtros
   */
  applyFilters() {
    let filtered = [...this.facturasData];

    // Filtrar por estado
    if (this.filters.estado !== 'todos') {
      filtered = filtered.filter(f => {
        if (this.filters.estado === 'pendientes') return !f.pagada;
        if (this.filters.estado === 'pagadas') return f.pagada;
        if (this.filters.estado === 'vencidas') {
          return !f.pagada && new Date(f.vence_en) < new Date();
        }
        return f.estado === this.filters.estado;
      });
    }

    // Filtrar por período
    if (this.filters.periodo !== 'todos') {
      const ahora = new Date();
      let desde, hasta;

      if (this.filters.periodo === 'mes_actual') {
        desde = new Date(ahora.getFullYear(), ahora.getMonth(), 1);
        hasta = new Date(ahora.getFullYear(), ahora.getMonth() + 1, 0);
      } else if (this.filters.periodo === 'ultimos_3_meses') {
        desde = new Date(ahora.getTime() - 90 * 24 * 60 * 60 * 1000);
        hasta = ahora;
      } else if (this.filters.periodo === 'ultimo_ano') {
        desde = new Date(ahora.getFullYear() - 1, ahora.getMonth(), ahora.getDate());
        hasta = ahora;
      }

      if (desde && hasta) {
        filtered = filtered.filter(f => {
          const fecha = new Date(f.creada_en);
          return fecha >= desde && fecha <= hasta;
        });
      }
    }

    // Buscar
    if (this.searchQuery) {
      filtered = filtered.filter(f =>
        f.cliente_nombre.toLowerCase().includes(this.searchQuery) ||
        f.id.toLowerCase().includes(this.searchQuery) ||
        f.numero_comprobante.toLowerCase().includes(this.searchQuery)
      );
    }

    this.filteredData = filtered;
  }

  /**
   * Renderiza tabla
   */
  renderFacturasTable() {
    const container = document.getElementById('facturasTable');
    if (!container) return;

    if (this.filteredData.length === 0) {
      container.innerHTML = '<div class="alert alert-info">No hay facturas</div>';
      return;
    }

    const rows = this.filteredData.map(f => {
      const vencida = !f.pagada && new Date(f.vence_en) < new Date();
      const rowClass = vencida ? 'table-danger' : '';
      const stateBadge = f.pagada
        ? '<span class="badge bg-success">Pagada</span>'
        : '<span class="badge bg-warning">Pendiente</span>';

      return `
        <tr class="${rowClass}">
          <td>
            <strong>${f.id}</strong><br/>
            <small>${f.cliente_nombre}</small>
          </td>
          <td>${formatDate(f.creada_en)}</td>
          <td>${formatCurrency(f.monto)}</td>
          <td>
            ${stateBadge}<br/>
            <small>${vencida ? '⚠️ VENCIDA' : formatDate(f.vence_en)}</small>
          </td>
          <td>
            <button class="btn btn-sm btn-primary" onclick="billingManager.handleVer('${f.id}')">
              <i class="bi bi-eye"></i> Ver
            </button>
            ${!f.pagada ? `
              <button class="btn btn-sm btn-success" onclick="billingManager.handleRegistrarPago('${f.id}')">
                <i class="bi bi-check-circle"></i> Pagar
              </button>
            ` : ''}
            <button class="btn btn-sm btn-info" onclick="billingManager.handleEnviar('${f.id}')">
              <i class="bi bi-envelope"></i> Enviar
            </button>
          </td>
        </tr>
      `;
    }).join('');

    container.innerHTML = `
      <table class="table table-striped table-hover">
        <thead>
          <tr>
            <th>Factura / Cliente</th>
            <th>Fecha</th>
            <th>Monto</th>
            <th>Estado</th>
            <th>Acciones</th>
          </tr>
        </thead>
        <tbody>
          ${rows}
        </tbody>
      </table>
    `;
  }

  /**
   * Renderiza dashboard
   */
  renderDashboard() {
    const container = document.getElementById('billingDashboard');
    if (!container) return;

    const html = `
      <div class="row g-3">
        <div class="col-md-3">
          <div class="card">
            <div class="card-body">
              <h6 class="text-muted">Total Ingresos</h6>
              <h3>${formatCurrency(this.reportData.totalIngresos)}</h3>
              <small class="text-success">Pagos confirmados</small>
            </div>
          </div>
        </div>
        <div class="col-md-3">
          <div class="card">
            <div class="card-body">
              <h6 class="text-muted">Mes Actual</h6>
              <h3>${formatCurrency(this.getIngresosMesActual())}</h3>
              <small class="text-info">Hasta la fecha</small>
            </div>
          </div>
        </div>
        <div class="col-md-3">
          <div class="card">
            <div class="card-body">
              <h6 class="text-muted">Pendientes</h6>
              <h3>${formatCurrency(this.reportData.facturasPendientes)}</h3>
              <small class="text-warning">${this.facturasData.filter(f => !f.pagada).length} facturas</small>
            </div>
          </div>
        </div>
        <div class="col-md-3">
          <div class="card">
            <div class="card-body">
              <h6 class="text-muted">Vencidas</h6>
              <h3 class="text-danger">${formatCurrency(this.getFacturasVencidas().reduce((sum, f) => sum + f.monto, 0))}</h3>
              <small class="text-danger">${this.getFacturasVencidas().length} facturas</small>
            </div>
          </div>
        </div>
      </div>
    `;

    container.innerHTML = html;
  }

  /**
   * Attach events
   */
  attachEvents() {
    const searchInput = document.getElementById('searchFacturas');
    if (searchInput) {
      searchInput.addEventListener('input', (e) => {
        this.searchFacturas(e.target.value);
        this.renderFacturasTable();
      });
    }

    const filterEstado = document.getElementById('filterEstado');
    if (filterEstado) {
      filterEstado.addEventListener('change', (e) => {
        this.filters.estado = e.target.value;
        this.applyFilters();
        this.renderFacturasTable();
      });
    }

    const filterPeriodo = document.getElementById('filterPeriodo');
    if (filterPeriodo) {
      filterPeriodo.addEventListener('change', (e) => {
        this.filters.periodo = e.target.value;
        this.applyFilters();
        this.renderFacturasTable();
      });
    }
  }

  /**
   * Handlers
   */
  handleVer(id) {
    alert('Ver factura: ' + id);
  }

  handleRegistrarPago(id) {
    alert('Registrar pago: ' + id);
  }

  handleEnviar(id) {
    alert('Enviar por email: ' + id);
  }

  /**
   * Mensajes
   */
  showError(message) {
    const container = document.getElementById('alertas');
    if (container) {
      const alert = document.createElement('div');
      alert.className = 'alert alert-danger alert-dismissible fade show';
      alert.innerHTML = `${message} <button type="button" class="btn-close" data-bs-dismiss="alert"></button>`;
      container.appendChild(alert);
      setTimeout(() => alert.remove(), 5000);
    }
  }

  showSuccess(message) {
    const container = document.getElementById('alertas');
    if (container) {
      const alert = document.createElement('div');
      alert.className = 'alert alert-success alert-dismissible fade show';
      alert.innerHTML = `${message} <button type="button" class="btn-close" data-bs-dismiss="alert"></button>`;
      container.appendChild(alert);
      setTimeout(() => alert.remove(), 5000);
    }
  }
}

// Instancia global
const billingManager = new BillingManager();
