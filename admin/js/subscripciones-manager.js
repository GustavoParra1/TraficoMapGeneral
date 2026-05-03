/**
 * Subscripciones Manager
 * Gestiona suscripciones, cambios de plan, renovaciones
 */

class SubscripcionesManager {
  constructor() {
    this.subscripcionesData = [];
    this.filteredData = [];
    this.searchQuery = '';
    this.filters = {
      estado: 'todos',
      plan: 'todos'
    };
  }

  /**
   * Inicializa y carga datos
   */
  async init() {
    try {
      console.log('📋 Inicializando SubscripcionesManager...');
      await this.loadSubscripciones();
      this.renderSubscripcionesTable();
      this.attachEvents();
      console.log('✅ SubscripcionesManager iniciado');
    } catch (error) {
      console.error('❌ Error inicializando SubscripcionesManager:', error);
      this.showError('Error: ' + error.message);
    }
  }

  /**
   * Carga todas las suscripciones con info de cliente
   */
  async loadSubscripciones() {
    try {
      const snapshot = await db.collection('subscripciones').get();
      
      // Cargar datos de cliente para cada suscripción
      this.subscripcionesData = await Promise.all(
        snapshot.docs.map(async (doc) => {
          const sub = doc.data();
          let cliente = {};
          
          if (sub.cliente_id) {
            const clienteDoc = await db.collection('clientes').doc(sub.cliente_id).get();
            if (clienteDoc.exists) {
              cliente = clienteDoc.data();
            }
          }
          
          return {
            id: doc.id,
            ...sub,
            cliente_nombre: cliente.nombre || 'Desconocido',
            cliente_email: cliente.email || ''
          };
        })
      );

      this.applyFilters();
      console.log(`📊 Cargadas ${this.subscripcionesData.length} suscripciones`);
    } catch (error) {
      console.error('Error cargando suscripciones:', error);
      throw error;
    }
  }

  /**
   * Obtiene una suscripción
   */
  async getSubscripcion(subscripcionId) {
    try {
      const doc = await db.collection('subscripciones').doc(subscripcionId).get();
      if (doc.exists) {
        return { id: doc.id, ...doc.data() };
      }
      throw new Error('Suscripción no encontrada');
    } catch (error) {
      console.error('Error obteniendo suscripción:', error);
      throw error;
    }
  }

  /**
   * Obtiene suscripciones de un cliente
   */
  async getSubscripcionesCliente(clienteId) {
    try {
      const snapshot = await db.collection('subscripciones')
        .where('cliente_id', '==', clienteId)
        .get();
      
      return snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
    } catch (error) {
      console.error('Error obteniendo suscripciones del cliente:', error);
      return [];
    }
  }

  /**
   * Crea una nueva suscripción
   */
  async createSubscripcion(subscripcionData) {
    try {
      if (!subscripcionData.cliente_id || !subscripcionData.plan) {
        throw new Error('Faltan datos requeridos: cliente_id, plan');
      }

      const subscripcionId = generateId('sub');
      const ahora = new Date();
      const vencimiento = new Date(ahora.setFullYear(ahora.getFullYear() + 1));

      const precios = {
        basico: 1000,
        profesional: 5000,
        enterprise: 15000
      };

      const nuevaSuscripcion = {
        id: subscripcionId,
        cliente_id: subscripcionData.cliente_id,
        plan: subscripcionData.plan,
        precio_mensual: precios[subscripcionData.plan] || 0,
        precio_anual: (precios[subscripcionData.plan] || 0) * 12,
        expiration_date: vencimiento.toISOString(),
        activa: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        renovaciones: 0,
        cambios_plan: []
      };

      await db.collection('subscripciones').doc(subscripcionId).set(nuevaSuscripcion);
      console.log('✅ Suscripción creada:', subscripcionId);

      // Crear entrada inicial en billing
      await this.createBillingEntry(subscripcionId, nuevaSuscripcion);

      await this.loadSubscripciones();
      this.showSuccess(`Suscripción ${subscripcionData.plan} creada`);

      return { id: subscripcionId, ...nuevaSuscripcion };
    } catch (error) {
      console.error('Error creando suscripción:', error);
      throw error;
    }
  }

  /**
   * Crea entrada en billing (factura)
   */
  async createBillingEntry(subscripcionId, subscripcion) {
    try {
      const factura = {
        id: generateId('fac'),
        subscripcion_id: subscripcionId,
        cliente_id: subscripcion.cliente_id,
        monto: subscripcion.precio_anual,
        moneda: 'ARS',
        periodo_desde: new Date().toISOString(),
        periodo_hasta: subscripcion.expiration_date,
        estado: 'pendiente',
        creada_en: new Date().toISOString(),
        vence_en: subscripcion.expiration_date,
        pagada: false,
        fecha_pago: null
      };

      await db.collection('billing').add(factura);
      console.log('✅ Factura creada:', factura.id);
    } catch (error) {
      console.warn('Warning creando factura:', error.message);
    }
  }

  /**
   * Cambia el plan de una suscripción
   */
  async cambiarPlan(subscripcionId, nuevoPlan) {
    try {
      if (!['basico', 'profesional', 'enterprise'].includes(nuevoPlan)) {
        throw new Error('Plan inválido');
      }

      const subscripcion = await this.getSubscripcion(subscripcionId);
      const precios = {
        basico: 1000,
        profesional: 5000,
        enterprise: 15000
      };

      const cambio = {
        fecha: new Date().toISOString(),
        plan_anterior: subscripcion.plan,
        plan_nuevo: nuevoPlan,
        precio_anterior: subscripcion.precio_mensual,
        precio_nuevo: precios[nuevoPlan]
      };

      await db.collection('subscripciones').doc(subscripcionId).update({
        plan: nuevoPlan,
        precio_mensual: precios[nuevoPlan],
        precio_anual: precios[nuevoPlan] * 12,
        updated_at: new Date().toISOString(),
        cambios_plan: [...(subscripcion.cambios_plan || []), cambio]
      });

      console.log('✅ Plan cambiado:', subscripcionId);
      await this.loadSubscripciones();
      this.showSuccess(`Plan actualizado a ${nuevoPlan}`);

      return true;
    } catch (error) {
      console.error('Error cambiando plan:', error);
      throw error;
    }
  }

  /**
   * Renueva una suscripción (extiende 1 año)
   */
  async renovarSubscripcion(subscripcionId) {
    try {
      const subscripcion = await this.getSubscripcion(subscripcionId);
      const fechaExpiracion = new Date(subscripcion.expiration_date);
      const nuevoVencimiento = new Date(fechaExpiracion.setFullYear(fechaExpiracion.getFullYear() + 1));

      await db.collection('subscripciones').doc(subscripcionId).update({
        expiration_date: nuevoVencimiento.toISOString(),
        renovaciones: (subscripcion.renovaciones || 0) + 1,
        updated_at: new Date().toISOString(),
        activa: true
      });

      console.log('✅ Suscripción renovada:', subscripcionId);

      // Crear nueva factura
      await this.createBillingEntry(subscripcionId, {
        ...subscripcion,
        expiration_date: nuevoVencimiento.toISOString()
      });

      await this.loadSubscripciones();
      this.showSuccess('Suscripción renovada por 1 año');

      return true;
    } catch (error) {
      console.error('Error renovando:', error);
      throw error;
    }
  }

  /**
   * Cancela una suscripción
   */
  async cancelarSubscripcion(subscripcionId) {
    try {
      if (!confirm('⚠️ ¿Cancelar suscripción? El cliente perderá acceso.')) {
        return false;
      }

      await db.collection('subscripciones').doc(subscripcionId).update({
        activa: false,
        estado: 'cancelada',
        updated_at: new Date().toISOString(),
        fecha_cancelacion: new Date().toISOString()
      });

      console.log('🔴 Suscripción cancelada:', subscripcionId);
      await this.loadSubscripciones();
      this.showSuccess('Suscripción cancelada');

      return true;
    } catch (error) {
      console.error('Error cancelando:', error);
      throw error;
    }
  }

  /**
   * Obtiene suscripciones próximas a vencer
   */
  getProximasVencer(dias = 30) {
    const hoy = new Date();
    const limite = new Date(hoy.setDate(hoy.getDate() + dias));

    return this.subscripcionesData.filter(sub => {
      if (!sub.activa) return false;
      const exp = new Date(sub.expiration_date);
      return exp <= limite && exp > new Date();
    });
  }

  /**
   * Busca suscripciones
   */
  searchSubscripciones(query) {
    this.searchQuery = query.toLowerCase();
    this.applyFilters();
  }

  /**
   * Aplica filtros
   */
  applyFilters() {
    let filtered = [...this.subscripcionesData];

    // Filtrar por estado
    if (this.filters.estado !== 'todos') {
      filtered = filtered.filter(s => {
        if (this.filters.estado === 'activa') return s.activa;
        if (this.filters.estado === 'proxima_vencer') {
          return this.getProximasVencer(30).some(p => p.id === s.id);
        }
        return s.estado === this.filters.estado;
      });
    }

    // Filtrar por plan
    if (this.filters.plan !== 'todos') {
      filtered = filtered.filter(s => s.plan === this.filters.plan);
    }

    // Buscar
    if (this.searchQuery) {
      filtered = filtered.filter(s =>
        s.cliente_nombre.toLowerCase().includes(this.searchQuery) ||
        s.cliente_email.toLowerCase().includes(this.searchQuery) ||
        s.plan.toLowerCase().includes(this.searchQuery)
      );
    }

    this.filteredData = filtered;
  }

  /**
   * Renderiza tabla
   */
  renderSubscripcionesTable() {
    const container = document.getElementById('subscripcionesTable');
    if (!container) return;

    if (this.filteredData.length === 0) {
      container.innerHTML = '<div class="alert alert-info">No hay suscripciones para mostrar</div>';
      return;
    }

    const rows = this.filteredData.map(sub => {
      const expDate = new Date(sub.expiration_date);
      const hoy = new Date();
      const diasRestantes = Math.ceil((expDate - hoy) / (1000 * 60 * 60 * 24));
      const alertClass = diasRestantes < 30 ? 'table-warning' : '';
      const badgeClasS = diasRestantes < 30 ? 'bg-warning' : 'bg-success';

      return `
        <tr class="${alertClass}">
          <td>
            <strong>${sub.cliente_nombre}</strong>
            <br/>
            <small class="text-muted">${sub.cliente_id}</small>
          </td>
          <td>
            <span class="badge bg-info">${sub.plan}</span>
          </td>
          <td>${formatCurrency(sub.precio_mensual)}/mes</td>
          <td>
            <span class="badge ${badgeClasS}">
              ${diasRestantes > 0 ? `${diasRestantes}d` : 'Vencida'}
            </span>
            <br/>
            <small>${formatDate(sub.expiration_date)}</small>
          </td>
          <td>
            <span class="badge ${sub.activa ? 'bg-success' : 'bg-danger'}">
              ${sub.activa ? 'Activa' : 'Inactiva'}
            </span>
          </td>
          <td>
            <button class="btn btn-sm btn-primary" onclick="subscripcionesManager.handleDetalles('${sub.id}')">
              <i class="bi bi-eye"></i> Ver
            </button>
            <button class="btn btn-sm btn-warning" onclick="subscripcionesManager.handleCambiarPlan('${sub.id}')">
              <i class="bi bi-arrow-repeat"></i> Plan
            </button>
            ${sub.activa ? `
              <button class="btn btn-sm btn-success" onclick="subscripcionesManager.handleRenovar('${sub.id}')">
                <i class="bi bi-check-circle"></i> Renovar
              </button>
            ` : ''}
          </td>
        </tr>
      `;
    }).join('');

    container.innerHTML = `
      <table class="table table-striped table-hover">
        <thead>
          <tr>
            <th>Cliente</th>
            <th>Plan</th>
            <th>Precio</th>
            <th>Vencimiento</th>
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
   * Attach events
   */
  attachEvents() {
    const searchInput = document.getElementById('searchSubscripciones');
    if (searchInput) {
      searchInput.addEventListener('input', (e) => {
        this.searchSubscripciones(e.target.value);
        this.renderSubscripcionesTable();
      });
    }

    const filterEstado = document.getElementById('filterEstado');
    if (filterEstado) {
      filterEstado.addEventListener('change', (e) => {
        this.filters.estado = e.target.value;
        this.applyFilters();
        this.renderSubscripcionesTable();
      });
    }

    const filterPlan = document.getElementById('filterPlan');
    if (filterPlan) {
      filterPlan.addEventListener('change', (e) => {
        this.filters.plan = e.target.value;
        this.applyFilters();
        this.renderSubscripcionesTable();
      });
    }
  }

  /**
   * Handlers para botones
   */
  async handleDetalles(id) {
    const sub = await this.getSubscripcion(id);
    alert(`Plan: ${sub.plan}\nPrecio: ${formatCurrency(sub.precio_mensual)}/mes\nVence: ${formatDate(sub.expiration_date)}`);
  }

  async handleCambiarPlan(id) {
    const plan = prompt('Nuevo plan (basico/profesional/enterprise):');
    if (plan) {
      try {
        await this.cambiarPlan(id, plan);
        this.renderSubscripcionesTable();
      } catch (error) {
        this.showError('Error: ' + error.message);
      }
    }
  }

  async handleRenovar(id) {
    if (confirm('¿Renovar suscripción por 1 año?')) {
      try {
        await this.renovarSubscripcion(id);
        this.renderSubscripcionesTable();
      } catch (error) {
        this.showError('Error: ' + error.message);
      }
    }
  }

  /**
   * Mostrar mensajes
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
const subscripcionesManager = new SubscripcionesManager();
