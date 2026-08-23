import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db/db';
import { calcularMateriales, type RenglonMaterialCalculado } from '../domain/materiales';
import type { Cotizacion, Material } from '../domain/types';

/**
 * Catalogo de materiales a usar para una cotizacion: el congelado si ya se
 * emitio, el vivo mientras sea borrador. Asi un PDF reenviado en enero dice
 * lo mismo que dijo en agosto.
 */
export function materialesVigentes(cot: Cotizacion, catalogo: Material[]): Material[] {
  return cot.materialesCongelados ?? catalogo;
}

export function listaDeMateriales(cot: Cotizacion, catalogo: Material[]): RenglonMaterialCalculado[] {
  return calcularMateriales(
    cot.renglones,
    materialesVigentes(cot, catalogo),
    cot.ajustesMateriales,
    cot.materialesExtra,
  );
}

export function useMateriales(cot: Cotizacion | null) {
  const catalogo = useLiveQuery(() => db.materiales.toArray(), []);
  if (!cot || !catalogo) return { filas: null, catalogo: catalogo ?? null };
  return { filas: listaDeMateriales(cot, catalogo), catalogo };
}
