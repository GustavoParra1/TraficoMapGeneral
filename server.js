import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 5000;

// Servir archivos estáticos desde la carpeta "public"
app.use(express.static(path.join(__dirname, 'public')));

// Middleware para parsear JSON
app.use(express.json());

// Endpoint de prueba
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: 'TraficoMapGeneral server is running' });
});

// 🗺️ ENDPOINT DE GEOCODING - Búsqueda de direcciones con Google Maps
const GOOGLE_MAPS_API_KEY = 'AIzaSyBp2ZiKA4lYieyjX_aJJjE023NeqKrRhJc';

// 📊 SISTEMA DE MONITOREO DE COSTOS
const geocodingStats = {
  totalRequests: 0,
  successfulRequests: 0,
  failedRequests: 0,
  requestsBySource: {},
  requestsByCity: {},
  startTime: new Date(),
  lastRequests: [] // Últimos 100 requests para análisis detallado
};

function logGeocodingRequest(query, city, source, success, responseTime) {
  geocodingStats.totalRequests++;
  if (success) geocodingStats.successfulRequests++;
  else geocodingStats.failedRequests++;
  
  geocodingStats.requestsBySource[source] = (geocodingStats.requestsBySource[source] || 0) + 1;
  geocodingStats.requestsByCity[city] = (geocodingStats.requestsByCity[city] || 0) + 1;
  
  // Mantener últimos 100 requests
  geocodingStats.lastRequests.unshift({
    timestamp: new Date().toISOString(),
    query,
    city,
    source,
    success,
    responseTime
  });
  if (geocodingStats.lastRequests.length > 100) {
    geocodingStats.lastRequests.pop();
  }
}

app.get('/api/geocode', async (req, res) => {
  const address = req.query.address;
  
  if (!address || address.trim().length === 0) {
    return res.status(400).json({ 
      success: false, 
      message: 'Parámetro "address" requerido' 
    });
  }

  const startTime = Date.now();
  // Ciudad desde parámetro (por defecto Mar del Plata)
  const city = req.query.city || 'mar-del-plata';
  
  // Configuración de ciudades
  const cityConfig = {
    'cordoba': {
      name: 'Córdoba, Argentina',
      context: ', Córdoba, Argentina'
    },
    'mar-del-plata': {
      name: 'Mar del Plata, Argentina',
      context: ', Mar del Plata, Argentina'
    },
    'san-martin': {
      name: 'San Martín, Argentina',
      context: ', San Martín, Argentina'
    }
  };
  
  const config = cityConfig[city] || cityConfig['mar-del-plata'];
  
  try {
    // Detectar si es un cruce (formato: "calle y calle" o "calle & calle")
    const intersectionMatch = address.match(/^(.+?)\s+(?:y|&)\s+(.+?)$/i);
    
    if (intersectionMatch) {
      // BÚSQUEDA DE CRUCE
      const street1 = intersectionMatch[1].trim();
      const street2 = intersectionMatch[2].trim();
      
      console.log(`🔍 Buscando intersección: "${street1}" y "${street2}"`);
      
      try {
        // Primero intentar buscar la intersección como una sola búsqueda
        const intersectionQuery = `${street1} y ${street2}${config.context}`;
        const intersectionResult = await searchGoogleMaps(intersectionQuery);
        
        if (intersectionResult) {
          console.log(`   ✅ Intersección encontrada directamente`);
          const responseTime = Date.now() - startTime;
          logGeocodingRequest(address, city, 'google-maps-intersection', true, responseTime);
          return res.json({
            success: true,
            address: intersectionResult.formatted_address,
            lat: intersectionResult.lat,
            lng: intersectionResult.lng,
            source: 'google-maps-intersection'
          });
        }
        
        // Si no encuentra, buscar cada calle por separado
        console.log('   ℹ️ No encontrada directamente, intentando punto medio...');
        
        const [result1, result2] = await Promise.all([
          searchGoogleMaps(`${street1}${config.context}`),
          searchGoogleMaps(`${street2}${config.context}`)
        ]);
        
        if (result1 && result2) {
          // Calcular punto medio
          const lat = (result1.lat + result2.lat) / 2;
          const lng = (result1.lng + result2.lng) / 2;
          
          console.log(`   ✅ ${street1}: ${result1.lat.toFixed(4)}, ${result1.lng.toFixed(4)}`);
          console.log(`   ✅ ${street2}: ${result2.lat.toFixed(4)}, ${result2.lng.toFixed(4)}`);
          console.log(`   🎯 Punto medio: ${lat.toFixed(4)}, ${lng.toFixed(4)}`);
          
          const responseTime = Date.now() - startTime;
          logGeocodingRequest(address, city, 'google-maps-intersection-midpoint', true, responseTime);
          
          return res.json({
            success: true,
            address: `${street1} y ${street2}`,
            lat: lat,
            lng: lng,
            source: 'google-maps-intersection-midpoint'
          });
        } else {
          const responseTime = Date.now() - startTime;
          logGeocodingRequest(address, city, 'google-maps-intersection-midpoint', false, responseTime);
          return res.status(404).json({
            success: false,
            message: `No se encontró el cruce en ${config.name}`,
            found_street1: result1 ? result1.formatted_address : null,
            found_street2: result2 ? result2.formatted_address : null
          });
        }
      } catch (error) {
        console.error(`❌ Error buscando cruce:`, error);
        return res.status(500).json({
          success: false,
          message: 'Error al procesar búsqueda de cruce',
          error: error.message
        });
      }
    } else {
      // BÚSQUEDA SIMPLE DE DIRECCIÓN
      console.log(`🔍 Buscando dirección: "${address}"`);
      
      try {
        const result = await searchGoogleMaps(`${address}${config.context}`);
        
        if (result) {
          console.log(`✅ Dirección encontrada: ${result.lat.toFixed(4)}, ${result.lng.toFixed(4)}`);
          
          const responseTime = Date.now() - startTime;
          logGeocodingRequest(address, city, 'google-maps-address', true, responseTime);
          
          return res.json({
            success: true,
            address: result.formatted_address,
            lat: result.lat,
            lng: result.lng,
            source: 'google-maps-address'
          });
        } else {
          const responseTime = Date.now() - startTime;
          logGeocodingRequest(address, city, 'google-maps-address', false, responseTime);
          return res.status(404).json({
            success: false,
            message: `No se encontró la dirección en ${config.name}`
          });
        }
      } catch (error) {
        console.error(`❌ Error buscando dirección:`, error);
        return res.status(500).json({
          success: false,
          message: 'Error al procesar búsqueda de dirección',
          error: error.message
        });
      }
    }
  } catch (error) {
    console.error(`❌ Error en geocoding:`, error);
    return res.status(500).json({
      success: false,
      message: 'Error interno del servidor',
      error: error.message
    });
  }
});

/**
 * Busca una dirección usando Google Maps Geocoding API
 * @param {string} query - Dirección a buscar
 * @returns {Promise<{lat, lng, formatted_address}|null>}
 */
async function searchGoogleMaps(query) {
  const url = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(query)}&key=${GOOGLE_MAPS_API_KEY}`;
  
  try {
    const response = await fetch(url);
    const data = await response.json();
    
    if (data.results && data.results.length > 0) {
      const location = data.results[0].geometry.location;
      const formatted_address = data.results[0].formatted_address;
      return {
        lat: location.lat,
        lng: location.lng,
        formatted_address: formatted_address
      };
    }
    
    return null;
  } catch (error) {
    console.error(`❌ Error en searchGoogleMaps:`, error);
    return null;
  }
}

// 📊 ENDPOINT DE ESTADÍSTICAS DE GEOCODING
app.get('/api/geocode-stats', (req, res) => {
  const uptime = Date.now() - geocodingStats.startTime.getTime();
  const uptimeMinutes = Math.floor(uptime / 60000);
  const costPerRequest = 0.007; // $7 por 1000 requests = $0.007 por request
  const estimatedCost = (geocodingStats.successfulRequests * costPerRequest).toFixed(2);
  
  const stats = {
    ...geocodingStats,
    uptime: {
      milliseconds: uptime,
      minutes: uptimeMinutes,
      hours: (uptimeMinutes / 60).toFixed(2)
    },
    costs: {
      costPerRequest: '$' + costPerRequest.toFixed(4),
      estimatedTotalCost: '$' + estimatedCost,
      successfulRequestsCount: geocodingStats.successfulRequests,
      costPerThousand: '$7.00'
    },
    successRate: ((geocodingStats.successfulRequests / geocodingStats.totalRequests) * 100).toFixed(2) + '%',
    averageResponseTime: geocodingStats.lastRequests.length > 0 
      ? (geocodingStats.lastRequests.reduce((sum, r) => sum + r.responseTime, 0) / geocodingStats.lastRequests.length).toFixed(0) + 'ms'
      : '0ms'
  };
  
  res.json(stats);
});

// Cualquier otra ruta devuelve index.html (para SPA)
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Iniciar servidor
app.listen(PORT, () => {
  console.log(`✅ TraficoMapGeneral server listening on http://localhost:${PORT}`);
  console.log(`📂 Sirviendo archivos de: ${path.join(__dirname, 'public')}`);
});
