import { aplicarBps, pctDe } from './money';
import type { Cents, Cotizacion, EstadoCotizacion, FormaPago, Partida, RenglonInstalacion } from './types';
import { IVA_BPS } from './types';

export interface TotalesCotizacion {
  /** Suma de la mano de obra a precio congelado, sin ajuste por tipo de obra. */
  manoObraCents: Cents;
  /** Diferencia que introduce el tipo de obra. Puede ser 0. */
  ajusteObraCents: Cents;
  /** Base gravada: mano de obra + ajuste. */
  subtotalCents: Cents;
  ivaCents: Cents;
  /** Lo unico que Francisco cobra. Los materiales no entran aqui. Nunca. */
  totalCents: Cents;
}

/**
 * Totales de la cotizacion de SERVICIO.
 * Solo mano de obra. El monto de materiales jamas se suma aqui.
 */
export function calcularTotales(
  cot: Pick<Cotizacion, 'renglones' | 'multiplicadorBps' | 'aplicaIva'>,
): TotalesCotizacion {
  const manoObraCents = cot.renglones.reduce(
    (suma, r) => suma + subtotalRenglon(r),
    0,
  );
  const conMultiplicador = aplicarBps(manoObraCents, cot.multiplicadorBps);
  const ajusteObraCents = conMultiplicador - manoObraCents;
  const subtotalCents = conMultiplicador;
  // === false, no !cot.aplicaIva: una cotizacion vieja sin este campo sigue llevando IVA como antes.
  const ivaCents = cot.aplicaIva === false ? 0 : aplicarBps(subtotalCents, IVA_BPS);
  return {
    manoObraCents,
    ajusteObraCents,
    subtotalCents,
    ivaCents,
    totalCents: subtotalCents + ivaCents,
  };
}

export function subtotalRenglon(r: RenglonInstalacion): Cents {
  return r.precioManoObraCents * r.cantidad;
}

export interface CuotaCalculada {
  etiqueta: string;
  pct: number;
  montoCents: Cents;
}

/**
 * Reparte el total en las cuotas de la forma de pago. La ultima cuota
 * absorbe el residuo del redondeo, para que la suma de las cuotas sea
 * siempre exactamente el total (nunca un centavo de mas o de menos).
 */
export function desglosePago(totales: TotalesCotizacion, formaPago: FormaPago): CuotaCalculada[] {
  let acumulado = 0;
  return formaPago.cuotas.map((c, i) => {
    const esUltima = i === formaPago.cuotas.length - 1;
    const montoCents = esUltima ? totales.totalCents - acumulado : pctDe(totales.totalCents, c.pct);
    acumulado += montoCents;
    return { etiqueta: c.etiqueta, pct: c.pct, montoCents };
  });
}

/** Congela nombre, precio y receta de la partida en el renglon. */
export function renglonDesdePartida(partida: Partida, cantidad = 1): RenglonInstalacion {
  return {
    id: nuevoId(),
    partidaId: partida.id,
    descripcion: partida.nombre,
    unidad: partida.unidad,
    cantidad,
    precioManoObraCents: partida.precioManoObraCents,
    precioEditado: false,
    // Copia profunda: si maniana cambia la receta del catalogo, esta no se mueve.
    recetaCongelada: partida.receta.map((l) => ({ ...l })),
  };
}

export function fechaVencimiento(cot: Cotizacion): number | null {
  if (!cot.emitidaEn) return null;
  return cot.emitidaEn + cot.diasValidez * 24 * 60 * 60 * 1000;
}

export function estadoVisible(cot: Cotizacion): EstadoCotizacion {
  const vence = fechaVencimiento(cot);
  if (cot.estado === 'enviada' && vence && Date.now() > vence) return 'vencida';
  return cot.estado;
}

export function formatearNumero(numero: number | null, prefijo: string): string {
  if (numero === null) return 'BORRADOR';
  return `${prefijo}${String(numero).padStart(4, '0')}`;
}

export function nuevoId(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) return crypto.randomUUID();
  return `id-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

export const ETIQUETA_ESTADO: Record<EstadoCotizacion, string> = {
  borrador: 'Borrador',
  enviada: 'Enviada',
  aceptada: 'Aceptada',
  rechazada: 'Rechazada',
  vencida: 'Vencida',
};

export function fmtFecha(ts: number | null | undefined): string {
  if (!ts) return '—';
  return new Date(ts).toLocaleDateString('es-SV', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
}
