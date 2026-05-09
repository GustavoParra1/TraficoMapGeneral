#!/usr/bin/env node
/**
 * Script para corregir URLs de acceso de clientes a la URL única
 * Ejecución: node fix-client-urls-final.js
 */

import admin from 'firebase-admin';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

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
const UNIQUE_CLIENT_URL = 'https://trafico-map-general-v2.web.app/client/';

async function fixClientURLs() {
  try {
    console.log('= '.repeat(50));
    console.log('🔧 CORRIGIENDO URLs DE ACCESO A URL ÚNICA');
    console.log('= '.repeat(50) + '\n');
    
    const snapshot = await db.collection('clientes').get();
    
    if (snapshot.empty) {
      console.log('❌ No se encontraron clientes');
      return;
    }
    
    console.log(`✅ Encontrados ${snapshot.size} clientes\n`);
    
    for (const doc of snapshot.docs) {
      const clientId = doc.id;
      const data = doc.data();
      
      console.log(`🔍 Cliente: ${data.nombre} (${clientId})`);
      
      const urlAnterior = data.url_acceso || '';
      
      console.log(`   URL anterior: ${urlAnterior}`);
      console.log(`   URL nueva:    ${UNIQUE_CLIENT_URL}`);
      
      try {
        await db.collection('clientes').doc(clientId).update({
          url_acceso: UNIQUE_CLIENT_URL
        });
        console.log(`   ✅ URL actualizada\n`);
      } catch (error) {
        console.log(`   ❌ Error: ${error.message}\n`);
      }
    }
    
    console.log('✅ COMPLETADO - Todas las URLs apuntan a la URL única');
    
  } catch (error) {
    console.error(`❌ Error: ${error.message}`);
    console.error(error);
  }
}

// Ejecutar
fixClientURLs().then(() => {
  console.log('\n' + '= '.repeat(50));
  process.exit(0);
}).catch(error => {
  console.error(error);
  process.exit(1);
});
