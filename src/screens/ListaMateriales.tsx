import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  agregarMaterialExtra,
  ajustarMaterial,
  quitarMaterialExtra,
  guardarCotizacion,
} from '../db/repo';
import { estimadoIncompleto, estimadoMateriales } from '../domain/materiales';
import { centsToInput, fmtMilli, fmtMoney, parseCents } from '../domain/money';
import { useCotizacion } from '../state/useCotizacion';
import { useMateriales } from '../state/useMateriales';
import { Barra, Campo, Cargando, Contador, Hoja, Vacio } from '../components/ui';

export default function ListaMateriales() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { cot, cargando } = useCotizacion(id);
  const { filas, catalogo } = useMateriales(cot);
  const [agregando, setAgregando] = useState(false);
  const [detalle, setDetalle] = useState<string | null>(null);

  if (cargando || !cot || !filas || !catalogo) return cargando ? <Cargando /> : <Vacio titulo="Cotización no encontrada" />;

  const estimado = estimadoMateriales(filas);
  const incompleto = estimadoIncompleto(filas);
  const extras = new Map(cot.materialesExtra.map((e) => [e.materialId ?? e.id, e]));

  return (
    <>
      <Barra
        titulo="Lista de materiales"
        subtitulo="La compra el cliente"
        atras={`/cot/${cot.id}`}
        accion={
          <button type="button" onClick={() => navigate(`/cot/${cot.id}/resumen`)}>
            Resumen ›
          </button>
        }
      />

      <main className="contenido con-pie">
        <div className="aviso material">
          Esto <strong>no se le cobra al cliente</strong>: es lo que tiene que ir a comprar a la
          distribuidora. Las cantidades ya traen desperdicio y están redondeadas a como se vende.
        </div>

        {filas.length === 0 && (
          <Vacio
            titulo="Todavia no hay materiales"
            detalle="Agregá partidas de instalación y la lista se arma sola."
          />
        )}

        {filas.map((f) => {
          const extra = f.fuente === 'manual' ? extras.get(f.materialId) : undefined;
          return (
            <article key={f.materialId} className="renglon">
              <div className="cabeza">
                <div style={{ flex: 1 }}>
                  <div className="desc">{f.nombre}</div>
                  <div className="mini">
                    {f.unidadVenta}
                    {f.fuente !== 'manual' && (
                      <>
                        {' · '}
                        <button
                          type="button"
                          className="btn chico fantasma"
                          style={{ padding: 0, minHeight: 0, textDecoration: 'underline' }}
                          onClick={() => setDetalle(detalle === f.materialId ? null : f.materialId)}
                        >
                          de dónde sale
                        </button>
                      </>
                    )}
                  </div>
                  <div style={{ marginTop: 6 }}>
                    {f.fuente === 'calculado' && <span className="etiqueta">Calculado</span>}
                    {f.fuente === 'ajustado' && <span className="etiqueta aviso">Ajustado a mano</span>}
                    {f.fuente === 'manual' && <span className="etiqueta material">Agregado a mano</span>}
                  </div>
                </div>
                {f.precioRefCents !== undefined && (
                  <span className="mini" style={{ whiteSpace: 'nowrap' }}>
                    ~{fmtMoney(f.estimadoCents)}
                  </span>
                )}
              </div>

              {detalle === f.materialId && (
                <div className="aviso info" style={{ marginTop: 10, marginBottom: 0 }}>
                  Consumo de las partidas: {fmtMilli(f.brutoMilli)} {f.unidadMedida === 'm' ? 'm' : 'u'}.
                  Con {f.holguraPct}% de desperdicio: {fmtMilli(f.conHolguraMilli)}. Redondeado hacia
                  arriba: {f.unidadesCalculadas} {f.unidadVenta}.
                  {f.fuente === 'ajustado' && (
                    <> Vos lo dejaste en {f.unidadesVenta}.</>
                  )}
                  {f.origenes.length > 0 && <> Viene de: {f.origenes.join(', ')}.</>}
                </div>
              )}

              <div className="pie-renglon">
                <Contador
                  valor={f.unidadesVenta}
                  min={0}
                  onCambio={(d) => {
                    const nuevo = Math.max(0, f.unidadesVenta + d);
                    if (extra) {
                      void guardarCotizacion({
                        ...cot,
                        materialesExtra: cot.materialesExtra.map((e) =>
                          e.id === extra.id ? { ...e, unidadesVenta: nuevo } : e,
                        ),
                      });
                    } else {
                      void ajustarMaterial(cot, {
                        materialId: f.materialId,
                        unidadesVenta: nuevo === f.unidadesCalculadas ? undefined : nuevo,
                      });
                    }
                  }}
                />
                <div className="fila">
                  {f.fuente === 'ajustado' && (
                    <button
                      type="button"
                      className="btn chico"
                      onClick={() => void ajustarMaterial(cot, { materialId: f.materialId })}
                    >
                      Recalcular
                    </button>
                  )}
                  <button
                    type="button"
                    className="btn chico peligro"
                    onClick={() => {
                      if (extra) void quitarMaterialExtra(cot, extra.id);
                      else void ajustarMaterial(cot, { materialId: f.materialId, eliminado: true });
                    }}
                  >
                    {extra ? 'Quitar' : 'Ya lo tiene'}
                  </button>
                </div>
              </div>
            </article>
          );
        })}

        {cot.ajustesMateriales.some((a) => a.eliminado) && (
          <button
            type="button"
            className="btn chico"
            style={{ width: '100%', marginTop: 4 }}
            onClick={() =>
              void guardarCotizacion({
                ...cot,
                ajustesMateriales: cot.ajustesMateriales.filter((a) => !a.eliminado),
              })
            }
          >
            Devolver los materiales quitados
          </button>
        )}

        <button
          type="button"
          className="btn"
          style={{ marginTop: 12 }}
          onClick={() => setAgregando(true)}
        >
          + Agregar un material suelto
        </button>

        <div className="tarjeta bloque-material" style={{ marginTop: 16 }}>
          <div className="fila entre">
            <div>
              <strong>Estimado en la distribuidora</strong>
              <div className="mini">Precios de referencia. No es un cobro de Grupo Fénix.</div>
            </div>
            <strong style={{ fontSize: 20 }}>{fmtMoney(estimado)}</strong>
          </div>
          {incompleto && (
            <p className="mini" style={{ marginTop: 8, marginBottom: 0 }}>
              Algún material no tiene precio de referencia, así que el estimado se queda corto.
            </p>
          )}
          <label className="fila" style={{ marginTop: 12, gap: 10 }}>
            <input
              type="checkbox"
              style={{ width: 22, height: 22, minHeight: 22, flex: '0 0 auto' }}
              checked={cot.mostrarPreciosMateriales}
              onChange={(e) =>
                void guardarCotizacion({ ...cot, mostrarPreciosMateriales: e.target.checked })
              }
            />
            <span className="tenue">Mostrar la columna de precios en el PDF del cliente</span>
          </label>
        </div>
      </main>

      <div className="pie">
        <div className="pie-inner">
          <div className="total-flotante">
            <span className="tenue">
              {filas.length} material{filas.length === 1 ? '' : 'es'} a comprar
              <span className="mini" style={{ display: 'block' }}>
                no suma al total de Grupo Fénix
              </span>
            </span>
            <span className="cifra" style={{ color: 'var(--material)' }}>
              ~{fmtMoney(estimado)}
            </span>
          </div>
          <button type="button" className="btn primario" onClick={() => navigate(`/cot/${cot.id}/resumen`)}>
            Ir al resumen
          </button>
        </div>
      </div>

      {agregando && (
        <Hoja titulo="Material suelto" onCerrar={() => setAgregando(false)}>
          <FormularioExtra
            catalogo={catalogo}
            onGuardar={async (datos) => {
              await agregarMaterialExtra(cot, datos);
              setAgregando(false);
            }}
          />
        </Hoja>
      )}
    </>
  );
}

function FormularioExtra({
  catalogo,
  onGuardar,
}: {
  catalogo: { id: string; nombre: string; unidadVenta: string; precioRefCents?: number }[];
  onGuardar: (datos: {
    materialId?: string;
    nombre: string;
    unidadVenta: string;
    unidadesVenta: number;
    precioRefCents?: number;
  }) => void;
}) {
  const [materialId, setMaterialId] = useState('');
  const [nombre, setNombre] = useState('');
  const [unidadVenta, setUnidadVenta] = useState('unidad');
  const [cantidad, setCantidad] = useState(1);
  const [precio, setPrecio] = useState('');

  const delCatalogo = catalogo.find((m) => m.id === materialId);
  const nombreFinal = delCatalogo?.nombre ?? nombre.trim();
  const valido = nombreFinal.length > 1 && cantidad > 0;

  return (
    <>
      <Campo etiqueta="Material del catálogo">
        <select
          value={materialId}
          onChange={(e) => {
            setMaterialId(e.target.value);
            const m = catalogo.find((x) => x.id === e.target.value);
            if (m) {
              setUnidadVenta(m.unidadVenta);
              setPrecio(m.precioRefCents !== undefined ? centsToInput(m.precioRefCents) : '');
            }
          }}
        >
          <option value="">— Otro material —</option>
          {catalogo.map((m) => (
            <option key={m.id} value={m.id}>
              {m.nombre}
            </option>
          ))}
        </select>
      </Campo>

      {!delCatalogo && (
        <>
          <Campo etiqueta="Nombre">
            <input value={nombre} onChange={(e) => setNombre(e.target.value)} placeholder="Sellador para tubería" />
          </Campo>
          <Campo etiqueta="Unidad de venta">
            <input value={unidadVenta} onChange={(e) => setUnidadVenta(e.target.value)} placeholder="bote" />
          </Campo>
        </>
      )}

      <Campo etiqueta="Cantidad a comprar">
        <Contador valor={cantidad} min={1} onCambio={(d) => setCantidad((c) => Math.max(1, c + d))} />
      </Campo>

      <Campo etiqueta="Precio de referencia" ayuda="Opcional. Nunca suma al total de Grupo Fénix.">
        <input value={precio} onChange={(e) => setPrecio(e.target.value)} inputMode="decimal" placeholder="0.00" />
      </Campo>

      <button
        type="button"
        className="btn primario"
        disabled={!valido}
        onClick={() =>
          onGuardar({
            materialId: delCatalogo?.id,
            nombre: nombreFinal,
            unidadVenta: delCatalogo?.unidadVenta ?? unidadVenta,
            unidadesVenta: cantidad,
            precioRefCents: precio.trim() ? parseCents(precio) : undefined,
          })
        }
      >
        Agregar a la lista
      </button>
    </>
  );
}
