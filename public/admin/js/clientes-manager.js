/**
 * Clientes Manager (v2)
 * Gestiona todas las operaciones CRUD para clientes en Firestore
 * Integración con Cloud Functions admin API
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
      console.log('📋 [ClientesManager.init] ========== INICIANDO ==========');
      
      console.log('📋 [ClientesManager.init] Paso 1: Cargando clientes...');
      const loadSuccess = await this.loadClientes();
      if (loadSuccess) {
        console.log('✅ [ClientesManager.init] Clientes cargados exitosamente');
      } else {
        console.warn('⚠️ [ClientesManager.init] Carga de clientes no exitosa, continuando...');
      }
      
      console.log('📋 [ClientesManager.init] Paso 2: Renderizando tabla...');
      this.renderClientesTable();
      console.log('✅ [ClientesManager.init] Tabla renderizada exitosamente');
      
      console.log('📋 [ClientesManager.init] Paso 3: Adjuntando eventos...');
      this.attachEvents();
      console.log('✅ [ClientesManager.init] Eventos adjuntados exitosamente');
      
      console.log('✅ [ClientesManager.init] ========== INICIALIZACIÓN COMPLETA ==========');
    } catch (error) {
      console.error('❌ [ClientesManager.init] Error CRÍTICO durante inicialización:', error);
      console.error('❌ [ClientesManager.init] Error details:', {
        code: error.code,
        message: error.message
      });
    }
  }

  /**
   * Carga todos los clientes de Firestore
   */
  async loadClientes() {
    try {
      console.log("📥 [ClientesManager] Iniciando carga de clientes...");
      console.log("📥 [ClientesManager] Intentando: db.collection('clientes').get()");
      
      const snapshot = await db.collection('clientes').get();
      
      console.log(`✅ [ClientesManager] Query exitosa, documentos encontrados: ${snapshot.size}`);
      
      this.clientesData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      
      this.applyFilters();
      console.log(`📊 [ClientesManager] Cargados ${this.clientesData.length} clientes`);
      
      if (this.clientesData.length === 0) {
        console.warn(`⚠️ [ClientesManager] ADVERTENCIA: No hay clientes en la colección`);
      } else {
        this.clientesData.forEach(c => {
          console.log(`   📌 Cliente: ${c.nombre} (${c.id}) - Estado: ${c.estado}`);
        });
      }
      
      return true;
    } catch (error) {
      console.error('❌ [ClientesManager] Error cargando clientes:', error);
      console.error('❌ [ClientesManager] Error code:', error.code);
      console.error('❌ [ClientesManager] Error message:', error.message);
      
      if (error.code === 'permission-denied') {
        console.error('❌🔐 [ClientesManager] ERROR DE PERMISOS (permission-denied)');
        console.error('   - Las Firestore rules están denegando acceso');
        console.error('   - Verifica que el usuario tenga role=admin en custom claims');
      }
      
      this.clientesData = [];
      this.applyFilters();
      throw error;
    }
  }

  /**
   * Obtiene un cliente específico
   */
  async getCliente(clienteId) {
    try {
      console.log(`   📥 Leyendo cliente: clientes/${clienteId}`);
      const doc = await db.collection('clientes').doc(clienteId).get();
      if (doc.exists) {
        console.log(`   ✅ Cliente encontrado:`, doc.data());
        return { id: doc.id, ...doc.data() };
      }
      throw new Error('Cliente no encontrado');
    } catch (error) {
      console.error('❌ Error obteniendo cliente:', error);
      throw error;
    }
  }

  /**
   * Obtiene suscripción activa del cliente
   */
  async getClienteSuscripcion(clienteId) {
    try {
      console.log(`   📥 Buscando suscripción de: ${clienteId}`);
      const snapshot = await db.collection('subscripciones')
        .where('cliente_id', '==', clienteId)
        .where('activa', '==', true)
        .limit(1)
        .get();
      
      if (snapshot.docs.length > 0) {
        console.log(`   ✅ Suscripción encontrada`);
        return { id: snapshot.docs[0].id, ...snapshot.docs[0].data() };
      }
      console.log(`   ℹ️ Sin suscripción activa`);
      return null;
    } catch (error) {
      console.error('❌ Error obteniendo suscripción:', error);
      return null;
    }
  }

  /**
   * Crea un nuevo cliente usando Cloud Function
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

      // ✅ VALIDAR FIREBASE CONFIG
      if (!clienteData.firebaseConfig) {
        throw new Error('Credenciales de Firebase requeridas');
      }

      const planesValidos = ['basico', 'profesional', 'enterprise'];
      if (!planesValidos.includes(clienteData.plan)) {
        throw new Error('Plan inválido');
      }

      console.log('🚀 Llamando Cloud Function criarCliente:', clienteData.nombre);
      console.log('📱 Firebase Project:', clienteData.firebaseConfig.projectId);

      // ✅ Llamar Cloud Function con credenciales de Firebase
      const response = await fetch(
        'https://us-central1-trafico-map-general-v2.cloudfunctions.net/criarCliente',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            nombreCliente: clienteData.nombre,
            email: clienteData.email,
            plan: clienteData.plan,
            ciudad: clienteData.ciudad || '',
            telefono: clienteData.telefono || '',
            firebaseConfig: clienteData.firebaseConfig  // ✅ ENVIAR CREDENCIALES
          })
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Error creando cliente');
      }

      const resultado = await response.json();

      if (!resultado.success) {
        throw new Error(resultado.error || 'Error en respuesta de servidor');
      }

      console.log('✅ Cliente creado exitosamente:', resultado.cliente.id);
      this.showSuccess(`Cliente ${clienteData.nombre} creado exitosamente`);

      // Recargar tabla
      await this.loadClientes();

      return resultado;

    } catch (error) {
      console.error('❌ Error creando cliente:', error);
      throw error;
    }
  }

  /**
   * Actualiza un cliente
   */
  async updateCliente(clienteId, updateData) {
    try {
      if (!clienteId) throw new Error('Cliente ID requerido');

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

    if (this.filters.estado !== 'todos') {
      filtered = filtered.filter(c => c.estado === this.filters.estado);
    }

    if (this.filters.plan !== 'todos') {
      filtered = filtered.filter(c => c.plan === this.filters.plan);
    }

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
    console.log('📊 [renderClientesTable] Iniciando renderizado...');
    
    const container = document.getElementById('clientesTable');
    console.log('📊 [renderClientesTable] Div container encontrado:', !!container);
    
    if (!container) {
      console.error('❌ [renderClientesTable] NO ENCONTRÉ el div #clientesTable');
      return;
    }

    console.log(`📊 [renderClientesTable] Datos disponibles: ${this.filteredData.length} clientes`);

    if (this.filteredData.length === 0) {
      console.warn('⚠️ [renderClientesTable] No hay clientes para mostrar');
      container.innerHTML = '<div class="alert alert-info"><i class="bi bi-info-circle"></i> No hay clientes</div>';
      return;
    }

    console.log('📊 [renderClientesTable] Generando filas de tabla...');
    const rows = this.filteredData.map(c => {
      try {
        const createdDate = c.created_at || c.createdAt || c.fecha_creacion || null;
        const estado = c.estado || 'activo';
        const plan = c.plan || 'N/A';
        
        return `
          <tr>
            <td><strong>${c.nombre || 'Sin nombre'}</strong><br/><small class="text-muted">${c.id}</small></td>
            <td>${c.email || '-'}</td>
            <td><span class="badge bg-info">${plan}</span></td>
            <td><span class="badge ${estado === 'activo' ? 'bg-success' : 'bg-warning'}">${estado}</span></td>
            <td>${formatDate(createdDate)}</td>
            <td>
              <button class="btn btn-sm btn-primary" onclick="clientesManager.handleVerCliente('${c.id}')"><i class="bi bi-eye"></i></button>
              <button class="btn btn-sm btn-warning" onclick="clientesManager.handleEditarCliente('${c.id}')"><i class="bi bi-pencil"></i></button>
              <button class="btn btn-sm btn-${estado === 'activo' ? 'outline-danger' : 'outline-success'}" onclick="clientesManager.handleToggleSuspender('${c.id}')"><i class="bi bi-${estado === 'activo' ? 'pause' : 'play'}"></i></button>
              <button class="btn btn-sm btn-danger" onclick="clientesManager.handleEliminarCliente('${c.id}', '${c.nombre}')"><i class="bi bi-trash"></i></button>
            </td>
          </tr>
        `;
      } catch (error) {
        console.error(`⚠️ Error renderizando cliente ${c.id}:`, error);
        return `
          <tr>
            <td><strong>${c.nombre || 'Error'}</strong></td>
            <td colspan="5" class="text-danger">Error renderizando fila</td>
          </tr>
        `;
      }
    }).join('');

    console.log(`📊 [renderClientesTable] ${rows.split('<tr>').length - 1} filas generadas`);
    
    const html = `
      <table class="table table-striped table-hover">
        <thead><tr><th>Nombre</th><th>Email</th><th>Plan</th><th>Estado</th><th>Creado</th><th>Acciones</th></tr></thead>
        <tbody>${rows}</tbody>
      </table>
    `;
    
    container.innerHTML = html;
    console.log('✅ [renderClientesTable] Tabla renderizada exitosamente');
  }

  /**
   * Attach event listeners
   */
  attachEvents() {
    const searchInput = document.getElementById('searchClientes');
    if (searchInput) {
      searchInput.addEventListener('input', (e) => {
        this.searchClientes(e.target.value);
        this.renderClientesTable();
      });
    }

    const filterEstado = document.getElementById('filterEstado');
    if (filterEstado) {
      filterEstado.addEventListener('change', (e) => {
        this.filters.estado = e.target.value;
        this.applyFilters();
        this.renderClientesTable();
      });
    }

    const filterPlan = document.getElementById('filterPlan');
    if (filterPlan) {
      filterPlan.addEventListener('change', (e) => {
        this.filters.plan = e.target.value;
        this.applyFilters();
        this.renderClientesTable();
      });
    }

    const btnCrear = document.getElementById('btnCrearCliente');
    if (btnCrear) {
      btnCrear.addEventListener('click', () => this.handleCrearCliente());
    }

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
    if (modal) modal.style.display = 'block';
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
      const ciudad = document.getElementById('ciudadCliente').value || '';
      const telefono = document.getElementById('telefonoCliente').value || '';
      const dominio = document.getElementById('dominioCliente').value || '';

      // ✅ NUEVO: Recolectar credenciales de Firebase
      const firebaseProjectId = document.getElementById('firebaseProjectId').value;
      const firebaseApiKey = document.getElementById('firebaseApiKey').value;
      const firebaseAuthDomain = document.getElementById('firebaseAuthDomain').value;
      const firebaseStorageBucket = document.getElementById('firebaseStorageBucket').value;
      const firebaseMessagingSenderId = document.getElementById('firebaseMessagingSenderId').value;
      const firebaseAppId = document.getElementById('firebaseAppId').value;
      const firebaseDatabaseURL = document.getElementById('firebaseDatabaseURL').value || '';

      // Validar Firebase config
      if (!firebaseProjectId || !firebaseApiKey || !firebaseAuthDomain || !firebaseStorageBucket) {
        throw new Error('Faltan credenciales de Firebase requeridas');
      }

      // Construir objeto firebaseConfig
      const firebaseConfig = {
        apiKey: firebaseApiKey,
        authDomain: firebaseAuthDomain,
        projectId: firebaseProjectId,
        storageBucket: firebaseStorageBucket,
        messagingSenderId: firebaseMessagingSenderId,
        appId: firebaseAppId,
        databaseURL: firebaseDatabaseURL
      };

      console.log('📱 Credenciales de Firebase a enviar:', firebaseConfig);

      await this.createCliente({ 
        nombre, 
        email, 
        plan, 
        ciudad, 
        telefono, 
        dominio,
        firebaseConfig  // ✅ NUEVO: Enviar firebaseConfig
      });

      document.getElementById('formCrearCliente').reset();
      const modal = document.getElementById('modalCrearCliente');
      if (modal) modal.style.display = 'none';
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
      console.log(`👁️ [handleVerCliente] Abriendo detalle de cliente: ${clienteId}`);
      
      console.log('   1️⃣ Obteniendo cliente...');
      const cliente = await this.getCliente(clienteId);
      console.log('   ✅ Cliente obtenido:', cliente);
      
      console.log('   2️⃣ Obteniendo suscripción...');
      const suscripcion = await this.getClienteSuscripcion(clienteId);
      console.log('   ✅ Suscripción obtenida:', suscripcion);
      
      this.currentCliente = cliente;
      
      console.log('   3️⃣ Mostrando modal...');
      this.showClienteDetailModal(cliente, suscripcion);
      console.log('   ✅ Modal mostrado');
      
    } catch (error) {
      console.error(`❌ [handleVerCliente] Error:`, error);
      this.showError('Error: ' + error.message);
    }
  }

  /**
   * Modal detalle cliente
   */
  showClienteDetailModal(cliente, suscripcion) {
    const content = document.getElementById('clienteDetailContent');
    if (!content) return;

    const sub_text = suscripcion 
      ? `${suscripcion.plan.toUpperCase()} - Vence: ${formatDate(suscripcion.expiration_date)}`
      : 'Sin suscripción activa';

    // Obtener credenciales - pueden estar en diferentes campos
    const email_acceso = cliente.email_admin || cliente.email || 'no disponible';
    const contraseña = cliente.contraseña || cliente.password || cliente.contraseña_temporal || '(generada al crear)';
    const url_acceso = cliente.url_acceso || 'https://trafico-map-general-v2.web.app/client/';

    const credentialsHTML = `
      <div class="card mb-3 border-primary">
        <div class="card-header bg-primary text-white">
          <h6 class="mb-0">🔐 Acceso al Panel de Cliente</h6>
        </div>
        <div class="card-body">
          <div class="row mb-2">
            <div class="col-md-6">
              <small class="text-muted">Email (Usuario):</small><br/>
              <code class="bg-light p-2 d-block copy-email">${email_acceso}</code>
            </div>
            <div class="col-md-6">
              <small class="text-muted">Contraseña:</small><br/>
              <code class="bg-light p-2 d-block copy-password">${contraseña}</code>
            </div>
          </div>
          <div class="row">
            <div class="col-12">
              <small class="text-muted">URL de Acceso:</small><br/>
              <code class="bg-light p-2 d-block">${url_acceso}</code>
            </div>
          </div>
          <div class="row mt-3">
            <div class="col-12">
              <button class="btn btn-sm btn-primary btn-copy-email">
                <i class="bi bi-clipboard"></i> Copiar Email
              </button>
              <button class="btn btn-sm btn-primary btn-copy-password">
                <i class="bi bi-clipboard"></i> Copiar Contraseña
              </button>
              <a href="${url_acceso}" target="_blank" class="btn btn-sm btn-success">
                <i class="bi bi-arrow-up-right"></i> Ir al Panel
              </a>
            </div>
          </div>
        </div>
      </div>
    `;

    content.innerHTML = credentialsHTML + `
      <div class="card">
        <div class="card-header bg-primary text-white"><h5 class="mb-0">${cliente.nombre}</h5></div>
        <div class="card-body">
          <div class="row mb-3">
            <div class="col-md-6"><strong>ID:</strong> ${cliente.id}</div>
            <div class="col-md-6"><strong>Email Admin:</strong> ${cliente.email}</div>
          </div>
          <div class="row mb-3">
            <div class="col-md-6"><strong>Ciudad:</strong> ${cliente.ciudad || '-'}</div>
            <div class="col-md-6"><strong>Teléfono:</strong> ${cliente.telefono || '-'}</div>
          </div>
          <div class="row mb-3">
            <div class="col-md-6"><strong>Plan:</strong> <span class="badge bg-info">${cliente.plan || 'N/A'}</span></div>
            <div class="col-md-6"><strong>Estado:</strong> <span class="badge bg-${cliente.estado === 'activo' ? 'success' : 'warning'}">${cliente.estado}</span></div>
          </div>
          <div class="row">
            <div class="col-12"><strong>Suscripción:</strong> <span class="badge bg-info">${sub_text}</span></div>
          </div>
        </div>
      </div>
    `;

    // Agregar event listeners
    const btnCopyEmail = content.querySelector('.btn-copy-email');
    const btnCopyPassword = content.querySelector('.btn-copy-password');
    
    if (btnCopyEmail) {
      btnCopyEmail.addEventListener('click', () => {
        navigator.clipboard.writeText(email_acceso);
        alert('✅ Email copiado');
      });
    }
    
    if (btnCopyPassword) {
      btnCopyPassword.addEventListener('click', () => {
        navigator.clipboard.writeText(contraseña);
        alert('✅ Contraseña copiada');
      });
    }

    const modal = document.getElementById('modalClienteDetail');
    if (modal) {
      console.log('✅ [showClienteDetailModal] Mostrando modal...');
      try {
        const bsModal = new bootstrap.Modal(modal);
        bsModal.show();
        console.log('✅ [showClienteDetailModal] Modal mostrado correctamente');
      } catch (error) {
        console.error('❌ Error mostrando modal:', error);
      }
    } else {
      console.error('❌ [showClienteDetailModal] NO ENCONTRÉ #modalClienteDetail');
    }
  }

  /**
   * Editar cliente
   */
  handleEditarCliente(clienteId) {
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
   * Eliminar cliente
   */
  async handleEliminarCliente(clienteId, nombreCliente) {
    // Pedir confirmación
    const confirmacion = confirm(
      `⚠️ ADVERTENCIA: ¿Deseas eliminar el cliente "${nombreCliente}"?\n\n` +
      `Esto eliminará:\n` +
      `- El cliente\n` +
      `- Su suscripción\n` +
      `- Sus facturas\n\n` +
      `Esta acción NO se puede deshacer.`
    );

    if (!confirmacion) {
      console.log('Eliminación cancelada');
      return;
    }

    try {
      console.log(`🗑️ Eliminando cliente: ${clienteId}`);
      
      showLoading(document.body);

      // Eliminar cliente
      await db.collection('clientes').doc(clienteId).delete();
      console.log('✅ Cliente eliminado');

      // Eliminar suscripciones
      const subSnapshot = await db.collection('subscripciones')
        .where('cliente_id', '==', clienteId)
        .get();
      
      const batch = db.batch();
      subSnapshot.docs.forEach(doc => {
        batch.delete(doc.ref);
      });
      await batch.commit();
      console.log('✅ Suscripciones eliminadas');

      // Eliminar facturas
      const billSnapshot = await db.collection('billing')
        .where('cliente_id', '==', clienteId)
        .get();
      
      const batch2 = db.batch();
      billSnapshot.docs.forEach(doc => {
        batch2.delete(doc.ref);
      });
      await batch2.commit();
      console.log('✅ Facturas eliminadas');

      hideLoading();
      this.showSuccess(`Cliente "${nombreCliente}" eliminado correctamente`);
      
      // Recargar tabla
      await this.loadClientes();
      this.renderClientesTable();

    } catch (error) {
      hideLoading();
      console.error('❌ Error eliminando cliente:', error);
      this.showError('Error al eliminar cliente: ' + error.message);
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
      alert.innerHTML = `<i class="bi bi-exclamation-circle"></i> ${message}<button type="button" class="btn-close" data-bs-dismiss="alert"></button>`;
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
      alert.innerHTML = `<i class="bi bi-check-circle"></i> ${message}<button type="button" class="btn-close" data-bs-dismiss="alert"></button>`;
      container.appendChild(alert);
      setTimeout(() => alert.remove(), 5000);
    }
  }
}

// Instancia global
const clientesManager = new ClientesManager();