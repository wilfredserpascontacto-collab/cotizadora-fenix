import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { formatearNumero } from '../domain/cotizacion';
import { estimadoMateriales, type RenglonMaterialCalculado } from '../domain/materiales';
import { fmtMoney } from '../domain/money';
import type { Cliente, Cotizacion, PerfilEmpresa } from '../domain/types';
import { ANCHO, GRIS, LINEA, MARGEN, TINTA, bloqueCliente, caja, encabezado, pies } from './comun';

/**
 * Lista de materiales para compra.
 * No es un cobro: es la instrucción de compra que el cliente lleva a la
 * distribuidora. Por eso no lleva IVA, no lleva total a pagar y todo precio
 * va marcado como referencia.
 */
export function generarMaterialesPdf(
  cot: Cotizacion,
  perfil: PerfilEmpresa,
  cliente: Cliente | null,
  filas: RenglonMaterialCalculado[],
): Blob {
  const doc = new jsPDF({ unit: 'pt', format: 'letter', compress: true });
  const c = cot.clienteSnapshot ?? cliente;
  const conPrecios = cot.mostrarPreciosMateriales;
  const visibles = filas.filter((f) => f.unidadesVenta > 0);

  let y = encabezado(
    doc,
    perfil,
    cot,
    'Lista de materiales',
    `Corresponde a la cotización ${formatearNumero(cot.numero, perfil.prefijoCorrelativo)}`,
    false,
  );
  y = bloqueCliente(doc, y, cot, c?.nombre ?? 'Cliente', c?.telefono, c?.correo);

  y = caja(
    doc,
    y,
    'Esta lista NO es un cobro de ' +
      (perfil.nombre || 'Grupo Fénix') +
      '. Es el material que el cliente compra directamente en la distribuidora de su preferencia.',
    [91, 33, 182],
    [237, 233, 254],
  );

  const cabecera = conPrecios
    ? ['Material', 'Cant.', 'Presentación', 'P. ref.', 'Subtotal ref.']
    : ['Material', 'Cant.', 'Presentación'];

  autoTable(doc, {
    startY: y,
    head: [cabecera],
    body: visibles.map((f) => {
      const base = [f.nombre, String(f.unidadesVenta), f.unidadVenta];
      if (!conPrecios) return base;
      return [
        ...base,
        f.precioRefCents !== undefined ? fmtMoney(f.precioRefCents) : '—',
        f.precioRefCents !== undefined ? fmtMoney(f.estimadoCents) : '—',
      ];
    }),
    margin: { left: MARGEN, right: MARGEN, bottom: 60 },
    styles: { font: 'helvetica', fontSize: 9.5, cellPadding: 6, textColor: TINTA, lineColor: LINEA, lineWidth: 0.5 },
    headStyles: { fillColor: [91, 33, 182], textColor: [255, 255, 255], fontStyle: 'bold' },
    alternateRowStyles: { fillColor: [250, 250, 255] },
    columnStyles: conPrecios
      ? {
          0: { cellWidth: 'auto' },
          1: { cellWidth: 42, halign: 'right' },
          2: { cellWidth: 108 },
          3: { cellWidth: 62, halign: 'right' },
          4: { cellWidth: 78, halign: 'right' },
        }
      : {
          0: { cellWidth: 'auto' },
          1: { cellWidth: 52, halign: 'right' },
          2: { cellWidth: 150 },
        },
    showHead: 'everyPage',
    rowPageBreak: 'avoid',
  });

  y = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 16;

  if (y + 130 > 750) {
    doc.addPage();
    y = encabezado(doc, perfil, cot, 'Lista de materiales', 'continuación', false);
  }

  if (conPrecios) {
    const estimado = estimadoMateriales(visibles);
    const xEtq = ANCHO - MARGEN - 240;
    const xVal = ANCHO - MARGEN;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.setTextColor(...GRIS);
    doc.text('Estimado de compra (referencial)', xEtq, y);
    doc.setTextColor(...TINTA);
    doc.text(fmtMoney(estimado), xVal, y, { align: 'right' });
    y += 22;
  }

  y = caja(
    doc,
    y,
    'Las cantidades ya incluyen el desperdicio propio del trabajo y están redondeadas a la presentación comercial en que se vende cada material (rollos, tubos, bolsas), por eso pueden verse mayores al consumo exacto.' +
      (conPrecios
        ? ' Los precios son de REFERENCIA y están sujetos a lo que cobre la distribuidora el día de la compra; no constituyen una oferta de ' +
          (perfil.nombre || 'Grupo Fénix') +
          '.'
        : ''),
    [100, 116, 139],
    [248, 250, 252],
  );

  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...GRIS);
  const cierre = doc.splitTextToSize(
    'Ante cualquier duda sobre calibres, medidas o equivalencias, consulte con ' +
      (perfil.nombre || 'Grupo Fénix') +
      (perfil.telefono ? ` al ${perfil.telefono}` : '') +
      ' antes de comprar.',
    ANCHO - MARGEN * 2,
  );
  doc.text(cierre, MARGEN, y);

  pies(doc, perfil);
  return doc.output('blob');
}
