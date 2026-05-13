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
      geoJsonColumns: ['nombre (obligatorio)', 'descripcion (opcional)', 'otros (opcional)'],
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
}`,
      geoJsonExample: `{
  "type": "Feature",
  "properties": { "nombre": "Barrio Centro", "descripcion": "Zona central" },
  "geometry": {
    "type": "Polygon",
    "coordinates": [[[-57.95, -34.92], [-57.94, -34.92], [-57.94, -34.93], [-57.95, -34.93], [-57.95, -34.92]]]
  }
}`
    },
    siniestros: {
      title: '🚗 SINIESTROS',
      description: 'Puntos de accidentes/eventos viales',
      format: 'CSV o GeoJSON (Point)',
      csvColumns: ['lat (OBLIGATORIO)', 'lng (OBLIGATORIO)', 'hora (RECOMENDADO)', 'causa', 'participantes', 'fecha', 'descripcion'],
      csvExample: `lat,lng,hora,causa,participantes,fecha,descripcion
-38.0055,-57.5521,09:30,D,A/M,2024-01-15,Choque doble
-38.0060,-57.5525,14:15,A,M/P,2024-01-16,Caída de moto`,
      csvInfo: `
        <p style="background: #ffe0e0; padding: 10px; border-radius: 4px; margin: 10px 0;">
          <strong>⚠️ IMPORTANTE:</strong> Las columnas <code>lat</code> y <code>lng</code> son <strong>OBLIGATORIAS</strong>.<br>
          No se soporta lookup por cámara. Todos los siniestros deben tener coordenadas exactas.<br>
          <strong>La validación es estricta:</strong> Si hay algún error en causas, participantes o formato de hora, <u>no se subirá ningún dato</u> y se mostrarán los errores detectados.<br>
          <strong>Funciona para cualquier ciudad:</strong> Solo cambia el archivo CSV y el cliente correspondiente.
        </p>
        <p style="background: #fff3cd; padding: 10px; border-radius: 4px; margin: 10px 0;">
          <strong>🕐 Propiedad RECOMENDADA - hora:</strong> Formato <code>HH:MM</code> (ej: 09:30, 14:15, 23:59).<br>
          Si no se proporciona, el sistema generará horas automáticas basadas en el contenido del registro.
        </p>
        <p><strong>🔴 Códigos de Causas (solo se aceptan estos):</strong></p>
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
        <p><strong>👥 Códigos de Participantes (solo se aceptan estos):</strong></p>
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
      geoJsonColumns: ['hora (RECOMENDADO)', 'causa', 'participantes', 'fecha', 'descripcion (opcionales)'],
      geoJsonExample: `{
  "type": "Feature",
  "properties": { "hora": "09:30", "causa": "D", "participantes": "A/M", "fecha": "2024-01-15" },
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
      format: 'GeoJSON (Point)',
      csvColumns: ['NO - Se requiere GeoJSON'],
      csvInfo: `
        <p style="background: #e3f2fd; padding: 10px; border-radius: 4px; margin: 10px 0;">
          <strong>❓ ¿POR QUÉ GEOJSON?</strong> Las coordenadas <code>[lng, lat]</code> en la sección <code>geometry</code> son lo que ubica cada colegio en el mapa. Es OBLIGATORIO.
        </p>
        <p><strong>📋 Estructura obligatoria:</strong></p>
        <ul style="font-size: 12px;">
          <li><code>"type": "Feature"</code> - Define que es un punto</li>
          <li><code>"properties"</code> - Datos del colegio (Name, description, address, barrio)</li>
          <li><code>"geometry": {"type": "Point", "coordinates": [lng, lat]}</code> - <strong>¡ESTO UBICA EL PUNTO EN EL MAPA!</strong></li>
        </ul>
        <p><strong>✅ Propiedades compatibles (Mar del Plata + Córdoba):</strong></p>
        <ul style="font-size: 12px;">
          <li><code>Name</code> - Nombre del colegio/escuela (OBLIGATORIO)</li>
          <li><code>description</code> - Nivel: primario, secundario, jardín, etc. (puede ser null)</li>
          <li><code>address</code> - Dirección (OPCIONAL)</li>
          <li><code>barrio</code> - Barrio o zona (OPCIONAL)</li>
        </ul>
        <p><strong>✅ Forma fácil de crear:</strong></p>
        <ul style="font-size: 12px;">
          <li>Usa <a href="https://geojson.io" target="_blank">geojson.io</a> - Haz clic en el mapa y automáticamente genera las coordenadas</li>
          <li>O exporta desde Google Maps/Earth con coordenadas y convierte con herramientas online</li>
        </ul>
        <p style="background: #fff3cd; padding: 8px; border-left: 3px solid #FF9800; margin: 10px 0;">
          💡 <strong>Sin coordinates, el colegio NO aparecerá en el mapa.</strong> Las coordenadas son lo más importante.
        </p>
      `,
      geoJsonColumns: ['Name (obligatorio)', 'description (opt)', 'address (opt)', 'barrio (opt)'],
      geoJsonExample: `{
  "type": "Feature",
  "properties": {
    "Name": "Escuela N° 1 - Centro",
    "description": "Primaria",
    "address": "Rivadavia 550",
    "barrio": "Centro"
  },
  "geometry": {
    "type": "Point",
    "coordinates": [-64.1863, -31.4178]
  }
}`
    },
    corredores: {
      title: '🛣️ CORREDORES ESCOLARES',
      description: 'Rutas seguras cercanas a escuelas',
      format: 'GeoJSON (LineString o MultiLineString)',
      csvColumns: ['NO - Se requiere GeoJSON con rutas'],
      geoJsonColumns: ['nombre', 'escuela', 'extension_km (opcionales)'],
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
      title: '📊 FLUJO VEHICULAR (AFOROS)',
      description: 'Datos de aforos vehiculares - conteo de vehículos por tipo en rango horario',
      format: 'CSV (obligatorio)',
      csvColumns: ['N CAMARA (obligatorio)', 'DIRECCION (obligatorio)', 'FECHA (MM/DD/YYYY)', 'DIA', 'HORA (HH a HH)', 'PART (tipo vehículo)', 'TOTAL (obligatorio)'],
      csvExample: `N CAMARA,DIRECCION,FECHA,DIA,HORA,PART,TOTAL
306,Quintana y Patricio Peralta Ramos,12/10/2022,sabado,06 a 07,auto,1434
306,Quintana y Patricio Peralta Ramos,12/10/2022,sabado,06 a 07,moto,54
306,Quintana y Patricio Peralta Ramos,12/10/2022,sabado,06 a 07,bici,12
306,Quintana y Patricio Peralta Ramos,12/10/2022,sabado,06 a 07,colectivo,12
306,Quintana y Patricio Peralta Ramos,12/10/2022,sabado,06 a 07,camiones,0`,
      geoJsonColumns: ['NO - Se requiere CSV para aforos'],
      geoJsonExample: 'No aplica para aforos'
    },
    robo: {
      title: '🚗 ROBO AUTOMOTOR',
      description: 'Ubicaciones de robos de vehículos con tipo de resultado e intervención',
      format: 'CSV o GeoJSON (Point)',
      csvColumns: ['lat (obligatorio)', 'lng (obligatorio)', 'fecha', 'resultado', 'observaciones', 'año'],
      csvExample: `lat,lng,fecha,resultado,observaciones,año
-38.032577,-57.5876566,2023-01-01,Asiste Policia y Libera,Centro,2023
-38.012543,-57.5816004,2023-01-01,Hallazgo Automotor,Barrio Norte,2023
-38.077284,-57.5496172,2024-01-15,Persecucion Y Detencion,Zona Industrial,2024`,
      csvInfo: `
            <div style="background: #f0f8ff; padding: 12px; margin: 10px 0; border-radius: 4px; border-left: 4px solid #0066ff;">
              <strong>📌 Valores válidos para "resultado" (con color asignado):</strong>
              <div style="margin: 8px 0; padding-left: 20px; font-size: 12px; line-height: 1.8;">
                <div style="display: flex; gap: 10px; align-items: center; margin-bottom: 6px;">
                  <span style="display: inline-block; width: 16px; height: 16px; background-color: #f39c12; border-radius: 50%; border: 1px solid #333;"></span>
                  <code>Asiste Policia y Libera</code>
                </div>
                <div style="display: flex; gap: 10px; align-items: center; margin-bottom: 6px;">
                  <span style="display: inline-block; width: 16px; height: 16px; background-color: #27ae60; border-radius: 50%; border: 1px solid #333;"></span>
                  <code>Hallazgo Automotor</code>
                </div>
                <div style="display: flex; gap: 10px; align-items: center; margin-bottom: 6px;">
                  <span style="display: inline-block; width: 16px; height: 16px; background-color: #e74c3c; border-radius: 50%; border: 1px solid #333;"></span>
                  <code>Persecucion Y Detencion</code>
                </div>
                <div style="display: flex; gap: 10px; align-items: center; margin-bottom: 6px;">
                  <span style="display: inline-block; width: 16px; height: 16px; background-color: #c0392b; border-radius: 50%; border: 1px solid #333;"></span>
                  <code>Detencion</code>
                </div>
                <div style="display: flex; gap: 10px; align-items: center; margin-bottom: 6px;">
                  <span style="display: inline-block; width: 16px; height: 16px; background-color: #3498db; border-radius: 50%; border: 1px solid #333;"></span>
                  <code>Se Realiza Seguimiento del Evento</code>
                </div>
                <div style="display: flex; gap: 10px; align-items: center; margin-bottom: 6px;">
                  <span style="display: inline-block; width: 16px; height: 16px; background-color: #f1c40f; border-radius: 50%; border: 1px solid #333;"></span>
                  <code>No Asiste</code>
                </div>
                <div style="display: flex; gap: 10px; align-items: center; margin-bottom: 6px;">
                  <span style="display: inline-block; width: 16px; height: 16px; background-color: #9b59b6; border-radius: 50%; border: 1px solid #333;"></span>
                  <code>Secuestro De Vehiculo</code>
                </div>
                <div style="display: flex; gap: 10px; align-items: center; margin-bottom: 6px;">
                  <span style="display: inline-block; width: 16px; height: 16px; background-color: #e67e22; border-radius: 50%; border: 1px solid #333;"></span>
                  <code>Asiste Bomberos</code>
                </div>
                <div style="display: flex; gap: 10px; align-items: center; margin-bottom: 6px;">
                  <span style="display: inline-block; width: 16px; height: 16px; background-color: #34495e; border-radius: 50%; border: 1px solid #333;"></span>
                  <code>Persecucion Y Perdida</code>
                </div>
                <div style="display: flex; gap: 10px; align-items: center; margin-bottom: 6px;">
                  <span style="display: inline-block; width: 16px; height: 16px; background-color: #1abc9c; border-radius: 50%; border: 1px solid #333;"></span>
                  <code>Asiste Unidad Sanitaria y Traslada</code>
                </div>
                <div style="display: flex; gap: 10px; align-items: center;">
                  <span style="display: inline-block; width: 16px; height: 16px; background-color: #95a5a6; border-radius: 50%; border: 1px solid #333;"></span>
                  <code>Otros</code> (para valores no definidos)
                </div>
              </div>
            </div>
            <strong>💡 Notas importantes:</strong>
            <ul style="padding-left: 20px;">
              <li>Las coordenadas deben estar en Argentina: lat entre -56 y -20, lng entre -75 y -50</li>
              <li>La fecha debe estar en formato YYYY-MM-DD</li>
              <li>El campo "resultado" define el color del marcador en el mapa - ¡DEBE coincidir exactamente!</li>
              <li>El campo "observaciones" puede contener nombre de barrio, dirección, o notas</li>
              <li>El año se extrae automáticamente de la fecha si no lo especificas</li>
            </ul>
      `,
      geoJsonColumns: ['fecha', 'resultado', 'observaciones', 'año (opcionales)'],
      geoJsonExample: `{
  "type": "Feature",
  "properties": { "fecha": "2023-01-01", "resultado": "Asiste Policia y Libera", "observaciones": "Centro", "año": 2023 },
  "geometry": { "type": "Point", "coordinates": [-57.5876566, -38.032577] }
}`
    },
    'lineas-colectivos': {
      title: '🚌 LÍNEAS DE COLECTIVOS',
      description: 'Rutas de transporte público - múltiples líneas con paradas y trazado',
      format: 'GeoJSON (Multiple Features con Points y LineString)',
      csvColumns: ['NO - Se requiere GeoJSON'],
      geoJsonColumns: ['numero (obligatorio)', 'nombre (obligatorio)', 'origen (opt)', 'destino (opt)', 'otros campos (opt)'],
      csvInfo: `
        <p style="background: #e3f2fd; padding: 12px; margin: 10px 0; border-radius: 4px; border-left: 4px solid #0066ff;">
          <strong>📌 Estructura de Líneas de Colectivos:</strong>
          <div style="margin: 8px 0; padding-left: 20px; font-size: 12px; line-height: 1.8;">
            <p><strong>• Paradas (Points):</strong> Cada parada es una Feature con tipo Point</p>
            <p><strong>• Ruta (LineString):</strong> Una Feature con tipo LineString que conecta todas las paradas</p>
            <p><strong>• Propiedades:</strong> Información de la línea (número, nombre, origen, destino)</p>
          </div>
        </p>
        <p><strong>✅ Reglas importantes:</strong></p>
        <ul style="font-size: 12px; padding-left: 20px;">
          <li>El archivo se nomina: <code>linea{numero}.geojson</code> (ej: linea542.geojson, linea1.geojson)</li>
          <li>Puede contener múltiples Features (paradas + ruta) en un solo archivo</li>
          <li>Las coordenadas están en formato [longitude, latitude]</li>
          <li>El LineString define la ruta visual en el mapa</li>
          <li>Los Points opcional (pueden ser null en properties)</li>
          <li>Subir TODOS los archivos linea*.geojson juntos - El sistema los procesa automáticamente</li>
        </ul>
      `,
      geoJsonExample: `{
  "type": "FeatureCollection",
  "features": [
    {
      "type": "Feature",
      "geometry": {
        "type": "Point",
        "coordinates": [-57.608124, -37.991]
      },
      "properties": null
    },
    {
      "type": "Feature",
      "geometry": {
        "type": "Point",
        "coordinates": [-57.5776077, -37.96721]
      },
      "properties": null
    },
    {
      "type": "Feature",
      "geometry": {
        "type": "LineString",
        "coordinates": [
          [-57.608124, -37.991],
          [-57.608107, -37.991136],
          [-57.597806, -37.998924],
          [-57.596991, -37.999119],
          [-57.579972, -37.95733],
          [-57.583795, -37.910799]
        ]
      },
      "properties": null
    }
  ]
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

    // Determinar si es solo CSV, solo GeoJSON, o ambos
    const onlyGeojson = format.csvColumns && format.csvColumns[0] === 'NO - Se requiere GeoJSON';
    const onlyCSV = format.geoJsonColumns && format.geoJsonColumns[0] === 'NO - Se requiere CSV para aforos';
    
    // CSV section if applicable
    if (!onlyGeojson) {
      const isAforos = layerType === 'flujo';
      
      if (isAforos) {
        html += `
          <div class="format-section">
            <h3>📊 Formato CSV (Obligatorio)</h3>
            <p><strong>Columnas requeridas:</strong></p>
            <ul>
              <li><code>N CAMARA</code> - ID de la cámara (debe coincidir con cameras.geojson)</li>
              <li><code>DIRECCION</code> - Ubicación o dirección</li>
              <li><code>FECHA</code> - Formato: MM/DD/YYYY</li>
              <li><code>DIA</code> - Día de la semana (lunes, martes, etc.)</li>
              <li><code>HORA</code> - Rango: "06 a 07", "07 a 08", etc.</li>
              <li><code>PART</code> - Tipo vehículo: auto, moto, bici, colectivo, camiones</li>
              <li><code>TOTAL</code> - Cantidad de vehículos (número)</li>
            </ul>
            <p><strong>Ejemplo:</strong></p>
            <pre><code>${format.csvExample}</code></pre>
`;
        html += format.csvInfo ? format.csvInfo : '';
        html += `
            <p>💡 <strong>Cómo crear</strong></p>
            <ol>
              <li>Abre Excel o Google Sheets</li>
              <li>Crea columnas: N CAMARA, DIRECCION, FECHA, DIA, HORA, PART, TOTAL</li>
              <li>Para CADA hora y CADA tipo de vehículo, crea una fila</li>
              <li>Asegúrate que los IDs de cámara coincidan con tu cameras.geojson</li>
              <li>Guarda como CSV: Archivo → Descargar → CSV</li>
            </ol>
          </div>
        `;
      } else if (!onlyGeojson && format.csvColumns && format.csvColumns[0] !== 'NO - Se requiere GeoJSON') {
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
      }
    }

    // GeoJSON section
    if (!onlyCSV) {
      const title = onlyGeojson ? 'GeoJSON (Obligatorio)' : (layerType === 'flujo' ? '' : 'Opción 2: GeoJSON');
      const showTitle = !onlyCSV && title !== '';
      
      html += `
        <div class="format-section">
          ${showTitle ? `<h3>🗺️ ${title}</h3>` : ''}
          <p><strong>${onlyGeojson ? '' : 'Propiedades '}${onlyGeojson ? 'Propiedades requeridas:' : 'opcionales:'}${onlyGeojson ? '' : ''}</strong></p>
          <ul>
            ${format.geoJsonColumns.map(col => `<li><code>${col}</code></li>`).join('')}
          </ul>`;
          
      if (format.csvInfo && onlyGeojson) {
        html += format.csvInfo;
      }
      
      html += `<p><strong>Ejemplo:</strong></p>
          <pre><code>${format.geoJsonExample}</code></pre>
          <p>💡 <strong>Cómo crear</strong></p>
          <ol>
            <li>Usa <a href="https://geojson.io" target="_blank">geojson.io</a> (web gratuita)</li>
            <li>Haz clic en el mapa para crear puntos con coordenadas automáticas</li>
            <li>Agrega propiedades con información en la sección Properties</li>
            <li>Descarga como archivo .geojson</li>
          </ol>
        </div>
      `;
    }

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
