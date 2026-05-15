// js/csv-parser.js
// Parser de CSV y GeoJSON

class CSVParser {
  parseCSV(csvText) {
    console.log("📖 Parseando CSV...");
    const lines = csvText.trim().split('\n');
    if (lines.length < 2) throw new Error('CSV vacío');

    // Extraer headers originales (sin toLowerCase para mantener nombres)
    const headers = lines[0].split(',').map(h => h.trim());
    const headersLower = headers.map(h => h.toLowerCase());
    console.log("📋 Headers encontrados:", headers);

    // Mapear columnas esperadas
    const latIndex = this.findColumnIndex(headersLower, ['latitud', 'lat', 'latitude', 'y']);
    const lngIndex = this.findColumnIndex(headersLower, ['longitud', 'lng', 'longitude', 'x']);

    if (latIndex === -1 || lngIndex === -1) {
      throw new Error('CSV debe contener columnas de latitud y longitud');
    }

    // Procesar datos
    const data = [];
    for (let i = 1; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;

      const values = this.parseCSVLine(line);
      try {
        const lat = parseFloat(values[latIndex]);
        const lng = parseFloat(values[lngIndex]);
        if (isNaN(lat) || isNaN(lng)) {
          console.warn(`⚠️ Fila ${i + 1}: coordenadas inválidas. Saltando.`);
          continue;
        }

        // Copiar todas las columnas originales como propiedades
        const item = { lat, lng };
        for (let j = 0; j < headers.length; j++) {
          // No sobrescribir lat/lng
          if (j === latIndex || j === lngIndex) continue;
          item[headers[j]] = values[j] !== undefined ? values[j] : '';
        }

        data.push(item);
      } catch (error) {
        console.warn(`⚠️ Error en fila ${i + 1}:`, error.message);
      }
    }

    console.log(`✅ Parseado: ${data.length} registros válidos`);
    return data;
  }

  parseCSVLine(line) {
    // Parser simple que respeta comillas
    const result = [];
    let current = '';
    let insideQuotes = false;

    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      const nextChar = line[i + 1];

      if (char === '"') {
        if (insideQuotes && nextChar === '"') {
          current += '"';
          i++;
        } else {
          insideQuotes = !insideQuotes;
        }
      } else if (char === ',' && !insideQuotes) {
        result.push(current.trim());
        current = '';
      } else {
        current += char;
      }
    }

    result.push(current.trim());
    return result;
  }

  findColumnIndex(headers, aliases) {
    for (const alias of aliases) {
      const index = headers.indexOf(alias);
      if (index !== -1) return index;
    }
    return -1;
  }

  parseGeoJSON(geoJsonText) {
    console.log("🗺️ Parseando GeoJSON...");
    
    try {
      const geojson = JSON.parse(geoJsonText);
      const data = [];

      if (geojson.type === 'FeatureCollection') {
        geojson.features.forEach(feature => {
          if (feature.geometry) {
            let lat, lng;
            let isPoint = false;
            
            // Extractar coordenadas según tipo de geometría
            if (feature.geometry.type === 'Point') {
              [lng, lat] = feature.geometry.coordinates;
              isPoint = true;
            } else if (feature.geometry.type === 'Polygon') {
              // Usar el primer punto del polígono
              [lng, lat] = feature.geometry.coordinates[0][0];
            } else if (feature.geometry.type === 'LineString') {
              // Usar el primer punto de la línea
              [lng, lat] = feature.geometry.coordinates[0];
            } else if (feature.geometry.type === 'MultiPoint') {
              // Usar el primer punto
              [lng, lat] = feature.geometry.coordinates[0];
            }
            
            // Si tenemos coordenadas válidas, agregar al array
            if (lat !== undefined && lng !== undefined) {
              const doc = {
                lat,
                lng,
                tipo: feature.properties?.tipo || 'Punto',
                descripcion: feature.properties?.descripcion || feature.properties?.name || feature.properties?.nombre || '',
                nombre: feature.properties?.nombre || feature.properties?.name || 'Sin nombre',
                fecha: feature.properties?.fecha || null,
                properties: feature.properties || {}
              };
              
              // Guardar geometry como string JSON (Firestore no permite arrays anidados)
              if (feature.geometry) {
                doc.geometryJSON = JSON.stringify(feature.geometry);
              }
              
              data.push(doc);
            }
          }
        });
      } else if (geojson.type === 'Feature') {
        if (geojson.geometry) {
          let lat, lng;
          let isPoint = false;
          
          if (geojson.geometry.type === 'Point') {
            [lng, lat] = geojson.geometry.coordinates;
            isPoint = true;
          } else if (geojson.geometry.type === 'Polygon') {
            [lng, lat] = geojson.geometry.coordinates[0][0];
          } else if (geojson.geometry.type === 'LineString') {
            [lng, lat] = geojson.geometry.coordinates[0];
          }
          
          if (lat !== undefined && lng !== undefined) {
            const doc = {
              lat,
              lng,
              tipo: geojson.properties?.tipo || 'Punto',
              descripcion: geojson.properties?.descripcion || geojson.properties?.name || geojson.properties?.nombre || '',
              nombre: geojson.properties?.nombre || geojson.properties?.name || 'Sin nombre',
              fecha: geojson.properties?.fecha || null,
              properties: geojson.properties || {}
            };
            
            // Guardar geometry como string JSON
            if (geojson.geometry) {
              doc.geometryJSON = JSON.stringify(geojson.geometry);
            }
            
            data.push(doc);
          }
        }
      }

      console.log(`✅ Parseado GeoJSON: ${data.length} puntos`);
      return data;
    } catch (error) {
      throw new Error('GeoJSON inválido: ' + error.message);
    }
  }
}

// Instancia global
const csvParser = new CSVParser();
console.log("✅ CSVParser loaded");
