# Datos de Ejemplo - La Plata

Este directorio contiene 50 registros de ejemplo para cada tipo de dato que puedes subir desde el panel de cliente.

## Archivos Incluidos

- **cameras_publicas.csv** - 50 cámaras públicas distribuidas en 5 barrios
- **cameras_privadas.csv** - 50 cámaras privadas con propietarios
- **siniestros.csv** - 50 siniestros viales con ubicaciones variadas
- **semaforos.csv** - 50 semáforos por barrio

## Cómo Hacer Pruebas

### 1. Ir al Panel de Cliente
```
https://trafico-map-general-v2.web.app/client/
```

### 2. Acceder con Credenciales de Cliente La Plata
- **Usuario**: laplata@ejemplo.com (o ID de cliente La Plata)
- **Contraseña**: (credencial del cliente)

### 3. Ir a "Cargar Datos"
- Click en la sección **"📥 Cargar Datos"** del panel
- Verás opciones para subir diferentes tipos de archivos

### 4. Subir los Archivos (Recomendado en este orden)

#### Opción A: CSV Individual
1. En el selector desplegable, selecciona el tipo de dato:
   - "Cámaras Públicas"
   - "Cámaras Privadas"
   - "Siniestros"
   - "Semáforos"

2. Arrastra y suelta el archivo `.csv` correspondiente
3. O click en el área para seleccionar el archivo manualmente
4. Observa el progreso de la carga en la barra verde
5. Verás confirmación: "✅ 50 registros guardados"

#### Opción B: Subir Todo a la Vez
1. Prepara los 4 archivos CSV
2. En drag&drop, suelta los 4 archivos juntos
3. El sistema los detectará automáticamente por nombre

### 5. Abrir el Mapa y Verificar
1. Click en **"Ver Mapa"** o **"📍 Abrir Mapa"**
2. Se abrirá en ventana nueva la vista del mapa
3. **VERIFICAR**: Los datos aparecerán automáticamente:
   - ✅ Checkboxes de capas se marcan automáticamente
   - ✅ Marcadores/líneas aparecen en el mapa
   - ✅ Clústers se forman en centros urbanos

### 6. Interactuar con los Datos

**Con los checkboxes puedes:**
- ✓ Mostrar/ocultar cada capa (cámaras, siniestros, etc.)
- ✓ Filtrar por barrio
- ✓ Buscar por dirección
- ✓ Ver detalles en popup al hacer click

**Herramientas disponibles:**
- Zoom: rueda del mouse o botones +/-
- Panthers: drag del mouse
- Satélite: switch en sidebar
- Heatmap: click en "Mapa de Calor"

## Formatos Aceptados

### CSV
- **Columnas requeridas**: `lat`, `lng` (obligatorias)
- Otras columnas se guardan como propiedades
- Separador: coma (`,`)
- Encoding: UTF-8

### GeoJSON
- Estructura estándar GeoJSON FeatureCollection
- Soporta Punto, Polígono, LineString
- Se guardan con geometría completa

## Campos por Tipo

### Cámaras Públicas
```
nombre, tipo, direccion, barrio, lat, lng, estado
```
- **tipo**: dome | fixed | lpr
- **latitud/longitud**: Coordenadas en La Plata

### Cámaras Privadas
```
nombre, tipo, direccion, barrio, propietario, lat, lng, estado
```

### Siniestros
```
fecha, hora, tipo, causa, participantes, barrio, calle, numero, lat, lng, gravedad, lesionados, fallecidos
```
- **tipo**: Choque | Atropello | Vuelco
- **causa**: Exceso de Velocidad | No Respeto Semáforo | etc.

### Semáforos
```
nombre, ubicacion, tipo, barrio, estado, lat, lng
```
- **tipo**: Vehicular | Peatonal | Compuesto

## Coordenadas Base

La Plata está centrada en: **-34.921, -57.955**

Los datos de ejemplo están distribuidos en:
- **Centro**: -34.9210, -57.9550
- **Nordelta**: -34.9050, -57.9550
- **Sur**: -34.9350, -57.9550
- **Oeste**: -34.9210, -57.9700
- **Este**: -34.9210, -57.9400

## Consola del Navegador

Para verificar el flujo de datos, abre **F12** (DevTools) → **Console** y busca:

```
✅ Cargadas X cámaras desde GeoJSON
✅ X siniestros cargados
```

Si ves estos mensajes, ¡los datos se cargaron correctamente!

## Troubleshooting

### No aparecen datos en el mapa
1. Verifica que los checkboxes de las capas estén ✓ activos
2. Abre Console (F12) y busca errores rojos
3. Recarga la página (F5)
4. Verifica que el cliente tenga datos en Firestore

### Error "lat/lng no encontrados"
- Asegúrate que las columnas se llaman exactamente `lat` y `lng`
- No usar `LAT`, `Lat`, `latitude`, etc.

### Datos no persistentes después de recargar
- Los datos se guardan en Firestore automáticamente
- Si recargas la página, deben seguir ahí
- Si no, revisar permisos de Firestore

## Siguiente Paso

Una vez que compruebes que los datos se suben y cargan:
1. Verificar que los checkboxes funcionan (mostrar/ocultar capas)
2. Probar filtros por barrio
3. Probar búsqueda por dirección
4. Documentar cualquier error o comportamiento inesperado
