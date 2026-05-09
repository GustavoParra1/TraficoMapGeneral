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

  let isLoginPage = false;
  let unsubscribe = null;

  return {
    /**
     * Inicializar el módulo de autenticación
     * @param {Object} firebaseAuth - Firebase Auth instance
     * @param {boolean} isLogin - Si es true, no usa listener persistente (Para login.html)
     */
    init(firebaseAuth, isLogin = false) {
      auth = firebaseAuth;
      isLoginPage = isLogin;
      console.log('📛 AuthManager initialized', isLogin ? '(Login Mode)' : '(App Mode)');
      
      // Restaurar sesión del localStorage
      this.restoreSession();
      
      // IMPORTANTE: En login.html NO usar listener persistente
      // Los listeners de múltiples pestañas causan conflictos
      if (!isLoginPage) {
        // Listener de cambios de autenticación SOLO para páginas protegidas
        unsubscribe = auth.onAuthStateChanged(async (user) => {
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
      } else {
        console.log('⚠️ Login page: listener NO activado para evitar conflictos con otras pestañas');
      }
    },

    /**
     * Limpiar listeners (usar al cerrar sesión o descargar página)
     */
    cleanup() {
      if (unsubscribe && typeof unsubscribe === 'function') {
        unsubscribe();
        console.log('🧹 AuthManager listeners limpiados');
      }
    },

    /**
     * Login con email y contraseña
     */
    async login(email, password) {
      try {
        if (!auth) {
          throw new Error('Firebase Auth no está inicializado. Recarga la página e intenta de nuevo.');
        }
        const result = await auth.signInWithEmailAndPassword(email, password);
        console.log('✅ Login successful:', email);
        
        // Forzar refresh del token para obtener custom claims actualizados
        try {
          await result.user.getIdTokenResult(true); // true = forceRefresh
          console.log('✅ Token refreshed con custom claims');
        } catch (err) {
          console.warn('⚠️ No se pudo refrescar token:', err);
        }
        
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
        this.cleanup(); // Limpiar listeners
        currentUser = null;
        userRole = null;
        localStorage.removeItem('currentUser');
        sessionStorage.clear();
        console.log('✅ Logged out');
        await auth.signOut();
        window.location.href = '/login.html';
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
        const idTokenResult = await currentUser.getIdTokenResult(true); // Force refresh para obtener claims más recientes
        console.log('🔍 Custom claims encontrados:', idTokenResult.claims);
        
        // Soportar ambos: "role" (legacy) y "rol" (multitenant)
        if (idTokenResult.claims.role) {
          console.log('📋 Rol desde custom claims (role):', idTokenResult.claims.role);
          return idTokenResult.claims.role;
        }
        if (idTokenResult.claims.rol) {
          console.log('📋 Rol desde custom claims (rol):', idTokenResult.claims.rol);
          return idTokenResult.claims.rol;
        }
        console.warn('⚠️ No se encontraron custom claims role/rol');
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
     * Si no hay usuario, redirige a login
     * Si hay usuario y estamos en login.html, redirige al rol (POST-LOGIN)
     * Si hay usuario y no estamos en login.html, no redirige (ya en app)
     */
    async redirectByRole(user) {
      if (!user) {
        // Sin usuario, ir a login (pero solo si no estamos ya allí)
        if (!window.location.pathname.includes('login.html')) {
          window.location.href = '/login.html';
        }
        return;
      }

      // Aquí hay usuario válido
      const role = await this.getUserRole(user.email);
      console.log(`🔀 Rol detectado: "${role}" para usuario: ${user.email}`);

      const redirectMap = {
        'patrulla': '/patrulla-app/index.html',
        'operador': '/control-center-v2/index.html',
        'super_admin': '/index.html',
        'admin': '/admin',
        'cliente': '/client/'
      };

      const targetUrl = redirectMap[role] || '/index.html';
      console.log(`📍 URL destino: ${targetUrl}`);
      
      // Redirigir si no estamos ya en la página destino
      // Esto aplica tanto a login.html (POST-LOGIN) como a cualquier otra página
      if (window.location.pathname !== targetUrl && !window.location.pathname.endsWith(targetUrl)) {
        console.log(`📍 Actual: ${window.location.pathname}, Destino: ${targetUrl}`);
        setTimeout(() => {
          window.location.href = targetUrl;
        }, 500);
      } else {
        console.log('✅ Ya estamos en la página correcta');
      }
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
