#!/usr/bin/env node
/**
 * Script para guardar credenciales de clientes en Firestore
 * Ejecución: node store-client-credentials.js
 */

import admin from 'firebase-admin';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Inicializar Firebase
try {
  admin.initializeApp({
    projectId: 'trafico-map-general-v2'
  });
} catch (e) {
  // Ya inicializado
}

const db = admin.firestore();

async function storeClientCredentials(clientId, email, password, clientNombre) {
  try {
    console.log(`📝 Guardando credenciales para ${clientId}...`);
    
    // Extraer nombre normalizado del cliente para la URL
    let urlNombre = clientId;
    
    // Si tenemos el nombre del cliente, usamos una versión simplificada
    if (clientNombre) {
      // Normalizar el nombre: convertir a minúsculas, reemplazar espacios por guiones
      urlNombre = clientNombre
        .toLowerCase()
        .trim()
        .replace(/\s+/g, '-')
        .replace(/á/g, 'a')
        .replace(/é/g, 'e')
        .replace(/í/g, 'i')
        .replace(/ó/g, 'o')
        .replace(/ú/g, 'u');
    }
    
    const url_acceso = `https://cliente-${urlNombre}.web.app/client/`;
    
    await db.collection('clientes').doc(clientId).update({
      email_admin: email,
      contraseña: password,
      password_plain: password,
      url_acceso: url_acceso,
      credenciales_actualizadas: new Date()
    });
    
    console.log(`✅ Credenciales guardadas`);
    console.log(`   Email: ${email}`);
    console.log(`   Contraseña: ${password}`);
    console.log(`   URL: ${url_acceso}\n`);
    return true;
  } catch (error) {
    console.error(`❌ Error: ${error.message}`);
    return false;
  }
}

async function getAllClientsAndUpdate() {
  try {
    console.log('\n📋 Obteniendo todos los clientes...\n');
    
    const snapshot = await db.collection('clientes').get();
    
    if (snapshot.empty) {
      console.log('❌ No se encontraron clientes');
      return;
    }
    
    console.log(`✅ Encontrados ${snapshot.size} clientes\n`);
    
    let updated = 0;
    for (const doc of snapshot.docs) {
      const clientId = doc.id;
      const data = doc.data();
      
      console.log(`🔍 Cliente: ${data.nombre} (${clientId})`);
      
      // Verificar si ya tiene credenciales
      if (data.email_admin && data.contraseña) {
        console.log(`   ✅ Ya tiene credenciales`);
        console.log(`   Email: ${data.email_admin}`);
        console.log(`   Contraseña: ${data.contraseña}`);
        console.log(`   URL: ${data.url_acceso}\n`);
      } else {
        const email = data.email || `admin@${clientId}.local`;
        const password = `Temporal${clientId}2024!`;
        
        if (await storeClientCredentials(clientId, email, password, data.nombre)) {
          updated++;
        }
      }
    }
    
    console.log(`\n✅ COMPLETADO - ${updated} clientes actualizados`);
    
  } catch (error) {
    console.error(`❌ Error: ${error.message}`);
    console.error(error);
  }
}

// Ejecutar
console.log('= '.repeat(40));
console.log('📋 ALMACENANDO CREDENCIALES DE CLIENTES');
console.log('= '.repeat(40));

getAllClientsAndUpdate().then(() => {
  console.log('\n= '.repeat(40));
  process.exit(0);
}).catch(error => {
  console.error(error);
  process.exit(1);
});
