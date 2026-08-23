/**
 * Modelo de datos de la cotizadora.
 *
 * Dos convenciones numericas que se respetan en toda la app:
 *  - Todo monto es un entero de CENTAVOS de dolar. Nunca un float.
 *  - Toda cantidad de material es un entero de MILESIMAS de su unidad de
 *    medida (12.5 m = 12500). Asi las recetas admiten fracciones sin flotantes.
 */

export type Cents = number;
export type Milli = number;
/** Puntos base: 10000 = 1.00x */
export type Bps = number;

export const MILLI = 1000;
export const IVA_BPS = 1300; // 13%

export type CategoriaPartida =
  | 'residencial'
  | 'industrial'
  | 'tableros'
  | 'aire'
  | 'iluminacion'
  | 'videovigilancia'
  | 'mantenimiento'
  | 'emergencias';

export const CATEGORIAS: { id: CategoriaPartida; nombre: string; icono: string }[] = [
  { id: 'residencial', nombre: 'Instalacion residencial', icono: 'H' },
  { id: 'industrial', nombre: 'Instalacion industrial', icono: 'I' },
  { id: 'tableros', nombre: 'Tableros y protecciones', icono: 'T' },
  { id: 'aire', nombre: 'Aire acondicionado', icono: 'A' },
  { id: 'iluminacion', nombre: 'Iluminacion', icono: 'L' },
  { id: 'videovigilancia', nombre: 'Videovigilancia', icono: 'C' },
  { id: 'mantenimiento', nombre: 'Mantenimiento', icono: 'M' },
  { id: 'emergencias', nombre: 'Emergencias', icono: 'E' },
];

export type CategoriaMaterial =
  | 'conductores'
  | 'canalizacion'
  | 'cajas'
  | 'dispositivos'
  | 'protecciones'
  | 'tierra'
  | 'accesorios'
  | 'datos'
  | 'climatizacion';

/** Unidad en la que se mide el consumo dentro de una receta. */
export type UnidadMedida = 'm' | 'u';

export interface RenglonReceta {
  materialId: string;
  /** Consumo por UNA unidad de la partida, en milesimas de la unidad de medida. */
  cantidadMilli: Milli;
}

export interface Partida {
  id: string;
  nombre: string;
  descripcion?: string;
  /** Unidad en la que se cotiza la partida: "punto", "m", "tonelada", "servicio". */
  unidad: string;
  /** Precio de MANO DE OBRA unicamente. Nunca incluye material. */
  precioManoObraCents: Cents;
  categoria: CategoriaPartida;
  receta: RenglonReceta[];
  activa: boolean;
}

export interface Material {
  id: string;
  nombre: string;
  unidadMedida: UnidadMedida;
  /** Como lo vende la distribuidora: "rollo de 100 m", "unidad", "bolsa de 100". */
  unidadVenta: string;
  /** Cuanta unidad de medida trae una unidad de venta, en milesimas. */
  contenidoPorUnidadVentaMilli: Milli;
  /** Desperdicio, en porcentaje entero. */
  holguraPct: number;
  /** Precio de REFERENCIA por unidad de venta. Nunca suma al total de Fenix. */
  precioRefCents?: Cents;
  categoria: CategoriaMaterial;
}

export type TipoObra = 'nueva' | 'remodelacion' | 'reparacion';

export interface AjusteTipoObra {
  id: TipoObra;
  nombre: string;
  descripcion: string;
  /** Multiplicador sobre la MANO DE OBRA. Nunca sobre las cantidades de material. */
  multiplicadorBps: Bps;
}

export interface Cliente {
  id: string;
  nombre: string;
  telefono: string;
  correo?: string;
  direccion?: string;
  tipo: 'casa' | 'empresa';
  creadoEn: number;
}

/**
 * Renglon de instalacion dentro de una cotizacion.
 * El nombre, el precio y la receta quedan CONGELADOS al agregarlo: si Francisco
 * sube los precios en enero, la cotizacion de agosto sigue diciendo lo de agosto.
 */
export interface RenglonInstalacion {
  id: string;
  partidaId: string;
  descripcion: string;
  unidad: string;
  cantidad: number;
  precioManoObraCents: Cents;
  /** true si Francisco edito el precio solo en este renglon. */
  precioEditado: boolean;
  recetaCongelada: RenglonReceta[];
}

/** Ajuste manual de Francisco sobre la lista de materiales calculada. */
export interface AjusteMaterial {
  materialId: string;
  /** Unidades de venta forzadas a mano. undefined = respetar el calculo. */
  unidadesVenta?: number;
  /** El cliente ya lo tiene: fuera de la lista. */
  eliminado?: boolean;
}

/** Material que Francisco agrego a mano porque el calculo no lo previo. */
export interface MaterialExtra {
  id: string;
  materialId?: string;
  nombre: string;
  unidadVenta: string;
  unidadesVenta: number;
  precioRefCents?: Cents;
}

export type EstadoCotizacion = 'borrador' | 'enviada' | 'aceptada' | 'rechazada' | 'vencida';

export interface Cotizacion {
  id: string;
  /** Correlativo. null mientras es borrador: se asigna al emitir y jamas se repite. */
  numero: number | null;
  emitidaEn: number | null;
  diasValidez: number;
  clienteId: string;
  /** Copia congelada del cliente al emitir. */
  clienteSnapshot?: Cliente;
  ubicacion: string;
  descripcionProyecto?: string;
  renglones: RenglonInstalacion[];
  tipoObra: TipoObra;
  multiplicadorBps: Bps;
  ajustesMateriales: AjusteMaterial[];
  materialesExtra: MaterialExtra[];
  /** Materiales congelados al emitir, para que la lista no cambie despues. */
  materialesCongelados?: Material[];
  notas?: string;
  condiciones: string;
  mostrarPreciosMateriales: boolean;
  estado: EstadoCotizacion;
  creadaEn: number;
  modificadaEn: number;

  // Puertas que se dejan abiertas para las fases siguientes. No se usan hoy.
  /** Orden de trabajo generada a partir de esta cotizacion aceptada. */
  ordenTrabajoId?: string;
  /** Identificador del cliente en un CRM externo. */
  crmExternoId?: string;
  /** Marca de sincronizacion para cuando exista backend. */
  syncVersion?: number;
}

export interface PerfilEmpresa {
  nombre: string;
  /** Logo en dataURL, guardado en el dispositivo. */
  logoDataUrl?: string;
  telefono: string;
  correo?: string;
  direccion?: string;
  nit?: string;
  nrc?: string;
  condicionesPorDefecto: string;
  diasValidezPorDefecto: number;
  anticipoPct: number;
  garantia: string;
  /** Prefijo del correlativo. Sirve de desempate si algun dia hay dos telefonos. */
  prefijoCorrelativo: string;
}

export interface Ajustes {
  holguraCablePct: number;
  holguraTuberiaPct: number;
  holguraGeneralPct: number;
  tiposObra: AjusteTipoObra[];
}
