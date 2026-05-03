/**
 * Patrulla Layer Module
 * Muestra patrullas en el mapa con GPS en tiempo real
 * 
 * Uso en app.js:
 * const patullaLayer = new PatullaLayer(map, municipio, db);
 * patullaLayer.show();
 */

class PatullaLayer {
  constructor(map, municipio, firestore) {
    this.map = map;
    this.municipio = municipio;
    this.db = firestore;
    this.patrullas = new Map(); // { patente: { marker, popup, data } }
    this.unsubscribe = null;
    this.visible = true;
    this.selectedPatrulla = null;
    
    this.initializeIcons();
  }

  initializeIcons() {
    // Los iconos se crearán dinámicamente en actualizarPatrulla()
    // basándose en el número de patrulla y su estado
    console.log('✅ Icons initialized (dynamic creation enabled)');
  }

  crearIcon(patente, online, emergencia) {
    // Extraer número de patrulla (PATRULLA_01 → 01)
    const numPatrulla = patente.replace(/[^\d]/g, '').padStart(2, '0');

    // Determinar color según estado
    let bgColor = '#3b82f6'; // azul - en línea
    let borderColor = '#1e40af';
    
    if (emergencia) {
      bgColor = '#ef4444'; // rojo - emergencia
      borderColor = '#dc2626';
    } else if (!online) {
      bgColor = '#64748b'; // gris - offline
      borderColor = '#475569';
    }

    return L.divIcon({
      html: `
        <div style="
          width: 45px;
          height: 45px;
          background: ${bgColor};
          border: 3px solid ${borderColor};
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          color: white;
          font-weight: bold;
          font-size: 16px;
          font-family: Arial, sans-serif;
          box-shadow: 0 2px 8px rgba(0,0,0,0.4);
          transform: scale(1);
        ">
          ${numPatrulla}
        </div>
      `,
      iconSize: [45, 45],
      iconAnchor: [22, 22],
      popupAnchor: [0, -22],
      className: 'patrulla-marker-icon'
    });
  }

  show() {
    if (!this.unsubscribe) {
      this.startTracking();
    }
    this.visible = true;
    this.patrullas.forEach(patrulla => {
      if (patrulla.marker) patrulla.marker.addTo(this.map);
    });
  }

  hide() {
    this.visible = false;
    this.patrullas.forEach(patrulla => {
      if (patrulla.marker) this.map.removeLayer(patrulla.marker);
    });
  }

  startTracking() {
    // Remover guiones del municipio para construir el nombre correcto de la colección
    const municipioSinGuiones = this.municipio.replace(/-/g, '');
    const coleccion = `patrullas_${municipioSinGuiones}`;
    console.log(`🔍 PatullaLayer startTracking() iniciado para colección: ${coleccion}`);
    
    this.unsubscribe = this.db.collection(coleccion)
      .onSnapshot((snapshot) => {
        console.log(`📡 Snapshot recibido: ${snapshot.size} documentos en colección ${coleccion}`);
        const patentesEnBD = new Set();
        
        let iteracionCount = 0;
        snapshot.forEach((doc) => {
          try {
            iteracionCount++;
            const patente = doc.id;
            const data = doc.data();
            console.log(`  [${iteracionCount}/${snapshot.size}] 📄 ${patente}:`, {
              lat: data.lat,
              lng: data.lng,
              online: data.online,
              emergencia: data.emergencia,
              estado: data.estado
            });
            patentesEnBD.add(patente);

            const lat = data.lat;
            const lng = data.lng;
            const online = data.online !== false;
            const emergencia = data.emergencia || false;
            const estado = data.estado || 'activo';
            const timestamp = data.timestamp ? data.timestamp.toDate() : null;

            if (lat && lng) {
              this.actualizarPatrulla(patente, {
                lat,
                lng,
                online,
                emergencia,
                estado,
                timestamp,
                accuracy: data.accuracy,
                speed: data.speed,
                ...data
              });
              console.log(`  ✅ ${patente} ACTUALIZADO en mapa`);
            } else {
              console.warn(`  ❌ ${patente} OMITIDO: lat=${lat}, lng=${lng}`);
            }
          } catch (err) {
            console.error(`  ❌ ERROR procesando documento [${iteracionCount}]:`, err);
          }
        });

        console.log(`📊 forEach completó ${iteracionCount}/${snapshot.size} iteraciones. Map size: ${this.patrullas.size}, patentesEnBD: ${patentesEnBD.size}`);

        // Remover patrullas que no están en la BD
        for (const [patente, patrulla] of this.patrullas) {
          if (!patentesEnBD.has(patente)) {
            this.removerPatrulla(patente);
            console.log(`  🗑️ ${patente} REMOVIDA (no en BD)`);
          }
        }
      }, (error) => {
        console.error('❌ Error en tracking de patrullas:', error);
      });
  }

  stopTracking() {
    if (this.unsubscribe) {
      this.unsubscribe();
      this.unsubscribe = null;
    }
  }

  actualizarPatrulla(patente, data) {
    const { lat, lng, online, emergencia, estado, timestamp, accuracy, speed } = data;

    if (!this.patrullas.has(patente)) {
      // Crear nueva patrulla
      const icon = this.crearIcon(patente, online, emergencia);

      const marker = L.marker([lat, lng], { icon })
        .bindPopup(this.crearPopup(patente, data), { maxWidth: 250 });

      if (this.visible) {
        marker.addTo(this.map);
      }

      this.patrullas.set(patente, { marker, data });
    } else {
      // Actualizar patrulla existente
      const patrulla = this.patrullas.get(patente);
      patrulla.data = data;

      // Crear nuevo icono según estado actual
      const icon = this.crearIcon(patente, online, emergencia);
      patrulla.marker.setIcon(icon);

      // Actualizar posición
      patrulla.marker.setLatLng([lat, lng]);

      // Actualizar popup
      patrulla.marker.setPopupContent(this.crearPopup(patente, data));
    }
  }

  removerPatrulla(patente) {
    const patrulla = this.patrullas.get(patente);
    if (patrulla && patrulla.marker) {
      this.map.removeLayer(patrulla.marker);
    }
    this.patrullas.delete(patente);
  }

  crearPopup(patente, data) {
    const { lat, lng, online, emergencia, estado, timestamp, accuracy, speed } = data;
    
    // Convertir timestamp de Firestore a Date si es necesario
    let tiempoFormato = 'Sin datos';
    if (timestamp) {
      try {
        const date = timestamp instanceof Date ? timestamp : (timestamp.toDate ? timestamp.toDate() : new Date(timestamp));
        tiempoFormato = date.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' });
      } catch (e) {
        console.warn(`⚠️ Error formateando timestamp para ${patente}:`, e);
        tiempoFormato = 'Error en fecha';
      }
    }

    const estadoClase = emergencia ? '🚨' : (online ? '✅' : '❌');
    const estadoTexto = emergencia ? 'EMERGENCIA' : (online ? 'En línea' : 'Offline');

    return `
      <div style="font-family: Arial; font-size: 12px;">
        <b style="font-size: 14px; color: #dc2626;">🚓 ${patente}</b><br>
        <span style="color: ${emergencia ? '#dc2626' : (online ? '#10b981' : '#6b7280')};">
          ${estadoClase} ${estadoTexto}
        </span><br>
        <hr style="margin: 6px 0;">
        <strong>Ubicación:</strong><br>
        ${lat.toFixed(4)}, ${lng.toFixed(4)}<br>
        <strong>Precisión:</strong> ${accuracy ? accuracy.toFixed(0) + 'm' : 'N/A'}<br>
        <strong>Velocidad:</strong> ${speed ? (speed * 3.6).toFixed(0) + ' km/h' : 'Parado'}<br>
        <strong>Actualizado:</strong> ${tiempoFormato}<br>
        <button onclick="alert('Chat con ${patente}')" style="
          width: 100%; margin-top: 8px; padding: 6px;
          background: #3b82f6; color: white; border: none;
          border-radius: 4px; cursor: pointer; font-size: 11px;
        ">💬 Contactar</button>
      </div>
    `;
  }

  // Obtener patrulla por patente
  getPatrulla(patente) {
    return this.patrullas.get(patente);
  }

  // Obtener todas las patrullas
  getAllPatrullas() {
    return Array.from(this.patrullas.entries()).map(([patente, data]) => ({
      patente,
      ...data.data
    }));
  }

  // Contar patrullas
  count() {
    return this.patrullas.size;
  }

  // Contar patrullas online
  countOnline() {
    let count = 0;
    this.patrullas.forEach(p => {
      if (p.data.online) count++;
    });
    return count;
  }

  // Contar en emergencia
  countEmergencia() {
    let count = 0;
    this.patrullas.forEach(p => {
      if (p.data.emergencia) count++;
    });
    return count;
  }

  // Zoom a patrulla
  zoomToPatrulla(patente) {
    const patrulla = this.patrullas.get(patente);
    if (patrulla && patrulla.marker) {
      this.map.setView(patrulla.marker.getLatLng(), 16);
      patrulla.marker.openPopup();
      this.selectedPatrulla = patente;
    }
  }

  // Limpiar selección
  clearSelection() {
    this.selectedPatrulla = null;
    this.patrullas.forEach(p => {
      if (p.marker) p.marker.closePopup();
    });
  }

  // Destruir layer
  destroy() {
    this.stopTracking();
    this.patrullas.forEach(p => {
      if (p.marker) this.map.removeLayer(p.marker);
    });
    this.patrullas.clear();
  }
}

// Exportar para uso módular
if (typeof module !== 'undefined' && module.exports) {
  module.exports = PatullaLayer;
}
