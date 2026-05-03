/**
 * admin-setup.js
 * Lógica para crear ciudades automáticamente desde el panel administrativo
 */

let uploadedFile = null;

// Detectar si estamos en localhost o producción
function getApiUrl() {
    if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
        return `http://${window.location.host}/api/create-city`;
    }
    return '/api/create-city';
}

// Manejo de carga de archivos
function handleFileSelect(event) {
    const file = event.target.files[0];
    if (!file) return;

    uploadedFile = file;
    const fileStatus = document.getElementById('fileStatus');
    
    if (file.size > 10 * 1024 * 1024) {
        fileStatus.textContent = '⚠️ Archivo muy grande (máx. 10MB)';
        fileStatus.className = 'file-status error';
        uploadedFile = null;
        return;
    }

    fileStatus.textContent = `✅ ${file.name} (${(file.size / 1024).toFixed(1)}KB)`;
    fileStatus.className = 'file-status loaded';
}

// Leer archivo y procesarlo
async function processUploadedFile() {
    if (!uploadedFile) return null;

    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        
        reader.onload = function(e) {
            try {
                let data = null;
                const content = e.target.result;
                
                // Intentar parsear como JSON (GeoJSON)
                data = JSON.parse(content);
                resolve(data);
            } catch (err) {
                // Si no es JSON, intentar procesar como CSV
                try {
                    const csvData = parseCSV(content);
                    resolve({ csv: csvData });
                } catch (csvErr) {
                    reject(new Error('No se pudo procesar el archivo. Verifique que sea GeoJSON válido o CSV'));
                }
            }
        };
        
        reader.onerror = () => reject(new Error('Error al leer el archivo'));
        reader.readAsText(uploadedFile);
    });
}

// Parsear CSV simple
function parseCSV(content) {
    const lines = content.trim().split('\n');
    if (lines.length < 2) throw new Error('CSV vacío');
    
    const headers = lines[0].split(',').map(h => h.trim());
    const rows = [];
    
    for (let i = 1; i < lines.length; i++) {
        const obj = {};
        const values = lines[i].split(',');
        headers.forEach((h, idx) => {
            obj[h] = values[idx]?.trim() || '';
        });
        rows.push(obj);
    }
    
    return rows;
}

// Actualizar estado del progreso
function updateProgress(itemId, status, message = null) {
    const item = document.getElementById(itemId);
    if (!item) return;

    item.className = `progress-item ${status}`;
    
    const iconMap = {
        pending: '⏳',
        loading: `<span class="spinner"></span>`,
        done: '✅',
        error: '❌'
    };
    
    item.querySelector('.progress-icon').innerHTML = iconMap[status];
    
    if (message) {
        item.querySelector('span:last-child').textContent = message;
    }
}

// Enviar datos al servidor
async function submitForm(event) {
    event.preventDefault();

    const form = document.getElementById('cityForm');
    const submitBtn = document.getElementById('submitBtn');
    const progressContainer = document.getElementById('progressContainer');

    // Validar que el servidor está corriendo
    if (window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1') {
        showError('⚠️ Panel administrativo debe ejecutarse en http://localhost:5000', 
                  'Asegúrate de ejecutar: node server.js');
        return;
    }

    // Deshabilitar form y mostrar progreso
    submitBtn.disabled = true;
    progressContainer.style.display = 'block';

    try {
        // Procesar archivo si existe
        let geographicData = null;
        if (uploadedFile) {
            updateProgress('progress-city', 'loading', 'Procesando archivo geográfico...');
            geographicData = await processUploadedFile();
        }

        // Preparar datos para enviar al servidor
        const cityData = {
            cityName: document.getElementById('cityName').value,
            cityId: document.getElementById('cityId').value,
            province: document.getElementById('province').value,
            lat: parseFloat(document.getElementById('latitude').value),
            lng: parseFloat(document.getElementById('longitude').value),
            numPatrullas: parseInt(document.getElementById('numPatrullas').value),
            numOperadores: parseInt(document.getElementById('numOperadores').value),
            geographicData: geographicData
        };

        // 1. Crear ciudad
        updateProgress('progress-city', 'loading', 'Creando ciudad en base de datos...');
        
        const response = await fetch(getApiUrl(), {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(cityData)
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || `Error ${response.status}`);
        }

        const result = await response.json();

        // Actualizar estados de progreso
        updateProgress('progress-city', 'done', '✅ Ciudad creada');
        updateProgress('progress-users', 'done', '✅ Usuarios creados en Firebase Auth');
        updateProgress('progress-patrullas', 'done', '✅ Patrullas creadas en Firestore');
        updateProgress('progress-rules', 'done', '✅ Reglas de Firestore actualizadas');

        // Mostrar resultado exitoso
        showSuccessModal(cityData, result);

    } catch (error) {
        console.error('Error:', error);
        updateProgress('progress-city', 'error', `❌ ${error.message}`);
        showError('Error al crear la ciudad', error.message);
    } finally {
        submitBtn.disabled = false;
    }
}

// Mostrar modal de éxito
function showSuccessModal(cityData, credentials) {
    const modal = document.getElementById('resultModal');
    const resultIcon = document.getElementById('resultIcon');
    const resultTitle = document.getElementById('resultTitle');
    const resultMessage = document.getElementById('resultMessage');
    const credentialsContainer = document.getElementById('credentialsContainer');

    resultIcon.textContent = '🎉';
    resultTitle.textContent = `¡Ciudad "${cityData.cityName}" creada exitosamente!`;
    
    resultMessage.innerHTML = `
        <p><strong>Información importante:</strong></p>
        <p>✅ La ciudad está lista para usar.</p>
        <p>ℹ️ Accede a: <strong>https://trafico-map-general-v2.web.app</strong></p>
        <p style="color: #e74c3c; margin-top: 15px;"><strong>⚠️ Guarda estas credenciales en un lugar seguro</strong></p>
    `;

    // Mostrar credenciales de usuarios
    if (credentials.patrullas && credentials.operadores) {
        let credentialsHTML = '<div class="credentials-table">';
        
        // Patrullas
        if (credentials.patrullas.length > 0) {
            credentialsHTML += '<div class="credentials-row"><div class="credentials-label" style="font-weight: 700;">PATRULLAS 🚓</div><div class="credentials-label"></div></div>';
            
            credentials.patrullas.forEach((p, idx) => {
                credentialsHTML += `
                    <div class="credentials-row">
                        <div class="credentials-label">Patrulla ${idx + 1}:</div>
                        <div class="credentials-value">
                            <div>📧 ${p.email}</div>
                            <div>🔑 ${p.password}</div>
                        </div>
                    </div>
                `;
            });
        }

        // Operadores
        if (credentials.operadores && credentials.operadores.length > 0) {
            credentialsHTML += '<div class="credentials-row"><div class="credentials-label" style="font-weight: 700;">OPERADORES 👨‍💼</div><div class="credentials-label"></div></div>';
            
            credentials.operadores.forEach((o, idx) => {
                credentialsHTML += `
                    <div class="credentials-row">
                        <div class="credentials-label">Operador ${idx + 1}:</div>
                        <div class="credentials-value">
                            <div>📧 ${o.email}</div>
                            <div>🔑 ${o.password}</div>
                        </div>
                    </div>
                `;
            });
        }

        credentialsHTML += '</div>';

        // Botón para descargar CSV
        const csvContent = generateCredentialsCSV(credentials);
        credentialsHTML += `
            <button class="copy-btn" style="width: 100%; margin-top: 15px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); height: auto; padding: 12px;" 
                    onclick="downloadCredentialsCSV('${cityData.cityId}', \`${csvContent}\`)">
                📥 Descargar Credenciales (CSV)
            </button>
        `;

        credentialsContainer.innerHTML = credentialsHTML;
    }

    modal.classList.add('show');
}

// Generar CSV de credenciales
function generateCredentialsCSV(credentials) {
    let csv = 'Tipo,Usuario,Email,Contraseña\n';
    
    if (credentials.patrullas) {
        credentials.patrullas.forEach((p, idx) => {
            csv += `Patrulla ${idx + 1},Patrulla ${idx + 1},${p.email},${p.password}\n`;
        });
    }
    
    if (credentials.operadores) {
        credentials.operadores.forEach((o, idx) => {
            csv += `Operador ${idx + 1},Operador ${idx + 1},${o.email},${o.password}\n`;
        });
    }
    
    return csv;
}

// Descargar CSV
function downloadCredentialsCSV(cityId, csvContent) {
    const element = document.createElement('a');
    element.setAttribute('href', 'data:text/csv;charset=utf-8,' + encodeURIComponent(csvContent));
    element.setAttribute('download', `credenciales-${cityId}.csv`);
    element.style.display = 'none';
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
}

// Mostrar error
function showError(title, message) {
    const modal = document.getElementById('resultModal');
    const resultIcon = document.getElementById('resultIcon');
    const resultTitle = document.getElementById('resultTitle');
    const resultMessage = document.getElementById('resultMessage');
    const credentialsContainer = document.getElementById('credentialsContainer');

    resultIcon.textContent = '❌';
    resultTitle.textContent = title;
    resultMessage.innerHTML = `<p style="color: #c0392b;">${message}</p>`;
    credentialsContainer.innerHTML = '';

    modal.classList.add('show');
}

// Cerrar modal de resultado
function closeResultModal() {
    const modal = document.getElementById('resultModal');
    modal.classList.remove('show');
    
    // Limpiar formulario
    document.getElementById('cityForm').reset();
    uploadedFile = null;
    document.getElementById('fileStatus').textContent = 'Ningún archivo seleccionado';
    document.getElementById('progressContainer').style.display = 'none';
}

// Event listeners
document.getElementById('cityForm').addEventListener('submit', submitForm);

// Permitir drag & drop de archivos
document.addEventListener('dragover', (e) => {
    e.preventDefault();
    e.stopPropagation();
});

document.addEventListener('drop', (e) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (e.dataTransfer.files.length > 0) {
        const input = document.getElementById('geoFile');
        input.files = e.dataTransfer.files;
        handleFileSelect({ target: input });
    }
});

// Validación de ID de ciudad (sin espacios, solo guiones)
document.getElementById('cityId').addEventListener('input', (e) => {
    e.target.value = e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '');
});

console.log('%c✅ Admin Setup Panel Cargado', 'color: #27ae60; font-size: 14px; font-weight: bold;');
console.log('%c📝 Este formulario creará automáticamente:', 'color: #667eea; font-size: 12px;');
console.log('   ✅ Ciudad en cities-config.json');
console.log('   ✅ Usuarios en Firebase Auth');
console.log('   ✅ Patrullas en Firestore');
console.log('   ✅ Reglas de Firestore actualizadas');
console.log('%c⚠️ Requisito: Node.js server debe estar corriendo (node server.js)', 'color: #e74c3c; font-size: 12px;');
