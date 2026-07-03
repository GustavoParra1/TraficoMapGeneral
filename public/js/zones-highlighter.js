// zones-highlighter.js
// Resalta zonas/barrios en el mapa según densidad de siniestros

class ZonesHighlighter {
  constructor(map) {
    this.map = map;
    this.highlightedLayers = [];
    this.originalStyles = new Map();
  }

  /**
   * Resalta las top zonas en el mapa
   * @param {Array} topZonas - Array de [zona, count] pairs
   * @param {Object} geoData - Datos geográficos con barrios
   */
  highlightZones(topZonas, geoData) {
    // Crear mapeo de nombres de zonas para búsqueda rápida
    const zonasMap = new Map(topZonas);
    
    if (!geoData || !geoData.features) {
      console.warn('⚠️ No hay datos geográficos para resaltar zonas');
      return;
    }

    // Buscar maxCount para normalizar colores
    const maxCount = Math.max(...topZonas.map(z => z[1]));
    const minCount = Math.min(...topZonas.map(z => z[1]));

    // For each barrio/feature, check if it's in top zonas
    geoData.features.forEach((feature, index) => {
      const barrio = feature.properties?.BARRIO || feature.properties?.barrio || feature.properties?.name || '';
      
      if (zonasMap.has(barrio)) {
        const count = zonasMap.get(barrio);
        
        // Calcular color basado en densidad (rojo para alto, naranja para medio, amarillo para bajo)
        const intensity = (count - minCount) / (maxCount - minCount); // 0 a 1
        const color = this.getColorByIntensity(intensity);
        
        // Crear layer con el polígono resaltado
        const geoJsonLayer = L.geoJSON(feature, {
          style: () => ({
            color: color,
            weight: 3,
            opacity: 0.9,
            fillColor: color,
            fillOpacity: 0.6
          }),
          onEachFeature: (feature, layer) => {
            // Popup con información
            const popup = `
              <div style="font-size: 12px; font-weight: 600; color: #333;">
                🏘️ ${barrio}
              </div>
              <div style="font-size: 11px; color: #666; margin-top: 4px;">
                Siniestros: <strong style="color: #dc2626;">${count}</strong>
              </div>
            `;
            layer.bindPopup(popup);
            
            // Hover effect
            layer.on('mouseover', function() {
              this.setStyle({
                weight: 4,
                fillOpacity: 0.8
              });
              this.openPopup();
            });
            
            layer.on('mouseout', function() {
              this.setStyle({
                weight: 3,
                fillOpacity: 0.6
              });
            });
          }
        });

        // Agregar al mapa
        geoJsonLayer.addTo(this.map);
        this.highlightedLayers.push(geoJsonLayer);
      }
    });

    console.log(`✅ ${this.highlightedLayers.length} zonas resaltadas en el mapa`);
  }

  /**
   * Obtiene color según intensidad (0-1)
   */
  getColorByIntensity(intensity) {
    // Paleta: rojo oscuro -> rojo -> naranja -> amarillo -> verde
    if (intensity > 0.8) return '#dc2626'; // Rojo oscuro - máximo
    if (intensity > 0.6) return '#ef4444'; // Rojo
    if (intensity > 0.4) return '#f97316'; // Naranja
    if (intensity > 0.2) return '#eab308'; // Amarillo
    return '#84cc16'; // Verde claro - mínimo
  }

  /**
   * Limpia el resaltado
   */
  clearHighlight() {
    this.highlightedLayers.forEach(layer => {
      this.map.removeLayer(layer);
    });
    this.highlightedLayers = [];
    console.log('🧹 Resaltado de zonas limpiado');
  }

  /**
   * Centra el mapa en las zonas resaltadas
   */
  focusHighlightedZones() {
    if (this.highlightedLayers.length === 0) return;

    // Obtener bounds de todas las capas resaltadas
    let bounds = null;
    this.highlightedLayers.forEach(layer => {
      if (layer.getBounds) {
        if (!bounds) {
          bounds = layer.getBounds();
        } else {
          bounds.extend(layer.getBounds());
        }
      }
    });

    if (bounds) {
      this.map.fitBounds(bounds, { padding: [50, 50] });
      console.log('🎯 Mapa centrado en zonas resaltadas');
    }
  }
}

// Global instance
let zonesHighlighter = null;

console.log("✅ zones-highlighter.js loaded");
