/**
 * Genera los dos PDF con datos de ejemplo y extrae su texto para revisarlos.
 *   npm run verificar:pdf
 * Deja los archivos en node_modules/.cache para poder abrirlos a mano.
 */
import { writeFileSync } from 'node:fs';
import { inflateSync } from 'node:zlib';
import { PARTIDAS_SEED, MATERIALES_SEED, PERFIL_DEFAULT } from '../src/db/seed';
import { calcularMateriales } from '../src/domain/materiales';
import { renglonDesdePartida } from '../src/domain/cotizacion';
import { generarCotizacionPdf } from '../src/pdf/cotizacionPdf';
import { generarMaterialesPdf } from '../src/pdf/materialesPdf';
import type { Cliente, Cotizacion } from '../src/domain/types';

const partida = (id: string, cantidad: number) =>
  renglonDesdePartida(PARTIDAS_SEED.find((p) => p.id === id)!, cantidad);

const cliente: Cliente = {
  id: 'c1',
  nombre: 'Residencial Las Palmas, casa 14',
  telefono: '7845-2210',
  correo: 'cliente@ejemplo.sv',
  direccion: 'Santa Tecla',
  tipo: 'casa',
  creadoEn: Date.now(),
};

const cot: Cotizacion = {
  id: 'q1',
  numero: 7,
  emitidaEn: Date.now(),
  diasValidez: 15,
  clienteId: 'c1',
  ubicacion: 'Col. Escalón, calle 3, casa 22, San Salvador',
  descripcionProyecto: 'Instalación eléctrica de ampliación: dormitorio y baño.',
  renglones: [
    partida('toma-110', 8),
    partida('salida-luminaria', 6),
    partida('interruptor-sencillo', 5),
    partida('caja-termica-8', 1),
  ],
  tipoObra: 'remodelacion',
  multiplicadorBps: 13000,
  ajustesMateriales: [],
  materialesExtra: [],
  condiciones: PERFIL_DEFAULT.condicionesPorDefecto,
  mostrarPreciosMateriales: true,
  estado: 'enviada',
  creadaEn: Date.now(),
  modificadaEn: Date.now(),
};

const perfil = { ...PERFIL_DEFAULT, telefono: '7712-4455', correo: 'info@grupofenix.sv', direccion: 'San Salvador', nit: '0614-010190-101-2' };
const filas = calcularMateriales(cot.renglones, MATERIALES_SEED);

const docs: [string, Blob][] = [
  ['cotizacion', generarCotizacionPdf(cot, perfil, cliente, 'Remodelación')],
  ['materiales', generarMaterialesPdf(cot, perfil, cliente, filas)],
];

for (const [nombre, blob] of docs) {
  const buf = Buffer.from(await blob.arrayBuffer());
  const ruta = `node_modules/.cache/${nombre}.pdf`;
  writeFileSync(ruta, buf);
  console.log(`\n=== ${nombre}.pdf — ${(buf.length / 1024).toFixed(1)} KB — ${paginas(buf)} pág. — ${ruta}`);
  console.log(textoDe(buf));
}

/** Cuenta páginas por los objetos /Type /Page del catálogo. */
function paginas(buf: Buffer): number {
  return (buf.toString('latin1').match(/\/Type\s*\/Page[^s]/g) ?? []).length;
}

/** Infla los streams FlateDecode y saca los literales de texto de los Tj/TJ. */
function textoDe(buf: Buffer): string {
  const crudo = buf.toString('latin1');
  const partes: string[] = [];
  const re = /stream\r?\n?([\s\S]*?)\r?\n?endstream/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(crudo)) !== null) {
    try {
      partes.push(inflateSync(Buffer.from(m[1], 'latin1')).toString('latin1'));
    } catch {
      partes.push(m[1]);
    }
  }
  const texto = partes.join('\n');
  const literales = [...texto.matchAll(/\(((?:\\.|[^\\()])*)\)\s*Tj/g)].map((x) =>
    x[1].replace(/\\([()\\])/g, '$1'),
  );
  return literales.join('\n');
}
