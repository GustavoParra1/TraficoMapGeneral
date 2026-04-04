// Módulo para gestionar capas geográficas
const GeoLayers = (() => {
  let map;
  let geoJsonLayers = {};

  // Colores por zona (Norte, Sur, Centro, Oeste)
  const zoneColors = {
    'Norte': '#0066FF',      // Azul
    'Sur': '#FF0000',        // Rojo
    'Centro': '#FF1493',     // Fucsia
    'Oeste': '#00AA00'       // Verde
  };

  // Listas de barrios por zona (exactas según requisitos)
  const zoneBarrios = {
    norte: [
      'constitucion', 'estrada', 'zacagnini', 'parque luro', 'aeroparque', 'la florida',
      'los tilos', 'estacion camet', 'camet felix', 'felix u.', 'dos de abril', 'parque camet',
      'fray luis beltran', 'virgen de lujan', 'malvinas argentinas', 'lopez de gomara',
      'los pinares', 'villa primera', 'estacion norte', 'nueve de julio', 'sarmiento',
      'mitre', 'roca norte', 'alem norte', 'san martin norte',
      'parque montemar', 'el grosellar', 'las margaritas', 'el casal'
    ],
    sur: [
      'puerto', 'punta mogotes', 'faro norte', 'alfar',
      'del puerto', 'punta mogotes oeste', 'colinas de peralta ramos', 'el progreso',
      'peralta ramos oeste', 'juramento', 'serena', 'acantilados',
      'cabo corrientes', 'punta mogotes alta', 'corrientes', 'balneario sur', 'playa serena',
      'marquesado', 'san eduardo del mar', 'san eduardo de chapadmalal', 'arroyo chapadmalal',
      'playa chapadmalal', 'playa los lobos', 'san patricio', 'san jacinto',
      'bosque peralta ramos', 'el jardin de peralta ramos', 'santa rosa del mar',
      'quebradas de peralta ramos',
      'termas huinco', 'termas  huinco', 'nuevo golf', 'parque independencia', 'loma del golf', 'lomas del golf', 'santa celina',
      'general san martin', 'florencio sanchez', 'villa lourdes', 'las avenidas',
      'cerrito y san salvador', 'cerrito sur', 'el jardin de stella maris'
    ],
    centro: [
      'centro', 'la perla', 'nueva pompeya', 'don bosco',
      'area centro', 'plaza peralta ramos', 'san fernando',
      'bolivar', 'bv maritima', 'mitre centro', 'roca centro',
      'los andes', 'bernardino rivadavia', 'estacion terminal', 'san juan',
      'primera junta', 'san jose', 'funes', 'san lorenzo',
      'divino rostro', 'general roca',
      'pinos de anchorena', 'santa monica', 'playa grande', 'lomas de stella maris',
      'los troncos', 'leandro l alem', 'leandro n. alem', 'll alem', 'alem sur', 'san carlos'
    ]
  };

  // Determinar zona según nombre del barrio
  function getZoneForFeature(feature) {
    const barrioName = feature.properties?.soc_fomen || '';
    if (!barrioName) return 'Oeste';
    
    const lower = barrioName.toLowerCase()
      .replace(/á/g, 'a').replace(/é/g, 'e').replace(/í/g, 'i')
      .replace(/ó/g, 'o').replace(/ú/g, 'u');
    
    // Buscar en las listas
    if (zoneBarrios.norte.some(n => lower.includes(n))) return 'Norte';
    if (zoneBarrios.sur.some(s => lower.includes(s))) return 'Sur';
    if (zoneBarrios.centro.some(c => lower.includes(c))) return 'Centro';
    
    return 'Oeste';
  }

  // Obtener color de una feature según su zona
  function getColor(feature) {
    const zone = getZoneForFeature(feature);
    return zoneColors[zone] || zoneColors['Oeste'];
  }

  // Estilo para GeoJSON - igual a MapaTraficoFinal
  function styleFeature(feature) {
    return {
      fillColor: getColor(feature),
      weight: 3,           // Bordes más gruesos (de 2 a 3)
      opacity: 1,          // Opacidad de borde al máximo (de 0.8 a 1)
      color: getColor(feature),  // Borde del mismo color que el relleno
      dashArray: '',
      fillOpacity: 0.3     // Relleno más visible
    };
  }

  // Popup content
  function getPopupContent(feature) {
    const props = feature.properties;
    const zone = getZoneForFeature(feature);
    return `
      <div class="geo-popup">
        <h4>${props.soc_fomen || 'Sin nombre'}</h4>
        <p><strong>Zona:</strong> ${zone}</p>
        <p><strong>Área:</strong> ${props.hectares?.toFixed(2) || 'N/A'} hectáreas</p>
        <p><strong>ID:</strong> ${props.id || 'N/A'}</p>
      </div>
    `;
  }

  // Handlers for interaction
  function onEachFeature(feature, layer) {
    // Popup
    if (feature.properties.soc_fomen) {
      layer.bindPopup(getPopupContent(feature));
    }

    // Highlight on hover - más visible
    layer.on('mouseover', function() {
      this.setStyle({
        weight: 4,
        opacity: 1,
        fillOpacity: 0.6
      });
      this.bringToFront();
    });

    layer.on('mouseout', function() {
      this.setStyle(styleFeature(feature));
    });
  }

  return {
    init: (mapInstance) => {
      map = mapInstance;
    },

    // Load GeoJSON from URL
    loadGeoJson: async (name, url) => {
      try {
        const response = await fetch(url);
        const geojsonData = await response.json();
        
        const geoJsonLayer = L.geoJSON(geojsonData, {
          style: styleFeature,
          onEachFeature: onEachFeature
        }).addTo(map);

        geoJsonLayers[name] = geoJsonLayer;
        console.log(`✓ Capa "${name}" cargada exitosamente`);
        return geoJsonLayer;
      } catch (error) {
        console.error(`Error cargando ${name}:`, error);
        return null;
      }
    },

    // Load embedded GeoJSON data (sin mostrar en mapa por defecto)
    loadEmbeddedGeoJson: (name, geojsonData, addToMap = false) => {
      try {
        const geoJsonLayer = L.geoJSON(geojsonData, {
          style: styleFeature,
          onEachFeature: onEachFeature
        });

        // Solo añadir al mapa si se especifica
        if (addToMap) {
          geoJsonLayer.addTo(map);
        }

        geoJsonLayers[name] = geoJsonLayer;
        console.log(`✓ Capa embedida "${name}" cargada`);
        return geoJsonLayer;
      } catch (error) {
        console.error(`Error cargando datos embedidos ${name}:`, error);
        return null;
      }
    },

    // Toggle layer visibility
    toggleLayer: (name) => {
      if (geoJsonLayers[name]) {
        if (map.hasLayer(geoJsonLayers[name])) {
          map.removeLayer(geoJsonLayers[name]);
          return false;
        } else {
          geoJsonLayers[name].addTo(map);
          return true;
        }
      }
    },

    // Get all layers
    getLayers: () => geoJsonLayers,

    // Clear all layers
    clearLayers: () => {
      Object.keys(geoJsonLayers).forEach(name => {
        map.removeLayer(geoJsonLayers[name]);
      });
      geoJsonLayers = {};
    },

    // Fit bounds to layer
    fitLayerBounds: (name) => {
      if (geoJsonLayers[name]) {
        map.fitBounds(geoJsonLayers[name].getBounds());
      }
    }
  };
})();
