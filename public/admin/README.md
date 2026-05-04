# Admin Panel - TraficoMap SaaS

**Versión:** 1.0.0-alpha  
**Status:** 🔄 EN DESARROLLO  
**Iniciado:** 3 de Mayo de 2026

## 📋 Descripción

Panel administrativo centralizado para gestionar todos los clientes TraficoMap SaaS.

Funcionalidades:
- 📊 Dashboard con métricas clave
- 👥 Gestión de clientes (CRUD)
- 💳 Gestión de suscripciones
- 📈 Billing y facturas
- ⚙️ Gestión de usuarios admin

## 🏗️ Estructura

```
/admin/
├── index.html              [Página principal]
├── README.md              [Esta documentación]
├── css/
│   └── admin.css          [Estilos personalizados]
├── js/
│   ├── firebase-config.js [Configuración Firebase]
│   ├── auth.js            [Autenticación admin]
│   ├── utils.js           [Utilidades comunes]
│   └── dashboard.js       [Lógica dashboard]
└── clientes/              [Módulo clientes - próximamente]
└── subscripciones/        [Módulo suscripciones - próximamente]
└── billing/               [Módulo billing - próximamente]
└── usuarios/              [Módulo usuarios - próximamente]
```

## 🚀 Instalación y Setup

### Requisitos Previos
- Firebase Account (trafico-map-general-v2)
- Node.js 18+ (para desarrollo local)
- Git

### 1. Clonar/Acceder al Repositorio
```bash
cd admin/
```

### 2. Configurar Firebase Credentials

**Opción A: Desde Firebase Console (RECOMENDADO)**
1. Ve a: https://console.firebase.google.com/project/trafico-map-general-v2
2. Settings > Project Settings > General > Web
3. Copia la configuración
4. Actualiza `js/firebase-config.js`:

```javascript
const FIREBASE_CONFIG = {
  apiKey: "tu_api_key_aqui",
  authDomain: "trafico-map-general-v2.firebaseapp.com",
  projectId: "trafico-map-general-v2",
  storageBucket: "trafico-map-general-v2.appspot.com",
  messagingSenderId: "tu_messaging_id",
  appId: "tu_app_id"
};
```

### 3. Crear Usuarios Admin

En Firebase Console > Authentication:
1. Crea usuario: `admin@trafico-map.admin`
2. En Firestore, crea documento en `/usuarios_admin/admin@trafico-map.admin`:

```json
{
  "email": "admin@trafico-map.admin",
  "nombre": "Administrador",
  "role": "admin",
  "creado_en": "2026-05-03T00:00:00Z"
}
```

3. En Firebase Auth > Custom Claims, agrega:
```json
{
  "role": "admin"
}
```

### 4. Servir Localmente

**Opción A: Con Python**
```bash
python -m http.server 8080
```

**Opción B: Con Node.js http-server**
```bash
npm install -g http-server
http-server -p 8080
```

**Opción C: Con Live Server**
- Instala extensión Live Server en VS Code
- Click derecho > Open with Live Server

Accede a: `http://localhost:8080`

## 🔐 Autenticación

### Flujo de Login
1. Usuario ingresa email y password
2. Firebase Auth valida credenciales
3. Sistema verifica custom claims `role: "admin"`
4. Si no es admin, logout automatic
5. Si es admin, carga dashboard

### Usuarios de Demo
```
Email: admin@trafico-map.admin
Password: [Configurar en Firebase Auth]

Role: admin (permisos totales)
```

## 📊 Dashboard

Muestra métricas clave:
- Total de clientes
- Clientes activos
- Ingresos del mes
- Suscripciones próximas a vencer

### Gráficos
- Clientes por plan (doughnut)
- Ingresos por mes (próximamente)
- Tasa de crecimiento (próximamente)

## 👥 Gestión de Clientes

**Listado** (`/admin/clientes/`)
- Ver todos los clientes
- Filtrar por estado/plan
- Buscar por nombre

**Crear Cliente**
- Botón en navbar "Crear Cliente"
- Abre modal con formulario
- Valida datos
- Ejecuta `crear-cliente.ps1` (en servidor)

**Detalle Cliente**
- Información general
- Suscripción actual
- Uso de recursos
- Historial

**Editar Cliente**
- Modificar datos
- Cambiar plan (próximamente)
- Suspender/Reactivar

## 💳 Suscripciones

**Listado** (`/admin/subscripciones/`)
- Ver todas las suscripciones
- Filtrar por estado
- Indicador de próximas a vencer (rojo)

**Cambiar Plan**
- Select nuevo plan
- Actualiza límites en Firestore
- Genera factura de diferencia

**Renovar**
- Extiende fecha de vencimiento 1 año
- Genera factura

## 📈 Billing

**Dashboard Billing**
- Ingresos totales
- Ingresos por período
- Facturas pendientes

**Facturas**
- Generar manualmente
- Descarga PDF
- Registrar pagos
- Reenviar por email

## 🔑 Roles y Permisos

| Rol | Dashboard | Clientes | Suscripciones | Billing | Usuarios |
|-----|-----------|----------|---------------|---------|----------|
| Admin | Lectura/Escritura | CRUD | CRUD | CRUD | CRUD |
| Operator | Lectura | Lectura | Lectura | Lectura | - |
| Billing | Lectura | Lectura | Lectura | CRUD | - |

## 🛡️ Seguridad

- ✅ Autenticación Firebase
- ✅ Custom claims para roles
- ✅ Firestore rules restrictivas
- ✅ HTTPS required
- ✅ API keys rotación periódica

## 🚨 Troubleshooting

### "No tienes permisos para acceder"
- Verifica custom claims en Firebase Auth
- Confirma que `role: "admin"` está asignado

### "Error al cargar clientes"
- Verifica Firestore rules
- Asegúrate de tener acceso de lectura a `/clientes/`

### Firebase no inicializa
- Verifica FIREBASE_CONFIG en `firebase-config.js`
- Confirma que las credenciales son correctas
- Revisa Firebase Console

### Charts no se renderizan
- Instala Chart.js via CDN
- Verifica que chart.js se carga antes de dashboard.js

## 📚 Documentación Relacionada

- [PLAN_FASE_2C.md](../PLAN_FASE_2C.md) - Plan completo
- [ARQUITECTURA_SAAS.md](../ARQUITECTURA_SAAS.md) - Arquitectura general
- [FASE_2B_TESTING_REPORT.md](../FASE_2B_TESTING_REPORT.md) - Testing Fase 2B

## 🔗 URLs Importantes

- **Admin Panel:** http://admin.trafico-map-general-v2.web.app
- **Firebase Console:** https://console.firebase.google.com/project/trafico-map-general-v2
- **Firestore:** https://console.firebase.google.com/project/trafico-map-general-v2/firestore
- **Authentication:** https://console.firebase.google.com/project/trafico-map-general-v2/authentication

## 🤝 Desarrollo

### Agregar Nueva Funcionalidad

1. Crea archivo en módulo correspondiente (ej: `/admin/clientes/crear.html`)
2. Implementa lógica en JavaScript correspondiente
3. Actualiza sidebar en `dashboard.html` si es necesario
4. Agrega menu item
5. Test en navegador
6. Commit a git

### Stack de Desarrollo
- HTML5 + CSS3 + JavaScript Vanilla
- Bootstrap 5 para UI
- Firebase SDK para backend
- Chart.js para gráficos
- Moment.js para fechas

## 📋 Checklist de Implementación

- [x] Estructura base
- [x] Auth funcional
- [x] Dashboard MVP
- [x] Firebase config
- [ ] Módulo clientes (listar, crear, editar)
- [ ] Módulo suscripciones (ver, cambiar plan)
- [ ] Módulo billing (generar facturas)
- [ ] Módulo usuarios admin
- [ ] Testing completo
- [ ] Deploy Firebase Hosting

## 📞 Soporte

Para issues o preguntas:
1. Consulta PLAN_FASE_2C.md
2. Revisa Firebase Console
3. Check Firestore rules y datos

## 📝 Changelog

### v1.0.0-alpha (3 de Mayo 2026)
- [x] Estructura base creada
- [x] Autenticación Firebase
- [x] Dashboard MVP con métricas
- [x] Integración Firestore
- [ ] Módulos específicos (próximas versiones)

---

**Próximo:** Implementar módulo de Clientes (CRUD completo)
