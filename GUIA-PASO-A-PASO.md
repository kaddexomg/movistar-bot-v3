# 🤖 BOT MOVISTAR — GUÍA COMPLETA PASO A PASO

---

## ✅ QUÉ HACE ESTE BOT

1. Lee los números telefónicos (columna B) de tu hoja **REGISTROS**
2. Filtra solo los registros de los **últimos 12 días** (columna A)
3. Valida **CADA número 3 VECES** en el portal de Movistar
4. Si 2 o más rondas dicen ACTIVA → escribe **ACTIVA** (verde) en columna J
5. Si 2 o más rondas dicen PENDIENTE → escribe **PENDIENTE** (rojo) en columna J
6. Genera un reporte final por agente (columna H / EVT)

---

## 📋 PASO 1: Instalar Node.js

1. Ve a **https://nodejs.org** y descarga la versión **LTS (v18 o mayor)**
2. Instala con todas las opciones por defecto
3. Abre una terminal (CMD o PowerShell en Windows) y verifica:
   ```
   node --version
   ```
   Debe mostrar algo como `v20.x.x`

---

## 📋 PASO 2: Instalar dependencias del bot

1. Descomprime la carpeta `movistar-bot-v3` donde quieras
2. Abre una terminal EN ESA CARPETA (en Windows: clic derecho → Abrir terminal)
3. Ejecuta:
   ```
   npm install
   ```
4. Espera que descargue todo (puede tardar 2-5 minutos)

---

## 📋 PASO 3: Configurar Google Cloud (Service Account)

### 3a. Crear proyecto en Google Cloud
1. Ve a **https://console.cloud.google.com**
2. Arriba izquierda → clic en el selector de proyecto → **"Nuevo proyecto"**
3. Nombre: `movistar-bot` → clic **Crear**

### 3b. Activar la API de Google Sheets
1. Menú izquierdo → **"API y servicios"** → **"Biblioteca"**
2. Busca: **Google Sheets API**
3. Clic en el resultado → clic **"Habilitar"**

### 3c. Crear la cuenta de servicio
1. Menú izquierdo → **"API y servicios"** → **"Credenciales"**
2. Clic en **"+ Crear credenciales"** → **"Cuenta de servicio"**
3. Nombre: `movistar-bot-service` → clic **"Crear y continuar"**
4. En "Rol" selecciona **"Editor"** → clic **"Continuar"** → clic **"Listo"**

### 3d. Descargar credentials.json
1. En la lista de cuentas de servicio, clic en la que acabas de crear
2. Pestaña **"Claves"**
3. Clic **"Agregar clave"** → **"Crear clave nueva"**
4. Selecciona **JSON** → clic **"Crear"**
5. Se descarga automáticamente un archivo JSON
6. **Renómbralo exactamente a: `credentials.json`**
7. **Muévelo a la carpeta raíz del bot** (donde está `index.js`)

---

## 📋 PASO 4: Compartir el Google Sheet

> ⚠️ Este paso es el que más se olvida y causa el error de conectividad

1. Abre `credentials.json` con un editor de texto
2. Busca la línea que dice `"client_email":`
3. Copia el valor (se ve algo así):
   ```
   movistar-bot-service@movistar-bot.iam.gserviceaccount.com
   ```
4. Abre tu Google Sheet (hoja REGISTROS)
5. Clic en **"Compartir"** (botón azul arriba a la derecha)
6. En el campo de email, **pega el email de la cuenta de servicio**
7. Rol: **"Editor"**
8. Clic **"Enviar"** (o "Listo" si pregunta que no hay Google Account)
9. ✅ Listo — ahora el bot tiene acceso a tu sheet

---

## 📋 PASO 5: Configurar el archivo .env

1. En la carpeta del bot, copia `.env.example` y renómbralo a `.env`
2. Ábrelo con un editor de texto y llena:

```
SPREADSHEET_ID=  <-- El ID de tu Google Sheet

¿Cómo encontrar el ID?
URL de tu sheet:
https://docs.google.com/spreadsheets/d/[AQUI-ESTÁ-EL-ID]/edit

Copia solo la parte entre /d/ y /edit
Ejemplo: 1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgVE2upms
```

El resto de los valores ya vienen configurados para tu hoja REGISTROS:
```
SHEET_NAME=REGISTROS
PHONE_COLUMN=B
STATUS_COLUMN=J
START_ROW=2
WINDOW_DAYS=12
VERIFICATION_ROUNDS=3
HEADLESS=false
```

---

## 📋 PASO 6: Verificar que todo está bien (DIAGNÓSTICO)

Antes de ejecutar el bot, corre el diagnóstico:

```bash
npm run diagnostico
```

Deberías ver algo así:
```
✅ Node.js v20.x.x ✓
✅ .env encontrado
✅ SPREADSHEET_ID: 1BxiMVs...
✅ credentials.json encontrado
✅ Tipo: service_account ✓
✅ Email: movistar-bot@...
✅ Autenticación Google OK
✅ Sheet encontrado: "Tu Hoja"
✅ Pestaña "REGISTROS" encontrada ✓
✅ Portal Movistar responde HTTP 200
✅ TODO CORRECTO — El bot está listo para ejecutarse
```

Si hay errores, el diagnóstico te dice exactamente qué falta.

---

## 📋 PASO 7: Ejecutar el bot

### Modo depuración (ventana visible — úsalo primero)
```bash
npm start
```

### Modo producción (sin ventana, más rápido)
```bash
npm run headless
```

### Re-validar números que ya tienen STATUS
```bash
npm run force
```

### Probar UN número específico
```bash
npm run test:numero -- 5512345678
```

---

## 📊 Qué verás al ejecutar

```
════════════════════════════════════════════════════════
  BOT VALIDADOR DE VENTAS — MOVISTAR MX  v3.0
════════════════════════════════════════════════════════
ℹ  Modo:      Ventana visible (debug)
ℹ  Rondas:    3 verificaciones por número
ℹ  Ventana:   últimos 12 días

✅ Conectado a: "Tu Hoja de Ventas"
ℹ  Total a validar: 45 números
ℹ  Tiempo estimado: ~67 min

  [████████░░░░░░░░░░░░] 35% | 16/45 | ETA: 43s | 5512345678

✅ [5512345678] ronda 1/3 → ACTIVA
✅ [5512345678] ronda 2/3 → ACTIVA
   ► Mayoría ACTIVA alcanzada en ronda 2.

════════════════════════════════════════════════════════
  RESULTADO FINAL
════════════════════════════════════════════════════════
✅ ACTIVAS:           32
ℹ  PENDIENTES:        13
ℹ  Tasa activación:   71%
ℹ  Tiempo total:      58m 22s

════════════════════════════════════════════════════════
  REPORTE POR AGENTE (EVT)
════════════════════════════════════════════════════════
  JOSE BLANCO            ✅  12 | 🔴   3 | 80% activación
  GABRIEL ESPINOZA       ✅   8 | 🔴   4 | 67% activación
  YORLUIS HERNANDEZ      ✅   7 | 🔴   3 | 70% activación
  SUSANA CARRERO         ✅   5 | 🔴   3 | 63% activación
```

---

## 🔧 Solución de Problemas

| Error | Causa | Solución |
|-------|-------|----------|
| `SPREADSHEET_ID no configurado` | Falta en .env | Agrega el ID al .env |
| `credentials.json no encontrado` | Mal ubicado | Muévelo a la carpeta raíz |
| `Error 403` | Sheet no compartido | Comparte el Sheet con el email de la service account |
| `Error 404` | ID incorrecto | Copia el ID de nuevo de la URL del Sheet |
| `Pestaña no encontrada` | Nombre diferente | Verifica que SHEET_NAME en .env coincida exactamente |
| `selector no encontrado` | Portal cambió | Ver sección "Si el portal cambia" abajo |
| `Navigation timeout` | Internet lento | Aumenta TIMEOUT_MS en .env a 30000 |

### Si el portal de Movistar cambia sus selectores

1. Abre Chrome y ve a `https://tienda.movistar.com.mx/recarga-en-linea`
2. Presiona F12 → clic en el ícono de puntero → clic en el input de número
3. Verás algo como `<input id="msisdn" type="tel" ...>`
4. Agrega ese selector al array `SEL.input` en `src/validator.js`

---

## 📁 Estructura del proyecto

```
movistar-bot-v3/
├── index.js              ← Bot principal (ejecuta este)
├── config.js             ← Toda la configuración
├── credentials.json      ← TU ARCHIVO (no subir a git)
├── .env                  ← TU CONFIGURACIÓN (no subir a git)
├── .env.example          ← Plantilla del .env
├── package.json
├── GUIA-PASO-A-PASO.md   ← Esta guía
├── src/
│   ├── validator.js      ← Motor Puppeteer (Movistar)
│   ├── sheets.js         ← Servicio Google Sheets
│   ├── logger.js         ← Sistema de logs
│   ├── diagnostico.js    ← Herramienta de diagnóstico
│   └── test-numero.js    ← Prueba un número individual
└── logs/
    ├── bot.log           ← Historial completo
    └── errores.log       ← Solo errores
```
