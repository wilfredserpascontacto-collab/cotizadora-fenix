import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { calcularTotales, desglosePago } from '../domain/cotizacion';
import { fmtMoney } from '../domain/money';
import type { Cliente, Cotizacion, FormaPago, PerfilEmpresa } from '../domain/types';
import { ANCHO, GRIS, LINEA, MARGEN, TINTA, bloqueCliente, encabezado, pies } from './comun';

/**
 * Cotización de servicio: la cara del negocio de Francisco frente a su cliente.
 * Solo mano de obra. El monto de materiales no aparece por ningún lado.
 */
export function generarCotizacionPdf(
  cot: Cotizacion,
  perfil: PerfilEmpresa,
  cliente: Cliente | null,
  tipoObraNombre: string,
  formaPago: FormaPago,
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
  linea(cot.aplicaIva !== false ? 'IVA 13%' : 'IVA (cliente exento)', fmtMoney(totales.ivaCents));

  doc.setDrawColor(...TINTA);
  doc.setLineWidth(1.2);
  doc.line(xEtq, y - 6, xVal, y - 6);
  y += 8;
  linea('TOTAL A PAGAR', fmtMoney(totales.totalCents), true);

  y += 18;

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

  const cuotas = desglosePago(totales, formaPago);
  const textoFormaPago =
    cuotas.length <= 1
      ? `Forma de pago: ${formaPago.nombre} (${fmtMoney(totales.totalCents)}).`
      : `Forma de pago: ${formaPago.nombre} — ${cuotas
          .map((c) => `${c.etiqueta} ${fmtMoney(c.montoCents)}`)
          .join(', ')}.`;

  const cuenta = perfil.cuentaBancaria;
  const textoTransferencia =
    cuenta?.numero &&
    `Si prefiere pagar por transferencia: ${[cuenta.banco, cuenta.tipoCuenta, cuenta.numero]
      .filter(Boolean)
      .join(' — ')}${cuenta.titular ? `, a nombre de ${cuenta.titular}` : ''}.`;

  const condiciones = [
    textoFormaPago,
    `Validez de la oferta: ${cot.diasValidez} días a partir de la fecha de emisión.`,
    perfil.garantia && `Garantía: ${perfil.garantia}`,
    ...cot.condiciones.split('\n').map((s) => s.trim()).filter(Boolean),
    cot.notas && `Notas: ${cot.notas}`,
    ...(cot.clausulasCongeladas ?? []),
    textoTransferencia,
  ].filter(Boolean) as string[];

  for (const cond of condiciones) {
    y = espacioSuficiente(doc, y, 40, perfil, cot);
    const lineas = doc.splitTextToSize(`•  ${cond}`, ANCHO - MARGEN * 2);
    doc.text(lineas, MARGEN, y);
    y += lineas.length * 12 + 3;
  }

  // Espacio de firma. Si el cliente firmo en el telefono, la imagen va
  // pegada encima de su linea; si no, queda la linea en blanco de siempre.
  y = espacioSuficiente(doc, y + 24, 90, perfil, cot);
  const anchoFirma = 200;
  const xFirmaCliente = ANCHO - MARGEN - anchoFirma;
  if (cot.firmaClienteDataUrl) {
    try {
      doc.addImage(cot.firmaClienteDataUrl, 'PNG', xFirmaCliente + 10, y - 4, anchoFirma - 20, 34, undefined, 'FAST');
    } catch {
      // Una firma corrupta no puede tumbar la cotizacion: se cae al espacio en blanco.
    }
  }
  doc.setDrawColor(...GRIS);
  doc.setLineWidth(0.8);
  doc.line(MARGEN, y + 34, MARGEN + anchoFirma, y + 34);
  doc.line(xFirmaCliente, y + 34, ANCHO - MARGEN, y + 34);
  doc.setFontSize(9);
  doc.setTextColor(...GRIS);
  doc.text(perfil.nombre || 'Grupo Phoenix', MARGEN, y + 48);
  doc.text('Acepta el cliente', xFirmaCliente, y + 48);

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
