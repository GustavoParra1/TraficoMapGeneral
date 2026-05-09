# 🔧 Admin Panel - Guía de Solución de Problemas

## ❌ Si el admin panel **no carga los clientes** o falla con permisos

### 1️⃣ **Opción Rápida: Force Refresh**
Ve a: https://trafico-map-general-v2.web.app/admin/force-refresh.html

Esto va a:
- 🧹 Limpiar caché del navegador
- 🗑️ Borrar localStorage/sessionStorage
- 🔄 Recargar el admin desde cero

### 2️⃣ **Opción Manual: Limpiar manualmente**
1. En Chrome/Edge: `Ctrl+Shift+Delete` (Eliminar datos de navegación)
2. Marca:
   - ✅ Cookies
   - ✅ Imágenes y archivos almacenados en caché
   - ✅ Almacenamiento local
3. Selecciona "Todos los tiempos"
4. Haz clic en "Eliminar datos"

### 3️⃣ **Usar Incógnita**
Si sigue fallando:
1. Abre una ventana **Incógnita** (Ctrl+Shift+N)
2. Ve a: https://trafico-map-general-v2.web.app/admin
3. Login con: `admin@trafico-map.com`

## ✅ Verificación del Backend

Para verificar que todo está configurado correctamente en el backend, ejecuta:

```bash
node fix-admin-panel.cjs
```

Esto te mostrará:
- ✅ Claims del admin
- ✅ Acceso a clientes en Firestore
- ✅ Estado de La Plata Maps

## 🔍 Debugging

### Ver Console del Navegador
1. F12 (u Ctrl+Shift+I)
2. Ve a la pestaña "Console"
3. Verás logs detallados, p.ej:
   - `✅ Clientes cargados exitosamente: 1`
   - `❌ ERROR DE PERMISOS`

### Common Issues

| Error | Solución |
|-------|----------|
| `Missing or insufficient permissions` | Firestore Rules: verifica que permitan `isAdmin()` |
| `Auth token expired` | Logout y login nuevamente, o usa force-refresh |
| `No custom claims` | Espera 2-3 minutos después de crear el admin |
| `Blank page` | Usa force-refresh.html o abre en incógnita |

## 📋 Checklist de Configuración

- [ ] El usuario `admin@trafico-map.com` existe en Firebase Auth
- [ ] Tiene custom claim `role: admin`
- [ ] Firestore Rules permiten lectura de `/clientes/{document=**}` para admins
- [ ] La Plata Maps existe en `/clientes/laplatamaps-52a3b`
- [ ] Estado es `activo`

## 🚀 Deploy

Para desplegar cambios en el admin:

```bash
firebase deploy --only hosting
```

o usa la tarea en VS Code:
```
Ctrl+Shift+B → Firebase Deploy
```
