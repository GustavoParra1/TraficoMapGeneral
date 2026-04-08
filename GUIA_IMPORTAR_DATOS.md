# 📋 GUÍA COMPLETA: IMPORTAR DATOS A TRAFICOMAP

## 📌 ESTRUCTURA REQUERIDA POR TIPO DE DATO

---

## 1. 🛣️ SINIESTROS (Traffic Accidents/Events)

### Opción A: CSV CON COORDENADAS DIRECTAS ⭐ RECOMENDADO
```
Columnas REQUERIDAS:
- lat (Latitud: -90 a +90)
- lng (Longitud: -180 a +180)

Columnas OPCIONALES:
- nombre (nombre/descripción del siniestro)
- tipo (tipo de siniestro: choque, caída, etc.)
- fecha (formato: DD/MM/YYYY)
- descripcion (detalles adicionales)
```

**Ejemplo CSV:**
```csv
lat,lng,nombre,tipo,fecha,descripcion
-38.0055,-57.5521,Siniestro 1,choque,2024-01-15,Choque doble
-38.0060,-57.5535,Siniestro 2,caida,2024-01-16,Caída de moto
```

**Ubicación:** `public/data/siniestros_cordoba.csv`

---

### Opción B: CSV CON CAMERA ID LOOKUP (Si tienes cámaras cargadas)
```
Columnas REQUERIDAS:
- (Columna índice 1) Camera ID/Número (debe coincidir con tabla de cámaras)

Columnas OPCIONALES:
- nombre, tipo, fecha, descripcion (mismas que Opción A)
```

**Ejemplo CSV:**
```csv
orden,camera_id,barrio,siniestro,tipo,fecha
1,100,Centro,1,choque,2024-01-15
2,105,Zona Norte,1,caida,2024-01-16
```

**Nota:** Script busca camera ID en columna índice [1] (2ª columna)

---

### Opción C: GeoJSON
```json
{
  "type": "FeatureCollection",
  "features": [
    {
      "type": "Feature",
      "geometry": {
        "type": "Point",
        "coordinates": [-57.5521, -38.0055]
      },
      "properties": {
        "nombre": "Siniestro 1",
        "tipo": "choque",
        "fecha": "2024-01-15",
        "descripcion": "Detalles..."
      }
    }
  ]
}
```

---

## 2. 🎥 CÁMARAS PÚBLICAS

### CSV CON COORDENADAS:
```
Columnas REQUERIDAS:
- lat (Latitud)
- lng (Longitud)

Columnas RECOMENDADAS:
- camera_number (Número de cámara)
- address (Dirección)
- barrio (Barrio/Zona)
- type (Tipo: "Pública (Municipal)", "Privada", etc.)
- domes (Cantidad domos)
- fixed (Cantidad fijas)
- lpr (Cantidad LPR)
- corridor (Corredor/ruta)
- school_corridor (¿Es corredor escolar? true/false)
```

**Ejemplo:**
```csv
camera_number,lat,lng,address,barrio,type,domes,fixed,lpr,corridor
100,-38.0055,-57.5521,Mitre 1200,Centro,Pública (Municipal),1,2,1,Ruta 2
101,-38.0060,-57.5530,Rivadavia 800,Zona Norte,Pública (Municipal),2,1,0,Ruta 5
```

---

## 3. 🔒 CÁMARAS PRIVADAS

### CSV:
```
Columnas REQUERIDAS:
- lat (Latitud)
- lng (Longitud)

Columnas OPCIONALES:
- nombre (Nombre del establecimiento)
- address/ubicacion (Dirección)
- type/tipo (Tipo: escuela, comercio, etc.)
- barrio (Barrio)
```

**Ejemplo:**
```csv
nombre,lat,lng,address,barrio,tipo
Escuela 1,-38.0070,-57.5540,Avenida 9 de Julio,Centro,Escuela
Comercio ABC,-38.0055,-57.5525,Mitre 950,Centro,Comercio
```

---

## 4. 🚦 SEMÁFOROS

### CSV:
```
Columnas REQUERIDAS:
- lat (Latitud)
- lng (Longitud)

Columnas OPCIONALES:
- nombre (Identificación)
- estado (activo/inactivo)
- barrio (Barrio)
```

**Ejemplo:**
```csv
nombre,lat,lng,estado,barrio
Semáforo Mitre,1,-38.0055,-57.5521,activo,Centro
Semáforo Rivadavia,2,-38.0060,-57.5530,activo,Zona Norte
```

---

## 5. 📍 BARRIOS/ZONAS GEOGRÁFICAS

### GeoJSON REQUERIDO (polígonos):
```json
{
  "type": "FeatureCollection",
  "features": [
    {
      "type": "Feature",
      "geometry": {
        "type": "Polygon",
        "coordinates": [[[lng1, lat1], [lng2, lat2], ...]]
      },
      "properties": {
        "nombre": "Centro",
        "zona": "Zona 1",
        "color": "#FF0000"
      }
    }
  ]
}
```

**Notas:**
- Debe ser GEOJSON (no CSV)
- Los polígonos definen límites geográficos
- Usado para filtrado por ubicación

---

## 📊 TIPOS DE DATOS SOPORTADOS

| Campo | Tipo | Rango | Ejemplo |
|-------|------|-------|---------|
| **lat** | Float | -90 a +90 | -38.0055 |
| **lng** | Float | -180 a +180 | -57.5521 |
| **fecha** | String | DD/MM/YYYY | 15/01/2024 |
| **camera_id** | Integer | 1-9999 | 100 |
| **nombre** | String | Cualquier texto | "Siniestro Centro" |

---

## ⚠️ VALIDACIONES IMPORTANTES

✅ **Coordenadas:**
- Latitud: Entre -90 y +90
- Longitud: Entre -180 y +180
- Usar punto (.) como separador decimal, no coma

✅ **Fechas:**
- Formato: DD/MM/YYYY o YYYY-MM-DD
- El script las lee correctamente

✅ **Encoding:**
- CSV: UTF-8, Latin-1 o ISO-8859-1
- El script intenta múltiples encodings automáticamente

✅ **Nombres de columnas:**
- No importa mayúsculas/minúsculas
- Script busca variantes automáticamente

---

## 🚀 PRIORIDAD DE COORDENADAS

El script **`convert-csv-to-geojson.py`** usa este orden:

```
1️⃣ CSV Directo (Latitud/Longitud)  ⭐ MÁS EXACTO
   ↓
2️⃣ Camera ID Lookup (si existe tabla de cámaras)
   ↓
3️⃣ Fallback [0, 0] (última opción)
```

---

## 📁 ESTRUCTURA DE DIRECTORIOS

```
public/data/
├── barrios.geojson              (Polígonos geográficos)
├── siniestros_cordoba.csv       (o .geojson)
├── cameras_cordoba.csv          (o .geojson)
├── cameras_privadas_cordoba.csv (o .geojson)
├── semaforos_cordoba.csv        (o .geojson)
└── siniestros_con_ubicacion.geojson  (Generado por script)
```

---

## 🔄 PROCESO DE IMPORTACIÓN

1. **Preparar archivos CSV/GeoJSON** con estructura correcta
2. **Colocar archivos** en `public/data/`
3. **Ejecutar script:** `python convert-csv-to-geojson.py`
4. **Verificar output:**
   ```
   📊 Fuentes de coordenadas:
      📍 Desde CSV directo: X
      🎥 Desde Camera ID: Y
      ❌ Fallback: Z
   ```
5. **Usar botón "Importar Nueva Ciudad"** en la interfaz

---

## ✅ CHECKLIST ANTES DE IMPORTAR

- [ ] CSV/GeoJSON con estructura correcta
- [ ] Coordenadas válidas (-90 a +90 lat, -180 a +180 lng)
- [ ] Archivo GeoJSON de barrios cargado
- [ ] Encoding UTF-8 o Latin-1
- [ ] Sin valores duplicados en IDs
- [ ] Archivos en directorio correcto
- [ ] Script ejecutado exitosamente

---

## 🆘 SOLUCIONAR PROBLEMAS

| Problema | Causa | Solución |
|----------|-------|----------|
| Siniestros en [0,0] | Coords no encontradas | Agregar lat/lng directo o camera ID |
| Encoding corrupto | Archivo en formato incorrecto | Guardar como UTF-8 |
| "Camera no encontrada" | Camera ID no coincide | Verificar Numbers en tabla de cámaras |
| Barrios no filtran | GeoJSON de barrios falta | Cargar geometry de zonas primero |

---

**Versión:** 2.0  
**Última actualización:** Abril 2026  
**Script:** `convert-csv-to-geojson.py` (flexible coordinates)
