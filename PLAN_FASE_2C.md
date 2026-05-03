# FASE 2C: Admin Panel de Gestión de Clientes

**Inicio:** 3 de Mayo de 2026  
**Status:** 🔄 EN PROGRESO  
**Objetivo:** Dashboard central para gestionar todos los clientes SaaS

## 📋 Visión General

El Admin Panel permite a **TraficoMap (tú)** gestionar de forma centralizada:
- 📊 Dashboard con métricas de clientes
- 👥 Gestión de clientes (crear, editar, eliminar)
- 💳 Gestión de suscripciones (planes, renovaciones, pagos)
- 📈 Monitoreo de uso (usuarios, almacenamiento, features)
- ⚙️ Configuración global

## 🏗️ Arquitectura

### Stack Tecnológico

```
FRONTEND:
  ├─ HTML5 + CSS3 (Bootstrap 5)
  ├─ JavaScript Vanilla (no frameworks pesados)
  ├─ Firebase UI SDK
  └─ Chart.js para gráficos

BACKEND:
  ├─ Cloud Functions (Node.js)
  ├─ Firestore (trafico-map-general-v2)
  └─ Firebase Auth (tu instancia)

HOSTING:
  └─ Firebase Hosting (admin.trafico-map-general-v2)

DATA:
  └─ Firestore collections:
     ├─ clientes/
     ├─ subscripciones/
     ├─ usuarios_admin/
     └─ billing/
```

### Estructura de Datos

#### Collection: `clientes/`
```json
{
  "municipios": {
    "id": "laplatamaps",
    "nombre": "La Plata",
    "provincia": "Buenos Aires",
    "email_admin": "admin@laplatamaps.test.ar",
    "dominio": "laplatamaps.test.ar",
    "firebase_project": "laplatamaps-test-2b",
    "creado_en": "2026-05-03T09:43:00Z",
    "actualizado_en": "2026-05-03T09:43:00Z",
    "estado": "activo",
    "plan": "profesional"
  }
}
```

#### Collection: `subscripciones/`
```json
{
  "laplatamaps": {
    "cliente_id": "laplatamaps",
    "plan": "profesional",
    "estado": "activa",
    "fecha_inicio": "2026-05-03",
    "fecha_expiracion": "2027-05-03",
    "limites": {
      "camaras": 50,
      "usuarios": 5,
      "almacenamiento_gb": 25
    },
    "uso_actual": {
      "camaras": 0,
      "usuarios": 0,
      "almacenamiento_gb": 0
    }
  }
}
```

#### Collection: `billing/`
```json
{
  "laplatamaps_2026": {
    "cliente_id": "laplatamaps",
    "periodo": "2026-05",
    "plan": "profesional",
    "precio": 4999,
    "moneda": "ARS",
    "estado": "facturado",
    "fecha_factura": "2026-05-01",
    "fecha_pago": "2026-05-15",
    "items": [
      {
        "descripcion": "Plan Profesional",
        "cantidad": 1,
        "precio_unitario": 4999
      }
    ]
  }
}
```

## 🎯 Componentes Principales

### 1. Dashboard (`/admin/index.html`)

**Métricas:**
- Total de clientes activos
- Ingresos mensuales / anuales
- Tasa de renovación de suscripciones
- Clientes por plan (pie chart)
- Uso de recursos (storage, usuarios)

**Quick Actions:**
- [+ Crear Cliente] → Abre form
- [Ver Detalle] → Clientes próximos a vencer
- [Últimas transacciones] → Últimas 10 facturas

### 2. Gestión de Clientes (`/admin/clientes/`)

**Listado: `clientes.html`**
- Tabla con todos los clientes
- Columnas: Municipio, Plan, Estado, Email, Creación, Acciones
- Filtros: por estado, plan, provincia
- Búsqueda: por nombre
- Acciones: Ver detalles, Editar, Suspender, Eliminar

**Detalle: `cliente-detalle.html`**
- Información general
- Suscripción actual
- Uso de recursos (progreso bars)
- Historial de cambios
- Botones: Editar, Renovar, Suspender, Eliminar

**Crear/Editar: `cliente-form.html`**
- Form con validación
- Campos: Municipio, Email, Dominio, Provincia, Coordenadas
- Integración con `crear-cliente.ps1`
- Preview de estructura

### 3. Gestión de Suscripciones (`/admin/subscripciones/`)

**Listado: `subscripciones.html`**
- Tabla con todas las suscripciones
- Columnas: Cliente, Plan, Fecha Inicio/Fin, Estado, Acciones
- Filtros: por plan, estado (activa/próxima a vencer/expirada)
- Indicadores de renovación próxima (rojo si falta <30 días)

**Detalle: `suscripcion-detalle.html`**
- Plan actual y detalles
- Límites vs Uso
- Historial de cambios de plan
- Botones: Cambiar Plan, Renovar, Cancelar

### 4. Billing (`/admin/billing/`)

**Resumen: `billing.html`**
- Ingresos: mes actual, mes anterior, YTD
- Método de pago por cliente
- Pipeline de facturas (por cobrar, pagadas, vencidas)

**Facturas: `facturas.html`**
- Listado de todas las facturas
- Descarga PDF
- Resend de email
- Registrar pago manual

### 5. Usuarios Admin (`/admin/usuarios/`)

**Gestión: `usuarios.html`**
- Lista de usuarios admin
- Roles: Admin, Operator, Billing
- Crear/Editar/Eliminar
- Resetear password

## 📁 Estructura de Archivos

```
/admin/
├── index.html                    [Dashboard principal]
├── css/
│   ├── bootstrap.min.css
│   ├── admin.css                 [Estilos personalizados]
│   └── charts.css
├── js/
│   ├── auth.js                   [Autenticación admin]
│   ├── firebase-config.js        [Config Firebase admin]
│   ├── dashboard.js              [Lógica dashboard]
│   ├── clientes-manager.js       [CRUD clientes]
│   ├── subscripciones-manager.js [CRUD suscripciones]
│   ├── billing-manager.js        [CRUD billing]
│   ├── usuarios-manager.js       [CRUD usuarios]
│   └── utils.js                  [Utilidades comunes]
├── clientes/
│   ├── index.html                [Listado clientes]
│   ├── detalle.html
│   └── form.html
├── subscripciones/
│   ├── index.html
│   ├── detalle.html
│   └── form.html
├── billing/
│   ├── index.html
│   ├── facturas.html
│   └── reportes.html
├── usuarios/
│   └── index.html
└── functions/
    ├── crear-cliente-admin.js    [Cloud Function]
    ├── eliminar-cliente.js
    ├── generar-factura.js
    ├── renovar-suscripcion.js
    └── cambiar-plan.js
```

## 🔐 Seguridad

### Autenticación
- Solo usuarios admin (email domain: @trafico-map.admin)
- Custom claims: `role: "admin"` en Firebase Auth

### Autorización
- Roles: `admin` (full access), `operator` (read-only), `billing` (billing only)
- Firestore Rules: Solo admin puede leer/escribir

### Datos Sensibles
- API keys de clientes: Nunca mostrar completos en frontend
- Billing: Encriptado en tránsito (HTTPS)
- Logs de auditoría: Quién hizo qué y cuándo

## 🚀 Roadmap Fase 2C

### Hito 1: MVP Dashboard (3-4 horas)
- [ ] Auth admin funcional
- [ ] Dashboard básico con 4-5 métricas clave
- [ ] Layout responsive Bootstrap
- [ ] Firebase config para admin

### Hito 2: Gestión de Clientes (4-5 horas)
- [ ] Listado de clientes
- [ ] Crear cliente (integración con crear-cliente.ps1)
- [ ] Ver detalle cliente
- [ ] Editar cliente
- [ ] Eliminar cliente

### Hito 3: Gestión de Suscripciones (3-4 horas)
- [ ] Listado de suscripciones
- [ ] Ver detalle suscripción
- [ ] Cambiar plan
- [ ] Renovar suscripción

### Hito 4: Billing (3-4 horas)
- [ ] Generar facturas automáticamente
- [ ] Listado de facturas
- [ ] Reportes de ingresos

### Hito 5: Polish y Deploy (2-3 horas)
- [ ] Testing completo
- [ ] Documentación
- [ ] Deploy a Firebase Hosting
- [ ] Configurar dominio admin.trafico-map-general-v2.web.app

## 📊 Tecnologías Específicas

### Frontend
- **Bootstrap 5**: Responsive, moderno
- **Chart.js**: Gráficos simples y efectivos
- **Moment.js**: Manejo de fechas
- **Firebase SDK**: Autenticación y Firestore

### Backend (Cloud Functions)
- **Node.js 18+**
- **express.js** (opcional, para REST API)
- **firebase-admin**: Admin SDK
- **node-pdf**: Generar facturas PDF

### Hosting
- **Firebase Hosting**: Misma instancia admin

## 🎯 Prioridades

**HIGH PRIORITY:**
1. Login funcional
2. Dashboard con métricas
3. Listado y crear clientes
4. Gestión de suscripciones

**MEDIUM PRIORITY:**
5. Billing y facturas
6. Reportes
7. Usuarios admin

**LOW PRIORITY:**
8. Integración con Stripe/MercadoPago
9. SMS notifications
10. Webhooks de eventos

## 📝 Próximos Pasos

1. **Crear estructura base** en `/admin/`
2. **Implementar auth admin** (Firebase Auth)
3. **Crear dashboard MVP** (HTML + CSS + JS)
4. **Conectar a Firestore** (trafico-map-general-v2)
5. **Implementar CRUD clientes**
6. **Testing y documentación**
7. **Deploy a Firebase Hosting**

## 📚 Referencias

- [Firebase Console Admin](https://console.firebase.google.com/project/trafico-map-general-v2)
- [Bootstrap 5 Docs](https://getbootstrap.com)
- [Chart.js Docs](https://www.chartjs.org)
- [Firebase Admin SDK](https://firebase.google.com/docs/admin/setup)

---

**Siguiente:** Crear estructura base de `/admin/` y auth funcional

**Estado:** Listo para comenzar implementación
