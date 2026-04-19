# 📋 CHECKLIST: Agregar Robos a una Nueva Ciudad

## Resumen Rápido

Para agregar robos de una nueva ciudad solo necesitas:

1. ✅ **Archivo CSV** con datos de robos (`lat,lng,fecha,resultado,observaciones,año`)
2. ✅ **Actualizar** `cities-config.json` apuntando al CSV
3. ✅ **Hacer deploy** a Firebase

---

## 🔧 PASO A PASO

### PASO 1: Preparar el CSV

**Crear archivo:** `public/data/robos_[nombre_ciudad].csv`

**Estructura exacta:**
```csv
lat,lng,fecha,resultado,observaciones,año
-34.9205,-57.9557,2024-01-15,Asiste Policia y Libera,Centro,2024
-34.9180,-57.9480,2024-01-15,Hallazgo de Automotor,Plaza Moreno,2024
```

**Columnas (EXACTO ORDEN):**
1. `lat` - Latitud (número decimal)
2. `lng` - Longitud (número decimal)
3. `fecha` - Formato YYYY-MM-DD
4. `resultado` - Tipo de intervención
5. `observaciones` - Descripción/barrio (texto)
6. `año` - Año (número)

**Valores válidos para "resultado":**
- `Asiste Policia y Libera`
- `Hallazgo de Automotor`
- `Intervencion Policial`
- `Sin Recurso Policial`
- `Seguimiento LPR`
- `LPR Detencion`
- `Otros`

**Validar coordenadas:** Argentina está entre lat -56 a -20, lng -75 a -50

---

### PASO 2: Copiar archivo a carpeta

**Ubicación:**
```
TraficoMapGeneral/
└── public/
    └── data/
        └── robos_[ciudad].csv    ← AQUÍ
```

**Ejemplos:**
- `robos_la-plata.csv`
- `robos_rosario.csv`
- `robos_mendoza.csv`
- `robos_cordoba.csv`

---

### PASO 3: Actualizar cities-config.json

**Ubicación:** `public/data/cities-config.json`

**Buscar tu ciudad en el archivo. Si no existe, agregar:**

```json
{
  "id": "la-plata",                          // ID único (minúsculas, sin espacios)
  "name": "La Plata",                        // Nombre mostrado
  "country": "Argentina",
  "province": "Buenos Aires",                // Tu provincia
  "coordinates": {
    "lat": -34.9205,                         // Centro de la ciudad
    "lng": -57.9557
  },
  "zoom": 12,                                // Zoom por defecto (recomendado: 12)
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
    "robo": "data/robos_la-plata.csv",       // ⭐ RUTA AL CSV DE ROBOS
    "alertas": null,
    "zonas": null
  }
}
```

**O si la ciudad YA EXISTE, solo actualizar el campo `robo`:**

```json
"optionalLayers": {
  "robo": "data/robos_ciudad.csv"    // Cambiar esta línea
}
```

---

### PASO 4: Verificar estructura

**Asegurar que:**

- [ ] CSV tiene 6 columnas exactas
- [ ] CSV tiene encabezado: `lat,lng,fecha,resultado,observaciones,año`
- [ ] Todas las latitudes entre -56 y -20
- [ ] Todas las longitudes entre -75 y -50
- [ ] Fechas en formato YYYY-MM-DD
- [ ] Ciudad existe en cities-config.json CON datos de barrios/siniestros/cámaras
- [ ] Campo `robo` apunta a ruta correcta del CSV

---

### PASO 5: Deploy a Firebase

```bash
firebase deploy --only hosting
```

---

## ✅ RESULTADO ESPERADO

Una vez completados los pasos:

✅ Ciudad aparece en listado de ciudades
✅ Al seleccionar la ciudad, cargan automáticamente los robos
✅ Se ven marcadores de colores en el mapa
✅ Puedo hacer filtro por año (2023, 2024, Todos)
✅ Puedo hacer filtro por resultado (Asiste Policia, Hallazgo, etc.)
✅ Puedo activar "Mapa de Calor" para ver densidad

---

## 🎨 Colores Automáticos

No tienes que configurar nada, los colores se asignan automáticamente:

| Resultado | Color |
|-----------|-------|
| Intervencion Policial | 🔴 Rojo |
| Asiste Policia y Libera | 🟠 Naranja |
| Hallazgo de Automotor | 🟢 Verde |
| Sin Recurso Policial | 🟠 Naranja oscuro |
| Seguimiento LPR | 🔵 Azul |
| LPR Detencion | 🟢 Verde fluorescente |
| Otros | ⚫ Gris |

---

## 📊 Ejemplo Real: La Plata

### CSV: `public/data/robos_la-plata.csv`

```csv
lat,lng,fecha,resultado,observaciones,año
-34.9205,-57.9557,2024-01-15,Asiste Policia y Libera,Centro,2024
-34.9180,-57.9480,2024-01-15,Hallazgo de Automotor,Plaza Moreno,2024
-34.9295,-57.9620,2024-02-01,Sin Recurso Policial,Barrio Hipódromo,2024
```

### cities-config.json

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
    "robo": "data/robos_la-plata.csv"
  }
}
```

### Resultado

✅ La Plata carga automáticamente
✅ 3 robos visibles en el mapa
✅ Filtros por año y resultado funcionan
✅ Heatmap disponible

---

## 🔍 Troubleshooting

### Problema: No aparecen robos

**Verificar:**
1. CSV existe en `public/data/robos_ciudad.csv`
2. Ruta en cities-config.json es correcta
3. CSV tiene 6 columnas en orden exacto
4. Abrir F12 → Console para ver errores

**Logs esperados:**
```
🚗 RoboLayer inicializado
🚗 CSV cargado, tamaño: XXXX caracteres
🚗 Total de líneas: XXX
🚗 2802 robos cargados desde CSV
🚗 2802 robos renderizados
```

### Problema: Error "Expected 6 fields, got N"

**Causa:** CSV con columnas faltantes o mal separadas
**Solución:** Revisar que tenga exactamente 6 columnas y encabezado

### Problema: Robos aparecen pero en lugar incorrecto

**Causa:** Coordenadas invertidas (lat/lng al revés)
**Verificar:** Latitude siempre es Y (norte-sur), Longitude es X (este-oeste)

---

## 📞 Archivos de Referencia

- **Guía completa:** `GUIA_ROBOS_POR_MUNICIPIO.md`
- **CSV ejemplo:** `EJEMPLO_robos_la_plata.csv`
- **Config ejemplo:** `EJEMPLO_cities-config-COMPLETO.json`
- **CSV actual:** `public/data/robos_final.csv` (Mar del Plata)
- **Código carga:** `public/js/app.js` líneas 370-400
- **Parsing:** `public/js/robo-layer.js` líneas 100-250

---

## 🚀 Próximos Pasos

Una vez que domines esto, puedes:

- [ ] Agregar datos de tráfico (siniestros)
- [ ] Agregar datos de cámaras de vigilancia
- [ ] Crear comparativas entre ciudades
- [ ] Exportar reportes de robos por barrio
- [ ] Integrar API de datos en tiempo real
