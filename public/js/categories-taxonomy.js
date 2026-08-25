// ========================================
// TAXONOMÍA UNIFICADA DE CATEGORÍAS
// Para: Denuncias Vecinas, Siniestros, Robos
// ========================================

const CATEGORIES_TAXONOMY = {
  // PERSONAS - Delitos contra personas
  personas: {
    label: '👤 Personas',
    color: '#dc2626',
    subcategories: {
      robo_via_publica: { label: 'Robo en vía pública', icon: '🚷' },
      arrebato: { label: 'Arrebato', icon: '💨' },
      amenazas: { label: 'Amenazas', icon: '⚠️' },
      lesiones: { label: 'Lesiones', icon: '🩹' },
      asalto: { label: 'Asalto', icon: '⛔' },
      otro_personas: { label: 'Otro', icon: '❓' }
    }
  },

  // VEHÍCULOS - Delitos contra vehículos
  vehiculos: {
    label: '🚗 Vehículos',
    color: '#f97316',
    subcategories: {
      robo_auto: { label: 'Robo de auto', icon: '🚗' },
      robo_moto: { label: 'Robo de moto', icon: '🏍️' },
      robo_bicicleta: { label: 'Robo de bicicleta', icon: '🚲' },
      rotura_vehiculo: { label: 'Rotura de vehículo', icon: '⚒️' },
      otro_vehiculos: { label: 'Otro', icon: '❓' }
    }
  },

  // PROPIEDAD - Delitos contra la propiedad
  propiedad: {
    label: '🏠 Propiedad',
    color: '#7c3aed',
    subcategories: {
      entrada_forzada: { label: 'Entrada forzada', icon: '🔓' },
      robo_comercio: { label: 'Robo a comercio', icon: '🏪' },
      vandalismo: { label: 'Vandalismo', icon: '🖌️' },
      rotura_vidriera: { label: 'Rotura de vidriera', icon: '🪟' },
      otro_propiedad: { label: 'Otro', icon: '❓' }
    }
  },

  // INFRAESTRUCTURA - Problemas de infraestructura vial
  infraestructura: {
    label: '🛣️ Infraestructura',
    color: '#0891b2',
    subcategories: {
      luminarias: { label: 'Luminarias', icon: '💡' },
      semaforos: { label: 'Semáforos', icon: '🚦' },
      baches: { label: 'Baches', icon: '🕳️' },
      pozo: { label: 'Pozo', icon: '⚫' },
      carril_bloqueado: { label: 'Carril bloqueado', icon: '🚫' },
      otro_infraestructura: { label: 'Otro', icon: '❓' }
    }
  },

  // ACCIDENTES - Siniestralidad vial
  accidentes: {
    label: '⚠️ Accidentes Viales',
    color: '#06b6d4',
    subcategories: {
      choque: { label: 'Choque', icon: '💥' },
      colision: { label: 'Colisión', icon: '🚗' },
      atropellamiento: { label: 'Atropellamiento', icon: '🚗' },
      volcadura: { label: 'Volcadura', icon: '🔄' },
      salida_calzada: { label: 'Salida de calzada', icon: '➡️' },
      otro_accidente: { label: 'Otro', icon: '❓' }
    }
  },

  // EMERGENCIAS - Llamadas especiales
  emergencias: {
    label: '🚨 Emergencias',
    color: '#dc2626',
    subcategories: {
      panico: { label: 'Pánico', icon: '🚨', emergency: true },
      incendio: { label: 'Incendio', icon: '🔥', emergency: true },
      inundacion: { label: 'Inundación', icon: '💧', emergency: true },
      derrumbe: { label: 'Derrumbe', icon: '⛏️', emergency: true },
      otro_emergencia: { label: 'Otro', icon: '❓', emergency: true }
    }
  },

  // SEGURIDAD - Otros problemas de seguridad
  seguridad: {
    label: '🔒 Seguridad',
    color: '#8b5cf6',
    subcategories: {
      sospechosos: { label: 'Sospechosos', icon: '👁️' },
      disturbios: { label: 'Disturbios', icon: '💢' },
      aglomeracion: { label: 'Aglomeración', icon: '👥' },
      droga: { label: 'Droga', icon: '⚗️' },
      otro_seguridad: { label: 'Otro', icon: '❓' }
    }
  }
};

/**
 * Obtener todas las subcategorías de una categoría principal
 * @param {string} mainCategory - Clave de categoría principal
 * @returns {object} Objeto con subcategorías
 */
function getSubcategories(mainCategory) {
  return CATEGORIES_TAXONOMY[mainCategory]?.subcategories || {};
}

/**
 * Obtener todas las categorías principales
 * @returns {array} Array de claves de categorías
 */
function getMainCategories() {
  return Object.keys(CATEGORIES_TAXONOMY);
}

/**
 * Obtener etiqueta y color de una categoría principal
 * @param {string} mainCategory - Clave de categoría principal
 * @returns {object} {label, color}
 */
function getCategoryInfo(mainCategory) {
  const cat = CATEGORIES_TAXONOMY[mainCategory];
  if (!cat) {
    return { label: mainCategory, color: '#666', icon: '❓' };
  }
  // 🩹 FIX (2026-02): las categorías principales nunca tuvieron un campo
  // `icon` propio (a diferencia de las subcategorías, que sí lo tienen) —
  // el emoji siempre estuvo pegado como prefijo del `label` (ej:
  // '👤 Personas'). Por eso `cat?.icon` caía siempre al fallback '❓' en
  // TODOS los botones de categoría principal. Acá separamos el primer
  // "token" (el emoji) del resto del texto, sin tocar los datos de arriba.
  const primerEspacio = cat.label.indexOf(' ');
  const tieneEmojiPrefijo = primerEspacio > 0;
  return {
    label: tieneEmojiPrefijo ? cat.label.slice(primerEspacio + 1) : cat.label,
    color: cat.color || '#666',
    icon: tieneEmojiPrefijo ? cat.label.slice(0, primerEspacio) : (cat.icon || '❓')
  };
}

/**
 * Obtener información de una subcategoría
 * @param {string} mainCategory - Clave de categoría principal
 * @param {string} subCategory - Clave de subcategoría
 * @returns {object} {label, icon, emergency}
 */
function getSubcategoryInfo(mainCategory, subCategory) {
  const sub = CATEGORIES_TAXONOMY[mainCategory]?.subcategories?.[subCategory];
  return {
    label: sub?.label || subCategory,
    icon: sub?.icon || '❓',
    emergency: sub?.emergency || false
  };
}

/**
 * Buscar una subcategoría por su etiqueta en español
 * @param {string} label - Etiqueta en español (ej: "Robo de auto")
 * @returns {object} {mainCategory, subCategory, info}
 */
function findSubcategoryByLabel(label) {
  for (const [mainKey, mainData] of Object.entries(CATEGORIES_TAXONOMY)) {
    for (const [subKey, subData] of Object.entries(mainData.subcategories || {})) {
      if (subData.label.toLowerCase() === label.toLowerCase()) {
        return { mainCategory: mainKey, subCategory: subKey, ...subData };
      }
    }
  }
  return null;
}

/**
 * Convertir antigua categoría plana a nueva estructura jerárquica
 * @param {string} oldCategory - Categoría antigua (luminarias, semaforos, etc)
 * @returns {object} {mainCategory, subcategory} o null si no coincide
 */
function migrateOldCategory(oldCategory) {
  const mapping = {
    'luminarias': { main: 'infraestructura', sub: 'luminarias' },
    'semaforos': { main: 'infraestructura', sub: 'semaforos' },
    'baches': { main: 'infraestructura', sub: 'baches' },
    'sospechosos': { main: 'seguridad', sub: 'sospechosos' },
    'robos': { main: 'vehiculos', sub: 'robo_auto' },
    'choques': { main: 'accidentes', sub: 'choque' },
    'panico': { main: 'emergencias', sub: 'panico' },
    'arrebato': { main: 'personas', sub: 'arrebato' },
    'robo_via_publica': { main: 'personas', sub: 'robo_via_publica' }
  };
  
  const result = mapping[oldCategory?.toLowerCase()];
  return result ? { mainCategory: result.main, subcategory: result.sub } : null;
}

/**
 * Validar si una categoría y subcategoría son válidas
 * @param {string} mainCategory - Categoría principal
 * @param {string} subCategory - Subcategoría
 * @returns {boolean}
 */
function isValidCategory(mainCategory, subCategory) {
  return !!(
    CATEGORIES_TAXONOMY[mainCategory] &&
    CATEGORIES_TAXONOMY[mainCategory].subcategories &&
    CATEGORIES_TAXONOMY[mainCategory].subcategories[subCategory]
  );
}
