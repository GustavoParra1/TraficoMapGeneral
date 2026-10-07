/* ============================================================================
 * 🚗 AUTO CON GPS (app de vecinos)
 * Módulo independiente: no toca nada de denuncias ni de patrullas.
 *
 *  - Mis autos: vincular con código, ver en el mapa en vivo + recorrido,
 *    compartir con hasta 5 familiares, marcar robado / recuperado.
 *  - Compartidos conmigo: ver el auto de un familiar en todo momento.
 *
 * Datos: colección raíz "vehiculos" (la escribe solo el servidor).
 * Operaciones sensibles: Cloud Functions (vincularVehiculo, compartirVehiculo,
 * dejarDeCompartirVehiculo, salirDeVehiculoCompartido, listarFamiliaresVehiculo,
 * misVehiculos). Marcar robado va directo a Firestore (permitido por las reglas
 * solo al dueño y solo sobre los campos robado / compartidoCon).
 *
 * Uso desde vecino-app.js:
 *   VehiculosGPS.iniciar()                 → usuario con suscripción activa
 *   await VehiculosGPS.mostrarSoloCompartidos() → sin suscripción: solo autos
 *                                            de familiares (devuelve true si mostró algo)
 * ========================================================================== */
(function () {
  'use strict';

  var MAX_FAMILIARES = 5;
  var MIN_DESACTUALIZADO = 10; // minutos sin posición nueva → aviso
  var estado = { propios: [], compartidos: [], seleccionado: null, soloCompartidos: false };
  var mapa = null, marcador = null, linea = null, unsubVehiculo = null;
  var siguiendo = true, periodoHoras = 1;
  var root = null;

  // ---------- utilidades ----------
  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }
  function $(id) { return document.getElementById(id); }
  function fn(nombre) { return firebase.functions().httpsCallable(nombre); }
  function mensajeError(e) {
    return (e && e.message) ? e.message : 'Ocurrió un error. Probá de nuevo.';
  }
  function hace(fecha) {
    if (!fecha) return 'sin datos';
    var min = Math.round((Date.now() - fecha.getTime()) / 60000);
    if (min < 1) return 'hace instantes';
    if (min < 60) return 'hace ' + min + ' min';
    var h = Math.floor(min / 60);
    if (h < 24) return 'hace ' + h + ' h ' + (min % 60) + ' min';
    return 'hace ' + Math.floor(h / 24) + ' d';
  }
  function aviso(txt, tipo) {
    var el = $('vgps-msg');
    if (!el) return;
    el.className = 'vgps-msg ' + (tipo || '');
    el.textContent = txt || '';
    el.style.display = txt ? 'block' : 'none';
    if (txt && tipo !== 'info' && el.scrollIntoView) el.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }

  function inyectarEstilos() {
    if ($('vgps-estilos')) return;
    var st = document.createElement('style');
    st.id = 'vgps-estilos';
    st.textContent = [
      '.vgps-item{border:1.5px solid #e2e8f0;border-radius:10px;padding:12px;margin-bottom:10px;background:#fff}',
      '.vgps-item.robado{border-color:#ef4444;background:#fef2f2}',
      '.vgps-nombre{font-weight:700;font-size:15px;color:#0f172a}',
      '.vgps-sub{font-size:12px;color:#64748b;margin-top:2px}',
      '.vgps-badge{display:inline-block;background:#ef4444;color:#fff;font-size:11px;font-weight:700;padding:2px 8px;border-radius:10px;margin-left:6px}',
      '.vgps-fila{display:flex;gap:8px;flex-wrap:wrap;margin-top:10px}',
      '.vgps-fila .btn{width:auto;flex:1 1 140px;padding:9px 10px;font-size:13px}',
      '.btn-peligro{background:#dc2626;color:#fff}',
      '.btn-ok{background:#16a34a;color:#fff}',
      '.btn-claro{background:#e2e8f0;color:#0f172a}',
      '#vgps-mapa{width:100%;height:300px;border-radius:10px;overflow:hidden;border:1.5px solid #cbd5e1;margin-top:10px}',
      '.vgps-icono{font-size:26px;line-height:30px;text-align:center;filter:drop-shadow(0 1px 2px rgba(0,0,0,.5))}',
      '.vgps-panel{background:#f8fafc;border:1px solid #e2e8f0;border-radius:10px;padding:12px;margin-top:10px}',
      '.vgps-panel input{width:100%;padding:10px;border:1.5px solid #cbd5e1;border-radius:8px;font-size:14px;margin-bottom:8px;background:#fff}',
      '.vgps-msg{display:none;padding:8px 10px;border-radius:8px;font-size:13px;margin:8px 0}',
      '.vgps-msg.error{background:#fee2e2;color:#991b1b}',
      '.vgps-msg.ok{background:#dcfce7;color:#166534}',
      '.vgps-msg.info{background:#e0f2fe;color:#075985}',
      '.vgps-alerta{background:#fef3c7;color:#92400e;padding:8px 10px;border-radius:8px;font-size:12px;margin-top:8px}',
      '.vgps-alerta.rojo{background:#ef4444;color:#fff;font-weight:700;font-size:13px}',
      '.vgps-fam{display:flex;justify-content:space-between;align-items:center;gap:8px;padding:6px 0;border-bottom:1px solid #e2e8f0;font-size:13px}',
      '.vgps-fam button{background:none;border:none;color:#dc2626;font-weight:600;cursor:pointer;font-size:13px}',
      '.vgps-sel{display:flex;gap:8px;align-items:center;margin-top:8px;font-size:12px;color:#475569;flex-wrap:wrap}',
      '.vgps-sel select{width:auto;margin:0;padding:6px 8px;font-size:12px}'
    ].join('\n');
    document.head.appendChild(st);
  }

  // ---------- datos ----------
  async function cargarLista() {
    var r = await fn('misVehiculos')();
    estado.propios = (r.data && r.data.propios) || [];
    estado.compartidos = (r.data && r.data.compartidosConmigo) || [];
  }

  // ---------- render ----------
  function renderPropio(v) {
    var robado = v.robado === true;
    var nombre = v.nombre || ('Vehículo ' + v.imei);
    return '<div class="vgps-item' + (robado ? ' robado' : '') + '">' +
      '<div class="vgps-nombre">🚗 ' + esc(nombre) + (robado ? '<span class="vgps-badge">ROBADO</span>' : '') + '</div>' +
      '<div class="vgps-sub">Compartido con ' + (v.cantidadFamiliares || 0) + ' de ' + MAX_FAMILIARES + ' familiares</div>' +
      '<div class="vgps-fila">' +
        '<button class="btn btn-primary" data-vgps="ver" data-imei="' + esc(v.imei) + '">📍 Ver en el mapa</button>' +
        '<button class="btn btn-secondary" style="margin-bottom:0" data-vgps="compartir" data-imei="' + esc(v.imei) + '">👨‍👩‍👧 Compartir</button>' +
        (robado
          ? '<button class="btn btn-ok" data-vgps="recuperado" data-imei="' + esc(v.imei) + '">✅ Lo recuperé</button>'
          : '<button class="btn btn-peligro" data-vgps="robado" data-imei="' + esc(v.imei) + '">🚨 Me lo robaron</button>') +
      '</div></div>';
  }

  function renderCompartido(v) {
    var robado = v.robado === true;
    var nombre = v.nombre || ('Vehículo ' + v.imei);
    return '<div class="vgps-item' + (robado ? ' robado' : '') + '">' +
      '<div class="vgps-nombre">🚗 ' + esc(nombre) + (robado ? '<span class="vgps-badge">ROBADO</span>' : '') + '</div>' +
      '<div class="vgps-sub">De ' + esc(v.duenoNombre || 'un familiar') + '</div>' +
      '<div class="vgps-fila">' +
        '<button class="btn btn-primary" data-vgps="ver" data-imei="' + esc(v.imei) + '">📍 Ver en el mapa</button>' +
        '<button class="btn btn-claro" data-vgps="salir" data-imei="' + esc(v.imei) + '">Dejar de ver</button>' +
      '</div></div>';
  }

  function render() {
    if (!root) return;
    var html = '<div id="vgps-msg" class="vgps-msg"></div>';
    if (!estado.soloCompartidos) {
      html += '<div class="card"><h2>🚗 Mi auto con GPS</h2>';
      html += estado.propios.length
        ? estado.propios.map(renderPropio).join('')
        : '<div class="empty" style="padding:8px 0">Todavía no vinculaste ningún auto.</div>';
      html += '<div class="vgps-panel"><b style="font-size:13px">Vincular mi auto</b>' +
        '<div class="vgps-sub" style="margin-bottom:8px">Ingresá el número del localizador y el código que te dieron al instalarlo.</div>' +
        '<input id="vgps-imei" inputmode="numeric" placeholder="Número del localizador (IMEI)" autocomplete="off">' +
        '<input id="vgps-codigo" placeholder="Código (ej: K7M2-9QXA)" autocomplete="off" autocapitalize="characters">' +
        '<button class="btn btn-primary" data-vgps="vincular">Vincular</button></div>';
      html += '</div>';
    }
    if (estado.compartidos.length) {
      html += '<div class="card"><h2>👨‍👩‍👧 Autos compartidos conmigo</h2>' +
        estado.compartidos.map(renderCompartido).join('') + '</div>';
    }
    html += '<div id="vgps-detalle"></div>';
    root.innerHTML = html;
    if (estado.seleccionado) abrirDetalle(estado.seleccionado, true);
  }

  // ---------- mapa en vivo ----------
  function detenerSeguimiento() {
    if (unsubVehiculo) { unsubVehiculo(); unsubVehiculo = null; }
    if (mapa) { mapa.remove(); mapa = null; marcador = null; linea = null; }
  }

  function icono(robado) {
    return L.divIcon({
      className: '', iconSize: [32, 32], iconAnchor: [16, 16],
      html: '<div class="vgps-icono">' + (robado ? '🚨' : '🚗') + '</div>'
    });
  }

  async function cargarRecorrido(imei) {
    var desde = firebase.firestore.Timestamp.fromMillis(Date.now() - periodoHoras * 3600 * 1000);
    var snap = await firebase.firestore().collection('vehiculos').doc(imei)
      .collection('recorridos').where('creado', '>=', desde)
      .orderBy('creado', 'desc').limit(1000).get();
    var pts = [];
    snap.forEach(function (d) { var x = d.data(); if (typeof x.lat === 'number') pts.push([x.lat, x.lng]); });
    pts.reverse();
    return pts;
  }

  async function abrirDetalle(imei, conservarVista) {
    estado.seleccionado = imei;
    detenerSeguimiento();
    var cont = $('vgps-detalle');
    if (!cont) return;
    var info = estado.propios.concat(estado.compartidos).filter(function (v) { return v.imei === imei; })[0] || {};
    cont.innerHTML = '<div class="card"><h2>📍 ' + esc(info.nombre || ('Vehículo ' + imei)) + '</h2>' +
      '<div id="vgps-estado" class="vgps-sub">Buscando posición…</div>' +
      '<div id="vgps-alertas"></div>' +
      '<div id="vgps-mapa"></div>' +
      '<div class="vgps-sel"><label style="margin:0"><input type="checkbox" id="vgps-seguir" ' + (siguiendo ? 'checked' : '') + '> Seguir el auto</label>' +
      '<span>Recorrido:</span><select id="vgps-periodo">' +
      '<option value="1"' + (periodoHoras === 1 ? ' selected' : '') + '>última hora</option>' +
      '<option value="6"' + (periodoHoras === 6 ? ' selected' : '') + '>últimas 6 horas</option></select></div>' +
      '<div id="vgps-familia"></div></div>';

    mapa = L.map('vgps-mapa').setView([-38.0, -57.55], 15);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { attribution: '© OpenStreetMap contributors' }).addTo(mapa);
    setTimeout(function () { if (mapa) mapa.invalidateSize(); }, 150);
    mapa.on('dragstart', function () { siguiendo = false; var c = $('vgps-seguir'); if (c) c.checked = false; });
    $('vgps-seguir').addEventListener('change', function (e) { siguiendo = e.target.checked; });
    $('vgps-periodo').addEventListener('change', async function (e) {
      periodoHoras = parseInt(e.target.value, 10);
      try { var p = await cargarRecorrido(imei); if (linea) linea.setLatLngs(p); } catch (err) { aviso(mensajeError(err), 'error'); }
    });
    if (!conservarVista) cont.scrollIntoView({ behavior: 'smooth', block: 'start' });

    linea = L.polyline([], { color: '#0ea5e9', weight: 4, opacity: 0.8 }).addTo(mapa);
    try { linea.setLatLngs(await cargarRecorrido(imei)); } catch (err) { /* sin historial todavía */ }

    var primera = true;
    unsubVehiculo = firebase.firestore().collection('vehiculos').doc(imei).onSnapshot(function (doc) {
      if (!doc.exists || !mapa) return;
      var d = doc.data();
      if (typeof d.lat !== 'number') return;
      var pos = [d.lat, d.lng];
      if (!marcador) marcador = L.marker(pos, { icon: icono(d.robado === true) }).addTo(mapa);
      else { marcador.setLatLng(pos); marcador.setIcon(icono(d.robado === true)); }
      if (linea && !primera) linea.addLatLng(pos);
      if (primera || siguiendo) mapa.setView(pos, primera ? 16 : mapa.getZoom());
      primera = false;

      var fecha = d.actualizado && d.actualizado.toDate ? d.actualizado.toDate() : null;
      var est = $('vgps-estado');
      if (est) est.textContent = 'Última posición ' + hace(fecha) + ' · ' + (d.velocidadKmh || 0) + ' km/h';
      var al = $('vgps-alertas');
      if (al) {
        var h = '';
        if (d.robado === true) h += '<div class="vgps-alerta rojo">🚨 Este auto está marcado como ROBADO</div>';
        if (fecha && (Date.now() - fecha.getTime()) > MIN_DESACTUALIZADO * 60000) {
          h += '<div class="vgps-alerta">⚠️ Hace más de ' + MIN_DESACTUALIZADO + ' min que no llega una posición nueva. Puede estar sin señal o apagado.</div>';
        }
        al.innerHTML = h;
      }
    }, function (err) {
      aviso('No se pudo seguir el auto: ' + mensajeError(err), 'error');
    });

    if (estado.propios.some(function (v) { return v.imei === imei; })) await mostrarFamilia(imei, false);
  }

  // ---------- compartir con familiares ----------
  async function mostrarFamilia(imei, abrirFormulario) {
    var cont = $('vgps-familia');
    if (!cont) return;
    var lista = [];
    try { lista = (await fn('listarFamiliaresVehiculo')({ imei: imei })).data.familiares || []; }
    catch (e) { aviso(mensajeError(e), 'error'); }
    var h = '<div class="vgps-panel"><b style="font-size:13px">Familiares con acceso (' + lista.length + ' de ' + MAX_FAMILIARES + ')</b>';
    h += lista.length
      ? lista.map(function (f) {
          return '<div class="vgps-fam"><span>' + esc(f.nombre) + '<br><span class="vgps-sub">' + esc(f.email) + '</span></span>' +
            '<button data-vgps="quitar" data-imei="' + esc(imei) + '" data-uid="' + esc(f.uid) + '">Quitar</button></div>';
        }).join('')
      : '<div class="vgps-sub" style="margin:6px 0">Todavía no compartiste este auto con nadie.</div>';
    if (lista.length < MAX_FAMILIARES) {
      h += '<div style="margin-top:10px"><input id="vgps-email" type="email" placeholder="Email de tu familiar (tiene que tener la app)" autocomplete="off">' +
        '<button class="btn btn-primary" data-vgps="agregar" data-imei="' + esc(imei) + '">Agregar familiar</button></div>';
    }
    h += '<div class="vgps-sub" style="margin-top:8px">Tus familiares ven el auto en todo momento, aunque no tengan la suscripción activa. Podés quitarles el acceso cuando quieras.</div></div>';
    cont.innerHTML = h;
    if (abrirFormulario) { var em = $('vgps-email'); if (em) em.focus(); }
  }

  // ---------- acciones ----------
  async function accion(tipo, imei, uid) {
    aviso('');
    try {
      if (tipo === 'ver') { return abrirDetalle(imei); }
      if (tipo === 'compartir') { await abrirDetalle(imei); var f = $('vgps-familia'); if (f) f.scrollIntoView({ behavior: 'smooth' }); return; }
      if (tipo === 'vincular') {
        var im = ($('vgps-imei').value || '').trim();
        var cod = ($('vgps-codigo').value || '').trim();
        if (!im || !cod) { aviso('Completá el número del localizador y el código.', 'error'); return; }
        aviso('Vinculando…', 'info');
        await fn('vincularVehiculo')({ imei: im, codigo: cod });
        await cargarLista(); render();
        aviso('✅ ¡Listo! Tu auto quedó vinculado.', 'ok');
        return;
      }
      if (tipo === 'agregar') {
        var email = ($('vgps-email').value || '').trim();
        if (!email) { aviso('Escribí el email de tu familiar.', 'error'); return; }
        aviso('Agregando…', 'info');
        var r = await fn('compartirVehiculo')({ imei: imei, email: email });
        await cargarLista();
        await mostrarFamilia(imei, false);
        aviso('✅ ' + (r.data.nombre || email) + ' ya puede ver tu auto.', 'ok');
        return;
      }
      if (tipo === 'quitar') {
        if (!confirm('¿Quitarle el acceso a este familiar?')) return;
        await fn('dejarDeCompartirVehiculo')({ imei: imei, uid: uid });
        await cargarLista();
        await mostrarFamilia(imei, false);
        aviso('Acceso quitado.', 'ok');
        return;
      }
      if (tipo === 'salir') {
        if (!confirm('¿Dejar de ver este auto? Tu familiar tendría que volver a compartirlo.')) return;
        await fn('salirDeVehiculoCompartido')({ imei: imei });
        if (estado.seleccionado === imei) { estado.seleccionado = null; detenerSeguimiento(); }
        await cargarLista(); render();
        return;
      }
      if (tipo === 'robado') {
        if (!confirm('🚨 ¿Marcar tu auto como ROBADO?\n\nSe va a avisar al centro de control de tu municipio y tus familiares van a ver el aviso. Si es una emergencia, llamá también al 911.')) return;
        await firebase.firestore().collection('vehiculos').doc(imei).update({ robado: true });
        await cargarLista(); render();
        aviso('🚨 Auto marcado como robado.', 'ok');
        return;
      }
      if (tipo === 'recuperado') {
        if (!confirm('¿Confirmás que recuperaste el auto?')) return;
        await firebase.firestore().collection('vehiculos').doc(imei).update({ robado: false });
        await cargarLista(); render();
        aviso('✅ Auto marcado como recuperado.', 'ok');
        return;
      }
    } catch (e) {
      aviso(mensajeError(e), 'error');
    }
  }

  function montar(contenedor) {
    inyectarEstilos();
    root = document.createElement('div');
    root.id = 'vgps-root';
    contenedor(root);
    root.addEventListener('click', function (ev) {
      var b = ev.target.closest('[data-vgps]');
      if (!b) return;
      ev.preventDefault();
      accion(b.getAttribute('data-vgps'), b.getAttribute('data-imei'), b.getAttribute('data-uid'));
    });
  }

  // ---------- API pública ----------
  window.VehiculosGPS = {
    // Usuario con suscripción activa: sección completa debajo de "Ver mapa de mi ciudad".
    iniciar: async function () {
      try {
        if (root && document.body.contains(root)) return;
        estado.soloCompartidos = false;
        montar(function (el) {
          var ref = document.getElementById('btn-ver-mapa');
          if (ref && ref.parentNode) ref.parentNode.insertBefore(el, ref.nextSibling);
          else (document.querySelector('.container') || document.body).appendChild(el);
        });
        await cargarLista();
        render();
      } catch (e) {
        console.warn('Autos GPS no disponible:', e);
        if (root && root.parentNode) root.parentNode.removeChild(root);
        root = null;
      }
    },

    // Sin suscripción: solo se ven los autos que compartió un familiar.
    // Devuelve true si mostró algo (entonces NO hay que bloquear la app).
    mostrarSoloCompartidos: async function () {
      try {
        await cargarLista();
        if (!estado.compartidos.length) return false;
        estado.soloCompartidos = true;
        var cont = document.querySelector('.container');
        if (!cont) return false;
        cont.innerHTML = '<div class="card" style="border-top:4px solid #f59e0b">' +
          '<h2 style="color:#b45309">Suscripción no activa este mes</h2>' +
          '<p style="font-size:13px;color:#475569">Por ahora solo podés ver los autos que tus familiares compartieron con vos. ' +
          'Para volver a usar el resto de la app, contactá al municipio.</p></div>';
        montar(function (el) { cont.appendChild(el); });
        render();
        return true;
      } catch (e) {
        console.warn('Autos compartidos no disponible:', e);
        return false;
      }
    }
  };
})();
