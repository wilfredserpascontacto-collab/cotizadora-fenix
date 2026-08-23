import { useEffect, useState, type ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';

export function Barra({
  titulo,
  subtitulo,
  atras,
  accion,
  logo,
}: {
  titulo: string;
  subtitulo?: string;
  atras?: string | (() => void);
  accion?: ReactNode;
  /** Logo de la empresa, en dataURL. Solo se muestra donde suma. */
  logo?: string;
}) {
  const navigate = useNavigate();
  return (
    <header className="barra">
      {atras !== undefined && (
        <button
          type="button"
          aria-label="Volver"
          onClick={() => (typeof atras === 'function' ? atras() : navigate(atras))}
        >
          ‹
        </button>
      )}
      {logo && <img className="barra-logo" src={logo} alt="" />}
      <h1>
        {titulo}
        {subtitulo && <span className="sub">{subtitulo}</span>}
      </h1>
      {accion}
    </header>
  );
}

/** Mas y menos grandes: la cantidad se cambia sin abrir el teclado. */
export function Contador({
  valor,
  onCambio,
  min = 0,
}: {
  valor: number;
  onCambio: (delta: number) => void;
  min?: number;
}) {
  return (
    <div className="contador">
      <button type="button" aria-label="Restar uno" onClick={() => onCambio(-1)} disabled={valor <= min}>
        −
      </button>
      <span className="valor" aria-live="polite">
        {valor}
      </span>
      <button type="button" aria-label="Sumar uno" onClick={() => onCambio(1)}>
        +
      </button>
    </div>
  );
}

export function Hoja({
  titulo,
  onCerrar,
  children,
}: {
  titulo: string;
  onCerrar: () => void;
  children: ReactNode;
}) {
  useEffect(() => {
    const esc = (e: KeyboardEvent) => e.key === 'Escape' && onCerrar();
    window.addEventListener('keydown', esc);
    return () => window.removeEventListener('keydown', esc);
  }, [onCerrar]);

  return (
    <div className="hoja" role="dialog" aria-modal="true" aria-label={titulo} onClick={onCerrar}>
      <div className="hoja-panel" onClick={(e) => e.stopPropagation()}>
        <div className="fila entre" style={{ marginBottom: 12 }}>
          <h3 style={{ margin: 0 }}>{titulo}</h3>
          <button type="button" className="btn chico fantasma" onClick={onCerrar}>
            Cerrar
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

export function Campo({
  etiqueta,
  children,
  ayuda,
}: {
  etiqueta: string;
  children: ReactNode;
  ayuda?: string;
}) {
  return (
    <label className="campo">
      <span>{etiqueta}</span>
      {children}
      {ayuda && <span className="mini">{ayuda}</span>}
    </label>
  );
}

export function Vacio({ titulo, detalle }: { titulo: string; detalle?: string }) {
  return (
    <div className="vacio">
      <p style={{ fontWeight: 600, color: 'var(--tinta-suave)' }}>{titulo}</p>
      {detalle && <p className="mini">{detalle}</p>}
    </div>
  );
}

export function Cargando() {
  return <div className="cargando">Cargando…</div>;
}

/** Aviso discreto de que la app funciona igual sin senal. */
export function EstadoConexion() {
  const [online, setOnline] = useState(navigator.onLine);
  useEffect(() => {
    const arriba = () => setOnline(true);
    const abajo = () => setOnline(false);
    window.addEventListener('online', arriba);
    window.addEventListener('offline', abajo);
    return () => {
      window.removeEventListener('online', arriba);
      window.removeEventListener('offline', abajo);
    };
  }, []);
  if (online) return null;
  return <div className="sin-conexion offline">Sin señal. Podés seguir cotizando: todo se guarda en el teléfono.</div>;
}

export function Acordeon({
  titulo,
  contador,
  abiertoPorDefecto = false,
  children,
}: {
  titulo: string;
  contador?: number;
  abiertoPorDefecto?: boolean;
  children: ReactNode;
}) {
  const [abierto, setAbierto] = useState(abiertoPorDefecto);
  return (
    <section className="tarjeta plana" style={{ padding: '0 12px', marginBottom: 8 }}>
      <button
        type="button"
        className="acordeon-cabeza"
        aria-expanded={abierto}
        onClick={() => setAbierto((v) => !v)}
      >
        <span>
          {titulo}
          {contador !== undefined && <span className="mini"> · {contador}</span>}
        </span>
        <span aria-hidden>{abierto ? '−' : '+'}</span>
      </button>
      {abierto && <div style={{ paddingBottom: 12 }}>{children}</div>}
    </section>
  );
}
