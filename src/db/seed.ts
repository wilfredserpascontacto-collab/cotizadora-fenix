import type { Ajustes, Cliente, Material, Partida, PerfilEmpresa } from '../domain/types';
// El logo viaja incrustado en el bundle: los PDF se arman en el telefono, sin red.
import logoFenix from '../assets/logo-fenix.png';

/** Atajo: metros o unidades a milesimas. m(12.5) -> 12500 */
const m = (n: number) => Math.round(n * 1000);
/** Atajo: dolares a centavos. d(12.5) -> 1250 */
const d = (n: number) => Math.round(n * 100);

/**
 * Catalogo de materiales.
 * La unidad de venta es lo que hace util la lista: el cliente compra rollos y
 * tubos, no metros sueltos. Sin precios: Francisco no los maneja.
 */
export const MATERIALES_SEED: Material[] = [
  // Conductores — se venden en rollo, holgura 10% porque el cable se corta.
  { id: 'cable-thhn-10', nombre: 'Cable THHN #10', unidadMedida: 'm', unidadVenta: 'rollo de 100 m', contenidoPorUnidadVentaMilli: m(100), holguraPct: 10, categoria: 'conductores' },
  { id: 'cable-thhn-12', nombre: 'Cable THHN #12', unidadMedida: 'm', unidadVenta: 'rollo de 100 m', contenidoPorUnidadVentaMilli: m(100), holguraPct: 10, categoria: 'conductores' },
  { id: 'cable-thhn-14', nombre: 'Cable THHN #14', unidadMedida: 'm', unidadVenta: 'rollo de 100 m', contenidoPorUnidadVentaMilli: m(100), holguraPct: 10, categoria: 'conductores' },
  { id: 'cable-desnudo-6', nombre: 'Cable desnudo de cobre #6', unidadMedida: 'm', unidadVenta: 'metro', contenidoPorUnidadVentaMilli: m(1), holguraPct: 10, categoria: 'tierra' },
  // #8 y #6 son para acometida y alimentadores de tablero: llevan mas carga que un punto suelto.
  { id: 'cable-thhn-8', nombre: 'Cable THHN #8', unidadMedida: 'm', unidadVenta: 'rollo de 100 m', contenidoPorUnidadVentaMilli: m(100), holguraPct: 10, categoria: 'conductores' },
  { id: 'cable-thhn-6', nombre: 'Cable THHN #6', unidadMedida: 'm', unidadVenta: 'rollo de 100 m', contenidoPorUnidadVentaMilli: m(100), holguraPct: 10, categoria: 'conductores' },

  // Canalizacion — el tubo viene de 3 m, holgura 10%.
  { id: 'tuberia-pvc-12', nombre: 'Tubería PVC eléctrica 1/2"', unidadMedida: 'm', unidadVenta: 'tubo de 3 m', contenidoPorUnidadVentaMilli: m(3), holguraPct: 10, categoria: 'canalizacion' },
  { id: 'tuberia-pvc-34', nombre: 'Tubería PVC eléctrica 3/4"', unidadMedida: 'm', unidadVenta: 'tubo de 3 m', contenidoPorUnidadVentaMilli: m(3), holguraPct: 10, categoria: 'canalizacion' },
  { id: 'canaleta', nombre: 'Canaleta plástica 20x12 mm', unidadMedida: 'm', unidadVenta: 'tramo de 2 m', contenidoPorUnidadVentaMilli: m(2), holguraPct: 10, categoria: 'canalizacion' },
  { id: 'curva-pvc-12', nombre: 'Curva PVC 1/2"', unidadMedida: 'u', unidadVenta: 'unidad', contenidoPorUnidadVentaMilli: m(1), holguraPct: 5, categoria: 'canalizacion' },
  { id: 'curva-pvc-34', nombre: 'Curva PVC 3/4"', unidadMedida: 'u', unidadVenta: 'unidad', contenidoPorUnidadVentaMilli: m(1), holguraPct: 5, categoria: 'canalizacion' },
  { id: 'conector-pvc-12', nombre: 'Conector PVC 1/2"', unidadMedida: 'u', unidadVenta: 'unidad', contenidoPorUnidadVentaMilli: m(1), holguraPct: 5, categoria: 'canalizacion' },
  { id: 'conector-pvc-34', nombre: 'Conector PVC 3/4"', unidadMedida: 'u', unidadVenta: 'unidad', contenidoPorUnidadVentaMilli: m(1), holguraPct: 5, categoria: 'canalizacion' },
  { id: 'pegamento-pvc', nombre: 'Cemento/pegamento para tubería PVC', unidadMedida: 'u', unidadVenta: 'bote de 1/4 galón', contenidoPorUnidadVentaMilli: m(1), holguraPct: 5, categoria: 'canalizacion' },
  { id: 'abrazadera-tuberia', nombre: 'Abrazadera para tubería', unidadMedida: 'u', unidadVenta: 'bolsa de 25', contenidoPorUnidadVentaMilli: m(25), holguraPct: 5, categoria: 'canalizacion' },

  // Cajas
  { id: 'caja-rect', nombre: 'Caja rectangular PVC', unidadMedida: 'u', unidadVenta: 'unidad', contenidoPorUnidadVentaMilli: m(1), holguraPct: 5, categoria: 'cajas' },
  { id: 'caja-octagonal', nombre: 'Caja octagonal PVC', unidadMedida: 'u', unidadVenta: 'unidad', contenidoPorUnidadVentaMilli: m(1), holguraPct: 5, categoria: 'cajas' },
  { id: 'caja-registro-4x4', nombre: 'Caja de registro 4x4', unidadMedida: 'u', unidadVenta: 'unidad', contenidoPorUnidadVentaMilli: m(1), holguraPct: 5, categoria: 'cajas' },
  { id: 'tapadera-ciega', nombre: 'Tapadera ciega para caja', unidadMedida: 'u', unidadVenta: 'unidad', contenidoPorUnidadVentaMilli: m(1), holguraPct: 5, categoria: 'cajas' },

  // Dispositivos
  { id: 'toma-doble-pol', nombre: 'Tomacorriente doble polarizado 110V', unidadMedida: 'u', unidadVenta: 'unidad', contenidoPorUnidadVentaMilli: m(1), holguraPct: 5, categoria: 'dispositivos' },
  { id: 'toma-220', nombre: 'Tomacorriente 220V', unidadMedida: 'u', unidadVenta: 'unidad', contenidoPorUnidadVentaMilli: m(1), holguraPct: 0, categoria: 'dispositivos' },
  { id: 'toma-gfci', nombre: 'Tomacorriente GFCI 110V (baño/cocina/exterior)', unidadMedida: 'u', unidadVenta: 'unidad', contenidoPorUnidadVentaMilli: m(1), holguraPct: 0, categoria: 'dispositivos' },
  { id: 'interruptor-sencillo', nombre: 'Interruptor sencillo', unidadMedida: 'u', unidadVenta: 'unidad', contenidoPorUnidadVentaMilli: m(1), holguraPct: 5, categoria: 'dispositivos' },
  { id: 'interruptor-doble', nombre: 'Interruptor doble', unidadMedida: 'u', unidadVenta: 'unidad', contenidoPorUnidadVentaMilli: m(1), holguraPct: 5, categoria: 'dispositivos' },
  { id: 'interruptor-3vias', nombre: 'Interruptor de tres vías', unidadMedida: 'u', unidadVenta: 'unidad', contenidoPorUnidadVentaMilli: m(1), holguraPct: 0, categoria: 'dispositivos' },
  { id: 'placa-1', nombre: 'Placa de 1 posición', unidadMedida: 'u', unidadVenta: 'unidad', contenidoPorUnidadVentaMilli: m(1), holguraPct: 5, categoria: 'dispositivos' },
  { id: 'placa-2', nombre: 'Placa de 2 posiciones', unidadMedida: 'u', unidadVenta: 'unidad', contenidoPorUnidadVentaMilli: m(1), holguraPct: 5, categoria: 'dispositivos' },

  // Protecciones — holgura 0: una pieza cara y discreta no se "desperdicia",
  // y un 5% sobre una unidad obligaria a comprar dos tableros.
  { id: 'breaker-1x15', nombre: 'Breaker 1x15A', unidadMedida: 'u', unidadVenta: 'unidad', contenidoPorUnidadVentaMilli: m(1), holguraPct: 0, categoria: 'protecciones' },
  { id: 'breaker-1x20', nombre: 'Breaker 1x20A', unidadMedida: 'u', unidadVenta: 'unidad', contenidoPorUnidadVentaMilli: m(1), holguraPct: 0, categoria: 'protecciones' },
  { id: 'breaker-1x30', nombre: 'Breaker 1x30A', unidadMedida: 'u', unidadVenta: 'unidad', contenidoPorUnidadVentaMilli: m(1), holguraPct: 0, categoria: 'protecciones' },
  { id: 'breaker-2x30', nombre: 'Breaker 2x30A', unidadMedida: 'u', unidadVenta: 'unidad', contenidoPorUnidadVentaMilli: m(1), holguraPct: 0, categoria: 'protecciones' },
  { id: 'breaker-2x50', nombre: 'Breaker 2x50A', unidadMedida: 'u', unidadVenta: 'unidad', contenidoPorUnidadVentaMilli: m(1), holguraPct: 0, categoria: 'protecciones' },
  { id: 'breaker-principal-2x100', nombre: 'Breaker principal 2x100A', unidadMedida: 'u', unidadVenta: 'unidad', contenidoPorUnidadVentaMilli: m(1), holguraPct: 0, categoria: 'protecciones' },
  { id: 'caja-termica-4', nombre: 'Caja térmica de 4 espacios', unidadMedida: 'u', unidadVenta: 'unidad', contenidoPorUnidadVentaMilli: m(1), holguraPct: 0, categoria: 'protecciones' },
  { id: 'caja-termica-8', nombre: 'Caja térmica de 8 espacios', unidadMedida: 'u', unidadVenta: 'unidad', contenidoPorUnidadVentaMilli: m(1), holguraPct: 0, categoria: 'protecciones' },
  { id: 'caja-termica-12', nombre: 'Caja térmica de 12 espacios', unidadMedida: 'u', unidadVenta: 'unidad', contenidoPorUnidadVentaMilli: m(1), holguraPct: 0, categoria: 'protecciones' },
  { id: 'caja-termica-20', nombre: 'Caja térmica de 20 espacios', unidadMedida: 'u', unidadVenta: 'unidad', contenidoPorUnidadVentaMilli: m(1), holguraPct: 0, categoria: 'protecciones' },

  // Tierra — la varilla y la barra tampoco llevan holgura.
  { id: 'barra-tierra', nombre: 'Barra de tierra para tablero', unidadMedida: 'u', unidadVenta: 'unidad', contenidoPorUnidadVentaMilli: m(1), holguraPct: 0, categoria: 'tierra' },
  { id: 'varilla-tierra', nombre: 'Varilla de polo a tierra 5/8" x 6 pies', unidadMedida: 'u', unidadVenta: 'unidad', contenidoPorUnidadVentaMilli: m(1), holguraPct: 0, categoria: 'tierra' },

  // Accesorios
  { id: 'cinta-aislante', nombre: 'Cinta aislante', unidadMedida: 'u', unidadVenta: 'rollo', contenidoPorUnidadVentaMilli: m(1), holguraPct: 5, categoria: 'accesorios' },
  { id: 'amarras', nombre: 'Amarras plásticas', unidadMedida: 'u', unidadVenta: 'bolsa de 100', contenidoPorUnidadVentaMilli: m(100), holguraPct: 5, categoria: 'accesorios' },
  { id: 'tornillos-chazos', nombre: 'Tornillos y chazos', unidadMedida: 'u', unidadVenta: 'bolsa de 50 juegos', contenidoPorUnidadVentaMilli: m(50), holguraPct: 5, categoria: 'accesorios' },
  { id: 'conector-cable', nombre: 'Conector para cable (capuchón)', unidadMedida: 'u', unidadVenta: 'bolsa de 100', contenidoPorUnidadVentaMilli: m(100), holguraPct: 5, categoria: 'accesorios' },

  // Datos
  { id: 'cable-utp-cat6', nombre: 'Cable UTP categoría 6', unidadMedida: 'm', unidadVenta: 'rollo de 305 m', contenidoPorUnidadVentaMilli: m(305), holguraPct: 10, categoria: 'datos' },
  { id: 'conector-rj45', nombre: 'Conector RJ45 categoría 6', unidadMedida: 'u', unidadVenta: 'unidad', contenidoPorUnidadVentaMilli: m(1), holguraPct: 5, categoria: 'datos' },
  { id: 'disco-duro-dvr', nombre: 'Disco duro para DVR/NVR', unidadMedida: 'u', unidadVenta: 'unidad', contenidoPorUnidadVentaMilli: m(1), holguraPct: 0, categoria: 'datos' },

  // Climatizacion
  { id: 'set-tuberia-cobre', nombre: 'Set tubería de cobre 1/4" y 3/8"', unidadMedida: 'u', unidadVenta: 'juego de 3 m', contenidoPorUnidadVentaMilli: m(1), holguraPct: 0, categoria: 'climatizacion' },
  { id: 'soporte-minisplit', nombre: 'Soporte de pared para mini split', unidadMedida: 'u', unidadVenta: 'juego', contenidoPorUnidadVentaMilli: m(1), holguraPct: 0, categoria: 'climatizacion' },
  { id: 'aislante-tuberia-cobre', nombre: 'Aislante térmico (armaflex) para tubería de cobre', unidadMedida: 'm', unidadVenta: 'tramo de 2 m', contenidoPorUnidadVentaMilli: m(2), holguraPct: 5, categoria: 'climatizacion' },
  { id: 'manguera-drenaje', nombre: 'Manguera de drenaje para mini split', unidadMedida: 'm', unidadVenta: 'rollo de 10 m', contenidoPorUnidadVentaMilli: m(10), holguraPct: 5, categoria: 'climatizacion' },
  { id: 'desconectador-minisplit', nombre: 'Cuchilla de desconexión para mini split', unidadMedida: 'u', unidadVenta: 'unidad', contenidoPorUnidadVentaMilli: m(1), holguraPct: 0, categoria: 'climatizacion' },

  // Acometida
  { id: 'base-medidor', nombre: 'Base para medidor monofásica', unidadMedida: 'u', unidadVenta: 'unidad', contenidoPorUnidadVentaMilli: m(1), holguraPct: 0, categoria: 'acometida' },
];

/**
 * Catalogo de partidas de instalacion.
 * El precio es SOLO mano de obra. Francisco los va a corregir; lo que importa
 * es que la partida exista, este bien nombrada y traiga su receta.
 */
export const PARTIDAS_SEED: Partida[] = [
  {
    id: 'toma-110', nombre: 'Tomacorriente doble polarizado 110V', unidad: 'punto',
    precioManoObraCents: d(12), categoria: 'residencial', activa: true,
    descripcion: 'Punto de tomacorriente con canalización y conexión.',
    receta: [
      { materialId: 'cable-thhn-12', cantidadMilli: m(12) },
      { materialId: 'tuberia-pvc-12', cantidadMilli: m(3) },
      { materialId: 'caja-rect', cantidadMilli: m(1) },
      { materialId: 'curva-pvc-12', cantidadMilli: m(1) },
      { materialId: 'conector-pvc-12', cantidadMilli: m(2) },
      { materialId: 'toma-doble-pol', cantidadMilli: m(1) },
      { materialId: 'placa-1', cantidadMilli: m(1) },
      { materialId: 'cinta-aislante', cantidadMilli: m(0.15) },
      { materialId: 'conector-cable', cantidadMilli: m(2) },
      { materialId: 'pegamento-pvc', cantidadMilli: m(0.02) },
      { materialId: 'tornillos-chazos', cantidadMilli: m(2) },
    ],
  },
  {
    id: 'toma-220', nombre: 'Tomacorriente 220V para aire o estufa', unidad: 'punto',
    precioManoObraCents: d(28), categoria: 'residencial', activa: true,
    descripcion: 'Instalación de circuito dedicado 220V con su protección.',
    receta: [
      { materialId: 'cable-thhn-10', cantidadMilli: m(20) },
      { materialId: 'tuberia-pvc-34', cantidadMilli: m(6) },
      { materialId: 'caja-rect', cantidadMilli: m(1) },
      { materialId: 'curva-pvc-34', cantidadMilli: m(1) },
      { materialId: 'conector-pvc-34', cantidadMilli: m(2) },
      { materialId: 'toma-220', cantidadMilli: m(1) },
      { materialId: 'placa-1', cantidadMilli: m(1) },
      { materialId: 'breaker-2x30', cantidadMilli: m(1) },
      { materialId: 'cinta-aislante', cantidadMilli: m(0.25) },
      { materialId: 'conector-cable', cantidadMilli: m(2) },
      { materialId: 'pegamento-pvc', cantidadMilli: m(0.03) },
      { materialId: 'tornillos-chazos', cantidadMilli: m(2) },
    ],
  },
  {
    id: 'toma-gfci', nombre: 'Tomacorriente GFCI (baño, cocina o exterior)', unidad: 'punto',
    precioManoObraCents: d(15), categoria: 'residencial', activa: true,
    descripcion: 'Punto con protección de falla a tierra, para áreas húmedas.',
    receta: [
      { materialId: 'cable-thhn-12', cantidadMilli: m(12) },
      { materialId: 'tuberia-pvc-12', cantidadMilli: m(3) },
      { materialId: 'caja-rect', cantidadMilli: m(1) },
      { materialId: 'curva-pvc-12', cantidadMilli: m(1) },
      { materialId: 'conector-pvc-12', cantidadMilli: m(2) },
      { materialId: 'toma-gfci', cantidadMilli: m(1) },
      { materialId: 'placa-1', cantidadMilli: m(1) },
      { materialId: 'cinta-aislante', cantidadMilli: m(0.15) },
      { materialId: 'conector-cable', cantidadMilli: m(2) },
      { materialId: 'pegamento-pvc', cantidadMilli: m(0.02) },
      { materialId: 'tornillos-chazos', cantidadMilli: m(2) },
    ],
  },
  {
    id: 'salida-luminaria', nombre: 'Salida de luminaria', unidad: 'punto',
    precioManoObraCents: d(10), categoria: 'residencial', activa: true,
    receta: [
      { materialId: 'cable-thhn-12', cantidadMilli: m(10) },
      { materialId: 'tuberia-pvc-12', cantidadMilli: m(3) },
      { materialId: 'caja-octagonal', cantidadMilli: m(1) },
      { materialId: 'curva-pvc-12', cantidadMilli: m(1) },
      { materialId: 'conector-pvc-12', cantidadMilli: m(2) },
      { materialId: 'cinta-aislante', cantidadMilli: m(0.1) },
      { materialId: 'conector-cable', cantidadMilli: m(3) },
      { materialId: 'pegamento-pvc', cantidadMilli: m(0.02) },
      { materialId: 'tornillos-chazos', cantidadMilli: m(2) },
    ],
  },
  {
    id: 'interruptor-sencillo', nombre: 'Interruptor sencillo', unidad: 'punto',
    precioManoObraCents: d(9), categoria: 'residencial', activa: true,
    receta: [
      { materialId: 'cable-thhn-12', cantidadMilli: m(8) },
      { materialId: 'tuberia-pvc-12', cantidadMilli: m(2.5) },
      { materialId: 'caja-rect', cantidadMilli: m(1) },
      { materialId: 'conector-pvc-12', cantidadMilli: m(2) },
      { materialId: 'interruptor-sencillo', cantidadMilli: m(1) },
      { materialId: 'placa-1', cantidadMilli: m(1) },
      { materialId: 'cinta-aislante', cantidadMilli: m(0.1) },
      { materialId: 'conector-cable', cantidadMilli: m(2) },
      { materialId: 'pegamento-pvc', cantidadMilli: m(0.02) },
      { materialId: 'tornillos-chazos', cantidadMilli: m(2) },
    ],
  },
  {
    id: 'interruptor-doble', nombre: 'Interruptor doble', unidad: 'punto',
    precioManoObraCents: d(12), categoria: 'residencial', activa: true,
    receta: [
      { materialId: 'cable-thhn-12', cantidadMilli: m(11) },
      { materialId: 'tuberia-pvc-12', cantidadMilli: m(2.5) },
      { materialId: 'caja-rect', cantidadMilli: m(1) },
      { materialId: 'conector-pvc-12', cantidadMilli: m(2) },
      { materialId: 'interruptor-doble', cantidadMilli: m(1) },
      { materialId: 'placa-1', cantidadMilli: m(1) },
      { materialId: 'cinta-aislante', cantidadMilli: m(0.12) },
      { materialId: 'conector-cable', cantidadMilli: m(3) },
      { materialId: 'pegamento-pvc', cantidadMilli: m(0.02) },
      { materialId: 'tornillos-chazos', cantidadMilli: m(2) },
    ],
  },
  {
    id: 'interruptor-3vias', nombre: 'Interruptor conmutado de tres vías', unidad: 'punto',
    precioManoObraCents: d(18), categoria: 'residencial', activa: true,
    descripcion:
      'Precio por punto. Un conmutado típico lleva dos puntos: entre ambos corre el cable viajero (traveler) que hace posible prender/apagar desde los dos interruptores.',
    receta: [
      { materialId: 'cable-thhn-12', cantidadMilli: m(14) },
      { materialId: 'tuberia-pvc-12', cantidadMilli: m(4) },
      { materialId: 'caja-rect', cantidadMilli: m(1) },
      { materialId: 'conector-pvc-12', cantidadMilli: m(2) },
      { materialId: 'interruptor-3vias', cantidadMilli: m(1) },
      { materialId: 'placa-1', cantidadMilli: m(1) },
      { materialId: 'cinta-aislante', cantidadMilli: m(0.15) },
      { materialId: 'conector-cable', cantidadMilli: m(3) },
      { materialId: 'pegamento-pvc', cantidadMilli: m(0.03) },
      { materialId: 'tornillos-chazos', cantidadMilli: m(2) },
    ],
  },
  {
    id: 'timbre', nombre: 'Timbre', unidad: 'punto',
    precioManoObraCents: d(18), categoria: 'residencial', activa: true,
    receta: [
      { materialId: 'cable-thhn-14', cantidadMilli: m(12) },
      { materialId: 'tuberia-pvc-12', cantidadMilli: m(3) },
      { materialId: 'caja-rect', cantidadMilli: m(1) },
      { materialId: 'conector-pvc-12', cantidadMilli: m(2) },
      { materialId: 'cinta-aislante', cantidadMilli: m(0.1) },
      { materialId: 'conector-cable', cantidadMilli: m(2) },
      { materialId: 'pegamento-pvc', cantidadMilli: m(0.02) },
      { materialId: 'tornillos-chazos', cantidadMilli: m(2) },
    ],
  },
  {
    id: 'acometida-residencial', nombre: 'Acometida eléctrica residencial', unidad: 'servicio',
    precioManoObraCents: d(180), categoria: 'residencial', activa: true,
    descripcion:
      'Desde el punto de entrega de la distribuidora hasta el tablero principal. El calibre 6 y el interruptor principal son el mínimo que suele exigir la normativa de la distribuidora (AES/CAESS) para el servicio monofásico.',
    receta: [
      { materialId: 'cable-thhn-6', cantidadMilli: m(30) },
      { materialId: 'tuberia-pvc-34', cantidadMilli: m(9) },
      { materialId: 'curva-pvc-34', cantidadMilli: m(2) },
      { materialId: 'conector-pvc-34', cantidadMilli: m(4) },
      { materialId: 'abrazadera-tuberia', cantidadMilli: m(4) },
      { materialId: 'pegamento-pvc', cantidadMilli: m(0.05) },
      { materialId: 'caja-rect', cantidadMilli: m(1) },
      { materialId: 'base-medidor', cantidadMilli: m(1) },
      { materialId: 'breaker-principal-2x100', cantidadMilli: m(1) },
      { materialId: 'varilla-tierra', cantidadMilli: m(1) },
      { materialId: 'cable-desnudo-6', cantidadMilli: m(6) },
      { materialId: 'cinta-aislante', cantidadMilli: m(0.5) },
      { materialId: 'conector-cable', cantidadMilli: m(4) },
      { materialId: 'tornillos-chazos', cantidadMilli: m(6) },
    ],
  },

  // Tableros y protecciones
  {
    id: 'caja-termica-4', nombre: 'Caja térmica de 4 espacios', unidad: 'unidad',
    precioManoObraCents: d(45), categoria: 'tableros', activa: true,
    receta: [
      { materialId: 'caja-termica-4', cantidadMilli: m(1) },
      { materialId: 'barra-tierra', cantidadMilli: m(1) },
      { materialId: 'cable-thhn-10', cantidadMilli: m(6) },
      { materialId: 'cable-desnudo-6', cantidadMilli: m(3) },
      { materialId: 'cinta-aislante', cantidadMilli: m(0.3) },
      { materialId: 'conector-cable', cantidadMilli: m(3) },
      { materialId: 'tornillos-chazos', cantidadMilli: m(4) },
    ],
  },
  {
    id: 'caja-termica-8', nombre: 'Caja térmica de 8 espacios', unidad: 'unidad',
    precioManoObraCents: d(65), categoria: 'tableros', activa: true,
    receta: [
      { materialId: 'caja-termica-8', cantidadMilli: m(1) },
      { materialId: 'barra-tierra', cantidadMilli: m(1) },
      { materialId: 'cable-thhn-10', cantidadMilli: m(8) },
      { materialId: 'cable-desnudo-6', cantidadMilli: m(3) },
      { materialId: 'cinta-aislante', cantidadMilli: m(0.4) },
      { materialId: 'conector-cable', cantidadMilli: m(3) },
      { materialId: 'tornillos-chazos', cantidadMilli: m(4) },
    ],
  },
  {
    id: 'caja-termica-12', nombre: 'Caja térmica de 12 espacios', unidad: 'unidad',
    precioManoObraCents: d(85), categoria: 'tableros', activa: true,
    descripcion: 'Alimentador en calibre 8: un tablero de 12 espacios ya mueve más carga que uno chico.',
    receta: [
      { materialId: 'caja-termica-12', cantidadMilli: m(1) },
      { materialId: 'barra-tierra', cantidadMilli: m(1) },
      { materialId: 'cable-thhn-8', cantidadMilli: m(10) },
      { materialId: 'cable-desnudo-6', cantidadMilli: m(4) },
      { materialId: 'cinta-aislante', cantidadMilli: m(0.5) },
      { materialId: 'conector-cable', cantidadMilli: m(4) },
      { materialId: 'tornillos-chazos', cantidadMilli: m(6) },
    ],
  },
  {
    id: 'caja-termica-20', nombre: 'Caja térmica de 20 espacios', unidad: 'unidad',
    precioManoObraCents: d(120), categoria: 'tableros', activa: true,
    descripcion: 'Alimentador en calibre 6, igual que la acometida: es un tablero para toda la carga de la casa.',
    receta: [
      { materialId: 'caja-termica-20', cantidadMilli: m(1) },
      { materialId: 'barra-tierra', cantidadMilli: m(1) },
      { materialId: 'cable-thhn-6', cantidadMilli: m(12) },
      { materialId: 'cable-desnudo-6', cantidadMilli: m(5) },
      { materialId: 'cinta-aislante', cantidadMilli: m(0.6) },
      { materialId: 'conector-cable', cantidadMilli: m(5) },
      { materialId: 'tornillos-chazos', cantidadMilli: m(8) },
    ],
  },
  {
    id: 'instalacion-breaker', nombre: 'Instalación de breaker', unidad: 'unidad',
    precioManoObraCents: d(8), categoria: 'tableros', activa: true,
    receta: [
      { materialId: 'breaker-1x20', cantidadMilli: m(1) },
      { materialId: 'cinta-aislante', cantidadMilli: m(0.05) },
      { materialId: 'conector-cable', cantidadMilli: m(1) },
    ],
  },
  {
    id: 'polo-a-tierra', nombre: 'Sistema de polo a tierra', unidad: 'servicio',
    precioManoObraCents: d(95), categoria: 'tableros', activa: true,
    receta: [
      { materialId: 'varilla-tierra', cantidadMilli: m(1) },
      { materialId: 'cable-desnudo-6', cantidadMilli: m(8) },
      { materialId: 'barra-tierra', cantidadMilli: m(1) },
      { materialId: 'cinta-aislante', cantidadMilli: m(0.2) },
      { materialId: 'conector-cable', cantidadMilli: m(2) },
      { materialId: 'tornillos-chazos', cantidadMilli: m(2) },
    ],
  },

  // Aire acondicionado
  {
    id: 'minisplit-tonelada', nombre: 'Instalación de mini split', unidad: 'tonelada',
    precioManoObraCents: d(85), categoria: 'aire', activa: true,
    descripcion: 'Precio por tonelada de capacidad. Un equipo de 2 toneladas cuenta 2.',
    receta: [
      { materialId: 'set-tuberia-cobre', cantidadMilli: m(1) },
      { materialId: 'aislante-tuberia-cobre', cantidadMilli: m(3) },
      { materialId: 'soporte-minisplit', cantidadMilli: m(1) },
      { materialId: 'desconectador-minisplit', cantidadMilli: m(1) },
      { materialId: 'manguera-drenaje', cantidadMilli: m(3) },
      { materialId: 'cable-thhn-12', cantidadMilli: m(12) },
      { materialId: 'tuberia-pvc-12', cantidadMilli: m(2) },
      { materialId: 'pegamento-pvc', cantidadMilli: m(0.02) },
      { materialId: 'breaker-2x30', cantidadMilli: m(1) },
      { materialId: 'canaleta', cantidadMilli: m(3) },
      { materialId: 'amarras', cantidadMilli: m(6) },
      { materialId: 'cinta-aislante', cantidadMilli: m(0.3) },
      { materialId: 'conector-cable', cantidadMilli: m(2) },
      { materialId: 'tornillos-chazos', cantidadMilli: m(6) },
    ],
  },

  // Iluminacion
  {
    id: 'luminaria-led-empotrada', nombre: 'Luminaria LED empotrada', unidad: 'unidad',
    precioManoObraCents: d(8), categoria: 'iluminacion', activa: true,
    descripcion: 'Montaje y conexión. La luminaria la pone el cliente.',
    receta: [
      { materialId: 'cable-thhn-14', cantidadMilli: m(5) },
      { materialId: 'caja-octagonal', cantidadMilli: m(1) },
      { materialId: 'conector-pvc-12', cantidadMilli: m(1) },
      { materialId: 'cinta-aislante', cantidadMilli: m(0.05) },
      { materialId: 'conector-cable', cantidadMilli: m(2) },
      { materialId: 'tornillos-chazos', cantidadMilli: m(2) },
    ],
  },
  {
    id: 'lampara-techo', nombre: 'Lámpara de techo', unidad: 'unidad',
    precioManoObraCents: d(12), categoria: 'iluminacion', activa: true,
    receta: [
      { materialId: 'cable-thhn-14', cantidadMilli: m(4) },
      { materialId: 'caja-octagonal', cantidadMilli: m(1) },
      { materialId: 'cinta-aislante', cantidadMilli: m(0.05) },
      { materialId: 'conector-cable', cantidadMilli: m(2) },
      { materialId: 'tornillos-chazos', cantidadMilli: m(3) },
    ],
  },
  {
    id: 'ventilador-techo', nombre: 'Ventilador de techo', unidad: 'unidad',
    precioManoObraCents: d(25), categoria: 'iluminacion', activa: true,
    receta: [
      { materialId: 'cable-thhn-12', cantidadMilli: m(5) },
      { materialId: 'caja-octagonal', cantidadMilli: m(1) },
      { materialId: 'cinta-aislante', cantidadMilli: m(0.1) },
      { materialId: 'conector-cable', cantidadMilli: m(2) },
      { materialId: 'tornillos-chazos', cantidadMilli: m(4) },
    ],
  },
  {
    id: 'sensor-movimiento', nombre: 'Sensor de movimiento', unidad: 'unidad',
    precioManoObraCents: d(15), categoria: 'iluminacion', activa: true,
    receta: [
      { materialId: 'cable-thhn-12', cantidadMilli: m(6) },
      { materialId: 'caja-rect', cantidadMilli: m(1) },
      { materialId: 'conector-pvc-12', cantidadMilli: m(1) },
      { materialId: 'placa-1', cantidadMilli: m(1) },
      { materialId: 'cinta-aislante', cantidadMilli: m(0.1) },
      { materialId: 'conector-cable', cantidadMilli: m(2) },
      { materialId: 'tornillos-chazos', cantidadMilli: m(2) },
    ],
  },

  // Videovigilancia
  {
    id: 'camara-videovigilancia', nombre: 'Cámara de videovigilancia', unidad: 'unidad',
    precioManoObraCents: d(35), categoria: 'videovigilancia', activa: true,
    descripcion: 'Montaje, cableado y configuración de cámara IP con alimentación PoE. La cámara la pone el cliente.',
    receta: [
      { materialId: 'cable-utp-cat6', cantidadMilli: m(25) },
      { materialId: 'conector-rj45', cantidadMilli: m(2) },
      { materialId: 'canaleta', cantidadMilli: m(6) },
      { materialId: 'tuberia-pvc-12', cantidadMilli: m(2) },
      { materialId: 'pegamento-pvc', cantidadMilli: m(0.01) },
      { materialId: 'amarras', cantidadMilli: m(8) },
      { materialId: 'tornillos-chazos', cantidadMilli: m(4) },
    ],
  },
  {
    id: 'grabador-dvr', nombre: 'Grabador DVR', unidad: 'unidad',
    precioManoObraCents: d(45), categoria: 'videovigilancia', activa: true,
    descripcion: 'Instalación y configuración del grabador. Incluye su disco duro de almacenamiento.',
    receta: [
      { materialId: 'disco-duro-dvr', cantidadMilli: m(1) },
      { materialId: 'conector-rj45', cantidadMilli: m(2) },
      { materialId: 'canaleta', cantidadMilli: m(2) },
      { materialId: 'amarras', cantidadMilli: m(4) },
      { materialId: 'tornillos-chazos', cantidadMilli: m(4) },
    ],
  },

  // Instalacion industrial / canalizacion
  {
    id: 'canalizacion-pared-existente', nombre: 'Canalización en pared existente', unidad: 'm',
    precioManoObraCents: d(9), categoria: 'industrial', activa: true,
    descripcion: 'Incluye picado y resane. Precio por metro lineal.',
    receta: [
      { materialId: 'tuberia-pvc-12', cantidadMilli: m(1) },
      { materialId: 'cable-thhn-12', cantidadMilli: m(3) },
      { materialId: 'curva-pvc-12', cantidadMilli: m(0.3) },
      { materialId: 'conector-pvc-12', cantidadMilli: m(0.5) },
      { materialId: 'pegamento-pvc', cantidadMilli: m(0.01) },
      { materialId: 'tornillos-chazos', cantidadMilli: m(1) },
    ],
  },
  {
    id: 'canalizacion-obra-gris', nombre: 'Canalización en obra gris', unidad: 'm',
    precioManoObraCents: d(5.5), categoria: 'industrial', activa: true,
    descripcion: 'Antes del repello. Precio por metro lineal.',
    receta: [
      { materialId: 'tuberia-pvc-12', cantidadMilli: m(1) },
      { materialId: 'cable-thhn-12', cantidadMilli: m(3) },
      { materialId: 'curva-pvc-12', cantidadMilli: m(0.3) },
      { materialId: 'conector-pvc-12', cantidadMilli: m(0.5) },
      { materialId: 'pegamento-pvc', cantidadMilli: m(0.01) },
      { materialId: 'amarras', cantidadMilli: m(1) },
    ],
  },

  // Mantenimiento
  {
    id: 'revision-tablero', nombre: 'Revisión y diagnóstico de tablero', unidad: 'servicio',
    precioManoObraCents: d(40), categoria: 'mantenimiento', activa: true,
    receta: [{ materialId: 'cinta-aislante', cantidadMilli: m(0.2) }],
  },
  {
    id: 'termografia-tablero', nombre: 'Termografía de tablero', unidad: 'servicio',
    precioManoObraCents: d(75), categoria: 'mantenimiento', activa: true,
    descripcion: 'Inspección termográfica con informe de puntos calientes.',
    receta: [],
  },

  // Emergencias
  {
    id: 'emergencia-fuera-horario', nombre: 'Atención de emergencia fuera de horario', unidad: 'visita',
    precioManoObraCents: d(60), categoria: 'emergencias', activa: true,
    descripcion: 'Cargo por visita. El trabajo que resulte se cotiza aparte.',
    receta: [
      { materialId: 'cinta-aislante', cantidadMilli: m(0.2) },
      { materialId: 'amarras', cantidadMilli: m(2) },
    ],
  },
];

export const PERFIL_DEFAULT: PerfilEmpresa = {
  nombre: 'Grupo Fénix S.A de C.V',
  logoDataUrl: logoFenix,
  telefono: '',
  correo: '',
  direccion: '',
  nit: '',
  nrc: '',
  diasValidezPorDefecto: 15,
  garantia:
    'Garantía de 6 meses sobre la mano de obra realizada, contada a partir de la fecha de entrega del trabajo.',
  condicionesPorDefecto: [
    'El precio corresponde únicamente a mano de obra e instalación.',
    'Los materiales corren por cuenta del cliente según la lista adjunta.',
    'No incluye obra civil mayor, pintura ni acabados finales.',
    'Cualquier trabajo adicional no descrito se cotiza por separado.',
  ].join('\n'),
  prefijoCorrelativo: 'COT-',
  formaPagoPorDefectoId: 'anticipo50',
  cuentaBancaria: { banco: '', tipoCuenta: '', numero: '', titular: '' },
};

export const AJUSTES_DEFAULT: Ajustes = {
  holguraCablePct: 10,
  holguraTuberiaPct: 10,
  holguraGeneralPct: 5,
  tiposObra: [
    { id: 'nueva', nombre: 'Obra nueva', descripcion: 'Obra gris, sin acabados. Trabajo limpio.', multiplicadorBps: 10000 },
    { id: 'remodelacion', nombre: 'Remodelación', descripcion: 'Pared terminada: hay que picar y resanar.', multiplicadorBps: 13000 },
    { id: 'reparacion', nombre: 'Reparación puntual', descripcion: 'Trabajo suelto, con desplazamiento propio.', multiplicadorBps: 11500 },
  ],
  formasPago: [
    { id: 'completo', nombre: 'Pago completo por adelantado', cuotas: [{ etiqueta: 'Pago completo', pct: 100 }] },
    {
      id: 'anticipo50',
      nombre: '50% de anticipo',
      cuotas: [
        { etiqueta: 'Anticipo', pct: 50 },
        { etiqueta: 'Saldo contra entrega', pct: 50 },
      ],
    },
    {
      id: 'tres-partes',
      nombre: 'Pago en tres partes',
      cuotas: [
        { etiqueta: 'Primer pago', pct: 34 },
        { etiqueta: 'Segundo pago', pct: 33 },
        { etiqueta: 'Pago final', pct: 33 },
      ],
    },
  ],
  clausulas: [
    {
      id: 'materiales-perdidos',
      texto: 'Grupo Fénix no se hace responsable por materiales perdidos o dañados una vez entregados en el sitio.',
      porDefecto: false,
    },
  ],
};

export const CLIENTES_EJEMPLO: Cliente[] = [
  { id: 'cli-ejemplo-1', nombre: 'Residencial Las Palmas, casa 14', telefono: '7845-2210', direccion: 'Santa Tecla, La Libertad', tipo: 'casa', creadoEn: Date.now() },
  { id: 'cli-ejemplo-2', nombre: 'Ferretería El Roble', telefono: '2245-8890', correo: 'compras@elroble.sv', direccion: 'San Salvador', tipo: 'empresa', creadoEn: Date.now() },
];
