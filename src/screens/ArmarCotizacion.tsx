import { useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useLiveQuery } from 'dexie-react-hooks';
import { db, leerAjustes } from '../db/db';
import {
  agregarRenglon,
  cambiarCantidad,
  actualizarRenglon,
  quitarRenglon,
} from '../db/repo';
import { calcularTotales } from '../domain/cotizacion';
import { fmtMoney } from '../domain/money';
import { CATEGORIAS, type CategoriaPartida, type RenglonInstalacion } from '../domain/types';
import { useCotizacion } from '../state/useCotizacion';
import { Barra, Cargando, Contador, Vacio } from '../components/ui';
import { EditorPrecio } from '../components/EditorPrecio';

export default function ArmarCotizacion() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { cot, cliente, cargando } = useCotizacion(id);
  const partidas = useLiveQuery(() => db.partidas.toArray(), []);
  const ajustes = useLiveQuery(() => leerAjustes(), []);

  const [busqueda, setBusqueda] = useState('');
  const [categoria, setCategoria] = useState<CategoriaPartida | 'todas'>('todas');
  const [editando, setEditando] = useState<RenglonInstalacion | null>(null);

  const catalogo = useMemo(() => {
    const activas = (partidas ?? []).filter((p) => p.activa);
    const q = busqueda.trim().toLowerCase();
    const filtradas = activas.filter((p) => {
      const porCategoria = categoria === 'todas' || p.categoria === categoria;
      const porTexto = !q || p.nombre.toLowerCase().includes(q);
      return porCategoria && porTexto;
    });
    const grupos = new Map<CategoriaPartida, typeof filtradas>();
    for (const p of filtradas) {
      const lista = grupos.get(p.categoria) ?? [];
      lista.push(p);
      grupos.set(p.categoria, lista);
    }
    for (const lista of grupos.values()) lista.sort((a, b) => a.nombre.localeCompare(b.nombre, 'es'));
    return grupos;
  }, [partidas, busqueda, categoria]);

  if (cargando || !partidas) return <Cargando />;
  if (!cot) return <Vacio titulo="Esa cotización ya no existe." />;

  const totales = calcularTotales(cot);
  const tipoObra = ajustes?.tiposObra.find((t) => t.id === cot.tipoObra);
  const pctObra = tipoObra ? Math.round(tipoObra.multiplicadorBps / 100 - 100) : 0;
  const enCotizacion = new Map(cot.renglones.map((r) => [r.partidaId, r]));

  return (
    <>
      <Barra
        titulo="Armar cotización"
        subtitulo={cliente?.nombre ?? undefined}
        atras="/"
        accion={
          <button type="button" onClick={() => navigate(`/cot/${cot.id}/materiales`)}>
            Materiales ›
          </button>
        }
      />

      <main className="contenido con-pie">
        {pctObra !== 0 && (
          <div className="aviso">
            <strong>{tipoObra?.nombre}</strong>: la mano de obra lleva +{pctObra}%. Las cantidades de
            material no cambian.
          </div>
        )}

        {cot.renglones.length > 0 && (
          <>
            <h2>En la cotización</h2>
            {cot.renglones.map((r) => (
              <article key={r.id} className="renglon">
                <div className="cabeza">
                  <div style={{ flex: 1 }}>
                    <div className="desc">{r.descripcion}</div>
                    <div className="mini">
                      {fmtMoney(r.precioManoObraCents)} / {r.unidad}
                      {r.precioEditado && ' · precio editado'}
                    </div>
                  </div>
                  <strong style={{ whiteSpace: 'nowrap' }}>
                    {fmtMoney(r.precioManoObraCents * r.cantidad)}
                  </strong>
                </div>
                <div className="pie-renglon">
                  <Contador valor={r.cantidad} onCambio={(d) => void cambiarCantidad(cot, r.id, d)} min={1} />
                  <div className="fila">
                    <button type="button" className="btn chico" onClick={() => setEditando(r)}>
                      Precio
                    </button>
                    <button
                      type="button"
                      className="btn chico peligro"
                      aria-label={`Quitar ${r.descripcion}`}
                      onClick={() => void quitarRenglon(cot, r.id)}
                    >
                      Quitar
                    </button>
                  </div>
                </div>
              </article>
            ))}
          </>
        )}

        <h2>Catálogo de partidas</h2>
        <input
          type="search"
          value={busqueda}
          onChange={(e) => setBusqueda(e.target.value)}
          placeholder="Buscar partida…"
          aria-label="Buscar partida"
          style={{ marginBottom: 10 }}
        />
        <div className="chips" role="group" aria-label="Categorías">
          <button
            type="button"
            className="chip"
            aria-pressed={categoria === 'todas'}
            onClick={() => setCategoria('todas')}
          >
            Todas
          </button>
          {CATEGORIAS.map((c) => (
            <button
              key={c.id}
              type="button"
              className="chip"
              aria-pressed={categoria === c.id}
              onClick={() => setCategoria(c.id)}
            >
              {c.nombre}
            </button>
          ))}
        </div>

        {catalogo.size === 0 && <Vacio titulo="Ninguna partida coincide" detalle="Probá con otra palabra." />}

        {CATEGORIAS.filter((c) => catalogo.has(c.id)).map((c) => (
          <section key={c.id}>
            <h2>{c.nombre}</h2>
            {catalogo.get(c.id)!.map((p) => {
              const dentro = enCotizacion.get(p.id);
              return (
                <button
                  key={p.id}
                  type="button"
                  className={`item-catalogo${dentro ? ' dentro' : ''}`}
                  onClick={() => void agregarRenglon(cot, p)}
                >
                  <span className="nombre">
                    {p.nombre}
                    <span className="mini" style={{ display: 'block', fontWeight: 400 }}>
                      {fmtMoney(p.precioManoObraCents)} / {p.unidad}
                      {dentro ? ` · ${dentro.cantidad} en la cotización` : ''}
                    </span>
                  </span>
                  <span className="mas" aria-hidden>
                    +
                  </span>
                </button>
              );
            })}
          </section>
        ))}
      </main>

      {/* Total de mano de obra siempre visible, actualizandose en vivo. */}
      <div className="pie">
        <div className="pie-inner">
          <div className="total-flotante">
            <span className="tenue">
              Mano de obra{pctObra !== 0 ? ` (+${pctObra}%)` : ''}
              <span className="mini" style={{ display: 'block' }}>
                sin IVA · materiales aparte
              </span>
            </span>
            <span className="cifra">{fmtMoney(totales.subtotalCents)}</span>
          </div>
          <button
            type="button"
            className="btn primario"
            disabled={cot.renglones.length === 0}
            onClick={() => navigate(`/cot/${cot.id}/materiales`)}
          >
            Ver lista de materiales
          </button>
        </div>
      </div>

      {editando && (
        <EditorPrecio
          renglon={editando}
          onCerrar={() => setEditando(null)}
          onGuardar={async (cents) => {
            await actualizarRenglon(cot, editando.id, {
              precioManoObraCents: cents,
              precioEditado: cents !== editando.precioManoObraCents || editando.precioEditado,
            });
            setEditando(null);
          }}
        />
      )}
    </>
  );
}
