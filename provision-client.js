/**
 * PROVISION-CLIENT.js
 * 
 * Script para provisionar nuevos clientes en la arquitectura multi-tenant
 * 
 * USO (desde Node.js con Firebase Admin SDK):
 *   node provision-client.js
 * 
 * O desde Cloud Functions:
 *   Importar esta clase en tu función
 */

const admin = require('firebase-admin');
const readline = require('readline');

class ClientProvisioner {
  constructor(serviceAccountPath) {
    if (!admin.apps.length) {
      admin.initializeApp({
        credential: admin.credential.cert(require(serviceAccountPath))
      });
    }
    this.db = admin.firestore();
    this.auth = admin.auth();
  }

  /**
   * Provisionar un nuevo cliente completo
   */
  async provisionarCliente(clienteData) {
    try {
      console.log(`\n🚀 Iniciando provisión de cliente: ${clienteData.nombre}`);

      // 1. Validar datos
      if (!clienteData.id || !clienteData.nombre || !clienteData.ciudad || !clienteData.email) {
        throw new Error('Faltan datos requeridos: id, nombre, ciudad, email');
      }

      // 2. Verificar si cliente ya existe
      const existe = await this.db.collection('clientes').doc(clienteData.id).get();
      if (existe.exists) {
        console.warn(`⚠️ Cliente ${clienteData.id} ya existe`);
        return false;
      }

      // 3. Crear documento cliente
      await this.db.collection('clientes').doc(clienteData.id).set({
        id: clienteData.id,
        nombre: clienteData.nombre,
        ciudad: clienteData.ciudad,
        email: clienteData.email,
        telefono: clienteData.telefono || '',
        activo: true,
        createdAt: admin.firestore.Timestamp.now(),
        config: {
          lat: clienteData.lat || -34.9,
          lng: clienteData.lng || -57.5,
          zoom: clienteData.zoom || 12
        },
        stats: {
          camaras: 0,
          siniestros: 0,
          operadores: 0,
          patrullas: 0
        }
      });

      console.log(`✅ Documento cliente creado: ${clienteData.id}`);

      // 4. Crear subcollecciones vacías
      const collecciones = [
        'camaras',
        'siniestros',
        'semaforos',
        'robos',
        'escuelas',
        'operadores',
        'patrullas',
        'listas',
        'usuarios_clientes'
      ];

      for (const col of collecciones) {
        await this.db
          .collection('clientes')
          .doc(clienteData.id)
          .collection(col)
          .doc('_placeholder')
          .set({ _placeholder: true, createdAt: admin.firestore.Timestamp.now() });
        console.log(`  ✓ Subcollección ${col} lista`);
      }

      // 5. Crear usuario de ejemplo (opcional)
      if (clienteData.crearUsuario) {
        const usuarioData = {
          email: clienteData.emailUsuario || clienteData.email,
          password: clienteData.passwordUsuario || 'ChangeMe123!'
        };

        const usuario = await this.crearUsuarioCliente(
          usuarioData.email,
          usuarioData.password,
          clienteData.id
        );
        console.log(`✅ Usuario cliente creado: ${usuario.uid}`);
      }

      console.log(`\n✅ CLIENTE PROVISIONADO EXITOSAMENTE\n`);
      return true;
    } catch (error) {
      console.error(`❌ Error en provisión:`, error.message);
      throw error;
    }
  }

  /**
   * Crear usuario cliente con custom claims
   */
  async crearUsuarioCliente(email, password, clienteId) {
    try {
      // 1. Crear usuario en Auth
      const usuario = await this.auth.createUser({
        email: email,
        password: password,
        displayName: email.split('@')[0]
      });

      // 2. Setear custom claims
      await this.auth.setCustomUserClaims(usuario.uid, {
        clienteId: clienteId,
        rol: 'cliente'
      });

      // 3. Crear documento en usuarios collection
      await this.db.collection('usuarios').doc(usuario.uid).set({
        uid: usuario.uid,
        email: email,
        clienteId: clienteId,
        rol: 'cliente',
        nombre: email.split('@')[0],
        activo: true,
        createdAt: admin.firestore.Timestamp.now()
      });

      console.log(`✅ Usuario creado: ${email} (uid: ${usuario.uid})`);
      return usuario;
    } catch (error) {
      console.error(`❌ Error creando usuario:`, error.message);
      throw error;
    }
  }

  /**
   * Listar todos los clientes
   */
  async listarClientes() {
    try {
      const snap = await this.db.collection('clientes').get();
      console.log(`\n📋 Clientes registrados: ${snap.size}\n`);

      snap.forEach(doc => {
        const data = doc.data();
        console.log(`  • ${data.nombre} (${doc.id})`);
        console.log(`    Ciudad: ${data.ciudad}`);
        console.log(`    Email: ${data.email}`);
        console.log(`    Activo: ${data.activo ? 'Sí' : 'No'}\n`);
      });

      return snap.docs.map(d => ({ id: d.id, ...d.data() }));
    } catch (error) {
      console.error('❌ Error listando clientes:', error);
      return [];
    }
  }

  /**
   * Obtener stats de un cliente
   */
  async obtenerStats(clienteId) {
    try {
      const cliente = await this.db.collection('clientes').doc(clienteId).get();
      if (!cliente.exists) {
        throw new Error(`Cliente ${clienteId} no encontrado`);
      }

      const data = cliente.data();
      const collecciones = ['camaras', 'siniestros', 'operadores', 'patrullas'];
      const stats = {};

      for (const col of collecciones) {
        const snap = await this.db
          .collection('clientes')
          .doc(clienteId)
          .collection(col)
          .get();
        stats[col] = snap.size - 1; // Restar placeholder
      }

      console.log(`\n📊 Estadísticas de ${data.nombre}:\n`);
      console.log(`  Cámaras: ${Math.max(0, stats.camaras)}`);
      console.log(`  Siniestros: ${Math.max(0, stats.siniestros)}`);
      console.log(`  Operadores: ${Math.max(0, stats.operadores)}`);
      console.log(`  Patrullas: ${Math.max(0, stats.patrullas)}\n`);

      return stats;
    } catch (error) {
      console.error('❌ Error obteniendo stats:', error);
      return null;
    }
  }

  /**
   * Eliminar cliente (y sus datos)
   */
  async eliminarCliente(clienteId) {
    try {
      console.log(`\n🗑️  Eliminando cliente: ${clienteId}`);

      // Eliminar subcollecciones
      const collecciones = [
        'camaras',
        'siniestros',
        'semaforos',
        'robos',
        'escuelas',
        'operadores',
        'patrullas',
        'listas',
        'usuarios_clientes'
      ];

      for (const col of collecciones) {
        const snap = await this.db
          .collection('clientes')
          .doc(clienteId)
          .collection(col)
          .get();

        for (const doc of snap.docs) {
          await doc.ref.delete();
        }
        console.log(`  ✓ ${col} eliminado`);
      }

      // Eliminar documento cliente
      await this.db.collection('clientes').doc(clienteId).delete();
      console.log(`✅ Cliente eliminado\n`);

      return true;
    } catch (error) {
      console.error('❌ Error eliminando cliente:', error);
      return false;
    }
  }
}

// ====================================
// MODO INTERACTIVO (si se ejecuta directamente)
// ====================================
async function runInteractive() {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });

  const question = (query) => new Promise(resolve => rl.question(query, resolve));

  try {
    const serviceAccountPath = process.env.FIREBASE_KEY_PATH || './service-account-key.json';
    const provisioner = new ClientProvisioner(serviceAccountPath);

    console.log(`
╔═══════════════════════════════════════╗
║   PROVISIONER CLIENTE - TraficoMap   ║
╚═══════════════════════════════════════╝
`);

    const opcion = await question(`
Selecciona una opción:
1. Provisionar nuevo cliente
2. Listar clientes
3. Ver estadísticas
4. Eliminar cliente
5. Salir

Opción: `);

    switch (opcion.trim()) {
      case '1':
        const id = await question('ID del cliente (ej: laplata): ');
        const nombre = await question('Nombre del cliente: ');
        const ciudad = await question('Ciudad: ');
        const email = await question('Email: ');
        const telefono = await question('Teléfono (opcional): ');
        const crearUsuario = (await question('¿Crear usuario de prueba? (s/n): ')).toLowerCase() === 's';

        await provisioner.provisionarCliente({
          id: id.trim(),
          nombre: nombre.trim(),
          ciudad: ciudad.trim(),
          email: email.trim(),
          telefono: telefono.trim(),
          crearUsuario,
          emailUsuario: email.trim(),
          passwordUsuario: 'Demo123!' // Cambiar en producción
        });
        break;

      case '2':
        await provisioner.listarClientes();
        break;

      case '3':
        const clienteId = await question('ID del cliente: ');
        await provisioner.obtenerStats(clienteId.trim());
        break;

      case '4':
        const delId = await question('ID del cliente a eliminar: ');
        const confirmar = await question('¿Está seguro? (s/n): ');
        if (confirmar.toLowerCase() === 's') {
          await provisioner.eliminarCliente(delId.trim());
        }
        break;

      case '5':
        console.log('Adiós!');
        break;

      default:
        console.log('Opción inválida');
    }

    rl.close();
  } catch (error) {
    console.error('Error:', error);
    rl.close();
  }
}

// Ejecutar si es el script principal
if (require.main === module) {
  runInteractive().catch(console.error);
}

module.exports = ClientProvisioner;
