import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useLiveQuery } from 'dexie-react-hooks';
import { leerAjustes, leerPerfil, proximoCorrelativo } from '../db/db';
import { actualizarRenglon, emitirCotizacion, guardarCotizacion } from '../db/repo';
import { calcularTotales, desglosePago, fmtFecha, formatearNumero } from '../domain/cotizacion';
import { fmtMoney } from '../domain/money';
import { IVA_BPS, type RenglonInstalacion } from '../domain/types';
import { useCotizacion, useAviso } from '../state/useCotizacion';
import { listaDeMateriales, useMateriales } from '../state/useMateriales';
import { esFaltante } from '../domain/materiales';
import { generarCotizacionPdf } from '../pdf/cotizacionPdf';
import { generarMaterialesPdf } from '../pdf/materialesPdf';
import { nombreArchivo } from '../pdf/comun';
import { abrirPdf, enviarPdfs, textoResumen, type ArchivoPdf } from '../share/enviar';
import { Barra, Campo, Cargando, Hoja, Vacio } from '../components/ui';
import { EditorPrecio } from '../components/EditorPrecio';

export default function Resumen() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { cot, cliente, cargando } = useCotizacion(id);
  const { filas, catalogo } = useMateriales(cot);
  const perfil = useLiveQuery(() => leerPerfil(), []);
  const ajustes = useLiveQuery(() => leerAjustes(), []);
  const siguienteNumero = useLiveQuery(() => proximoCorrelativo(), []);

  const [enviando, setEnviando] = useState(false);
  /**
   * PDF ya generados, esperando el toque que los comparte.
   *
   * Van en dos pasos por obligacion del navegador, no por gusto: compartir
   * exige una interaccion del usuario reciente, y armar los dos PDF tarda mas
   * de lo que dura esa ventana. Generando primero, el segundo toque llama a
   * compartir sin nada en medio y el gesto sigue fresco.
   */
  const [listos, setListos] = useState<{ archivos: ArchivoPdf[]; texto: string } | null>(null);
  /** Plan B: no se pudo compartir, quedan los PDF descargados y el chat a mano. */
  const [respaldo, setRespaldo] = useState<{ motivo: string; url: string } | null>(null);
  const [hoja, setHoja] = useState(false);
  const [incluye, setIncluye] = useState({ servicio: true, materiales: true });
  const [editandoPrecio, setEditandoPrecio] = useState<RenglonInstalacion | null>(null);
  const [aviso, setAviso] = useAviso();

  if (cargando || !cot || !filas || !catalogo || !perfil || !ajustes) {
    return cargando ? <Cargando /> : <Vacio titulo="Cotización no encontrada" />;
  }

  // Los materiales faltantes no se pueden comprar: no cuentan en los conteos
  // que ve Francisco ni salen en el PDF.
  const comprables = filas.filter((f) => !esFaltante(f));
  const faltantes = filas.filter(esFaltante);

  const totales = calcularTotales(cot);
  const tipoObra = ajustes.tiposObra.find((t) => t.id === cot.tipoObra);
  const pctObra = tipoObra ? Math.round(tipoObra.multiplicadorBps / 100 - 100) : 0;
  const formaPago = ajustes.formasPago.find((f) => f.id === cot.formaPagoId) ?? ajustes.formasPago[0];
  const cuotas = desglosePago(totales, formaPago);

  /** Construye los PDF pedidos. Emite la cotizacion si aun no tenia numero. */
  async function construir(): Promise<{ archivos: ArchivoPdf[]; texto: string }> {
    const emitida = await emitirCotizacion(cot!);
    // Se recalcula con los materiales ya congelados por la emision.
    const filasFinales = listaDeMateriales(emitida, catalogo!);
    const archivos: ArchivoPdf[] = [];

    if (incluye.servicio) {
      archivos.push({
        nombre: nombreArchivo(emitida, perfil!, 'cotizacion'),
        blob: generarCotizacionPdf(emitida, perfil!, cliente, tipoObra?.nombre ?? 'tipo de obra', formaPago),
      });
    }
    if (incluye.materiales) {
      archivos.push({
        nombre: nombreArchivo(emitida, perfil!, 'materiales'),
        blob: generarMaterialesPdf(emitida, perfil!, cliente, filasFinales),
      });
    }
    const texto = textoResumen(emitida, perfil!, cliente, calcularTotales(emitida), incluye.materiales);
    return { archivos, texto };
  }

  /** Paso 1: emite el correlativo y arma los PDF. Puede tardar unos segundos. */
  async function generar() {
    if (enviando) return;
    setEnviando(true);
    setRespaldo(null);
    try {
      setListos(await construir());
    } catch (e) {
      console.error(e);
      setAviso('No se pudo generar el PDF. Intenta de nuevo.');
    } finally {
      setEnviando(false);
    }
  }

  /**
   * Paso 2: comparte. No es async a proposito y no espera nada antes de
   * llamar a enviarPdfs: la llamada a navigator.share tiene que salir dentro
   * del mismo toque o el navegador la rechaza con NotAllowedError.
   */
  function compartir() {
    if (!listos) return;
    setRespaldo(null);
    void enviarPdfs(listos.archivos, listos.texto, (cot!.clienteSnapshot ?? cliente)?.telefono)
      .then((r) => {
        if (r.estado === 'compartido') {
          setHoja(false);
          setListos(null);
          setAviso('Enviado.');
        } else if (r.estado === 'descargado') {
          // La hoja queda abierta a proposito: ahi vive el boton de WhatsApp.
          setRespaldo({ motivo: r.motivo, url: r.urlWhatsApp });
        }
      })
      .catch((e) => {
        console.error(e);
        setAviso('No se pudo compartir. Intenta de nuevo.');
      });
  }

  /** Cambiar que se manda invalida lo ya generado. */
  function alternarIncluye(cual: 'servicio' | 'materiales', valor: boolean) {
    setIncluye((v) => ({ ...v, [cual]: valor }));
    setListos(null);
    setRespaldo(null);
  }

  async function verPdf(cual: 'servicio' | 'materiales') {
    setEnviando(true);
    try {
      const emitida = await emitirCotizacion(cot!);
      const filasFinales = listaDeMateriales(emitida, catalogo!);
      abrirPdf(
        cual === 'servicio'
          ? {
              nombre: nombreArchivo(emitida, perfil!, 'cotizacion'),
              blob: generarCotizacionPdf(emitida, perfil!, cliente, tipoObra?.nombre ?? 'tipo de obra', formaPago),
            }
          : {
              nombre: nombreArchivo(emitida, perfil!, 'materiales'),
              blob: generarMaterialesPdf(emitida, perfil!, cliente, filasFinales),
            },
      );
    } finally {
      setEnviando(false);
    }
  }

  return (
    <>
      <Barra
        titulo="Revisión de cotización"
        subtitulo={formatearNumero(cot.numero, perfil.prefijoCorrelativo)}
        atras={`/cot/${cot.id}/firma`}
      />

      <main className="contenido con-pie">
        {aviso && <div className="aviso info">{aviso}</div>}

        {faltantes.length > 0 && (
          <div className="aviso peligro">
            <strong>La lista de materiales está incompleta.</strong> Hay {faltantes.length} material
            {faltantes.length === 1 ? '' : 'es'} que alguna partida pide y ya no están en el
            catálogo, así que no salen en el PDF y el cliente compraría de menos. Revisalos en
            Catálogos antes de enviar.
          </div>
        )}

        {/* Bloque 1: lo que cobra Francisco. */}
        <div className="tarjeta bloque-servicio">
          <span className="etiqueta servicio">Lo que cobra {perfil.nombre || 'Grupo Phoenix'}</span>
          <h3 style={{ marginTop: 10 }}>Mano de obra e instalación</h3>

          <ul className="lista-limpia" style={{ margin: '10px 0' }}>
            {cot.renglones.map((r) => (
              <li key={r.id} className="linea-total">
                <span className="etq">
                  {r.cantidad} × {r.descripcion}
                </span>
                <span className="fila" style={{ gap: 8 }}>
                  {fmtMoney(r.precioManoObraCents * r.cantidad)}
                  <button
                    type="button"
                    className="btn chico fantasma"
                    style={{ padding: '2px 6px', minHeight: 0 }}
                    onClick={() => setEditandoPrecio(r)}
                  >
                    Precio
                  </button>
                </span>
              </li>
            ))}
          </ul>

          <div style={{ borderTop: '1px solid var(--borde)', paddingTop: 8 }}>
            <div className="linea-total">
              <span className="etq">Mano de obra</span>
              <span>{fmtMoney(totales.manoObraCents)}</span>
            </div>
            {totales.ajusteObraCents !== 0 && (
              <div className="linea-total">
                <span className="etq">
                  {tipoObra?.nombre} (+{pctObra}%)
                </span>
                <span>{fmtMoney(totales.ajusteObraCents)}</span>
              </div>
            )}
            <div className="linea-total">
              <span className="etq">Subtotal</span>
              <span>{fmtMoney(totales.subtotalCents)}</span>
            </div>
            <div className="linea-total">
              <span className="etq">
                {cot.aplicaIva !== false ? `IVA ${IVA_BPS / 100}%` : 'IVA (cliente exento)'}
                {' · '}
                <button
                  type="button"
                  className="btn chico fantasma"
                  style={{ padding: 0, minHeight: 0, textDecoration: 'underline' }}
                  onClick={() => void guardarCotizacion({ ...cot, aplicaIva: cot.aplicaIva === false })}
                >
                  {cot.aplicaIva !== false ? 'quitar IVA' : 'agregar IVA'}
                </button>
              </span>
              <span>{fmtMoney(totales.ivaCents)}</span>
            </div>
            <div className="linea-total grande">
              <span>TOTAL</span>
              <span>{fmtMoney(totales.totalCents)}</span>
            </div>
          </div>

          <div style={{ marginTop: 14, borderTop: '1px solid var(--borde)', paddingTop: 10 }}>
            <span className="mini" style={{ fontWeight: 600 }}>Forma de pago</span>
            <div className="chips" role="group" aria-label="Forma de pago" style={{ marginTop: 6 }}>
              {ajustes.formasPago.map((f) => (
                <button
                  key={f.id}
                  type="button"
                  className="chip"
                  aria-pressed={cot.formaPagoId === f.id}
                  onClick={() => void guardarCotizacion({ ...cot, formaPagoId: f.id })}
                >
                  {f.nombre}
                </button>
              ))}
            </div>
            {cuotas.length > 1 && (
              <ul className="lista-limpia" style={{ marginTop: 8 }}>
                {cuotas.map((c) => (
                  <li key={c.etiqueta} className="linea-total">
                    <span className="etq">
                      {c.etiqueta} ({c.pct}%)
                    </span>
                    <span>{fmtMoney(c.montoCents)}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>

        {/* Bloque 2: lo que el cliente compra. Separado a proposito. */}
        <div className="tarjeta bloque-material">
          <span className="etiqueta material">Lo que compra el cliente</span>
          <h3 style={{ marginTop: 10 }}>Materiales en la distribuidora</h3>
          <p className="mini">
            {comprables.length} material{comprables.length === 1 ? '' : 'es'}. No entra en el total de arriba.
          </p>
          <button
            type="button"
            className="btn chico"
            style={{ marginTop: 10 }}
            onClick={() => navigate(`/cot/${cot.id}/materiales`)}
          >
            Revisar la lista
          </button>
        </div>

        {/* Bloque 3: la firma que va a quedar puesta en el PDF. */}
        <div className="tarjeta">
          <h3>Firma del cliente</h3>
          {cot.firmaClienteDataUrl ? (
            <>
              <img src={cot.firmaClienteDataUrl} alt="Firma del cliente" className="miniatura-firma" />
              <p className="mini" style={{ marginTop: 8 }}>
                {cot.firmadaEn ? `Firmada el ${fmtFecha(cot.firmadaEn)}.` : 'Firmada.'} Así va a salir en el
                PDF de cotización.
              </p>
              <button
                type="button"
                className="btn chico"
                style={{ marginTop: 4 }}
                onClick={() => navigate(`/cot/${cot.id}/firma`)}
              >
                Volver a firmar
              </button>
            </>
          ) : (
            <>
              <p className="mini">Todavía no hay firma. Se puede enviar igual sin ella.</p>
              <button
                type="button"
                className="btn chico"
                onClick={() => navigate(`/cot/${cot.id}/firma`)}
              >
                Firmar ahora
              </button>
            </>
          )}
        </div>

        {ajustes.clausulas.length > 0 && (
          <div className="tarjeta">
            <h3>Cláusulas</h3>
            <p className="mini" style={{ marginBottom: 10 }}>
              Las marcadas se agregan al PDF de esta cotización.
            </p>
            {ajustes.clausulas.map((cl) => {
              // ?? []: una cotizacion armada antes de que existiera este campo no lo trae.
              const seleccionadas = cot.clausulasSeleccionadas ?? [];
              const marcada = seleccionadas.includes(cl.id);
              return (
                <label key={cl.id} className="item-catalogo" style={{ cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    style={{ width: 22, height: 22, minHeight: 22, flex: '0 0 auto' }}
                    checked={marcada}
                    onChange={(e) =>
                      void guardarCotizacion({
                        ...cot,
                        clausulasSeleccionadas: e.target.checked
                          ? [...seleccionadas, cl.id]
                          : seleccionadas.filter((id) => id !== cl.id),
                      })
                    }
                  />
                  <span className="nombre" style={{ fontWeight: 400 }}>{cl.texto}</span>
                </label>
              );
            })}
          </div>
        )}

        <div className="tarjeta">
          <h3>Condiciones</h3>
          <Campo etiqueta="Texto que sale en el PDF">
            <textarea
              value={cot.condiciones}
              onChange={(e) => void guardarCotizacion({ ...cot, condiciones: e.target.value })}
              rows={5}
            />
          </Campo>
          <Campo etiqueta="Notas" ayuda="Opcional.">
            <textarea
              value={cot.notas ?? ''}
              onChange={(e) => void guardarCotizacion({ ...cot, notas: e.target.value })}
              rows={2}
            />
          </Campo>
          <Campo etiqueta="Días de validez">
            <input
              type="number"
              inputMode="numeric"
              min={1}
              value={cot.diasValidez}
              onChange={(e) =>
                void guardarCotizacion({ ...cot, diasValidez: Math.max(1, Number(e.target.value) || 1) })
              }
            />
          </Campo>
        </div>

        <div className="grid-2">
          <button type="button" className="btn" disabled={enviando} onClick={() => void verPdf('servicio')}>
            Ver cotización
          </button>
          <button type="button" className="btn" disabled={enviando} onClick={() => void verPdf('materiales')}>
            Ver materiales
          </button>
        </div>
      </main>

      <div className="pie">
        <div className="pie-inner">
          <div className="total-flotante">
            <span className="tenue">
              Total a cobrar
              <span className="mini" style={{ display: 'block' }}>
                + material que compra el cliente aparte
              </span>
            </span>
            <span className="cifra">{fmtMoney(totales.totalCents)}</span>
          </div>
          <button
            type="button"
            className="btn primario"
            disabled={
              enviando ||
              (cot.modo === 'compacta'
                ? !(cot.totalCerradoCents && cot.totalCerradoCents > 0)
                : cot.renglones.length === 0)
            }
            onClick={() => setHoja(true)}
          >
            {enviando ? 'Generando…' : 'Generar y enviar'}
          </button>
        </div>
      </div>

      {hoja && (
        <Hoja titulo="Qué le mando al cliente" onCerrar={() => setHoja(false)}>
          <label className="item-catalogo" style={{ cursor: 'pointer' }}>
            <input
              type="checkbox"
              style={{ width: 24, height: 24, minHeight: 24, flex: '0 0 auto' }}
              checked={incluye.servicio}
              onChange={(e) => alternarIncluye('servicio', e.target.checked)}
            />
            <span className="nombre">
              Cotización de servicio
              <span className="mini" style={{ display: 'block', fontWeight: 400 }}>
                {fmtMoney(totales.totalCents)} {cot.aplicaIva !== false ? 'con IVA' : 'sin IVA'}
              </span>
            </span>
          </label>
          <label className="item-catalogo" style={{ cursor: 'pointer' }}>
            <input
              type="checkbox"
              style={{ width: 24, height: 24, minHeight: 24, flex: '0 0 auto' }}
              checked={incluye.materiales}
              onChange={(e) => alternarIncluye('materiales', e.target.checked)}
            />
            <span className="nombre">
              Lista de materiales
              <span className="mini" style={{ display: 'block', fontWeight: 400 }}>
                {comprables.length} materiales para la distribuidora
              </span>
            </span>
          </label>

          {cot.numero === null && !listos && (
            <p className="mini" style={{ marginTop: 10 }}>
              Al generar se le asigna el numero{' '}
              <strong>{formatearNumero(siguienteNumero ?? null, perfil.prefijoCorrelativo)}</strong> y la
              cotización queda en el historial.
            </p>
          )}

          {!listos ? (
            <>
              <div style={{ marginTop: 12 }}>
                <button
                  type="button"
                  className="btn primario"
                  style={{ width: '100%' }}
                  disabled={enviando || (!incluye.servicio && !incluye.materiales)}
                  onClick={() => void generar()}
                >
                  {enviando ? 'Generando…' : 'Generar los PDF'}
                </button>
              </div>
              <p className="mini" style={{ marginTop: 10, marginBottom: 0 }}>
                Primero se arman los archivos; después los mandás. Son dos toques porque el
                navegador sólo deja compartir en el momento justo en que tocás.
              </p>
            </>
          ) : (
            <>
              <p className="mini" style={{ marginTop: 12, marginBottom: 0 }}>
                {listos.archivos.length === 1 ? 'Archivo listo' : `${listos.archivos.length} archivos listos`}.
              </p>
              <div style={{ marginTop: 8 }}>
                {/* Sin nada en medio: navigator.share sale del propio toque. */}
                <button
                  type="button"
                  className="btn primario"
                  style={{ width: '100%' }}
                  onClick={compartir}
                >
                  Enviar por WhatsApp
                </button>
              </div>

              {respaldo && (
                <div className="aviso info" style={{ marginTop: 12 }}>
                  <p style={{ marginTop: 0 }}>
                    {respaldo.motivo} Los PDF quedaron descargados: abrí el chat y adjuntalos desde
                    el clip.
                  </p>
                  <a
                    className="btn primario"
                    style={{ width: '100%' }}
                    href={respaldo.url}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    Abrir el chat de WhatsApp
                  </a>
                </div>
              )}
            </>
          )}
        </Hoja>
      )}

      {editandoPrecio && (
        <EditorPrecio
          renglon={editandoPrecio}
          onCerrar={() => setEditandoPrecio(null)}
          onGuardar={async (cents) => {
            await actualizarRenglon(cot, editandoPrecio.id, {
              precioManoObraCents: cents,
              precioEditado: cents !== editandoPrecio.precioManoObraCents || editandoPrecio.precioEditado,
            });
            setEditandoPrecio(null);
          }}
        />
      )}
    </>
  );
}
