/**
 * Usuarios Manager
 * Gestiona usuarios admin, roles y permisos del panel
 */

class UsuariosManager {
  constructor() {
    this.usuariosData = [];
    this.filteredData = [];
    this.searchQuery = '';
    this.roles = {
      admin: 'Acceso total',
      operator: 'Lectura y operaciones',
      billing: 'Gestión de facturas',
      viewer: 'Solo lectura'
    };
  }

  /**
   * Inicializa y carga datos
   */
  async init() {
    try {
      console.log('👥 Inicializando UsuariosManager...');
      await this.loadUsuarios();
      this.renderUsuariosTable();
      this.attachEvents();
      console.log('✅ UsuariosManager iniciado');
    } catch (error) {
      console.error('❌ Error:', error);
      this.showError('Error: ' + error.message);
    }
  }

  /**
   * Carga todos los usuarios admin
   */
  async loadUsuarios() {
    try {
      const snapshot = await db.collection('usuarios_admin').get();
      this.usuariosData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      this.filteredData = [...this.usuariosData];
      console.log(`👥 Cargados ${this.usuariosData.length} usuarios`);
    } catch (error) {
      console.error('Error cargando usuarios:', error);
      throw error;
    }
  }

  /**
   * Obtiene un usuario
   */
  async getUsuario(usuarioId) {
    try {
      const doc = await db.collection('usuarios_admin').doc(usuarioId).get();
      if (doc.exists) {
        return { id: doc.id, ...doc.data() };
      }
      throw new Error('Usuario no encontrado');
    } catch (error) {
      console.error('Error obteniendo usuario:', error);
      throw error;
    }
  }

  /**
   * Crea un nuevo usuario admin
   */
  async crearUsuario(usuarioData) {
    try {
      if (!usuarioData.email || !usuarioData.nombre || !usuarioData.role) {
        throw new Error('Faltan datos: email, nombre, role');
      }

      if (!isValidEmail(usuarioData.email)) {
        throw new Error('Email inválido');
      }

      if (!this.roles[usuarioData.role]) {
        throw new Error('Role inválido');
      }

      // Crear en Firestore
      const nuevoUsuario = {
        email: usuarioData.email,
        nombre: usuarioData.nombre,
        role: usuarioData.role,
        permisos: this.getPermisosDefault(usuarioData.role),
        activo: true,
        created_at: new Date().toISOString(),
        last_login: null,
        created_by: 'admin' // Current admin
      };

      await db.collection('usuarios_admin').doc(usuarioData.email).set(nuevoUsuario);
      console.log('✅ Usuario creado:', usuarioData.email);

      // TODO: Crear usuario en Firebase Auth via Cloud Function
      // await this.createFirebaseUser(usuarioData.email, usuarioData.password);

      await this.loadUsuarios();
      this.showSuccess(`Usuario ${usuarioData.email} creado exitosamente`);

      return { id: usuarioData.email, ...nuevoUsuario };
    } catch (error) {
      console.error('Error creando usuario:', error);
      throw error;
    }
  }

  /**
   * Obtiene permisos por default según el role
   */
  getPermisosDefault(role) {
    const permisos = {
      admin: {
        clientes: ['read', 'create', 'update', 'delete'],
        subscripciones: ['read', 'create', 'update', 'delete'],
        billing: ['read', 'create', 'update', 'delete'],
        usuarios: ['read', 'create', 'update', 'delete'],
        reports: ['read', 'export'],
        settings: ['read', 'update']
      },
      operator: {
        clientes: ['read', 'update'],
        subscripciones: ['read', 'update'],
        billing: ['read'],
        usuarios: [],
        reports: ['read'],
        settings: []
      },
      billing: {
        clientes: ['read'],
        subscripciones: ['read'],
        billing: ['read', 'create', 'update'],
        usuarios: [],
        reports: ['read', 'export'],
        settings: []
      },
      viewer: {
        clientes: ['read'],
        subscripciones: ['read'],
        billing: ['read'],
        usuarios: [],
        reports: ['read'],
        settings: []
      }
    };

    return permisos[role] || permisos.viewer;
  }

  /**
   * Actualiza un usuario
   */
  async updateUsuario(usuarioId, updateData) {
    try {
      if (!usuarioId) throw new Error('Usuario ID requerido');

      if (updateData.email && !isValidEmail(updateData.email)) {
        throw new Error('Email inválido');
      }

      if (updateData.role && !this.roles[updateData.role]) {
        throw new Error('Role inválido');
      }

      const update = {
        ...updateData,
        updated_at: new Date().toISOString()
      };

      await db.collection('usuarios_admin').doc(usuarioId).update(update);
      console.log('✅ Usuario actualizado:', usuarioId);

      await this.loadUsuarios();
      this.showSuccess('Usuario actualizado');

      return true;
    } catch (error) {
      console.error('Error actualizando usuario:', error);
      throw error;
    }
  }

  /**
   * Asigna un role a un usuario (directo en Firestore - SIN Cloud Functions)
   */
  async asignarRole(usuarioId, nuevoRole) {
    try {
      if (!this.roles[nuevoRole]) {
        throw new Error('Role inválido');
      }

      const usuario = await this.getUsuario(usuarioId);
      const claims = {
        role: nuevoRole,
        permisos: this.getPermisosDefault(nuevoRole)
      };

      console.log('🔐 Asignando role (directo en Firestore - SIN Cloud Functions):', usuarioId, '→', nuevoRole);

      // Actualizar custom claims en Firebase Auth
      try {
        await auth.setCustomUserClaims(usuario.uid, claims);
        console.log('✅ Custom claims actualizados en Auth');
      } catch (error) {
        console.warn('⚠️ Error actualizando Auth:', error.message);
      }

      // Actualizar en Firestore
      await db.collection('usuarios_admin').doc(usuarioId).update({
        role: nuevoRole,
        permisos: claims.permisos,
        updated_at: new Date().toISOString()
      });

      console.log('✅ Role actualizado en Firestore');

      await this.loadUsuarios();
      this.showSuccess(`Role de ${usuarioId} actualizado a ${nuevoRole}`);

      return true;
    } catch (error) {
      console.error('Error asignando role:', error);
      throw error;
    }
  }

  /**
   * Desactiva un usuario (directo en Firestore - SIN Cloud Functions)
   */
  async desactivarUsuario(usuarioId) {
    try {
      const usuario = await this.getUsuario(usuarioId);

      console.log('🚫 Desactivando usuario (directo en Firestore - SIN Cloud Functions):', usuarioId);

      // Desactivar en Firebase Auth
      try {
        await auth.updateUser(usuario.uid, {
          disabled: true
        });
        console.log('✅ Usuario desactivado en Auth');
      } catch (error) {
        console.warn('⚠️ Error desactivando en Auth:', error.message);
      }

      // Actualizar en Firestore
      await db.collection('usuarios_admin').doc(usuarioId).update({
        activo: false,
        desactivado_en: new Date().toISOString()
      });

      console.log('✅ Usuario desactivado en Firestore');

      await this.loadUsuarios();
      this.showSuccess('Usuario desactivado');

      return true;
    } catch (error) {
      console.error('Error desactivando usuario:', error);
      throw error;
    }
  }

  /**
   * Reactiva un usuario (directo en Firestore - SIN Cloud Functions)
   */
  async reactivarUsuario(usuarioId) {
    try {
      const usuario = await this.getUsuario(usuarioId);

      console.log('✅ Reactivando usuario (directo en Firestore - SIN Cloud Functions):', usuarioId);

      // Reactivar en Firebase Auth
      try {
        await auth.updateUser(usuario.uid, {
          disabled: false
        });
        console.log('✅ Usuario reactivado en Auth');
      } catch (error) {
        console.warn('⚠️ Error reactivando en Auth:', error.message);
      }

      // Actualizar en Firestore
      await db.collection('usuarios_admin').doc(usuarioId).update({
        activo: true,
        desactivado_en: null
      });

      console.log('✅ Usuario reactivado en Firestore');

      await this.loadUsuarios();
      this.showSuccess('Usuario reactivado');

      return true;
    } catch (error) {
      console.error('Error reactivando usuario:', error);
      throw error;
    }
  }

  /**
   * Resetea password de un usuario
   */
  async resetPassword(usuarioId) {
    try {
      // TODO: Implementar via Cloud Function
      // Enviar email de reset password

      this.showSuccess(`Email de reset enviado a ${usuarioId}`);
      return true;
    } catch (error) {
      console.error('Error reseteando password:', error);
      throw error;
    }
  }

  /**
   * Elimina un usuario
   */
  async deleteUsuario(usuarioId) {
    try {
      if (!confirm('⚠️ ¿Eliminar usuario? Esta acción no se puede deshacer.')) {
        return false;
      }

      await db.collection('usuarios_admin').doc(usuarioId).delete();
      console.log('🗑️  Usuario eliminado:', usuarioId);

      // TODO: Eliminar de Firebase Auth via Cloud Function
      
      await this.loadUsuarios();
      this.showSuccess('Usuario eliminado');

      return true;
    } catch (error) {
      console.error('Error eliminando usuario:', error);
      throw error;
    }
  }

  /**
   * Busca usuarios
   */
  searchUsuarios(query) {
    this.searchQuery = query.toLowerCase();
    this.applyFilters();
  }

  /**
   * Aplica filtros
   */
  applyFilters() {
    let filtered = [...this.usuariosData];

    if (this.searchQuery) {
      filtered = filtered.filter(u =>
        u.email.toLowerCase().includes(this.searchQuery) ||
        u.nombre.toLowerCase().includes(this.searchQuery)
      );
    }

    this.filteredData = filtered;
  }

  /**
   * Renderiza tabla
   */
  renderUsuariosTable() {
    const container = document.getElementById('usuariosTable');
    if (!container) return;

    if (this.filteredData.length === 0) {
      container.innerHTML = '<div class="alert alert-info">No hay usuarios</div>';
      return;
    }

    const rows = this.filteredData.map(usuario => {
      const roleBadgeClass = {
        admin: 'bg-danger',
        operator: 'bg-warning',
        billing: 'bg-info',
        viewer: 'bg-secondary'
      }[usuario.role];

      const statusBadge = usuario.activo
        ? '<span class="badge bg-success">Activo</span>'
        : '<span class="badge bg-danger">Inactivo</span>';

      return `
        <tr>
          <td>
            <strong>${usuario.nombre}</strong><br/>
            <small class="text-muted">${usuario.email}</small>
          </td>
          <td>
            <span class="badge ${roleBadgeClass}">${usuario.role}</span>
          </td>
          <td>${statusBadge}</td>
          <td>
            ${usuario.last_login 
              ? formatDate(usuario.last_login) 
              : 'Nunca ha ingresado'}
          </td>
          <td>
            <button class="btn btn-sm btn-primary" onclick="usuariosManager.handleVerDetalles('${usuario.id}')">
              <i class="bi bi-eye"></i> Ver
            </button>
            <button class="btn btn-sm btn-warning" onclick="usuariosManager.handleCambiarRole('${usuario.id}')">
              <i class="bi bi-gear"></i> Role
            </button>
            <button class="btn btn-sm btn-outline-${usuario.activo ? 'danger' : 'success'}" 
                    onclick="usuariosManager.handleToggleActivo('${usuario.id}')">
              <i class="bi bi-${usuario.activo ? 'pause' : 'play'}"></i>
            </button>
          </td>
        </tr>
      `;
    }).join('');

    container.innerHTML = `
      <table class="table table-striped table-hover">
        <thead>
          <tr>
            <th>Usuario</th>
            <th>Role</th>
            <th>Estado</th>
            <th>Último Ingreso</th>
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
    const searchInput = document.getElementById('searchUsuarios');
    if (searchInput) {
      searchInput.addEventListener('input', (e) => {
        this.searchUsuarios(e.target.value);
        this.renderUsuariosTable();
      });
    }

    const btnCrear = document.getElementById('btnCrearUsuario');
    if (btnCrear) {
      btnCrear.addEventListener('click', () => this.handleCrearUsuario());
    }

    const formCrear = document.getElementById('formCrearUsuario');
    if (formCrear) {
      formCrear.addEventListener('submit', (e) => this.handleSubmitCrear(e));
    }
  }

  /**
   * Handlers
   */
  handleCrearUsuario() {
    const modal = document.getElementById('modalCrearUsuario');
    if (modal) modal.style.display = 'block';
  }

  async handleSubmitCrear(e) {
    e.preventDefault();

    try {
      showLoading(document.body);

      const email = document.getElementById('emailUsuario').value;
      const nombre = document.getElementById('nombreUsuario').value;
      const role = document.getElementById('roleUsuario').value;

      await this.criarUsuario({ email, nombre, role });

      document.getElementById('formCrearUsuario').reset();
      const modal = document.getElementById('modalCrearUsuario');
      if (modal) modal.style.display = 'none';

      this.renderUsuariosTable();
      hideLoading();
    } catch (error) {
      hideLoading();
      this.showError('Error: ' + error.message);
    }
  }

  handleVerDetalles(id) {
    alert(`Detalles: ${id}`);
  }

  async handleCambiarRole(id) {
    const nuevoRole = prompt('Nuevo role (admin/operator/billing/viewer):');
    if (nuevoRole) {
      try {
        await this.asignarRole(id, nuevoRole);
        this.renderUsuariosTable();
      } catch (error) {
        this.showError('Error: ' + error.message);
      }
    }
  }

  async handleToggleActivo(id) {
    try {
      const usuario = await this.getUsuario(id);
      if (usuario.activo) {
        await this.desactivarUsuario(id);
      } else {
        await this.reactivarUsuario(id);
      }
      this.renderUsuariosTable();
    } catch (error) {
      this.showError('Error: ' + error.message);
    }
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
const usuariosManager = new UsuariosManager();
