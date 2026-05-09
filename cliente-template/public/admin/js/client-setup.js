// admin/js/client-setup.js
// Herramienta para el admin: crear/resetear usuario cliente

class ClientSetup {
  static async setupClientUser(email, password) {
    try {
      console.log("🔐 Configurando usuario cliente...");

      // Verificar que es admin
      if (!adminAuth.user || !adminAuth.isAdmin) {
        throw new Error("Solo administradores pueden hacer esto");
      }

      // Crear usuario en Firebase Auth (lado cliente)
      const userCredential = await firebase.auth().createUserWithEmailAndPassword(email, password);
      const user = userCredential.user;
      console.log("✅ Usuario creado en Firebase Auth:", user.uid);

      // Buscar cliente por email
      const clientsRef = firebase.firestore().collection('clientes');
      const snap = await clientsRef.where('email', '==', email).get();

      if (snap.empty) {
        throw new Error("Cliente no encontrado. Asegúrate de crear el cliente primero.");
      }

      const clientDoc = snap.docs[0];
      const clienteId = clientDoc.id;
      const clienteData = clientDoc.data();

      // Crear entrada en usuarios_clientes
      await firebase.firestore().collection('usuarios_clientes').doc(user.uid).set({
        uid: user.uid,
        email: email,
        cliente_id: clienteId,
        role: 'client',
        created_at: new Date(),
        activo: true
      });

      // Actualizar cliente
      await clientsRef.doc(clienteId).update({
        usuario_uid: user.uid
      });

      console.log("✅ Usuario configurado exitosamente");

      return {
        uid: user.uid,
        email: email,
        cliente: clienteData.nombre,
        password: password
      };
    } catch (error) {
      console.error("❌ Error:", error);
      throw error;
    }
  }

  static showSetupForm() {
    const form = `
      <div class="card mt-4" style="border: none; box-shadow: 0 2px 8px rgba(0,0,0,0.08);">
        <div class="card-header bg-primary text-white">
          <h5 class="mb-0"><i class="bi bi-person-plus"></i> Configurar Acceso para Cliente</h5>
        </div>
        <div class="card-body">
          <form id="setupClientForm">
            <div class="mb-3">
              <label class="form-label">Email del Cliente *</label>
              <input type="email" class="form-control" id="setupEmail" required>
            </div>
            <div class="mb-3">
              <label class="form-label">Contraseña Temporal *</label>
              <input type="password" class="form-control" id="setupPassword" required>
            </div>
            <button type="submit" class="btn btn-primary">
              <i class="bi bi-check-circle"></i> Configurar Usuario
            </button>
          </form>
          <div id="setupResult" class="mt-3"></div>
        </div>
      </div>
    `;

    // Adjuntar al contenedor apropiado
    const container = document.getElementById('setupContainer');
    if (container) {
      container.innerHTML = form;
      this.attachFormEvents();
    }
  }

  static attachFormEvents() {
    const form = document.getElementById('setupClientForm');
    if (form) {
      form.addEventListener('submit', async (e) => {
        e.preventDefault();
        const email = document.getElementById('setupEmail').value;
        const password = document.getElementById('setupPassword').value;

        try {
          const result = await ClientSetup.setupClientUser(email, password);
          const resultDiv = document.getElementById('setupResult');
          resultDiv.innerHTML = `
            <div class="alert alert-success">
              <h5><i class="bi bi-check-circle"></i> ¡Éxito!</h5>
              <p class="mb-1"><strong>Email:</strong> ${result.email}</p>
              <p class="mb-1"><strong>Contraseña:</strong> <code>${result.password}</code></p>
              <p class="mb-0"><strong>Cliente:</strong> ${result.cliente}</p>
            </div>
          `;
          form.reset();
        } catch (error) {
          const resultDiv = document.getElementById('setupResult');
          resultDiv.innerHTML = `
            <div class="alert alert-danger">
              <i class="bi bi-exclamation-circle"></i> ${error.message}
            </div>
          `;
        }
      });
    }
  }
}

console.log("✅ ClientSetup loaded");
