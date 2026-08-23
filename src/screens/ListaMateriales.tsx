import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  agregarMaterialExtra,
  ajustarMaterial,
  quitarMaterialExtra,
  guardarCotizacion,
} from '../db/repo';
import { fmtMilli } from '../domain/money';
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

  const extras = new Map(cot.materialesExtra.map((e) => [e.materialId ?? e.id, e]));

  return (
    <>
      <Barra
        titulo="Lista de materiales"
        subtitulo="La compra el cliente"
        atras={`/cot/${cot.id}`}
        accion={
          <button type="button" onClick={() => navigate(`/cot/${cot.id}/vista-previa`)}>
            Vista previa ›
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
          </div>
          <button type="button" className="btn primario" onClick={() => navigate(`/cot/${cot.id}/vista-previa`)}>
            Continuar
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
  catalogo: { id: string; nombre: string; unidadVenta: string }[];
  onGuardar: (datos: {
    materialId?: string;
    nombre: string;
    unidadVenta: string;
    unidadesVenta: number;
  }) => void;
}) {
  const [materialId, setMaterialId] = useState('');
  const [nombre, setNombre] = useState('');
  const [unidadVenta, setUnidadVenta] = useState('unidad');
  const [cantidad, setCantidad] = useState(1);

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
          })
        }
      >
        Agregar a la lista
      </button>
    </>
  );
}
