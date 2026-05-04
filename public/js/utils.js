/**
 * Utilidades compartidas para TraficoMap
 */

// Generar ID único
function generateId(prefix = 'id') {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

// Generar API Key
function generateApiKey() {
  return 'sk_' + Math.random().toString(36).substr(2, 24).toUpperCase();
}

// Generar contraseña segura
function generateSecurePassword() {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*';
  let password = '';
  for (let i = 0; i < 16; i++) {
    password += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return password;
}

// Validar email
function isValidEmail(email) {
  const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return re.test(email);
}

// Formatear fecha
function formatDate(dateStr) {
  if (!dateStr) return '-';
  return new Date(dateStr).toLocaleDateString('es-AR', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  });
}

// Capitalizar texto
function capitalize(str) {
  if (!str) return '';
  return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
}

// Mostrar loading
function showLoading(container) {
  const loader = document.createElement('div');
  loader.className = 'text-center py-5';
  loader.innerHTML = `
    <div class="spinner-border text-primary" role="status">
      <span class="visually-hidden">Cargando...</span>
    </div>
  `;
  container.innerHTML = '';
  container.appendChild(loader);
}

// Ocultar loading
function hideLoading() {
  const loader = document.querySelector('.spinner-border');
  if (loader) loader.parentElement.remove();
}

console.log('✅ Utils loaded');
