import type { Bps, Cents, Milli } from './types';

/** Formatea centavos como dolares. 125075 -> "$1,250.75" */
export function fmtMoney(cents: Cents): string {
  const neg = cents < 0;
  const abs = Math.abs(Math.round(cents));
  const entero = Math.floor(abs / 100).toLocaleString('en-US');
  const dec = String(abs % 100).padStart(2, '0');
  return `${neg ? '-' : ''}$${entero}.${dec}`;
}

/** Lee "12.50" o "12,50" y devuelve 1250. Nunca usa aritmetica flotante para el resultado. */
export function parseCents(input: string): Cents {
  const limpio = input.replace(/[^0-9.,-]/g, '').replace(',', '.');
  if (!limpio || limpio === '-' || limpio === '.') return 0;
  const negativo = limpio.startsWith('-');
  const [ent = '0', decRaw = ''] = limpio.replace('-', '').split('.');
  const dec = (decRaw + '00').slice(0, 2);
  const cents = Number(ent || '0') * 100 + Number(dec || '0');
  return negativo ? -cents : cents;
}

/** Centavos a texto editable sin separador de miles: 1250 -> "12.50" */
export function centsToInput(cents: Cents): string {
  const neg = cents < 0;
  const abs = Math.abs(Math.round(cents));
  return `${neg ? '-' : ''}${Math.floor(abs / 100)}.${String(abs % 100).padStart(2, '0')}`;
}

/** Aplica un multiplicador en puntos base con redondeo bancario simple al centavo. */
export function aplicarBps(cents: Cents, bps: Bps): Cents {
  return Math.round((cents * bps) / 10000);
}

/** Porcentaje entero sobre un monto: pct(10000, 13) -> 1300 */
export function pctDe(cents: Cents, pct: number): Cents {
  return Math.round((cents * pct) / 100);
}

/** 12500 milesimas -> "12.5" (sin ceros de relleno) */
export function fmtMilli(milli: Milli): string {
  const signo = milli < 0 ? '-' : '';
  const abs = Math.abs(milli);
  const ent = Math.floor(abs / 1000);
  const dec = String(abs % 1000).padStart(3, '0').replace(/0+$/, '');
  return dec ? `${signo}${ent}.${dec}` : `${signo}${ent}`;
}

/** Lee "12.5" y devuelve 12500. */
export function parseMilli(input: string): Milli {
  const limpio = input.replace(/[^0-9.,-]/g, '').replace(',', '.');
  if (!limpio || limpio === '-' || limpio === '.') return 0;
  const negativo = limpio.startsWith('-');
  const [ent = '0', decRaw = ''] = limpio.replace('-', '').split('.');
  const dec = (decRaw + '000').slice(0, 3);
  const milli = Number(ent || '0') * 1000 + Number(dec || '0');
  return negativo ? -milli : milli;
}
