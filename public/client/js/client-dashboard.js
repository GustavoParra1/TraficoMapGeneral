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

    // Adjuntar eventos
    this.attachUploadEvents();
    this.attachHelpEvents();
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
      // Buscar facturas del cliente
      const billingRef = firebase.firestore().collection('billing');
      const snap = await billingRef.where('cliente_id', '==', this.clientData.id).get();
      
      const tbody = document.getElementById('billingTable');
      
      if (snap.empty) {
        tbody.innerHTML = '<tr><td colspan="4" class="text-center text-muted py-4">Sin facturas</td></tr>';
        return;
      }
      
      let html = '';
      snap.forEach(doc => {
        const data = doc.data();
        const badge = data.pagado ? 'bg-success' : 'bg-warning';
        const status = data.pagado ? 'Pagado' : 'Pendiente';
        
        html += `
          <tr>
            <td>${data.periodo}</td>
            <td>${formatCurrency(data.monto)}</td>
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
      console.error("❌ Error:", error);
      document.getElementById('billingTable').innerHTML = 
        '<tr><td colspan="4" class="text-danger">Error cargando facturas</td></tr>';
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
                document.getElementById('apiKeyInput').type = 
                  document.getElementById('apiKeyInput').type === 'password' ? 'text' : 'password';
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
          </div>
        </div>

        <div class="card mt-4" style="border: none; box-shadow: 0 2px 8px rgba(0,0,0,0.08);">
          <div class="card-header" style="background: #f9f9f9; border: none;">
            <h5 class="mb-0">Ejemplo de Uso</h5>
          </div>
          <div class="card-body">
            <pre><code>curl https://api.trafico-map.com/v1/cameras \\
  -H "Authorization: Bearer ${apiKey}"</code></pre>
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
}

// Instancia global
const clientDashboard = new ClientDashboard();
console.log("✅ ClientDashboard loaded");
