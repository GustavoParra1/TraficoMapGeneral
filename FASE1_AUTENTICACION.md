# 🔐 Fase 1: Usuarios Reales + Autenticación

## Estado del Sistema

✅ **Completado:**
- [x] Login page (`/login.html`)
- [x] AuthManager module (`js/auth-manager.js`)
- [x] Firestore security rules (auth-based)
- [x] Firebase Auth integration en:
  - `/index.html` (main app)
  - `/patrulla-app/index.html`
  - `/control-center-v2/index.html`
- [x] User creation script (`setup-users.js`)

🚀 **Próximos Pasos:**
1. Habilitar Firebase Auth en la consola (no requiere código)
2. Crear usuarios de prueba ejecutando script
3. Probar flujo de autenticación
4. Desplegar cambios

## 📋 Configuración de Firebase Auth

### Paso 1: Habilitar Firebase Auth en la consola

1. Ve a [https://console.firebase.google.com](https://console.firebase.google.com)
2. Selecciona proyecto `trafico-map-general-v2`
3. En la barra lateral, ve a **Authentication**
4. Haz clic en **Get Started**
5. Selecciona **Email/Password** como método de sign-in
6. Activa **Email/password** 
7. Guarda

**Resultado esperado:** Verás "Email/password" como habilitado en la lista de proveedores.

### Paso 2: Crear usuarios de demostración

#### Opción A: Usar el script (RECOMENDADO)

```bash
# 1. Descargar clave de servicio
# - Firebase Console -> Project Settings -> Service Accounts
# - "Generate new private key"
# - Guardar archivo como: serviceAccountKey.json en la raíz del proyecto

# 2. Instalar dependencias de Firebase Admin
npm install firebase-admin

# 3. Ejecutar script
node setup-users.js
```

**Usuarios que se crearán:**

| Email | Contraseña | Rol | Acceso |
|-------|-----------|-----|--------|
| patrulla1@seguridad-mdp.com | patrulla123 | patrulla | /patrulla-app/ |
| patrulla2@seguridad-mdp.com | patrulla123 | patrulla | /patrulla-app/ |
| patrulla3@seguridad-mdp.com | patrulla123 | patrulla | /patrulla-app/ |
| patrulla4@seguridad-mdp.com | patrulla123 | patrulla | /patrulla-app/ |
| capa-norte@seguridad-mdp.com | control123 | operador | /control-center-v2/ |
| capa-sur@seguridad-mdp.com | control123 | operador | /control-center-v2/ |
| mac@seguridad-mdp.com | control123 | operador | /control-center-v2/ |
| uppl@seguridad-mdp.com | control123 | operador | /control-center-v2/ |
| multiagencia@seguridad-mdp.com | control123 | operador | /control-center-v2/ |
| encargado-sala@seguridad-mdp.com | control123 | operador | /control-center-v2/ |
| admin@seguridad-mdp.com | admin123 | admin | /control-center-v2/ |

#### Opción B: Crear manualmente en Firebase Console

Si prefieres crear usuarios uno por uno:

1. Firebase Console → Authentication → Users
2. "Add User"
3. Ingresa email y contraseña
4. Click "Add User"

Repite para cada usuario de la tabla anterior.

## 🧪 Pruebas de Autenticación

### Test 1: Login como Patrulla

```bash
# 1. URL: http://localhost:5000/login.html (o https://trafico-map-general-v2.web.app/login.html)
# 2. Email: patrulla1@seguridad-mdp.com
# 3. Contraseña: patrulla123
# 4. Click "Iniciar Sesión"
# 5. Debería redirigir a /patrulla-app/
```

**Verificar:**
- ✅ Mapa se carga
- ✅ Modal de selección de patrulla aparece
- ✅ Puede seleccionar patrulla
- ✅ Botón "Iniciar Rastreo" funciona (GPS)

### Test 2: Login como Operador

```bash
# 1. URL: http://localhost:5000/login.html
# 2. Email: capa-norte@seguridad-mdp.com
# 3. Contraseña: control123
# 4. Click "Iniciar Sesión"
# 5. Debería redirigir a /control-center-v2/
```

**Verificar:**
- ✅ Centro de Control carga
- ✅ Mapa muestra patrullas en tiempo real
- ✅ Puede enviar mensajes
- ✅ Puede enviar broadcasts

### Test 3: Protección de rutas

```bash
# 1. Sin estar logueado, intenta acceder a:
# - http://localhost:5000/
# - http://localhost:5000/patrulla-app/
# - http://localhost:5000/control-center-v2/

# Resultado esperado: Redirige automáticamente a /login.html
```

## 🔒 Cómo funciona la autenticación

### Flujo de Login

```
Usuario entra a /login.html
        ↓
Ingresa email y contraseña
        ↓
AuthManager.login() → Firebase Auth
        ↓
Firebase valida credenciales
        ↓
Firebase devuelve user + custom claims (role)
        ↓
AuthManager.redirectByRole() analiza el rol
        ↓
Redirige a /patrulla-app/ O /control-center-v2/
        ↓
onAuthStateChanged() verifica que esté autenticado
        ↓
Si no está autenticado → Redirige a /login.html
        ↓
Si está autenticado → Carga la app
```

### Mapeo de Roles

El AuthManager asigna roles automáticamente según el patrón del email:

**PATRULLA:**
- Email comienza con `patrulla`
- Acceso a: `/patrulla-app/`
- Permisos: GPS, chat, emergencia

**OPERADOR:**
- Email contiene: `capa-norte@`, `capa-sur@`, `mac@`, `uppl@`, `multiagencia@`, `encargado-sala@`
- Acceso a: `/control-center-v2/`
- Permisos: Ver todas las patrullas, enviar mensajes, broadcasts

**ADMIN:**
- Email: `admin@seguridad-mdp.com`
- Acceso a: `/control-center-v2/`
- Permisos: Todos

### Custom Claims

Cada usuario tiene custom claims en Firebase Auth con su rol:

```javascript
{
  "role": "patrulla" | "operador" | "admin",
  "createdAt": "2025-04-20T12:00:00Z"
}
```

Estos claims se usan en Firestore rules para verificar permisos.

## 📄 Firestore Rules (Actualizado)

Las nuevas rules requieren autenticación y verifican roles:

```firestore
// Solo usuarios autenticados pueden leer patrullas
match /patrullas_{municipio}/{patrolId} {
  allow read: if isAuthenticated();
  allow write: if isPatullaOrAdmin();
}

// Solo operadores y admins pueden eliminar mensajes
match /chat_{municipio}/{patrolId}/messages/{messageId} {
  allow delete: if isOperadorOrAdmin();
}
```

## 🚀 Desplegar cambios

Una vez que hayas creado los usuarios y verificado que funciona localmente:

```bash
# 1. Commit de cambios
git add -A
git commit -m "feat: Implement Firebase Auth with role-based access"

# 2. Deploy a Firebase
firebase deploy --only hosting,firestore:rules

# 3. Verificar en producción
# https://trafico-map-general-v2.web.app/login.html
```

## 🐛 Troubleshooting

### "Usuario no encontrado" en login

**Solución:** El usuario no existe en Firebase Auth. Ejecuta `setup-users.js` o créalo manualmente.

### "Acceso denegado" al escribir en Firestore

**Posible causa:** El usuario está autenticado pero las reglas de Firestore lo rechazan.

**Debug:**
1. Abre el navegador → Console
2. Revisa los logs de error
3. Verifica que el usuario tenga el rol correcto en custom claims

### "No se puede acceder a config.json"

**Solución:** Asegúrate que config.json existe en `/public/` (no en carpetas de apps).

### Redirección infinita a login

**Causa común:** onAuthStateChanged() se ejecuta antes de que Firebase se inicialice.

**Verificar:**
```javascript
// En patrulla-app/index.html, verifica que:
// 1. initializeFirebase() se ejecute antes de otros scripts
// 2. Auth se inicialice correctamente en setupUIControls()
```

## 📊 Estado de Despliegue

- ✅ Login page creada
- ✅ AuthManager implementado
- ✅ Apps actualizadas con autenticación
- ✅ Firestore rules actualizadas
- ⏳ Usuarios de demo creados (requerido manual)
- ⏳ Desplegado en producción (requerido manual)

## 🔗 URLs Importantes

- **Login:** `https://trafico-map-general-v2.web.app/login.html`
- **Main App:** `https://trafico-map-general-v2.web.app/`
- **Patrulla App:** `https://trafico-map-general-v2.web.app/patrulla-app/`
- **Control Center:** `https://trafico-map-general-v2.web.app/control-center-v2/`

## 📞 Próximos Pasos

- [ ] Habilitar Email/Password en Firebase Console
- [ ] Ejecutar setup-users.js para crear usuarios
- [ ] Probar login con usuarios de demo
- [ ] Desplegar a producción
- [ ] (Opcional) Agregar autenticación con Google
- [ ] (Opcional) Agregar recuperación de contraseña
