import { useNavigate, useParams } from 'react-router-dom';
import { useLiveQuery } from 'dexie-react-hooks';
import { leerAjustes } from '../db/db';
import { calcularTotales } from '../domain/cotizacion';
import { fmtMoney } from '../domain/money';
import { IVA_BPS } from '../domain/types';
import { useCotizacion } from '../state/useCotizacion';
import { useMateriales } from '../state/useMateriales';
import { Barra, Cargando, Vacio } from '../components/ui';

/**
 * Vista de solo lectura: lo que el cliente va a ver antes de firmar.
 * Nada de editar precio, IVA o condiciones aqui — eso es trabajo de
 * Francisco en Resumen, despues de la firma.
 */
export default function VistaPrevia() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { cot, cargando } = useCotizacion(id);
  const { filas } = useMateriales(cot);
  const ajustes = useLiveQuery(() => leerAjustes(), []);

  if (cargando || !cot || !filas || !ajustes) {
    return cargando ? <Cargando /> : <Vacio titulo="Cotización no encontrada" />;
  }

  const totales = calcularTotales(cot);
  const tipoObra = ajustes.tiposObra.find((t) => t.id === cot.tipoObra);
  const pctObra = tipoObra ? Math.round(tipoObra.multiplicadorBps / 100 - 100) : 0;

  return (
    <>
      <Barra titulo="Vista previa" atras={`/cot/${cot.id}/materiales`} />

      <main className="contenido con-pie">
        <div className="tarjeta bloque-servicio">
          <span className="etiqueta servicio">Mano de obra e instalación</span>
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
              <span className="etq">{cot.aplicaIva !== false ? `IVA ${IVA_BPS / 100}%` : 'IVA (exento)'}</span>
              <span>{fmtMoney(totales.ivaCents)}</span>
            </div>
            <div className="linea-total grande">
              <span>TOTAL</span>
              <span>{fmtMoney(totales.totalCents)}</span>
            </div>
          </div>
        </div>

        <div className="tarjeta bloque-material">
          <span className="etiqueta material">Materiales</span>
          <p className="mini" style={{ marginTop: 10 }}>
            {filas.length} material{filas.length === 1 ? '' : 'es'} para comprar en la distribuidora.
            No entra en el total de arriba.
          </p>
        </div>
      </main>

      <div className="pie">
        <div className="pie-inner">
          <button
            type="button"
            className="btn primario"
            onClick={() => navigate(`/cot/${cot.id}/firma`)}
          >
            Continuar a firma
          </button>
        </div>
      </div>
    </>
  );
}
