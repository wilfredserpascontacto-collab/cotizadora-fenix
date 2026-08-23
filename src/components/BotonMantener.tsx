import { useCallback, useRef, useState, type ReactNode } from 'react';

/**
 * Boton tipo bateria: hay que mantenerlo presionado hasta que se llena y
 * soltarlo para que dispare la accion. Sirve de confirmacion para lo que ya no
 * se puede deshacer (emite el correlativo, genera y comparte los PDF), y de
 * paso disimula el tiempo que tarda esa generacion detras de la animacion.
 *
 * La accion se dispara AL SOLTAR, no cuando vence el temporizador. No es un
 * detalle de gusto: navigator.share y window.open exigen una interaccion del
 * usuario reciente. Disparando desde el setTimeout, para cuando llegaba la
 * llamada esa activacion ya habia vencido y el navegador bloqueaba en silencio
 * tanto la hoja de compartir como la ventana de WhatsApp. Al soltar el dedo hay
 * gesto fresco y las dos cosas funcionan.
 */
export function BotonMantener({
  etiqueta,
  etiquetaCargando = 'Generando…',
  duracionMs = 5000,
  cargando = false,
  disabled = false,
  onEmpezar,
  onCompletar,
  className = '',
}: {
  etiqueta: ReactNode;
  etiquetaCargando?: ReactNode;
  duracionMs?: number;
  /** Trabajo async en curso, disparado por una carga anterior ya completada. */
  cargando?: boolean;
  disabled?: boolean;
  /**
   * Corre al presionar. Sirve para adelantar el trabajo pesado mientras la
   * barra se llena, y que al soltar no haya nada que esperar.
   */
  onEmpezar?: () => void;
  onCompletar: () => void;
  /** Variante de tamano, ej. "grande". Se agrega a la clase del boton. */
  className?: string;
}) {
  const [presionando, setPresionando] = useState(false);
  const [lleno, setLleno] = useState(false);
  const [drenando, setDrenando] = useState(false);
  const timeoutRef = useRef<number | null>(null);
  // En ref ademas de en estado: soltar() lo lee dentro del mismo gesto, antes
  // de que React haya vuelto a renderizar.
  const llenoRef = useRef(false);

  const limpiar = useCallback(() => {
    if (timeoutRef.current !== null) {
      window.clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    llenoRef.current = false;
    setPresionando(false);
    setLleno(false);
  }, []);

  const drenar = useCallback(() => {
    setDrenando(true);
    window.setTimeout(() => setDrenando(false), 250);
  }, []);

  const empezar = useCallback(() => {
    if (disabled || cargando || timeoutRef.current !== null || llenoRef.current) return;
    setDrenando(false);
    setPresionando(true);
    onEmpezar?.();
    timeoutRef.current = window.setTimeout(() => {
      timeoutRef.current = null;
      llenoRef.current = true;
      setLleno(true);
      setPresionando(false);
    }, duracionMs);
  }, [disabled, cargando, duracionMs, onEmpezar]);

  /** Soltar el dedo: si la barra se lleno, dispara. Aca vive el gesto valido. */
  const soltar = useCallback(() => {
    const completo = llenoRef.current;
    const empezado = completo || timeoutRef.current !== null;
    limpiar();
    if (completo) onCompletar();
    else if (empezado) drenar();
  }, [limpiar, drenar, onCompletar]);

  /** Salir del boton o cancelar el puntero: nunca dispara. */
  const abortar = useCallback(() => {
    const empezado = llenoRef.current || timeoutRef.current !== null;
    limpiar();
    if (empezado) drenar();
  }, [limpiar, drenar]);

  const inactivo = disabled || cargando;

  return (
    <div className={`boton-bateria-envoltura${inactivo ? ' inactivo' : ''}`}>
      <button
        type="button"
        className={`boton-bateria${className ? ` ${className}` : ''}${presionando ? ' presionando' : ''}${lleno ? ' lleno' : ''}${cargando ? ' cargando' : ''}${drenando ? ' drenando' : ''}`}
        disabled={inactivo}
        aria-label={
          typeof etiqueta === 'string'
            ? `Mantener presionado y soltar para ${etiqueta.toLowerCase()}`
            : undefined
        }
        onPointerDown={empezar}
        onPointerUp={soltar}
        onPointerLeave={abortar}
        onPointerCancel={abortar}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            empezar();
          }
        }}
        onKeyUp={(e) => {
          if (e.key === 'Enter' || e.key === ' ') soltar();
        }}
        style={{ ['--duracion-bateria' as string]: `${duracionMs}ms` }}
      >
        <span className="relleno" aria-hidden />
        <span className="etiqueta-bateria">{cargando ? etiquetaCargando : etiqueta}</span>
      </button>
      <span className="bateria-nub" aria-hidden />
    </div>
  );
}
