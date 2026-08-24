import type { Bps, Cents, Milli } from './types';

/** Formatea centavos como dolares. 125075 -> "$1,250.75" */
export function fmtMoney(cents: Cents): string {
  const neg = cents < 0;
  const abs = Math.abs(Math.round(cents));
  const entero = Math.floor(abs / 100).toLocaleString('en-US');
  const dec = String(abs % 100).padStart(2, '0');
  return `${neg ? '-' : ''}$${entero}.${dec}`;
}

/**
 * Separa un numero escrito a mano en signo, parte entera y decimales.
 *
 * El caso que obliga a esto es la coma de miles. Antes "1,250.75" se leia como
 * 125 centavos: la coma se volvia punto, quedaban dos puntos, y la funcion se
 * quedaba con los dos primeros trozos. Un precio de mil doscientos cincuenta
 * dolares entraba como uno veinticinco, sin avisar.
 *
 * Convencion salvadorena, que es la de Estados Unidos: la coma agrupa miles y
 * el punto separa decimales. Aun asi se acepta la coma decimal ("12,50")
 * cuando no puede significar otra cosa.
 */
function partirNumero(input: string): { negativo: boolean; entero: string; decimales: string } {
  const limpio = input.replace(/[^0-9.,-]/g, '');
  const negativo = limpio.startsWith('-');
  const cuerpo = limpio.replace(/-/g, '');
  if (!cuerpo || !/[0-9]/.test(cuerpo)) return { negativo: false, entero: '0', decimales: '' };

  const ultimo = Math.max(cuerpo.lastIndexOf(','), cuerpo.lastIndexOf('.'));
  if (ultimo === -1) return { negativo, entero: cuerpo, decimales: '' };

  const separador = cuerpo[ultimo];
  const cola = cuerpo.slice(ultimo + 1);
  const hayOtroSeparador = /[.,]/.test(cuerpo.slice(0, ultimo));

  // Tres digitos despues del ultimo separador significan grupo de miles, no
  // decimales. La excepcion es un punto solitario: "1.250" es un dolar con
  // veinticinco, porque en esta convencion el punto siempre decimal.
  const esMiles = cola.length === 3 && (hayOtroSeparador || separador === ',');
  if (esMiles || cola.length === 0) {
    return { negativo, entero: cuerpo.replace(/[.,]/g, ''), decimales: '' };
  }
  return {
    negativo,
    entero: cuerpo.slice(0, ultimo).replace(/[.,]/g, '') || '0',
    decimales: cola.replace(/[.,]/g, ''),
  };
}

/** Lee "12.50", "12,50" o "1,250.75" y devuelve centavos. Sin aritmetica flotante. */
export function parseCents(input: string): Cents {
  const { negativo, entero, decimales } = partirNumero(input);
  const dec = (decimales + '00').slice(0, 2);
  const cents = Number(entero || '0') * 100 + Number(dec || '0');
  if (!Number.isFinite(cents)) return 0;
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

/** Lee "12.5" y devuelve 12500. Entiende la coma de miles igual que parseCents. */
export function parseMilli(input: string): Milli {
  const { negativo, entero, decimales } = partirNumero(input);
  const dec = (decimales + '000').slice(0, 3);
  const milli = Number(entero || '0') * 1000 + Number(dec || '0');
  if (!Number.isFinite(milli)) return 0;
  return negativo ? -milli : milli;
}
