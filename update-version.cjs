// update-version.js
// Actualiza el parametro ?v=... de TODOS los <script src="..."> en un HTML
// a un timestamp nuevo, para forzar cache-busting en cada deploy.
//
// Uso (desde CMD, parado en la carpeta del proyecto):
//   node update-version.js public\map.html
//
// (Ajusta la ruta si tu map.html esta en otra carpeta)

const fs = require('fs');

const filePath = process.argv[2];

if (!filePath) {
  console.error('Uso: node update-version.js ruta\\al\\map.html');
  process.exit(1);
}

if (!fs.existsSync(filePath)) {
  console.error('No se encontro el archivo: ' + filePath);
  process.exit(1);
}

let content = fs.readFileSync(filePath, 'utf8');

// Genera timestamp tipo AAAAMMDDHHmm
const now = new Date();
const pad = (n) => String(n).padStart(2, '0');
const newVer =
  now.getFullYear().toString() +
  pad(now.getMonth() + 1) +
  pad(now.getDate()) +
  pad(now.getHours()) +
  pad(now.getMinutes());

const matches = content.match(/\?v=\d+/g) || [];
const count = matches.length;

content = content.replace(/\?v=\d+/g, '?v=' + newVer);

fs.writeFileSync(filePath, content, 'utf8');

console.log('Listo. Se actualizaron ' + count + ' scripts a la version: ' + newVer);
console.log('Archivo modificado: ' + filePath);
