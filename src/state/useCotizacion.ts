import { useCallback, useEffect, useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db, guardarBorradorActivo } from '../db/db';
import { guardarCotizacion } from '../db/repo';
import type { Cotizacion } from '../domain/types';

/**
 * Cotizacion en edicion.
 *
 * El estado vive en IndexedDB y se reescribe en cada cambio, no al final:
 * si la app se cierra a media cotizacion, al volver esta donde la dejo.
 */
export function useCotizacion(id: string | undefined) {
  const cot = useLiveQuery(async () => (id ? ((await db.cotizaciones.get(id)) ?? null) : null), [id]);
  const cliente = useLiveQuery(
    async () => (cot ? ((await db.clientes.get(cot.clienteId)) ?? null) : null),
    [cot?.clienteId],
  );

  useEffect(() => {
    // Marcar como borrador activo para que Inicio ofrezca retomarla.
    if (cot && cot.numero === null) void guardarBorradorActivo(cot.id);
  }, [cot?.id, cot?.numero]);

  const aplicar = useCallback(
    async (cambio: (actual: Cotizacion) => Cotizacion) => {
      if (!id) return;
      const actual = await db.cotizaciones.get(id);
      if (!actual) return;
      await guardarCotizacion(cambio(actual));
    },
    [id],
  );

  return { cot: cot ?? null, cliente: cliente ?? null, cargando: cot === undefined, aplicar };
}

/** Mensaje efimero de confirmacion, sin librerias. */
export function useAviso(): [string | null, (texto: string) => void] {
  const [texto, setTexto] = useState<string | null>(null);
  useEffect(() => {
    if (!texto) return;
    const t = setTimeout(() => setTexto(null), 3500);
    return () => clearTimeout(t);
  }, [texto]);
  return [texto, setTexto];
}
