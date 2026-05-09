# Cliente Template - TraficoMap SaaS

**Versión 2.0** - Template multi-tenant para instancias independientes con Firebase separado

Este es el blueprint que se distribuye a cada cliente nuevo. Cada cliente obtiene su propia Firebase, sus propios datos, y su propia instancia de hosting.

## 📋 Estructura

```
cliente-template/
├── config.json                 # ⚙️ EDITAR - Credenciales de Firebase del cliente
├── config-template.json        # 📋 Referencia - No modificar
├── firebase.json               # 🔧 NO CAMBIAR - Configuración de Firebase
├── firestore.rules             # 🔐 NO CAMBIAR - Reglas de seguridad
├── README.md                   # Este archivo
│
├── public/
│   ├── index.html              # 🌐 Página principal (personalizada con ciudad)
│   │
│   ├── js/
│   │   ├── app.js              # 📱 App principal - ADAPTA currentCity desde CONFIG
│   │   ├── verificar-suscripcion.js   # ✅ Verifica suscripción vs Firebase padre
│   │   ├── auth-manager.js     # 🔐 Gestión de autenticación
│   │   ├── {*-layer.js}        # 🗺️ Módulos de capas (patrullas, siniestros, etc)
│   │   └── [otros módulos]     # Copiados del demo sin cambios
│   │
│   ├── css/                    # 🎨 Estilos compartidos
│   │
│   └── data/
│       ├── cities-config.json  # 🏙️ Configuración de ciudades disponibles
│       ├── barrios.geojson     # 📍 Límites de barrios
│       └── corredores_escolares.geojson  # 🏫 Corredores escolares
│
└── serviceAccountKey.json      # 🔑 SECRETO - Credencial de Firebase (en .gitignore)
```

## 🚀 Instalación para Nuevo Cliente

### Paso 1: Inicializar desde template

```bash
# Desde raíz del proyecto
cp -r cliente-template cliente-[CIUDAD]
cd cliente-[CIUDAD]
```

### Paso 2: Configurar Firebase

El administrador debe:
1. Crear nuevo proyecto Firebase en console.firebase.google.com
2. Descargar `serviceAccountKey.json` → colocar en raíz
3. Crear Firestore database (NOT Realtime DB)
4. Habilitar autenticación (Email/Password)
5. Compartir config.json con credenciales públicas

### Paso 3: Actualizar config.json

**Reemplazar valores placeholders:**

```json
{
  "ciudad": "nueva-ciudad",
  "ciudad_nombre": "Nueva Ciudad",
  "suscripcion_id": "numero_suscripcion_unico",
  
  "firebase": {
    "apiKey": "AIzaSyDzD2.....TU_API_KEY_DEL_CLIENTE",
    "authDomain": "tu-proyecto-firebase.firebaseapp.com",
    "projectId": "tu-proyecto-firebase-12345",
    "storageBucket": "tu-proyecto-firebase.appspot.com",
    "messagingSenderId": "123456789012",
    "appId": "1:123456789012:web:abcd1234efgh5678"
  },
  
  "tu_firebase_para_verificar": {
    "apiKey": "API_KEY_PADRE_TRAFICOMAP",
    "authDomain": "traficomap-saas.firebaseapp.com",
    "projectId": "traficomap-saas",
    "storageBucket": "traficomap-saas.appspot.com",
    "messagingSenderId": "PADRE_ID_123",
    "appId": "PADRE_APPID"
  }
}
```

### Paso 4: Instalar Firebase CLI

```bash
npm install -g firebase-tools
firebase login
```

### Paso 5: Deployar

```bash
# Dentro del directorio del cliente
firebase deploy
```

## ⚙️ Configuración Importante

| Archivo | Sección | Editar? | Notas |
|---------|---------|--------|-------|
| config.json | Toda | ✅ SI | Credenciales, ciudad, suscripción |
| public/data/cities-config.json | Coordenadas | ⚠️ Opcional | Si cliente tiene múltiples ciudades |
| public/data/barrios.geojson | Features | ⚠️ Opcional | Datos geográficos de barrios |
| firestore.rules | Todas las reglas | ❌ NO | Genéricas, no cambiar |
| public/js/app.js | Línea ~83 | ❌ NO | Automáticamente lee de CONFIG |

## 📡 Flujo de Datos y Seguridad

```
┌─────────────────┐
│  Usuario en Nav │
└────────┬────────┘
         │
         v
┌─────────────────────────┐
│ 1. Firebase Cliente     │ ← Autenticación local
│    (su proyecto)        │
└────────┬────────────────┘
         │ login exitoso
         v
┌─────────────────────────┐
│ 2. Verificar Suscripc.  │ ← Checa en Firebase Padre
│    (usuario válido?)    │
└────────┬────────────────┘
         │ token válido + activo
         v
┌─────────────────────────┐
│ 3. Cargar datos         │ ← De Firestore cliente
│    (mapas, capas)       │
└────────┬────────────────┘
         │
         v
┌─────────────────────────┐
│ 4. Mostrar mapa SOLO    │ ← Ciudad configurada
│    de su ciudad         │
└─────────────────────────┘
```

## 🔐 Reglas de Seguridad Firestore

```
Todas las colecciones:
✅ Lectura: Solo usuarios autenticados
❌ Escritura: Solo servidor (importaciones CSV)

Excepciones:
📝 alertas: Usuarios pueden escribir propias alertas
💬 chat: Usuarios autenticados pueden leer/escribir
```

## 🗂️ Colecciones Disponibles

| Colección | Descripción | Lectura | Escritura |
|-----------|-------------|---------|-----------|
| **siniestros** | Accidentes de tránsito | ✅ Autenticados | ❌ Servidor |
| **cameras_publicas** | Cámaras de videovigilancia | ✅ Autenticados | ❌ Servidor |
| **cameras_privadas** | Cámaras privadas | ✅ Autenticados | ❌ Servidor |
| **cameras_lpr** | Cámaras lectoras de patentes | ✅ Autenticados | ❌ Servidor |
| **semaforos** | Semáforos con datos | ✅ Autenticados | ❌ Servidor |
| **robos** | Robos automotores | ✅ Autenticados | ❌ Servidor |
| **escuelas** | Ubic. escuelas | ✅ Autenticados | ❌ Servidor |
| **aforos** | Datos de aforos | ✅ Autenticados | ❌ Servidor |
| **colectivos** | Líneas de transporte | ✅ Autenticados | ❌ Servidor |
| **patrullas** | Posición de patrullas | ✅ Autenticados | ❌ Servidor |
| **alertas** | Alertas de usuarios | ✅ Autenticados | ✅ Usuario propias |
| **chat** | Chats | ✅ Autenticados | ✅ Autenticados |

## 🎨 Personalización

### Cambiar ciudad defecto
Edit `public/js/app.js` línea ~83:
```javascript
let currentCity = window.CONFIG?.ciudad || 'la-plata';
```

### Agregar capas visibles por defecto
Edit `public/data/cities-config.json`:
```json
"capas_disponibles": {
  "cameras_publicas": {
    "visible_por_defecto": true
  }
}
```

### Cambiar coordenadas de ciudad
Edit `public/data/cities-config.json`:
```json
"ciudades": {
  "mi-ciudad": {
    "nombre": "Mi Ciudad",
    "coordenadas": [-34.921, -57.955],
    "zoom": 13
  }
}
```

## 🛠️ Troubleshooting

### "Firebase no está inicializado"
- Verifica que `config.json` existe en `public/`
- DevTools → Network → busca `config.json` y verifica status 200
- Verifica que el proyecto ID existe en Firebase Console

### "No puedo autenticarme"
- Verifica que Authentication está en Firebase Console
- Habilita Email/Password provider
- Intenta crear usuario de prueba en Firebase → Users

### "No veo datos en el mapa"
- Verifica que Firestore tiene documentos
- Comprueba que están importados (verifica en Firebase Console)
- Abre DevTools → Console, busca errores de Firestore
- Verifica que documents tienen `lat` y `lng` fields

### "Error 'Suscripción inválida'"
- Token de Firebase padre es inválido
- Verifica que existe collection `subscripciones` con tu `suscripcion_id`
- Comprueba que estado es "activo"
- Verifica que `fecha_expiracion` > ahora

### "No puedo deployar con Firebase"
```bash
firebase login  # Verifica credenciales
firebase use --add  # Selecciona proyecto
firebase deploy    # Intenta nuevamente
```

## 📊 Monitoreo

### Verificar estadísticas
Firebase Console → Firestore → Stats:
- Documentos por colección
- Storage usado
- Lecturas/escrituras por día

### Ver logs
```bash
firebase functions:log
```

## 🔄 Actualizar template

Si el template recibe mejoras versión X+1:
```bash
# Dentro de cliente-[CIUDAD]/
# 1. Backup
mv public/js/app.js public/js/app.js.backup

# 2. Copiar nuevo template
cp ../cliente-template/public/js/* public/js/

# 3. Re-aplicar personalización si es necesaria
# (generalmente no es necesario - app.js está diseñado para ser genérico)
```

## 📋 Checklist Pre-Producción

- [ ] `config.json` actualizado
- [ ] Firebase proyecto creado
- [ ] Firestore database creado (NO Realtime DB)
- [ ] Authentication habilitado
- [ ] `serviceAccountKey.json` descargado y puesto en raíz
- [ ] `.gitignore` incluye `serviceAccountKey.json`
- [ ] Datos importados a cada colección requerida
- [ ] `firestore.rules` desplegadas
- [ ] Test login desde navegador
- [ ] Verificación de suscripción funciona
- [ ] Datos del mapa cargan correctamente
- [ ] URLs de CORS configuradas (si aplica)
- [ ] Email de soporte configurado
- [ ] Backups automáticos configurados

---

**Versión:** 2.0  
**Última actualización:** 2024  
**Template para:** TraficoMap SaaS - Arquitectura Fase 2  
**Soporte:** contactar@traficomap.com
