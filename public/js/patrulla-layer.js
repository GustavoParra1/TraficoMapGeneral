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
    // Icono para patrulla activa
    this.iconActiva = new L.Icon({
      iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-red.png',
      shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
      iconSize: [25, 41],
      iconAnchor: [12, 41],
      popupAnchor: [1, -34],
      shadowSize: [41, 41]
    });

    // Icono para patrulla en emergencia
    this.iconEmergencia = new L.Icon({
      iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-orange.png',
      shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
      iconSize: [25, 41],
      iconAnchor: [12, 41],
      popupAnchor: [1, -34],
      shadowSize: [41, 41]
    });

    // Icono para patrulla offline
    this.iconOffline = new L.Icon({
      iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-grey.png',
      shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
      iconSize: [25, 41],
      iconAnchor: [12, 41],
      popupAnchor: [1, -34],
      shadowSize: [41, 41]
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
    const coleccion = `patrullas_${this.municipio}`;
    
    this.unsubscribe = this.db.collection(coleccion)
      .onSnapshot((snapshot) => {
        const patentesEnBD = new Set();

        snapshot.forEach((doc) => {
          const patente = doc.id;
          const data = doc.data();
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
          }
        });

        // Remover patrullas que no están en la BD
        for (const [patente, patrulla] of this.patrullas) {
          if (!patentesEnBD.has(patente)) {
            this.removerPatrulla(patente);
          }
        }
      }, (error) => {
        console.error('Error en tracking de patrullas:', error);
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
      const icon = emergencia ? this.iconEmergencia : 
                   (!online ? this.iconOffline : this.iconActiva);

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

      // Actualizar icono
      const icon = emergencia ? this.iconEmergencia : 
                   (!online ? this.iconOffline : this.iconActiva);
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
    const tiempoFormato = timestamp 
      ? timestamp.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })
      : 'Sin datos';

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
