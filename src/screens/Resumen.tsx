import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useLiveQuery } from 'dexie-react-hooks';
import { leerAjustes, leerPerfil, proximoCorrelativo } from '../db/db';
import { emitirCotizacion, guardarCotizacion } from '../db/repo';
import { anticipoCents, calcularTotales, formatearNumero } from '../domain/cotizacion';
import { fmtMoney } from '../domain/money';
import { IVA_BPS } from '../domain/types';
import { useCotizacion, useAviso } from '../state/useCotizacion';
import { listaDeMateriales, useMateriales } from '../state/useMateriales';
import { generarCotizacionPdf } from '../pdf/cotizacionPdf';
import { generarMaterialesPdf } from '../pdf/materialesPdf';
import { nombreArchivo } from '../pdf/comun';
import { abrirPdf, enviarPdfs, textoResumen, type ArchivoPdf } from '../share/enviar';
import { Barra, Campo, Cargando, Hoja, Vacio } from '../components/ui';

export default function Resumen() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { cot, cliente, cargando } = useCotizacion(id);
  const { filas, catalogo } = useMateriales(cot);
  const perfil = useLiveQuery(() => leerPerfil(), []);
  const ajustes = useLiveQuery(() => leerAjustes(), []);
  const siguienteNumero = useLiveQuery(() => proximoCorrelativo(), []);

  const [enviando, setEnviando] = useState(false);
  const [hoja, setHoja] = useState(false);
  const [incluye, setIncluye] = useState({ servicio: true, materiales: true });
  const [aviso, setAviso] = useAviso();

  if (cargando || !cot || !filas || !catalogo || !perfil || !ajustes) {
    return cargando ? <Cargando /> : <Vacio titulo="Cotización no encontrada" />;
  }

  const totales = calcularTotales(cot);
  const tipoObra = ajustes.tiposObra.find((t) => t.id === cot.tipoObra);
  const pctObra = tipoObra ? Math.round(tipoObra.multiplicadorBps / 100 - 100) : 0;

  /** Construye los PDF pedidos. Emite la cotizacion si aun no tenia numero. */
  async function construir(): Promise<{ archivos: ArchivoPdf[]; texto: string }> {
    const emitida = await emitirCotizacion(cot!);
    // Se recalcula con los materiales ya congelados por la emision.
    const filasFinales = listaDeMateriales(emitida, catalogo!);
    const archivos: ArchivoPdf[] = [];

    if (incluye.servicio) {
      archivos.push({
        nombre: nombreArchivo(emitida, perfil!, 'cotizacion'),
        blob: generarCotizacionPdf(emitida, perfil!, cliente, tipoObra?.nombre ?? 'tipo de obra'),
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

  async function enviar() {
    if (enviando) return;
    setEnviando(true);
    try {
      const { archivos, texto } = await construir();
      const resultado = await enviarPdfs(archivos, texto, (cot!.clienteSnapshot ?? cliente)?.telefono);
      setHoja(false);
      if (resultado === 'descargado') setAviso('Se descargaron los PDF y se abrio WhatsApp.');
      if (resultado === 'compartido') setAviso('Enviado.');
    } catch (e) {
      console.error(e);
      setAviso('No se pudo generar el PDF. Intenta de nuevo.');
    } finally {
      setEnviando(false);
    }
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
              blob: generarCotizacionPdf(emitida, perfil!, cliente, tipoObra?.nombre ?? 'tipo de obra'),
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
        titulo="Resumen"
        subtitulo={formatearNumero(cot.numero, perfil.prefijoCorrelativo)}
        atras={`/cot/${cot.id}/materiales`}
      />

      <main className="contenido con-pie">
        {aviso && <div className="aviso info">{aviso}</div>}

        {/* Bloque 1: lo que cobra Francisco. */}
        <div className="tarjeta bloque-servicio">
          <span className="etiqueta servicio">Lo que cobra {perfil.nombre || 'Grupo Fénix'}</span>
          <h3 style={{ marginTop: 10 }}>Mano de obra e instalación</h3>

          <ul className="lista-limpia" style={{ margin: '10px 0' }}>
            {cot.renglones.map((r) => (
              <li key={r.id} className="linea-total">
                <span className="etq">
                  {r.cantidad} × {r.descripcion}
                </span>
                <span>{fmtMoney(r.precioManoObraCents * r.cantidad)}</span>
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
              <span className="etq">IVA {IVA_BPS / 100}%</span>
              <span>{fmtMoney(totales.ivaCents)}</span>
            </div>
            <div className="linea-total grande">
              <span>TOTAL</span>
              <span>{fmtMoney(totales.totalCents)}</span>
            </div>
            {perfil.anticipoPct > 0 && (
              <p className="mini" style={{ marginTop: 6 }}>
                Anticipo del {perfil.anticipoPct}%: {fmtMoney(anticipoCents(totales, perfil.anticipoPct))}
              </p>
            )}
          </div>
        </div>

        {/* Bloque 2: lo que el cliente compra. Separado a proposito. */}
        <div className="tarjeta bloque-material">
          <span className="etiqueta material">Lo que compra el cliente</span>
          <h3 style={{ marginTop: 10 }}>Materiales en la distribuidora</h3>
          <p className="mini">
            {filas.length} material{filas.length === 1 ? '' : 'es'}. No entra en el total de arriba.
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
            disabled={cot.renglones.length === 0 || enviando}
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
              onChange={(e) => setIncluye((v) => ({ ...v, servicio: e.target.checked }))}
            />
            <span className="nombre">
              Cotización de servicio
              <span className="mini" style={{ display: 'block', fontWeight: 400 }}>
                {fmtMoney(totales.totalCents)} con IVA
              </span>
            </span>
          </label>
          <label className="item-catalogo" style={{ cursor: 'pointer' }}>
            <input
              type="checkbox"
              style={{ width: 24, height: 24, minHeight: 24, flex: '0 0 auto' }}
              checked={incluye.materiales}
              onChange={(e) => setIncluye((v) => ({ ...v, materiales: e.target.checked }))}
            />
            <span className="nombre">
              Lista de materiales
              <span className="mini" style={{ display: 'block', fontWeight: 400 }}>
                {filas.length} materiales para la distribuidora
              </span>
            </span>
          </label>

          {cot.numero === null && (
            <p className="mini" style={{ marginTop: 10 }}>
              Al enviar se le asigna el numero{' '}
              <strong>{formatearNumero(siguienteNumero ?? null, perfil.prefijoCorrelativo)}</strong> y la
              cotización queda en el historial.
            </p>
          )}

          <button
            type="button"
            className="btn primario"
            style={{ marginTop: 12 }}
            disabled={(!incluye.servicio && !incluye.materiales) || enviando}
            onClick={() => void enviar()}
          >
            {enviando ? 'Generando…' : 'Enviar por WhatsApp'}
          </button>
          <p className="mini" style={{ marginTop: 10, marginBottom: 0 }}>
            Si el teléfono no deja compartir archivos, se descargan los PDF y se abre el chat para que
            los adjunte.
          </p>
        </Hoja>
      )}
    </>
  );
}
