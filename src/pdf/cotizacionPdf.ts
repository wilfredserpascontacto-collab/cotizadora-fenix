import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { anticipoCents, calcularTotales } from '../domain/cotizacion';
import { fmtMoney } from '../domain/money';
import type { Cliente, Cotizacion, PerfilEmpresa } from '../domain/types';
import { ANCHO, GRIS, LINEA, MARGEN, TINTA, bloqueCliente, caja, encabezado, pies } from './comun';

/**
 * Cotización de servicio: la cara del negocio de Francisco frente a su cliente.
 * Solo mano de obra. El monto de materiales no aparece por ningún lado.
 */
export function generarCotizacionPdf(
  cot: Cotizacion,
  perfil: PerfilEmpresa,
  cliente: Cliente | null,
  tipoObraNombre: string,
): Blob {
  const doc = new jsPDF({ unit: 'pt', format: 'letter', compress: true });
  const c = cot.clienteSnapshot ?? cliente;
  const totales = calcularTotales(cot);

  let y = encabezado(doc, perfil, cot, 'Cotización de servicio');
  y = bloqueCliente(doc, y, cot, c?.nombre ?? 'Cliente', c?.telefono, c?.correo);

  if (cot.descripcionProyecto) {
    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...GRIS);
    doc.text('PROYECTO', MARGEN, y);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...TINTA);
    doc.setFontSize(10);
    const texto = doc.splitTextToSize(cot.descripcionProyecto, ANCHO - MARGEN * 2);
    doc.text(texto, MARGEN, y + 14);
    y += 14 + texto.length * 12 + 8;
  }

  autoTable(doc, {
    startY: y,
    head: [['Descripción', 'Cant.', 'Unidad', 'P. unitario', 'Subtotal']],
    body: cot.renglones.map((r) => [
      r.descripcion,
      String(r.cantidad),
      r.unidad,
      fmtMoney(r.precioManoObraCents),
      fmtMoney(r.precioManoObraCents * r.cantidad),
    ]),
    margin: { left: MARGEN, right: MARGEN, bottom: 60 },
    styles: { font: 'helvetica', fontSize: 9.5, cellPadding: 6, textColor: TINTA, lineColor: LINEA, lineWidth: 0.5 },
    headStyles: { fillColor: TINTA, textColor: [255, 255, 255], fontStyle: 'bold' },
    alternateRowStyles: { fillColor: [248, 250, 252] },
    columnStyles: {
      0: { cellWidth: 'auto' },
      1: { cellWidth: 42, halign: 'right' },
      2: { cellWidth: 58 },
      3: { cellWidth: 72, halign: 'right' },
      4: { cellWidth: 78, halign: 'right' },
    },
    // La tabla se corta bien entre páginas y repite el encabezado.
    showHead: 'everyPage',
    rowPageBreak: 'avoid',
  });

  y = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 16;
  y = espacioSuficiente(doc, y, 170, perfil, cot);

  // Totales, alineados a la derecha.
  const xEtq = ANCHO - MARGEN - 220;
  const xVal = ANCHO - MARGEN;
  const linea = (etiqueta: string, valor: string, fuerte = false) => {
    doc.setFont('helvetica', fuerte ? 'bold' : 'normal');
    doc.setFontSize(fuerte ? 12 : 10);
    doc.setTextColor(...(fuerte ? TINTA : GRIS));
    doc.text(etiqueta, xEtq, y);
    doc.setTextColor(...TINTA);
    doc.text(valor, xVal, y, { align: 'right' });
    y += fuerte ? 20 : 15;
  };

  linea('Mano de obra', fmtMoney(totales.manoObraCents));
  if (totales.ajusteObraCents !== 0) {
    linea(`Ajuste por ${tipoObraNombre.toLowerCase()}`, fmtMoney(totales.ajusteObraCents));
  }
  linea('Subtotal', fmtMoney(totales.subtotalCents));
  linea('IVA 13%', fmtMoney(totales.ivaCents));

  doc.setDrawColor(...TINTA);
  doc.setLineWidth(1.2);
  doc.line(xEtq, y - 6, xVal, y - 6);
  y += 8;
  linea('TOTAL A PAGAR', fmtMoney(totales.totalCents), true);

  y += 6;
  y = caja(
    doc,
    y,
    'Este precio corresponde ÚNICAMENTE a mano de obra e instalación. Los materiales corren por cuenta del cliente y se detallan en la lista de compra que acompaña esta cotización.',
    [180, 83, 9],
    [255, 251, 235],
  );

  // Condiciones
  y = espacioSuficiente(doc, y, 150, perfil, cot);
  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...GRIS);
  doc.text('CONDICIONES', MARGEN, y);
  y += 14;

  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...TINTA);
  doc.setFontSize(9.5);

  const condiciones = [
    perfil.anticipoPct > 0
      ? `Forma de pago: ${perfil.anticipoPct}% de anticipo (${fmtMoney(
          anticipoCents(totales, perfil.anticipoPct),
        )}) y el saldo contra entrega del trabajo.`
      : 'Forma de pago: contra entrega del trabajo.',
    `Validez de la oferta: ${cot.diasValidez} días a partir de la fecha de emisión.`,
    perfil.garantia && `Garantía: ${perfil.garantia}`,
    ...cot.condiciones.split('\n').map((s) => s.trim()).filter(Boolean),
    cot.notas && `Notas: ${cot.notas}`,
  ].filter(Boolean) as string[];

  for (const cond of condiciones) {
    y = espacioSuficiente(doc, y, 40, perfil, cot);
    const lineas = doc.splitTextToSize(`•  ${cond}`, ANCHO - MARGEN * 2);
    doc.text(lineas, MARGEN, y);
    y += lineas.length * 12 + 3;
  }

  // Espacio de firma
  y = espacioSuficiente(doc, y + 24, 90, perfil, cot);
  const anchoFirma = 200;
  doc.setDrawColor(...GRIS);
  doc.setLineWidth(0.8);
  doc.line(MARGEN, y + 34, MARGEN + anchoFirma, y + 34);
  doc.line(ANCHO - MARGEN - anchoFirma, y + 34, ANCHO - MARGEN, y + 34);
  doc.setFontSize(9);
  doc.setTextColor(...GRIS);
  doc.text(perfil.nombre || 'Grupo Fénix', MARGEN, y + 48);
  doc.text('Acepta el cliente', ANCHO - MARGEN - anchoFirma, y + 48);

  pies(doc, perfil);
  return doc.output('blob');
}

/** Si no cabe el bloque siguiente, abre página nueva con el mismo encabezado. */
function espacioSuficiente(
  doc: jsPDF,
  y: number,
  alto: number,
  perfil: PerfilEmpresa,
  cot: Cotizacion,
): number {
  if (y + alto < 750) return y;
  doc.addPage();
  return encabezado(doc, perfil, cot, 'Cotización de servicio', 'continuación');
}
