# 🏗️ ARQUITECTURA FASE 2: VERSIÓN CLIENTE
**Preparar código para ser distribuido a clientes**

---

## 📊 VISIÓN GENERAL

### Estado Actual (Fase 1 - DEMO):
```
https://trafico-map-general-v2.web.app/
├── Tu Firebase: trafico-map-general-v2
├── Datos: Mar del Plata (DEMO)
├── Patrullas: En vivo
├── Chat: Funcionando
└── Acceso: Público (para demostración)
```

### Objetivo Fase 2:
```
Crear versión "cliente" que:
✅ Sea independiente de tu Firebase
✅ Se conecte a Firebase del cliente
✅ Verifique suscripción en login
✅ Descentralice datos
✅ Mantenga 100% funcionalidad
```

---

## 📁 ESTRUCTURA FINAL DESPUÉS DE FASE 2

```
TraficoMapGeneral/
│
├── public/                                (DEMO - Tu mapa general)
│   ├── index.html                        (Muestra selector ciudades)
│   ├── js/
│   │   ├── app.js                        (currentCity = 'mar-del-plata')
│   │   ├── patrulla-layer.js
│   │   ├── colectivos-layer.js
│   │   └── ... (todos tus módulos)
│   ├── data/
│   │   ├── cities-config.json            (SOLO Mar del Plata y Córdoba)
│   │   ├── barrios.json
│   │   └── ...
│   └── firestore.rules                   (Rules para Demo)
│
├── cliente-template/                     (TEMPLATE PARA CLIENTES)
│   ├── index.html                        (Sin selector de ciudades)
│   ├── js/
│   │   ├── app.js                        (currentCity hardcodeado)
│   │   ├── verificar-suscripcion.js      (⭐ NUEVO)
│   │   ├── patrulla-layer.js             (idéntico)
│   │   └── ... (copias de módulos)
│   ├── data/
│   │   ├── cities-config.json            (Template genérico)
│   │   ├── barrios-template.json         (Ej. Mar del Plata)
│   │   └── ...
│   ├── config-template.json              (⭐ NUEVO - Credenciales)
│   └── firestore.rules                   (Rules genéricas)
│
├── admin-panel/                          (PANEL PARA TI)
│   ├── index.html
│   ├── js/
│   │   ├── gestionar-clientes.js         (⭐ NUEVO)
│   │   ├── auth-admin.js                 (⭐ NUEVO)
│   │   └── estadisticas.js               (⭐ NUEVO)
│   └── admin-style.css
│
├── scripts/                              (AUTOMATIZACIÓN)
│   ├── crear-cliente.sh                  (⭐ NUEVO)
│   ├── suspender-cliente.sh              (⭐ NUEVO)
│   └── exportar-datos.sh                 (⭐ NUEVO)
│
└── docs/
    ├── ARQUITECTURA_FASE_2.md            (⭐ Este archivo)
    ├── CAMBIOS_ARCHIVOS.md               (⭐ NUEVO)
    ├── GUIA_IMPLEMENTACION.md            (⭐ NUEVO)
    └── README_CLIENTE.md                 (⭐ NUEVO)
```

---

## 🔄 ARCHIVOS QUE CAMBIAN

### Categoría 1: NECESITA ADAPTACIÓN (80%)

| Archivo | Cambio | Razón |
|---------|--------|-------|
| `app.js` | Línea 83: `currentCity` hardcodeado | Cliente solo ve su ciudad |
| `index.html` | Quitar selector de ciudades | Cliente no elige |
| `firestore.rules` | Patrón genérico: `/patrullas/{id}` | Funciona en cualquier Firebase |
| `cities-config.json` | Template genérico | Cliente carga sus datos |
| `verificar-suscripcion.js` | ⭐ CREAR NUEVO | Chequea con tu Firebase |

### Categoría 2: MANTIENE IGUAL (20%)

| Archivo | Estado | Razón |
|---------|--------|-------|
| `patrulla-layer.js` | SIN CAMBIOS | Código agnóstico |
| `colectivos-layer.js` | SIN CAMBIOS | Código agnóstico |
| `camaras-layer.js` | SIN CAMBIOS | Código agnóstico |
| `siniestros-layer.js` | SIN CAMBIOS | Código agnóstico |
| `chat-system.js` | SIN CAMBIOS | Código agnóstico |

---

## 🔧 CAMBIOS CONCRETOS NECESARIOS

### CAMBIO 1: app.js (Línea 83)

**ANTES (Demo):**
```javascript
let currentCity = 'mar-del-plata'; // Seleccionable por usuario
```

**DESPUÉS (Cliente):**
```javascript
// Obtener ciudad del config o variable de entorno
let currentCity = window.CONFIG?.ciudad || 'cordoba';
console.log(`🏙️ Conectando a: ${currentCity}`);
```

---

### CAMBIO 2: index.html (Quitar selector)

**ANTES (Demo):**
```html
<select id="city-selector">
  <option>Mar del Plata</option>
  <option>Córdoba</option>
</select>
```

**DESPUÉS (Cliente):**
```html
<!-- Mostrar ciudad actual, no seleccionable -->
<div id="city-display">
  <h3>🏙️ <span id="city-name">Cargando...</span></h3>
</div>

<script>
  document.getElementById('city-name').textContent = window.CONFIG?.ciudad_nombre || 'Su Ciudad';
</script>
```

---

### CAMBIO 3: firestore.rules (Genérico)

**ANTES (Específico):**
```
match /patrullas_mardelplata/{patrolId}
match /patrullas_cordoba/{patrolId}
match /chat_mardelplata/{document=**}
```

**DESPUÉS (Genérico):**
```
match /patrullas/{patrolId} {
  allow read, write: if isAuthenticated();
}

match /chat/{document=**} {
  allow read, write: if isAuthenticated();
  allow delete: if isOperadorOrAdmin();
}
```

---

### CAMBIO 4: ⭐ NUEVO - verificar-suscripcion.js

**Archivo nuevo:**
```javascript
// verificar-suscripcion.js

async function verificarSuscripcion() {
  try {
    // 1. Obtener token de suscripción
    const suscripcionId = window.CONFIG?.suscripcion_id;
    if (!suscripcionId) {
      console.error('⚠️ No hay suscripción_id en config');
      return false;
    }

    // 2. Conectar a tu Firebase para verificar
    const tuFirebaseDb = window.tuDb; // Conectar a tu Firebase
    const referencia = await tuFirebaseDb
      .collection('subscripciones')
      .doc(suscripcionId)
      .get();

    if (!referencia.exists) {
      console.error('❌ Suscripción no encontrada');
      return false;
    }

    const datos = referencia.data();
    
    // 3. Verificar estado
    if (datos.estado !== 'activo') {
      console.error('❌ Suscripción suspendida:', datos.estado);
      return false;
    }

    // 4. Verificar fecha de expiración
    if (datos.fecha_expiracion < Date.now()) {
      console.error('❌ Suscripción expirada');
      return false;
    }

    console.log('✅ Suscripción válida');
    return true;

  } catch (error) {
    console.error('❌ Error verificando suscripción:', error);
    return false;
  }
}
```

---

### CAMBIO 5: config-template.json (NUEVO)

**Archivo que recibe cada cliente:**
```json
{
  "ciudad": "cordoba",
  "ciudad_nombre": "Córdoba",
  "suscripcion_id": "cordoba_001",
  "firebase": {
    "apiKey": "AIzaSyXXXXXXXXXX",
    "projectId": "cordoba-traficomap-2024",
    "storageBucket": "cordoba-traficomap-2024.appspot.com",
    "messagingSenderId": "123456789",
    "appId": "1:123456789:web:abcdefg123456"
  },
  "tu_firebase_para_verificar": {
    "apiKey": "AIzaSyYYYYYYYYYY",
    "projectId": "trafico-map-general-v2",
    "messagingSenderId": "987654321",
    "appId": "1:987654321:web:xyzabc987654"
  }
}
```

---

## 📋 CHECKLIST IMPLEMENTACIÓN

### FASE 2A: Documentación (1 día)
- [ ] Este archivo (ARQUITECTURA_FASE_2.md) ✅
- [ ] Crear CAMBIOS_ARCHIVOS.md (detalle por archivo)
- [ ] Crear GUIA_IMPLEMENTACION.md (paso a paso)
- [ ] Crear README_CLIENTE.md (para distribuir)

### FASE 2B: Código Template (2-3 días)
- [ ] Crear carpeta `/cliente-template/`
- [ ] Copiar y adaptar index.html
- [ ] Copiar y adaptar app.js
- [ ] Copiar módulos (sin cambios)
- [ ] Crear verificar-suscripcion.js
- [ ] Crear config-template.json
- [ ] Adaptar firestore.rules

### FASE 2C: Scripts Automatización (1-2 días)
- [ ] crear-cliente.sh (prepara Firebase)
- [ ] exportar-datos.sh (exporta datos demo)
- [ ] suspender-cliente.sh (deshabilita acceso)

### FASE 2D: Admin Panel (2-3 días)
- [ ] Crear carpeta `/admin-panel/`
- [ ] Interfaz de gestión
- [ ] Integración con Stripe/MercadoPago
- [ ] Estadísticas de clientes

### FASE 3: Testing (1 semana)
- [ ] Teste crear cliente Córdoba
- [ ] Teste chat funciona
- [ ] Teste patrullas funcionan
- [ ] Teste verificación de suscripción

---

## 🚀 DEPENDENCIAS

**Para implementar Fase 2, necesitamos:**
- [ ] Firebase Admin SDK (ya instalado ✅)
- [ ] Node.js (ya instalado ✅)
- [ ] Firebase CLI (ya instalado ✅)
- [ ] Stripe API keys (a conseguir)
- [ ] Servidor SMTP para emails (a configurar)

---

## 💾 DATOS QUE VIAJAN

**Cuando cliente compra:**
```
1. TU FIREBASE recibe:
   - Pago procesado
   - Crear /subscripciones/cordoba_001

2. SCRIPT crea:
   - Nuevo Firebase project
   - Sube código cliente-template
   - Copia datos de Mar del Plata como ejemplo
   - Genera credenciales

3. CLIENTE recibe:
   - Email con URL
   - config-template.json
   - Acceso a su Firebase
```

---

## ✅ RESULTADO ESPERADO

Después de Fase 2:

```
TU DEMO (sigue igual):
 https://trafico-map-general-v2.web.app/
 └─ Mar del Plata EN VIVO
 └─ Panel admin para controlar clientes

CLIENTE CÓRDOBA (nuevo):
 https://cordoba.traficomap.app/
 └─ Únicamente sus datos
 └─ Chat funcionando
 └─ Patrullas en vivo

CLIENTE MENDOZA (nuevo):
 https://mendoza.traficomap.app/
 └─ Únicamente sus datos
 └─ Chat funcionando
 └─ Patrullas en vivo

...N CLIENTES MÁS
```

---

## 📞 SOPORTE Y MANTENIMIENTO

**Cuando cliente tiene problema:**
```
Cliente contacta → Tu panel admin → Ver logs
→ Puede ver estado de su Firebase
→ Puede suspender/reactivar
→ Dashboard de costo Firebase
```

---

**Próximo paso:** Crear CAMBIOS_ARCHIVOS.md con detalles por archivo
