import admin from 'firebase-admin';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function run() {
  try {
    const configPath = path.join(__dirname, 'public', 'config.json');
    const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
    console.log('Config loaded for project:', config.firebase.projectId);

    const saPath = path.join(__dirname, 'serviceAccountKey.json');
    const serviceAccount = JSON.parse(fs.readFileSync(saPath, 'utf8'));
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount)
    });
    const db = admin.firestore();
    const auth = admin.auth();

    const email = 'patrulla_070@seguridad.com';

    try {
      const user = await auth.getUserByEmail(email);
      await auth.deleteUser(user.uid);
      console.log('Successfully deleted auth user:', email);
    } catch (error) {
      if (error.code === 'auth/user-not-found') {
        console.log('Auth user not found:', email);
      } else {
        console.error('Error deleting auth user:', error.message);
      }
    }

    const docPaths = [
      'clientes/laplata/patrullas/PATRULLA_PATRULLA_070',
      'clientes/laplata/patrullas/PATRULLA_070'
    ];

    for (const docPath of docPaths) {
      try {
        await db.doc(docPath).delete();
        console.log('Deleted (or confirmed absence of) document:', docPath);
      } catch (error) {
        console.error('Error deleting document', docPath, ':', error.message);
      }
    }

  } catch (error) {
    console.error('Initialization error:', error.message);
  }
}

run();
