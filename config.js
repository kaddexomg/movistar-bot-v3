'use strict';
// ════════════════════════════════════════════════
//  config.js  —  Configuración central del bot
//  Estructura de la hoja REGISTROS:
//    A = Marca temporal   ← filtro de 12 días
//    B = DN               ← número a validar
//    C = Nombre completo
//    D = CURP
//    E = FVC
//    F = Recarga (50/100 PESOS)
//    G = GMT
//    H = EVT (agente)
//    I = Fecha de alta
//    J = STATUS           ← bot escribe aquí
//    K = Referido
// ════════════════════════════════════════════════
const path = require('path');
const fs   = require('fs');
require('dotenv').config();

const cfg = {
  sheets: {
    spreadsheetId:   process.env.SPREADSHEET_ID   || '',
    sheetName:       process.env.SHEET_NAME        || 'REGISTROS',
    phoneCol:        process.env.PHONE_COLUMN      || 'B',
    statusCol:       process.env.STATUS_COLUMN     || 'J',
    timestampCol:    'A',
    evtCol:          'H',
    startRow:        parseInt(process.env.START_ROW    || '2',  10),
    windowDays:      parseInt(process.env.WINDOW_DAYS  || '12', 10),
    credentialsPath: path.resolve(process.env.GOOGLE_CREDENTIALS_PATH || './credentials.json'),

    // Rangos dinámicos
    get fullRange()   { return `${this.sheetName}!A${this.startRow}:K`; },
    get statusRange() { return `${this.sheetName}!${this.statusCol}${this.startRow}:${this.statusCol}`; },
  },

  validation: {
    rounds:      parseInt(process.env.VERIFICATION_ROUNDS || '3',     10),
    delayMs:     parseInt(process.env.DELAY_MS            || '3500',  10),
    timeoutMs:   parseInt(process.env.TIMEOUT_MS          || '20000', 10),
    maxRetries:  parseInt(process.env.MAX_RETRIES         || '3',     10),
    retryDelay:  6000,
  },

  browser: {
    headless: process.env.HEADLESS === 'true',
    slowMo:   process.env.HEADLESS === 'true' ? 0 : 40,
    viewport: { width: 1280, height: 800 },
    args: [
      '--no-sandbox', '--disable-setuid-sandbox',
      '--disable-dev-shm-usage', '--disable-gpu',
      '--disable-blink-features=AutomationControlled',
      '--window-size=1280,800',
    ],
  },

  concurrent: parseInt(process.env.CONCURRENT || '1', 10),
};

// ── Validación de configuración ─────────────────
function validateConfig() {
  const errs = [];

  if (!cfg.sheets.spreadsheetId || cfg.sheets.spreadsheetId === 'PEGA_AQUI_TU_ID') {
    errs.push('SPREADSHEET_ID no está configurado en el archivo .env');
  }

  if (!fs.existsSync(cfg.sheets.credentialsPath)) {
    errs.push(`credentials.json no encontrado en: ${cfg.sheets.credentialsPath}`);
    errs.push('  → Descárgalo de Google Cloud Console y colócalo en la carpeta del proyecto');
  } else {
    // Verificar que el JSON es válido y es una service account
    try {
      const creds = JSON.parse(fs.readFileSync(cfg.sheets.credentialsPath, 'utf8'));
      if (creds.type !== 'service_account') {
        errs.push('credentials.json no es una Service Account. Usa el tipo "service_account"');
      }
      if (!creds.client_email) {
        errs.push('credentials.json no tiene client_email. El archivo puede estar corrupto');
      } else {
        // Guardar el email para mostrarlo en el diagnóstico
        cfg.sheets.serviceEmail = creds.client_email;
      }
    } catch {
      errs.push('credentials.json no es un JSON válido. Descárgalo de nuevo de Google Cloud');
    }
  }

  if (errs.length > 0) {
    console.error('\n╔══════════════════════════════════════════════╗');
    console.error('║     ERRORES DE CONFIGURACIÓN — Bot detenido  ║');
    console.error('╚══════════════════════════════════════════════╝');
    errs.forEach(e => console.error('  ✗ ' + e));
    console.error('\n  Solución rápida:');
    console.error('  1. Copia .env.example → .env y llena SPREADSHEET_ID');
    console.error('  2. Coloca credentials.json en la carpeta del proyecto');
    console.error('  3. Comparte el Sheet con el email de la service account');
    console.error('  4. Ejecuta: npm run diagnostico\n');
    process.exit(1);
  }
}

module.exports = { cfg, validateConfig };
