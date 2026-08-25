import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { calcularTotales } from '../domain/cotizacion';
import { fmtMoney } from '../domain/money';
import { guardarCotizacion } from '../db/repo';
import { useCotizacion } from '../state/useCotizacion';
import { Barra, Campo, Cargando, Vacio } from '../components/ui';

export default function CotizacionCompacta() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { cot, cargando } = useCotizacion(id);
  const [alcances, setAlcances] = useState<string[] | null>(null);
  const [total, setTotal] = useState<string | null>(null);
  const [guardando, setGuardando] = useState(false);

  if (cargando) return <Cargando />;
  if (!cot || !id) return <Vacio titulo="Cotización no encontrada" />;
  const lista = alcances ?? cot.alcances ?? [];
  const valor = total ?? ((cot.totalCerradoCents ?? 0) / 100).toFixed(2);
  const totales = calcularTotales({ ...cot, modo: 'compacta', totalCerradoCents: Math.round((Number(valor) || 0) * 100) });

  async function revisar() {
    const limpios = lista.map((x) => x.trim()).filter(Boolean);
    const cents = Math.round((Number(valor) || 0) * 100);
    if (!limpios.length || cents <= 0 || guardando) return;
    setGuardando(true);
    try {
      await guardarCotizacion({ ...cot, id: id!, modo: 'compacta', alcances: limpios, totalCerradoCents: cents, renglones: [] });
      navigate('/cot/' + id + '/vista-previa');
    } finally {
      setGuardando(false);
    }
  }

  return (
    <>
      <Barra titulo="Precio cerrado" atras="/nueva" />
      <main className="contenido con-pie">
        <div className="aviso info">Para trabajos completos: describí lo que se hará y definí un único total. No se muestra lista de materiales.</div>
        <div className="tarjeta">
          <h3>Alcances del trabajo</h3>
          {lista.map((alcance, indice) => (
            <Campo key={indice} etiqueta={'Servicio ' + (indice + 1)}>
              <input value={alcance} onChange={(e) => setAlcances(lista.map((x, i) => i === indice ? e.target.value : x))} placeholder="Instalación de aire acondicionado" />
            </Campo>
          ))}
          <button type="button" className="btn" onClick={() => setAlcances([...lista, ''])}>+ Agregar servicio</button>
        </div>
        <div className="tarjeta">
          <Campo etiqueta="Total del proyecto" ayuda="Es el precio final que verá el cliente; ya incluye IVA si aplica.">
            <input value={valor} onChange={(e) => setTotal(e.target.value)} inputMode="decimal" />
          </Campo>
          <div className="linea-total"><span>IVA incluido</span><span>{fmtMoney(totales.ivaCents)}</span></div>
          <div className="linea-total grande"><span>TOTAL</span><span>{fmtMoney(totales.totalCents)}</span></div>
        </div>
      </main>
      <div className="pie"><div className="pie-inner"><button type="button" className="btn primario" disabled={!lista.some((x) => x.trim()) || (Number(valor) || 0) <= 0 || guardando} onClick={revisar}>Revisar cotización</button></div></div>
    </>
  );
}
