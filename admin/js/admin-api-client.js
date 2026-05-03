/**
 * Admin API Client - Conecta admin panel con Cloud Functions
 * Fase 2C - Admin Panel Backend Integration
 */

class AdminApiClient {
  constructor() {
    // URL base de Cloud Functions (cambia según ambiente)
    this.baseUrl = this.getBaseUrl();
    this.timeout = 30000; // 30 segundos
  }

  /**
   * Obtener URL base según ambiente
   */
  getBaseUrl() {
    const hostname = window.location.hostname;
    
    if (hostname === 'localhost' || hostname === '127.0.0.1') {
      // Desarrollo local con emulador
      return 'http://localhost:5001/trafico-map-general-v2/us-central1/adminApi';
    } else {
      // Producción
      return 'https://us-central1-trafico-map-general-v2.cloudfunctions.net/adminApi';
    }
  }

  /**
   * Realizar petición HTTP a Cloud Function
   */
  async request(endpoint, data = {}) {
    try {
      const url = `${this.baseUrl}${endpoint}`;
      
      const options = {
        method: data.method || 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        timeout: this.timeout
      };

      if (data.method === 'GET') {
        delete options.body;
      } else {
        options.body = JSON.stringify(data.body || data);
      }

      console.log(`📡 API Call: ${options.method} ${endpoint}`, data);

      const response = await fetch(url, options);
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || `HTTP ${response.status}`);
      }

      const result = await response.json();
      console.log(`✅ API Response:`, result);
      return result;

    } catch (error) {
      console.error(`❌ API Error: ${endpoint}`, error);
      throw error;
    }
  }

  /**
   * GET /health - Verificar estado
   */
  async health() {
    return this.request('/health', { method: 'GET' });
  }

  /**
   * POST /criarCliente - Crear cliente
   */
  async criarCliente(nombreCliente, email, plan, ciudad = '', telefono = '') {
    return this.request('/criarCliente', {
      nombreCliente,
      email,
      plan,
      ciudad,
      telefono
    });
  }

  /**
   * POST /cambiarPlan - Cambiar plan de suscripción
   */
  async cambiarPlan(subscripcionId, nuevoPlan) {
    return this.request('/cambiarPlan', {
      subscripcionId,
      nuevoPlan
    });
  }

  /**
   * POST /registrarPago - Registrar pago de factura
   */
  async registrarPago(facturaId, metodo_pago = 'transferencia', referencias = {}) {
    return this.request('/registrarPago', {
      facturaId,
      metodo_pago,
      referencias
    });
  }

  /**
   * POST /updateCustomClaims - Actualizar claims de usuario
   */
  async updateCustomClaims(uid, claims) {
    return this.request('/updateCustomClaims', {
      uid,
      claims
    });
  }

  /**
   * POST /toggleUserStatus - Activar/desactivar usuario
   */
  async toggleUserStatus(uid, disabled) {
    return this.request('/toggleUserStatus', {
      uid,
      disabled
    });
  }

  /**
   * POST /renovarSubscripcion - Renovar suscripción
   */
  async renovarSubscripcion(subscripcionId) {
    return this.request('/renovarSubscripcion', {
      subscripcionId
    });
  }
}

// Instancia singleton
const adminApi = new AdminApiClient();

/**
 * Exportar para uso en otros módulos
 * (Si no está en entorno de módulos, se usa window.adminApi)
 */
if (typeof module !== 'undefined' && module.exports) {
  module.exports = adminApi;
}
