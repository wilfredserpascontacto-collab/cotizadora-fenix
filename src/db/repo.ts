import { db, asignarCorrelativo, guardarBorradorActivo, leerAjustes, leerPerfil } from './db';
import { nuevoId, renglonDesdePartida } from '../domain/cotizacion';
import type {
  AjusteMaterial,
  Cliente,
  Cotizacion,
  MaterialExtra,
  Partida,
  RenglonInstalacion,
  TipoObra,
} from '../domain/types';

// ---------------------------------------------------------------------------
// Clientes

export async function crearCliente(
  datos: Omit<Cliente, 'id' | 'creadoEn'>,
): Promise<Cliente> {
  const cliente: Cliente = { ...datos, id: nuevoId(), creadoEn: Date.now() };
  await db.clientes.put(cliente);
  return cliente;
}

export const guardarCliente = (c: Cliente) => db.clientes.put(c);

// ---------------------------------------------------------------------------
// Cotizaciones

export async function crearCotizacion(datos: {
  clienteId: string;
  ubicacion: string;
  tipoObra: TipoObra;
  descripcionProyecto?: string;
}): Promise<Cotizacion> {
  const [perfil, ajustes] = await Promise.all([leerPerfil(), leerAjustes()]);
  const tipo = ajustes.tiposObra.find((t) => t.id === datos.tipoObra) ?? ajustes.tiposObra[0];
  const ahora = Date.now();

  const cot: Cotizacion = {
    id: nuevoId(),
    numero: null, // se asigna al emitir
    emitidaEn: null,
    diasValidez: perfil.diasValidezPorDefecto,
    clienteId: datos.clienteId,
    ubicacion: datos.ubicacion,
    descripcionProyecto: datos.descripcionProyecto,
    renglones: [],
    tipoObra: tipo.id,
    multiplicadorBps: tipo.multiplicadorBps,
    aplicaIva: true,
    ajustesMateriales: [],
    materialesExtra: [],
    condiciones: perfil.condicionesPorDefecto,
    formaPagoId: perfil.formaPagoPorDefectoId,
    clausulasSeleccionadas: ajustes.clausulas.filter((c) => c.porDefecto).map((c) => c.id),
    estado: 'borrador',
    creadaEn: ahora,
    modificadaEn: ahora,
  };
  await db.cotizaciones.put(cot);
  await guardarBorradorActivo(cot.id);
  return cot;
}

/** Guarda la cotizacion completa. Se llama en cada cambio: nada se pierde al cerrar. */
export async function guardarCotizacion(cot: Cotizacion): Promise<void> {
  await db.cotizaciones.put({ ...cot, modificadaEn: Date.now() });
}

export const obtenerCotizacion = (id: string) => db.cotizaciones.get(id);

export async function agregarRenglon(cot: Cotizacion, partida: Partida): Promise<Cotizacion> {
  const existente = cot.renglones.find((r) => r.partidaId === partida.id && !r.precioEditado);
  const renglones = existente
    ? cot.renglones.map((r) => (r.id === existente.id ? { ...r, cantidad: r.cantidad + 1 } : r))
    : [...cot.renglones, renglonDesdePartida(partida)];
  const siguiente = { ...cot, renglones };
  await guardarCotizacion(siguiente);
  return siguiente;
}

export async function cambiarCantidad(
  cot: Cotizacion,
  renglonId: string,
  delta: number,
): Promise<Cotizacion> {
  const renglones = cot.renglones
    .map((r) => (r.id === renglonId ? { ...r, cantidad: r.cantidad + delta } : r))
    .filter((r) => r.cantidad > 0);
  const siguiente = { ...cot, renglones };
  await guardarCotizacion(siguiente);
  return siguiente;
}

export async function actualizarRenglon(
  cot: Cotizacion,
  renglonId: string,
  cambios: Partial<RenglonInstalacion>,
): Promise<Cotizacion> {
  const renglones = cot.renglones.map((r) => (r.id === renglonId ? { ...r, ...cambios } : r));
  const siguiente = { ...cot, renglones };
  await guardarCotizacion(siguiente);
  return siguiente;
}

export async function quitarRenglon(cot: Cotizacion, renglonId: string): Promise<Cotizacion> {
  const siguiente = { ...cot, renglones: cot.renglones.filter((r) => r.id !== renglonId) };
  await guardarCotizacion(siguiente);
  return siguiente;
}

export async function ajustarMaterial(
  cot: Cotizacion,
  ajuste: AjusteMaterial,
): Promise<Cotizacion> {
  const otros = cot.ajustesMateriales.filter((a) => a.materialId !== ajuste.materialId);
  const limpio = ajuste.unidadesVenta === undefined && !ajuste.eliminado;
  const siguiente = {
    ...cot,
    ajustesMateriales: limpio ? otros : [...otros, ajuste],
  };
  await guardarCotizacion(siguiente);
  return siguiente;
}

export async function agregarMaterialExtra(
  cot: Cotizacion,
  extra: Omit<MaterialExtra, 'id'>,
): Promise<Cotizacion> {
  const siguiente = {
    ...cot,
    materialesExtra: [...cot.materialesExtra, { ...extra, id: nuevoId() }],
  };
  await guardarCotizacion(siguiente);
  return siguiente;
}

export async function quitarMaterialExtra(cot: Cotizacion, extraId: string): Promise<Cotizacion> {
  const siguiente = {
    ...cot,
    materialesExtra: cot.materialesExtra.filter((e) => e.id !== extraId),
  };
  await guardarCotizacion(siguiente);
  return siguiente;
}

/**
 * Emite la cotizacion: le asigna el correlativo, congela el cliente y los
 * materiales, y la saca del estado borrador. Idempotente: si ya tiene numero
 * no lo vuelve a pedir, para no quemar correlativos al reenviar por WhatsApp.
 */
export async function emitirCotizacion(cot: Cotizacion): Promise<Cotizacion> {
  if (cot.numero !== null) return cot;

  const [cliente, materiales, ajustes] = await Promise.all([
    db.clientes.get(cot.clienteId),
    db.materiales.toArray(),
    leerAjustes(),
  ]);
  const usados = new Set<string>();
  for (const r of cot.renglones) for (const l of r.recetaCongelada) usados.add(l.materialId);

  const numero = await asignarCorrelativo();
  const emitida: Cotizacion = {
    ...cot,
    numero,
    emitidaEn: Date.now(),
    estado: 'enviada',
    clienteSnapshot: cliente,
    materialesCongelados: materiales.filter((m) => usados.has(m.id)),
    clausulasCongeladas: ajustes.clausulas
      .filter((c) => (cot.clausulasSeleccionadas ?? []).includes(c.id))
      .map((c) => c.texto),
  };
  await guardarCotizacion(emitida);
  await guardarBorradorActivo(null);
  return emitida;
}

export async function cambiarEstado(
  cot: Cotizacion,
  estado: Cotizacion['estado'],
): Promise<Cotizacion> {
  const siguiente = { ...cot, estado };
  await guardarCotizacion(siguiente);
  return siguiente;
}

/** Duplica una cotizacion anterior. Vuelve a ser borrador y sin correlativo. */
export async function duplicarCotizacion(cot: Cotizacion): Promise<Cotizacion> {
  const ahora = Date.now();
  const copia: Cotizacion = {
    ...cot,
    id: nuevoId(),
    numero: null,
    emitidaEn: null,
    estado: 'borrador',
    clienteSnapshot: undefined,
    materialesCongelados: undefined,
    renglones: cot.renglones.map((r) => ({
      ...r,
      id: nuevoId(),
      recetaCongelada: r.recetaCongelada.map((l) => ({ ...l })),
    })),
    ajustesMateriales: cot.ajustesMateriales.map((a) => ({ ...a })),
    materialesExtra: cot.materialesExtra.map((e) => ({ ...e, id: nuevoId() })),
    creadaEn: ahora,
    modificadaEn: ahora,
  };
  await db.cotizaciones.put(copia);
  await guardarBorradorActivo(copia.id);
  return copia;
}

/** Solo se borran borradores: una cotizacion emitida dejaria un hueco en la serie. */
export async function eliminarBorrador(cot: Cotizacion): Promise<void> {
  if (cot.numero !== null) throw new Error('Una cotizacion ya emitida no se puede eliminar.');
  await db.cotizaciones.delete(cot.id);
  await guardarBorradorActivo(null);
}

// ---------------------------------------------------------------------------
// Catalogos

export const guardarPartida = (p: Partida) => db.partidas.put(p);
export const eliminarPartida = (id: string) => db.partidas.delete(id);
export const guardarMaterial = (m: Parameters<typeof db.materiales.put>[0]) => db.materiales.put(m);
export const eliminarMaterial = (id: string) => db.materiales.delete(id);
