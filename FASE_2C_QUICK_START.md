# Fase 2C - Quick Start: Admin Panel MVP

**Versión:** 1.0.0-alpha  
**Preparado:** 3 de Mayo de 2026  
**Tiempo lectura:** 5 minutos  

## ⚡ Inicio Rápido (5 minutos)

### Paso 1: Acceder al Panel
```
URL: http://localhost:8080/admin/
```

### Paso 2: Iniciar Sesión
```
Email: admin@trafico-map.admin
Password: [Tu password en Firebase Auth]
```

### Paso 3: Ver Dashboard
- Total de clientes
- Ingresos del mes
- Subscripciones próximas a vencer
- Gráfico de distribución de planes

## 🛠️ Setup Local (10 minutos)

### 1. Verificar Prerequisites
```bash
# Node.js 18+
node --version

# Git
git --version
```

### 2. Clonar/Acceder Repo
```bash
cd c:\Users\gparra\TraficoMapGeneral
git status
```

### 3. Servir Localmente

**Opción A: Python (Recomendado)**
```bash
cd c:\Users\gparra\TraficoMapGeneral
python -m http.server 8080
# Accede a http://localhost:8080/admin/
```

**Opción B: Live Server (VS Code)**
- Instala extensión "Live Server"
- Click derecho en `/admin/index.html` → "Open with Live Server"
- Se abre en http://127.0.0.1:5500/admin/

**Opción C: Node.js**
```bash
npm install -g http-server
http-server -p 8080
```

### 4. Firebase Auth Setup

**En Firebase Console:**

1. Ve a: https://console.firebase.google.com/project/trafico-map-general-v2/authentication
2. Crea usuario (si no existe):
   - Email: `admin@trafico-map.admin`
   - Password: [Tu contraseña segura]
3. Luego asigna custom claims:
   - Haz click en el usuario
   - Scroll down a "Custom Claims"
   - Agrega:
   ```json
   {
     "role": "admin"
   }
   ```

### 5. Firestore Setup

**Crear colecciones base en Firestore:**

```
https://console.firebase.google.com/project/trafico-map-general-v2/firestore
```

Crear estos documentos de ejemplo:

**Collection: `clientes/`**
```json
{
  "id": "cliente_001",
  "nombre": "Municipalidad de La Plata",
  "email": "admin@laplata.gov.ar",
  "plan": "profesional",
  "estado": "activo",
  "created_at": "2026-05-01T00:00:00Z"
}
```

**Collection: `subscripciones/`**
```json
{
  "id": "sub_001",
  "cliente_id": "cliente_001",
  "plan": "profesional",
  "precio_mensual": 5000,
  "expiration_date": "2026-06-01T00:00:00Z",
  "activa": true
}
```

**Collection: `billing/`**
```json
{
  "id": "bill_001",
  "cliente_id": "cliente_001",
  "monto": 5000,
  "fecha": "2026-05-01T00:00:00Z",
  "mes": "2026-05"
}
```

### 6. Abrir Panel
```
http://localhost:8080/admin/
```

✅ ¡Deberías ver el dashboard con métricas!

## 📋 Checklist Funcionamiento

- [ ] Panel carga sin errores
- [ ] Formulario de login visible
- [ ] Login exitoso con admin@trafico-map.admin
- [ ] Dashboard muestra:
  - [ ] Total Clientes (número)
  - [ ] Clientes Activos
  - [ ] Ingresos del Mes
  - [ ] Próximas a Vencer
- [ ] Tabla "Últimos Clientes" visible
- [ ] Tabla "Subscripciones Próximas a Vencer" visible
- [ ] Gráfico de planes (doughnut chart) visible
- [ ] Navbar con botón Logout
- [ ] Sidebar con opciones de menú

## 🔍 Troubleshooting

### Problema: "Error al cargar clientes"

**Solución:**
1. Abre Chrome DevTools (F12)
2. Pestaña "Console"
3. Verifica si hay errores Firebase
4. Confirma:
   - Firebase config en `firebase-config.js` es correcta
   - Firestore tiene colecciones con datos
   - Usuario tiene role: "admin" en custom claims

### Problema: Login no funciona

**Solución:**
1. Verifica que usuario existe en Firebase Auth
2. Confirma custom claims: `role: "admin"`
3. Intenta logout (F12) → Login de nuevo

### Problema: Gráficos no se renderizan

**Solución:**
1. Verifica que Chart.js CDN carga (F12 Network)
2. Console debe estar limpia de errores
3. Recarga página (Ctrl+Shift+R hard refresh)

### Problema: Estilos se ven raros

**Solución:**
1. Verifica que `admin.css` carga (F12 Network)
2. Recarga página (Ctrl+Shift+R hard refresh)
3. Limpia cache del navegador

## 📊 SDK de Datos (Para Desarrolladores)

En browser console puedes acceder:

```javascript
// Autenticación
adminAuth.isAdmin()           // ¿Es admin?
adminAuth.logout()            // Cerrar sesión

// Dashboard data
dashboard.clientesData        // Array de clientes
dashboard.subscripcionesData  // Array de suscripciones
dashboard.billingData         // Array de billing

// Utilities
formatCurrency(5000)          // "$5.000,00"
formatDate(new Date())        // "3 de Mayo de 2026"
```

## 🚀 Arquitectura (Para Desarrolladores)

### Flujo de Carga

```
index.html carga
  ↓
firebase-config.js (init Firebase)
  ↓
auth.js (setup listener)
  ↓
Usuario entra? SÍ → showAdminUI()
                    ├─ dashboard.js init()
                    ├─ loadClienteCount()
                    ├─ loadSubscripciones()
                    ├─ loadBillingData()
                    └─ render()
           NO  → showLoginUI()
```

### Estructura de Módulos

```javascript
// firebase-config.js
export auth, db, analytics

// auth.js
class AdminAuth {
  login(), logout(), isAdmin(), ...
}
adminAuth = new AdminAuth()

// utils.js
export formatDate(), formatCurrency(), ...

// dashboard.js
class Dashboard {
  init(), render(), getHTML(), ...
}
dashboard = new Dashboard()
```

## 📝 Próximos Pasos (Para Developers)

1. **Clientes Manager** (`/admin/js/clientes-manager.js`)
   - CRUD operaciones
   - Queries a Firestore

2. **Página Clientes** (`/admin/clientes/index.html`)
   - Listado, crear, editar

3. **Subscripciones Manager** (`/admin/js/subscripciones-manager.js`)
   - Cambiar plan, renovar

4. **Cloud Functions**
   - Backend seguro
   - Orquestar scripts Fase 2B

## 🎯 Objetivos MVP

✅ Autenticación funcional  
✅ Dashboard con 4 métricas  
✅ Tabla clientes últimos 5  
✅ Tabla subscripciones vencen <30d  
✅ Gráfico distribución planes  
⏳ CRUD clientes (próximo)  
⏳ CRUD subscripciones (próximo)  
⏳ Billing (próximo)  

## 📚 Documentación

- [admin/README.md](/admin/README.md) - Setup completo
- [PLAN_FASE_2C.md](/PLAN_FASE_2C.md) - Plan estratégico
- [ESTADO_FASE_2C.md](/ESTADO_FASE_2C.md) - Estado actual

## 💬 Contacto & Soporte

Preguntas?
1. Revisa console (F12)
2. Revisa Firebase Console
3. Revisa documentación

---

**¡Listo!** Admin panel MVP está funcionando. 🎉

Próximo: Implementar clientes manager para CRUD completo.
