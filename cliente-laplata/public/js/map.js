/**
 * Map Module
 * Maneja la inicialización y control del mapa Leaflet
 * Carga capas, eventos, zoom, etc.
 */

import { getMapConfig, getZonasConfig } from './config-loader.js';

let mymap = null;
let baseMaps = null;
let layerControl = null;

/**
 * Normaliza una cadena de texto
 * @param {string} str - Texto a normalizar
 * @returns {string} Texto normalizado
 */
function normalizeString(str) {
  if (!str) return '';
  return str
    .toLowerCase()
    .replace(/\bav\.?\b/g, 'avenida')
    .trim();
}

/**
 * Normaliza texto removiendo acentos
 * @param {string} text - Texto a normalizar
 * @returns {string} Texto sin acentos
 */
function normalizeText(text) {
  if (!text) return '';
  return text
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();
}

/**
 * Inicializa el mapa Leaflet
 * @param {string} containerId - ID del contenedor HTML para el mapa
 * @param {string} mapBase - Tipo de mapa base (osm, google-streets, etc.)
 * @returns {L.Map} Instancia del mapa
 */
export function initializeMap(containerId = 'map', mapBase = 'osm') {
  const mapConfig = getMapConfig();
  
  // Crear instancia del mapa
  mymap = L.map(containerId).setView(
    [mapConfig.centro.lat, mapConfig.centro.lng],
    mapConfig.centro.zoom
  );
  
  // Mapas base disponibles
  const osmLayer = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 19,
    attribution: '© OpenStreetMap contributors'
  });
  
  const googleStreetsLayer = L.tileLayer('https://{s}.google.com/vt/lyrs=m&x={x}&y={y}&z={z}', {
    maxZoom: 20,
    subdomains: ['mt0', 'mt1', 'mt2', 'mt3'],
    attribution: '© Google'
  });
  
  const googleSatelliteLayer = L.tileLayer('https://{s}.google.com/vt/lyrs=s&x={x}&y={y}&z={z}', {
    maxZoom: 20,
    subdomains: ['mt0', 'mt1', 'mt2', 'mt3'],
    attribution: '© Google'
  });
  
  const googleHybridLayer = L.tileLayer('https://{s}.google.com/vt/lyrs=y&x={x}&y={y}&z={z}', {
    maxZoom: 20,
    subdomains: ['mt0', 'mt1', 'mt2', 'mt3'],
    attribution: '© Google'
  });
  
  baseMaps = {
    'OpenStreetMap': osmLayer,
    'Google Streets': googleStreetsLayer,
    'Google Satellite': googleSatelliteLayer,
    'Google Hybrid': googleHybridLayer
  };
  
  // Agregar mapa base seleccionado
  if (mapBase === 'osm') osmLayer.addTo(mymap);
  else if (mapBase === 'google-streets') googleStreetsLayer.addTo(mymap);
  else if (mapBase === 'google-satellite') googleSatelliteLayer.addTo(mymap);
  else if (mapBase === 'google-hybrid') googleHybridLayer.addTo(mymap);
  else osmLayer.addTo(mymap);
  
  // Layer control
  layerControl = L.control.layers(baseMaps).addTo(mymap);
  
  console.log('✅ Mapa inicializado');
  return mymap;
}

/**
 * Obtiene la instancia actual del mapa
 * @returns {L.Map} Instancia del mapa
 */
export function getMap() {
  if (!mymap) {
    throw new Error('Mapa no inicializado. Llama a initializeMap() primero.');
  }
  return mymap;
}

/**
 * Dibuja la capa de zonas geográficas
 * @param {Object} geoJsonData - Datos en formato GeoJSON de barrios
 */
export function drawZoneLayer(geoJsonData) {
  const zonasConfig = getZonasConfig();
  const mapInstance = getMap();
  
  // Crear mapa de colores por zona
  const zoneColors = {};
  zonasConfig.forEach(zona => {
    zoneColors[zona.nombre] = {
      color: zona.color,
      fillColor: zona.color,
      fillOpacity: 0.3,
      weight: 3
    };
  });
  
  // Función para calcular el centroide de un polígono MultiPolygon
  function getCentroid(geometry) {
    if (geometry.type !== 'MultiPolygon') return null;
    
    let totalLat = 0, totalLng = 0, count = 0;
    
    geometry.coordinates.forEach(polygon => {
      polygon.forEach(ring => {
        ring.forEach(coord => {
          totalLng += coord[0];
          totalLat += coord[1];
          count++;
        });
      });
    });
    
    return count > 0 ? [totalLat / count, totalLng / count] : null;
  }
  
  // Función para asignar zona a un barrio según su posición geográfica
  function getZoneForBarrio(feature) {
    const mapConfig = getMapConfig();
    const centerLat = mapConfig.centro.lat;
    const centerLng = mapConfig.centro.lng;
    
    const centroid = getCentroid(feature.geometry);
    if (!centroid) return 'Oeste';
    
    const [barLat, barLng] = centroid;
    
    // Clasificar por zona usando el centroide
    // Centro de Mar del Plata: -38.0, -57.55
    const dLat = barLat - centerLat;  // Positivo = Norte, Negativo = Sur
    const dLng = barLng - centerLng;  // Positivo = Este, Negativo = Oeste
    
    // Si está más al norte que el centro
    if (dLat > 0.03) {
      return 'Norte';
    }
    // Si está más al sur que el centro
    else if (dLat < -0.03) {
      return 'Sur';
    }
    // Si está más al oeste que el centro
    else if (dLng < -0.10) {
      return 'Oeste';
    }
    // Si está cerca del centro o más al este
    else {
      return 'Centro';
    }
  }
  
  // Dibujar capas de GeoJSON
  L.geoJSON(geoJsonData, {
    style: function(feature) {
      const zona = getZoneForBarrio(feature);
      const colors = zoneColors[zona] || zoneColors['Oeste'];
      return colors;
    },
    onEachFeature: function(feature, layer) {
      const barrioName = feature.properties?.soc_fomen || 'Unknown';
      const zona = getZoneForBarrio(feature);
      layer.bindPopup(`<strong>${barrioName}</strong><br/>Zona: ${zona}`);
      
      // Efecto hover
      layer.on('mouseover', function() {
        this.setStyle({ weight: 5, opacity: 1 });
      });
      layer.on('mouseout', function() {
        const zona = getZoneForBarrio(feature);
        const colors = zoneColors[zona] || zoneColors['Oeste'];
        this.setStyle(colors);
      });
    }
  }).addTo(mapInstance);
  
  console.log('✅ Capa de zonas dibujada');
}

/**
 * Agrega un marcador al mapa
 * @param {number} lat - Latitud
 * @param {number} lng - Longitud
 * @param {string} title - Título del marcador
 * @param {Object} options - Opciones adicionales
 * @returns {L.Marker} Marcador creado
 */
export function addMarker(lat, lng, title, options = {}) {
  const mapInstance = getMap();
  const marker = L.marker([lat, lng], options).addTo(mapInstance);
  
  if (title) {
    marker.bindPopup(title);
  }
  
  return marker;
}

/**
 * Agrega un círculo al mapa
 * @param {number} lat - Latitud
 * @param {number} lng - Longitud
 * @param {number} radius - Radio en metros
 * @param {Object} options - Opciones Leaflet
 * @returns {L.Circle} Círculo creado
 */
export function addCircle(lat, lng, radius, options = {}) {
  const mapInstance = getMap();
  return L.circle([lat, lng], Object.assign({ radius }, options)).addTo(mapInstance);
}

/**
 * Centra el mapa en un punto
 * @param {number} lat - Latitud
 * @param {number} lng - Longitud
 * @param {number} zoom - Nivel de zoom
 */
export function centerMap(lat, lng, zoom = 13) {
  const mapInstance = getMap();
  mapInstance.setView([lat, lng], zoom);
}

/**
 * Obtiene el punto central actual del mapa
 * @returns {Object} {lat: number, lng: number}
 */
export function getMapCenter() {
  const mapInstance = getMap();
  const center = mapInstance.getCenter();
  return { lat: center.lat, lng: center.lng };
}

/**
 * Obtiene el zoom actual del mapa
 * @returns {number} Nivel de zoom
 */
export function getMapZoom() {
  const mapInstance = getMap();
  return mapInstance.getZoom();
}

/**
 * Cambia la capa base del mapa
 * @param {string} mapType - Tipo de mapa (osm, google-streets, etc.)
 */
export function changeBaseMap(mapType) {
  const mapInstance = getMap();
  
  Object.keys(baseMaps).forEach(name => {
    mapInstance.removeLayer(baseMaps[name]);
  });
  
  if (mapType === 'osm') baseMaps['OpenStreetMap'].addTo(mapInstance);
  else if (mapType === 'google-streets') baseMaps['Google Streets'].addTo(mapInstance);
  else if (mapType === 'google-satellite') baseMaps['Google Satellite'].addTo(mapInstance);
  else if (mapType === 'google-hybrid') baseMaps['Google Hybrid'].addTo(mapInstance);
}

/**
 * Limpia todos los marcadores del mapa
 */
export function clearMarkers() {
  const mapInstance = getMap();
  mapInstance.eachLayer(layer => {
    if (layer instanceof L.Marker) {
      mapInstance.removeLayer(layer);
    }
  });
}
