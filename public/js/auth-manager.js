/**
 * AuthManager - Módulo centralizado de autenticación
 * Maneja login, logout, sesiones y roles de usuarios
 */

const AuthManager = (() => {
  let auth = null;
  let currentUser = null;
  let userRole = null;

  // Mapeo de patrones de email a roles
  const ROLE_PATTERNS = {
    'patrulla': (email) => email.startsWith('patrulla'),
    'operador': (email) => {
      const operatorDomains = ['capa-norte@', 'capa-sur@', 'mac@', 'uppl@', 'multiagencia@', 'encargado-sala@', 'operador-'];
      return operatorDomains.some(domain => email.includes(domain));
    },
    'admin': (email) => email === 'admin@trafico-map.com' || email === 'admin@seguridad-mdp.com'
  };

  return {
    /**
     * Inicializar el módulo de autenticación
     */
    init(firebaseAuth) {
      auth = firebaseAuth;
      console.log('📛 AuthManager initialized');
      
      // Restaurar sesión del localStorage
      this.restoreSession();
      
      // Listener de cambios de autenticación
      auth.onAuthStateChanged(async (user) => {
        currentUser = user;
        
        if (user) {
          console.log('✅ Usuario autenticado:', user.email);
          userRole = await this.getUserRole(user.email);
          console.log('👤 Rol detectado:', userRole);
          
          // Guardar en localStorage para acceso offline
          localStorage.setItem('currentUser', JSON.stringify({
            uid: user.uid,
            email: user.email,
            role: userRole,
            timestamp: Date.now()
          }));
        } else {
          console.log('❌ Usuario no autenticado');
          currentUser = null;
          userRole = null;
          localStorage.removeItem('currentUser');
        }
      });
    },

    /**
     * Login con email y contraseña
     */
    async login(email, password) {
      try {
        const result = await auth.signInWithEmailAndPassword(email, password);
        console.log('✅ Login successful:', email);
        return result;
      } catch (error) {
        console.error('❌ Login failed:', error);
        throw error;
      }
    },

    /**
     * Logout del sistema
     */
    async logout() {
      try {
        currentUser = null;
        userRole = null;
        localStorage.removeItem('currentUser');
        console.log('✅ Logged out');
        window.close();
        setTimeout(() => { window.location.href = '/login.html'; }, 500);
      } catch (error) {
        console.error('❌ Logout failed:', error);
        throw error;
      }
    },

    /**
     * Obtener usuario actual
     */
    getCurrentUser() {
      return currentUser;
    },

    /**
     * Obtener rol del usuario actual
     */
    async getUserRole(email) {
      if (!currentUser) return null;
      
      // Primero intentar obtener el rol desde custom claims de Firebase
      try {
        const idTokenResult = await currentUser.getIdTokenResult();
        if (idTokenResult.claims.role) {
          console.log('📋 Rol desde custom claims:', idTokenResult.claims.role);
          return idTokenResult.claims.role;
        }
      } catch (error) {
        console.warn('⚠️ No se pudieron leer custom claims:', error.message);
      }
      
      // Fallback: usar email patterns
      for (const [role, matcher] of Object.entries(ROLE_PATTERNS)) {
        if (matcher(email || currentUser.email)) {
          return role;
        }
      }
      
      return 'user'; // Rol por defecto
    },

    /**
     * Verificar si usuario está autenticado
     */
    isAuthenticated() {
      return currentUser !== null;
    },

    /**
     * Verificar si tiene cierto rol
     */
    async hasRole(requiredRole) {
      if (!currentUser) return false;
      const role = await this.getUserRole(currentUser.email);
      return role === requiredRole;
    },

    /**
     * Obtener ID de la zona según el operador
     */
    getOperatorZone(email) {
      if (email.includes('capa-norte@')) return 'norte';
      if (email.includes('capa-sur@')) return 'sur';
      if (email.includes('mac@')) return 'mac';
      if (email.includes('uppl@')) return 'uppl';
      if (email.includes('multiagencia@')) return 'multiagencia';
      if (email.includes('encargado-sala@')) return 'sala';
      return null;
    },

    /**
     * Obtener número de patrulla desde email
     */
    getPatrolNumber(email) {
      const match = email.match(/patrulla(\d+)/);
      return match ? match[1] : null;
    },

    /**
     * Restaurar sesión desde localStorage
     */
    restoreSession() {
      const saved = localStorage.getItem('currentUser');
      if (saved) {
        try {
          const userData = JSON.parse(saved);
          console.log('📥 Sesión restaurada:', userData.email);
        } catch (e) {
          console.warn('⚠️ No se pudo restaurar sesión');
          localStorage.removeItem('currentUser');
        }
      }
    },

    /**
     * Redirigir según el rol del usuario
     */
    async redirectByRole(user) {
      if (!user) {
        window.location.href = '/login.html';
        return;
      }

      const role = await this.getUserRole(user.email);
      console.log(`🔀 Redirigiendo a ${role}...`);

      const redirectMap = {
        'patrulla': '/patrulla-app/index.html',
        'operador': '/control-center-v2/index.html',
        'admin': '/index.html'
      };

      const targetUrl = redirectMap[role] || '/index.html';
      setTimeout(() => {
        window.location.href = targetUrl;
      }, 500);
    },

    /**
     * Verificar autenticación en las páginas
     * Si no está autenticado, redirige al login
     */
    requireAuth() {
      if (!this.isAuthenticated()) {
        console.warn('⚠️ Acceso no autenticado. Redirigiendo al login...');
        window.location.href = '/login.html';
        return false;
      }
      return true;
    },

    /**
     * Verificar rol específico
     * Si no tiene el rol requerido, redirige al login
     */
    requireRole(requiredRole) {
      if (!this.isAuthenticated()) {
        window.location.href = '/login.html';
        return false;
      }

      if (!this.hasRole(requiredRole)) {
        console.error('❌ Acceso denegado. Rol requerido:', requiredRole);
        window.location.href = '/login.html';
        return false;
      }

      return true;
    },

    /**
     * Obtener token de autenticación
     */
    async getToken() {
      if (!currentUser) return null;
      try {
        return await currentUser.getIdToken();
      } catch (error) {
        console.error('❌ Error getting token:', error);
        return null;
      }
    }
  };
})();

/**
 * Verificar autenticación al cargar cualquier página protegida
 * Llama a AuthManager.requireAuth() en las páginas que lo necesiten
 */
console.log('📛 AuthManager module loaded');
