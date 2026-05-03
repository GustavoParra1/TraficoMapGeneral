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
