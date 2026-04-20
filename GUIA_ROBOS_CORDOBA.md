# 📋 Guía: Importar Robos Automotor en Córdoba

## 1. Preparar los Datos

El archivo CSV debe tener la siguiente estructura con **EXACTAMENTE estas columnas**:

```csv
lat,lng,fecha,resultado,observaciones,año
```

### Especificaciones de cada columna:

| Columna | Tipo | Rango/Formato | Obligatorio | Descripción |
|---------|------|---------------|-------------|-------------|
| **lat** | Número | -31.1 a -31.6 | ✅ SÍ | Latitud (Sur Argentina) |
| **lng** | Número | -64.0 a -64.3 | ✅ SÍ | Longitud (Oeste Argentina) |
| **fecha** | Texto | YYYY-MM-DD | ⭕ Opcional* | Fecha del robo |
| **resultado** | Texto | Ver lista abajo | ⭕ Opcional | Tipo de resultado (define color) |
| **observaciones** | Texto | Cualquier texto | ⭕ Opcional | Barrio, dirección o notas |
| **año** | Número | 2020-2099 | ⭕ Opcional* | Año (se extrae de fecha si falta) |

**Nota:** Si no incluyes fecha, el año por defecto es 2024.

---

## 2. Valores Válidos para "resultado"

Usa **EXACTAMENTE** estos valores (respeta mayúsculas/minúsculas):

| Color | Valor | Ejemplo |
|-------|-------|---------|
| 🟠 Naranja | `Asiste Policia y Libera` | Policía llega y recupera el auto |
| 🟢 Verde | `Hallazgo Automotor` | Auto encontrado abandonado |
| 🔴 Rojo | `Persecucion Y Detencion` | Persecución que termina en detención |
| 🟣 Rojo Oscuro | `Detencion` | Solo detención sin persecución |
| 🔵 Azul | `Se Realiza Seguimiento del Evento` | Se sigue investigando |
| 💛 Amarillo | `No Asiste` | Policía no se presentó |
| 💜 Púrpura | `Secuestro De Vehiculo` | Vehículo fue incautado |
| 🟠 Naranja Oscuro | `Asiste Bomberos` | Intervención de bomberos |
| ⚫ Gris Oscuro | `Persecucion Y Perdida` | Persecución sin resultado |
| 🟢 Cian | `Asiste Unidad Sanitaria y Traslada` | Ambulancia fue llamada |
| ⚪ Gris | `Otros` | Para valores no listados |

---

## 3. Archivo de Ejemplo

Puedes descargar y usar como base el archivo:
👉 **[EJEMPLO_robos_cordoba.csv](../../data/EJEMPLO_robos_cordoba.csv)**

Contiene 25 registros de ejemplo con:
- Coordenadas reales de Córdoba
- Fechas de 2023 y 2024
- Todos los tipos de resultados posibles
- Barrios reales de la ciudad (Centro, Nueva Córdoba, Güemes, etc.)

---

## 4. Coordenadas de Referencia en Córdoba

Para ubicar tus robos, usa estas coordenadas aproximadas de barrios:

| Zona | Latitud | Longitud |
|------|---------|----------|
| **Centro** | -31.416 | -64.189 |
| **Nueva Córdoba** | -31.419 | -64.192 |
| **Barrio Güemes** | -31.432 | -64.198 |
| **Barrio San Vicente** | -31.420 | -64.170 |
| **Barrio Ituzaingó** | -31.435 | -64.188 |
| **Barrio Junín** | -31.414 | -64.187 |
| **Zona Industrial** | -31.425 | -64.175 |
| **Zona Sur** | -31.445 | -64.200 |

**Herramienta:** Usa Google Maps o OpenStreetMap para obtener coords exactas:
1. Haz clic derecho en el mapa
2. Selecciona "¿Qué hay aquí?"
3. Copia lat,lng

---

## 5. Pasos para Importar

### Opción A: Vía Web

1. Abre https://trafico-map-general-v2.web.app
2. Haz clic en **"Importar Nueva Ciudad"**
3. Selecciona **"Córdoba"** del dropdown
4. Elige **"Robo Automotor"** como tipo de datos
5. Pega el CSV o carga el archivo
6. Haz clic en **"Validar y Cargar"**
7. Copia la salida y guárdala en `public/data/robos_cordoba.csv`

### Opción B: Directo en el Código

1. Copia tu archivo CSV validado a:
   ```
   public/data/robos_cordoba.csv
   ```

2. Edita `public/data/cities-config.json` y añade:
   ```json
   "cordoba": {
     "name": "Córdoba",
     "roboLayer": {
       "enabled": true,
       "dataFile": "data/robos_cordoba.csv",
       "geojson": false
     }
   }
   ```

3. Despliega con:
   ```bash
   firebase deploy --only hosting
   ```

---

## 6. Validación y Troubleshooting

### Errores Comunes

| Problema | Solución |
|----------|----------|
| ❌ "Coordenadas inválidas" | Verifica que lat esté entre -31.1 y -31.6, lng entre -64.0 y -64.3 |
| ❌ "No aparecen en el mapa" | Chequea que el resultado coincida EXACTAMENTE con la lista (mayúsculas/minúsculas) |
| ❌ "Todos los puntos salen grises" | Probablemente el "resultado" no existe en el mapeo - usa "Otros" como fallback |
| ❌ "Fecha inválida" | Asegúrate formato YYYY-MM-DD (ej: 2024-03-15) |

---

## 7. Checklist Antes de Cargar

- ✅ El CSV tiene exactamente 6 columnas: `lat,lng,fecha,resultado,observaciones,año`
- ✅ Todas las lats están entre -31.1 y -31.6
- ✅ Todas las lngs están entre -64.0 y -64.3
- ✅ Las fechas están en formato YYYY-MM-DD (o la columna está vacía)
- ✅ Los "resultado" valores coinciden exactamente con la lista (respeta mayúsculas)
- ✅ No hay caracteres especiales sin escapar en observaciones
- ✅ No hay filas vacías entre registros

---

## 8. Preguntas Frecuentes

**P: ¿Puedo mezclar datos de 2023 y 2024?**
A: Sí, el filtro de años te permitirá ver ambos.

**P: ¿Y si tengo un resultado no listado?**
A: Usa `Otros` y se mostrará en gris.

**P: ¿Puedo actualizar los datos sin borrar todo?**
A: Sí, reemplaza el archivo `robos_cordoba.csv` y redeploy.

**P: ¿Dónde aparecerá el heatmap de Córdoba?**
A: Cuando actives el checkbox "Robo Automotor" para Córdoba, verás tanto puntos como el mapa de calor.

---

## 9. Apoyo

Si necesitas ayuda:
- Revisa el documento [GUIA_IMPORTAR_DATOS.md](GUIA_IMPORTAR_DATOS.md) para contexto general
- Consulta [CHECKLIST_NUEVA_CIUDAD.md](CHECKLIST_NUEVA_CIUDAD.md) para agregar múltiples capas
- Ver ejemplo completo: [EJEMPLO_robos_cordoba.csv](../../data/EJEMPLO_robos_cordoba.csv)
