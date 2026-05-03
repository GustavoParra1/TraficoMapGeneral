/**
 * auth-init.js
 * Simple authentication initialization for all apps
 * Just include this script at the top of your app section
 * 
 * Usage:
 * <script src="https://www.gstatic.com/firebasejs/8.10.0/firebase-app.js"></script>
 * <script src="https://www.gstatic.com/firebasejs/8.10.0/firebase-auth.js"></script>
 * <script src="https://www.gstatic.com/firebasejs/8.10.0/firebase-firestore.js"></script>
 * <script src="js/auth-init.js"></script>
 */

let firebaseConfig = null;
let db = null;
let auth = null;
let currentUser = null;

// Initialize Firebase from config.json
async function initializeAuth() {
  try {
    // Load config from root (adjust path if needed for subdirectory apps)
    const configPath = window.location.pathname.includes('/patrulla-app/') || 
                       window.location.pathname.includes('/control-center-v2/') ||
                       window.location.pathname.includes('/centro-control/')
      ? '../config.json'
      : './config.json';

    const response = await fetch(configPath);
    if (!response.ok) throw new Error(`Failed to load config: ${response.status}`);
    
    const config = await response.json();
    firebaseConfig = config.firebase;

    // Initialize Firebase
    if (!firebase.apps.length) {
      firebase.initializeApp(firebaseConfig);
    }

    db = firebase.firestore();
    auth = firebase.auth();

    console.log('✅ Firebase Auth initialized');

    // Check authentication state
    return new Promise((resolve) => {
      auth.onAuthStateChanged((user) => {
        if (!user) {
          console.warn('⚠️ Not authenticated. Redirecting to login...');
          window.location.href = window.location.pathname.includes('/patrulla-app/') || 
                                 window.location.pathname.includes('/control-center-v2/')
            ? '../../login.html'
            : '/login.html';
        } else {
          currentUser = user;
          console.log('✅ Authenticated as:', user.email);
          resolve(user);
        }
      });
    });
  } catch (error) {
    console.error('❌ Auth initialization error:', error);
    alert('Error al cargar configuración de Firebase: ' + error.message);
  }
}

// Get current user
function getCurrentUser() {
  return currentUser;
}

// Get user role
function getUserRole() {
  if (!currentUser) return null;
  return currentUser.customClaims?.role || 'user';
}

// Logout
async function logout() {
  try {
    window.close();
    setTimeout(() => { window.location.href = '/login.html'; }, 500);
  } catch (error) {
    console.error('Logout error:', error);
  }
}

// Initialize immediately when script loads
console.log('📛 Auth Init script loaded');
