/**
 * Recorre la app entera en un navegador de verdad y revisa lo que se rompía.
 *
 *   npm run build
 *   npx http-server dist -p 4500 -s &
 *   node scripts/verificar-pantallas.mjs            # normal
 *   OFFLINE=1 node scripts/verificar-pantallas.mjs  # sin internet
 *   OFFLINE=1 RATE=8 node scripts/verificar-pantallas.mjs   # teléfono lento
 *
 * RATE frena el CPU: en x10 y sin este arreglo, escribir "Grupo Fenix
 * Servicios Generales" daba "Guxevco Geels". Necesita `npm i -D playwright`.
 */
import { chromium } from 'playwright';

const BASE = process.env.BASE ?? 'http://127.0.0.1:4500/';
const OFFLINE = process.env.OFFLINE === '1';
const RATE = Number(process.env.RATE ?? 1);
let fallos = 0;
const ok = (b, t) => { console.log(`  ${b ? '✓' : '✗'} ${t}`); if (!b) fallos++; };

const nav = await chromium.launch();
const ctx = await nav.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, acceptDownloads: true });
const pag = await ctx.newPage();
const errores = [];
pag.on('pageerror', (e) => errores.push(String(e).slice(0, 160)));
pag.on('console', (m) => { if (m.type() === 'error') errores.push('consola: ' + m.text().slice(0, 160)); });

await pag.addInitScript(() => {
  window.__abiertos = 0;
  const o = window.open;
  window.open = function (...a) { window.__abiertos++; return o.apply(this, a); };
});

const descargas = [];
pag.on('download', (d) => descargas.push(d.suggestedFilename()));

async function mantener(loc, ms = 1400) {
  const c = await loc.boundingBox();
  await pag.mouse.move(c.x + c.width / 2, c.y + c.height / 2);
  await pag.mouse.down(); await pag.waitForTimeout(ms); await pag.mouse.up();
}

await pag.goto(BASE, { waitUntil: 'networkidle' });
await pag.waitForTimeout(1000);

if (OFFLINE) {
  await pag.waitForFunction(() => navigator.serviceWorker?.controller != null, null, { timeout: 20000 });
  await pag.waitForTimeout(1500);
  await ctx.setOffline(true);
  await pag.reload({ waitUntil: 'domcontentloaded' });
  await pag.waitForTimeout(1500);
}
const cdp = await ctx.newCDPSession(pag);
if (RATE > 1) await cdp.send('Emulation.setCPUThrottlingRate', { rate: RATE });

console.log(`\n=== ${OFFLINE ? 'SIN INTERNET' : 'con internet'}, CPU x${RATE} ===`);
ok(await pag.getByRole('button', { name: /Nueva cotizaci/i }).count() > 0, 'la app abre');

// --- 1. Escribir en Ajustes ---
await pag.getByText('Ajustes', { exact: true }).first().click();
await pag.waitForTimeout(900);
const nombre = pag.locator('input[type="text"], input:not([type])').first();
await nombre.fill(''); await pag.waitForTimeout(400);
const TXT = 'Grupo Fenix Servicios Generales';
await nombre.pressSequentially(TXT, { delay: 30 });
await pag.waitForTimeout(1200);
ok((await nombre.inputValue()) === TXT, `campo de texto conserva "${TXT}"`);

// numero: poder borrarlo y escribir otro
const dias = pag.locator('input[type="number"]').first();
await dias.fill(''); await pag.waitForTimeout(200);
await dias.pressSequentially('21', { delay: 40 });
await pag.waitForTimeout(900);
ok((await dias.inputValue()) === '21', 'un número se puede borrar y reescribir');

await pag.goBack(); await pag.waitForTimeout(600);
await pag.getByText('Ajustes', { exact: true }).first().click();
await pag.waitForTimeout(1000);
ok((await pag.locator('input[type="text"], input:not([type])').first().inputValue()) === TXT, 'y quedó guardado');

// --- 2. Cotizar hasta el resumen ---
await pag.goto(BASE, { waitUntil: 'domcontentloaded' });
await pag.waitForTimeout(1200);
await mantener(pag.getByRole('button', { name: /Nueva cotizaci/i }).first());
await pag.waitForTimeout(700);
await pag.locator('select').first().selectOption({ index: 1 });
await pag.waitForTimeout(400);
await pag.getByRole('button', { name: 'Empezar a cotizar' }).click();
await pag.waitForTimeout(900);
const partidas = pag.locator('.item-catalogo');
for (const i of [0, 1]) await partidas.nth(i).click();
await pag.waitForTimeout(600);
await pag.getByRole('button', { name: /Ver lista de materiales/i }).click();
await pag.waitForTimeout(800);
await pag.getByRole('button', { name: /^Continuar$/ }).first().click();
await pag.waitForTimeout(700);
await pag.getByRole('button', { name: /Continuar a firma/i }).first().click();
await pag.waitForTimeout(700);
await pag.getByRole('button', { name: /Firmar despu/i }).first().click();
await pag.waitForTimeout(900);
ok(await pag.getByRole('button', { name: /Generar PDF/i }).count() > 0, 'se llega al resumen');

// --- 3. Escribir en Condiciones (el textarea que perdía letras) ---
const cond = pag.locator('textarea').first();
await cond.fill(''); await pag.waitForTimeout(300);
const COND = 'Se trabaja de lunes a viernes, de 7 a 5';
await cond.pressSequentially(COND, { delay: 30 });
await pag.waitForTimeout(1200);
ok((await cond.inputValue()) === COND, 'condiciones conserva lo escrito');

// --- 4. Los PDF ---
await pag.getByRole('button', { name: /Ver cotizaci/i }).first().click();
await pag.waitForTimeout(2500);
ok((await pag.evaluate(() => window.__abiertos)) === 1, '"Ver cotización" intenta abrir el PDF');
ok(!pag.url().includes('blob:'), 'y la app NO se va a una pantalla en blanco');

await pag.getByRole('button', { name: /Generar PDF/i }).first().click();
await pag.waitForTimeout(1000);
await pag.getByRole('button', { name: /Generar los PDF/i }).first().click();
await pag.waitForTimeout(4000);
const botonesGuardar = pag.getByRole('button', { name: /^Guardar la /i });
ok((await botonesGuardar.count()) === 2, 'hay un botón de guardar por archivo');
descargas.length = 0;
await botonesGuardar.nth(0).click(); await pag.waitForTimeout(1800);
await botonesGuardar.nth(1).click(); await pag.waitForTimeout(1800);
ok(descargas.length === 2, `se guardan los 2 PDF (${descargas.join(', ')})`);
ok(descargas.every((d) => /^COT-\d+-(cotizacion|materiales)-/.test(d)), 'con nombres reconocibles');

// --- 5. Historial: archivar, sacar del archivo, borrar ---
await pag.goto(BASE, { waitUntil: 'domcontentloaded' });
await pag.waitForTimeout(1200);
await pag.getByText('Historial', { exact: true }).first().click();
await pag.waitForTimeout(900);
const filas = () => pag.locator('article.renglon');
const antes = await filas().count();
ok(antes >= 1, `el historial muestra ${antes} cotización(es)`);

await filas().first().click(); await pag.waitForTimeout(700);
await pag.getByRole('button', { name: /^Archivar$/ }).click();
await pag.waitForTimeout(900);
ok((await filas().count()) === antes - 1, 'archivar la saca de la lista');

await pag.getByRole('button', { name: 'Archivadas' }).click();
await pag.waitForTimeout(700);
ok((await filas().count()) === 1, 'y aparece en Archivadas');

await filas().first().click(); await pag.waitForTimeout(700);
await pag.getByRole('button', { name: /Sacar del archivo/i }).click();
await pag.waitForTimeout(900);
await pag.getByRole('button', { name: 'Todas' }).click();
await pag.waitForTimeout(700);
ok((await filas().count()) === antes, 'sacar del archivo la devuelve');

pag.once('dialog', (d) => { console.log('    aviso:', d.message().split('\n')[0]); d.accept(); });
await filas().first().click(); await pag.waitForTimeout(700);
await pag.getByRole('button', { name: /Borrar para siempre/i }).click();
await pag.waitForTimeout(1200);
ok((await filas().count()) === antes - 1, 'borrar para siempre la borra');

// El correlativo no se reusa despues de borrar.
await pag.goto(BASE, { waitUntil: 'domcontentloaded' });
await pag.waitForTimeout(1200);
const prox = await pag.evaluate(async () => {
  const req = indexedDB.open('cotizadora-fenix');
  const bd = await new Promise((res) => { req.onsuccess = () => res(req.result); });
  return await new Promise((res) => {
    const t = bd.transaction('meta').objectStore('meta').get('correlativo');
    t.onsuccess = () => res(t.result?.valor ?? null);
    t.onerror = () => res('error');
  });
});
ok(prox === 1, `el contador del correlativo sigue en ${prox} (no se reusa el número borrado)`);

console.log(errores.length ? `\n  errores en consola:\n   - ${errores.join('\n   - ')}` : '\n  sin errores en consola');
console.log(fallos === 0 ? '\nTODO BIEN' : `\n${fallos} FALLOS`);
await nav.close();
process.exit(fallos ? 1 : 0);
