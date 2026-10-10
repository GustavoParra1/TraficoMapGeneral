/* ============================================================================
 * 🚗 MI RASTREADOR (página aparte del GPS)
 * Reemplaza a vehiculos-vecino.js en la pantalla de denuncias: las denuncias,
 * el pánico y el mapa de vecino siguen en index.html; el GPS vive acá.
 *
 * Usa las mismas Cloud Functions y los mismos datos que antes:
 *   misVehiculos, vincularVehiculo, compartirVehiculo, dejarDeCompartirVehiculo,
 *   salirDeVehiculoCompartido, listarFamiliaresVehiculo
 *   Firestore: vehiculos/{imei} (posición en vivo) y vehiculos/{imei}/recorridos
 *   Marcar robado / recuperado: update directo del campo "robado" (solo el dueño).
 *
 * Reglas heredadas de la app anterior:
 *   - Con suscripción activa: ve sus autos, puede vincular, compartir y marcar robo.
 *   - Sin suscripción: solo ve los autos que le compartió un familiar.
 *   - ?vehiculo=IMEI (viene de la notificación) abre directo ese auto.
 * ========================================================================== */
(function () {
  'use strict';

  var MAX_FAMILIARES = 5;
  var MIN_DESACTUALIZADO = 10; // minutos sin posición nueva del GPS → "sin señal"
  var MUNICIPIO_TO_ID = {
    'La Plata': 'laplata', 'la plata': 'laplata',
    'Mar del Plata': 'mardelplata', 'mar del plata': 'mardelplata',
    'Córdoba': 'cordoba', 'cordoba': 'cordoba',
    'Mendoza': 'mendoza', 'mendoza': 'mendoza'
  };

  var estado = { propios: [], compartidos: [], imei: null, habilitado: false, ultimo: null };
  var mapa = null, marcador = null, linea = null, unsub = null, ticker = null;
  var siguiendo = true, periodoHoras = 1;
  var resolverConfirmar = null;
  var pendienteVer = null;
  try { pendienteVer = new URLSearchParams(window.location.search).get('vehiculo'); } catch (e) { pendienteVer = null; }

  // ---------- utilidades ----------
  function $(id) { return document.getElementById(id); }
  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }
  function fn(nombre) { return firebase.functions().httpsCallable(nombre); }
  function mensajeError(e) { return (e && e.message) ? e.message : 'Ocurrió un error. Probá de nuevo.'; }
  function dormir(ms) { return new Promise(function (r) { setTimeout(r, ms); }); }
  function hace(fecha) {
    if (!fecha) return 'sin datos';
    var min = Math.round((Date.now() - fecha.getTime()) / 60000);
    if (min < 1) return 'hace instantes';
    if (min < 60) return 'hace ' + min + ' min';
    var h = Math.floor(min / 60);
    if (h < 24) return 'hace ' + h + ' h ' + (min % 60) + ' min';
    return 'hace ' + Math.floor(h / 24) + ' d';
  }
  // Hora real de la posición del GPS (fixTime). Si no está, la hora en que llegó al servidor.
  function fechaPosicion(d) {
    if (d && d.fixTime) { var t = new Date(d.fixTime); if (!isNaN(t.getTime())) return t; }
    if (d && d.actualizado && d.actualizado.toDate) return d.actualizado.toDate();
    return null;
  }
  var toastTimer = null;
  function toast(txt, tipo) {
    var el = $('toast');
    el.className = 'toast ' + (tipo || '');
    el.textContent = txt;
    el.style.display = 'block';
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { el.style.display = 'none'; }, tipo === 'error' ? 6000 : 3500);
  }
  function todos() { return estado.propios.concat(estado.compartidos); }
  function esPropio(imei) { return estado.propios.some(function (v) { return v.imei === imei; }); }
  function infoActual() { return todos().filter(function (v) { return v.imei === estado.imei; })[0] || null; }

  // ---------- panel inferior ----------
  function abrirSheet(html) {
    $('sheet-body').innerHTML = html;
    document.body.classList.add('con-sheet');
  }
  function cerrarSheet() {
    document.body.classList.remove('con-sheet');
    if (resolverConfirmar) { var r = resolverConfirmar; resolverConfirmar = null; r(false); }
  }
  function confirmar(titulo, texto, botonTxt, peligro, extra) {
    return new Promise(function (resolve) {
      resolverConfirmar = resolve;
      abrirSheet('<h3>' + esc(titulo) + '</h3><p class="sheet-txt">' + esc(texto) + '</p>' +
        '<div class="sheet-acc">' +
        '<button class="btn ' + (peligro ? 'peligro' : 'ok') + '" data-r="1">' + esc(botonTxt) + '</button>' +
        (extra || '') +
        '<button class="btn claro" data-r="0">Cancelar</button></div>');
    });
  }

  // ---------- datos ----------
  async function cargarLista() {
    var r = await fn('misVehiculos')();
    estado.propios = estado.habilitado ? ((r.data && r.data.propios) || []) : [];
    estado.compartidos = (r.data && r.data.compartidosConmigo) || [];
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

  // ---------- pantalla ----------
  function renderChips() {
    var h = todos().map(function (v) {
      var comp = !esPropio(v.imei);
      return '<button class="chip' + (v.imei === estado.imei ? ' activo' : '') + '" role="tab" data-act="elegir" data-imei="' + esc(v.imei) + '">' +
        (comp ? '👥 ' : '🚗 ') + esc(v.nombre || ('Vehículo ' + v.imei)) + (v.robado === true ? ' 🚨' : '') + '</button>';
    }).join('');
    if (estado.habilitado) h += '<button class="chip mas" data-act="form-vincular">＋ Vincular</button>';
    $('chips').innerHTML = h;
  }

  function renderAcciones() {
    var info = infoActual() || {};
    var h = '<button class="accion azul" data-act="historial"><span>🗺️</span>Historial</button>';
    if (esPropio(estado.imei)) {
      h += '<button class="accion violeta" data-act="familia"><span>👨‍👩‍👧</span>Familia</button>';
      h += info.robado === true
        ? '<button class="accion verde" data-act="recuperado"><span>✅</span>Recuperé</button>'
        : '<button class="accion rojo" data-act="robado"><span>⚠️</span>Robo</button>';
    } else {
      h += '<button class="accion gris" data-act="salir"><span>🚪</span>Dejar de ver</button>';
    }
    $('acciones').innerHTML = h;
    $('v-nombre').textContent = info.nombre || ('Vehículo ' + estado.imei);
  }

  function pintarEstado() {
    var d = estado.ultimo;
    if (!d) return;
    var f = fechaPosicion(d);
    var minutos = f ? (Date.now() - f.getTime()) / 60000 : null;
    var viejo = minutos === null || minutos > MIN_DESACTUALIZADO;
    var vel = Math.round(d.velocidadKmh || 0);
    var robado = d.robado === true;

    $('v-sub').textContent = 'Última posición ' + hace(f);
    $('v-vel').textContent = vel + ' km/h';
    var est = $('v-estado');
    est.textContent = viejo ? 'Sin señal' : (vel >= 3 ? 'En movimiento' : 'Detenido');
    est.className = 'chico ' + (viejo ? 'mal' : 'ok');

    var chip = $('estado-chip');
    if (robado) { chip.className = 'estado-chip robado'; chip.textContent = 'ROBADO'; }
    else if (viejo) { chip.className = 'estado-chip sin-senal'; chip.textContent = 'SIN SEÑAL'; }
    else { chip.className = 'estado-chip vivo'; chip.textContent = 'EN VIVO'; }

    var al = $('alerta');
    if (robado) {
      al.className = 'alerta rojo';
      al.textContent = '🚨 Este auto está marcado como ROBADO.';
    } else if (viejo) {
      al.className = 'alerta ambar';
      al.textContent = '⚠️ Hace más de ' + MIN_DESACTUALIZADO + ' min que el GPS no manda una posición nueva. Puede estar sin señal o apagado.';
    } else {
      al.className = 'alerta';
      al.textContent = '';
    }
  }

  function etiquetaSeguir() {
    var b = $('btn-seguir');
    if (!b) return;
    b.textContent = siguiendo ? '📍 Siguiendo' : 'Seguir el auto';
    b.className = 'seguir' + (siguiendo ? '' : ' off');
  }

  function icono(robado) {
    return L.divIcon({
      className: '', iconSize: [30, 30], iconAnchor: [15, 15],
      html: '<div class="punto' + (robado ? ' robado' : '') + '"></div>'
    });
  }

  function detener() {
    if (unsub) { unsub(); unsub = null; }
    if (mapa) { mapa.remove(); mapa = null; marcador = null; linea = null; }
  }

  async function abrirVehiculo(imei) {
    estado.imei = imei;
    estado.ultimo = null;
    detener();
    $('vacio').style.display = 'none';
    $('principal').style.display = 'block';
    renderChips();
    renderAcciones();
    $('v-sub').textContent = 'Buscando posición…';
    $('v-vel').textContent = '—';
    $('v-estado').textContent = '—';
    $('v-estado').className = 'chico';
    $('alerta').className = 'alerta';

    mapa = L.map('mapa').setView([-38.0, -57.55], 15);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { attribution: '© OpenStreetMap contributors' }).addTo(mapa);
    setTimeout(function () { if (mapa) mapa.invalidateSize(); }, 150);
    mapa.on('dragstart', function () { siguiendo = false; etiquetaSeguir(); });
    siguiendo = true;
    etiquetaSeguir();

    linea = L.polyline([], { color: '#0ea5e9', weight: 5, opacity: 0.85 }).addTo(mapa);
    try {
      var pts = await cargarRecorrido(imei);
      if (estado.imei !== imei || !linea) return; // cambió de vehículo mientras cargaba
      linea.setLatLngs(pts);
    } catch (err) { /* sin historial todavía */ }

    var primera = true;
    unsub = firebase.firestore().collection('vehiculos').doc(imei).onSnapshot(function (doc) {
      if (!doc.exists || !mapa) return;
      var d = doc.data();
      if (typeof d.lat !== 'number') return;
      estado.ultimo = d;
      var pos = [d.lat, d.lng];
      var robado = d.robado === true;
      if (!marcador) marcador = L.marker(pos, { icon: icono(robado) }).addTo(mapa);
      else { marcador.setLatLng(pos); marcador.setIcon(icono(robado)); }
      if (linea && !primera) linea.addLatLng(pos);
      if (primera || siguiendo) mapa.setView(pos, primera ? 16 : mapa.getZoom());
      primera = false;
      pintarEstado();
    }, function (err) {
      toast('No se pudo seguir el auto: ' + mensajeError(err), 'error');
    });
  }

  function mostrarVacio() {
    detener();
    $('principal').style.display = 'none';
    $('vacio').style.display = 'block';
    renderChips();
    if (estado.habilitado) {
      $('vacio').innerHTML = '<div class="vacio"><h2>Todavía no tenés un auto vinculado</h2>' +
        '<p>Vinculá tu localizador con el número que figura en el equipo y el código que te dieron al instalarlo.</p>' +
        '<button class="btn cian" data-act="form-vincular">Vincular mi auto</button></div>';
    } else {
      $('vacio').innerHTML = '<div class="vacio"><h2>Suscripción no activa este mes</h2>' +
        '<p>Por ahora solo podés ver los autos que tus familiares compartieron con vos, y todavía no hay ninguno. Para volver a usar tu rastreador, contactá al municipio.</p>' +
        '<a class="btn claro" href="index.html">Volver a denuncias</a></div>';
    }
  }

  function mostrar(preferido) {
    $('cargando').style.display = 'none';
    var lista = todos();
    if (!lista.length) { estado.imei = null; mostrarVacio(); return; }
    var elegido = null;
    [preferido, pendienteVer, estado.imei].forEach(function (c) {
      if (!elegido && c && lista.some(function (v) { return v.imei === String(c); })) elegido = String(c);
    });
    pendienteVer = null;
    if (!elegido) elegido = (estado.propios[0] || estado.compartidos[0]).imei;
    return abrirVehiculo(elegido);
  }

  async function recargar() {
    await cargarLista();
    if (!todos().length) { mostrarVacio(); return; }
    renderChips();
    renderAcciones();
    pintarEstado();
  }

  // ---------- paneles ----------
  function abrirHistorial() {
    function op(h, txt) { return '<option value="' + h + '"' + (periodoHoras === h ? ' selected' : '') + '>' + txt + '</option>'; }
    abrirSheet('<h3>Historial del recorrido</h3>' +
      '<label class="lbl" for="h-periodo">Mostrar el recorrido de</label>' +
      '<select id="h-periodo" class="inp">' + op(1, 'la última hora') + op(6, 'las últimas 6 horas') + op(24, 'las últimas 24 horas') + '</select>' +
      '<label class="chk"><input type="checkbox" id="h-seguir"' + (siguiendo ? ' checked' : '') + '> Seguir el auto en el mapa</label>' +
      '<p class="nota">Se dibuja en el mapa con una línea celeste. Si el GPS manda posiciones muy seguido, el recorrido largo puede mostrar solo la parte más reciente.</p>' +
      '<div class="sheet-acc"><button class="btn cian" data-act="cerrar">Listo</button></div>');
    $('h-periodo').addEventListener('change', async function (e) {
      periodoHoras = parseInt(e.target.value, 10);
      try {
        var p = await cargarRecorrido(estado.imei);
        if (!linea) return;
        linea.setLatLngs(p);
        if (p.length > 1 && mapa) { mapa.fitBounds(L.latLngBounds(p).pad(0.2)); siguiendo = false; etiquetaSeguir(); $('h-seguir').checked = false; }
        if (!p.length) toast('No hay recorrido guardado en ese período.', '');
      } catch (err) { toast(mensajeError(err), 'error'); }
    });
    $('h-seguir').addEventListener('change', function (e) {
      siguiendo = e.target.checked;
      etiquetaSeguir();
      if (siguiendo && marcador && mapa) mapa.setView(marcador.getLatLng(), mapa.getZoom());
    });
  }

  async function abrirFamilia() {
    var imei = estado.imei;
    abrirSheet('<h3>Familia con acceso</h3><p class="sheet-txt">Cargando…</p>');
    var lista = [];
    try { lista = (await fn('listarFamiliaresVehiculo')({ imei: imei })).data.familiares || []; }
    catch (e) { toast(mensajeError(e), 'error'); }
    var h = '<h3>Familia con acceso (' + lista.length + ' de ' + MAX_FAMILIARES + ')</h3>';
    h += lista.length
      ? lista.map(function (f) {
          return '<div class="fam"><span>' + esc(f.nombre) + '<small>' + esc(f.email || f.telefono) + '</small></span>' +
            '<button data-act="quitar" data-imei="' + esc(imei) + '" data-uid="' + esc(f.uid) + '">Quitar</button></div>';
        }).join('')
      : '<p class="sheet-txt">Todavía no compartiste este auto con nadie.</p>';
    if (lista.length < MAX_FAMILIARES) {
      h += '<div style="margin-top:14px"><label class="lbl" for="f-contacto">Email o celular de tu familiar</label>' +
        '<input id="f-contacto" class="inp" type="text" inputmode="email" autocomplete="off" placeholder="Celular con código de área, sin 0 ni 15">' +
        '<button class="btn cian" data-act="agregar" data-imei="' + esc(imei) + '">Agregar familiar</button></div>';
    }
    h += '<p class="nota">Tus familiares ven el auto en todo momento, aunque no tengan la suscripción activa. Podés quitarles el acceso cuando quieras.</p>' +
      '<div class="sheet-acc"><button class="btn claro" data-act="cerrar">Cerrar</button></div>';
    abrirSheet(h);
  }

  function abrirFormVincular() {
    abrirSheet('<h3>Vincular mi auto</h3>' +
      '<p class="sheet-txt">Ingresá el número del localizador y el código que te dieron al instalarlo.</p>' +
      '<label class="lbl" for="vi-imei">Número del localizador (IMEI)</label>' +
      '<input id="vi-imei" class="inp" inputmode="numeric" autocomplete="off" placeholder="15 dígitos">' +
      '<label class="lbl" for="vi-codigo">Código</label>' +
      '<input id="vi-codigo" class="inp" autocomplete="off" autocapitalize="characters" placeholder="Ej: K7M2-9QXA">' +
      '<div class="sheet-acc"><button class="btn cian" data-act="vincular">Vincular</button>' +
      '<button class="btn claro" data-act="cerrar">Cancelar</button></div>');
  }

  // ---------- acciones ----------
  async function accion(tipo, imei, uid) {
    try {
      if (tipo === 'elegir') { return abrirVehiculo(imei); }
      if (tipo === 'cerrar') { return cerrarSheet(); }
      if (tipo === 'seguir') {
        siguiendo = !siguiendo; etiquetaSeguir();
        if (siguiendo && marcador && mapa) mapa.setView(marcador.getLatLng(), mapa.getZoom());
        return;
      }
      if (tipo === 'historial') { return abrirHistorial(); }
      if (tipo === 'familia') { return abrirFamilia(); }
      if (tipo === 'form-vincular') { return abrirFormVincular(); }

      if (tipo === 'vincular') {
        var im = ($('vi-imei').value || '').trim();
        var cod = ($('vi-codigo').value || '').trim();
        if (!im || !cod) { toast('Completá el número del localizador y el código.', 'error'); return; }
        toast('Vinculando…', '');
        await fn('vincularVehiculo')({ imei: im, codigo: cod });
        await cargarLista();
        cerrarSheet();
        await mostrar(im);
        toast('✅ Listo, tu auto quedó vinculado.', 'ok');
        return;
      }
      if (tipo === 'agregar') {
        var contacto = ($('f-contacto').value || '').trim();
        if (!contacto) { toast('Escribí el email o el celular de tu familiar.', 'error'); return; }
        toast('Agregando…', '');
        var r = await fn('compartirVehiculo')({ imei: imei, contacto: contacto, email: contacto });
        await cargarLista();
        await abrirFamilia();
        toast('✅ ' + ((r.data && r.data.nombre) || contacto) + ' ya puede ver tu auto.', 'ok');
        return;
      }
      if (tipo === 'quitar') {
        var okQ = await confirmar('¿Quitarle el acceso?', 'Esta persona va a dejar de ver tu auto.', 'Quitar acceso', true);
        if (!okQ) return;
        await fn('dejarDeCompartirVehiculo')({ imei: imei, uid: uid });
        await cargarLista();
        await abrirFamilia();
        toast('Acceso quitado.', 'ok');
        return;
      }
      if (tipo === 'salir') {
        var okS = await confirmar('¿Dejar de ver este auto?', 'Tu familiar tendría que volver a compartirlo para que lo veas de nuevo.', 'Dejar de ver', true);
        if (!okS) return;
        await fn('salirDeVehiculoCompartido')({ imei: estado.imei });
        await cargarLista();
        estado.imei = null;
        await mostrar();
        return;
      }
      if (tipo === 'robado') {
        var okR = await confirmar('🚨 ¿Marcar tu auto como robado?',
          'Se avisa al centro de control de tu municipio y tus familiares ven el aviso. Si es una emergencia, llamá también al 911.',
          'Sí, me lo robaron', true,
          '<a class="btn llamar" href="tel:911">📞 Llamar al 911</a>');
        if (!okR) return;
        await firebase.firestore().collection('vehiculos').doc(estado.imei).update({ robado: true });
        await recargar();
        toast('🚨 Auto marcado como robado.', 'ok');
        return;
      }
      if (tipo === 'recuperado') {
        var okC = await confirmar('¿Recuperaste el auto?', 'Se quita el aviso de robo y tu auto vuelve a verse normal.', 'Sí, lo recuperé', false);
        if (!okC) return;
        await firebase.firestore().collection('vehiculos').doc(estado.imei).update({ robado: false });
        await recargar();
        toast('✅ Auto marcado como recuperado.', 'ok');
        return;
      }
    } catch (e) {
      toast(mensajeError(e), 'error');
    }
  }

  document.addEventListener('click', function (ev) {
    var r = ev.target.closest('[data-r]');
    if (r && resolverConfirmar) {
      var res = resolverConfirmar; resolverConfirmar = null;
      document.body.classList.remove('con-sheet');
      res(r.getAttribute('data-r') === '1');
      return;
    }
    var b = ev.target.closest('[data-act]');
    if (!b) return;
    ev.preventDefault();
    accion(b.getAttribute('data-act'), b.getAttribute('data-imei'), b.getAttribute('data-uid'));
  });

  // ---------- inicio ----------
  async function iniciar() {
    try {
      var resp = await fetch('../config.json');
      var config = await resp.json();
      if (!firebase.apps.length) firebase.initializeApp(config.firebase);
      var auth = firebase.auth();

      $('btn-salir').addEventListener('click', function () {
        auth.signOut().then(function () { window.location.href = '/login.html'; });
      });

      auth.onAuthStateChanged(async function (user) {
        if (!user) { window.location.href = '/login.html'; return; }
        try {
          var ciudad = null, clienteId = null;
          for (var i = 0; i < 5; i++) {
            var t = await user.getIdTokenResult(true);
            ciudad = t.claims.city;
            if (t.claims.cliente_id) clienteId = t.claims.cliente_id;
            if (ciudad) break;
            await dormir(600);
          }
          if (!ciudad) { window.location.href = '/login.html'; return; }
          if (!clienteId) clienteId = MUNICIPIO_TO_ID[ciudad] || ciudad.toLowerCase().replace(/\s+/g, '');

          // Suscripción: igual que en la app de denuncias (habilitado y mes vigente)
          var datos = null;
          try {
            var snap = await firebase.firestore().collection('clientes/' + clienteId + '/vecinos').doc(user.uid).get();
            if (snap.exists) datos = snap.data();
          } catch (e) { /* sin datos: se trata como no habilitado */ }
          var mesActual = new Date().toISOString().slice(0, 7);
          estado.habilitado = !!(datos && datos.habilitado === true && datos.habilitado_hasta === mesActual);

          await cargarLista();
          await mostrar();
          if (!ticker) ticker = setInterval(pintarEstado, 30000);
        } catch (e) {
          console.warn('Rastreador:', e);
          $('cargando').textContent = 'No se pudieron cargar tus vehículos. Recargá la página.';
        }
      });
    } catch (e) {
      console.error('Rastreador: no se pudo iniciar', e);
      $('cargando').textContent = 'No se pudo iniciar la app. Recargá la página.';
    }
  }
  iniciar();
})();
