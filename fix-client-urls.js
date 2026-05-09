#!/usr/bin/env node
/**
 * Script para corregir URLs de acceso de clientes
 * Ejecución: node fix-client-urls.js
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

function normalizarNombreMapa(nombre) {
  // Normalizar el nombre: convertir a minúsculas, reemplazar espacios por guiones
  return nombre
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '-')
    .replace(/á/g, 'a')
    .replace(/é/g, 'e')
    .replace(/í/g, 'i')
    .replace(/ó/g, 'o')
    .replace(/ú/g, 'u');
}

async function fixClientURLs() {
  try {
    console.log('= '.repeat(50));
    console.log('🔧 CORRIGIENDO URLs DE ACCESO DE CLIENTES');
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
      
      const urlNombreAnterior = data.url_acceso || '';
      const urlNombre = normalizarNombreMapa(data.nombre);
      const url_acceso_nueva = `https://cliente-${urlNombre}.web.app/client/`;
      
      console.log(`   URL anterior: ${urlNombreAnterior}`);
      console.log(`   URL nueva:    ${url_acceso_nueva}`);
      
      try {
        await db.collection('clientes').doc(clientId).update({
          url_acceso: url_acceso_nueva
        });
        console.log(`   ✅ URL actualizada\n`);
      } catch (error) {
        console.log(`   ❌ Error: ${error.message}\n`);
      }
    }
    
    console.log('✅ COMPLETADO - Todas las URLs han sido actualizadas');
    
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
