// js/utils.js
// Utilidades comunes para Admin Panel

// Formatear fecha
function formatDate(date) {
  if (!date) return "-";
  if (typeof date === "string") {
    date = new Date(date);
  }
  return date.toLocaleDateString("es-AR", {
    year: "numeric",
    month: "short",
    day: "numeric"
  });
}

// Formatear moneda
function formatCurrency(amount, currency = "ARS") {
  return new Intl.NumberFormat("es-AR", {
    style: "currency",
    currency: currency
  }).format(amount);
}

// Formatear número
function formatNumber(num) {
  return new Intl.NumberFormat("es-AR").format(num);
}

// Truncar texto
function truncate(text, length = 50) {
  if (!text) return "";
  return text.length > length ? text.substring(0, length) + "..." : text;
}

// Generar ID único
function generateId(prefix = "id") {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

// Capitalizar primera letra
function capitalize(str) {
  if (!str) return "";
  return str.charAt(0).toUpperCase() + str.slice(1);
}

// Badge de estado
function getStatusBadge(status) {
  const badges = {
    "activo": "badge bg-success",
    "inactivo": "badge bg-secondary",
    "suspendido": "badge bg-warning",
    "cancelado": "badge bg-danger",
    "proximo_a_vencer": "badge bg-warning",
    "vencido": "badge bg-danger"
  };
  const badgeClass = badges[status] || "badge bg-secondary";
  return `<span class="${badgeClass}">${capitalize(status.replace(/_/g, " "))}</span>`;
}

// Crear card de métrica
function createMetricCard(title, value, subtitle = "", color = "primary") {
  return `
    <div class="col-md-3 mb-4">
      <div class="card border-start border-5 border-${color}">
        <div class="card-body">
          <h6 class="text-muted small text-uppercase">${title}</h6>
          <h3 class="fw-bold text-${color}">${value}</h3>
          ${subtitle ? `<p class="text-muted small mb-0">${subtitle}</p>` : ""}
        </div>
      </div>
    </div>
  `;
}

// Crear tabla a partir de datos
function createTable(headers, rows) {
  let html = `
    <div class="table-responsive">
      <table class="table table-hover">
        <thead class="table-light">
          <tr>
  `;

  // Headers
  headers.forEach(header => {
    html += `<th class="fw-bold">${header}</th>`;
  });

  html += `
          </tr>
        </thead>
        <tbody>
  `;

  // Rows
  rows.forEach(row => {
    html += `<tr>`;
    row.forEach(cell => {
      html += `<td>${cell}</td>`;
    });
    html += `</tr>`;
  });

  html += `
        </tbody>
      </table>
    </div>
  `;

  return html;
}

// Mostrar loading spinner
function showLoading(container) {
  const el = typeof container === "string" ? document.getElementById(container) : container;
  el.innerHTML = `
    <div class="d-flex justify-content-center align-items-center" style="min-height: 200px;">
      <div class="spinner-border text-primary" role="status">
        <span class="visually-hidden">Cargando...</span>
      </div>
    </div>
  `;
}

// Ocultar loading
function hideLoading() {
  const spinner = document.querySelector(".spinner-border");
  if (spinner) spinner.parentElement.remove();
}

// Copy to clipboard
function copyToClipboard(text) {
  navigator.clipboard.writeText(text).then(() => {
    adminAuth.showSuccess("Copiado al portapapeles");
  }).catch(() => {
    adminAuth.showError("Error al copiar");
  });
}

// Validar email
function isValidEmail(email) {
  const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return regex.test(email);
}

// Validar URL
function isValidUrl(url) {
  try {
    new URL(url);
    return true;
  } catch (e) {
    return false;
  }
}

// Generar API Key (32 caracteres aleatorios)
function generateApiKey() {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let key = 'sk_';
  for (let i = 0; i < 32; i++) {
    key += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return key;
}

// Generar contraseña segura (16 caracteres)
function generateSecurePassword() {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*';
  let password = '';
  for (let i = 0; i < 16; i++) {
    password += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return password;
}

// Obtener ID del usuario actual (desde Firebase Auth)
function getCurrentUserId() {
  try {
    return auth.currentUser?.uid || 'sistema';
  } catch (e) {
    return 'sistema';
  }
}

// Delay promise
function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// Logout global
function logoutAdmin() {
  if (confirm("Cerrar sesión?")) {
    adminAuth.logout();
  }
}

console.log("Utils loaded");
