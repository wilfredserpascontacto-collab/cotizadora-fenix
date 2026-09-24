/**
 * Le tira datos feos al generador de PDF para ver cual lo tumba.
 * No arregla nada: solo averigua por que "a veces no genera los PDF".
 */
import { AJUSTES_DEFAULT, PARTIDAS_SEED, MATERIALES_SEED, PERFIL_DEFAULT } from '../src/db/seed';
import { calcularMateriales } from '../src/domain/materiales';
import { renglonDesdePartida } from '../src/domain/cotizacion';
import { generarCotizacionPdf } from '../src/pdf/cotizacionPdf';
import { generarMaterialesPdf } from '../src/pdf/materialesPdf';
import type { Cliente, Cotizacion, PerfilEmpresa } from '../src/domain/types';

const partida = (id: string, cantidad: number) =>
  renglonDesdePartida(PARTIDAS_SEED.find((p) => p.id === id)!, cantidad);

const clienteBase: Cliente = {
  id: 'c1', nombre: 'Residencial Las Palmas, casa 14', telefono: '7845-2210',
  tipo: 'casa', creadoEn: Date.now(),
};

const base: Cotizacion = {
  id: 'q1', numero: 7, emitidaEn: Date.now(), diasValidez: 15, clienteId: 'c1',
  ubicacion: 'Col. Escalón', renglones: [partida('toma-110', 8), partida('caja-termica-8', 1)],
  tipoObra: 'remodelacion', multiplicadorBps: 13000, aplicaIva: true,
  ajustesMateriales: [], materialesExtra: [], condiciones: PERFIL_DEFAULT.condicionesPorDefecto,
  formaPagoId: 'tres-partes', estado: 'enviada', creadaEn: Date.now(), modificadaEn: Date.now(),
};

const formaPago = AJUSTES_DEFAULT.formasPago.find((f) => f.id === 'tres-partes')!;
const largo = 'Instalación eléctrica completa con tablero, acometida y puesta a tierra '.repeat(6);

type Caso = {
  nombre: string;
  cot?: Partial<Cotizacion>;
  perfil?: Partial<PerfilEmpresa>;
  cliente?: Cliente | undefined;
  forma?: typeof formaPago;
  tipo?: string;
};

const casos: Caso[] = [
  { nombre: 'normal' },
  { nombre: 'sin cliente', cliente: undefined },
  { nombre: 'sin renglones', cot: { renglones: [] } },
  { nombre: 'todavia borrador (numero null)', cot: { numero: null, emitidaEn: undefined } },
  { nombre: 'sin condiciones', cot: { condiciones: '' } },
  { nombre: 'sin clausulas congeladas', cot: { clausulasCongeladas: undefined } },
  { nombre: 'firma corrupta', cot: { firmaClienteDataUrl: 'data:image/png;base64,NO-ES-UNA-IMAGEN' } },
  { nombre: 'firma vacia', cot: { firmaClienteDataUrl: '' } },
  { nombre: 'logo corrupto', perfil: { logoDataUrl: 'data:image/png;base64,???' } },
  { nombre: 'logo que no es imagen', perfil: { logoDataUrl: 'hola' } },
  { nombre: 'nombre de cliente larguisimo', cliente: { ...clienteBase, nombre: largo } },
  { nombre: 'descripcion larguisima', cot: { descripcionProyecto: largo } },
  { nombre: 'condiciones larguisimas', cot: { condiciones: largo + largo } },
  { nombre: 'emojis y rarezas', cliente: { ...clienteBase, nombre: 'Ñandú 🏠 «Ñ» — Ávila' } },
  { nombre: 'cantidad enorme', cot: { renglones: [partida('toma-110', 999999)] } },
  { nombre: 'forma de pago sin cuotas', forma: { ...formaPago, cuotas: [] } },
  { nombre: 'tipo de obra sin nombre', tipo: undefined as unknown as string },
  { nombre: 'sin telefono ni correo en el perfil', perfil: { telefono: '', correo: undefined } },
  { nombre: 'cuenta bancaria vacia', perfil: { cuentaBancaria: { banco: '', tipoCuenta: '', numero: '', titular: '' } } },
  { nombre: 'muchisimos renglones', cot: { renglones: PARTIDAS_SEED.slice(0, 20).map((p) => renglonDesdePartida(p, 3)) } },
];

let rotos = 0;
for (const c of casos) {
  const cot = { ...base, ...c.cot } as Cotizacion;
  const perfil = { ...PERFIL_DEFAULT, ...c.perfil } as PerfilEmpresa;
  const cliente = 'cliente' in c ? c.cliente : clienteBase;
  const filas = calcularMateriales(cot.renglones, MATERIALES_SEED);
  for (const [cual, hacer] of [
    ['cotizacion', () => generarCotizacionPdf(cot, perfil, cliente, c.tipo ?? 'Remodelación', c.forma ?? formaPago)],
    ['materiales', () => generarMaterialesPdf(cot, perfil, cliente, filas)],
  ] as const) {
    try {
      const blob = hacer();
      const kb = ((await blob.arrayBuffer()).byteLength / 1024).toFixed(0);
      console.log(`  ok    ${c.nombre.padEnd(34)} ${cual.padEnd(11)} ${kb} KB`);
    } catch (e) {
      rotos++;
      console.log(`  ROTO  ${c.nombre.padEnd(34)} ${cual.padEnd(11)} ${String(e).slice(0, 110)}`);
    }
  }
}
console.log(rotos === 0 ? '\nNinguno se cayo.' : `\n${rotos} casos tumban el PDF.`);
