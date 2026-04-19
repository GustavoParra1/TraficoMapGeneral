# 📋 GUÍA: Agregar Datos de Robos a Nuevos Municipios

Esta guía explica cómo escalar el sistema de robos automotor a cualquier ciudad o municipio del país.

## 🏗️ Estructura General

El sistema de robos funciona con:
1. **Tabla CSV** con datos de robos (lat, lng, fecha, resultado, etc.)
2. **Configuración** en `cities-config.json` que asocia la tabla a una ciudad
3. **Capa interactiva** que renderiza los datos en el mapa

---

## 📊 Formato de Datos: Estructura CSV

### Columnas Requeridas (en este orden exacto):

```
lat,lng,fecha,resultado,observaciones,año
```

| Columna | Tipo | Ejemplo | Descripción |
|---------|------|---------|-------------|
| **lat** | float | -38.032577 | Latitud (coordenada Y) del robo |
| **lng** | float | -57.5876566 | Longitud (coordenada X) del robo |
| **fecha** | texto | 2023-01-15 | Fecha en formato YYYY-MM-DD |
| **resultado** | texto | Asiste Policia y Libera | Tipo de resultado/intervención |
| **observaciones** | texto (opcional) | Carasa | Notas, dirección, barrio o detalles |
| **año** | entero | 2023 | Año para filtrado rápido |

### Valores Válidos para "resultado":
```
- Intervencion Policial
- Policia Asiste y Libera
- Hallazgo de Automotor
- Sin Recurso Policial
- Seguimiento LPR
- LPR Detencion
- Otros (default si no especifica)
```

### Ejemplo de CSV (primeras 5 líneas):
```csv
lat,lng,fecha,resultado,observaciones,año
-38.032577,-57.5876566,2023-01-01,Asiste Policia y Libera,Carasa,2023
-38.012543,-57.5816004,2023-01-01,Asiste Policia y Libera,Solis,2023
-38.077284,-57.5496172,2023-01-02,Hallazgo de Automotor,Medrano,2023
-38.035406,-57.5910995,2023-01-03,Sin Recurso Policial,Calabria,2023
```

### Validación de Coordenadas:
- **Argentina**: lat entre -56 y -20, lng entre -75 y -50

---

## 🔧 Paso a Paso: Agregar Robos a una Nueva Ciudad

### PASO 1: Preparar el archivo CSV

**Formato esperado:**
```
✅ CORRECTO
-34.6037,−58.3816,2024-03-15,Asiste Policia y Libera,Centro,2024
-34.5952,−58.4133,2024-03-15,Hallazgo de Automotor,Microcentro,2024

❌ INCORRECTO (faltan columnas)
-34.6037,−58.3816,2024-03-15
```

**Archivo debe nombrarse así:**
```
public/data/robos_[ciudad].csv
```

**Ejemplos de nombres:**
- `robos_la-plata.csv`
- `robos_rosario.csv`
- `robos_mendoza.csv`
- `robos_cordoba.csv`

### PASO 2: Copiar archivo a la carpeta correcta

```
TraficoMapGeneral/
└── public/
    └── data/
        ├── robos_final.csv          ← Mar del Plata (actual)
        ├── robos_la-plata.csv       ← Nueva ciudad
        ├── robos_rosario.csv        ← Nueva ciudad
        └── ...
```

### PASO 3: Agregar entrada en cities-config.json

**Ubicación del archivo:**
```
public/data/cities-config.json
```

**Estructura de una ciudad:**
```json
{
  "id": "la-plata",                          // Identificador único (minúsculas, guiones)
  "name": "La Plata",                        // Nombre mostrado en la UI
  "country": "Argentina",
  "province": "Buenos Aires",                // Provincia
  "coordinates": {
    "lat": -34.9205,                         // Centro de la ciudad
    "lng": -57.9557
  },
  "zoom": 12,                                // Nivel de zoom inicial
  "files": {
    "barrios": "data/barrios.json",          // Obligatorio
    "siniestros": "data/siniestros.geojson", // Obligatorio
    "cameras": "data/cameras.geojson",       // Obligatorio
    "private_cameras": null                  // Puede ser null
  },
  "optionalLayers": {
    "semaforos": null,
    "colegios": null,
    "corredores": null,
    "aforos": null,
    "colectivos": null,
    "flujo": null,
    "robo": "data/robos_la-plata.csv",       // ⭐ AGREGAR ESTA LÍNEA
    "alertas": null,
    "zonas": null
  }
}
```

### PASO 4: Ejemplo Completo (Mar del Plata - Ya Implementado)

```json
{
  "id": "mar-del-plata",
  "name": "Mar del Plata",
  "country": "Argentina",
  "province": "Buenos Aires",
  "coordinates": {
    "lat": -38.0,
    "lng": -57.55
  },
  "zoom": 12,
  "files": {
    "barrios": "data/barrios.json",
    "siniestros": "data/siniestros_con_ubicacion.geojson",
    "cameras": "data/cameras.geojson",
    "private_cameras": "data/private-cameras.geojson"
  },
  "optionalLayers": {
    "semaforos": "data/semaforos.geojson",
    "colegios": "colegios_escuelas.geojson",
    "corredores": "corredores_escolares.geojson",
    "aforos": "data/aforos-mar-del-plata.csv",
    "colectivos": null,
    "flujo": null,
    "robo": "data/robos_final.csv",           // ⭐ Ruta al CSV de robos
    "alertas": null,
    "zonas": null
  }
}
```

---

## 📝 Ejemplo Completo: Agregar Robos a La Plata

### 1️⃣ Crear archivo CSV

**Archivo:** `public/data/robos_la-plata.csv`

```csv
lat,lng,fecha,resultado,observaciones,año
-34.9205,-57.9557,2024-01-15,Asiste Policia y Libera,Centro,2024
-34.9180,-57.9480,2024-01-15,Hallazgo de Automotor,Plaza Moreno,2024
-34.9295,-57.9620,2024-02-01,Sin Recurso Policial,Barrio Hipódromo,2024
-34.9100,-57.9400,2024-02-10,Intervencion Policial,Av. 7,2024
-34.9250,-57.9700,2023-11-20,Policia Asiste y Libera,San Martin,2023
-34.9150,-57.9550,2024-03-05,Seguimiento LPR,Centro Comercial,2024
```

### 2️⃣ Actualizar cities-config.json

Buscar la sección de ciudades y agregar:

```json
{
  "id": "la-plata",
  "name": "La Plata",
  "country": "Argentina",
  "province": "Buenos Aires",
  "coordinates": {
    "lat": -34.9205,
    "lng": -57.9557
  },
  "zoom": 12,
  "files": {
    "barrios": "data/la-plata/barrios.json",
    "siniestros": "data/la-plata/siniestros.geojson",
    "cameras": "data/la-plata/cameras.geojson",
    "private_cameras": "data/la-plata/private-cameras.geojson"
  },
  "optionalLayers": {
    "semaforos": null,
    "colegios": null,
    "corredores": null,
    "aforos": null,
    "colectivos": null,
    "flujo": null,
    "robo": "data/robos_la-plata.csv",
    "alertas": null,
    "zonas": null
  }
}
```

### 3️⃣ Deploy a Firebase

```bash
firebase deploy --only hosting
```

### 4️⃣ Resultado

✅ La Plata aparecerá en el selector de ciudades
✅ Se cargarán automáticamente los robos
✅ Se mostrarán en el mapa con filtros de año/resultado
✅ Heatmap activo para visualizar densidad

---

## 🎨 Colores de Resultados (automáticos)

El sistema coloreará automáticamente según el resultado:

```javascript
- Intervencion Policial     → 🔴 Rojo
- Policia Asiste y Libera   → 🟠 Naranja
- Hallazgo de Automotor     → 🟢 Verde
- Sin Recurso Policial      → 🟠 Naranja oscuro
- Seguimiento LPR           → 🔵 Azul
- LPR Detencion             → 🟢 Verde fluorescente
- Otros                     → ⚫ Gris
```

---

## ⚙️ Características Automáticas por Ciudad

Una vez agregado el CSV, los robos cargados automáticamente tendrán:

✅ **Filtro por Año** - 2023, 2024, Todos
✅ **Filtro por Resultado** - Todos los tipos de intervención
✅ **Mapa de Calor (Heatmap)** - Densidad visual de robos
✅ **Estadísticas Dinámicas** - Contador que cambia con filtros
✅ **Popups Interactivos** - Información al hacer clic
✅ **Filtro por Barrio** (si existen GeoJSON de barrios)

---

## 🔍 Checklist para Agregar una Nueva Ciudad

- [ ] Archivo CSV creado con 6 columnas exactas
- [ ] Nombre archivo: `data/robos_[ciudad].csv`
- [ ] Coordenadas válidas (Argentina: lat -56 a -20, lng -75 a -50)
- [ ] Fechas en formato YYYY-MM-DD
- [ ] Entrada agregada en `cities-config.json`
- [ ] Campo `robo` apunta a ruta correcta del CSV
- [ ] Ciudad tiene datos de barrios, siniestros, cámaras (obligatorio)
- [ ] Deploy a Firebase ejecutado
- [ ] Verificar en mapa que carga correctamente

---

## 🐛 Solución de Problemas

### Problema: No aparecen robos en el mapa

**Causas posibles:**
1. CSV con ruta incorrecta en cities-config.json
2. Columnas en orden incorrecto
3. Coordenadas fuera del rango de Argentina
4. Formato de fecha incorrecto (debe ser YYYY-MM-DD)

**Solución:**
- Verificar console del navegador (F12 → Console)
- Buscar logs: `🚗 RoboLayer` 
- Revisar que CSV sea válido con Python:
  ```python
  import pandas as pd
  df = pd.read_csv('public/data/robos_ciudad.csv')
  print(df.head())
  print(df.info())
  ```

### Problema: Heatmap no aparece

**Causas:**
1. Checkbox de heatmap no seleccionado
2. Pocos robos (< 10)

**Solución:**
- Clickear checkbox "Mapa de Calor"
- Verificar que hay suficientes registros

---

## 📞 Soporte

Para dudas sobre estructura de datos:
- Ver archivo actual: `public/data/robos_final.csv` (Mar del Plata)
- Revisar app.js líneas 370-400 para lógica de carga
- Consultar robo-layer.js para parsing automático

---

## 🚀 Próximas Mejoras (Futuro)

- [ ] Admin panel para subir CSV directamente
- [ ] Validación automática de CSV
- [ ] Export de datos filtrados
- [ ] Comparativa entre ciudades
- [ ] API para consultar robos por zona
