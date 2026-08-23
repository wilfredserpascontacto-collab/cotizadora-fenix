import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { formatearNumero } from '../domain/cotizacion';
import type { RenglonMaterialCalculado } from '../domain/materiales';
import type { Cliente, Cotizacion, PerfilEmpresa } from '../domain/types';
import { ANCHO, GRIS, LINEA, MARGEN, TINTA, bloqueCliente, caja, encabezado, pies } from './comun';

/**
 * Lista de materiales para compra.
 * No es un cobro: es la instrucción de compra que el cliente lleva a la
 * distribuidora. Por eso no lleva IVA, no lleva total a pagar y nunca precios:
 * Grupo Fénix no maneja precios de materiales, ni siquiera de referencia.
 */
export function generarMaterialesPdf(
  cot: Cotizacion,
  perfil: PerfilEmpresa,
  cliente: Cliente | null,
  filas: RenglonMaterialCalculado[],
): Blob {
  const doc = new jsPDF({ unit: 'pt', format: 'letter', compress: true });
  const c = cot.clienteSnapshot ?? cliente;
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

  autoTable(doc, {
    startY: y,
    head: [['Material', 'Cant.', 'Presentación']],
    body: visibles.map((f) => [f.nombre, String(f.unidadesVenta), f.unidadVenta]),
    margin: { left: MARGEN, right: MARGEN, bottom: 60 },
    styles: { font: 'helvetica', fontSize: 9.5, cellPadding: 6, textColor: TINTA, lineColor: LINEA, lineWidth: 0.5 },
    headStyles: { fillColor: [91, 33, 182], textColor: [255, 255, 255], fontStyle: 'bold' },
    alternateRowStyles: { fillColor: [250, 250, 255] },
    columnStyles: {
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

  y = caja(
    doc,
    y,
    'Las cantidades ya incluyen el desperdicio propio del trabajo y están redondeadas a la presentación comercial en que se vende cada material (rollos, tubos, bolsas), por eso pueden verse mayores al consumo exacto.',
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
