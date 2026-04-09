# TraficoMap General - Sistema de Monitoreo Municipal SaaS

**Plataforma de monitoreo de tráfico para municipios. Búsqueda de direcciones con Google Maps, análisis geográfico y visualización interactiva.**

---

## 🎯 Características

- 📍 **Mapeo interactivo** con Leaflet.js + Google Maps Geocoding
- 🔍 **Búsqueda inteligente** - Encuentra calles e intersecciones con precisión
- 🔥 **Mapa de calor** de siniestros (densidad visualization)
- 🎥 **Cámaras** públicas y privadas en tiempo real
- 📊 **Filtros avanzados** por año, causa, participantes, horarios
- 🌍 **Multi-municipio** - Cada municipio con su propia cuenta y datos
- 🎨 **Interfaz moderna** y responsive
- ⚡ **Performance** optimizado con clustering
- 🔐 **Autenticación** Firebase por municipio
- 💰 **Monitoreo de costos** Google Maps API

---

## 📋 DATOS SOPORTADOS

### Siniestros (Traffic Accidents)
- **Opción A:** CSV con Latitud/Longitud directo ⭐
- **Opción B:** CSV con Camera ID lookup
- **Opción C:** GeoJSON

### Cámaras Públicas
- Coordenadas GPS
- Tipos: Municipal, Escolar, Seguimiento, Privada
- Equipamiento: Domos, Fijas, LPR
- Información: Barrio, Corredor, Monitoreo

### Cámaras Privadas
- Establecimientos (escuelas, comercios, etc.)
- Nombre, tipo, ubicación
- Búsqueda por barrio

### Semáforos
- Estado activo/inactivo
- Intersecciones
- Distribución geográfica

### Barrios/Zonas
- **REQUERIDO:** GeoJSON con polígonos
- Filtrado geográfico
- Análisis por zona

---

## 🚀 INICIO RÁPIDO

### 1. Preparar datos

Ver: [GUIA_IMPORTAR_DATOS.md](GUIA_IMPORTAR_DATOS.md)

Ejemplos disponibles:
- `EJEMPLO_siniestros_con_coords.csv`
- `EJEMPLO_cameras_publicas.csv`
- `EJEMPLO_cameras_privadas.csv`
- `EJEMPLO_semaforos.csv`
- `EJEMPLO_barrios.geojson`

### 2. Convertir a GeoJSON

```bash
python convert-csv-to-geojson.py
```

Output:
```
📊 Fuentes de coordenadas:
   📍 Desde CSV directo: X
   🎥 Desde Camera ID: Y
   ❌ Fallback: Z
```

### 3. Importar en aplicación

Botón: **➕ Importar Nueva Ciudad**

- Nombre de ciudad
- Archivos: Barrios, Siniestros, Cámaras
- Capas opcionales: Semáforos, Colegios, etc.

---

## 📊 ESTRUCTURA DE DATOS

### Siniestros (CSV con coords)
```csv
lat,lng,nombre,tipo,fecha,barrio,descripcion
-38.0055,-57.5521,Siniestro 1,choque,15/01/2024,Centro,...
```

### Cámaras Públicas (CSV)
```csv
camera_number,lat,lng,address,barrio,type,domes,fixed,lpr
100,-38.0055,-57.5521,Mitre 1200,Centro,Pública (Municipal),1,2,1
```

### Barrios (GeoJSON)
```json
{
  "type": "Feature",
  "geometry": {
    "type": "Polygon",
    "coordinates": [[[-57.55, -38.00], ...]]
  },
  "properties": {"nombre": "Centro"}
}
```

---

## 🎨 VISUALIZACIÓN

### Marcadores de Siniestros
- Cluster groups automáticos
- Colores por causa (20 tipos diferentes)
- Popups con: causa, fecha, hora, dirección, barrio, participantes

### Iconos de Cámaras
- **Tamaño:** 24px (refinado, no invasivo)
- **Bordes:** Negro tenue (1px, 20% opacidad)
- **Números:** Font weight 300 (delicado)
- **Verde esmeralda:** #77DD99

### Mapa de Calor
- Gradiente: Azul (baja) → Rojo (alta densidad)
- Toggle en panel lateral: 🔥 Mapa de Calor

---

## 🔧 TECNOLOGÍA

### Frontend
- **Leaflet.js** - Mapeo interactivo
- **Leaflet MarkerCluster** - Clustering automático
- **Leaflet Heat** - Mapas de calor
- **Firebase Auth** - Autenticación
- **Vanilla JavaScript** - Sin frameworks

### Backend
- **Node.js + Express** (opcional)
- **Firebase Hosting** - Deployment
- **Python** - Conversion CSV→GeoJSON

### Data
- **GeoJSON** - Formato principal
- **CSV** - Importación flexible
- **PostGIS** - Queries geográficas (punto en polígono)

---

## 📁 ESTRUCTURA DEL PROYECTO

```
TraficoMapGeneral/
├── public/
│   ├── data/
│   │   ├── siniestros_con_ubicacion.geojson
│   │   ├── cameras.geojson
│   │   ├── barrios.geojson
│   │   └── semaforos.geojson
│   ├── js/
│   │   ├── app.js              # Principal
│   │   ├── siniestros-layer.js # Siniestros + filtros
│   │   ├── cameras-layer.js    # Cámaras públicas
│   │   ├── heatmap-layer.js    # 🔥 Mapa de calor
│   │   └── [otros módulos]
│   ├── css/
│   │   └── style.css
│   └── index.html
├── convert-csv-to-geojson.py   # ⭐ Script conversión
├── GUIA_IMPORTAR_DATOS.md      # Documentación
├── EJEMPLO_*.csv               # Ejemplos
└── package.json
```

---

## 🔄 FLUJO DE IMPORTACIÓN

```
CSV/GeoJSON
    ↓
convert-csv-to-geojson.py (flexible coords)
    ├→ Lee CSV (múltiples encodings)
    ├→ Busca Latitud/Longitud directo ⭐
    ├→ Si no: Camera ID lookup
    ├→ Si no: Fallback [0,0]
    ↓
siniestros_con_ubicacion.geojson
    ↓
Firebase (deploy)
    ↓
Mapa (carga GeoJSON + cache busting)
    ↓
Renderiza clusters + heatmap
```

---

## 📊 ESTADÍSTICAS

### Mar del Plata (actual)
- ✅ 3,797 siniestros (Camera ID lookup)
- ✅ 693 cámaras públicas
- ✅ 423 cámaras privadas
- ✅ 1,335 semáforos
- ✅ 124 barrios/zonas

---

## ⚙️ CONFIGURACIÓN

### Firebase
```javascript
// public/js/firebase-config.js
var firebaseConfig = {
  apiKey: "...",
  authDomain: "...",
  projectId: "trafico-map-general-v2"
};
```

### Ciudades
```javascript
// Agregar en import-cities.js
const cityConfigs = {
  'cordoba': {
    name: 'Córdoba',
    center: [-31.4135, -64.1811],
    zoom: 12,
    files: {
      barrios: 'data/barrios_cordoba.geojson',
      siniestros: 'data/siniestros_cordoba.geojson',
      cameras: 'data/cameras_cordoba.geojson'
    }
  }
};
```

---

## 🚀 DEPLOY

### Firebase
```bash
firebase login
firebase deploy --only hosting
```

### Local Development
```bash
# Convertir datos
python convert-csv-to-geojson.py

# Servir local
npx http-server public/

# O con Firebase
firebase serve
```

---

## 🛠️ DESARROLLO

### Agregar nuevo tipo de datos

1. Crear módulo en `public/js/nuevo-layer.js`
2. Seguir patrón: `init()`, `load()`, `toggle()`, `render()`
3. Cargar en `app.js`: `NuevoLayer.init(map)`
4. Agregar checkbox en HTML/app.js

### Mejorar rendimiento

- Clustering automático (MarkerCluster)
- Cache busting: `?t=timestamp`
- WebWorkers para procesamiento pesado
- Índices geográficos (PostGIS)

### Debugging

Logs en consola:
```
✅ Layer inicializado
🔄 Cargando datos
📍 3797 features renderizados
🎯 Toggle(false): removiendo...
```

---

## 📞 SOPORTE

### Problemas comunes

| Problema | Solución |
|----------|----------|
| Siniestros en [0,0] | Agregar lat/lng o camera ID |
| Encoding corrupto | Guardar CSV como UTF-8 |
| Caché antigua | Cache busting automático |
| Barrios no filtran | Cargar GeoJSON primero |

Ver: [GUIA_IMPORTAR_DATOS.md](GUIA_IMPORTAR_DATOS.md#-solucionar-problemas)

---

## 📝 LICENCIA

Proyecto municipal - Uso interno

---

**Última actualización:** Abril 2026  
**Versión:** 2.0 (Coordenadas flexibles)  
**Base de datos:** Mar del Plata (3,797 siniestros)
