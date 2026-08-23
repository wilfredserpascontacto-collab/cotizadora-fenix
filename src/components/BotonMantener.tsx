import { useCallback, useRef, useState, type ReactNode } from 'react';

/**
 * Boton tipo bateria: hay que mantenerlo presionado hasta que se llena para
 * que dispare la accion. Sirve de confirmacion para lo que ya no se puede
 * deshacer (emite el correlativo, genera y comparte los PDF), y de paso
 * disimula el tiempo que tarda esa generacion detras de la animacion.
 */
export function BotonMantener({
  etiqueta,
  etiquetaCargando = 'Generando…',
  duracionMs = 5000,
  cargando = false,
  disabled = false,
  onCompletar,
  className = '',
}: {
  etiqueta: ReactNode;
  etiquetaCargando?: ReactNode;
  duracionMs?: number;
  /** Trabajo async en curso, disparado por una carga anterior ya completada. */
  cargando?: boolean;
  disabled?: boolean;
  onCompletar: () => void;
  /** Variante de tamano, ej. "grande". Se agrega a la clase del boton. */
  className?: string;
}) {
  const [presionando, setPresionando] = useState(false);
  const [drenando, setDrenando] = useState(false);
  const timeoutRef = useRef<number | null>(null);

  const cancelar = useCallback(() => {
    if (timeoutRef.current === null) return;
    window.clearTimeout(timeoutRef.current);
    timeoutRef.current = null;
    setPresionando(false);
    setDrenando(true);
    window.setTimeout(() => setDrenando(false), 250);
  }, []);

  const empezar = useCallback(() => {
    if (disabled || cargando || timeoutRef.current !== null) return;
    setDrenando(false);
    setPresionando(true);
    timeoutRef.current = window.setTimeout(() => {
      timeoutRef.current = null;
      setPresionando(false);
      onCompletar();
    }, duracionMs);
  }, [disabled, cargando, duracionMs, onCompletar]);

  const inactivo = disabled || cargando;

  return (
    <div className={`boton-bateria-envoltura${inactivo ? ' inactivo' : ''}`}>
      <button
        type="button"
        className={`boton-bateria${className ? ` ${className}` : ''}${presionando ? ' presionando' : ''}${cargando ? ' cargando' : ''}${drenando ? ' drenando' : ''}`}
        disabled={inactivo}
        aria-label={typeof etiqueta === 'string' ? `Mantener presionado para ${etiqueta.toLowerCase()}` : undefined}
        onPointerDown={empezar}
        onPointerUp={cancelar}
        onPointerLeave={cancelar}
        onPointerCancel={cancelar}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            empezar();
          }
        }}
        onKeyUp={(e) => {
          if (e.key === 'Enter' || e.key === ' ') cancelar();
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
