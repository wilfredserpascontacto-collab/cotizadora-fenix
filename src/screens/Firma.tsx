import { useEffect, useRef, useState, type PointerEvent } from 'react';
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

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const dpr = window.devicePixelRatio || 1;
    const { width, height } = canvas.getBoundingClientRect();
    canvas.width = width * dpr;
    canvas.height = height * dpr;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.scale(dpr, dpr);
      ctx.lineWidth = 2.5;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.strokeStyle = '#0f172a';
    }
  }, []);

  function posicion(e: PointerEvent<HTMLCanvasElement>) {
    const rect = e.currentTarget.getBoundingClientRect();
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
  }

  function empezarTrazo(e: PointerEvent<HTMLCanvasElement>) {
    const canvas = canvasRef.current;
    if (!canvas) return;
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
    if (canvas && ctx) ctx.clearRect(0, 0, canvas.width, canvas.height);
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
