/**
 * Authentication Module
 * Maneja autenticación con Firebase Auth
 * Compatible con múltiples roles (COM, PATROL, ADMIN)
 */

import { getAuth, signInWithEmailAndPassword, signOut, onAuthStateChanged } from 'https://www.gstatic.com/firebasejs/9.22.0/firebase-auth.js';
import { getRoleByName } from './config-loader.js';

let currentUser = null;
let currentRole = null;

/**
 * Inicio de sesión con email y contraseña
 * @param {string} email - Email del usuario
 * @param {string} password - Contraseña
 * @returns {Promise<Object>} Datos del usuario autenticado
 */
export async function login(email, password) {
  try {
    const auth = getAuth();
    const result = await signInWithEmailAndPassword(auth, email, password);
    currentUser = result.user;
    console.log('✅ Usuario autenticado:', email);
    return result.user;
  } catch (error) {
    console.error('❌ Error de login:', error.message);
    throw error;
  }
}

/**
 * Cierre de sesión
 * @returns {Promise<void>}
 */
export async function logout() {
  try {
    const auth = getAuth();
    await signOut(auth);
    currentUser = null;
    currentRole = null;
    console.log('✅ Sesión cerrada');
  } catch (error) {
    console.error('❌ Error al cerrar sesión:', error.message);
    throw error;
  }
}

/**
 * Obtiene el usuario actualmente logueado
 * @returns {Object|null} Usuario actual o null
 */
export function getCurrentUser() {
  return currentUser;
}

/**
 * Establece el rol del usuario
 * @param {string} roleName - Nombre del rol
 */
export function setUserRole(roleName) {
  const role = getRoleByName(roleName);
  if (!role) {
    throw new Error(`Rol no válido: ${roleName}`);
  }
  currentRole = role;
  localStorage.setItem('userRole', roleName);
  console.log('✅ Rol asignado:', roleName);
}

/**
 * Obtiene el rol del usuario actual
 * @returns {Object|null} Rol del usuario
 */
export function getUserRole() {
  if (!currentRole) {
    const roleName = localStorage.getItem('userRole');
    if (roleName) {
      currentRole = getRoleByName(roleName);
    }
  }
  return currentRole;
}

/**
 * Verifica si el usuario tiene un permiso específico
 * @param {string} permission - Nombre del permiso
 * @returns {boolean} True si tiene el permiso
 */
export function hasPermission(permission) {
  const role = getUserRole();
  if (!role) return false;
  
  // El permiso "*" da acceso a todo
  if (role.permisos.includes('*')) return true;
  
  return role.permisos.includes(permission);
}

/**
 * Verifica si está autenticado
 * @returns {boolean} True si hay usuario logueado
 */
export function isAuthenticated() {
  return currentUser !== null;
}

/**
 * Escucha cambios en el estado de autenticación
 * @param {Function} callback - Función a ejecutar cuando cambia el estado
 */
export function onAuthStateChange(callback) {
  const auth = getAuth();
  return onAuthStateChanged(auth, (user) => {
    currentUser = user;
    callback(user);
  });
}

/**
 * Obtiene el email del usuario actual
 * @returns {string} Email del usuario
 */
export function getCurrentUserEmail() {
  return currentUser?.email || null;
}

/**
 * Obtiene el UID del usuario actual
 * @returns {string} UID del usuario
 */
export function getCurrentUserUID() {
  return currentUser?.uid || null;
}
