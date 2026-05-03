/**
 * Config Loader Module
 * Carga y proporciona acceso a la configuración global
 * Permite que la aplicación sea agnóstica al municipio
 */

let globalConfig = null;

/**
 * Carga la configuración desde config.json
 * @returns {Promise<Object>} Configuración cargada
 */
export async function loadConfig() {
  try {
    const response = await fetch('/config.json');
    if (!response.ok) {
      throw new Error('No se pudo cargar config.json');
    }
    globalConfig = await response.json();
    console.log('✅ Configuración cargada para:', globalConfig.municipio.nombre);
    return globalConfig;
  } catch (error) {
    console.error('❌ Error cargando configuración:', error);
    throw error;
  }
}

/**
 * Obtiene la configuración global
 * @returns {Object} Configuración completa
 */
export function getConfig() {
  if (!globalConfig) {
    throw new Error('Configuración no cargada. Llama a loadConfig() primero.');
  }
  return globalConfig;
}

/**
 * Obtiene solo la configuración del municipio
 * @returns {Object} Datos del municipio
 */
export function getMunicipioConfig() {
  return getConfig().municipio;
}

/**
 * Obtiene la configuración de zonas
 * @returns {Array} Array de zonas
 */
export function getZonasConfig() {
  return getConfig().zonas;
}

/**
 * Obtiene la configuración del mapa
 * @returns {Object} Configuración del mapa
 */
export function getMapConfig() {
  return getConfig().map;
}

/**
 * Obtiene las características habilitadas
 * @returns {Object} Features habilitados
 */
export function getFeaturesConfig() {
  return getConfig().features;
}

/**
 * Verifica si una feature está habilitada
 * @param {string} featureName - Nombre de la feature
 * @returns {boolean} True si está habilitada
 */
export function isFeatureEnabled(featureName) {
  const features = getFeaturesConfig();
  return features[featureName] === true;
}

/**
 * Obtiene la configuración de Firebase
 * @returns {Object} Configuración de Firebase
 */
export function getFirebaseConfig() {
  return getConfig().firebase;
}

/**
 * Obtiene configuración de roles y permisos
 * @returns {Array} Array de roles
 */
export function getRolesConfig() {
  return getConfig().auth.roles;
}

/**
 * Obtiene el rol por nombre
 * @param {string} roleName - Nombre del rol
 * @returns {Object|null} Objeto del rol
 */
export function getRoleByName(roleName) {
  const roles = getRolesConfig();
  return roles.find(r => r.nombre === roleName) || null;
}

/**
 * Obtiene el idioma configurado
 * @returns {string} Código de idioma (ej: 'es', 'en')
 */
export function getLanguageConfig() {
  return getConfig().idioma.idiomaPrincipal;
}
