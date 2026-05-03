/**
 * Clientes Manager
 * Gestiona todas las operaciones CRUD para clientes en Firestore
 * Integración con helpers de Fase 2B para creación automatizada
 */

class ClientesManager {
  constructor() {
    this.clientesData = [];
    this.filteredData = [];
    this.currentCliente = null;
    this.searchQuery = '';
    this.filters = {
      estado: 'todos',
      plan: 'todos'
    };
  }

  /**
   * Inicializa el manager y carga datos
   */
  async init() {
    try {
      console.log('📋 Inicializando ClientesManager...');
      await this.loadClientes();
      this.renderClientesTable();
      this.attachEvents();
      console.log('✅ ClientesManager iniciado');
    } catch (error) {
      console.error('❌ Error iniciando ClientesManager:', error);
      this.showError('Error al inicializar manager: ' + error.message);
    }
  }

  /**
   * Carga todos los clientes de Firestore
   */
  async loadClientes() {
    try {
      const snapshot = await db.collection('clientes').get();
      this.clientesData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      this.applyFilters();
      console.log(`📊 Cargados ${this.clientesData.length} clientes`);
    } catch (error) {
      console.error('Error cargando clientes:', error);
      throw error;
    }
  }

  /**
   * Obtiene un cliente específico
   */
  async getCliente(clienteId) {
    try {
      const doc = await db.collection('clientes').doc(clienteId).get();
      if (doc.exists) {
        return { id: doc.id, ...doc.data() };
      }
      throw new Error('Cliente no encontrado');
    } catch (error) {
      console.error('Error obteniendo cliente:', error);
      throw error;
    }
  }

  /**
   * Obtiene suscripción activa del cliente
   */
  async getClienteSuscripcion(clienteId) {
    try {
      const snapshot = await db.collection('subscripciones')
        .where('cliente_id', '==', clienteId)
        .where('activa', '==', true)
        .limit(1)
        .get();
      
      if (snapshot.docs.length > 0) {
        return { id: snapshot.docs[0].id, ...snapshot.docs[0].data() };
      }
      return null;
    } catch (error) {
      console.error('Error obteniendo suscripción:', error);
      return null;
    }
  }

  /**
   * Crea un nuevo cliente
   * Llamará a helper de Fase 2B o crear-cliente.ps1
   */
  async createCliente(clienteData) {
    try {
      // Validar datos básicos
      if (!clienteData.nombre || !clienteData.email || !clienteData.plan) {
        throw new Error('Faltan datos requeridos: nombre, email, plan');
      }

      if (!isValidEmail(clienteData.email)) {
        throw new Error('Email inválido');
      }

      // Validar plan
      const planesValidos = ['basico', 'profesional', 'enterprise'];
      if (!planesValidos.includes(clienteData.plan)) {
        throw new Error('Plan inválido');
      }

      console.log('🚀 Creando cliente:', clienteData.nombre);

      // Crear documento en Firestore
      const clienteId = generateId('cli');
      const ahora = new Date().toISOString();

      const nuevoCliente = {
        id: clienteId,
        nombre: clienteData.nombre,
        email: clienteData.email,
        plan: clienteData.plan,
        estado: 'activo',
        ciudad: clienteData.ciudad || '',
        telefono: clienteData.telefono || '',
        created_at: ahora,
        updated_at: ahora,
        firebase_project_id: '', // Se llenará después por helper
        api_key: '', // Se llenará después por helper
        usuarios_creados: []
      };

      // Guardar en Firestore
      await db.collection('clientes').doc(clienteId).set(nuevoCliente);
      console.log('✅ Cliente creado en Firestore:', clienteId);

      // Llamar helper para crear usuarios y stuff (FASE 2B)
      // TODO: Implementar integración con crear-cliente.ps1
      await this.executeClienteHelper(clienteId, nuevoCliente);

      // Recargar tabla
      await this.loadClientes();
      this.showSuccess(`Cliente "${clienteData.nombre}" creado exitosamente`);

      return { id: clienteId, ...nuevoCliente };
    } catch (error) {
      console.error('Error creando cliente:', error);
      throw error;
    }
  }

  /**
   * Ejecuta helper de Fase 2B para completar creación
   */
  async executeClienteHelper(clienteId, clienteData) {
    try {
      // Llamar endpoint que ejecuta crear-cliente.ps1
      // Este endpoint debe estar en Cloud Functions o servidor Node.js
      
      const response = await fetch('/api/clientes/crear-helper', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clienteId,
          nombre: clienteData.nombre,
          plan: clienteData.plan,
          email: clienteData.email
        })
      });

      if (!response.ok) {
        console.warn('Helper no disponible, continuando sin.');
        return;
      }

      const result = await response.json();
      console.log('✅ Helper completado:', result);

      // Actualizar cliente con datos del helper
      if (result.firebase_project_id) {
        await db.collection('clientes').doc(clienteId).update({
          firebase_project_id: result.firebase_project_id,
          api_key: result.api_key,
          usuarios_creados: result.usuarios_creados || []
        });
      }
    } catch (error) {
      console.warn('Warning: Helper ejecutado parcialmente:', error.message);
      // No fallamos la creación si helper falla
    }
  }

  /**
   * Actualiza un cliente
   */
  async updateCliente(clienteId, updateData) {
    try {
      if (!clienteId) throw new Error('Cliente ID requerido');

      // Validar datos si se modifican campos sensibles
      if (updateData.email && !isValidEmail(updateData.email)) {
        throw new Error('Email inválido');
      }

      if (updateData.plan) {
        const planesValidos = ['basico', 'profesional', 'enterprise'];
        if (!planesValidos.includes(updateData.plan)) {
          throw new Error('Plan inválido');
        }
      }

      const updateWithTimestamp = {
        ...updateData,
        updated_at: new Date().toISOString()
      };

      await db.collection('clientes').doc(clienteId).update(updateWithTimestamp);
      console.log('✅ Cliente actualizado:', clienteId);

      // Recargar datos
      await this.loadClientes();
      this.showSuccess('Cliente actualizado exitosamente');

      return true;
    } catch (error) {
      console.error('Error actualizando cliente:', error);
      throw error;
    }
  }

  /**
   * Suspende un cliente (soft delete)
   */
  async suspenderCliente(clienteId) {
    try {
      await this.updateCliente(clienteId, { estado: 'suspendido' });
      console.log('⏸️  Cliente suspendido:', clienteId);
    } catch (error) {
      console.error('Error suspendiendo cliente:', error);
      throw error;
    }
  }

  /**
   * Reactiva un cliente
   */
  async reactivarCliente(clienteId) {
    try {
      await this.updateCliente(clienteId, { estado: 'activo' });
      console.log('▶️  Cliente reactivado:', clienteId);
    } catch (error) {
      console.error('Error reactivando cliente:', error);
      throw error;
    }
  }

  /**
   * Elimina un cliente (hard delete - requiere confirmación)
   */
  async deleteCliente(clienteId) {
    try {
      if (!confirm('⚠️ ¿Eliminar cliente? Esta acción no se puede deshacer.')) {
        return false;
      }

      await db.collection('clientes').doc(clienteId).delete();
      console.log('🗑️  Cliente eliminado:', clienteId);

      await this.loadClientes();
      this.showSuccess('Cliente eliminado');

      return true;
    } catch (error) {
      console.error('Error eliminando cliente:', error);
      throw error;
    }
  }

  /**
   * Busca clientes
   */
  searchClientes(query) {
    this.searchQuery = query.toLowerCase();
    this.applyFilters();
  }

  /**
   * Aplica filtros y búsqueda
   */
  applyFilters() {
    let filtered = [...this.clientesData];

    // Filtrar por estado
    if (this.filters.estado !== 'todos') {
      filtered = filtered.filter(c => c.estado === this.filters.estado);
    }

    // Filtrar por plan
    if (this.filters.plan !== 'todos') {
      filtered = filtered.filter(c => c.plan === this.filters.plan);
    }

    // Buscar por nombre o email
    if (this.searchQuery) {
      filtered = filtered.filter(c =>
        c.nombre.toLowerCase().includes(this.searchQuery) ||
        c.email.toLowerCase().includes(this.searchQuery) ||
        c.id.toLowerCase().includes(this.searchQuery)
      );
    }

    this.filteredData = filtered;
  }

  /**
   * Renderiza tabla de clientes
   */
  renderClientesTable() {
    const container = document.getElementById('clientesTable');
    if (!container) return;

    if (this.filteredData.length === 0) {
      container.innerHTML = `
        <div class="alert alert-info">
          <i class="bi bi-info-circle"></i> No hay clientes para mostrar
        </div>
      `;
      return;
    }

    const rows = this.filteredData.map(cliente => `
      <tr>
        <td>
          <strong>${cliente.nombre}</strong>
          <br/>
          <small class="text-muted">${cliente.id}</small>
        </td>
        <td>${cliente.email}</td>
        <td>
          <span class="badge bg-info">${cliente.plan}</span>
        </td>
        <td>
          <span class="badge ${cliente.estado === 'activo' ? 'bg-success' : 'bg-warning'}">
            ${cliente.estado}
          </span>
        </td>
        <td>${formatDate(cliente.created_at)}</td>
        <td>
          <button class="btn btn-sm btn-primary" onclick="clientesManager.handleVerCliente('${cliente.id}')">
            <i class="bi bi-eye"></i> Ver
          </button>
          <button class="btn btn-sm btn-warning" onclick="clientesManager.handleEditarCliente('${cliente.id}')">
            <i class="bi bi-pencil"></i> Editar
          </button>
          <button class="btn btn-sm btn-${cliente.estado === 'activo' ? 'outline-danger' : 'outline-success'}" 
                  onclick="clientesManager.handleToggleSuspender('${cliente.id}')">
            <i class="bi bi-${cliente.estado === 'activo' ? 'pause' : 'play'}"></i>
          </button>
        </td>
      </tr>
    `).join('');

    container.innerHTML = `
      <table class="table table-striped table-hover">
        <thead>
          <tr>
            <th>Nombre / ID</th>
            <th>Email</th>
            <th>Plan</th>
            <th>Estado</th>
            <th>Creado</th>
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
   * Attach event listeners
   */
  attachEvents() {
    // Buscador
    const searchInput = document.getElementById('searchClientes');
    if (searchInput) {
      searchInput.addEventListener('input', (e) => {
        this.searchClientes(e.target.value);
        this.renderClientesTable();
      });
    }

    // Filtro estado
    const filterEstado = document.getElementById('filterEstado');
    if (filterEstado) {
      filterEstado.addEventListener('change', (e) => {
        this.filters.estado = e.target.value;
        this.applyFilters();
        this.renderClientesTable();
      });
    }

    // Filtro plan
    const filterPlan = document.getElementById('filterPlan');
    if (filterPlan) {
      filterPlan.addEventListener('change', (e) => {
        this.filters.plan = e.target.value;
        this.applyFilters();
        this.renderClientesTable();
      });
    }

    // Botón crear cliente
    const btnCrear = document.getElementById('btnCrearCliente');
    if (btnCrear) {
      btnCrear.addEventListener('click', () => this.handleCrearCliente());
    }

    // Form submit crear cliente
    const formCrear = document.getElementById('formCrearCliente');
    if (formCrear) {
      formCrear.addEventListener('submit', (e) => this.handleSubmitCrear(e));
    }
  }

  /**
   * Modal crear cliente
   */
  handleCrearCliente() {
    const modal = document.getElementById('modalCrearCliente');
    if (modal) {
      modal.style.display = 'block';
    }
  }

  /**
   * Submit formulario crear
   */
  async handleSubmitCrear(e) {
    e.preventDefault();

    try {
      showLoading(document.body);

      const nombre = document.getElementById('nombreCliente').value;
      const email = document.getElementById('emailCliente').value;
      const plan = document.getElementById('planCliente').value;
      const ciudad = document.getElementById('ciudadCliente').value;
      const telefono = document.getElementById('telefonoCliente').value;

      await this.createCliente({
        nombre,
        email,
        plan,
        ciudad,
        telefono
      });

      // Limpiar formulario
      document.getElementById('formCrearCliente').reset();

      // Cerrar modal
      const modal = document.getElementById('modalCrearCliente');
      if (modal) modal.style.display = 'none';

      // Renderizar tabla
      this.renderClientesTable();

      hideLoading();
    } catch (error) {
      hideLoading();
      this.showError('Error: ' + error.message);
    }
  }

  /**
   * Ver detalle cliente
   */
  async handleVerCliente(clienteId) {
    try {
      const cliente = await this.getCliente(clienteId);
      const suscripcion = await this.getClienteSuscripcion(clienteId);

      // Guardar para editar
      this.currentCliente = cliente;

      // Mostrar modal detalle
      this.showClienteDetailModal(cliente, suscripcion);
    } catch (error) {
      this.showError('Error: ' + error.message);
    }
  }

  /**
   * Modal detalle cliente
   */
  showClienteDetailModal(cliente, suscripcion) {
    const modalContent = document.getElementById('clienteDetailContent');
    if (!modalContent) return;

    const estado_color = cliente.estado === 'activo' ? 'success' : 'warning';
    const suscripcion_text = suscripcion 
      ? `${suscripcion.plan.toUpperCase()} - Vence: ${formatDate(suscripcion.expiration_date)}`
      : 'Sin suscripción activa';

    modalContent.innerHTML = `
      <div class="card">
        <div class="card-header bg-primary text-white">
          <h5 class="mb-0">${cliente.nombre}</h5>
        </div>
        <div class="card-body">
          <div class="row mb-3">
            <div class="col-md-6">
              <strong>ID:</strong> ${cliente.id}
            </div>
            <div class="col-md-6">
              <strong>Email:</strong> ${cliente.email}
            </div>
          </div>
          <div class="row mb-3">
            <div class="col-md-6">
              <strong>Ciudad:</strong> ${cliente.ciudad || '-'}
            </div>
            <div class="col-md-6">
              <strong>Teléfono:</strong> ${cliente.telefono || '-'}
            </div>
          </div>
          <div class="row mb-3">
            <div class="col-md-6">
              <strong>Estado:</strong>
              <span class="badge bg-${estado_color}">${cliente.estado}</span>
            </div>
            <div class="col-md-6">
              <strong>Suscripción:</strong>
              <span class="badge bg-info">${suscripcion_text}</span>
            </div>
          </div>
          <div class="row">
            <div class="col-md-6">
              <strong>Creado:</strong> ${formatDate(cliente.created_at)}
            </div>
            <div class="col-md-6">
              <strong>Actualizado:</strong> ${formatDate(cliente.updated_at)}
            </div>
          </div>
        </div>
      </div>
    `;

    const modal = document.getElementById('modalClienteDetail');
    if (modal) modal.style.display = 'block';
  }

  /**
   * Editar cliente
   */
  handleEditarCliente(clienteId) {
    // TODO: Implementar formulario de edición
    alert('Edición de cliente - próximamente implementado');
  }

  /**
   * Toggle suspender/reactivar
   */
  async handleToggleSuspender(clienteId) {
    try {
      const cliente = await this.getCliente(clienteId);
      if (cliente.estado === 'activo') {
        await this.suspenderCliente(clienteId);
      } else {
        await this.reactivarCliente(clienteId);
      }
      this.renderClientesTable();
    } catch (error) {
      this.showError('Error: ' + error.message);
    }
  }

  /**
   * Mostrar error
   */
  showError(message) {
    console.error(message);
    const container = document.getElementById('alertas');
    if (container) {
      const alert = document.createElement('div');
      alert.className = 'alert alert-danger alert-dismissible fade show';
      alert.innerHTML = `
        <i class="bi bi-exclamation-circle"></i> ${message}
        <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
      `;
      container.appendChild(alert);
      setTimeout(() => alert.remove(), 5000);
    }
  }

  /**
   * Mostrar éxito
   */
  showSuccess(message) {
    console.log(message);
    const container = document.getElementById('alertas');
    if (container) {
      const alert = document.createElement('div');
      alert.className = 'alert alert-success alert-dismissible fade show';
      alert.innerHTML = `
        <i class="bi bi-check-circle"></i> ${message}
        <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
      `;
      container.appendChild(alert);
      setTimeout(() => alert.remove(), 5000);
    }
  }
}

// Instancia global
const clientesManager = new ClientesManager();
