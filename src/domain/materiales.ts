import type {
  AjusteMaterial,
  Material,
  MaterialExtra,
  Milli,
  RenglonInstalacion,
} from './types';

export type FuenteRenglon = 'calculado' | 'ajustado' | 'manual' | 'faltante';

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
  fuente: FuenteRenglon;
  /** Que partidas lo consumen. Sirve para explicar de donde sale la cantidad. */
  origenes: string[];
}

/** Las filas que no se pueden comprar porque el material ya no esta en el catalogo. */
export const esFaltante = (f: RenglonMaterialCalculado) => f.fuente === 'faltante';

/**
 * Recorre las partidas de la cotizacion, multiplica por las cantidades,
 * consolida los materiales repetidos entre partidas y devuelve UNA sola
 * lista de compra: el cable aparece una vez, con el total.
 *
 * Reglas obligatorias, en este orden:
 *  1. holgura por desperdicio
 *  2. redondeo HACIA ARRIBA a la unidad de venta de la distribuidora
 *  3. nunca lleva precio: Francisco no maneja precios de materiales
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
    const ajuste = ajustePorId.get(materialId);
    if (ajuste?.eliminado) continue;

    const material = porId.get(materialId);
    if (!material) {
      // Borrado del catalogo pero todavia pedido por una receta. Antes se
      // ignoraba en silencio y el cliente terminaba comprando de menos, que es
      // la peor forma de fallar de este producto: el trabajo se para a media
      // instalacion y la culpa se la lleva la app. Ahora sale a la superficie.
      filas.push({
        materialId,
        nombre: `Material eliminado del catálogo (${materialId})`,
        unidadMedida: 'u',
        unidadVenta: '—',
        brutoMilli: milli,
        conHolguraMilli: milli,
        holguraPct: 0,
        unidadesVenta: 0,
        unidadesCalculadas: 0,
        fuente: 'faltante',
        origenes: [...origenes],
      });
      continue;
    }

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
      fuente: 'manual',
      origenes: [],
    });
  }

  return filas;
}
