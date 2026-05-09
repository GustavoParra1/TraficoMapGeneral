/**
 * MULTI-TENANT-AUTH.js
 * 
 * Maneja la autenticación y claims personalizados para arquitectura multi-tenant
 * Cada usuario tiene un clienteId que aisla sus datos en Firestore
 */

class MultiTenantAuth {
  constructor() {
    this.currentUser = null;
    this.currentClienteId = null;
  }

  /**
   * Inicializar listeners de autenticación
   */
  initAuthListener(firebase) {
    firebase.auth().onAuthStateChanged(async (user) => {
      if (user) {
        console.log('✅ Usuario autenticado:', user.email);
        this.currentUser = user;
        
        // Obtener clienteId desde custom claims
        const idTokenResult = await user.getIdTokenResult();
        this.currentClienteId = idTokenResult.claims.clienteId;
        
        if (this.currentClienteId) {
          console.log('🏢 Cliente ID:', this.currentClienteId);
          window.CURRENT_CLIENT_ID = this.currentClienteId;
          window.CURRENT_USER_UID = user.uid;
          window.CURRENT_USER_EMAIL = user.email;
        } else {
          console.warn('⚠️ Usuario sin clienteId asignado');
        }
      } else {
        console.warn('⚠️ No hay usuario autenticado');
        this.currentUser = null;
        this.currentClienteId = null;
        window.CURRENT_CLIENT_ID = null;
      }
    });
  }

  /**
   * Obtener cliente ID actual
   */
  getClienteId() {
    return this.currentClienteId || window.CURRENT_CLIENT_ID;
  }

  /**
   * Obtener usuario actual
   */
  getCurrentUser() {
    return this.currentUser;
  }

  /**
   * Crear usuario cliente (solo admin)
   * Vía Cloud Function que setea custom claims
   */
  async createClientUser(email, password, clienteId, adminAuth) {
    try {
      console.log(`📝 Creando usuario cliente: ${email} para cliente: ${clienteId}`);

      // Crear usuario
      const userRecord = await adminAuth.createUser({
        email: email,
        password: password,
        displayName: email.split('@')[0]
      });

      // Setear custom claims
      await adminAuth.setCustomUserClaims(userRecord.uid, {
        clienteId: clienteId,
        rol: 'cliente'
      });

      // Crear documento en usuarios collection
      await db.collection('usuarios').doc(userRecord.uid).set({
        email: email,
        clienteId: clienteId,
        rol: 'cliente',
        createdAt: new Date(),
        uid: userRecord.uid
      });

      console.log('✅ Usuario cliente creado:', userRecord.uid);
      return userRecord;
    } catch (error) {
      console.error('❌ Error creando usuario cliente:', error);
      throw error;
    }
  }

  /**
   * Crear admin super (solo para setup)
   */
  async createSuperAdmin(email, password, adminAuth, db) {
    try {
      console.log(`🔐 Creando super admin: ${email}`);

      // Crear usuario
      const userRecord = await adminAuth.createUser({
        email: email,
        password: password,
        displayName: 'Admin'
      });

      // Setear custom claims
      await adminAuth.setCustomUserClaims(userRecord.uid, {
        rol: 'super_admin'
      });

      // Crear documento en admins collection
      await db.collection('admins').doc(userRecord.uid).set({
        email: email,
        rol: 'super_admin',
        createdAt: new Date(),
        uid: userRecord.uid
      });

      console.log('✅ Super admin creado:', userRecord.uid);
      return userRecord;
    } catch (error) {
      console.error('❌ Error creando super admin:', error);
      throw error;
    }
  }

  /**
   * Provisionar nuevo cliente
   * Crea la estructura en Firestore para un cliente nuevo
   */
  async provisionarCliente(db, clienteData) {
    try {
      console.log(`📦 Provisionando nuevo cliente: ${clienteData.id}`);

      // Crear documento cliente
      await db.collection('clientes').doc(clienteData.id).set({
        nombre: clienteData.nombre,
        ciudad: clienteData.ciudad,
        email: clienteData.email,
        activo: true,
        createdAt: new Date(),
        config: {
          lat: clienteData.lat || -34.9,
          lng: clienteData.lng || -57.5,
          zoom: clienteData.zoom || 12
        }
      });

      // Crear subdocumentos para cada sección de datos
      const secciones = ['camaras', 'siniestros', 'semaforos', 'robos', 'escuelas', 'operadores', 'patrullas', 'listas'];
      
      for (const seccion of secciones) {
        await db.collection('clientes').doc(clienteData.id).collection(seccion).doc('_placeholder').set({
          _placeholder: true
        });
        console.log(`  ✓ Subcollección ${seccion} creada`);
      }

      console.log('✅ Cliente provisionado completamente:', clienteData.id);
      return true;
    } catch (error) {
      console.error('❌ Error provisionando cliente:', error);
      throw error;
    }
  }

  /**
   * Obtener info del cliente
   */
  async getClienteInfo(db, clienteId) {
    try {
      const doc = await db.collection('clientes').doc(clienteId).get();
      if (doc.exists) {
        return doc.data();
      }
      return null;
    } catch (error) {
      console.error('❌ Error obteniendo info del cliente:', error);
      return null;
    }
  }

  /**
   * Sincronizar datos del cliente (actualizar clienteId)
   */
  async syncUserClienteId(user, db) {
    try {
      const idTokenResult = await user.getIdTokenResult();
      const clienteId = idTokenResult.claims.clienteId;

      if (clienteId) {
        window.CURRENT_CLIENT_ID = clienteId;
        console.log('✅ ClienteId sincronizado:', clienteId);
        return clienteId;
      }

      console.warn('⚠️ No se encontró clienteId en claims');
      return null;
    } catch (error) {
      console.error('❌ Error sincronizando clienteId:', error);
      return null;
    }
  }
}

// Instancia global
const multiTenantAuth = new MultiTenantAuth();
