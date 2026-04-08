/**
 * MÓDULO DE AYUDA DE FORMATOS
 * Muestra guías de formato para cada tipo de capa
 */

const FormatHelp = (() => {
  const formats = {
    barrios: {
      title: '🗺️ BARRIOS',
      description: 'Representan áreas/polígonos geográficos',
      format: 'GeoJSON (Polygon o MultiPolygon)',
      csvColumns: ['NO - Se requiere GeoJSON'],
      example: `{
  "type": "FeatureCollection",
  "features": [{
    "type": "Feature",
    "properties": { "nombre": "Barrio Centro" },
    "geometry": {
      "type": "Polygon",
      "coordinates": [[[lng, lat], [lng, lat], ...]]
    }
  }]
}`
    },
    siniestros: {
      title: '🚗 SINIESTROS',
      description: 'Puntos de accidentes/eventos viales',
      format: 'CSV o GeoJSON (Point)',
      csvColumns: ['lat (OBLIGATORIO)', 'lng (OBLIGATORIO)', 'causa', 'participantes', 'fecha', 'descripcion'],
      csvExample: `lat,lng,causa,participantes,fecha,descripcion
-38.0055,-57.5521,D,A/M,2024-01-15,Choque doble
-38.0060,-57.5525,A,M/P,2024-01-16,Caída de moto`,
      csvInfo: `
        <p style="background: #ffe0e0; padding: 10px; border-radius: 4px; margin: 10px 0;">
          <strong>⚠️ IMPORTANTE:</strong> Las columnas <code>lat</code> y <code>lng</code> son <strong>OBLIGATORIAS</strong>.
          No se soporta lookup por cámara. Todos los siniestros deben tener coordenadas exactas.
        </p>
        <p><strong>🔴 Códigos de Causas (obligatorio si tienes el dato):</strong></p>
        <ul style="font-size: 12px; column-count: 2;">
          <li><code>D</code> - Distracción</li>
          <li><code>A</code> - Alcohol</li>
          <li><code>AV</code> - Avería</li>
          <li><code>EV</code> - Exceso de velocidad</li>
          <li><code>FV</code> - Falta de visibilidad</li>
          <li><code>G</code> - Giro prohibido</li>
          <li><code>MI</code> - Maniobra indebida</li>
          <li><code>MR</code> - Maniobra riesgosa</li>
          <li><code>NR</code> - No respetar norma</li>
          <li><code>NSD</code> - No se determinó</li>
          <li><code>P</code> - Peatón</li>
          <li><code>PC</code> - Parada confusa</li>
          <li><code>PI</code> - Piso inseguro</li>
          <li><code>VS</code> - Vía segura</li>
          <li><code>DF</code> - Defecto fatal</li>
          <li><code>DESCOMPENSAN</code> - Descompensación</li>
          <li><code>IC</code> - Inexperiencia/Conducción</li>
          <li><code>PERSECUCIÓN</code> - Persecución</li>
          <li><code>?</code> - Desconocido</li>
        </ul>
        <p><strong>👥 Códigos de Participantes:</strong></p>
        <ul style="font-size: 12px; column-count: 2;">
          <li><code>A</code> - Auto</li>
          <li><code>M</code> - Moto</li>
          <li><code>P</code> - Peatón</li>
          <li><code>CAM</code> - Camión</li>
          <li><code>B</code> - Bicicleta</li>
          <li><code>COL</code> - Colectivo</li>
          <li><code>CTA</code> - Carreta</li>
          <li><code>BOMBEROS</code> - Bomberos</li>
          <li><code>PERRO</code> - Perro</li>
          <li><code>POLICIA</code> - Policía</li>
          <li><code>MONOPATIN</code> - Monopatín</li>
          <li><code>AMB</code> - Ambulancia</li>
          <li><code>PATRULLA</code> - Patrulla</li>
          <li><code>CABALLO</code> - Caballo</li>
        </ul>
        <p><strong>⚠️ Nota:</strong> Los códigos se separan por "/" si hay múltiples (ej: A/M = Auto y Moto, P/CAM = Peatón y Camión)</p>
      `,
      geoJsonColumns: ['causa', 'participantes', 'fecha', 'descripcion (opcionales)'],
      geoJsonExample: `{
  "type": "Feature",
  "properties": { "causa": "D", "participantes": "A/M", "fecha": "2024-01-15" },
  "geometry": { "type": "Point", "coordinates": [-57.5521, -38.0055] }
}`
    },
    cameras: {
      title: '📹 CÁMARAS',
      description: 'Ubicaciones de cámaras de vigilancia',
      format: 'CSV o GeoJSON (Point)',
      csvColumns: ['lat (obligatorio)', 'lng (obligatorio)', 'nombre', 'id', 'ubicacion'],
      csvExample: `lat,lng,nombre,id,ubicacion
-38.0055,-57.5521,Cámara Centro,CAM001,Calle Peatonal
-38.0060,-57.5525,Cámara Puerto,CAM002,Costanera Sur`,
      geoJsonColumns: ['nombre', 'id', 'ubicacion (opcionales)'],
      geoJsonExample: `{
  "type": "Feature",
  "properties": { "nombre": "Cámara Centro", "id": "CAM001", "ubicacion": "Calle Peatonal" },
  "geometry": { "type": "Point", "coordinates": [-57.5521, -38.0055] }
}`
    },
    private_cameras: {
      title: '🎥 CÁMARAS PRIVADAS',
      description: 'Cámaras de uso privado/comercial',
      format: 'CSV o GeoJSON (Point)',
      csvColumns: ['lat (obligatorio)', 'lng (obligatorio)', 'nombre', 'propietario', 'cobertura'],
      csvExample: `lat,lng,nombre,propietario,cobertura
-38.0055,-57.5521,Cámara Banco,Banco ABC,Frente
-38.0060,-57.5525,Cámara Comercio,Local XYZ,Interior`,
      geoJsonColumns: ['nombre', 'propietario', 'cobertura (opcionales)'],
      geoJsonExample: `{
  "type": "Feature",
  "properties": { "nombre": "Cámara Banco", "propietario": "Banco ABC" },
  "geometry": { "type": "Point", "coordinates": [-57.5521, -38.0055] }
}`
    },
    semaforos: {
      title: '🚦 SEMÁFOROS',
      description: 'Ubicaciones de semáforos de tránsito',
      format: 'CSV o GeoJSON (Point)',
      csvColumns: ['lat (obligatorio)', 'lng (obligatorio)', 'nombre', 'tipo', 'estado'],
      csvExample: `lat,lng,nombre,tipo,estado
-38.0055,-57.5521,Semáforo Avenida 1,vehicular,activo
-38.0060,-57.5525,Semáforo Peatonal 2,peatonal,activo`,
      geoJsonColumns: ['nombre', 'tipo', 'estado (opcionales)'],
      geoJsonExample: `{
  "type": "Feature",
  "properties": { "nombre": "Semáforo Avenida 1", "tipo": "vehicular", "estado": "activo" },
  "geometry": { "type": "Point", "coordinates": [-57.5521, -38.0055] }
}`
    },
    colegios: {
      title: '🏫 COLEGIOS/ESCUELAS',
      description: 'Ubicaciones de establecimientos educativos',
      format: 'CSV o GeoJSON (Point)',
      csvColumns: ['lat (obligatorio)', 'lng (obligatorio)', 'nombre', 'nivel', 'sector'],
      csvExample: `lat,lng,nombre,nivel,sector
-38.0055,-57.5521,Escuela Primaria 1,primario,público
-38.0060,-57.5525,Colegio Secundario 2,secundario,privado`,
      geoJsonColumns: ['nombre', 'nivel', 'sector (opcionales)'],
      geoJsonExample: `{
  "type": "Feature",
  "properties": { "nombre": "Escuela Primaria 1", "nivel": "primario", "sector": "público" },
  "geometry": { "type": "Point", "coordinates": [-57.5521, -38.0055] }
}`
    },
    colectivos: {
      title: '🚌 COLECTIVOS/LÍNEAS',
      description: 'Rutas y líneas de transporte público',
      format: 'GeoJSON (LineString o MultiLineString)',
      csvColumns: ['NO - Se requiere GeoJSON con rutas'],
      geoJsonExample: `{
  "type": "Feature",
  "properties": { "nombre": "Línea 501", "numero": "501", "ramal": "A" },
  "geometry": {
    "type": "LineString",
    "coordinates": [[-57.5521, -38.0055], [-57.5525, -38.0060], ...]
  }
}`
    },
    corredores: {
      title: '🛣️ CORREDORES ESCOLARES',
      description: 'Rutas seguras cercanas a escuelas',
      format: 'GeoJSON (LineString o MultiLineString)',
      csvColumns: ['NO - Se requiere GeoJSON con rutas'],
      geoJsonExample: `{
  "type": "Feature",
  "properties": { "nombre": "Corredor Escuela 1", "escuela": "Escuela X", "extension_km": "2.5" },
  "geometry": {
    "type": "LineString",
    "coordinates": [[-57.5521, -38.0055], [-57.5525, -38.0060], ...]
  }
}`
    },
    flujo: {
      title: '📊 FLUJO VEHICULAR',
      description: 'Datos de flujo de tránsito (puntos o áreas)',
      format: 'CSV o GeoJSON (Point, LineString o Polygon)',
      csvColumns: ['lat (obligatorio)', 'lng (obligatorio)', 'nombre', 'intensidad', 'hora_pico'],
      csvExample: `lat,lng,nombre,intensidad,hora_pico
-38.0055,-57.5521,Intersección Avenida,alta,08:00-09:00
-38.0060,-57.5525,Puente Centro,media,17:00-18:30`,
      geoJsonColumns: ['nombre', 'intensidad', 'hora_pico (opcionales)'],
      geoJsonExample: `{
  "type": "Feature",
  "properties": { "nombre": "Intersección Avenida", "intensidad": "alta", "hora_pico": "08:00-09:00" },
  "geometry": { "type": "Point", "coordinates": [-57.5521, -38.0055] }
}`
    },
    robo: {
      title: '🚗 ROBO AUTOMOTOR',
      description: 'Ubicaciones de robos de vehículos',
      format: 'CSV o GeoJSON (Point)',
      csvColumns: ['lat (obligatorio)', 'lng (obligatorio)', 'nombre', 'fecha', 'tipo_vehiculo'],
      csvExample: `lat,lng,nombre,fecha,tipo_vehiculo
-38.0055,-57.5521,Robo Centro,2024-01-15,auto
-38.0060,-57.5525,Robo Barrio,2024-01-16,moto`,
      geoJsonColumns: ['nombre', 'fecha', 'tipo_vehiculo (opcionales)'],
      geoJsonExample: `{
  "type": "Feature",
  "properties": { "nombre": "Robo Centro", "fecha": "2024-01-15", "tipo_vehiculo": "auto" },
  "geometry": { "type": "Point", "coordinates": [-57.5521, -38.0055] }
}`
    },
    alertas: {
      title: '🚨 ALERTAS',
      description: 'Puntos de alerta o situaciones especiales',
      format: 'CSV o GeoJSON (Point)',
      csvColumns: ['lat (obligatorio)', 'lng (obligatorio)', 'nombre', 'tipo', 'severidad'],
      csvExample: `lat,lng,nombre,tipo,severidad
-38.0055,-57.5521,Alerta 1,construcción,media
-38.0060,-57.5525,Alerta 2,peligro,alta`,
      geoJsonColumns: ['nombre', 'tipo', 'severidad (opcionales)'],
      geoJsonExample: `{
  "type": "Feature",
  "properties": { "nombre": "Alerta 1", "tipo": "construcción", "severidad": "media" },
  "geometry": { "type": "Point", "coordinates": [-57.5521, -38.0055] }
}`
    },
    zonas: {
      title: '⛔ ZONAS/ÁREAS',
      description: 'Áreas especiales (prohibidas, seguras, peligrosas, etc.)',
      format: 'GeoJSON (Polygon o MultiPolygon)',
      csvColumns: ['NO - Se requiere GeoJSON'],
      geoJsonExample: `{
  "type": "Feature",
  "properties": { "nombre": "Zona Peligrosa", "tipo": "riesgo", "descripcion": "Alta delincuencia" },
  "geometry": {
    "type": "Polygon",
    "coordinates": [[[lng, lat], [lng, lat], ...]]
  }
}`
    }
  };

  const createHelpHTML = (layerType) => {
    const format = formats[layerType];
    if (!format) return '<p>Formato desconocido</p>';

    let html = `
      <div class="format-help-modal">
        <div class="format-help-header">
          <h2>${format.title}</h2>
          <button class="close-format-help">&times;</button>
        </div>
        <div class="format-help-body">
          <p><strong>📝 Descripción:</strong> ${format.description}</p>
          <p><strong>📋 Formato aceptado:</strong> ${format.format}</p>
    `;

    // CSV section if applicable
    if (format.csvColumns && format.csvColumns[0] !== 'NO - Se requiere GeoJSON') {
      html += `
        <div class="format-section">
          <h3>📊 Opción 1: CSV (Comma-Separated Values)</h3>
          <p><strong>Columnas requeridas:</strong></p>
          <ul>
            <li><code>lat</code> - Latitud (obligatorio)</li>
            <li><code>lng</code> - Longitud (obligatorio)</li>
            ${format.csvColumns.slice(2).map(col => `<li><code>${col}</code> (opcional)</li>`).join('')}
          </ul>
          <p><strong>Ejemplo:</strong></p>
          <pre><code>${format.csvExample}</code></pre>
          ${format.csvInfo ? format.csvInfo : ''}
          <p>💡 <strong>Cómo crear</strong></p>
          <ol>
            <li>Abre Excel o Google Sheets</li>
            <li>Crea columnas: lat, lng, nombre, ${format.csvColumns.slice(2).join(', ')}</li>
            <li>Llena tus datos</li>
            <li>Guarda como CSV: Archivo → Descargar → CSV</li>
          </ol>
        </div>
      `;
    } else {
      html += `<p style="background: #fff3cd; padding: 8px; border-radius: 4px;">
        ⚠️ Este tipo de capa requiere <strong>GeoJSON</strong> (no acepta CSV)
      </p>`;
    }

    // GeoJSON section
    html += `
        <div class="format-section">
          <h3>🗺️ Opción 2: GeoJSON</h3>
          <p><strong>Propiedades opcionales:</strong></p>
          <ul>
            ${format.geoJsonColumns.map(col => `<li><code>${col}</code></li>`).join('')}
          </ul>
          <p><strong>Ejemplo:</strong></p>
          <pre><code>${format.geoJsonExample}</code></pre>
          <p>💡 <strong>Cómo crear</strong></p>
          <ol>
            <li>Usa <a href="https://geojson.io" target="_blank">geojson.io</a> (web gratuita)</li>
            <li>Dibuja las geometrías directamente en el mapa</li>
            <li>Agrega propiedades con información</li>
            <li>Descarga como archivo .geojson</li>
          </ol>
        </div>
    `;

    html += `
        <div class="format-tips">
          <h3>💡 Tips Importantes</h3>
          <ul>
            <li>✅ Las <strong>coordenadas deben ser válidas</strong>: Latitud entre -90 y +90, Longitud entre -180 y +180</li>
            <li>✅ El <strong>primer archivo debe ser Barrios</strong> (define la zona de la ciudad)</li>
            <li>✅ Los datos se almacenan localmente en tu navegador (no se suben a servidores)</li>
            <li>✅ Después de importar, los datos persistirán aunque reinicies el navegador</li>
          </ul>
        </div>
      </div>
    `;

    return html;
  };

  const showHelp = (layerType) => {
    // Remove existing help modal if any
    const existing = document.querySelector('.format-help-modal-container');
    if (existing) existing.remove();

    // Create overlay and modal
    const container = document.createElement('div');
    container.className = 'format-help-modal-container';
    container.innerHTML = createHelpHTML(layerType);

    document.body.appendChild(container);

    // Close button handler
    const closeBtn = container.querySelector('.close-format-help');
    if (closeBtn) {
      closeBtn.addEventListener('click', () => container.remove());
    }

    // Click outside to close
    container.addEventListener('click', (e) => {
      if (e.target === container) container.remove();
    });
  };

  return {
    showHelp,
    formats
  };
})();
