# 🚀 TraficoMap - Servidor Local de Creación de Ciudades

## ¿Cómo usar el sistema de crear ciudades?

### **Paso 1: Inicia el servidor**

**Opción A - Windows (Más fácil):**
```
Haz doble clic en: start-server.bat
```

**Opción B - PowerShell:**
```powershell
cd C:\Users\gparra\TraficoMapGeneral
node server.js
```

Espera el mensaje:
```
✅ TraficoMapGeneral server listening on http://localhost:5000
```

---

### **Paso 2: Abre la web en LOCAL**

Ve a: **http://localhost:5000**

⚠️ **Importante**: NO uses `https://trafico-map-general-v2.web.app` 
- Usa `http://localhost:5000` para que funcione el crear ciudades

---

### **Paso 3: Crea una ciudad**

1. Haz clic en **"Importar Nueva Ciudad"**
2. Sube los archivos geográficos (GeoJSON/CSV)
3. Especifica: **¿Cuántas patrullas? ¿Cuántos operadores?**
4. Presiona **"Generar Usuarios"**
5. ✅ **¡Listo!** Usuarios creados en Firebase automáticamente

---

## 📋 Flujo COMPLETO (Automatizado)

| Paso | Acción | Resultado |
|------|--------|-----------|
| 1️⃣ | Subes archivos de ciudad | Se cargan en sistema |
| 2️⃣ | Especificas cantidad de patrullas/operadores | El servidor lo procesa |
| 3️⃣ | Presionas "Generar Usuarios" | Firebase crea automáticamente: |
| | | ✅ Usuarios en Auth |
| | | ✅ Patrullas en Firestore |
| | | ✅ Reglas de seguridad |

---

## 🔐 Después de crear cada ciudad: Deploy

Una vez que termines de crear ciudades, ejecuta en terminal:

```powershell
firebase deploy --only firestore:rules,hosting
```

Esto actualiza las reglas de Firestore con las nuevas ciudades.

---

## 📱 Acceder desde web (después de cada deploy)

Una vez deployado, los usuarios pueden acceder desde:
```
https://trafico-map-general-v2.web.app/
```

Y ver todas las ciudades creadas.

---

## ⚙️ Troubleshooting

### "Error: Cannot find module 'firebase-admin'"
```
cd C:\Users\gparra\TraficoMapGeneral
npm install
```

### "EADDRINUSE: address already in use :::5000"
Significa que el puerto 5000 ya está en uso. Cierra otras instancias de Node.js y reinicia.

### No se crean usuarios
1. Abre F12 (consola del navegador)
2. Busca errores rojos
3. Verifica que el servidor esté corriendo (`node server.js` debe decir "listening on...")

---

## 📝 Notas

✅ Sistema **completamente automático** para crear ciudades
✅ No requiere acceso a Firebase Console
✅ Gratis (sin plan Blaze)
✅ Profesional para vender
