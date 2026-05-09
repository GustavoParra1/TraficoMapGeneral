// public/client/js/client-map.js
// Manejo del mapa interactivo del cliente

class ClientMapManager {
  constructor() {
    this.map = null;
    this.layers = {}; // Guardar referencias a las capas
    this.layerControl = null;
    this.clientId = null;
    this.bounds = null; // Para auto-zoom
  }

  // Estilos visuales por tipo de dato
  getLayerStyle(type) {
    const styles = {
      cameras: {
        icon: 'https://cdn-icons-png.flaticon.com/512/3596/3596095.png',
        color: '#FF6B6B',
        label: '📹 Cámaras Públicas',
        iconSize: [32, 32]
      },
      private_cameras: {
        icon: 'https://cdn-icons-png.flaticon.com/512/3596/3596095.png',
        color: '#FF1744',
        label: '🔒 Cámaras Privadas',
        iconSize: [30, 30]
      },
      siniestros: {
        icon: 'https://cdn-icons-png.flaticon.com/512/3596/3596123.png',
        color: '#FFD700',
        label: '⚠️ Siniestros',
        iconSize: [28, 28]
      },
      semaforos: {
        icon: 'https://cdn-icons-png.flaticon.com/512/3050/3050159.png',
        color: '#90EE90',
        label: '🚦 Semáforos',
        iconSize: [28, 28]
      },
      colegios: {
        icon: 'https://cdn-icons-png.flaticon.com/512/3135/3135715.png',
        color: '#87CEEB',
        label: '🏫 Colegios/Escuelas',
        iconSize: [28, 28]
      },
      robo: {
        icon: 'https://cdn-icons-png.flaticon.com/512/3050/3050159.png',
        color: '#8B0000',
        label: '🚗 Robo Automotor',
        iconSize: [26, 26]
      }
    };
    return styles[type] || {
      icon: 'https://cdn-icons-png.flaticon.com/512/3050/3050159.png',
      color: '#667eea',
      label: type,
      iconSize: [26, 26]
    };
  }

  // Inicializar mapa
  async init(clientData, containerId = 'mapClient') {
    if (!document.getElementById(containerId)) {
      console.error('❌ Contenedor de mapa no encontrado');
      return;
    }

    this.clientId = clientData.id;
    console.log('🗺️ Inicializando mapa para cliente:', this.clientId);
    console.log('📋 Datos del cliente:', clientData);

    // Crear mapa - coordenadas iniciales según ciudad
    let initialLat = -34.9205;  // La Plata
    let initialLng = -57.9545;  // La Plata
    let initialZoom = 13;
    
    this.map = L.map(containerId).setView([initialLat, initialLng], initialZoom);

    // Agregar capa base (OSM)
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© OpenStreetMap contributors',
      maxZoom: 19
    }).addTo(this.map);

    // Crear FeatureGroups para capas
    this.layers = {
      cameras: L.featureGroup(),
      private_cameras: L.featureGroup(),
      siniestros: L.featureGroup(),
      semaforos: L.featureGroup(),
      colegios: L.featureGroup(),
      corredores: L.featureGroup(),
      barrios: L.featureGroup(),
      flujo: L.featureGroup(),
      robo: L.featureGroup(),
      colectivos: L.featureGroup()
    };

    // Agregar todas las capas al mapa por defecto
    Object.entries(this.layers).forEach(([name, layer]) => {
      layer.addTo(this.map);
      console.log(`✓ Capa agregada al mapa: ${name}`);
    });

    // Agregar control de capas
    this.addLayerControl();

    // Cargar datos
    await this.loadAllData();

    // Auto-zoom a los datos
    this.fitBounds();

    console.log('✅ Mapa inicializado');
  }

  // Cargar todos los datos desde Firestore
  async loadAllData() {
    try {
      console.log('📍 Cargando datos del cliente:', this.clientId);

      // Cámaras públicas
      await this.loadCameras('cameras', 'cameras');

      // Cámaras privadas
      await this.loadCameras('private_cameras', 'cameras_privadas');

      // Siniestros
      await this.loadSiniestros();

      // Semáforos
      await this.loadMarkers('semaforos', 'semaforos');

      // Colegios/Escuelas
      await this.loadMarkers('colegios', 'colegios_escuelas');

      // Robo automotor
      await this.loadMarkers('robo', 'robo');

      // Capas GeoJSON

      // Barrios
      await this.loadGeoJSON('barrios', 'barrios');

      // Corredores escolares
      await this.loadGeoJSON('corredores', 'corredores_escolares');

      // Flujo vehicular (aforos)
      await this.loadMarkers('flujo', 'flujo');

      // Líneas de colectivos
      await this.loadColectivos();

      console.log('✅ Todos los datos cargados');
      console.log('📊 Bounds actual:', this.bounds);
    } catch (error) {
      console.error('❌ Error cargando datos:', error);
    }
  }

  // Cargar cámaras (CSV/GeoJSON)
  async loadCameras(layerKey, collectionName) {
    try {
      // Intentar primero sin prefijo (colecciones raíz)
      let colPath = collectionName;
      console.log(`🔄 Cargando ${collectionName} desde: ${colPath}`);
      
      let ref = firebase.firestore().collection(colPath);
      let snap = await ref.get();
      
      // Si está vacío, intentar con la estructura clientes/
      if (snap.empty) {
        colPath = `clientes/${this.clientId}/${collectionName}`;
        console.log(`  → Intentando con estructura: ${colPath}`);
        ref = firebase.firestore().collection(colPath);
        snap = await ref.get();
      }

      let count = 0;
      snap.forEach(doc => {
        const data = doc.data();
        const { lat, lng, nombre, descripcion } = data;
        
        console.log(`  📸 Doc ID: ${doc.id} | Coords: [${lat}, ${lng}] | Nombre: ${nombre || descripcion || 'sin nombre'}`);
        
        if (lat && lng) {
          const style = this.getLayerStyle(layerKey);
          const marker = this.createMarker([lat, lng], {
            title: nombre || descripcion || 'Cámara',
            type: collectionName,
            icon: style.icon,
            iconSize: style.iconSize
          });
          marker.addTo(this.layers[layerKey]);
          count++;
          this.expandBounds([lat, lng]);
        } else {
          console.log(`    ✗ Coords incompletas: lat=${lat}, lng=${lng}`);
        }
      });

      const action = count > 0 ? '✅' : '⚠️';
      console.log(`${action} ${count} ${this.getLayerStyle(layerKey).label} cargadas`);
    } catch (error) {
      console.error(`❌ Error cargando ${collectionName}:`, error);
    }
  }

  // Cargar markers simples (siniestros, semáforos, etc.)
  async loadMarkers(layerKey, collectionName) {
    try {
      // Intentar primero sin prefijo (colecciones raíz)
      let colPath = collectionName;
      console.log(`🔄 Cargando ${collectionName} desde: ${colPath}`);
      
      // Usar this.db si está disponible, sino firebase.firestore()
      const db = this.db || firebase.firestore();
      let ref = db.collection(colPath);
      let snap = await ref.get();
      let totalCount = snap.size;
      
      // Si está vacío, intentar con la estructura clientes/
      if (totalCount === 0) {
        colPath = `clientes/${this.clientId}/${collectionName}`;
        console.log(`  → Intentando con estructura: ${colPath}`);
        ref = db.collection(colPath);
        snap = await ref.get();
        totalCount = snap.size;
      }
      
      if (totalCount === 0) {
        console.warn(`⚠️ ${collectionName}: 0 documentos encontrados`);
        return;
      }
      
      console.log(`📊 Total de ${collectionName}: ${totalCount}, cargando en lotes...`);
      
      // Cargar en chunks de 50 para no congelar el navegador
      const pageSize = 50;
      let loadedCount = 0;
      let lastDoc = null;
      
      while (loadedCount < totalCount) {
        let query = ref.orderBy('__name__').limit(pageSize);
        
        if (lastDoc) {
          query = query.startAfter(lastDoc);
        }
        
        const snap = await query.get();
        
        if (snap.empty) break;
        
        // Procesar batch de documentos
        for (const doc of snap.docs) {
          const data = doc.data();
          if (data.lat && data.lng) {
            const style = this.getLayerStyle(layerKey);
            const marker = this.createMarker([data.lat, data.lng], {
              title: data.nombre || data.descripcion || 'Punto',
              type: layerKey,
              icon: style.icon,
              iconSize: style.iconSize
            });
            marker.addTo(this.layers[layerKey]);
            loadedCount++;
            this.expandBounds([data.lat, data.lng]);
          }
        }
        
        lastDoc = snap.docs[snap.docs.length - 1];
        
        // Log de progreso cada 100 items
        if (loadedCount % 100 === 0) {
          console.log(`  📍 Progreso: ${loadedCount}/${totalCount}`);
        }
        
        // Sin delay para cargar más rápido
      }

      const action = loadedCount > 0 ? '✅' : '⚠️';
      console.log(`${action} ${loadedCount} ${this.getLayerStyle(layerKey).label} cargados`);
    } catch (error) {
      console.error(`❌ Error cargando ${collectionName}:`, error);
    }
  }

  // Cargar siniestros (con detalles específicos)
  async loadSiniestros() {
    try {
      // Intentar primero sin prefijo (colecciones raíz)
      let colPath = 'siniestros';
      console.log(`🔄 Cargando siniestros desde: ${colPath}`);
      
      let ref = firebase.firestore().collection(colPath);
      let snap = await ref.get();
      let totalCount = snap.size;
      
      // Si está vacío, intentar con la estructura clientes/
      if (totalCount === 0) {
        colPath = `clientes/${this.clientId}/siniestros`;
        console.log(`  → Intentando con estructura: ${colPath}`);
        ref = firebase.firestore().collection(colPath);
        snap = await ref.get();
        totalCount = snap.size;
      }
      
      if (totalCount === 0) {
        console.warn('⚠️ siniestros: 0 documentos encontrados');
        return;
      }
      
      console.log(`📊 Total de siniestros: ${totalCount}, cargando en lotes...`);
      
      // Cargar en chunks de 50 para no congelar el navegador
      const pageSize = 50;
      let loadedCount = 0;
      let lastDoc = null;
      
      while (loadedCount < totalCount) {
        let query = ref.orderBy('__name__').limit(pageSize);
        
        if (lastDoc) {
          query = query.startAfter(lastDoc);
        }
        
        const snap = await query.get();
        
        if (snap.empty) break;
        
        for (const doc of snap.docs) {
          const data = doc.data();
          if (data.lat && data.lng) {
            const marker = this.createMarker([data.lat, data.lng], {
              title: data.suceso || 'Siniestro',
              type: 'siniestros',
              icon: 'https://cdn-icons-png.flaticon.com/512/3596/3596123.png',
              iconSize: [28, 28]
            });

            const popupContent = `
              <div style="max-width: 250px; font-size: 12px;">
                <strong>${data.suceso || 'Siniestro'}</strong><br>
                ${data.descripcion ? `<small>${data.descripcion}</small><br>` : ''}
                <small class="text-muted">${this.formatDate(data.fecha)}</small>
              </div>
            `;
            marker.bindPopup(popupContent);

            marker.addTo(this.layers.siniestros);
            loadedCount++;
            this.expandBounds([data.lat, data.lng]);
          }
        }
        
        lastDoc = snap.docs[snap.docs.length - 1];
        
        if (loadedCount % 100 === 0) {
          console.log(`  📍 Progreso: ${loadedCount}/${totalCount}`);
        }
        
        // Sin delay para cargar más rápido;
      }

      const action = loadedCount > 0 ? '✅' : '⚠️';
      console.log(`${action} ${loadedCount} siniestros cargados`);
    } catch (error) {
      console.error('❌ Error cargando siniestros:', error);
    }
  }

  // Cargar datos GeoJSON (barrios, corredores)
  async loadGeoJSON(layerKey, collectionName) {
    try {
      // Intentar primero sin prefijo (colecciones raíz)
      let colPath = collectionName;
      console.log(`🔄 Cargando ${collectionName} desde: ${colPath}`);
      
      let ref = firebase.firestore().collection(colPath);
      let snap = await ref.get();
      let totalCount = snap.size;
      
      // Si está vacío, intentar con la estructura clientes/
      if (totalCount === 0) {
        colPath = `clientes/${this.clientId}/${collectionName}`;
        console.log(`  → Intentando con estructura: ${colPath}`);
        ref = firebase.firestore().collection(colPath);
        snap = await ref.get();
        totalCount = snap.size;
      }
      
      if (totalCount === 0) {
        console.warn(`⚠️ ${collectionName}: 0 documentos encontrados`);
        return;
      }
      
      console.log(`📊 Total de ${collectionName}: ${totalCount}, cargando en lotes...`);
      
      const pageSize = 50;
      let loadedCount = 0;
      let lastDoc = null;
      
      while (loadedCount < totalCount) {
        let query = ref.orderBy('__name__').limit(pageSize);
        
        if (lastDoc) {
          query = query.startAfter(lastDoc);
        }
        
        const snap = await query.get();
        
        if (snap.empty) break;
        
        for (const doc of snap.docs) {
          const data = doc.data();
          
          // Intentar obtener geometry: primero desde 'geometry', luego desde 'geometryJSON'
          let geometry = data.geometry;
          if (!geometry && data.geometryJSON) {
            try {
              geometry = JSON.parse(data.geometryJSON);
            } catch (e) {
              console.warn(`⚠️ No se pudo parsear geometryJSON para ${data.nombre}`);
            }
          }
          
          if (geometry) {
            const feature = {
              type: 'Feature',
              geometry: geometry,
              properties: data.properties || { nombre: data.nombre }
            };

            const geoJsonLayer = L.geoJSON(feature, {
              style: {
                color: layerKey === 'barrios' ? '#667eea' : '#FF8C00',
                weight: 2,
                opacity: 0.7,
                fillOpacity: 0.3
              },
              onEachFeature: (feature, layer) => {
                const props = feature.properties || {};
                const popupContent = `<strong>${props.nombre || 'Zona'}</strong>`;
                layer.bindPopup(popupContent);
              }
            });

            geoJsonLayer.addTo(this.layers[layerKey]);
            loadedCount++;
          }
        }
        
        lastDoc = snap.docs[snap.docs.length - 1];
        
        if (loadedCount % 50 === 0) {
          console.log(`  📍 Progreso GeoJSON: ${loadedCount}/${totalCount}`);
        }
        
        // Sin delay para cargar más rápido
      }

      const action = loadedCount > 0 ? '✅' : '⚠️';
      console.log(`${action} ${loadedCount} ${collectionName} cargados`);
    } catch (error) {
      console.error(`❌ Error cargando ${collectionName}:`, error);
    }
  }

  // Cargar líneas de colectivos
  async loadColectivos() {
    try {
      // Intentar primero sin prefijo (colecciones raíz)
      let colPath = 'colectivos';
      console.log(`🔄 Cargando colectivos desde: ${colPath}`);
      
      let ref = firebase.firestore().collection(colPath);
      let snap = await ref.get();
      
      // Si está vacío, intentar con la estructura clientes/
      if (snap.empty) {
        colPath = `clientes/${this.clientId}/colectivos`;
        console.log(`  → Intentando con estructura: ${colPath}`);
        ref = firebase.firestore().collection(colPath);
        snap = await ref.get();
      }

      let count = 0;
      snap.forEach(doc => {
        const data = doc.data();
        if (data.features && Array.isArray(data.features)) {
          // Si es una FeatureCollection almacenada como documento
          data.features.forEach(feature => {
            if (feature.geometry.type === 'LineString') {
              const lineLayer = L.polyline(
                feature.geometry.coordinates.map(coord => [coord[1], coord[0]]),
                {
                  color: '#FF6B6B',
                  weight: 3,
                  opacity: 0.8,
                  dashArray: '5, 5'
                }
              );
              lineLayer.addTo(this.layers.colectivos);
            } else if (feature.geometry.type === 'Point') {
              const pointMarker = this.createMarker(
                [feature.geometry.coordinates[1], feature.geometry.coordinates[0]],
                {
                  title: 'Parada',
                  type: 'colectivos',
                  icon: 'https://cdn-icons-png.flaticon.com/512/3935/3935715.png',
                  iconSize: [20, 20]
                }
              );
              pointMarker.addTo(this.layers.colectivos);
            }
          });
          count++;
        } else if (data.geometry && data.geometry.type === 'LineString') {
          // Si es un documento individual con LineString
          const lineLayer = L.polyline(
            data.geometry.coordinates.map(coord => [coord[1], coord[0]]),
            {
              color: '#FF6B6B',
              weight: 3,
              opacity: 0.8,
              dashArray: '5, 5'
            }
          );
          lineLayer.addTo(this.layers.colectivos);
          count++;
        }
      });

      const action = count > 0 ? '✅' : '⚠️';
      console.log(`${action} ${count} líneas de colectivos cargadas`);
    } catch (error) {
      console.error('❌ Error cargando colectivos:', error);
    }
  }

  // Crear marker con icono
  createMarker(latlng, options) {
    const marker = L.marker(latlng, {
      icon: L.icon({
        iconUrl: options.icon,
        iconSize: options.iconSize || [32, 32],
        iconAnchor: [options.iconSize[0] / 2, options.iconSize[1]],
        popupAnchor: [0, -options.iconSize[1]]
      }),
      title: options.title
    });

    if (options.title) {
      marker.bindPopup(`<strong>${options.title}</strong>`);
    }

    return marker;
  }

  // Agregar control de capas
  addLayerControl() {
    const overlayMaps = {
      '📹 Cámaras Públicas': this.layers.cameras,
      '🔒 Cámaras Privadas': this.layers.private_cameras,
      '⚠️ Siniestros': this.layers.siniestros,
      '🚦 Semáforos': this.layers.semaforos,
      '🏫 Colegios': this.layers.colegios,
      '🛣️ Corredores Escolares': this.layers.corredores,
      '📍 Barrios': this.layers.barrios,
      '📊 Flujo Vehicular': this.layers.flujo,
      '🚗 Robo Automotor': this.layers.robo,
      '🚌 Colectivos': this.layers.colectivos
    };

    this.layerControl = L.control.layers(null, overlayMaps, {
      position: 'topright',
      collapsed: false
    }).addTo(this.map);
  }

  // Expandir bounds para auto-zoom
  expandBounds(latlng) {
    if (!this.bounds) {
      this.bounds = L.latLngBounds(latlng, latlng);
      console.log(`  [Bounds] Primer punto: [${latlng[0]}, ${latlng[1]}]`);
    } else {
      this.bounds.extend(latlng);
      console.log(`  [Bounds] Extendido a: [${latlng[0]}, ${latlng[1]}]`);
    }
  }

  // Auto-zoom a los datos
  fitBounds() {
    if (!this.bounds) {
      console.log('⚠️ Sin datos - mantiene La Plata');
      this.map.setView([-34.92, -57.95], 13);
      return;
    }
    
    const bounds = this.bounds.toBBoxString().split(',').map(x => parseFloat(x));
    const latDiff = Math.abs(bounds[0] - bounds[2]);
    const lngDiff = Math.abs(bounds[1] - bounds[3]);
    
    console.log('📊 Bounds detallado:', {
      minLat: bounds[0],
      minLng: bounds[1],
      maxLat: bounds[2],
      maxLng: bounds[3],
      latDiff: latDiff.toFixed(4),
      lngDiff: lngDiff.toFixed(4)
    });
    
    // Si la dispersión es significativa (> 0.05 grados ~5km), hacer zoom
    if (latDiff > 0.05 || lngDiff > 0.05) {
      console.log('📍 Auto-zoom a los datos - dispersión significativa');
      this.map.fitBounds(this.bounds, { padding: [50, 50] });
    } else {
      console.log('ℹ️ Datos muy concentrados - centrando en ese área con zoom 15');
      if (this.bounds) {
        this.map.setView(this.bounds.getCenter(), 15);
      }
    }
  }

  // Formatear fecha
  formatDate(date) {
    if (!date) return '';
    if (date.toDate) return date.toDate().toLocaleDateString('es-AR');
    if (typeof date === 'string') return new Date(date).toLocaleDateString('es-AR');
    return '';
  }
}

// Instancia global
const clientMapManager = new ClientMapManager();
console.log('✅ ClientMapManager loaded');
