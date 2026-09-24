import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLiveQuery } from 'dexie-react-hooks';
import { db, leerPerfil } from '../db/db';
import {
  archivarCotizacion,
  cambiarEstado,
  desarchivarCotizacion,
  duplicarCotizacion,
  eliminarCotizacion,
} from '../db/repo';
import {
  ETIQUETA_ESTADO,
  calcularTotales,
  estadoVisible,
  fechaVencimiento,
  fmtFecha,
  formatearNumero,
} from '../domain/cotizacion';
import { fmtMoney } from '../domain/money';
import type { Cotizacion, EstadoCotizacion } from '../domain/types';
import { Barra, Cargando, Hoja, Vacio } from '../components/ui';

type Filtro = EstadoCotizacion | 'todas' | 'archivadas';

const FILTROS: { id: Filtro; nombre: string }[] = [
  { id: 'todas', nombre: 'Todas' },
  { id: 'borrador', nombre: 'Borradores' },
  { id: 'enviada', nombre: 'Enviadas' },
  { id: 'aceptada', nombre: 'Aceptadas' },
  { id: 'rechazada', nombre: 'Rechazadas' },
  { id: 'vencida', nombre: 'Vencidas' },
  { id: 'archivadas', nombre: 'Archivadas' },
];

export default function Historial() {
  const navigate = useNavigate();
  const perfil = useLiveQuery(() => leerPerfil(), []);
  const datos = useLiveQuery(async () => {
    const cotizaciones = await db.cotizaciones.orderBy('modificadaEn').reverse().toArray();
    const clientes = await db.clientes.toArray();
    return { cotizaciones, clientes: new Map(clientes.map((c) => [c.id, c])) };
  }, []);

  const [busqueda, setBusqueda] = useState('');
  const [filtro, setFiltro] = useState<Filtro>('todas');
  const [abierta, setAbierta] = useState<Cotizacion | null>(null);

  const lista = useMemo(() => {
    if (!datos) return [];
    const q = busqueda.trim().toLowerCase();
    return datos.cotizaciones.filter((c) => {
      // Las archivadas viven en su propia pestana: en las demas no estorban.
      const archivada = c.archivadaEn != null;
      if (filtro === 'archivadas') {
        if (!archivada) return false;
      } else {
        if (archivada) return false;
        const estado = estadoVisible(c);
        if (filtro !== 'todas' && estado !== filtro) return false;
      }
      if (!q) return true;
      const nombre = (c.clienteSnapshot ?? datos.clientes.get(c.clienteId))?.nombre ?? '';
      return (
        nombre.toLowerCase().includes(q) ||
        c.ubicacion.toLowerCase().includes(q) ||
        String(c.numero ?? '').includes(q)
      );
    });
  }, [datos, busqueda, filtro]);

  if (!datos || !perfil) return <Cargando />;

  return (
    <>
      <Barra titulo="Historial" atras="/" />
      <main className="contenido">
        <input
          type="search"
          value={busqueda}
          onChange={(e) => setBusqueda(e.target.value)}
          placeholder="Buscar por cliente, lugar o número…"
          aria-label="Buscar cotización"
          style={{ marginBottom: 10 }}
        />
        <div className="chips" role="group" aria-label="Filtrar por estado">
          {FILTROS.map((f) => (
            <button
              key={f.id}
              type="button"
              className="chip"
              aria-pressed={filtro === f.id}
              onClick={() => setFiltro(f.id)}
            >
              {f.nombre}
            </button>
          ))}
        </div>

        {lista.length === 0 && (
          <Vacio
            titulo={filtro === 'archivadas' ? 'No hay nada archivado' : 'No hay cotizaciones aquí'}
            detalle={
              filtro === 'archivadas'
                ? 'Las que saques del historial se van a guardar acá, enteras, por si las volvés a necesitar.'
                : 'Las que armes van a aparecer en esta lista.'
            }
          />
        )}

        {lista.map((c) => {
          const cliente = c.clienteSnapshot ?? datos.clientes.get(c.clienteId);
          const estado = estadoVisible(c);
          const totales = calcularTotales(c);
          const clase =
            estado === 'aceptada' ? 'ok' : estado === 'rechazada' || estado === 'vencida' ? 'peligro' : '';
          return (
            <article key={c.id} className="renglon" onClick={() => setAbierta(c)}>
              <div className="cabeza">
                <div style={{ flex: 1 }}>
                  <div className="desc">{cliente?.nombre ?? 'Cliente eliminado'}</div>
                  <div className="mini">
                    {formatearNumero(c.numero, perfil.prefijoCorrelativo)} ·{' '}
                    {fmtFecha(c.emitidaEn ?? c.creadaEn)} · {c.renglones.length} partida
                    {c.renglones.length === 1 ? '' : 's'}
                  </div>
                  {c.ubicacion && <div className="mini">{c.ubicacion}</div>}
                  <span className={`etiqueta ${clase}`} style={{ marginTop: 6, display: 'inline-block' }}>
                    {ETIQUETA_ESTADO[estado]}
                  </span>
                </div>
                <strong style={{ whiteSpace: 'nowrap' }}>{fmtMoney(totales.totalCents)}</strong>
              </div>
            </article>
          );
        })}
      </main>

      {abierta && (
        <Hoja
          titulo={
            (abierta.clienteSnapshot ?? datos.clientes.get(abierta.clienteId))?.nombre ?? 'Cotización'
          }
          onCerrar={() => setAbierta(null)}
        >
          <p className="mini">
            {formatearNumero(abierta.numero, perfil.prefijoCorrelativo)} ·{' '}
            {fmtMoney(calcularTotales(abierta).totalCents)}
            {fechaVencimiento(abierta) && ` · vence ${fmtFecha(fechaVencimiento(abierta))}`}
          </p>

          <div className="columna" style={{ marginTop: 12 }}>
            <button
              type="button"
              className="btn primario"
              onClick={() => navigate(`/cot/${abierta.id}/resumen`)}
            >
              Abrir
            </button>
            <button
              type="button"
              className="btn"
              onClick={async () => {
                // Muchos trabajos se parecen: duplicar ahorra la mitad del trabajo.
                const copia = await duplicarCotizacion(abierta);
                setAbierta(null);
                navigate(`/cot/${copia.id}`);
              }}
            >
              Duplicar para otro cliente
            </button>

            {abierta.numero !== null && (
              <div className="grid-2">
                {(['aceptada', 'rechazada'] as const).map((e) => (
                  <button
                    key={e}
                    type="button"
                    className="btn chico"
                    style={{ width: '100%' }}
                    onClick={async () => {
                      await cambiarEstado(abierta, e);
                      setAbierta(null);
                    }}
                  >
                    Marcar {ETIQUETA_ESTADO[e].toLowerCase()}
                  </button>
                ))}
              </div>
            )}

            {abierta.archivadaEn != null ? (
              <button
                type="button"
                className="btn"
                onClick={async () => {
                  await desarchivarCotizacion(abierta);
                  setAbierta(null);
                }}
              >
                Sacar del archivo
              </button>
            ) : (
              <button
                type="button"
                className="btn"
                onClick={async () => {
                  await archivarCotizacion(abierta);
                  setAbierta(null);
                }}
              >
                {abierta.numero === null ? 'Guardar aparte el borrador' : 'Archivar'}
              </button>
            )}

            <button
              type="button"
              className="btn peligro"
              onClick={async () => {
                // Avisar no es impedir: se dice exactamente que se pierde y
                // que no, y despues se hace lo que la persona decida.
                const aviso =
                  abierta.numero === null
                    ? '¿Borrar este borrador? No tiene número todavía, así que no queda rastro de él en ningún lado.'
                    : `¿Borrar la ${formatearNumero(abierta.numero, perfil.prefijoCorrelativo)} para siempre?\n\n` +
                      'El número no se va a reusar: la próxima cotización sigue la serie igual. Lo que ' +
                      'se pierde es esta copia. Si el cliente tiene el PDF en la mano, acá ya no va a ' +
                      'haber con qué compararlo.\n\nSi solo querés que deje de aparecer, cerrá esto y ' +
                      'tocá Archivar.';
                if (!window.confirm(aviso)) return;
                await eliminarCotizacion(abierta);
                setAbierta(null);
              }}
            >
              {abierta.numero === null ? 'Desechar borrador' : 'Borrar para siempre'}
            </button>

            <p className="mini" style={{ marginBottom: 0 }}>
              Archivar la saca de la lista pero la conserva entera, con su número, y se puede
              sacar del archivo cuando quieras. Borrar no tiene vuelta.
            </p>
          </div>
        </Hoja>
      )}
    </>
  );
}
