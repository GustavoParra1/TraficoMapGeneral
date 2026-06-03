#!/usr/bin/env node
import admin from 'firebase-admin';

// Usar credenciales que ya están configuradas en aplicación default
admin.initializeApp({
  projectId: 'trafico-map-general-v2'
});

const auth = admin.auth();
const uid = 'xHY1LavVmPNScIudtmeC09C21YJ3';

async function updatePatrulla() {
  try {
    console.log('🔄 Actualizando patrulla_090...');
    const user = await auth.updateUser(uid, {
      displayName: 'PATRULLA_090',
      password: '3am6cw0g'
    });
    
    console.log('✅ Usuario actualizado:');
    console.log('   Email:', user.email);
    console.log('   DisplayName:', user.displayName);
    console.log('   UID:', user.uid);
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

updatePatrulla();
