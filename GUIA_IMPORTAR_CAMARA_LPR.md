# 🚨 Guía Completa: Importar Cámaras LPR y Escuelas en TraficoMap

## 1. CÁMARAS PÚBLICAS CON LPR (Lectores de Patentes)

### ✅ Formato Correcto (CSV)

Tu archivo **`camaras_cordoba_ejemplo.csv`** está perfecto. Debe tener estas columnas:

```csv
camera_number,lat,lng,address,barrio,ubicacion,domes,fixed,lpr
100,-31.4158,-64.1881,9 de Julio 250,Centro,Municipalidad,2,1,1
101,-31.4136,-64.1929,Vélez Sársfield 1200,Centro,Banco Hipotecario,1,2,0
102,-31.4178,-64.1863,Rivadavia 550,Centro,Centro Comercial,1,1,1
```

### 📋 Explicación de Columnas

| Columna | Tipo | Ejemplo | Obligatorio | Descripción |
|---------|------|---------|-------------|-------------|
| `camera_number` | TEXT/INT | 100 | ✅ SÍ | ID único de la cámara |
| `lat` | DECIMAL | -31.4158 | ✅ SÍ | Latitud (coordenada) |
| `lng` | DECIMAL | -64.1881 | ✅ SÍ | Longitud (coordenada) |
| `address` | TEXT | "9 de Julio 250" | ✅ SÍ | Dirección completa |
| `barrio` | TEXT | "Centro" | ✅ SÍ | Nombre del barrio |
| `ubicacion` | TEXT | "Municipalidad" | ❌ NO | Lugar/edificio |
| `domes` | INT | 1 o 2 | ❌ NO | Cantidad de dómos |
| `fixed` | INT | 1 o 2 | ❌ NO | 1=Fijo, 2=Móvil |
| **`lpr`** | **INT** | **1 o 0** | ✅ **SÍ** | **1=Tiene LPR, 0=Sin LPR** |

### 🔑 COLUMNA LPR - Lo Más Importante

```
lpr = 1  → Cámara CON Lector de Patentes (mostrará selector LPR)
lpr = 0  → Cámara SIN Lector de Patentes (cámara normal)
```

**Ejemplo Real en Excel/Google Sheets:**

```
camera_number | lat       | lng       | address           | barrio   | ubicacion         | domes | fixed | lpr
100           | -31.4158  | -64.1881  | 9 de Julio 250    | Centro   | Municipalidad     | 2     | 1     | 1
101           | -31.4136  | -64.1929  | Vélez Sársfield 1 | Centro   | Banco Hipotecario | 1     | 2     | 0
102           | -31.4178  | -64.1863  | Rivadavia 550     | Centro   | Centro Comercial  | 1     | 1     | 1
```

### 🎯 Si Quieres Agregar LPR a Mar del Plata

1. Abre: `public/data/cameras_cordoba.geojson`
2. En el navegador, ve a **"Mostrar Cámaras"** → aparecerá selector LPR si hay cámaras con `"lpr": 1`
3. Las 6 primeras cámaras de Córdoba YA tienen LPR activado ✅

---

## 2. CÁMARAS PRIVADAS

Las cámaras privadas tienen **diferente estructura** y NO incluyen columna `lpr`:

```csv
lat,lng,nombre,propietario,zona,tipo_cobertura
-31.4158,-64.1881,Cámara Banco Macro,Banco Macro,Centro,Frente y lateral
-31.4145,-64.1875,Cámara Banco Santander,Banco Santander,Centro,Frente y cajas
```

### ⚠️ ¿Pueden tener LPR las privadas?

Sí, pero debes **agregar la columna `lpr`**:

```csv
lat,lng,nombre,propietario,zona,tipo_cobertura,lpr
-31.4158,-64.1881,Cámara Banco Macro,Banco Macro,Centro,Frente y lateral,1
-31.4145,-64.1875,Cámara Banco Santander,Banco Santander,Centro,Frente y cajas,0
```

---

## 3. ESCUELAS / COLEGIOS

### 📍 ¿Dónde está el archivo de escuelas de Mar del Plata?

**NO EXISTE AÚN.** Necesitas crearlo. Aquí te dejo el **formato correcto**:

### ✅ Formato para Escuelas (CSV)

```csv
id,lat,lng,nombre,tipo,direccion,barrio,telefono,correo
1,-38.0125,-57.5485,Escuela N° 1 "San Martín",Primaria,Avenida Luro 2300,Centro,223-4567890,escuela1@mardelplata.gov.ar
2,-38.0145,-57.5495,Colegio Privado "La Salle",Privada,Calle 9 1500,Centro,223-4567891,lasalle@mdp.edu.ar
3,-38.0165,-57.5505,Escuela N° 10 "Moreno",Primaria,Avenida Colón 3200,Zona Sur,223-4567892,escuela10@mardelplata.gov.ar
```

### 📋 Columnas para Escuelas

| Columna | Tipo | Ejemplo | Obligatorio |
|---------|------|---------|-------------|
| `id` | INT | 1 | ✅ SÍ |
| `lat` | DECIMAL | -38.0125 | ✅ SÍ |
| `lng` | DECIMAL | -57.5485 | ✅ SÍ |
| `nombre` | TEXT | "Escuela N° 1 San Martín" | ✅ SÍ |
| `tipo` | TEXT | "Primaria", "Secundaria", "Privada" | ✅ SÍ |
| `direccion` | TEXT | "Avenida Luro 2300" | ✅ SÍ |
| `barrio` | TEXT | "Centro", "Zona Sur" | ✅ SÍ |
| `telefono` | TEXT | "223-4567890" | ❌ NO |
| `correo` | TEXT | "escuela1@mdp.gov.ar" | ❌ NO |

### 🔄 Cómo Importar Escuelas en la App

1. Ve a **"Importar Nueva Ciudad"** en la app
2. Usa este archivo CSV con la estructura anterior
3. O si quieres que sea GeoJSON:

```json
{
  "type": "FeatureCollection",
  "features": [
    {
      "type": "Feature",
      "geometry": {
        "type": "Point",
        "coordinates": [-57.5485, -38.0125]
      },
      "properties": {
        "nombre": "Escuela N° 1 San Martín",
        "tipo": "Primaria",
        "direccion": "Avenida Luro 2300",
        "barrio": "Centro",
        "telefono": "223-4567890",
        "correo": "escuela1@mardelplata.gov.ar"
      }
    }
  ]
}
```

---

## 4. RESUMEN DE ARCHIVOS QUE YA TIENES ✅

```
✅ cameras_cordoba.geojson               → 6 cámaras con LPR (Córdoba)
✅ camaras_cordoba_ejemplo.csv           → Formato correcto de públicas
✅ camaras_privadas_cordoba_ejemplo.csv  → Formato privadas
✅ barrios_cordoba_ejemplo.geojson       → Barrios/zonas (Córdoba)
✅ semaforos_cordoba_ejemplo.csv         → Semáforos (Córdoba)
✅ colegios_escuelas.geojson             → 46 escuelas/colegios de Mar del Plata ⭐
✅ corredores_escolares.geojson          → 23 corredores escolares de Mar del Plata ⭐
```

### 🎓 Escuelas y Corredores Escolares de Mar del Plata

**Ubicación:** `public/colegios_escuelas.geojson` y `public/corredores_escolares.geojson`

**Contenido:**
- **46 Colegios/Escuelas** con coordenadas y nombres
- **23 Corredores Escolares** (rutas seguras a escuelas)

**Formato GeoJSON:** ✅ Correcto
- Cada escuela es un **Point** (punto)
- Cada corredor es una **LineString o Polygon** (línea o área)
- Propiedades: `Name`, `description`

**Ejemplo de estructura:**
```json
{
  "type": "Feature",
  "properties": {
    "Name": "Juramento 961 - C. Nº1",
    "description": null
  },
  "geometry": {
    "type": "Point",
    "coordinates": [-57.559768, -38.040143]
  }
}
```

---

## 5. PASOS PARA CREAR ARCHIVO DE ESCUELAS

### Opción A: Google Sheets (Recomendado)

1. Crea nueva Sheet
2. Agrega columnas: `id, lat, lng, nombre, tipo, direccion, barrio, telefono, correo`
3. Llena con datos de escuelas de Mar del Plata
4. Descarga como CSV (File → Download → CSV)
5. Sube en "Importar Nueva Ciudad" como archivo de escuelas

### Opción B: Excel

1. Crea tabla con las columnas anteriores
2. Guarda como **CSV (Delimitado por comas)** 
3. Verifica que esté en UTF-8 (sin BOM)

---

## 6. VALIDACIÓN: ¿Tu CSV está bien?

Usa estos criterios:

✅ **Separador**: Comas (`,`)  
✅ **Encoding**: UTF-8 (sin BOM)  
✅ **Sin espacios extras** al inicio/final  
✅ **Latitud/Longitud válidas**: En rango correcto (lat: -90 a 90, lng: -180 a 180)  
✅ **Columnas obligatorias**: presentes y sin tildes raras  

**Test:** Abre el CSV en Google Sheets → si ve bien las columnas y datos → está correcto ✅

---

## 📞 Ayuda Rápida

| Pregunta | Respuesta |
|----------|-----------|
| ¿`lpr=1` o `lpr="1"`? | Ambos funcionan, pero INT (número) es más limpio |
| ¿Puedo dejar `lpr` vacío? | No, debe ser 0 o 1. Si no sé, poner 0 |
| ¿Se puede cambiar nombre de columnas? | No, deben ser exactos (lat, lng, lpr, etc.) |
| ¿Cuántas cámaras máximo? | Sin límite, pero >10000 puede ser lento |
| ¿Coordenadas en grados/minutos/segundos? | NO, solo decimales (ej: -31.4158) |

Cualquier duda, avísame 👍
