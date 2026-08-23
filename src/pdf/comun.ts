import type { jsPDF } from 'jspdf';
import type { Cotizacion, PerfilEmpresa } from '../domain/types';
import { fechaVencimiento, fmtFecha, formatearNumero } from '../domain/cotizacion';

export const MARGEN = 42;
export const ANCHO = 612; // carta, en puntos
export const TINTA: [number, number, number] = [15, 23, 42];
export const GRIS: [number, number, number] = [100, 116, 139];
export const LINEA: [number, number, number] = [226, 232, 240];

/**
 * Encabezado comun a los dos documentos.
 * La lista de materiales lleva el mismo logo porque va a terminar sobre el
 * mostrador de una distribuidora: ahi tambien esta hablando por Francisco.
 */
export function encabezado(
  doc: jsPDF,
  perfil: PerfilEmpresa,
  cot: Cotizacion,
  titulo: string,
  subtitulo?: string,
  /** La lista de compra no vence: la validez es de la cotizacion de servicio. */
  mostrarValidez = true,
): number {
  let y = MARGEN;
  const derecha = ANCHO - MARGEN;

  // Logo, si Francisco lo cargo en Ajustes.
  let xTexto = MARGEN;
  if (perfil.logoDataUrl) {
    try {
      const formato = perfil.logoDataUrl.includes('image/png') ? 'PNG' : 'JPEG';
      doc.addImage(perfil.logoDataUrl, formato, MARGEN, y, 64, 64, undefined, 'FAST');
      xTexto = MARGEN + 78;
    } catch {
      // Un logo ilegible no puede tumbar la cotizacion.
    }
  }

  doc.setTextColor(...TINTA);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(17);
  doc.text(perfil.nombre || 'Grupo Fénix', xTexto, y + 16);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(...GRIS);
  const datos = [
    perfil.telefono && `Tel. ${perfil.telefono}`,
    perfil.correo,
    perfil.direccion,
    [perfil.nit && `NIT ${perfil.nit}`, perfil.nrc && `NRC ${perfil.nrc}`].filter(Boolean).join('  ·  '),
  ].filter(Boolean) as string[];
  let yDatos = y + 30;
  for (const linea of datos) {
    doc.text(linea, xTexto, yDatos);
    yDatos += 11;
  }

  // Bloque de identificacion del documento, a la derecha.
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.setTextColor(...TINTA);
  doc.text(titulo.toUpperCase(), derecha, y + 14, { align: 'right' });

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(...GRIS);
  const vence = fechaVencimiento(cot);
  const lineas = [
    `No. ${formatearNumero(cot.numero, perfil.prefijoCorrelativo)}`,
    `Emitida: ${fmtFecha(cot.emitidaEn ?? Date.now())}`,
  ];
  if (mostrarValidez) {
    lineas.push(vence ? `Válida hasta: ${fmtFecha(vence)}` : `Validez: ${cot.diasValidez} días`);
  }
  if (subtitulo) lineas.push(subtitulo);
  let yDer = y + 30;
  for (const linea of lineas) {
    doc.text(linea, derecha, yDer, { align: 'right' });
    yDer += 11;
  }

  y = Math.max(yDatos, yDer, y + 68) + 6;
  doc.setDrawColor(...LINEA);
  doc.setLineWidth(1);
  doc.line(MARGEN, y, derecha, y);
  return y + 18;
}

/** Datos del cliente y ubicación del trabajo, en dos columnas. */
export function bloqueCliente(
  doc: jsPDF,
  y: number,
  cot: Cotizacion,
  nombre: string,
  telefono?: string,
  correo?: string,
): number {
  const mitad = ANCHO / 2;

  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...GRIS);
  doc.text('CLIENTE', MARGEN, y);
  doc.text('UBICACIÓN DEL TRABAJO', mitad, y);

  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...TINTA);
  doc.setFontSize(10);

  let yIzq = y + 14;
  for (const dato of [nombre, telefono, correo].filter(Boolean) as string[]) {
    doc.text(dato, MARGEN, yIzq);
    yIzq += 12;
  }

  const ubic = doc.splitTextToSize(cot.ubicacion || 'No especificada', ANCHO - MARGEN - mitad);
  doc.text(ubic, mitad, y + 14);
  const yDer = y + 14 + ubic.length * 12;

  return Math.max(yIzq, yDer) + 8;
}

/** Nota destacada en caja. Sirve para las advertencias que no se pueden perder. */
export function caja(
  doc: jsPDF,
  y: number,
  texto: string,
  color: [number, number, number],
  fondo: [number, number, number],
): number {
  const ancho = ANCHO - MARGEN * 2;
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  const lineas = doc.splitTextToSize(texto, ancho - 20);
  const alto = lineas.length * 11 + 16;
  doc.setFillColor(...fondo);
  doc.setDrawColor(...color);
  doc.setLineWidth(0.8);
  doc.roundedRect(MARGEN, y, ancho, alto, 4, 4, 'FD');
  doc.setTextColor(...color);
  doc.text(lineas, MARGEN + 10, y + 12);
  return y + alto + 12;
}

/** Pie con numeracion de pagina, en todas las hojas. */
export function pies(doc: jsPDF, perfil: PerfilEmpresa) {
  const total = doc.getNumberOfPages();
  for (let i = 1; i <= total; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...GRIS);
    doc.text(perfil.nombre || 'Grupo Fénix', MARGEN, 770);
    doc.text(`Página ${i} de ${total}`, ANCHO - MARGEN, 770, { align: 'right' });
  }
}

export function nombreArchivo(cot: Cotizacion, perfil: PerfilEmpresa, sufijo: string): string {
  const num = formatearNumero(cot.numero, perfil.prefijoCorrelativo).replace(/[^\w-]/g, '');
  return `${num}-${sufijo}.pdf`;
}
