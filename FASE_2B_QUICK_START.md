# FASE 2B: Guía de Uso Rápida

## ✅ Lo que acabamos de crear

### 4 archivos nuevos en total:

1. **crear-cliente.ps1** ⭐ (Script principal)
   - Crea un cliente completo en ~5 minutos
   - Requiere 1 paso manual: crear Firebase Project

2. **crear-usuarios-firebase.js** (Helper)
   - Crea usuarios en Firebase Auth
   - Se ejecuta DESPUÉS de que existe firebase-service-account.json

3. **crear-suscripcion.js** (Helper)
   - Crea suscripción en tu Firebase central
   - Para verificación desde tu servidor

4. **helper-deployment.ps1** (Orquestador)
   - Ejecuta los helpers automáticamente
   - Maneja errores y reporting

---

## 🚀 Cómo usar - Paso a Paso

### Paso 1: Crear un cliente nuevo
```powershell
cd c:\Users\gparra\TraficoMapGeneral

# Ejecutar el script principal
.\crear-cliente.ps1 -municipio "La Plata" -email "admin@laplatamaps.gov.ar" -dominio "laplatamaps.municip.gov.ar"
```

**Qué hace:**
- ✅ Valida requisitos (Firebase CLI, Node, Git)
- ✅ Copia `/cliente-template/` a `cliente-la-plata/`
- ✅ Personaliza `config.json` con tus datos
- ✅ Genera usuarios temporales (admin, operadores, patrullas)
- ✅ Te abre Firebase Console para crear proyecto
- ✅ Inicializa git repo y hace primer commit

**Output:**
```
cliente-la-plata/
├─ public/
├─ config.json ← Personalizado con tus datos
├─ firebase-service-account.json ← DESCARGAR DE FIREBASE
├─ usuarios-iniciales.json ← Contraseñas generadas
└─ .git/ ← Nuevo repo Git
```

---

### Paso 2: Obtener credenciales de Firebase

⚠️ **MUY IMPORTANTE**: Después de ejecutar `crear-cliente.ps1`, se abrirá automaticamente Firebase Console.

1. **Se habrá abierto:** https://console.firebase.google.com/project/laplatamaps/settings/serviceaccounts/adminsdk

2. **Haz clic:** "Generar nueva clave privada"

3. **Guarda el JSON descargado como:**
   ```
   cliente-la-plata/firebase-service-account.json
   ```

4. **Verifica que esté en el directorio correcto:**
   ```powershell
   cat cliente-la-plata/firebase-service-account.json
   ```

---

### Paso 3: Crear usuarios en Firebase Auth

```powershell
# Desde el mismo directorio
.\helper-deployment.ps1 -cliente "La Plata" -firebaseProjectId "laplatamaps" -tipo usuarios
```

**Qué hace:**
- ✅ Lee `usuarios-iniciales.json` generado en Paso 1
- ✅ Crea cada usuario en Firebase Auth
- ✅ Genera custom claims (roles)
- ✅ Guarda documentos en Firestore `/users/{uid}`

**Output:**
```
usuarios-creados.json
{
  "exitosos": 7,
  "errores": 0,
  "detalles": [...]
}
```

---

### Paso 4: Crear suscripción en tu Firebase

```powershell
# Necesitas las credenciales de trafico-map-general-v2
# Obtenerlas de: https://console.firebase.google.com/project/trafico-map-general-v2/settings/serviceaccounts/adminsdk

.\helper-deployment.ps1 -cliente "La Plata" -adminFirebaseKey "./trafico-map-general-v2-key.json" -tipo suscripcion
```

**Qué hace:**
- ✅ Crea documento en `/suscripciones/La Plata` en tu Firebase
- ✅ Registra el plan (basico, profesional, enterprise)
- ✅ Configura límites según plan

---

### Paso 5: Desplegar la aplicación

```powershell
cd cliente-la-plata

# Desplegar a Firebase Hosting
firebase deploy --only hosting

# O si quieres solo Firestore rules
firebase deploy --only firestore:rules
```

**Resultado:** La app estará accesible en el dominio del cliente 🎉

---

## 📋 Referencia Rápida de Comandos

### Crear cliente (SIEMPRE PRIMERO)
```powershell
.\crear-cliente.ps1 -municipio "Nombre" -email "admin@dominio.com" -dominio "dominio.com"
```

### Con más opciones
```powershell
.\crear-cliente.ps1 `
  -municipio "La Plata" `
  -email "admin@laplatamaps.gov.ar" `
  -dominio "laplatamaps.municip.gov.ar" `
  -plan "profesional" `
  -numPatrullas 5 `
  -numOperadores 2 `
  -lat -34.9215 `
  -lng -57.9544
```

### Crear solo usuarios
```powershell
.\helper-deployment.ps1 -cliente "La Plata" -firebaseProjectId "laplatamaps" -tipo usuarios
```

### Crear solo suscripción
```powershell
.\helper-deployment.ps1 -cliente "La Plata" -adminFirebaseKey "./admin-key.json" -tipo suscripcion
```

### Crear todo (usuarios + suscripción)
```powershell
.\helper-deployment.ps1 -cliente "La Plata" -firebaseProjectId "laplatamaps" -adminFirebaseKey "./admin-key.json" -tipo completo
```

---

## ⚠️ Errores Comunes

| Error | Solución |
|-------|----------|
| "Firebase CLI no encontrado" | `npm install -g firebase-tools` |
| "Node.js no encontrado" | Instala desde nodejs.org |
| "template no encontrado" | Asegúrate que `/cliente-template/` existe |
| "firebase-service-account.json no encontrado" | Descárgalo de Firebase Console |
| Puerto 8080 en uso | `netstat -ano \| findstr :8080` para encontrar proceso |

---

## 📊 Estado Actual

```
✅ Fase 2A: Template cliente completado
✅ Fase 2B: Scripts de automatización completados
   • crear-cliente.ps1 (435 líneas)
   • crear-usuarios-firebase.js (200 líneas)
   • crear-suscripcion.js (200 líneas)
   • helper-deployment.ps1 (220 líneas)

🔄 PRÓXIMO: Testing end-to-end
```

---

## 🎯 Objetivo de Fase 2B

> **"Un único comando para crear un cliente completamente funcional"**

Con los scrips de Fase 2B:
- **Antes:** 2-3 horas de trabajo manual por cliente
- **Ahora:** ~10 minutos (5 min script + 3 min descargando archivo + 2 min despliegue)

---

## 📞 Soporte y Debugging

### Ver log de creación
```powershell
# Los scripts guardan resultados en JSON
cat cliente-la-plata/usuarios-iniciales.json
cat cliente-la-plata/usuarios-creados.json
cat suscripcion-creada.json
```

### Verificar Firebase
1. **Usuarios creados:** trafico-map-general-v2 → Firestore → collections → `suscripciones`
2. **Suscripción:** laplatamaps → Authentication → Users
3. **Config:** laplatamaps → Firestore → `config` collection

### Rollback de cliente
```powershell
# Si algo salió mal
rm -r cliente-la-plata
git checkout ESTADO_FASE_2A.md
```

---

## 📖 Documentación Completa

Para más detalles técnicos:
- [ESTADO_FASE_2B.md](./ESTADO_FASE_2B.md) - Documentación técnica detallada
- [ARQUITECTURA_SAAS.md](./ARQUITECTURA_SAAS.md) - Arquitectura del sistema
- [ESTADO_FASE_2A.md](./ESTADO_FASE_2A.md) - Estado del template

---

**¿Listo para testear?** 🚀
