'use strict';
// ════════════════════════════════════════════════════════
//  BOT VALIDADOR DE VENTAS — MOVISTAR MX  v3.0
//  Hoja: REGISTROS
//  Lee:    Col B (DN) filtrado por Col A (12 días)
//  Valida: portal Movistar con TRIPLE verificación
//  Escribe: Col J (STATUS) → ACTIVA | PENDIENTE
// ════════════════════════════════════════════════════════
require('dotenv').config();
const { cfg, validateConfig } = require('./config');
const logger    = require('./src/logger');
const sheets    = require('./src/sheets');
const validator = require('./src/validator');
const pLimit    = require('p-limit');
const { SingleBar, Presets } = require('cli-progress');

// ── Argumentos CLI ────────────────────────────────────
const ARGS = new Set(process.argv.slice(2));
if (ARGS.has('--headless'))  process.env.HEADLESS   = 'true';
if (ARGS.has('--debug'))     process.env.LOG_LEVEL  = 'debug';
const FORCE = ARGS.has('--force'); // re-procesa aunque ya tenga STATUS

// ── Punto de entrada ──────────────────────────────────
main().catch(e => {
  logger.error(`Error crítico: ${e.message}`);
  logger.debug(e.stack);
  process.exit(1);
});

async function main() {
  const t0 = Date.now();

  logger.section('BOT VALIDADOR DE VENTAS — MOVISTAR MX  v3.0');
  logger.info(`Modo:      ${cfg.browser.headless ? 'Headless (producción)' : 'Ventana visible (debug)'}`);
  logger.info(`Rondas:    ${cfg.validation.rounds} verificaciones por número`);
  logger.info(`Ventana:   últimos ${cfg.sheets.windowDays} días`);
  logger.info(`Inicio:    ${new Date().toLocaleString('es-MX')}`);
  logger.sep();

  // 1. Validar configuración antes de hacer NADA
  validateConfig();

  const pending = []; // acumular para batch write al final

  try {
    // 2. Conectar con Google Sheets
    await sheets.connect();

    // 3. Leer registros dentro de la ventana de 12 días
    const registros = await sheets.readRegistros();

    if (!registros.length) {
      logger.warn('No hay registros dentro de la ventana de 12 días. Fin.');
      return;
    }

    // 4. Filtrar los que ya tienen STATUS (a menos que --force)
    let toProcess = registros;
    if (!FORCE) {
      const existing = await sheets.readStatuses();
      toProcess = registros.filter(r => !existing[r.rowIndex]);
      const skipped = registros.length - toProcess.length;
      if (skipped) logger.info(`Ya procesados (omitidos): ${skipped}`);
    }

    if (!toProcess.length) {
      logger.info('Todos los registros ya tienen STATUS. Usa --force para re-validar.');
      return;
    }

    // ── Resumen pre-ejecución ──────────────────────────
    const agentCount = {};
    toProcess.forEach(r => { agentCount[r.evt||'SIN AGENTE'] = (agentCount[r.evt||'SIN AGENTE']||0)+1; });

    logger.section('RESUMEN PRE-EJECUCIÓN');
    logger.info(`Total a validar:    ${toProcess.length} números`);
    logger.info(`Verificaciones:     ${cfg.validation.rounds} rondas por número`);
    logger.info(`Delay entre nums:   ${cfg.validation.delayMs / 1000}s`);
    logger.info(`Tiempo estimado:    ~${estimateTime(toProcess.length)} min`);
    logger.info('');
    logger.info('Por agente (EVT):');
    Object.entries(agentCount).sort((a,b)=>b[1]-a[1]).forEach(([a,c]) => logger.info(`  ${a.padEnd(22)} ${c} registros`));
    logger.sep();

    // 5. Iniciar navegador
    await validator.launch();

    // 6. Barra de progreso
    const bar = new SingleBar({
      format: '  [{bar}] {percentage}% | {value}/{total} | ETA: {eta}s | {phone}',
      barCompleteChar: '█', barIncompleteChar: '░', hideCursor: true,
    }, Presets.shades_classic);
    bar.start(toProcess.length, 0, { phone: '—' });

    // 7. Procesar con concurrencia controlada
    const limit     = pLimit(cfg.concurrent);
    const results   = [];
    let   processed = 0;

    await Promise.allSettled(
      toProcess.map(reg =>
        limit(async () => {
          try {
            const { finalStatus, votes, detail } = await validator.validateWithRounds(reg.number);

            results.push({ ...reg, finalStatus, votes, detail });
            pending.push({ rowIndex: reg.rowIndex, status: finalStatus });

          } catch (err) {
            logger.error(`Fallo completo en ${reg.number}: ${err.message}`);
            results.push({ ...reg, finalStatus: 'PENDIENTE', votes: {}, detail: [] });
            pending.push({ rowIndex: reg.rowIndex, status: 'PENDIENTE' });
          }

          processed++;
          bar.update(processed, { phone: reg.number });

          // Pausa entre números (excepto el último)
          if (processed < toProcess.length) {
            const jitter = Math.round(Math.random() * 1000);
            await new Promise(r => setTimeout(r, cfg.validation.delayMs + jitter));
          }
        })
      )
    );

    bar.stop();

    // 8. Guardar en Google Sheets (batch write)
    logger.section('ACTUALIZANDO GOOGLE SHEETS');
    await sheets.batchWrite(pending);

    // 9. Calcular resultado final
    const activas    = results.filter(r => r.finalStatus === 'ACTIVA').length;
    const pendientes = results.filter(r => r.finalStatus === 'PENDIENTE').length;
    const elapsed    = Math.round((Date.now() - t0) / 1000);

    logger.section('RESULTADO FINAL');
    logger.ok(`ACTIVAS:           ${activas}`);
    logger.info(`PENDIENTES:        ${pendientes}`);
    logger.info(`Tasa activación:   ${pct(activas, results.length)}%`);
    logger.info(`Tiempo total:      ${fmtTime(elapsed)}`);

    // 10. Reporte por agente
    sheets.reportByAgent(results);

    // 11. Resumen en celda L1 del sheet
    await sheets.writeSummary(activas, pendientes);

    // 12. Lista de pendientes para revisión manual
    const pendList = results.filter(r => r.finalStatus === 'PENDIENTE');
    if (pendList.length) {
      logger.sep();
      logger.warn('Números PENDIENTES (revisión manual):');
      pendList.forEach(r =>
        logger.info(`  Fila ${String(r.rowIndex).padStart(4)} | ${r.number} | ${r.nombre} | EVT: ${r.evt}`)
      );
    }

  } catch (err) {
    logger.error(`Error en ejecución: ${err.message}`);
    // Guardar progreso parcial antes de salir
    if (pending.length) {
      logger.warn(`Guardando ${pending.length} resultados parciales...`);
      await sheets.batchWrite(pending).catch(() => {});
    }
    throw err;
  } finally {
    await validator.close();
    logger.info('\nBot finalizado ✅');
  }
}

// ── Utilidades ────────────────────────────────────────
function pct(n, total) { return total ? Math.round((n / total) * 100) : 0; }
function fmtTime(s)     { return s >= 60 ? `${Math.floor(s/60)}m ${s%60}s` : `${s}s`; }
function estimateTime(n) {
  // rounds × delay_por_ronda + delay_entre_numeros
  const secsPerNum = (cfg.validation.rounds * (cfg.validation.timeoutMs / 1000 + 2)) +
                     (cfg.validation.delayMs / 1000);
  return Math.ceil((n * secsPerNum) / 60);
}

process.on('SIGINT',             () => { logger.warn('\nInterrumpido (Ctrl+C)'); process.exit(0); });
process.on('unhandledRejection', e  => logger.error(`Promesa sin manejar: ${e}`));
