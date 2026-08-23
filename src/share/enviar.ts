import { formatearNumero } from '../domain/cotizacion';
import { fmtMoney } from '../domain/money';
import type { Cliente, Cotizacion, PerfilEmpresa } from '../domain/types';
import type { TotalesCotizacion } from '../domain/cotizacion';

export interface ArchivoPdf {
  nombre: string;
  blob: Blob;
}

export type ResultadoEnvio = 'compartido' | 'descargado' | 'cancelado';

/**
 * Manda los PDF por WhatsApp con Web Share nivel 2.
 * Si el navegador no soporta compartir archivos (Firefox de escritorio, iOS
 * viejo), cae a descargar los archivos y abrir wa.me con el texto del resumen,
 * que es lo mejor que se puede hacer sin servidor.
 */
export async function enviarPdfs(
  archivos: ArchivoPdf[],
  texto: string,
  telefono?: string,
): Promise<ResultadoEnvio> {
  const files = archivos.map(
    (a) => new File([a.blob], a.nombre, { type: 'application/pdf' }),
  );

  if (typeof navigator !== 'undefined' && navigator.canShare?.({ files })) {
    try {
      await navigator.share({ files, text: texto, title: archivos[0]?.nombre });
      return 'compartido';
    } catch (e) {
      // El usuario cerró la hoja de compartir: no es un error que reportar.
      if ((e as DOMException)?.name === 'AbortError') return 'cancelado';
      // Cualquier otra falla cae al plan B, pero dejando rastro: el caso
      // tipico es NotAllowedError por gesto vencido, y sin esto no se ve.
      console.warn('No se pudo compartir, se descargan los PDF:', (e as Error)?.name, e);
    }
  }

  for (const a of archivos) descargar(a);
  abrirWhatsApp(texto, telefono);
  return 'descargado';
}

export function descargar({ nombre, blob }: ArchivoPdf) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = nombre;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 60_000);
}

export function abrirPdf({ blob }: ArchivoPdf) {
  const url = URL.createObjectURL(blob);
  abrirEnlace(url);
  setTimeout(() => URL.revokeObjectURL(url), 60_000);
}

/**
 * Abre un enlace en otra pestana, y si el navegador lo bloquea, navega en la
 * actual. En una PWA instalada window.open devuelve null bastante seguido, y
 * sin este respaldo el chat de WhatsApp simplemente no se abria nunca.
 */
function abrirEnlace(url: string) {
  const ventana = window.open(url, '_blank', 'noopener');
  if (!ventana) window.location.href = url;
}

function abrirWhatsApp(texto: string, telefono?: string) {
  // wa.me quiere el número sin signos. El 503 es El Salvador.
  const limpio = (telefono ?? '').replace(/\D/g, '');
  const numero = limpio.length === 8 ? `503${limpio}` : limpio;
  const base = numero ? `https://wa.me/${numero}` : 'https://wa.me/';
  abrirEnlace(`${base}?text=${encodeURIComponent(texto)}`);
}

/** Texto que acompaña los PDF en el chat. */
export function textoResumen(
  cot: Cotizacion,
  perfil: PerfilEmpresa,
  cliente: Cliente | null,
  totales: TotalesCotizacion,
  incluyeMateriales: boolean,
): string {
  const nombre = (cot.clienteSnapshot ?? cliente)?.nombre ?? 'estimado cliente';
  const lineas = [
    `Buenas, ${nombre}. Le comparto la cotización ${formatearNumero(
      cot.numero,
      perfil.prefijoCorrelativo,
    )} de ${perfil.nombre || 'Grupo Fénix'}.`,
    '',
    `Mano de obra e instalación: ${fmtMoney(totales.totalCents)} (${
      cot.aplicaIva !== false ? 'IVA incluido' : 'exento de IVA'
    }).`,
  ];
  if (incluyeMateriales) {
    lineas.push(
      'Materiales: van en lista aparte para que usted los compre en la distribuidora. Ese monto no me lo paga a mí.',
    );
  }
  lineas.push('', `Válida por ${cot.diasValidez} días. Quedo atento.`);
  return lineas.join('\n');
}
