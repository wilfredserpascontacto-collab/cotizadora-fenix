/**
 * Verificacion rapida de las reglas de calculo, sin runner de pruebas.
 *   npm run verificar
 */
import { calcularMateriales, estimadoMateriales } from '../src/domain/materiales';
import { calcularTotales, renglonDesdePartida } from '../src/domain/cotizacion';
import { MATERIALES_SEED, PARTIDAS_SEED } from '../src/db/seed';
import { fmtMoney } from '../src/domain/money';

const toma = PARTIDAS_SEED.find((p) => p.id === 'toma-110')!;
const luz = PARTIDAS_SEED.find((p) => p.id === 'salida-luminaria')!;
const inte = PARTIDAS_SEED.find((p) => p.id === 'interruptor-sencillo')!;

const renglones = [
  { ...renglonDesdePartida(toma, 8) },
  { ...renglonDesdePartida(luz, 6) },
  { ...renglonDesdePartida(inte, 5) },
];

const filas = calcularMateriales(renglones, MATERIALES_SEED);
const cable = filas.find((f) => f.materialId === 'cable-thhn-12')!;
console.log('cable consolidado bruto(m)=', cable.brutoMilli / 1000,
  'con holgura=', cable.conHolguraMilli / 1000,
  '->', cable.unidadesVenta, cable.unidadVenta);

const tubo = filas.find((f) => f.materialId === 'tuberia-pvc-12')!;
console.log('tuberia bruto(m)=', tubo.brutoMilli / 1000, '->', tubo.unidadesVenta, tubo.unidadVenta);

console.log('materiales distintos =', filas.length);
console.log('cable aparece', filas.filter((f) => f.materialId === 'cable-thhn-12').length, 'vez');
console.log('estimado materiales =', fmtMoney(estimadoMateriales(filas)));

// Redondeo: 37 m de cable deben dar 1 rollo de 100 m.
const soloUno = calcularMateriales(
  [{ ...renglonDesdePartida(toma, 3) }],
  MATERIALES_SEED,
);
const c1 = soloUno.find((f) => f.materialId === 'cable-thhn-12')!;
console.log('3 tomas: bruto', c1.brutoMilli / 1000, 'm ->', c1.unidadesVenta, 'rollo(s)');

// Totales: solo mano de obra, IVA 13%, materiales fuera.
for (const bps of [10000, 13000]) {
  const t = calcularTotales({ renglones, multiplicadorBps: bps });
  console.log(
    `x${bps / 10000}`,
    'mano de obra', fmtMoney(t.manoObraCents),
    'ajuste', fmtMoney(t.ajusteObraCents),
    'subtotal', fmtMoney(t.subtotalCents),
    'iva', fmtMoney(t.ivaCents),
    'TOTAL', fmtMoney(t.totalCents),
  );
}
