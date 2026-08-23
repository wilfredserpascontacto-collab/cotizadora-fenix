import { Link, useNavigate } from 'react-router-dom';
import { useLiveQuery } from 'dexie-react-hooks';
import { db, leerBorradorActivo, leerPerfil } from '../db/db';
import { calcularTotales } from '../domain/cotizacion';
import { fmtMoney } from '../domain/money';
import { Barra } from '../components/ui';

export default function Inicio() {
  const navigate = useNavigate();

  const perfil = useLiveQuery(() => leerPerfil(), []);
  const borrador = useLiveQuery(async () => {
    const id = await leerBorradorActivo();
    if (!id) return null;
    const cot = await db.cotizaciones.get(id);
    if (!cot || cot.numero !== null) return null;
    const cliente = await db.clientes.get(cot.clienteId);
    return { cot, cliente };
  }, []);

  const conteos = useLiveQuery(async () => {
    const [partidas, cotizaciones, enviadas] = await Promise.all([
      db.partidas.count(),
      db.cotizaciones.count(),
      db.cotizaciones.where('estado').equals('enviada').count(),
    ]);
    return { partidas, cotizaciones, enviadas };
  }, []);

  return (
    <>
      <Barra
        logo={perfil?.logoDataUrl}
        titulo={perfil?.nombre || 'Cotizadora'}
        subtitulo="Cotizar en el sitio y enviar antes de irse"
      />
      <main className="contenido">
        {borrador && (
          <div className="tarjeta bloque-servicio">
            <span className="etiqueta aviso">Cotización sin terminar</span>
            <h3 style={{ marginTop: 10 }}>{borrador.cliente?.nombre ?? 'Cliente sin nombre'}</h3>
            <p className="mini">
              {borrador.cot.renglones.length} partida
              {borrador.cot.renglones.length === 1 ? '' : 's'} ·{' '}
              {fmtMoney(calcularTotales(borrador.cot).totalCents)}
            </p>
            <button
              type="button"
              className="btn primario"
              onClick={() => navigate(`/cot/${borrador.cot.id}`)}
            >
              Seguir donde la dejé
            </button>
          </div>
        )}

        <button
          type="button"
          className="btn oscuro"
          style={{ minHeight: 72, fontSize: 18, marginBottom: 14 }}
          onClick={() => navigate('/nueva')}
        >
          + Nueva cotización
        </button>

        <div className="grid-2" style={{ marginBottom: 12 }}>
          <Link className="btn" to="/historial">
            Historial
          </Link>
          <Link className="btn" to="/catalogos">
            Catálogos
          </Link>
          <Link className="btn" to="/ajustes">
            Ajustes
          </Link>
          <Link className="btn" to="/instalar">
            Instalar app
          </Link>
        </div>

        {conteos && (
          <p className="mini" style={{ textAlign: 'center' }}>
            {conteos.partidas} partidas en catálogo · {conteos.cotizaciones} cotizaciones ·{' '}
            {conteos.enviadas} enviadas
          </p>
        )}

        <div className="aviso info" style={{ marginTop: 16 }}>
          Francisco cobra <strong>mano de obra</strong>. Los materiales van en una lista aparte que
          el cliente compra en la distribuidora, y nunca suman a su total.
        </div>
      </main>
    </>
  );
}
