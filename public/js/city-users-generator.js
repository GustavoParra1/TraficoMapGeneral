/**
 * MÓDULO DE GENERACIÓN DE USUARIOS Y CREDENCIALES PARA CIUDADES
 * Genera automáticamente usuarios de patrullas y operadores al crear una ciudad
 */

const CityUsersGenerator = (() => {
  
  // Generar contraseña segura
  const generateSecurePassword = () => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%';
    let password = '';
    for (let i = 0; i < 12; i++) {
      password += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return password;
  };

  // Generar usuarios locales (sin crear en Firebase aún)
  const generateUsersLocally = async (cityId, patrullasCount, operadoresCount) => {
    const users = [];

    // Generar patrullas
    for (let i = 1; i <= patrullasCount; i++) {
      const email = `patrulla-${cityId}-${String(i).padStart(2, '0')}@seguridad.com`;
      const password = generateSecurePassword();
      users.push({
        rol: 'Patrulla',
        email,
        password,
        municipio: cityId,
        numero: String(i).padStart(2, '0')
      });
    }

    // Generar operadores
    for (let i = 1; i <= operadoresCount; i++) {
      const email = `operador-${cityId}-${String(i).padStart(2, '0')}@seguridad.com`;
      const password = generateSecurePassword();
      users.push({
        rol: 'Operador (Centro Control)',
        email,
        password,
        municipio: cityId,
        numero: String(i).padStart(2, '0')
      });
    }

    return users;
  };

  // Crear usuarios en Firebase
  const createUsersInFirebase = async (users) => {
    const createdUsers = [];
    const errors = [];

    for (const user of users) {
      try {
        // Crear usuario en Firebase Auth
        const userCredential = await firebase.auth().createUserWithEmailAndPassword(user.email, user.password);
        
        // Guardar datos adicionales en Firestore
        await db.collection('users').doc(userCredential.user.uid).set({
          email: user.email,
          rol: user.rol === 'Patrulla' ? 'patrulla' : 'operador',
          municipio: user.municipio,
          numero: user.numero,
          createdAt: new Date(),
          active: true
        });

        createdUsers.push({
          ...user,
          uid: userCredential.user.uid,
          status: 'Creado ✓'
        });
      } catch (error) {
        errors.push({
          email: user.email,
          error: error.message
        });
        createdUsers.push({
          ...user,
          status: `Error: ${error.message}`
        });
      }
    }

    return { createdUsers, errors };
  };

  // Mostrar modal con credenciales
  const showCredentialsModal = (users, cityName) => {
    const modalHtml = `
      <div id="credentials-modal" style="
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background: rgba(0,0,0,0.7);
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 99999;
      ">
        <div style="
          background: white;
          border-radius: 8px;
          max-width: 900px;
          width: 95%;
          max-height: 85vh;
          overflow-y: auto;
          box-shadow: 0 10px 40px rgba(0,0,0,0.3);
          padding: 30px;
        ">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px;">
            <h2 style="margin: 0; color: #333;">📋 Credenciales Generadas - ${cityName}</h2>
            <button onclick="document.getElementById('credentials-modal').remove()" style="
              background: none;
              border: none;
              font-size: 28px;
              cursor: pointer;
              color: #999;
            ">✕</button>
          </div>

          <p style="color: #666; margin-bottom: 20px;">
            ✅ Se han creado ${users.length} usuarios automáticamente. Copia o descarga las credenciales:
          </p>

          <table style="
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 20px;
            font-size: 13px;
          ">
            <thead>
              <tr style="background: #0066ff; color: white;">
                <th style="padding: 12px; text-align: left; border: 1px solid #ddd;">Rol</th>
                <th style="padding: 12px; text-align: left; border: 1px solid #ddd;">Email</th>
                <th style="padding: 12px; text-align: left; border: 1px solid #ddd;">Contraseña</th>
              </tr>
            </thead>
            <tbody id="credentials-table-body">
              ${users.map((user, idx) => `
                <tr style="background: ${idx % 2 === 0 ? '#f9f9f9' : 'white'};">
                  <td style="padding: 12px; border: 1px solid #ddd; font-weight: bold;">${user.rol}</td>
                  <td style="padding: 12px; border: 1px solid #ddd; font-family: monospace;">${user.email}</td>
                  <td style="padding: 12px; border: 1px solid #ddd; font-family: monospace; font-weight: bold;">${user.password}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>

          <div style="display: flex; gap: 10px; margin-bottom: 20px;">
            <button id="copy-credentials-btn" style="
              padding: 12px 20px;
              background: #0066ff;
              color: white;
              border: none;
              border-radius: 6px;
              cursor: pointer;
              font-size: 14px;
              font-weight: 600;
            ">📋 Copiar Todo</button>

            <button id="download-credentials-btn" style="
              padding: 12px 20px;
              background: #28a745;
              color: white;
              border: none;
              border-radius: 6px;
              cursor: pointer;
              font-size: 14px;
              font-weight: 600;
            ">📥 Descargar CSV</button>

            <button id="close-credentials-btn" style="
              padding: 12px 20px;
              background: #999;
              color: white;
              border: none;
              border-radius: 6px;
              cursor: pointer;
              font-size: 14px;
              font-weight: 600;
              margin-left: auto;
            ">Listo</button>
          </div>

          <div style="
            background: #e3f2fd;
            border-left: 4px solid #1976d2;
            padding: 15px;
            border-radius: 4px;
            font-size: 13px;
            color: #0d47a1;
          ">
            ℹ️ <strong>Importante:</strong> Estos usuarios ya pueden acceder a la app de patrullas y al centro de control.
            Guarda estas credenciales en un lugar seguro.
          </div>
        </div>
      </div>
    `;

    // Insertar modal
    document.body.insertAdjacentHTML('beforeend', modalHtml);

    // Event listeners
    document.getElementById('copy-credentials-btn').addEventListener('click', () => {
      const text = users.map(u => `${u.rol}\t${u.email}\t${u.password}`).join('\n');
      navigator.clipboard.writeText(text).then(() => {
        alert('✅ Credenciales copiadas al portapapeles');
      });
    });

    document.getElementById('download-credentials-btn').addEventListener('click', () => {
      const csv = 'Rol,Email,Contraseña\n' + 
                  users.map(u => `"${u.rol}","${u.email}","${u.password}"`).join('\n');
      
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = `credenciales_${users[0]?.municipio || 'ciudad'}.csv`;
      link.click();
    });

    document.getElementById('close-credentials-btn').addEventListener('click', () => {
      document.getElementById('credentials-modal').remove();
    });
  };

  // Mostrar formulario para cantidad de patrullas y operadores
  const showCityUsersForm = (cityName, cityId) => {
    return new Promise((resolve) => {
      const formHtml = `
        <div id="users-form-modal" style="
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(0,0,0,0.7);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 99999;
        ">
          <div style="
            background: white;
            border-radius: 8px;
            max-width: 500px;
            width: 90%;
            box-shadow: 0 10px 40px rgba(0,0,0,0.3);
            padding: 30px;
          ">
            <h2 style="margin: 0 0 10px 0; color: #333;">🚔 Configurar Patrullas y Operadores</h2>
            <p style="color: #666; margin-bottom: 20px;">Para: <strong>${cityName}</strong></p>

            <div style="margin-bottom: 20px;">
              <label style="display: block; margin-bottom: 8px; color: #333; font-weight: 600;">
                ¿Cuántas patrullas quieres crear?
              </label>
              <input type="number" id="patrullas-count" min="1" max="20" value="3" style="
                width: 100%;
                padding: 10px;
                border: 1px solid #999;
                border-radius: 4px;
                font-size: 14px;
              ">
            </div>

            <div style="margin-bottom: 20px;">
              <label style="display: block; margin-bottom: 8px; color: #333; font-weight: 600;">
                ¿Cuántos operadores quieres crear?
              </label>
              <input type="number" id="operadores-count" min="1" max="10" value="2" style="
                width: 100%;
                padding: 10px;
                border: 1px solid #999;
                border-radius: 4px;
                font-size: 14px;
              ">
            </div>

            <div style="display: flex; gap: 10px;">
              <button id="generate-users-btn" style="
                flex: 1;
                padding: 12px;
                background: #0066ff;
                color: white;
                border: none;
                border-radius: 6px;
                cursor: pointer;
                font-size: 14px;
                font-weight: 600;
              ">✅ Generar Usuarios</button>

              <button id="skip-users-btn" style="
                flex: 1;
                padding: 12px;
                background: #999;
                color: white;
                border: none;
                border-radius: 6px;
                cursor: pointer;
                font-size: 14px;
                font-weight: 600;
              ">Omitir</button>
            </div>
          </div>
        </div>
      `;

      document.body.insertAdjacentHTML('beforeend', formHtml);

      document.getElementById('generate-users-btn').addEventListener('click', async () => {
        const patrullasCount = parseInt(document.getElementById('patrullas-count').value);
        const operadoresCount = parseInt(document.getElementById('operadores-count').value);
        
        document.getElementById('users-form-modal').remove();
        resolve({ patrullasCount, operadoresCount, generate: true });
      });

      document.getElementById('skip-users-btn').addEventListener('click', () => {
        document.getElementById('users-form-modal').remove();
        resolve({ patrullasCount: 0, operadoresCount: 0, generate: false });
      });
    });
  };

  return {
    generateUsersLocally,
    createUsersInFirebase,
    showCredentialsModal,
    showCityUsersForm
  };
})();
