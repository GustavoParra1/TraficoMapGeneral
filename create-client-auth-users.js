#!/usr/bin/env node
/**
 * Script para crear usuarios en Firebase Auth para cada cliente
 * Ejecución: node create-client-auth-users.js
 */

import admin from 'firebase-admin';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { readFileSync } from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Cargar credenciales de Firebase
const serviceAccountPath = join(__dirname, 'serviceAccountKey.json');
const serviceAccount = JSON.parse(readFileSync(serviceAccountPath, 'utf-8'));

// Inicializar Firebase con credenciales explícitas
try {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    projectId: 'trafico-map-general-v2'
  });
} catch (e) {
  // Ya inicializado
}

const db = admin.firestore();
const auth = admin.auth();

async function createClientAuthUsers() {
  try {
    console.log('= '.repeat(50));
    console.log('👤 CREANDO USUARIOS EN FIREBASE AUTH PARA CLIENTES');
    console.log('= '.repeat(50) + '\n');
    
    const snapshot = await db.collection('clientes').get();
    
    if (snapshot.empty) {
      console.log('❌ No se encontraron clientes');
      return;
    }
    
    console.log(`✅ Encontrados ${snapshot.size} clientes\n`);
    
    let created = 0;
    let failed = 0;
    
    for (const doc of snapshot.docs) {
      const clientId = doc.id;
      const data = doc.data();
      
      const email = data.email_admin || data.email || `${clientId}@trafico-map.local`;
      const password = data.contraseña || data.password || `Temporal${clientId}2024!`;
      
      console.log(`🔍 Cliente: ${data.nombre} (${clientId})`);
      console.log(`   Email: ${email}`);
      
      try {
        // Verificar si el usuario ya existe
        let user;
        try {
          user = await auth.getUserByEmail(email);
          console.log(`   ⚠️  Usuario ya existe en Auth`);
        } catch (error) {
          if (error.code === 'auth/user-not-found') {
            // Crear el usuario
            user = await auth.createUser({
              email: email,
              password: password,
              displayName: data.nombre,
              disabled: false
            });
            console.log(`   ✅ Usuario creado en Firebase Auth`);
            created++;
          } else {
            throw error;
          }
        }
        
        // Agregar custom claims
        await auth.setCustomUserClaims(user.uid, {
          role: 'cliente',
          clienteId: clientId,
          nombre: data.nombre
        });
        console.log(`   ✅ Custom claims agregados\n`);
        
      } catch (error) {
        console.log(`   ❌ Error: ${error.message}\n`);
        failed++;
      }
    }
    
    console.log(`\n✅ COMPLETADO`);
    console.log(`   - ${created} usuarios creados`);
    console.log(`   - ${failed} errores`);
    
  } catch (error) {
    console.error(`❌ Error: ${error.message}`);
    console.error(error);
  }
}

// Ejecutar
createClientAuthUsers().then(() => {
  console.log('\n' + '= '.repeat(50));
  process.exit(0);
}).catch(error => {
  console.error(error);
  process.exit(1);
});
