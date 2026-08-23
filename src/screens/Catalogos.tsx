import { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db, restaurarCatalogoDeFabrica } from '../db/db';
import { guardarMaterial, guardarPartida } from '../db/repo';
import { nuevoId } from '../domain/cotizacion';
import { centsToInput, fmtMilli, fmtMoney, parseCents, parseMilli } from '../domain/money';
import { CATEGORIAS, type Material, type Partida } from '../domain/types';
import { Acordeon, Barra, Campo, Cargando, Hoja, Vacio } from '../components/ui';

type Pestania = 'partidas' | 'materiales' | 'recetas';

export default function Catalogos() {
  const [pestania, setPestania] = useState<Pestania>('partidas');
  const partidas = useLiveQuery(() => db.partidas.orderBy('nombre').toArray(), []);
  const materiales = useLiveQuery(() => db.materiales.orderBy('nombre').toArray(), []);

  if (!partidas || !materiales) return <Cargando />;

  return (
    <>
      <Barra titulo="Catálogos" atras="/" />
      <main className="contenido">
        <div className="chips" role="tablist" aria-label="Catálogo">
          {(
            [
              ['partidas', 'Partidas'],
              ['materiales', 'Materiales'],
              ['recetas', 'Recetas'],
            ] as const
          ).map(([id, nombre]) => (
            <button
              key={id}
              type="button"
              className="chip"
              aria-pressed={pestania === id}
              onClick={() => setPestania(id)}
            >
              {nombre}
            </button>
          ))}
        </div>

        {pestania === 'partidas' && <TabPartidas partidas={partidas} />}
        {pestania === 'materiales' && <TabMateriales materiales={materiales} />}
        {pestania === 'recetas' && <TabRecetas partidas={partidas} materiales={materiales} />}

        <div className="tarjeta" style={{ marginTop: 24 }}>
          <h3>Volver a los datos de fabrica</h3>
          <p className="mini">
            Reemplaza partidas y materiales por los originales. El historial de cotizaciones no se
            toca: sus precios y recetas quedaron congelados.
          </p>
          <button
            type="button"
            className="btn peligro"
            onClick={() => {
              if (confirm('Se pierden los cambios al catalogo. Continuar?')) {
                void restaurarCatalogoDeFabrica();
              }
            }}
          >
            Restaurar catálogo
          </button>
        </div>
      </main>
    </>
  );
}

// --------------------------------------------------------------------- partidas

function TabPartidas({ partidas }: { partidas: Partida[] }) {
  const [editando, setEditando] = useState<Partida | null>(null);

  return (
    <>
      <button
        type="button"
        className="btn"
        style={{ marginBottom: 12 }}
        onClick={() =>
          setEditando({
            id: nuevoId(),
            nombre: '',
            unidad: 'punto',
            precioManoObraCents: 0,
            categoria: 'residencial',
            receta: [],
            activa: true,
          })
        }
      >
        + Nueva partida
      </button>

      {CATEGORIAS.map((c) => {
        const lista = partidas.filter((p) => p.categoria === c.id);
        if (lista.length === 0) return null;
        return (
          <Acordeon key={c.id} titulo={c.nombre} contador={lista.length}>
            {lista.map((p) => (
              <button
                key={p.id}
                type="button"
                className="item-catalogo"
                onClick={() => setEditando(p)}
              >
                <span className="nombre">
                  {p.nombre}
                  <span className="mini" style={{ display: 'block', fontWeight: 400 }}>
                    {p.receta.length} materiales en la receta
                    {!p.activa && ' · inactiva'}
                  </span>
                </span>
                <span className="precio">{fmtMoney(p.precioManoObraCents)}</span>
              </button>
            ))}
          </Acordeon>
        );
      })}

      {editando && <EditorPartida partida={editando} onCerrar={() => setEditando(null)} />}
    </>
  );
}

function EditorPartida({ partida, onCerrar }: { partida: Partida; onCerrar: () => void }) {
  const [borrador, setBorrador] = useState<Partida>(partida);
  const [precio, setPrecio] = useState(centsToInput(partida.precioManoObraCents));

  return (
    <Hoja titulo={partida.nombre || 'Nueva partida'} onCerrar={onCerrar}>
      <Campo etiqueta="Nombre">
        <input value={borrador.nombre} onChange={(e) => setBorrador({ ...borrador, nombre: e.target.value })} />
      </Campo>
      <Campo etiqueta="Descripción" ayuda="Opcional.">
        <textarea
          rows={2}
          value={borrador.descripcion ?? ''}
          onChange={(e) => setBorrador({ ...borrador, descripcion: e.target.value })}
        />
      </Campo>
      <div className="grid-2">
        <Campo etiqueta="Precio de mano de obra">
          <input value={precio} onChange={(e) => setPrecio(e.target.value)} inputMode="decimal" />
        </Campo>
        <Campo etiqueta="Unidad">
          <input value={borrador.unidad} onChange={(e) => setBorrador({ ...borrador, unidad: e.target.value })} />
        </Campo>
      </div>
      <Campo etiqueta="Categoría">
        <select
          value={borrador.categoria}
          onChange={(e) => setBorrador({ ...borrador, categoria: e.target.value as Partida['categoria'] })}
        >
          {CATEGORIAS.map((c) => (
            <option key={c.id} value={c.id}>
              {c.nombre}
            </option>
          ))}
        </select>
      </Campo>
      <label className="fila" style={{ gap: 10, marginBottom: 14 }}>
        <input
          type="checkbox"
          style={{ width: 22, height: 22, minHeight: 22, flex: '0 0 auto' }}
          checked={borrador.activa}
          onChange={(e) => setBorrador({ ...borrador, activa: e.target.checked })}
        />
        <span className="tenue">Mostrar al armar cotizaciones</span>
      </label>

      <p className="mini">
        El precio es solo mano de obra. Cambiarlo no afecta cotizaciones ya hechas: ahí quedó congelado.
      </p>

      <button
        type="button"
        className="btn primario"
        disabled={borrador.nombre.trim().length < 2}
        onClick={async () => {
          await guardarPartida({ ...borrador, precioManoObraCents: parseCents(precio) });
          onCerrar();
        }}
      >
        Guardar partida
      </button>
    </Hoja>
  );
}

// ------------------------------------------------------------------- materiales

function TabMateriales({ materiales }: { materiales: Material[] }) {
  const [editando, setEditando] = useState<Material | null>(null);
  const [busqueda, setBusqueda] = useState('');
  const q = busqueda.trim().toLowerCase();
  const lista = materiales.filter((m) => !q || m.nombre.toLowerCase().includes(q));

  return (
    <>
      <input
        type="search"
        value={busqueda}
        onChange={(e) => setBusqueda(e.target.value)}
        placeholder="Buscar material…"
        aria-label="Buscar material"
        style={{ marginBottom: 10 }}
      />
      <button
        type="button"
        className="btn"
        style={{ marginBottom: 12 }}
        onClick={() =>
          setEditando({
            id: nuevoId(),
            nombre: '',
            unidadMedida: 'u',
            unidadVenta: 'unidad',
            contenidoPorUnidadVentaMilli: 1000,
            holguraPct: 5,
            categoria: 'accesorios',
          })
        }
      >
        + Nuevo material
      </button>

      {lista.length === 0 && <Vacio titulo="Ningún material coincide" />}
      {lista.map((mat) => (
        <button key={mat.id} type="button" className="item-catalogo" onClick={() => setEditando(mat)}>
          <span className="nombre">
            {mat.nombre}
            <span className="mini" style={{ display: 'block', fontWeight: 400 }}>
              {mat.unidadVenta} · holgura {mat.holguraPct}%
            </span>
          </span>
          <span className="precio">
            {mat.precioRefCents !== undefined ? fmtMoney(mat.precioRefCents) : '—'}
          </span>
        </button>
      ))}

      {editando && <EditorMaterial material={editando} onCerrar={() => setEditando(null)} />}
    </>
  );
}

function EditorMaterial({ material, onCerrar }: { material: Material; onCerrar: () => void }) {
  const [borrador, setBorrador] = useState<Material>(material);
  const [precio, setPrecio] = useState(
    material.precioRefCents !== undefined ? centsToInput(material.precioRefCents) : '',
  );
  const [contenido, setContenido] = useState(fmtMilli(material.contenidoPorUnidadVentaMilli));

  return (
    <Hoja titulo={material.nombre || 'Nuevo material'} onCerrar={onCerrar}>
      <Campo etiqueta="Nombre">
        <input value={borrador.nombre} onChange={(e) => setBorrador({ ...borrador, nombre: e.target.value })} />
      </Campo>

      <div className="grid-2">
        <Campo etiqueta="Se mide en">
          <select
            value={borrador.unidadMedida}
            onChange={(e) =>
              setBorrador({ ...borrador, unidadMedida: e.target.value as Material['unidadMedida'] })
            }
          >
            <option value="m">Metros</option>
            <option value="u">Unidades</option>
          </select>
        </Campo>
        <Campo etiqueta="Holgura %">
          <input
            type="number"
            inputMode="numeric"
            min={0}
            max={100}
            value={borrador.holguraPct}
            onChange={(e) => setBorrador({ ...borrador, holguraPct: Number(e.target.value) || 0 })}
          />
        </Campo>
      </div>

      <Campo
        etiqueta="Como lo vende la distribuidora"
        ayuda="Lo que aparece en la lista de compra: rollo de 100 m, tubo de 3 m, bolsa de 100."
      >
        <input
          value={borrador.unidadVenta}
          onChange={(e) => setBorrador({ ...borrador, unidadVenta: e.target.value })}
        />
      </Campo>

      <Campo
        etiqueta={`Cuanto trae esa presentacion (en ${borrador.unidadMedida === 'm' ? 'metros' : 'unidades'})`}
        ayuda="Un rollo de 100 m trae 100. Una pieza suelta trae 1."
      >
        <input value={contenido} onChange={(e) => setContenido(e.target.value)} inputMode="decimal" />
      </Campo>

      <Campo etiqueta="Precio de referencia por presentación" ayuda="Opcional. Nunca suma al total de Grupo Fénix.">
        <input value={precio} onChange={(e) => setPrecio(e.target.value)} inputMode="decimal" placeholder="0.00" />
      </Campo>

      <button
        type="button"
        className="btn primario"
        disabled={borrador.nombre.trim().length < 2}
        onClick={async () => {
          await guardarMaterial({
            ...borrador,
            contenidoPorUnidadVentaMilli: Math.max(1, parseMilli(contenido)),
            precioRefCents: precio.trim() ? parseCents(precio) : undefined,
          });
          onCerrar();
        }}
      >
        Guardar material
      </button>
    </Hoja>
  );
}

// ---------------------------------------------------------------------- recetas

/**
 * Edicion de recetas. Es la pantalla que menos se usa y la menos pulida a
 * proposito: lo importante es que se pueda corregir lo que consume cada partida.
 */
function TabRecetas({ partidas, materiales }: { partidas: Partida[]; materiales: Material[] }) {
  const porId = new Map(materiales.map((m) => [m.id, m]));
  const [abierta, setAbierta] = useState<Partida | null>(null);

  return (
    <>
      <div className="aviso info">
        La receta dice que consume <strong>una unidad</strong> de la partida. De aqui sale la lista de
        compra, así que una receta corta manda al cliente a comprar de menos.
      </div>

      {partidas.map((p) => (
        <button key={p.id} type="button" className="item-catalogo" onClick={() => setAbierta(p)}>
          <span className="nombre">
            {p.nombre}
            <span className="mini" style={{ display: 'block', fontWeight: 400 }}>
              {p.receta.length === 0
                ? 'Sin receta'
                : p.receta
                    .map((l) => porId.get(l.materialId)?.nombre ?? '?')
                    .slice(0, 3)
                    .join(', ') + (p.receta.length > 3 ? '…' : '')}
            </span>
          </span>
          <span className="precio">{p.receta.length}</span>
        </button>
      ))}

      {abierta && (
        <EditorReceta
          partida={abierta}
          materiales={materiales}
          onCerrar={() => setAbierta(null)}
        />
      )}
    </>
  );
}

function EditorReceta({
  partida,
  materiales,
  onCerrar,
}: {
  partida: Partida;
  materiales: Material[];
  onCerrar: () => void;
}) {
  const [receta, setReceta] = useState(partida.receta.map((l) => ({ ...l })));
  const [nuevoMaterial, setNuevoMaterial] = useState('');
  const porId = new Map(materiales.map((m) => [m.id, m]));

  return (
    <Hoja titulo={`Receta: ${partida.nombre}`} onCerrar={onCerrar}>
      {receta.length === 0 && <p className="mini">Todavia no consume ningún material.</p>}

      {receta.map((linea, i) => {
        const mat = porId.get(linea.materialId);
        return (
          <div key={linea.materialId} className="renglon">
            <div className="desc">{mat?.nombre ?? 'Material eliminado'}</div>
            <div className="mini">
              se mide en {mat?.unidadMedida === 'm' ? 'metros' : 'unidades'}
            </div>
            <div className="fila" style={{ marginTop: 8, gap: 8 }}>
              <input
                value={fmtMilli(linea.cantidadMilli)}
                inputMode="decimal"
                aria-label={`Cantidad de ${mat?.nombre ?? 'material'}`}
                onChange={(e) => {
                  const copia = [...receta];
                  copia[i] = { ...linea, cantidadMilli: parseMilli(e.target.value) };
                  setReceta(copia);
                }}
              />
              <button
                type="button"
                className="btn chico peligro"
                onClick={() => setReceta(receta.filter((_, j) => j !== i))}
              >
                Quitar
              </button>
            </div>
          </div>
        );
      })}

      <Campo etiqueta="Agregar material">
        <select
          value={nuevoMaterial}
          onChange={(e) => {
            const id = e.target.value;
            setNuevoMaterial('');
            if (id && !receta.some((l) => l.materialId === id)) {
              setReceta([...receta, { materialId: id, cantidadMilli: 1000 }]);
            }
          }}
        >
          <option value="">— Elegir —</option>
          {materiales.map((m) => (
            <option key={m.id} value={m.id}>
              {m.nombre}
            </option>
          ))}
        </select>
      </Campo>

      <button
        type="button"
        className="btn primario"
        onClick={async () => {
          await guardarPartida({ ...partida, receta: receta.filter((l) => l.cantidadMilli > 0) });
          onCerrar();
        }}
      >
        Guardar receta
      </button>
    </Hoja>
  );
}
