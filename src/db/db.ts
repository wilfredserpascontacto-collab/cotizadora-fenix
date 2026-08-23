import Dexie, { type Table } from 'dexie';
import type {
  Ajustes,
  Cliente,
  Cotizacion,
  Material,
  Partida,
  PerfilEmpresa,
} from '../domain/types';
import {
  AJUSTES_DEFAULT,
  CLIENTES_EJEMPLO,
  MATERIALES_SEED,
  PARTIDAS_SEED,
  PERFIL_DEFAULT,
} from './seed';

/** Pares clave/valor: perfil, ajustes, correlativo y borrador activo. */
export interface MetaRow {
  clave: string;
  valor: unknown;
}

export const META = {
  perfil: 'perfil',
  ajustes: 'ajustes',
  correlativo: 'correlativo',
  borradorActivo: 'borradorActivo',
  sembrado: 'sembrado',
} as const;

class CotizadoraDB extends Dexie {
  partidas!: Table<Partida, string>;
  materiales!: Table<Material, string>;
  clientes!: Table<Cliente, string>;
  cotizaciones!: Table<Cotizacion, string>;
  meta!: Table<MetaRow, string>;

  constructor() {
    super('cotizadora-fenix');
    // IndexedDB, no localStorage: el catalogo, las recetas y el historial no se pueden perder.
    this.version(1).stores({
      partidas: 'id, categoria, activa, nombre',
      materiales: 'id, categoria, nombre',
      clientes: 'id, nombre, telefono',
      cotizaciones: 'id, numero, clienteId, estado, creadaEn, modificadaEn',
      meta: 'clave',
    });
  }
}

export const db = new CotizadoraDB();

// ---------------------------------------------------------------------------
// Meta

export async function leerMeta<T>(clave: string, porDefecto: T): Promise<T> {
  const fila = await db.meta.get(clave);
  return fila === undefined ? porDefecto : (fila.valor as T);
}

export async function escribirMeta(clave: string, valor: unknown): Promise<void> {
  await db.meta.put({ clave, valor });
}

/**
 * Se completa con los valores por defecto para los campos que falten: un
 * perfil guardado antes de que existiera, por ejemplo, "cuentaBancaria" no
 * lo tiene, y sin este merge la pantalla de Ajustes truena en blanco.
 */
export const leerPerfil = async (): Promise<PerfilEmpresa> => ({
  ...PERFIL_DEFAULT,
  ...(await leerMeta<Partial<PerfilEmpresa>>(META.perfil, PERFIL_DEFAULT)),
});
export const guardarPerfil = (p: PerfilEmpresa) => escribirMeta(META.perfil, p);
export const leerAjustes = async (): Promise<Ajustes> => ({
  ...AJUSTES_DEFAULT,
  ...(await leerMeta<Partial<Ajustes>>(META.ajustes, AJUSTES_DEFAULT)),
});
export const guardarAjustes = (a: Ajustes) => escribirMeta(META.ajustes, a);

// ---------------------------------------------------------------------------
// Correlativo

/**
 * Asigna el siguiente numero de cotizacion dentro de una transaccion.
 *
 * El numero se entrega al EMITIR, no al crear el borrador: asi un borrador
 * abandonado no deja un hueco en la serie. Una cotizacion ya emitida no se
 * borra (se marca rechazada o vencida), de modo que la serie no se repite
 * ni se salta.
 */
export async function asignarCorrelativo(): Promise<number> {
  return db.transaction('rw', db.meta, db.cotizaciones, async () => {
    const fila = await db.meta.get(META.correlativo);
    const ultimoGuardado = typeof fila?.valor === 'number' ? fila.valor : 0;

    // Cinturon y tirantes: si el contador quedara atras por una restauracion de
    // respaldo, se recupera desde el maximo numero ya emitido.
    let maxEmitido = 0;
    await db.cotizaciones.each((c) => {
      if (typeof c.numero === 'number' && c.numero > maxEmitido) maxEmitido = c.numero;
    });

    const siguiente = Math.max(ultimoGuardado, maxEmitido) + 1;
    await db.meta.put({ clave: META.correlativo, valor: siguiente });
    return siguiente;
  });
}

export async function proximoCorrelativo(): Promise<number> {
  const actual = await leerMeta<number>(META.correlativo, 0);
  return actual + 1;
}

// ---------------------------------------------------------------------------
// Borrador activo: si la app se cierra a media cotizacion, vuelve donde quedo.

export const leerBorradorActivo = () => leerMeta<string | null>(META.borradorActivo, null);
export const guardarBorradorActivo = (id: string | null) => escribirMeta(META.borradorActivo, id);

// ---------------------------------------------------------------------------
// Semilla

export async function sembrarSiHaceFalta(): Promise<void> {
  const yaSembrado = await leerMeta<boolean>(META.sembrado, false);
  if (yaSembrado) return;

  await db.transaction('rw', db.partidas, db.materiales, db.clientes, db.meta, async () => {
    if ((await db.materiales.count()) === 0) await db.materiales.bulkPut(MATERIALES_SEED);
    if ((await db.partidas.count()) === 0) await db.partidas.bulkPut(PARTIDAS_SEED);
    if ((await db.clientes.count()) === 0) await db.clientes.bulkPut(CLIENTES_EJEMPLO);
    if ((await db.meta.get(META.perfil)) === undefined) {
      await db.meta.put({ clave: META.perfil, valor: PERFIL_DEFAULT });
    }
    if ((await db.meta.get(META.ajustes)) === undefined) {
      await db.meta.put({ clave: META.ajustes, valor: AJUSTES_DEFAULT });
    }
    await db.meta.put({ clave: META.sembrado, valor: true });
  });
}

/** Devuelve el catalogo a como venia de fabrica, sin tocar el historial. */
export async function restaurarCatalogoDeFabrica(): Promise<void> {
  await db.transaction('rw', db.partidas, db.materiales, async () => {
    await db.materiales.clear();
    await db.partidas.clear();
    await db.materiales.bulkPut(MATERIALES_SEED);
    await db.partidas.bulkPut(PARTIDAS_SEED);
  });
}

// ---------------------------------------------------------------------------
// Respaldo. Sin backend, si Francisco pierde el telefono lo pierde todo:
// exportar e importar JSON es el seguro contra ese desastre.

export interface Respaldo {
  formato: 'cotizadora-fenix';
  version: 1;
  generadoEn: number;
  partidas: Partida[];
  materiales: Material[];
  clientes: Cliente[];
  cotizaciones: Cotizacion[];
  meta: MetaRow[];
}

export async function exportarRespaldo(): Promise<Respaldo> {
  const [partidas, materiales, clientes, cotizaciones, meta] = await Promise.all([
    db.partidas.toArray(),
    db.materiales.toArray(),
    db.clientes.toArray(),
    db.cotizaciones.toArray(),
    db.meta.toArray(),
  ]);
  return {
    formato: 'cotizadora-fenix',
    version: 1,
    generadoEn: Date.now(),
    partidas,
    materiales,
    clientes,
    cotizaciones,
    meta,
  };
}

export async function importarRespaldo(datos: unknown): Promise<{ cotizaciones: number }> {
  const r = datos as Partial<Respaldo>;
  if (!r || r.formato !== 'cotizadora-fenix') {
    throw new Error('El archivo no es un respaldo de la cotizadora.');
  }
  await db.transaction(
    'rw',
    db.partidas,
    db.materiales,
    db.clientes,
    db.cotizaciones,
    db.meta,
    async () => {
      await db.partidas.clear();
      await db.materiales.clear();
      await db.clientes.clear();
      await db.cotizaciones.clear();
      await db.meta.clear();
      if (r.partidas?.length) await db.partidas.bulkPut(r.partidas);
      if (r.materiales?.length) await db.materiales.bulkPut(r.materiales);
      if (r.clientes?.length) await db.clientes.bulkPut(r.clientes);
      if (r.cotizaciones?.length) await db.cotizaciones.bulkPut(r.cotizaciones);
      if (r.meta?.length) await db.meta.bulkPut(r.meta);
      await db.meta.put({ clave: META.sembrado, valor: true });
    },
  );
  return { cotizaciones: r.cotizaciones?.length ?? 0 };
}
