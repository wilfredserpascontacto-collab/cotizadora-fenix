import type {
  AjusteMaterial,
  Cents,
  Material,
  MaterialExtra,
  Milli,
  RenglonInstalacion,
} from './types';

export type FuenteRenglon = 'calculado' | 'ajustado' | 'manual';

export interface RenglonMaterialCalculado {
  materialId: string;
  nombre: string;
  unidadMedida: string;
  unidadVenta: string;
  /** Consumo neto sumado de todas las partidas. */
  brutoMilli: Milli;
  /** Consumo con la holgura de desperdicio aplicada. */
  conHolguraMilli: Milli;
  holguraPct: number;
  /** Lo que el cliente compra: unidades de venta enteras, siempre hacia arriba. */
  unidadesVenta: number;
  /** Unidades que salieron del calculo, antes de que Francisco las tocara. */
  unidadesCalculadas: number;
  precioRefCents?: Cents;
  estimadoCents: Cents;
  fuente: FuenteRenglon;
  /** Que partidas lo consumen. Sirve para explicar de donde sale la cantidad. */
  origenes: string[];
}

/**
 * Recorre las partidas de la cotizacion, multiplica por las cantidades,
 * consolida los materiales repetidos entre partidas y devuelve UNA sola
 * lista de compra: el cable aparece una vez, con el total.
 *
 * Reglas obligatorias, en este orden:
 *  1. holgura por desperdicio
 *  2. redondeo HACIA ARRIBA a la unidad de venta de la distribuidora
 *  3. el precio de referencia es informativo y jamas suma al total de Fenix
 *
 * El tipo de obra NO entra aqui: su multiplicador toca la mano de obra,
 * nunca las cantidades de material.
 */
export function calcularMateriales(
  renglones: RenglonInstalacion[],
  materiales: Material[],
  ajustes: AjusteMaterial[] = [],
  extras: MaterialExtra[] = [],
): RenglonMaterialCalculado[] {
  const porId = new Map(materiales.map((m) => [m.id, m]));
  const acumulado = new Map<string, { milli: Milli; origenes: Set<string> }>();

  for (const renglon of renglones) {
    if (renglon.cantidad <= 0) continue;
    for (const linea of renglon.recetaCongelada) {
      const previo = acumulado.get(linea.materialId) ?? { milli: 0, origenes: new Set<string>() };
      previo.milli += linea.cantidadMilli * renglon.cantidad;
      previo.origenes.add(renglon.descripcion);
      acumulado.set(linea.materialId, previo);
    }
  }

  const ajustePorId = new Map(ajustes.map((a) => [a.materialId, a]));
  const filas: RenglonMaterialCalculado[] = [];

  for (const [materialId, { milli, origenes }] of acumulado) {
    const material = porId.get(materialId);
    if (!material) continue; // material borrado del catalogo: se ignora en silencio
    const ajuste = ajustePorId.get(materialId);
    if (ajuste?.eliminado) continue;

    const conHolguraMilli = Math.ceil((milli * (100 + material.holguraPct)) / 100);
    const contenido = Math.max(1, material.contenidoPorUnidadVentaMilli);
    const unidadesCalculadas = Math.max(1, Math.ceil(conHolguraMilli / contenido));
    const unidadesVenta =
      ajuste?.unidadesVenta !== undefined ? Math.max(0, ajuste.unidadesVenta) : unidadesCalculadas;

    filas.push({
      materialId,
      nombre: material.nombre,
      unidadMedida: material.unidadMedida,
      unidadVenta: material.unidadVenta,
      brutoMilli: milli,
      conHolguraMilli,
      holguraPct: material.holguraPct,
      unidadesVenta,
      unidadesCalculadas,
      precioRefCents: material.precioRefCents,
      estimadoCents: (material.precioRefCents ?? 0) * unidadesVenta,
      fuente: ajuste?.unidadesVenta !== undefined ? 'ajustado' : 'calculado',
      origenes: [...origenes],
    });
  }

  filas.sort((a, b) => a.nombre.localeCompare(b.nombre, 'es'));

  for (const extra of extras) {
    filas.push({
      materialId: extra.materialId ?? extra.id,
      nombre: extra.nombre,
      unidadMedida: 'u',
      unidadVenta: extra.unidadVenta,
      brutoMilli: 0,
      conHolguraMilli: 0,
      holguraPct: 0,
      unidadesVenta: extra.unidadesVenta,
      unidadesCalculadas: extra.unidadesVenta,
      precioRefCents: extra.precioRefCents,
      estimadoCents: (extra.precioRefCents ?? 0) * extra.unidadesVenta,
      fuente: 'manual',
      origenes: [],
    });
  }

  return filas;
}

/**
 * Estimado de lo que el cliente gastara en la distribuidora.
 * Es un dato de referencia para el cliente y NUNCA entra en el total de Fenix.
 */
export function estimadoMateriales(filas: RenglonMaterialCalculado[]): Cents {
  return filas.reduce((suma, fila) => suma + fila.estimadoCents, 0);
}

/** true si algun material carece de precio de referencia (el estimado queda incompleto). */
export function estimadoIncompleto(filas: RenglonMaterialCalculado[]): boolean {
  return filas.some((f) => f.precioRefCents === undefined && f.unidadesVenta > 0);
}
