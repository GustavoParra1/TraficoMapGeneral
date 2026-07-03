// --- BLOQUEO DE FACTURACIÓN SOLO PARA ADMIN PRINCIPAL ---
document.addEventListener('DOMContentLoaded', function() {
  function checkAdminFacturacion() {
    if (typeof firebase === 'undefined' || !firebase.auth) {
      setTimeout(checkAdminFacturacion, 200);
      return;
    }
    firebase.auth().onAuthStateChanged(function(user) {
      var facturacionMenu = document.querySelector('[data-section="facturacion"], [href="#facturacion"]');
      if (!user || !facturacionMenu) return;
      // Solo mostrar si es admin principal
      if (user.email && user.email.toLowerCase() === 'admin@laplata.com') {
        facturacionMenu.style.display = '';
      } else {
        facturacionMenu.style.display = 'none';
        // Si accede por URL, bloquear
        if (window.location.hash === '#facturacion' || window.location.pathname.includes('facturacion')) {
          alert('Acceso denegado. Solo el administrador principal puede ver Facturación.');
          window.location.hash = '#dashboard';
        }
      }
    });
  }
  checkAdminFacturacion();

  // --- Botón para mostrar claims del usuario autenticado ---
  const btnClaims = document.createElement('button');
  btnClaims.textContent = 'Ver mis claims';
  btnClaims.className = 'btn btn-info btn-sm';
  btnClaims.style.position = 'fixed';
  btnClaims.style.bottom = '10px';
  btnClaims.style.right = '10px';
  btnClaims.style.zIndex = 9999;
  btnClaims.onclick = function() {
    if (!firebase.auth().currentUser) {
      alert('No hay usuario autenticado.');
      return;
    }
    firebase.auth().currentUser.getIdTokenResult().then(function(result) {
      alert('Tus claims:\n' + JSON.stringify(result.claims, null, 2));
      console.log('Tus claims:', result.claims);
    }).catch(function(e) {
      alert('Error obteniendo claims: ' + e.message);
    });
  };
  document.body.appendChild(btnClaims);
});
// js/client-dashboard.js
// Dashboard y páginas del panel del cliente

class ClientDashboard {
  constructor() {
    this.currentPage = 'dashboard';
    this.clientData = null;
    this.map = null;
    this.dataStats = {
      camaras: 0,
      siniestros: 0,
      alertas: 0
    };

    // Mostrar recordatorio al cargar el dashboard (unificado)
    setTimeout(() => {
      const panel = document.getElementById('panelCargaDatos') || document.body;
      const aviso = document.createElement('div');
      // Aviso eliminado: ya no es necesario ejecutar sync_patrullas_auth.js, los claims se asignan automáticamente.
      panel.prepend(aviso);
    }, 500);
  }

  async init() {
    console.log("📊 Inicializando ClientDashboard...");
    // Mostrar dashboard por defecto (initQuestionsPanel se llamará desde showDashboard)
    this.showPage('dashboard');
  }

  // Panel de preguntas se inicializa en map.html, no en dashboard
  // Este método se eliminó para que solo el mapa muestre preguntas frecuentes

    async ensureFirebaseSession() {
      let currentUser = firebase.auth().currentUser;
      if (currentUser) {
        return currentUser;
      }

      const email = localStorage.getItem('email_acceso')
        || (this.clientData && this.clientData.email_admin)
        || (this.clientData && this.clientData.email);
      const password = this.clientData && (this.clientData.contraseña || this.clientData.password);

      if (!email || !password) {
        throw new Error('No hay sesión Firebase activa para crear usuarios.');
      }

      const loginFn = firebase.app().functions('us-central1').httpsCallable('loginClientePanel');
      await loginFn({ email, password });
      await firebase.auth().signInWithEmailAndPassword(email, password);

      currentUser = firebase.auth().currentUser;
      if (!currentUser) {
        throw new Error('No hay sesión Firebase activa para crear usuarios.');
      }

      return currentUser;
    }
    // --- Métodos para carga uno a uno ---

    async agregarPatrullaInput(valor = "") {
      const lista = document.getElementById('listaPatrullas');
      if (!lista) return;
      const li = document.createElement('li');
      li.className = 'list-group-item d-flex align-items-center gap-2';
      li.innerHTML = `
        <input type="text" class="form-control form-control-sm patrulla-input" placeholder="Nombre patrulla" value="${valor}" style="max-width:180px;">
        <button class="btn btn-sm btn-primary generar-btn">Generar</button>
        <span class="credenciales ms-2"></span>
      `;
      li.querySelector('.generar-btn').onclick = async () => {
        const nombre = li.querySelector('input').value.trim();
        if (!nombre) return;
        const usuarioBase = `patrulla_${nombre.replace(/\W+/g,'').toLowerCase()}`;
        const usuario = `${usuarioBase}@seguridad.com`;
        const password = Math.random().toString(36).slice(-8);
        li.querySelector('.credenciales').innerHTML = `<b>Usuario:</b> ${usuario} <b>Pass:</b> ${password}`;
        li.querySelector('input').disabled = true;
        li.querySelector('.generar-btn').disabled = true;
        // Guardar en Firestore
        await this.guardarPatrullaFirestore({ nombre, usuario, password });
        // Agrega un nuevo input automáticamente si es el último
        if (li.parentElement.lastElementChild === li) this.agregarPatrullaInput();
      };
      lista.appendChild(li);
      setTimeout(() => {
        li.querySelector('input').focus();
      }, 100);
    }

    async agregarOperarioInput(valor = "") {
      const lista = document.getElementById('listaOperarios');
      if (!lista) return;
      const li = document.createElement('li');
      li.className = 'list-group-item d-flex align-items-center gap-2';
      li.innerHTML = `
        <input type="text" class="form-control form-control-sm operario-input" placeholder="Nombre operario" value="${valor}" style="max-width:180px;">
        <button class="btn btn-sm btn-primary generar-btn">Generar</button>
        <span class="credenciales ms-2"></span>
      `;
      li.querySelector('.generar-btn').onclick = async () => {
        const nombre = li.querySelector('input').value.trim();
        if (!nombre) return;
        const usuarioBase = `operario_${nombre.replace(/\W+/g,'').toLowerCase()}`;
        const usuario = `${usuarioBase}@seguridad.com`;
        const password = Math.random().toString(36).slice(-8);
        li.querySelector('.credenciales').innerHTML = `<b>Usuario:</b> ${usuario} <b>Pass:</b> ${password}`;
        li.querySelector('input').disabled = true;
        li.querySelector('.generar-btn').disabled = true;
        // Guardar en Firestore
        await this.guardarOperarioFirestore({ nombre, usuario, password });
        if (li.parentElement.lastElementChild === li) this.agregarOperarioInput();
      };
      lista.appendChild(li);
      setTimeout(() => {
        li.querySelector('input').focus();
      }, 100);
    }

    async guardarPatrullaFirestore({ nombre, usuario, password }) {
      // Crear usuario patrulla vía Cloud Function callable (sin CORS)
      try {
        const ciudadId = (this.clientData.municipio || this.clientData.nombre || 'laplata').toLowerCase();
        const clienteId = this.clientData.id || this.clientData.nombre;
        
        // Normalizar nombre a solo número (remover PATRULLA, prefijos, pero MANTENER números)
        const nombreNormalizado = nombre.replace(/^(patrulla|PATRULLA)[_-]?/i, '').toUpperCase().trim();
        
        console.log(`🚀 Llamando Cloud Function crearPatrulaAdmin para: ${usuario}`);
        
        // Obtener Cloud Functions desde cliente Firebase general
        const crearPatrulaFunc = firebase.functions().httpsCallable('crearPatrulaAdmin');
        
        const resultado = await crearPatrulaFunc({
          email: usuario,
          password: password,
          displayName: nombreNormalizado,
          ciudadId: ciudadId,
          clienteId: clienteId
        });

        console.log(`✅ Patrulla creada exitosamente:`, resultado.data);

      } catch (e) {
        console.error('❌ Error creando usuario patrulla:', e);
        alert('Error creando patrulla: ' + (e.message || e));
        return;
      }
      
      // Patrulla ya fue guardada en Firestore por la Cloud Function
      console.log(`✅ Patrulla guardada en Firestore por Cloud Function: ${nombre}`);
    }

    async guardarOperarioFirestore({ nombre, usuario, password }) {
      // Crear usuario operario vía Cloud Function callable (crea cuenta en Firebase Auth)
      try {
        const ciudadId = (this.clientData.municipio || this.clientData.nombre || 'laplata').toLowerCase();
        const clienteId = this.clientData.id || this.clientData.nombre;

        if (!clienteId) {
          console.error('❌ [guardarOperarioFirestore] clienteId indefinido:', this.clientData);
          alert('Error: No se pudo identificar el cliente. Vuelve a iniciar sesión.');
          return;
        }

        console.log(`🚀 Llamando Cloud Function crearOperarioAdmin para: ${usuario}`);

        const crearOperarioFunc = firebase.functions().httpsCallable('crearOperarioAdmin');

        const resultado = await crearOperarioFunc({
          email: usuario,
          password: password,
          displayName: nombre,
          ciudadId: ciudadId,
          clienteId: clienteId
        });

        console.log(`✅ Operario creado exitosamente:`, resultado.data);
      } catch (e) {
        console.error('❌ Error creando usuario operario:', e);
        alert('Error creando operario: ' + (e.message || e));
        return;
      }

      // Operario ya fue guardado en Firestore por la Cloud Function
      console.log(`✅ Operario guardado en Firestore por Cloud Function: ${nombre}`);
    }

    async guardarVecinoFirestore({ nombre, usuario, password, direccion, telefono }) {
      // Crear usuario vecino vía Cloud Function callable (crea cuenta en Firebase Auth)
      try {
        const ciudadId = (this.clientData.municipio || this.clientData.nombre || 'laplata').toLowerCase();
        const clienteId = this.clientData.id || this.clientData.nombre;
        if (!clienteId) {
          console.error('❌ [guardarVecinoFirestore] clienteId indefinido:', this.clientData);
          alert('Error: No se pudo identificar el cliente. Vuelve a iniciar sesión.');
          return;
        }
        console.log(`🚀 Llamando Cloud Function crearVecinoAdmin para: ${usuario}`);
        const crearVecinoFunc = firebase.functions().httpsCallable('crearVecinoAdmin');
        const resultado = await crearVecinoFunc({
          email: usuario,
          password: password,
          displayName: nombre,
          direccion: direccion || '',
          telefono: telefono || '',
          ciudadId: ciudadId,
          clienteId: clienteId
        });
        console.log(`✅ Vecino creado exitosamente:`, resultado.data);
        // Inicializar campos de suscripción (arranca BLOQUEADO hasta primer pago)
        try {
          const uid = resultado.data && resultado.data.vecino && resultado.data.vecino.uid;
          if (uid) {
            await firebase.firestore().collection(`clientes/${clienteId}/vecinos`).doc(uid).set({
              habilitado: false,
              habilitado_hasta: '',
              monto: 15000
            }, { merge: true });
          }
        } catch (subErr) {
          console.warn('⚠️ No se pudieron inicializar campos de suscripción:', subErr);
        }
      } catch (e) {
        console.error('❌ Error creando usuario vecino:', e);
        alert('Error creando vecino: ' + (e.message || e));
        return;
      }
    }
    async cargarVecinosFirestore() {
      const clientId = this.clientData.id;
      const ref = firebase.firestore().collection(`clientes/${clientId}/vecinos`);
      const snap = await ref.get();
      return snap.docs.map(doc => doc.data());
    }
    eliminarVecino(nombreVecino, liElement) {
      if (!confirm(`¿Eliminar vecino "${nombreVecino}"?`)) return;
      const clientId = this.clientData.id;
      const ref = firebase.firestore().collection(`clientes/${clientId}/vecinos`);
      ref.where('nombre', '==', nombreVecino).get().then(snap => {
        if (snap.empty) return alert('Vecino no encontrado');
        snap.docs[0].ref.delete().then(() => {
          alert('✅ Vecino eliminado');
          liElement.remove();
        });
      }).catch(e => {
        alert('❌ Error: ' + e.message);
      });
    }

     // Devuelve true si el vecino está habilitado para el mes actual
    vecinoHabilitado(v) {
      if (!v.habilitado) return false;
      const mesActual = new Date().toISOString().slice(0, 7); // "2026-06"
      return v.habilitado_hasta === mesActual;
    }
    // Abre el modal de registro de pago
    abrirModalPago(vecino) {
      const mesActual = new Date().toISOString().slice(0, 7);
      const montoDefault = vecino.monto || 15000;
      // Crear modal dinámico
      const modalHtml = `
        <div class="modal fade" id="modalPago" tabindex="-1">
          <div class="modal-dialog">
            <div class="modal-content">
              <div class="modal-header" style="background:#667eea;color:white;">
                <h5 class="modal-title">Registrar Pago — ${vecino.nombre}</h5>
                <button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal"></button>
              </div>
              <div class="modal-body">
                <div class="mb-3">
                  <label class="form-label">Mes</label>
                  <input type="month" id="pagoMes" class="form-control" value="${mesActual}">
                </div>
                <div class="mb-3">
                  <label class="form-label">Monto ($)</label>
                  <input type="number" id="pagoMonto" class="form-control" value="${montoDefault}">
                </div>
                <div class="mb-3">
                  <label class="form-label">Método de pago</label>
                  <select id="pagoMetodo" class="form-select">
                    <option value="Efectivo">Efectivo</option>
                    <option value="Transferencia">Transferencia</option>
                    <option value="Mercado Pago">Mercado Pago</option>
                  </select>
                </div>
              </div>
              <div class="modal-footer">
                <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Cancelar</button>
                <button type="button" class="btn btn-success" id="confirmarPagoBtn">Registrar y Habilitar</button>
              </div>
            </div>
          </div>
        </div>
      `;
      // Insertar modal en el DOM (remover anterior si existe)
      const prev = document.getElementById('modalPago');
      if (prev) prev.remove();
      document.body.insertAdjacentHTML('beforeend', modalHtml);
      const modalEl = document.getElementById('modalPago');
      const modal = new bootstrap.Modal(modalEl);
      modal.show();
      document.getElementById('confirmarPagoBtn').onclick = async () => {
        const mes = document.getElementById('pagoMes').value;
        const monto = parseFloat(document.getElementById('pagoMonto').value) || 0;
        const metodo = document.getElementById('pagoMetodo').value;
        await this.registrarPago(vecino, mes, monto, metodo);
        modal.hide();
        this.showVecinos();
      };
    }
    async registrarPago(vecino, mes, monto, metodo) {
      try {
        const clientId = this.clientData.id;
        const vecinoRef = firebase.firestore().collection(`clientes/${clientId}/vecinos`).doc(vecino.uid);
        // Guardar el pago en subcolección
        await vecinoRef.collection('pagos').add({
          mes: mes,
          monto: monto,
          metodo: metodo,
          fecha: new Date(),
          registrado_por: sessionStorage.getItem('email_acceso') || 'admin'
        });
        // Habilitar al vecino para ese mes y guardar el monto
        await vecinoRef.set({
          habilitado: true,
          habilitado_hasta: mes,
          monto: monto
        }, { merge: true });
        alert(`✅ Pago registrado. ${vecino.nombre} habilitado para ${mes}.`);
      } catch (e) {
        console.error('❌ Error registrando pago:', e);
        alert('Error registrando pago: ' + e.message);
      }
    }

     async verHistorialPagos(vecino) {
      try {
        const clientId = this.clientData.id;
        const snap = await firebase.firestore()
          .collection(`clientes/${clientId}/vecinos/${vecino.uid}/pagos`)
          .get();
        const pagos = snap.docs.map(d => d.data())
          .sort((a, b) => {
            const fa = a.fecha?.toMillis ? a.fecha.toMillis() : new Date(a.fecha).getTime();
            const fb = b.fecha?.toMillis ? b.fecha.toMillis() : new Date(b.fecha).getTime();
            return fb - fa;
          });
        let texto = `Historial de pagos — ${vecino.nombre}\n\n`;
        if (pagos.length === 0) {
          texto += 'Sin pagos registrados.';
        } else {
          pagos.forEach(p => {
            const f = p.fecha?.toDate ? p.fecha.toDate().toLocaleDateString('es-AR') : new Date(p.fecha).toLocaleDateString('es-AR');
            texto += `• ${p.mes} · $${p.monto} · ${p.metodo} · ${f}\n`;
          });
        }
        alert(texto);
      } catch (e) {
        alert('Error cargando historial: ' + e.message);
      }
    }


    async cargarPatrullasFirestore() {
      // Leer de la estructura anidada: clientes/{clienteId}/patrullas/
      const clientId = this.clientData.id || this.clientData.nombre;
      try {
        const ref = firebase.firestore().collection(`clientes/${clientId}/patrullas`);
        const snap = await ref.get();
        return snap.docs
          .map(doc => doc.data())
          .filter(p => {
            // Validar que tenga los campos requeridos
            return p && p.nombre && p.usuario && p.password;
          });
      } catch (e) {
        console.error('❌ Error cargando patrullas:', e);
        return [];
      }
    }

    async cargarOperariosFirestore() {
      const clientId = this.clientData.id;
      const ref = firebase.firestore().collection(`clientes/${clientId}/operarios`);
      const snap = await ref.get();
      return snap.docs.map(doc => doc.data());
    }

    // ========== EDITAR PATRULLA ==========
    editarPatrulla(patrulla, liElement) {
      const nombre = prompt(`Editar nombre de patrulla (actual: ${patrulla.nombre}):`, patrulla.nombre);
      if (!nombre || nombre === patrulla.nombre) return;
      
      const clientId = this.clientData.id || this.clientData.nombre;
      const patente = `PATRULLA_${patrulla.nombre.replace(/\W+/g, '').toUpperCase()}`;
      
      // Actualizar en Firestore (estructura anidada)
      firebase.firestore().collection(`clientes/${clientId}/patrullas`).doc(patente).update({
        nombre: nombre
      }).then(() => {
        alert('✅ Patrulla actualizada');
        liElement.querySelector('input').value = nombre;
      }).catch(e => {
        alert('❌ Error: ' + e.message);
      });
    }

    // ========== ELIMINAR PATRULLA ==========
    eliminarPatrulla(nombrePatrulla, liElement) {
      // Validar parámetros
      if (!nombrePatrulla || nombrePatrulla === 'undefined') {
        alert('❌ No se puede eliminar: datos inválidos');
        if (liElement) liElement.remove();
        return;
      }
      
      if (!confirm(`¿Eliminar patrulla "${nombrePatrulla}"?`)) return;
      
      const clientId = this.clientData.id || this.clientData.nombre;
      const patente = `PATRULLA_${nombrePatrulla.replace(/\W+/g, '').toUpperCase()}`;
      
      console.log(`🗑️ Eliminando patrulla: ${patente} de clientes/${clientId}/patrullas`);
      
      // Eliminar de Firestore (estructura anidada)
      firebase.firestore().collection(`clientes/${clientId}/patrullas`).doc(patente).delete().then(() => {
        alert('✅ Patrulla eliminada');
        if (liElement) liElement.remove();
      }).catch(e => {
        alert('❌ Error: ' + e.message);
      });
    }

    // ========== EDITAR OPERARIO ==========
    editarOperario(operario, liElement) {
      const nombre = prompt(`Editar nombre de operario (actual: ${operario.nombre}):`, operario.nombre);
      if (!nombre || nombre === operario.nombre) return;
      
      const clientId = this.clientData.id;
      const ref = firebase.firestore().collection(`clientes/${clientId}/operarios`);
      
      // Buscar y actualizar
      ref.where('usuario', '==', operario.usuario).get().then(snap => {
        if (snap.empty) return alert('Operario no encontrado');
        snap.docs[0].ref.update({ nombre }).then(() => {
          alert('✅ Operario actualizado');
          liElement.querySelector('input').value = nombre;
        });
      }).catch(e => {
        alert('❌ Error: ' + e.message);
      });
    }

    // ========== ELIMINAR OPERARIO ==========
    eliminarOperario(nombreOperario, liElement) {
      if (!confirm(`¿Eliminar operario "${nombreOperario}"?`)) return;
      
      const clientId = this.clientData.id;
      const ref = firebase.firestore().collection(`clientes/${clientId}/operarios`);
      
      // Buscar y eliminar
      ref.where('nombre', '==', nombreOperario).get().then(snap => {
        if (snap.empty) return alert('Operario no encontrado');
        snap.docs[0].ref.delete().then(() => {
          alert('✅ Operario eliminado');
          liElement.remove();
        });
      }).catch(e => {
        alert('❌ Error: ' + e.message);
      });
    }

  async showPage(page) {
    try {
      console.log("📄 Mostrando página:", page);
      this.currentPage = page;
      
      // Sincronizar clientData
      if (clientAuth.clientData) {
        this.clientData = clientAuth.clientData;
      }

      const contentDiv = document.getElementById('clientContent');
      if (!contentDiv) {
        console.error("❌ clientContent div no encontrado");
        return;
      }
      
      switch(page) {
        case 'dashboard':
          this.showDashboard();
          break;
        case 'datos':
          this.showDatos();
          break;
        case 'cargar':
          this.showCargar();
          break;
       case 'vecinos':
          this.showVecinos();
          break;
        case 'denuncias':
          this.abrirDenuncias();
          break;
        case 'mapa':
          this.showMapa();
          break;
        case 'facturacion':
          this.showFacturacion();
          break;
        case 'api':
          this.showAPI();
          break;
        default:
          this.showDashboard();
      }
    } catch (error) {
      console.error("❌ Error mostrando página:", error);
      const contentDiv = document.getElementById('clientContent');
      if (contentDiv) {
        contentDiv.innerHTML = `
          <div class="alert alert-danger">
            <h4>Error</h4>
            <p>Error al cargar la página: ${error.message}</p>
          </div>
        `;
      }
    }
  }

  showDashboard() {
    console.log("📊 Mostrando dashboard...");
    const content = document.getElementById('clientContent');
    
    content.innerHTML = `
      <div>
        <h2 class="mb-4">Dashboard</h2>
        
        <!-- Tarjeta destacada: Ver Proyecto -->
        <div class="row mb-4">
          <div class="col-md-12">
            <div class="card" style="border: 2px solid #0066ff; background: linear-gradient(135deg, rgba(0, 102, 255, 0.05) 0%, rgba(102, 126, 234, 0.05) 100%); box-shadow: 0 4px 15px rgba(0, 102, 255, 0.15);">
              <div class="card-body" style="padding: 25px; text-align: center;">
                <h4 style="color: #0066ff; margin-bottom: 10px;">
                  <i class="bi bi-map" style="font-size: 28px;"></i>
                </h4>
                <h5 style="color: #333; margin-bottom: 12px; font-weight: 600;">Ver Proyecto en Pantalla Completa</h5>
                <p style="color: #666; margin-bottom: 15px; font-size: 14px;">Abre el mapa interactivo de tu municipio con todos tus datos cargados.</p>
                <button class="btn" style="background: linear-gradient(135deg, #0066ff 0%, #0052cc 100%); color: white; border: none; padding: 12px 30px; font-weight: 600; border-radius: 6px; cursor: pointer; font-size: 15px;" onclick="clientDashboard.openProjectMap()">
                  <i class="bi bi-play-circle"></i> Abrir Mapa
                </button>
              </div>
            </div>
          </div>
        </div>
        
        <div class="row mb-4">
          <div class="col-md-4">
            <div class="card-stat">
              <h3 id="statCamaras">0</h3>
              <p><i class="bi bi-camera-video"></i> Cámaras</p>
            </div>
          </div>
          <div class="col-md-4">
            <div class="card-stat">
              <h3 id="statSiniestros">0</h3>
              <p><i class="bi bi-exclamation-triangle"></i> Siniestros</p>
            </div>
          </div>
          <div class="col-md-4">
            <div class="card-stat">
              <h3 id="statAlertas">0</h3>
              <p><i class="bi bi-bell"></i> Alertas Activas</p>
            </div>
          </div>
        </div>

        <div class="row">
          <div class="col-md-6">
            <div class="card" style="border: none; box-shadow: 0 2px 8px rgba(0,0,0,0.08);">
              <div class="card-header" style="background: #f9f9f9; border: none;">
                <h5 class="mb-0">Plan Actual</h5>
              </div>
              <div class="card-body">
                <p class="mb-2"><strong>Plan:</strong> <span class="badge bg-primary">${capitalize(this.clientData.plan || 'basico')}</span></p>
                <p class="mb-2"><strong>Estado:</strong> <span class="badge bg-success">Activo</span></p>
                <p class="mb-0"><strong>Dominio:</strong> ${this.clientData.dominio || 'No configurado'}</p>
              </div>
            </div>
          </div>

          <div class="col-md-6">
            <div class="card" style="border: none; box-shadow: 0 2px 8px rgba(0,0,0,0.08);">
              <div class="card-header" style="background: #f9f9f9; border: none;">
                <h5 class="mb-0">Acciones Rápidas</h5>
              </div>
              <div class="card-body">
                <button class="btn btn-sm btn-primary mb-2 w-100" onclick="clientDashboard.showPage('cargar')">
                  <i class="bi bi-cloud-upload"></i> Cargar CSV
                </button>
                <button class="btn btn-sm btn-info mb-2 w-100" onclick="clientDashboard.showPage('mapa')">
                  <i class="bi bi-map"></i> Ver Mapa
                </button>
                <button class="btn btn-sm btn-secondary w-100" onclick="clientDashboard.showPage('api')">
                  <i class="bi bi-code-square"></i> API Key
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    `;
    // Cargar estadísticas
    this.loadStats();
  }

  async loadStats() {
    try {
      const clientId = this.clientData.id;
      this.dataStats = this.dataStats || { camaras: 0, siniestros: 0, alertas: 0 };
      
      // Contar cámaras (públicas + privadas)
      const camerasRef = firebase.firestore().collection(`clientes/${clientId}/cameras`);
      const camerasSnap = await camerasRef.get();
      const camerasPrivRef = firebase.firestore().collection(`clientes/${clientId}/cameras_privadas`);
      const camerasPrivSnap = await camerasPrivRef.get();
      this.dataStats.camaras = camerasSnap.size + camerasPrivSnap.size;
      
      // Contar siniestros
      const siniestrosRef = firebase.firestore().collection(`clientes/${clientId}/siniestros`);
      const siniestrosSnap = await siniestrosRef.get();
      this.dataStats.siniestros = siniestrosSnap.size;
      
      // Alertas (por ahora 0, se puede expandir después)
      this.dataStats.alertas = 0;
      
      // Actualizar UI
      const statCamaras = document.getElementById('statCamaras');
      const statSiniestros = document.getElementById('statSiniestros');
      const statAlertas = document.getElementById('statAlertas');
      
      if (statCamaras) statCamaras.textContent = this.dataStats.camaras;
      if (statSiniestros) statSiniestros.textContent = this.dataStats.siniestros;
      if (statAlertas) statAlertas.textContent = this.dataStats.alertas;
      
      console.log("📊 Estadísticas cargadas:", this.dataStats);
    } catch (error) {
      console.error("❌ Error cargando estadísticas:", error);
    }
  }

  showDatos() {
    const content = document.getElementById('clientContent');
    content.innerHTML = `
      <div>
        <h2 class="mb-4">Mis Datos</h2>
        
        <div class="card" style="border: none; box-shadow: 0 2px 8px rgba(0,0,0,0.08);">
          <div class="card-header" style="background: #f9f9f9; border: none;">
            <h5 class="mb-0">Información del Cliente</h5>
          </div>
          <div class="card-body">
            <table class="table table-borderless">
              <tr>
                <td style="width: 200px;"><strong>Municipio:</strong></td>
                <td>${this.clientData.nombre}</td>
              </tr>
              <tr>
                <td><strong>Email:</strong></td>
                <td>${this.clientData.email}</td>
              </tr>
              <tr>
                <td><strong>Plan:</strong></td>
                <td><span class="badge bg-primary">${capitalize(this.clientData.plan)}</span></td>
              </tr>
              <tr>
                <td><strong>Dominio:</strong></td>
                <td>${this.clientData.dominio || 'No configurado'}</td>
              </tr>
              <tr>
                <td><strong>API Key:</strong></td>
                <td><code>${this.clientData.api_key || 'No disponible'}</code></td>
              </tr>
              <tr>
                <td><strong>Estado:</strong></td>
                <td><span class="badge bg-success">${capitalize(this.clientData.estado)}</span></td>
              </tr>
              <tr>
                <td><strong>Creado:</strong></td>
                <td>${formatDate(this.clientData.created_at)}</td>
              </tr>
            </table>
          </div>
        </div>
      </div>
    `;
  }

  showCargar() {
    const content = document.getElementById('clientContent');
    content.innerHTML = `
      <div id='usuariosMasivosContainer' style='margin-bottom:30px;'>
        <div class='row'>
          <div class='col-md-6'>
            <div class='card mb-3'>
              <div class='card-header bg-primary text-white'>Carga de Patrullas (uno por uno)</div>
              <div class='card-body'>
                <ul id='listaPatrullas' class='list-group'></ul>
                <button id='agregarPatrullaBtn' class='btn btn-success mt-2'><b>+</b> Agregar Patrulla</button>
              </div>
            </div>
          </div>
          <div class='col-md-6'>
            <div class='card mb-3'>
              <div class='card-header bg-info text-white'>Carga de Operarios (uno por uno)</div>
              <div class='card-body'>
                <ul id='listaOperarios' class='list-group'></ul>
                <button id='agregarOperarioBtn' class='btn btn-success mt-2'><b>+</b> Agregar Operario</button>
              </div>
            </div>
          </div>
        </div>
      </div>
      <div>
        <h2 class="mb-4">Cargar Datos</h2>
        <!-- Status - VISIBLE AL TOP -->
        <div id="uploadStatus" class="mb-4" style="min-height: 60px;"></div>
        <div class="alert alert-info mb-4">
          <i class="bi bi-info-circle"></i> Puedes cargar archivos CSV o GeoJSON con tus datos. Todos los campos son opcionales. Haz click en <strong>?</strong> para ver el formato requerido.
        </div>
        <!-- SECCIÓN: DATOS PRINCIPALES -->
        <div class="card mb-4" style="border: none; box-shadow: 0 2px 8px rgba(0,0,0,0.08);">
          <div class="card-header" style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; border: none;">
            <h5 class="mb-0"><i class="bi bi-pin-map"></i> DATOS PRINCIPALES</h5>
          </div>
          <div class="card-body">
            <div class="row">
              <!-- Barrios -->
              <div class="col-md-6 mb-4">
                <div class="d-flex gap-2 mb-2">
                  <label class="form-label mb-0"><strong>Barrios</strong></label>
                  <button class="btn btn-sm btn-outline-secondary help-btn" data-help="barrios" style="padding: 0 6px; font-size: 12px;">?</button>
                  <button class="btn btn-sm btn-outline-danger clear-btn" data-collection="barrios" style="padding: 2px 6px; font-size: 11px;">🗑️ Limpiar</button>
                </div>
                <div class="upload-area" id="uploadBarrios">
                  <p><i class="bi bi-file-earmark" style="font-size: 28px; color: #667eea;"></i></p>
                  <p class="mb-1"><small>Arrastra aquí</small></p>
                  <small class="text-muted">GeoJSON</small>
                  <input type="file" class="uploadFile" accept=".json,.geojson" style="display: none;" data-type="barrios">
                </div>
              </div>
              <!-- Cámaras Públicas -->
              <div class="col-md-6 mb-4">
                <div class="d-flex gap-2 mb-2">
                  <label class="form-label mb-0"><strong>Cámaras Públicas</strong></label>
                  <button class="btn btn-sm btn-outline-secondary help-btn" data-help="cameras_public" style="padding: 0 6px; font-size: 12px;">?</button>
                  <button class="btn btn-sm btn-outline-danger clear-btn" data-collection="cameras" style="padding: 2px 6px; font-size: 11px;">🗑️ Limpiar</button>
                </div>
                <div class="upload-area" id="uploadCamarasPublicas">
                  <p><i class="bi bi-camera-video" style="font-size: 28px; color: #28a745;"></i></p>
                  <p class="mb-1"><small>Arrastra aquí</small></p>
                  <small class="text-muted">CSV</small>
                  <input type="file" class="uploadFile" accept=".csv" style="display: none;" data-type="cameras_public">
                </div>
              </div>
              <!-- Cámaras Privadas -->
              <div class="col-md-6 mb-4">
                <div class="d-flex gap-2 mb-2">
                  <label class="form-label mb-0"><strong>Cámaras Privadas</strong></label>
                  <button class="btn btn-sm btn-outline-secondary help-btn" data-help="cameras_private" style="padding: 0 6px; font-size: 12px;">?</button>
                  <button class="btn btn-sm btn-outline-danger clear-btn" data-collection="cameras_privadas" style="padding: 2px 6px; font-size: 11px;">🗑️ Limpiar</button>
                </div>
                <div class="upload-area" id="uploadCamarasPrivadas">
                  <p><i class="bi bi-camera" style="font-size: 28px; color: #17a2b8;"></i></p>
                  <p class="mb-1"><small>Arrastra aquí</small></p>
                  <small class="text-muted">CSV</small>
                  <input type="file" class="uploadFile" accept=".csv" style="display: none;" data-type="cameras_private">
                </div>
              </div>
              <!-- Siniestros -->
              <div class="col-md-6 mb-4">
                <div class="d-flex gap-2 mb-2">
                  <label class="form-label mb-0"><strong>Siniestros</strong></label>
                  <button class="btn btn-sm btn-outline-secondary help-btn" data-help="siniestros" style="padding: 0 6px; font-size: 12px;">?</button>
                  <button class="btn btn-sm btn-outline-danger clear-btn" data-collection="siniestros" style="padding: 2px 6px; font-size: 11px;">🗑️ Limpiar</button>
                </div>
                <div class="upload-area" id="uploadSiniestros">
                  <p><i class="bi bi-exclamation-triangle" style="font-size: 28px; color: #dc3545;"></i></p>
                  <p class="mb-1"><small>Arrastra aquí</small></p>
                  <small class="text-muted">CSV</small>
                  <input type="file" class="uploadFile" accept=".csv" style="display: none;" data-type="siniestros">
                </div>
              </div>
            </div>
          </div>
        </div>
        <!-- SECCIÓN: CAPAS OPCIONALES -->
        <div class="card mb-4" style="border: none; box-shadow: 0 2px 8px rgba(0,0,0,0.08);">
          <div class="card-header" style="background: #f9f9f9; border: none;">
            <h5 class="mb-0"><i class="bi bi-layers"></i> CAPAS OPCIONALES</h5>
          </div>
          <div class="card-body">
            <div class="row">
              <!-- Semáforos -->
              <div class="col-md-6 mb-4">
                <div class="d-flex gap-2 mb-2">
                  <label class="form-label mb-0"><strong>Semáforos</strong></label>
                  <button class="btn btn-sm btn-outline-secondary help-btn" data-help="semaforos" style="padding: 0 6px; font-size: 12px;">?</button>
                  <button class="btn btn-sm btn-outline-danger clear-btn" data-collection="semaforos" style="padding: 2px 6px; font-size: 11px;">🗑️ Limpiar</button>
                </div>
                <div class="upload-area" id="uploadSemafor">
                  <p><i class="bi bi-traffic-light" style="font-size: 28px; color: #ffc107;"></i></p>
                  <p class="mb-1"><small>Arrastra aquí</small></p>
                  <small class="text-muted">CSV</small>
                  <input type="file" class="uploadFile" accept=".csv" style="display: none;" data-type="semaforos">
                </div>
              </div>
              <!-- Colegios/Escuelas -->
              <div class="col-md-6 mb-4">
                <div class="d-flex gap-2 mb-2">
                  <label class="form-label mb-0"><strong>Colegios / Escuelas</strong></label>
                  <button class="btn btn-sm btn-outline-secondary help-btn" data-help="colegios" style="padding: 0 6px; font-size: 12px;">?</button>
                  <button class="btn btn-sm btn-outline-danger clear-btn" data-collection="colegios" style="padding: 2px 6px; font-size: 11px;">🗑️ Limpiar</button>
                </div>
                <div class="upload-area" id="uploadColegios">
                  <p><i class="bi bi-building" style="font-size: 28px; color: #6f42c1;"></i></p>
                  <p class="mb-1"><small>Arrastra aquí</small></p>
                  <small class="text-muted">CSV o GeoJSON</small>
                  <input type="file" class="uploadFile" accept=".csv,.json,.geojson" style="display: none;" data-type="colegios">
                </div>
              </div>
              <!-- Corredores Escolares -->
              <div class="col-md-6 mb-4">
                <div class="d-flex gap-2 mb-2">
                  <label class="form-label mb-0"><strong>Corredores Escolares</strong></label>
                  <button class="btn btn-sm btn-outline-secondary help-btn" data-help="corredores" style="padding: 0 6px; font-size: 12px;">?</button>
                  <button class="btn btn-sm btn-outline-danger clear-btn" data-collection="corredores" style="padding: 2px 6px; font-size: 11px;">🗑️ Limpiar</button>
                </div>
                <div class="upload-area" id="uploadCorredores">
                  <p><i class="bi bi-pentagon" style="font-size: 28px; color: #20c997;"></i></p>
                  <p class="mb-1"><small>Arrastra aquí</small></p>
                  <small class="text-muted">GeoJSON</small>
                  <input type="file" class="uploadFile" accept=".json,.geojson" style="display: none;" data-type="corredores">
                </div>
              </div>
              <!-- Flujo Vehicular -->
              <div class="col-md-6 mb-4">
                <div class="d-flex gap-2 mb-2">
                  <label class="form-label mb-0"><strong>Flujo Vehicular</strong></label>
                  <button class="btn btn-sm btn-outline-secondary help-btn" data-help="flujo" style="padding: 0 6px; font-size: 12px;">?</button>
                  <button class="btn btn-sm btn-outline-danger clear-btn" data-collection="flujo" style="padding: 2px 6px; font-size: 11px;">🗑️ Limpiar</button>
                </div>
                <div class="upload-area" id="uploadFlujo">
                  <p><i class="bi bi-diagram-3" style="font-size: 28px; color: #fd7e14;"></i></p>
                  <p class="mb-1"><small>Arrastra aquí</small></p>
                  <small class="text-muted">CSV</small>
                  <input type="file" class="uploadFile" accept=".csv" style="display: none;" data-type="flujo">
                </div>
              </div>
              <!-- Robo Automotor -->
              <div class="col-md-6 mb-4">
                <div class="d-flex gap-2 mb-2">
                  <label class="form-label mb-0"><strong>Robo Automotor</strong></label>
                  <button class="btn btn-sm btn-outline-secondary help-btn" data-help="robo" style="padding: 0 6px; font-size: 12px;">?</button>
                  <button class="btn btn-sm btn-outline-danger clear-btn" data-collection="robo" style="padding: 2px 6px; font-size: 11px;">🗑️ Limpiar</button>
                </div>
                <div class="upload-area" id="uploadRobo">
                  <p><i class="bi bi-car-front" style="font-size: 28px; color: #e83e8c;"></i></p>
                  <p class="mb-1"><small>Arrastra aquí</small></p>
                  <small class="text-muted">CSV</small>
                  <input type="file" class="uploadFile" accept=".csv" style="display: none;" data-type="robo">
                </div>
              </div>
              <!-- Colectivos -->
              <div class="col-md-6 mb-4">
                <div class="d-flex gap-2 mb-2">
                  <label class="form-label mb-0"><strong>Líneas de Colectivos</strong></label>
                  <button class="btn btn-sm btn-outline-secondary help-btn" data-help="colectivos" style="padding: 0 6px; font-size: 12px;">?</button>
                  <button class="btn btn-sm btn-outline-danger clear-btn" data-collection="colectivos" style="padding: 2px 6px; font-size: 11px;">🗑️ Limpiar</button>
                </div>
                <div class="upload-area" id="uploadColectivos">
                  <p><i class="bi bi-bus-front" style="font-size: 28px; color: #0dcaf0;"></i></p>
                  <p class="mb-1"><small>Arrastra aquí</small></p>
                  <small class="text-muted">GeoJSON</small>
                  <input type="file" class="uploadFile" accept=".json,.geojson" style="display: none;" data-type="colectivos">
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    `;

    // Inicializar carga uno a uno con datos persistentes
    this.cargarPatrullasFirestore().then(patrullas => {
      const lista = document.getElementById('listaPatrullas');
      if (lista) lista.innerHTML = '';
      if (!patrullas || patrullas.length === 0) {
        const aviso = document.createElement('div');
        aviso.className = 'alert alert-warning';
        aviso.innerHTML = 'No se encontraron patrullas guardadas.';
        lista.appendChild(aviso);
      } else {
        patrullas.forEach((p, idx) => {
          // Validar nuevamente que tenga datos válidos
          if (!p.nombre || !p.usuario || !p.password) {
            console.warn(`⚠️ Patrulla ${idx} tiene datos undefined, omitiendo`);
            return;
          }
          
          const li = document.createElement('li');
          li.className = 'list-group-item d-flex align-items-center gap-2 justify-content-between';
          li.innerHTML = `
            <div class="d-flex align-items-center gap-2" style="flex: 1;">
              <input type="text" class="form-control form-control-sm patrulla-input" value="${p.nombre}" style="max-width:180px;" disabled>
              <button class="btn btn-sm btn-primary generar-btn" disabled>Generar</button>
              <span class="credenciales"><b>Usuario:</b> ${p.usuario} <b>Pass:</b> ${p.password}</span>
            </div>
            <div class="d-flex gap-2">
              <button class="btn btn-sm btn-warning edit-btn" title="Editar">✏️</button>
              <button class="btn btn-sm btn-danger delete-btn" title="Eliminar">🗑️</button>
            </div>
          `;
          
          li.querySelector('.edit-btn').onclick = () => this.editarPatrulla(p, li);
          li.querySelector('.delete-btn').onclick = () => this.eliminarPatrulla(p.nombre, li);
          lista.appendChild(li);
        });
      }
    });

    this.cargarOperariosFirestore().then(operarios => {
      const lista = document.getElementById('listaOperarios');
      if (lista) lista.innerHTML = '';
      if (!operarios || operarios.length === 0) {
        const aviso = document.createElement('div');
        aviso.className = 'alert alert-warning';
        aviso.innerHTML = 'No se encontraron operarios guardados.';
        lista.appendChild(aviso);
      } else {
        operarios.forEach(o => {
          const li = document.createElement('li');
          li.className = 'list-group-item d-flex align-items-center gap-2 justify-content-between';
          li.innerHTML = `
            <div class="d-flex align-items-center gap-2" style="flex: 1;">
              <input type="text" class="form-control form-control-sm operario-input" value="${o.nombre}" style="max-width:180px;" disabled>
              <button class="btn btn-sm btn-primary generar-btn" disabled>Generar</button>
              <span class="credenciales"><b>Usuario:</b> ${o.usuario} <b>Pass:</b> ${o.password}</span>
            </div>
            <div class="d-flex gap-2">
              <button class="btn btn-sm btn-warning edit-btn" title="Editar">✏️</button>
              <button class="btn btn-sm btn-danger delete-btn" title="Eliminar">🗑️</button>
            </div>
          `;
          
          li.querySelector('.edit-btn').onclick = () => this.editarOperario(o, li);
          li.querySelector('.delete-btn').onclick = () => this.eliminarOperario(o.nombre, li);
          lista.appendChild(li);
        });
      }
    });
    const btnPatrulla = document.getElementById('agregarPatrullaBtn');
    if (btnPatrulla) btnPatrulla.onclick = () => this.agregarPatrullaInput();
    const btnOperario = document.getElementById('agregarOperarioBtn');
    if (btnOperario) btnOperario.onclick = () => this.agregarOperarioInput();

    // Adjuntar eventos
    this.attachUploadEvents();
    this.attachHelpEvents();
  }

   showVecinos() {
    const content = document.getElementById('clientContent');
    content.innerHTML = `
      <div>
        <h2 class="mb-4"><i class="bi bi-people"></i> Vecinos</h2>
        <div class="alert alert-info mb-4">
          <i class="bi bi-info-circle"></i> Crea cuentas de vecinos para que puedan enviar denuncias desde su celular.
        </div>
        <div class="card mb-3">
          <div class="card-header bg-primary text-white">Alta de Vecino</div>
          <div class="card-body">
            <div class="row g-2 mb-3">
              <div class="col-md-3">
                <input type="text" id="vecinoNombre" class="form-control form-control-sm" placeholder="Nombre y apellido">
              </div>
              <div class="col-md-3">
                <input type="text" id="vecinoDireccion" class="form-control form-control-sm" placeholder="Dirección">
              </div>
              <div class="col-md-3">
                <input type="text" id="vecinoTelefono" class="form-control form-control-sm" placeholder="Teléfono">
              </div>
              <div class="col-md-3">
                <button id="crearVecinoBtn" class="btn btn-success btn-sm w-100"><b>+</b> Crear Vecino</button>
              </div>
            </div>
            <span id="vecinoCredenciales" class="d-block"></span>
          </div>
        </div>
        <div class="card mb-3">
          <div class="card-header bg-info text-white">Vecinos registrados</div>
          <div class="card-body">
            <ul id="listaVecinos" class="list-group"></ul>
          </div>
        </div>
      </div>
    `;
    // Cargar lista de vecinos existentes
    this.cargarVecinosFirestore().then(vecinos => {
      const lista = document.getElementById('listaVecinos');
      if (lista) lista.innerHTML = '';
      if (!vecinos || vecinos.length === 0) {
        const aviso = document.createElement('div');
        aviso.className = 'alert alert-warning';
        aviso.innerHTML = 'No se encontraron vecinos guardados.';
        lista.appendChild(aviso);
      } else {
        vecinos.forEach(v => {
          const habilitado = this.vecinoHabilitado(v);
          const estadoBadge = habilitado
            ? '<span class="badge bg-success">✅ Habilitado</span>'
            : '<span class="badge bg-danger">⛔ Vencido</span>';
          const hasta = v.habilitado_hasta ? ` (hasta ${v.habilitado_hasta})` : '';
          const li = document.createElement('li');
          li.className = 'list-group-item d-flex align-items-center justify-content-between';
          li.innerHTML = `
            <div style="flex:1;">
              <b>${v.nombre}</b> ${estadoBadge}${hasta} — ${v.direccion || 's/dirección'} — ${v.telefono || 's/tel'}<br>
              <small><b>Usuario:</b> ${v.usuario} <b>Pass:</b> ${v.password} · <b>Monto:</b> $${v.monto || 15000}</small>
            </div>
            <div class="d-flex gap-2">
              <button class="btn btn-sm btn-success pago-btn" title="Registrar pago">💲 Pago</button>
              <button class="btn btn-sm btn-info historial-btn" title="Ver pagos">📋</button>
              <button class="btn btn-sm btn-danger delete-btn" title="Eliminar">🗑️</button>
            </div>
          `;
          li.querySelector('.pago-btn').onclick = () => this.abrirModalPago(v);
          li.querySelector('.historial-btn').onclick = () => this.verHistorialPagos(v);
          li.querySelector('.delete-btn').onclick = () => this.eliminarVecino(v.nombre, li);
          lista.appendChild(li);
        });
      }
    });
    // Botón crear vecino
    const btnCrear = document.getElementById('crearVecinoBtn');
    if (btnCrear) {
      btnCrear.onclick = async () => {
        const nombre = document.getElementById('vecinoNombre').value.trim();
        const direccion = document.getElementById('vecinoDireccion').value.trim();
        const telefono = document.getElementById('vecinoTelefono').value.trim();
        if (!nombre) {
          alert('Ingresá al menos el nombre del vecino');
          return;
        }
        const usuario = `vecino_${nombre.replace(/\W+/g, '').toLowerCase()}@seguridad.com`;
        const password = Math.random().toString(36).slice(-8);
        btnCrear.disabled = true;
        btnCrear.textContent = 'Creando...';
        await this.guardarVecinoFirestore({ nombre, usuario, password, direccion, telefono });
        document.getElementById('vecinoCredenciales').innerHTML =
          `<div class="alert alert-success mt-2"><b>Vecino creado.</b> Usuario: <code>${usuario}</code> · Pass: <code>${password}</code></div>`;
        btnCrear.disabled = false;
        btnCrear.textContent = '+ Crear Vecino';
        // Recargar lista
        this.showVecinos();
      };
    }
  }

  attachUploadEvents() {
    // Obtener todos los upload-area
    const uploadAreas = document.querySelectorAll('.upload-area');
    console.log(`🔧 Encontrados ${uploadAreas.length} upload-areas`);
    
    // Prevenir comportamiento default en todo el documento
    document.addEventListener('dragover', (e) => {
      e.preventDefault();
      e.stopPropagation();
    });
    
    document.addEventListener('drop', (e) => {
      e.preventDefault();
      e.stopPropagation();
    });
    
    uploadAreas.forEach((area, index) => {
      const fileInput = area.querySelector('.uploadFile');
      const dataType = fileInput.getAttribute('data-type');
      const areaId = area.getAttribute('id');
      
      console.log(`  [${index}] ${areaId} -> data-type: ${dataType}`);
      
      // Click para seleccionar archivo
      area.addEventListener('click', (e) => {
        console.log(`🖱️ Click en ${areaId}`);
        fileInput.click();
      });
      
      // Drag & drop - MEJORADO
      area.addEventListener('dragover', (e) => {
        e.preventDefault();
        e.stopPropagation();
        area.classList.add('active');
        console.log(`📌 Dragover en ${areaId}`);
      });
      
      area.addEventListener('dragenter', (e) => {
        e.preventDefault();
        e.stopPropagation();
        area.classList.add('active');
        console.log(`📌 Dragenter en ${areaId}`);
      });
      
      area.addEventListener('dragleave', (e) => {
        e.preventDefault();
        e.stopPropagation();
        // Solo remover si salimos del area completamente
        if (e.target === area) {
          area.classList.remove('active');
          console.log(`📌 Dragleave de ${areaId}`);
        }
      });
      
      area.addEventListener('drop', (e) => {
        console.log(`📥 DROP EVENT:`, e);
        console.log(`📥 dataTransfer:`, e.dataTransfer);
        console.log(`📥 files:`, e.dataTransfer?.files);
        
        e.preventDefault();
        e.stopPropagation();
        area.classList.remove('active');
        
        const files = e.dataTransfer?.files;
        console.log(`📥 Drop en ${areaId} - Archivos detectados:`, files?.length);
        
        if (files && files.length > 0) {
          const file = files[0];
          console.log(`📥 Archivo a cargar:`, file.name, file.size, file.type);
          this.handleFileUpload(file, dataType);
        } else {
          console.error(`❌ No se encontraron archivos en drop`);
        }
      }, false);
      
      // Input file change
      fileInput.addEventListener('change', (e) => {
        console.log(`📂 File change en ${areaId}:`, e.target.files[0]);
        if (e.target.files[0]) {
          this.handleFileUpload(e.target.files[0], dataType);
        }
      });
    });

    // Adjuntar eventos a botones de limpiar
    const clearButtons = document.querySelectorAll('.clear-btn');
    clearButtons.forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.preventDefault();
        const collection = btn.getAttribute('data-collection');
        const confirmed = confirm(`¿Estás seguro que quieres BORRAR todos los datos de ${collection}? Esta acción es irreversible.`);
        if (confirmed) {
          this.clearCollection(collection);
        }
      });
    });

    console.log("✅ Upload events attached - READY FOR DRAG & DROP");
  }

  attachHelpEvents() {
    const helpButtons = document.querySelectorAll('.help-btn');
    
    // Mapear tipos de datos a tipos de FormatHelp
    const typeMapping = {
      'barrios': 'barrios',
      'cameras_public': 'cameras',
      'cameras_private': 'private_cameras',
      'siniestros': 'siniestros',
      'semaforos': 'semaforos',
      'colegios': 'colegios',
      'corredores': 'corredores',
      'flujo': 'flujo',
      'robo': 'robo',
      'colectivos': 'lineas-colectivos'
    };
    
    helpButtons.forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.preventDefault();
        const helpType = btn.getAttribute('data-help');
        const formatHelpType = typeMapping[helpType] || helpType;
        
        console.log('📞 Help button clicked:', helpType, '-> format type:', formatHelpType);
        
        // Llamar al FormatHelp del admin
        if (typeof FormatHelp !== 'undefined' && formatHelpType) {
          try {
            FormatHelp.showHelp(formatHelpType);
            console.log('✅ FormatHelp mostrado para:', formatHelpType);
          } catch (error) {
            console.error('❌ Error mostrando ayuda:', error);
            alert('Error mostrando ayuda. Tipo no disponible: ' + formatHelpType);
          }
        } else {
          console.error('❌ FormatHelp no disponible o tipo no mapeado:', {
            formatHelp: typeof FormatHelp,
            formatHelpType: formatHelpType
          });
          alert('Ayuda no disponible para este tipo de archivo');
        }
      });
    });
  }

  async handleFileUpload(file, type) {
    console.log("📁 ===== UPLOAD INICIADO =====");
    console.log("📁 Archivo:", file.name);
    console.log("📁 Tipo:", type);
    console.log("📁 Tamaño:", file.size, "bytes");
    console.log("📁 MIME Type:", file.type);
    
    try {
      const statusDiv = document.getElementById('uploadStatus');
      if (!statusDiv) {
        console.error("❌ uploadStatus div no encontrado!");
        alert('Error: No se pudo encontrar el área de estado');
        return;
      }
      
      // Mostrar estado de "procesando"
      statusDiv.innerHTML = `<div class="alert alert-warning alert-dismissible fade show" role="alert" style="font-size: 16px; font-weight: bold;">⏳ <strong>Procesando:</strong> ${file.name}</div>`;
      statusDiv.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      
      // Mapear tipos a nombres de colecciones
      const typeMapping = {
        'barrios': 'barrios',
        'cameras_public': 'cameras',
        'cameras_private': 'cameras_privadas',
        'siniestros': 'siniestros',
        'semaforos': 'semaforos',
        'colegios': 'colegios_escuelas',
        'corredores': 'corredores_escolares',
        'flujo': 'flujo',
        'robo': 'robo',
        'colectivos': 'colectivos'
      };
      
      const collectionName = typeMapping[type] || type;
      console.log("📁 Colección Firestore:", collectionName);
      
      // Leer archivo
      console.log("📁 Leyendo archivo...");
      const text = await file.text();
      console.log("📁 Archivo leído:", text.length, "caracteres");
      
      let data = [];
      
      // Detectar si es GeoJSON o CSV
      if (file.name.endsWith('.json') || file.name.endsWith('.geojson')) {
        console.log("📁 Formato detectado: GeoJSON");
        data = csvParser.parseGeoJSON(text);
      } else {
        console.log("📁 Formato detectado: CSV");
        data = csvParser.parseCSV(text);
      }
      
      console.log("📁 Datos parseados:", data.length, "registros");
      
      if (data.length === 0) {
        throw new Error('No se encontraron datos válidos en el archivo');
      }
      
      console.log("📁 Primeras 3 filas:");
      data.slice(0, 3).forEach((d, i) => console.log(`  [${i}]`, d));
      
      // Guardar en Firestore
      console.log("📁 Iniciando guardado en Firestore...");
      await this.saveDataToFirestore(data, collectionName);
      
      // Mostrar éxito
      statusDiv.innerHTML = `
        <div class="alert alert-success alert-dismissible fade show" role="alert" style="font-size: 16px; font-weight: bold;">
          <i class="bi bi-check-circle"></i> <strong>✅ ${type}</strong><br>
          <small>¡Archivo cargado exitosamente! ${data.length} registros guardados</small>
        </div>
      `;
      statusDiv.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      
      console.log("✅ ===== UPLOAD COMPLETADO =====");
      
      // Recargar estadísticas
      setTimeout(() => {
        console.log("🔄 Recargando estadísticas...");
        this.loadStats();
      }, 1000);
      
    } catch (error) {
      console.error("❌ Error en upload:", error);
      console.error("❌ Stack:", error.stack);
      
      const statusDiv = document.getElementById('uploadStatus');
      if (statusDiv) {
        statusDiv.innerHTML = `
          <div class="alert alert-danger alert-dismissible fade show" role="alert" style="font-size: 16px; font-weight: bold;">
            <i class="bi bi-exclamation-circle"></i> <strong>❌ Error</strong><br>
            <small>${error.message}</small>
          </div>
        `;
        statusDiv.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      }
    }
  }

  async saveDataToFirestore(data, collectionName) {
    const clientId = this.clientData.id;
    console.log("💾 saveDataToFirestore iniciado");
    console.log(`💾 clientId: ${clientId}`);
    console.log(`💾 collectionName: ${collectionName}`);
    console.log(`💾 registros a guardar: ${data.length}`);
    
    try {
      const ref = this.clientDb.collection(`clientes/${clientId}/${collectionName}`);
      console.log(`💾 Referencia de Firestore creada`);
      
      // Guardar en BATCH (más rápido y seguro)
      const batchSize = 100;
      let savedCount = 0;
      const statusDiv = document.getElementById('uploadStatus');
      
      for (let batchStart = 0; batchStart < data.length; batchStart += batchSize) {
        const batchEnd = Math.min(batchStart + batchSize, data.length);
        const batch = this.clientDb.batch();
        
        console.log(`💾 Batch ${Math.floor(batchStart / batchSize) + 1}: registros ${batchStart + 1}-${batchEnd}`);
        
        // Actualizar UI con progreso
        if (statusDiv) {
          const progress = Math.round((batchEnd / data.length) * 100);
          statusDiv.innerHTML = `
            <div class="alert alert-warning alert-dismissible fade show" role="alert" style="font-size: 16px; font-weight: bold;">
              ⏳ <strong>Guardando en Firestore:</strong> ${batchEnd}/${data.length} registros (${progress}%)
              <div class="progress mt-2" style="height: 20px;">
                <div class="progress-bar" role="progressbar" style="width: ${progress}%;" aria-valuenow="${progress}" aria-valuemin="0" aria-valuemax="100">${progress}%</div>
              </div>
            </div>
          `;
          statusDiv.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        }
        
        for (let i = batchStart; i < batchEnd; i++) {
          const item = data[i];
          const newDocRef = ref.doc();
          
          batch.set(newDocRef, {
            ...item,
            created_at: new Date(),
            cliente_id: clientId,
            _id: newDocRef.id
          });
        }
        
        // Commit batch
        try {
          await batch.commit();
          savedCount += (batchEnd - batchStart);
          console.log(`✅ Batch guardado: ${savedCount}/${data.length}`);
        } catch (batchError) {
          console.error(`❌ Error en batch:`, batchError);
          console.error(`❌ Error code:`, batchError.code);
          console.error(`❌ Error message:`, batchError.message);
          
          // Mostrar error específico
          if (statusDiv) {
            statusDiv.innerHTML = `
              <div class="alert alert-danger alert-dismissible fade show" role="alert" style="font-size: 14px;">
                <i class="bi bi-exclamation-circle"></i> <strong>Error de Firebase:</strong><br>
                <small><strong>Código:</strong> ${batchError.code}</small><br>
                <small><strong>Mensaje:</strong> ${batchError.message}</small><br>
                <small>Se guardaron ${savedCount}/${data.length} registros antes del error</small>
              </div>
            `;
            statusDiv.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
          }
          throw batchError;
        }
      }
      
      console.log(`✅ ${savedCount} registros guardados exitosamente en ${collectionName}`);
    } catch (error) {
      console.error(`❌ Error en saveDataToFirestore:`, error);
      console.error(`❌ Error code:`, error.code);
      console.error(`❌ Error message:`, error.message);
      throw error;
    }
  }

  async clearCollection(collectionName) {
    try {
      const statusDiv = document.getElementById('uploadStatus');
      if (statusDiv) {
        statusDiv.innerHTML = `<div class="alert alert-warning alert-dismissible fade show" role="alert" style="font-size: 16px; font-weight: bold;">⏳ Borrando ${collectionName}...</div>`;
      }

      const clientId = this.clientData.id;
      const colPath = `clientes/${clientId}/${collectionName}`;
      
      console.log(`🗑️ Eliminando todos los docs de: ${colPath}`);
      
      const ref = this.clientDb.collection(colPath);
      const snap = await ref.get();

      let deleted = 0;
      const batch = this.clientDb.batch();
      
      snap.forEach(doc => {
        batch.delete(doc.ref);
        deleted++;
      });
      
      if (deleted > 0) {
        await batch.commit();
        console.log(`✅ ${deleted} documentos eliminados de ${collectionName}`);
        
        if (statusDiv) {
          statusDiv.innerHTML = `
            <div class="alert alert-success alert-dismissible fade show" role="alert" style="font-size: 16px; font-weight: bold;">
              ✅ ${collectionName} limpiado<br>
              <small>${deleted} registros eliminados</small>
            </div>
          `;
          statusDiv.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        }
        
        // Recargar estadísticas
        setTimeout(() => {
          this.loadStats();
        }, 500);
      } else {
        console.log(`ℹ️ No había datos para eliminar en ${collectionName}`);
        if (statusDiv) {
          statusDiv.innerHTML = `<div class="alert alert-info alert-dismissible fade show" role="alert" style="font-size: 16px;">ℹ️ No había datos para eliminar en ${collectionName}</div>`;
        }
      }
    } catch (error) {
      console.error(`❌ Error limpiando ${collectionName}:`, error);
      const statusDiv = document.getElementById('uploadStatus');
      if (statusDiv) {
        statusDiv.innerHTML = `
          <div class="alert alert-danger alert-dismissible fade show" role="alert" style="font-size: 16px; font-weight: bold;">
            ❌ Error al limpiar<br>
            <small>${error.message}</small>
          </div>
        `;
      }
    }
  }

  showMapa() {
    const content = document.getElementById('clientContent');
    content.innerHTML = `
      <div style="height: 100%; display: flex; flex-direction: column;">
        <div style="padding: 20px 0;">
          <h2 class="mb-0">Mapa de Datos</h2>
          <small class="text-muted">Todas tus capas de datos en un mapa interactivo</small>
        </div>
        <div id="mapClient" style="flex: 1; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.1);"></div>
      </div>
    `;

    // Inicializar mapa tras renderizar DOM
    setTimeout(() => this.initMap(), 100);
  }

  async initMap() {
    try {
      if (!document.getElementById('mapClient')) {
        console.error("❌ Contenedor mapClient no encontrado");
        return;
      }

      // Usar ClientMapManager
      await clientMapManager.init(this.clientData, 'mapClient');
      console.log("✅ Mapa inicializado correctamente");
    } catch (error) {
      console.error("❌ Error inicializando mapa:", error);
      document.getElementById('mapClient').innerHTML = `
        <div style="padding: 20px; color: #d32f2f;">
          <strong>Error al cargar el mapa:</strong><br>
          ${error.message}
        </div>
      `;
    }
  }

  showFacturacion() {
    const content = document.getElementById('clientContent');
    content.innerHTML = `
      <div>
        <h2 class="mb-4">Facturación</h2>
        
        <div class="table-responsive">
          <table class="table table-hover">
            <thead class="table-light">
              <tr>
                <th>Período</th>
                <th>Monto</th>
                <th>Estado</th>
                <th>Acción</th>
              </tr>
            </thead>
            <tbody id="billingTable">
              <tr>
                <td colspan="4" class="text-center text-muted py-4">
                  Cargando facturas...
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    `;

    this.loadBillingData();
  }

  async loadBillingData() {
    try {
      const billingRef = firebase.firestore().collection('billing');
      const snap = await billingRef.where('cliente_id', '==', this.clientData.id).get();
      const tbody = document.getElementById('billingTable');

      if (!tbody) return;

      if (snap.empty) {
        tbody.innerHTML = '<tr><td colspan="4" class="text-center text-muted py-4">Sin facturas</td></tr>';
        return;
      }

      let html = '';
      snap.forEach(doc => {
        const data = doc.data();
        const paid = data.pagado || data.pagada || false;
        const badge = paid ? 'bg-success' : 'bg-warning';
        const status = paid ? 'Pagado' : 'Pendiente';
        const periodo = data.periodo || data.descripcion || data.created_at || 'Sin período';

        html += `
          <tr>
            <td>${periodo}</td>
            <td>${formatCurrency(data.monto || 0)}</td>
            <td><span class="badge ${badge}">${status}</span></td>
            <td>
              <button class="btn btn-sm btn-info" onclick="alert('Descarga en desarrollo')">
                <i class="bi bi-download"></i>
              </button>
            </td>
          </tr>
        `;
      });

      tbody.innerHTML = html;
    } catch (error) {
      console.error('❌ Error cargando facturas:', error);
      const tbody = document.getElementById('billingTable');
      if (tbody) {
        tbody.innerHTML = '<tr><td colspan="4" class="text-danger text-center py-4">Error cargando facturas</td></tr>';
      }
    }
  }

  showAPI() {
    const content = document.getElementById('clientContent');
    const apiKey = this.clientData.api_key || 'sk_' + generateId();

    content.innerHTML = `
      <div>
        <h2 class="mb-4">API Key</h2>

        <div class="alert alert-warning mb-4">
          <i class="bi bi-shield-exclamation"></i>
          Mantén tu API Key segura. No la compartas públicamente.
        </div>

        <div class="card" style="border: none; box-shadow: 0 2px 8px rgba(0,0,0,0.08);">
          <div class="card-body">
            <label class="form-label">Tu API Key:</label>
            <div class="input-group mb-3">
              <input type="password" class="form-control" id="apiKeyInput" value="${apiKey}" readonly>
              <button class="btn btn-outline-secondary" type="button" onclick="
                const input = document.getElementById('apiKeyInput');
                input.type = input.type === 'password' ? 'text' : 'password';
              ">
                <i class="bi bi-eye"></i>
              </button>
              <button class="btn btn-outline-primary" type="button" onclick="
                navigator.clipboard.writeText('${apiKey}');
                alert('¡Copiado!');
              ">
                <i class="bi bi-clipboard"></i> Copiar
              </button>
            </div>

            <p class="text-muted mb-0">
              Usa esta clave para autenticar tus integraciones.
            </p>
          </div>
        </div>
      </div>
    `;
  }
  /**
   * Abre el mapa en una ventana nueva con filtro de ciudad
   */
  openProjectMap() {
    if (!this.clientData || !this.clientData.nombre) {
      alert('Error: No se pudo obtener el nombre de la ciudad');
      return;
    }
    const clientId = this.clientData.id;
    const mapUrl = `/client/map.html?city=${encodeURIComponent(this.clientData.nombre)}&client=${encodeURIComponent(clientId)}`;
    window.open(mapUrl, 'proyectoMapa', 'width=1200,height=800,menubar=yes,toolbar=yes,status=yes');
  }
  abrirDenuncias() {
    const clienteId = this.clientData.id || this.clientData.nombre;
    const url = `/denuncias/?cliente=${encodeURIComponent(clienteId)}`;
    window.open(url, 'denunciasPanel', 'width=1100,height=800,menubar=yes,toolbar=yes');
  }

  async getAnswerWithRealData(question) {
    const q = question.toLowerCase();
    
    try {
      // Obtener referencia a Firestore del cliente
      const clientDb = this.clientDb || firebase.firestore();
      const clientId = this.clientData?.id || 'laplata';
      
      console.log(`🔍 Procesando pregunta: "${question}" para cliente: ${clientId}`);
      
      // Contar siniestros
      const siniestrosRef = clientDb.collection('clientes').doc(clientId).collection('siniestros');
      const siniestrosSnap = await siniestrosRef.get();
      const totalSiniestros = siniestrosSnap.size;
      
      // Contar cámaras públicas
      const camerasRef = clientDb.collection('clientes').doc(clientId).collection('cameras');
      const camerasSnap = await camerasRef.get();
      const totalCameraasPublicas = camerasSnap.size;
      
      // Contar cámaras privadas
      const camerasPrivRef = clientDb.collection('clientes').doc(clientId).collection('cameras_privadas');
      const camerasPrivSnap = await camerasPrivRef.get();
      const totalCameraasPrivadas = camerasPrivSnap.size;
      
      const totalCameras = totalCameraasPublicas + totalCameraasPrivadas;
      
      console.log(`📊 Datos cargados: ${totalSiniestros} siniestros, ${totalCameraasPublicas}+${totalCameraasPrivadas} cámaras`);
      
      let respuesta = {
        titulo: '📊 Resumen',
        contenido: 'No encontré respuesta específica'
      };
      
      // Procesar diferentes tipos de preguntas
      if (q.includes('resumen') || q.includes('eventos registrados')) {
        respuesta = {
          titulo: `📊 Resumen de Eventos - ${this.clientData?.nombre || 'Tu Municipio'}`,
          contenido: `
            <div style="line-height: 1.8;">
              <p><strong style="color: #dc2626;">🚨 Siniestros Registrados:</strong> <strong>${totalSiniestros}</strong></p>
              <p><strong style="color: #059669;">📹 Cámaras Públicas:</strong> <strong>${totalCameraasPublicas}</strong></p>
              <p><strong style="color: #d97706;">🔒 Cámaras Privadas:</strong> <strong>${totalCameraasPrivadas}</strong></p>
              <p><strong style="color: #2563eb;">📊 Total de Cámaras:</strong> <strong>${totalCameras}</strong></p>
              <hr style="margin: 12px 0; border: none; border-top: 1px solid #e5e7eb;">
              <p style="font-size: 12px; color: #6b7280; margin-top: 8px;">
                Datos actualizados desde Firebase. Última actualización: Ahora
              </p>
            </div>
          `
        };
      } else if (q.includes('zona') || q.includes('distribución') || q.includes('geográfica')) {
        // Agrupar por zona
        const zonas = {};
        siniestrosSnap.forEach(doc => {
          const barrio = doc.data().barrio || 'Sin clasificar';
          zonas[barrio] = (zonas[barrio] || 0) + 1;
        });
        
        const topZonas = Object.entries(zonas)
          .sort((a, b) => b[1] - a[1])
          .slice(0, 5);
        
        const zonasHTML = topZonas.map(([zona, count]) => 
          `<div style="display: flex; justify-content: space-between; padding: 8px; border-bottom: 1px solid #e5e7eb;">
            <span>${zona}</span>
            <strong style="color: #dc2626;">${count}</strong>
          </div>`
        ).join('');
        
        respuesta = {
          titulo: '🗺️ Distribución por Zona Geográfica',
          contenido: `
            <div>
              <p style="margin-bottom: 12px; font-size: 13px; color: #475569;">Top 5 zonas con más siniestros:</p>
              ${zonasHTML}
            </div>
          `
        };
      } else if (q.includes('cobertura') || q.includes('cámaras')) {
        const cobertura = totalSiniestros > 0 ? Math.round((totalCameras / totalSiniestros) * 100) : 0;
        respuesta = {
          titulo: '📹 Cobertura de Cámaras',
          contenido: `
            <div style="line-height: 1.8;">
              <p><strong>Ratio Cobertura:</strong></p>
              <div style="background: #f0f9ff; padding: 12px; border-radius: 6px; margin: 12px 0; text-align: center;">
                <div style="font-size: 24px; font-weight: bold; color: #0284c7;">${cobertura}%</div>
                <small style="color: #0c4a6e;">${totalCameras} cámaras / ${totalSiniestros} siniestros</small>
              </div>
              <p style="font-size: 12px; color: #475569; margin-top: 12px;">
                <strong>${totalCameraasPublicas}</strong> cámaras públicas activas<br>
                <strong>${totalCameraasPrivadas}</strong> cámaras privadas disponibles
              </p>
            </div>
          `
        };
      } else if (q.includes('tendencia') || q.includes('últimos') || q.includes('reciente')) {
        respuesta = {
          titulo: '📈 Últimos Registros',
          contenido: `
            <div>
              <p style="margin-bottom: 12px; font-size: 13px; color: #475569;">
                Se han registrado <strong style="color: #dc2626;">${totalSiniestros}</strong> siniestros<br>
                Cobertura con <strong style="color: #059669;">${totalCameras}</strong> cámaras
              </p>
              <div style="background: #fef2f2; padding: 12px; border-radius: 6px; border-left: 3px solid #dc2626;">
                <small style="color: #7f1d1d;">
                  Los datos se actualizan cada vez que carga un nuevo evento o cámara desde la solapa "Cargar Datos"
                </small>
              </div>
            </div>
          `
        };
      }
      
      console.log('✅ Respuesta generada:', respuesta);
      return respuesta;
      
    } catch (error) {
      console.error('❌ Error cargando datos:', error);
      return {
        titulo: '⚠️ Error',
        contenido: `<p style="color: #dc2626;">No pude cargar los datos. ${error.message}</p>`
      };
    }
  }
  
  showAnswerModal(respuesta) {
    // Crear modal
    const modal = document.createElement('div');
    modal.style.cssText = `
      position: fixed;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      background: white;
      border-radius: 12px;
      box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
      z-index: 2000;
      max-width: 500px;
      width: 90%;
      max-height: 80vh;
      overflow-y: auto;
      animation: popIn 0.3s ease-out;
    `;
    
    modal.innerHTML = `
      <div style="padding: 24px;">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px;">
          <h3 style="margin: 0; font-size: 16px; font-weight: 600; color: #1f2937;">${respuesta.titulo}</h3>
          <button onclick="this.closest('[data-modal]').remove()" style="
            background: none;
            border: none;
            font-size: 24px;
            cursor: pointer;
            color: #9ca3af;
          ">×</button>
        </div>
        
        <div style="color: #475569; font-size: 13px; line-height: 1.6;">
          ${respuesta.contenido}
        </div>
        
        <div style="margin-top: 20px; text-align: right;">
          <button onclick="this.closest('[data-modal]').remove()" style="
            padding: 8px 16px;
            background: #3b82f6;
            color: white;
            border: none;
            border-radius: 6px;
            cursor: pointer;
            font-size: 13px;
            font-weight: 500;
          ">Cerrar</button>
        </div>
      </div>
    `;
    
    modal.setAttribute('data-modal', 'true');
    
    // Agregar animación CSS si no existe
    if (!document.getElementById('modal-animation-style')) {
      const style = document.createElement('style');
      style.id = 'modal-animation-style';
      style.textContent = `
        @keyframes popIn {
          from { transform: translate(-50%, -50%) scale(0.9); opacity: 0; }
          to { transform: translate(-50%, -50%) scale(1); opacity: 1; }
        }
      `;
      document.head.appendChild(style);
    }
    
    // Agregar overlay
    const overlay = document.createElement('div');
    overlay.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: rgba(0, 0, 0, 0.5);
      z-index: 1999;
    `;
    overlay.onclick = () => {
      overlay.remove();
      modal.remove();
    };
    
    document.body.appendChild(overlay);
    document.body.appendChild(modal);
  }
}

// Instancia global
const clientDashboard = new ClientDashboard();

console.log("✅ ClientDashboard loaded");