/**
 * Modal Multi-Municipio para TraficoMapGeneral
 * Extrae municipio_id del email de usuario autenticado
 * Segmenta datos y costos por municipio
 */

// 🏛️ MUNICIPIOS SOPORTADOS
const MUNICIPIOS_CONFIG = {
  'mdp': {
    name: 'Mar del Plata',
    center: [-38.00042, -57.5562],
    zoom: 12,
    context: ', Mar del Plata, Argentina'
  },
  'rosario': {
    name: 'Rosario',
    center: [-32.9442, -60.6560],
    zoom: 12,
    context: ', Rosario, Argentina'
  },
  'cordoba': {
    name: 'Córdoba',
    center: [-31.4135, -64.1811],
    zoom: 12,
    context: ', Córdoba, Argentina'
  }
};

// 🔐 EXTRACTOR DE MUNICIPIO DEL EMAIL
function extractMunicipioFromEmail(email) {
  if (!email) return 'mdp'; // Por defecto Mar del Plata
  
  // Formatos soportados:
  // - usuario@mdp.trafico.com → mdp
  // - mdp@trafico.com → mdp
  // - admin-mdp@trafico.com → mdp
  
  const matches = email.match(/([a-z]+)[@.-]/i);
  const municipioId = matches ? matches[1].toLowerCase() : 'mdp';
  
  // Validar que sea un municipio conocido
  if (MUNICIPIOS_CONFIG[municipioId]) {
    return municipioId;
  }
  
  return 'mdp'; // Fallback
}

// 🔐 OBTENER MUNICIPIO ACTUAL
var currentMunicipio = null;
var currentMunicipioConfig = null;

function setCurrentMunicipio(municipioId) {
  if (!MUNICIPIOS_CONFIG[municipioId]) {
    console.warn(`⚠️ Municipio "${municipioId}" no reconocido, usando MDP`);
    municipioId = 'mdp';
  }
  
  currentMunicipio = municipioId;
  currentMunicipioConfig = MUNICIPIOS_CONFIG[municipioId];
  
  // Guardar en sessionStorage para acceso global
  sessionStorage.setItem('municipioId', municipioId);
  sessionStorage.setItem('municipioName', currentMunicipioConfig.name);
  
  console.log(`✅ Municipio actual: ${currentMunicipioConfig.name} (${municipioId})`);
}

function getMunicipio() {
  return currentMunicipio || (sessionStorage.getItem('municipioId') || 'mdp');
}

function getMunicipioConfig() {
  return currentMunicipioConfig || MUNICIPIOS_CONFIG[getMunicipio()];
}

// 🌐 FUNCIÓN MEJORADA DE GEOCODING CON MUNICIPIO
async function geocodeAddressWithMunicipio(address, municipioId) {
  if (!municipioId) {
    municipioId = getMunicipio();
  }
  
  try {
    // URL del API
    const apiUrl = `/api/geocode?address=${encodeURIComponent(address)}&municipio=${municipioId}`;
    console.log(`🔍 Geocoding en ${municipioId}: "${address}"`);
    
    const response = await fetch(apiUrl);
    const data = await response.json();
    
    if (data.success) {
      console.log(`✅ ${data.address} → ${data.lat.toFixed(4)}, ${data.lng.toFixed(4)}`);
      return {
        lat: data.lat,
        lng: data.lng,
        address: data.address
      };
    } else {
      console.warn(`⚠️ No encontrado: ${data.message}`);
      return null;
    }
  } catch (error) {
    console.error(`❌ Error en geocoding:`, error);
    return null;
  }
}

// 📊 FUNCIÓN PARA OBTENER ESTADÍSTICAS DEL MUNICIPIO
async function getGeocodingStats() {
  const municipioId = getMunicipio();
  
  try {
    const response = await fetch(`/api/geocode-stats?municipio=${municipioId}`);
    const stats = await response.json();
    
    if (stats.success === false) {
      console.warn(`⚠️ No hay estadísticas para: ${municipioId}`);
      return null;
    }
    
    return stats;
  } catch (error) {
    console.error(`❌ Error obteniendo estadísticas:`, error);
    return null;
  }
}

// 🔄 INTERCEPTOR PARA AUTENTICACIÓN
// Este función se debe llamar en script.js después del login
function handleMunicipioAuth(userEmail) {
  const municipioId = extractMunicipioFromEmail(userEmail);
  setCurrentMunicipio(municipioId);
  
  // Actualizar UI con nombre del municipio
  const municipioName = currentMunicipioConfig.name;
  console.log(`🏛️ Bienvenido a ${municipioName}`);
  
  // Mostrar en el panel si existe
  const titleElement = document.getElementById('municipio-title');
  if (titleElement) {
    titleElement.textContent = `${municipioName}`;
  }
  
  return municipioId;
}

// 📁 RUTAS DE DATOS POR MUNICIPIO
function getDataPath(dataType, municipioId = null) {
  if (!municipioId) {
    municipioId = getMunicipio();
  }
  
  const paths = {
    'siniestros': `data/${municipioId}/siniestros.geojson`,
    'cameras': `data/${municipioId}/cameras.geojson`,
    'cameras-private': `data/${municipioId}/private-cameras.geojson`,
    'semaforos': `data/${municipioId}/semaforos.geojson`,
    'barrios': `data/${municipioId}/barrios.geojson`
  };
  
  return paths[dataType] || null;
}

console.log('✅ municipio-auth.js cargado');
