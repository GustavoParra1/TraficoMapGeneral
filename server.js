import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 5000;

// Servir archivos estáticos desde la carpeta "public"
app.use(express.static(path.join(__dirname, 'public')));

// Middleware para parsear JSON
app.use(express.json());

// Endpoint de prueba
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: 'TraficoMapGeneral server is running' });
});

// Cualquier otra ruta devuelve index.html (para SPA)
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Iniciar servidor
app.listen(PORT, () => {
  console.log(`✅ TraficoMapGeneral server listening on http://localhost:${PORT}`);
  console.log(`📂 Sirviendo archivos de: ${path.join(__dirname, 'public')}`);
});
