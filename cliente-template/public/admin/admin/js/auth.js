// js/auth.js
// Manejo de autenticación para Admin Panel

class AdminAuth {
  constructor() {
    this.user = null;
    this.role = null;
    this.isAuthenticated = false;
  }

  // Inicializar listener de auth
  init() {
    auth.onAuthStateChanged((user) => {
      if (user) {
        this.handleUserSignedIn(user);
      } else {
        this.handleUserSignedOut();
      }
    });
  }

  // Usuario iniciado sesión
  async handleUserSignedIn(user) {
    console.log("User signed in:", user.email);
    this.user = user;
    this.isAuthenticated = true;

    // Obtener custom claims (rol)
    const idTokenResult = await user.getIdTokenResult();
    this.role = idTokenResult.claims.role || "operator";

    // Validar que sea admin
    if (!this.isAdmin()) {
      console.warn("User is not admin. Signing out...");
      this.logout();
      this.showError("No tienes permisos para acceder al panel admin");
      return;
    }

    // Mostrar interfaz admin
    this.showAdminUI();
    
    // Log en analytics
    analytics.logEvent("admin_login", {
      email: user.email,
      role: this.role
    });
  }

  // Usuario cerró sesión
  handleUserSignedOut() {
    console.log("User signed out");
    this.user = null;
    this.isAuthenticated = false;
    this.role = null;
    this.showLoginUI();
  }

  // Verificar si es admin
  isAdmin() {
    return this.role === "admin";
  }

  // Login con email/password
  async login(email, password) {
    try {
      const result = await auth.signInWithEmailAndPassword(email, password);
      console.log("Login successful:", result.user.email);
      return result;
    } catch (error) {
      console.error("Login error:", error);
      this.showError("Error al iniciar sesión: " + error.message);
      throw error;
    }
  }

  // Logout
  async logout() {
    try {
      await auth.signOut();
      console.log("Logout successful");
    } catch (error) {
      console.error("Logout error:", error);
      throw error;
    }
  }

  // Mostrar interfaz de login
  showLoginUI() {
    const app = document.getElementById("app");
    app.innerHTML = `
      <div class="container-fluid h-100 d-flex align-items-center justify-content-center" style="min-height: 100vh; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);">
        <div class="card shadow-lg" style="width: 100%; max-width: 400px;">
          <div class="card-body p-5">
            <div class="text-center mb-4">
              <h2 class="fw-bold text-primary">Admin Panel</h2>
              <p class="text-muted">TraficoMap SaaS</p>
            </div>

            <form id="loginForm" onsubmit="adminAuth.handleLoginSubmit(event)">
              <div class="mb-3">
                <label for="email" class="form-label">Email</label>
                <input type="email" class="form-control form-control-lg" id="email" placeholder="admin@example.com" required>
              </div>

              <div class="mb-3">
                <label for="password" class="form-label">Password</label>
                <input type="password" class="form-control form-control-lg" id="password" placeholder="Contraseña" required>
              </div>

              <button type="submit" class="btn btn-primary btn-lg w-100 fw-bold">Iniciar Sesión</button>
            </form>

            <hr class="my-4">
            <p class="text-muted text-center small">Sistema administrativo de TraficoMap SaaS. Solo para administradores autorizados.</p>
          </div>
        </div>
      </div>
    `;
  }

  // Manejar submit de login
  async handleLoginSubmit(event) {
    event.preventDefault();
    
    const email = document.getElementById("email").value;
    const password = document.getElementById("password").value;
    const btn = event.target.querySelector("button");
    
    btn.disabled = true;
    btn.innerHTML = "Iniciando...";

    try {
      await this.login(email, password);
    } catch (error) {
      btn.disabled = false;
      btn.innerHTML = "Iniciar Sesión";
    }
  }

  // Mostrar interfaz admin
  showAdminUI() {
    loadDashboard();
  }

  // Show error
  showError(message) {
    const alert = document.createElement("div");
    alert.className = "alert alert-danger alert-dismissible fade show";
    alert.innerHTML = `
      ${message}
      <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
    `;
    document.body.insertBefore(alert, document.body.firstChild);
    setTimeout(() => alert.remove(), 5000);
  }

  // Show success
  showSuccess(message) {
    const alert = document.createElement("div");
    alert.className = "alert alert-success alert-dismissible fade show";
    alert.innerHTML = `
      ${message}
      <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
    `;
    document.body.insertBefore(alert, document.body.firstChild);
    setTimeout(() => alert.remove(), 3000);
  }
}

// Instancia global
const adminAuth = new AdminAuth();

// Inicializar cuando cargue el DOM
document.addEventListener("DOMContentLoaded", () => {
  adminAuth.init();
});
