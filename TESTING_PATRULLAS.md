# 🧪 Testing Patrullas - Guía Rápida

## El Problema

El checkbox "🚓 Mostrar Patrullas" aparece pero no hay nada que mostrar porque:
- No hay usuarios patrulla creados en Firebase
- No hay datos en la colección `patrullas_{ciudad}`

## La Solución

Hemos agregado herramientas de testing para que veas el sistema funcionando **sin necesidad de dispositivo móvil**.

---

## 🚀 PASOS PARA VER FUNCIONAR (5 minutos)

### Paso 1: Abre el navegador
```
https://trafico-map-general-v2.web.app/
```

### Paso 2: Abre la consola
- **Windows/Linux**: `F12` → pestaña `Console`
- **Mac**: `Cmd+Option+I` → pestaña `Console`

### Paso 3: Copia y ejecuta este comando
```javascript
crearPatrullasPrueba()
```

**Deberías ver:**
```
🚓 INICIANDO CREACIÓN DE PATRULLAS DE PRUEBA...
📍 Ciudad actual: mar-del-plata

📝 Insertando en colección: patrullas_mar-del-plata
  ✓ PATRULLA_01: Lat=-38.000, Lng=-57.550, Online=true, Emergencia=false
  ✓ PATRULLA_02: Lat=-38.010, Lng=-57.540, Online=true, Emergencia=false
  ✓ PATRULLA_03: Lat=-37.990, Lng=-57.560, Online=true, Emergencia=true
  ✓ PATRULLA_04: Lat=-38.020, Lng=-57.530, Online=false, Emergencia=false

✅ PATRULLAS DE PRUEBA CREADAS EXITOSAMENTE
```

### Paso 4: Activa el checkbox
En el sidebar, marca: `☑️ 🚓 Mostrar Patrullas`

### Paso 5: ¡Deberías ver 4 markers en el mapa!

| Marker | Significado | Color |
|--------|-------------|-------|
| 🔵 PATRULLA_01 | Estacionada | Azul |
| 🔵 PATRULLA_02 | En patrullaje | Azul |
| 🔴 PATRULLA_03 | **EMERGENCIA** | Rojo (parpadeante) |
| ⚫ PATRULLA_04 | Sin conexión | Gris |

---

## 🎮 Comandos de Testing

### 1. Ver patrullas actuales
```javascript
verPatrullas()
```

Muestra tabla con todas las patrullas en Firestore:
```
📊 PATRULLAS ACTUALES EN FIRESTORE...
┌─────────────┬───────────┬───────────┬────────┬──────────┐
│ Patente     │ Lat       │ Lng       │ Online │ Estado   │
├─────────────┼───────────┼───────────┼────────┼──────────┤
│ PATRULLA_01 │ -38.0000  │ -57.5500  │ true   │ activo   │
│ PATRULLA_02 │ -38.0100  │ -57.5400  │ true   │ activo   │
│ PATRULLA_03 │ -37.9900  │ -57.5600  │ true   │ emergencia
│ PATRULLA_04 │ -38.0200  │ -57.5300  │ false  │ offline  │
└─────────────┴───────────┴───────────┴────────┴──────────┘
```

### 2. Simular movimiento
```javascript
simularMovimiento()
```

Las patrullas se moverán en el mapa durante 2 minutos:
- PATRULLA_02: Movimiento lento (patrullaje regular)
- PATRULLA_03: Movimiento rápido a 60 km/h (persecución)

### 3. Ver estado del sistema
```javascript
debugPatrullas.showStatus()
```

Muestra:
```
🔍 ESTADO DE PATRULLAS

patullaLayerExists:      true       ← Módulo cargado
patullaInstanceExists:   true       ← Instanciado
patullaLayerCount:       4          ← Total de patrullas
patullaLayerOnline:      3          ← Conectadas
patullaLayerEmergencia:  1          ← En emergencia
dbExists:                true       ← Firestore OK
mapExists:               true       ← Mapa OK
currentCity:             mar-del-plata
firebaseUser:            user@example.com
```

### 4. Probar conexión Firebase
```javascript
debugPatrullas.testConnection()
```

Respuesta esperada:
```
✅ Firestore accesible (4 docs en muestra)
```

### 5. Ver datos en Firestore para otra ciudad
```javascript
debugPatrullas.viewFirestoreData('cordoba')
```

(Primero cambia de ciudad en el selector para crear patrullas de Córdoba)

### 6. Limpiar datos de prueba
```javascript
limpiarPatrullasPrueba()
```

Elimina todas las patrullas de prueba:
```
🗑️ LIMPIANDO PATRULLAS DE PRUEBA...
  ✓ PATRULLA_01 eliminado
  ✓ PATRULLA_02 eliminado
  ✓ PATRULLA_03 eliminado
  ✓ PATRULLA_04 eliminado

✅ PATRULLAS DE PRUEBA ELIMINADAS
```

---

## 🐛 Panel de Debug Automático

En la esquina inferior derecha de la página aparece un pequeño panel que muestra:
- ✅/❌ PatullaLayer cargado
- Cantidad de patrullas
- Online count
- Emergencia count
- Errores (si los hay)

**Se actualiza automáticamente cada 2 segundos.**

---

## 📋 Checklist

- [ ] Abrir console (`F12`)
- [ ] Ejecutar `crearPatrullasPrueba()`
- [ ] Ver mensajes de éxito en console
- [ ] Activar checkbox "🚓 Mostrar Patrullas"
- [ ] Ver 4 markers en el mapa
- [ ] Ejecutar `simularMovimiento()` para ver movimiento
- [ ] Ejecutar `debugPatrullas.showStatus()` y verificar todo ✅
- [ ] Ver panel de debug en esquina inferior derecha

---

## 🚨 Si No Funciona

### Problema: "PatullaLayer is not defined"
**Solución:** Espera 5 segundos a que cargue la página, luego intenta de nuevo.

### Problema: "db is not defined"
**Solución:** Asegúrate de estar en https://trafico-map-general-v2.web.app/ (no localhost)

### Problema: Error "Missing Firestore"
**Solución:** 
```javascript
debugPatrullas.testConnection()
```
Si falla, verifica que estés logueado.

### Problema: Ver errores en rojo en consola
**Solución:** Ejecuta:
```javascript
debugPatrullas.showStatus()
```
Cópialo y pégalo en un mensaje.

---

## 🔍 Debug Avanzado

### Ver errores capturados
```javascript
debugPatrullas.showStatus()
// Mira la sección de errores
```

### Ver todo disponible
```javascript
debugPatrullas.help()
```

### Monitorear en tiempo real
Abre la consola y ejecuta:
```javascript
setInterval(() => debugPatrullas.showStatus(), 5000)
```

---

## 📞 Próximos Pasos Reales (Cuando esté listo)

Cuando veas que todo funciona:

1. **Crear usuarios patrulla reales** en Firebase Auth
2. **Testear app/patrulla-app/** con GPS real
3. **Testear /centro-control/** como despachador
4. **Integración con sistema de 911** (futuro)

---

**Ahora: ¡Ve a intentarlo! Abre la consola y ejecuta `crearPatrullasPrueba()`** 🚀
