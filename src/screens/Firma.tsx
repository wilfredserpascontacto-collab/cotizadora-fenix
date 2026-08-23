import { useCallback, useEffect, useRef, useState, type PointerEvent } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { guardarCotizacion } from '../db/repo';
import { useCotizacion } from '../state/useCotizacion';
import { Barra, Cargando, Vacio } from '../components/ui';

/**
 * Captura la firma del cliente con el dedo, en un canvas liso: sin
 * librerias nuevas, el proyecto ya evita dependencias que no necesita.
 * El fondo es transparente y la linea guia va aparte en CSS, para que el
 * PNG exportado sea solo el trazo, listo para pegarse en el PDF.
 */
export default function Firma() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { cot, cargando } = useCotizacion(id);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const dibujandoRef = useRef(false);
  const [haFirmado, setHaFirmado] = useState(false);
  const [guardando, setGuardando] = useState(false);

  /**
   * Pone el buffer del canvas al tamano real que ocupa en pantalla.
   *
   * Si no se hace, el canvas se queda con su tamano por defecto (300x150)
   * mientras el CSS lo estira al ancho del telefono. El navegador escala esa
   * imagen chica hasta llenar el recuadro, asi que el trazo sale corrido a la
   * derecha y abajo, y el desvio crece mientras mas te alejas de la esquina
   * superior izquierda.
   */
  const ajustarLienzo = useCallback((preservarTrazo: boolean) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const { width, height } = canvas.getBoundingClientRect();
    if (width === 0 || height === 0) return;

    const dpr = window.devicePixelRatio || 1;
    const ancho = Math.round(width * dpr);
    const alto = Math.round(height * dpr);
    if (canvas.width === ancho && canvas.height === alto) return;

    // Cambiar el tamano del buffer borra lo dibujado: se copia y se repinta.
    let copia: HTMLCanvasElement | null = null;
    if (preservarTrazo && canvas.width > 0 && canvas.height > 0) {
      copia = document.createElement('canvas');
      copia.width = canvas.width;
      copia.height = canvas.height;
      copia.getContext('2d')?.drawImage(canvas, 0, 0);
    }

    canvas.width = ancho;
    canvas.height = alto;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    // Se dibuja siempre en pixeles CSS: el dpr vive solo en esta transformacion.
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.lineWidth = 2.5;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.strokeStyle = '#0f172a';

    if (copia) {
      ctx.save();
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.drawImage(copia, 0, 0, ancho, alto);
      ctx.restore();
    }
  }, []);

  /**
   * Depende de `cargando` a proposito. En el primer render la cotizacion
   * todavia no llego de IndexedDB, la pantalla muestra el spinner y el canvas
   * no existe: con [] el ajuste corria contra un ref vacio y no volvia nunca.
   */
  useEffect(() => {
    if (cargando) return;
    ajustarLienzo(false);
    const canvas = canvasRef.current;
    if (!canvas || typeof ResizeObserver === 'undefined') return;
    // Girar el telefono cambia el ancho: hay que reescalar sin perder la firma.
    const observador = new ResizeObserver(() => ajustarLienzo(true));
    observador.observe(canvas);
    return () => observador.disconnect();
  }, [cargando, cot?.id, ajustarLienzo]);

  function posicion(e: PointerEvent<HTMLCanvasElement>) {
    const rect = e.currentTarget.getBoundingClientRect();
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
  }

  function empezarTrazo(e: PointerEvent<HTMLCanvasElement>) {
    const canvas = canvasRef.current;
    if (!canvas) return;
    // Barato y sale de una si el tamano ya coincide. Cubre el caso de que el
    // teclado o una barra del navegador hayan movido el alto entre trazos.
    ajustarLienzo(true);
    canvas.setPointerCapture(e.pointerId);
    dibujandoRef.current = true;
    const { x, y } = posicion(e);
    const ctx = canvas.getContext('2d');
    ctx?.beginPath();
    ctx?.moveTo(x, y);
  }

  function seguirTrazo(e: PointerEvent<HTMLCanvasElement>) {
    if (!dibujandoRef.current) return;
    const ctx = canvasRef.current?.getContext('2d');
    const { x, y } = posicion(e);
    ctx?.lineTo(x, y);
    ctx?.stroke();
    if (!haFirmado) setHaFirmado(true);
  }

  function terminarTrazo() {
    dibujandoRef.current = false;
  }

  function borrar() {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;
    // Sin transformacion: clearRect en pixeles del buffer, no en pixeles CSS.
    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.restore();
    setHaFirmado(false);
  }

  async function continuar() {
    const canvas = canvasRef.current;
    if (!canvas || !cot) return;
    setGuardando(true);
    try {
      const dataUrl = canvas.toDataURL('image/png');
      await guardarCotizacion({ ...cot, firmaClienteDataUrl: dataUrl, firmadaEn: Date.now() });
      navigate(`/cot/${cot.id}/resumen`);
    } finally {
      setGuardando(false);
    }
  }

  if (cargando || !cot) return cargando ? <Cargando /> : <Vacio titulo="Cotización no encontrada" />;

  return (
    <>
      <Barra titulo="Firma" atras={`/cot/${cot.id}/vista-previa`} />

      <main className="contenido con-pie">
        <div className="aviso info">
          Pedile al cliente que firme con el dedo, aceptando la cotización tal como quedó.
        </div>

        <div className="lienzo-firma-envoltura">
          <span className="lienzo-firma-guia" aria-hidden />
          <span className="lienzo-firma-etiqueta" aria-hidden>
            Firme aquí
          </span>
          <canvas
            ref={canvasRef}
            onPointerDown={empezarTrazo}
            onPointerMove={seguirTrazo}
            onPointerUp={terminarTrazo}
            onPointerCancel={terminarTrazo}
            aria-label="Área para firmar"
          />
        </div>

        <div className="fila" style={{ marginTop: 12 }}>
          <button type="button" className="btn chico" onClick={borrar} disabled={!haFirmado}>
            Borrar
          </button>
        </div>
      </main>

      <div className="pie">
        <div className="pie-inner">
          <button
            type="button"
            className="btn primario"
            disabled={!haFirmado || guardando}
            onClick={() => void continuar()}
          >
            Continuar
          </button>
          <button
            type="button"
            className="btn chico fantasma"
            style={{ width: '100%' }}
            onClick={() => navigate(`/cot/${cot.id}/resumen`)}
          >
            Firmar después
          </button>
        </div>
      </div>
    </>
  );
}
