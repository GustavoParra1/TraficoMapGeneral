# 🔧 DEBUG UPLOAD - INSTRUCCIONES

## Paso 1: Abre el panel del cliente

Url: https://trafico-map-general-v2.web.app/client/

Email: admin@laplatamaps.com.ar
Contraseña: ***

## Paso 2: Abre la Consola del Browser
Presiona: **F12** → Tab "Console"

Verás todos los logs del sistema.

## Paso 3: Navega a "Cargar Datos"
Click en la solapa "Cargar Datos" en el panel izquierdo.

En la consola deberías ver:
```
🔧 Encontrados 10 upload-areas
  [0] uploadBarrios -> data-type: barrios
  [1] uploadCamarasPublicas -> data-type: cameras_public
  ...
✅ Upload events attached
```

## Paso 4A: Test Upload (Click)
1. Click en cualquier área de upload (ej: Cámaras Públicas)
2. Selecciona un archivo CSV
3. En la consola verás línea por línea qué ocurre:

```
📁 ===== UPLOAD INICIADO =====
📁 Archivo: tu_archivo.csv
📁 Tipo: cameras_public
📁 Tamaño: 12345 bytes
...
📁 Datos parseados: 50 registros
💾 saveDataToFirestore iniciado
💾 clientId: XXXXXX
💾 collectionName: cameras
💾 registros a guardar: 50
💾 Guardando registro 1/50: {lat: -34.92, lng: -57.95, ...}
  ✅ Registro 1 guardado
...
✅ ===== UPLOAD COMPLETADO =====
```

## Paso 4B: Test Drag & Drop
1. Arrastra un archivo CSV hacia cualquier área
2. Suelta el archivo
3. Mira los logs en consola (igual que arriba)

## Si hay ERROR:
El error aparecerá en rojo:
```
❌ Error en upload: Permission denied...
❌ Error code: permission-denied
❌ Error message: ...
```

## Limpiar datos viejos (18 cameras Mar del Plata)

Ejecuta ESTO en la consola del browser:

```javascript
// Script para limpiar cameras viejas
const clientId = clientDashboard.clientData.id;
const db = firebase.firestore();
const camerasRef = db.collection(`clientes/${clientId}/cameras`);

camerasRef.get().then(snapshot => {
  let count = 0;
  snapshot.forEach(doc => {
    doc.ref.delete().then(() => {
      count++;
      console.log(`✅ Eliminado: ${doc.id}`);
    });
  });
  console.log(`🗑️ Eliminando ${snapshot.size} cameras viejos`);
});
```

O más simple, desde la Consola de Firebase (Admin Panel):
1. Ve a Admin → Firestore
2. Navigate a `clientes > [clientId] > cameras`
3. Selecciona todos los documentos
4. Click Delete

## Archivo de prueba

Hay un archivo GeoJSON de línea 542 de colectivos:
`trafico-map-general-v2/public/data/linea542.geojson`

Lo puedes usar para probar:
1. Iren a "Cargar Datos" → "Líneas de Colectivos"
2. Arrastra el archivo o click para seleccionar
3. Upload should work! ✅

## Si TODO funciona:

```
Esperado QUE VEAS en consola:
- 10 upload-areas encontradas ✅
- Click/Drop/Change events disparándose ✅
- GeoJSON/CSV parseado correctamente ✅
- Data saved to Firestore ✅
- Success alert en la UI ✅
```

## Próximas acciones después del test:

1. ✅ Confirmar que upload funciona
2. ✅ Limpiar datos viejos de Mar del Plata
3. 📁 Cargar datos correctos de La Plata
4. 🗺️ Verificar que el mapa muestre La Plata (no Mar del Plata)
5. ⚙️ Continuar con otras features

---

**Nota**: Todo el logging usa emojis para fácil identificación en la consola.
