import { Link, useNavigate } from 'react-router-dom';
import { useLiveQuery } from 'dexie-react-hooks';
import { db, leerPerfil } from '../db/db';
import {
  ETIQUETA_ESTADO,
  calcularTotales,
  estadoVisible,
  fechaVencimiento,
  fmtFecha,
  formatearNumero,
} from '../domain/cotizacion';
import { fmtMoney } from '../domain/money';
import { Barra } from '../components/ui';
import { BotonMantener } from '../components/BotonMantener';

const UN_DIA_MS = 24 * 60 * 60 * 1000;
/** Cuantos dias antes del vencimiento se considera "por vencer" y se destaca. */
const DIAS_AVISO_VENCIMIENTO = 3;

export default function Inicio() {
  const navigate = useNavigate();

  const perfil = useLiveQuery(() => leerPerfil(), []);

  const conteos = useLiveQuery(async () => {
    const [partidas, cotizaciones, enviadas] = await Promise.all([
      db.partidas.count(),
      db.cotizaciones.count(),
      db.cotizaciones.where('estado').equals('enviada').count(),
    ]);
    return { partidas, cotizaciones, enviadas };
  }, []);

  /**
   * Actividad reciente para la pantalla de inicio: las ultimas cotizaciones
   * tocadas, pero las que estan por vencer se adelantan al frente aunque no
   * sean las mas recientes. Asi el aviso de dar seguimiento no se entierra.
   */
  const actividad = useLiveQuery(async () => {
    const cotizaciones = await db.cotizaciones.orderBy('modificadaEn').reverse().toArray();
    const clientes = await db.clientes.toArray();
    const porCliente = new Map(clientes.map((c) => [c.id, c]));
    const ahora = Date.now();

    const conDatos = cotizaciones.map((cot) => {
      const estado = estadoVisible(cot);
      const vence = fechaVencimiento(cot);
      const diasParaVencer =
        estado === 'enviada' && vence ? Math.ceil((vence - ahora) / UN_DIA_MS) : null;
      return {
        cot,
        cliente: cot.clienteSnapshot ?? porCliente.get(cot.clienteId),
        estado,
        diasParaVencer,
        porVencer: diasParaVencer !== null && diasParaVencer <= DIAS_AVISO_VENCIMIENTO,
      };
    });

    const urgentes = conDatos
      .filter((x) => x.porVencer)
      .sort((a, b) => (a.diasParaVencer ?? 0) - (b.diasParaVencer ?? 0));
    const idsUrgentes = new Set(urgentes.map((x) => x.cot.id));
    const resto = conDatos.filter((x) => !idsUrgentes.has(x.cot.id));

    return [...urgentes, ...resto].slice(0, 4);
  }, []);

  return (
    <>
      <Barra
        logo={perfil?.logoDataUrl}
        titulo={perfil?.nombre || 'Cotizadora'}
        subtitulo="Cotizar en el sitio y enviar antes de irse"
      />
      <main className="contenido">

        <div style={{ marginBottom: 14 }}>
          <BotonMantener
            etiqueta="+ Nueva cotización"
            duracionMs={1000}
            className="grande"
            onCompletar={() => navigate('/nueva')}
          />
        </div>

        <div className="grid-2" style={{ marginBottom: 12 }}>
          <Link className="btn" to="/historial">
            Historial
          </Link>
          <Link className="btn" to="/catalogos">
            Catálogos
          </Link>
          <Link className="btn" to="/ayuda">
            Ayuda
          </Link>
          <Link className="btn" to="/ajustes">
            Ajustes
          </Link>
        </div>

        {conteos && (
          <p className="mini" style={{ textAlign: 'center' }}>
            {conteos.partidas} partidas en catálogo · {conteos.cotizaciones} cotizaciones ·{' '}
            {conteos.enviadas} enviadas
          </p>
        )}

        {actividad && actividad.length > 0 && (
          <>
            <h2>Últimas cotizaciones</h2>
            {actividad.map(({ cot, cliente, estado, porVencer, diasParaVencer }) => (
              <article
                key={cot.id}
                className="renglon"
                style={{ cursor: 'pointer' }}
                onClick={() => navigate(`/cot/${cot.id}/resumen`)}
              >
                <div className="cabeza">
                  <div style={{ flex: 1 }}>
                    <div className="desc">{cliente?.nombre ?? 'Cliente eliminado'}</div>
                    <div className="mini">
                      {formatearNumero(cot.numero, perfil?.prefijoCorrelativo ?? '')} ·{' '}
                      {fmtFecha(cot.emitidaEn ?? cot.creadaEn)}
                    </div>
                    <div style={{ marginTop: 6 }}>
                      <span
                        className={`etiqueta ${
                          estado === 'aceptada' ? 'ok' : estado === 'rechazada' || estado === 'vencida' ? 'peligro' : ''
                        }`}
                      >
                        {ETIQUETA_ESTADO[estado]}
                      </span>
                      {porVencer && (
                        <span className="etiqueta aviso" style={{ marginLeft: 6 }}>
                          {diasParaVencer! <= 0
                            ? 'Vence hoy'
                            : diasParaVencer === 1
                              ? 'Vence mañana'
                              : `Vence en ${diasParaVencer} días`}
                        </span>
                      )}
                    </div>
                  </div>
                  <strong style={{ whiteSpace: 'nowrap' }}>{fmtMoney(calcularTotales(cot).totalCents)}</strong>
                </div>
              </article>
            ))}
            <Link className="btn chico fantasma" to="/historial" style={{ width: '100%' }}>
              Ver todo el historial ›
            </Link>
          </>
        )}
      </main>
    </>
  );
}
