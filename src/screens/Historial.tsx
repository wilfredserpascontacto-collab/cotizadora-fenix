import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLiveQuery } from 'dexie-react-hooks';
import { db, leerPerfil } from '../db/db';
import { cambiarEstado, duplicarCotizacion, eliminarBorrador } from '../db/repo';
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

const FILTROS: { id: EstadoCotizacion | 'todas'; nombre: string }[] = [
  { id: 'todas', nombre: 'Todas' },
  { id: 'borrador', nombre: 'Borradores' },
  { id: 'enviada', nombre: 'Enviadas' },
  { id: 'aceptada', nombre: 'Aceptadas' },
  { id: 'rechazada', nombre: 'Rechazadas' },
  { id: 'vencida', nombre: 'Vencidas' },
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
  const [filtro, setFiltro] = useState<EstadoCotizacion | 'todas'>('todas');
  const [abierta, setAbierta] = useState<Cotizacion | null>(null);

  const lista = useMemo(() => {
    if (!datos) return [];
    const q = busqueda.trim().toLowerCase();
    return datos.cotizaciones.filter((c) => {
      const estado = estadoVisible(c);
      if (filtro !== 'todas' && estado !== filtro) return false;
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
          <Vacio titulo="No hay cotizaciones aquí" detalle="Las que armes van a aparecer en esta lista." />
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

            {abierta.numero === null ? (
              <button
                type="button"
                className="btn peligro"
                onClick={async () => {
                  if (!window.confirm('¿Desechar esta cotización sin terminar? Esta acción no se puede deshacer.')) return;
                  await eliminarBorrador(abierta);
                  setAbierta(null);
                }}
              >
                Desechar cotización
              </button>
            ) : (
              <p className="mini">
                Una cotización ya emitida no se borra: dejaría un hueco en la serie de números.
              </p>
            )}
          </div>
        </Hoja>
      )}
    </>
  );
}
