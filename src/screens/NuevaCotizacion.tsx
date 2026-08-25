import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLiveQuery } from 'dexie-react-hooks';
import { db, leerAjustes } from '../db/db';
import { crearCliente, crearCotizacion } from '../db/repo';
import type { ModoCotizacion, TipoObra } from '../domain/types';
import { Barra, Campo } from '../components/ui';

export default function NuevaCotizacion() {
  const navigate = useNavigate();
  const clientes = useLiveQuery(() => db.clientes.orderBy('nombre').toArray(), []);
  const ajustes = useLiveQuery(() => leerAjustes(), []);

  const [clienteId, setClienteId] = useState<string>('');
  const [nuevoNombre, setNuevoNombre] = useState('');
  const [nuevoTelefono, setNuevoTelefono] = useState('');
  const [nuevoTipo, setNuevoTipo] = useState<'casa' | 'empresa'>('casa');
  const [ubicacion, setUbicacion] = useState('');
  const [descripcion, setDescripcion] = useState('');
  const [tipoObra, setTipoObra] = useState<TipoObra>('nueva');
  const [modo, setModo] = useState<ModoCotizacion>('detallada');
  const [guardando, setGuardando] = useState(false);

  const creandoCliente = clienteId === '';
  const puedeSeguir = creandoCliente ? nuevoNombre.trim().length > 1 : true;

  async function comenzar() {
    if (!puedeSeguir || guardando) return;
    setGuardando(true);
    try {
      let id = clienteId;
      if (creandoCliente) {
        // Nombre y telefono bastan: parado en el sitio no hay tiempo para mas.
        const cliente = await crearCliente({
          nombre: nuevoNombre.trim(),
          telefono: nuevoTelefono.trim(),
          direccion: ubicacion.trim() || undefined,
          tipo: nuevoTipo,
        });
        id = cliente.id;
      }
      const cot = await crearCotizacion({
        clienteId: id,
        ubicacion: ubicacion.trim(),
        tipoObra,
        descripcionProyecto: descripcion.trim() || undefined,
        modo,
      });
      navigate(modo === 'compacta' ? '/cot/' + cot.id + '/compacta' : '/cot/' + cot.id, { replace: true });
    } finally {
      setGuardando(false);
    }
  }

  return (
    <>
      <Barra titulo="Nueva cotización" atras="/" />
      <main className="contenido con-pie">
        <div className="tarjeta">
          <Campo etiqueta="Cliente">
            <select value={clienteId} onChange={(e) => setClienteId(e.target.value)}>
              <option value="">+ Cliente nuevo</option>
              {clientes?.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.nombre}
                </option>
              ))}
            </select>
          </Campo>

          {creandoCliente && (
            <>
              <Campo etiqueta="Nombre">
                <input
                  value={nuevoNombre}
                  onChange={(e) => setNuevoNombre(e.target.value)}
                  placeholder="Don Francisco Alvarado"
                  autoComplete="name"
                />
              </Campo>
              <Campo etiqueta="Teléfono">
                <input
                  value={nuevoTelefono}
                  onChange={(e) => setNuevoTelefono(e.target.value)}
                  placeholder="7845-2210"
                  inputMode="tel"
                  autoComplete="tel"
                />
              </Campo>
              <div className="chips" role="group" aria-label="Tipo de cliente">
                {(['casa', 'empresa'] as const).map((t) => (
                  <button
                    key={t}
                    type="button"
                    className="chip"
                    aria-pressed={nuevoTipo === t}
                    onClick={() => setNuevoTipo(t)}
                  >
                    {t === 'casa' ? 'Casa' : 'Empresa'}
                  </button>
                ))}
              </div>
            </>
          )}
        </div>

        <div className="tarjeta">
          <Campo etiqueta="Ubicación del trabajo">
            <input
              value={ubicacion}
              onChange={(e) => setUbicacion(e.target.value)}
              placeholder="Col. Escalon, calle 3, casa 22"
            />
          </Campo>
          <Campo etiqueta="Descripción del proyecto" ayuda="Opcional. Aparece en el PDF.">
            <textarea
              value={descripcion}
              onChange={(e) => setDescripcion(e.target.value)}
              placeholder="Instalación eléctrica de ampliacion: dormitorio y baño."
            />
          </Campo>
        </div>


        <div className="tarjeta">
          <h3>Tipo de cotización</h3>
          <div className="columna">
            <button type="button" className="item-catalogo" style={modo === 'compacta' ? { borderColor: 'var(--acento)', background: '#fffbeb' } : undefined} onClick={() => setModo('compacta')}>
              <span className="nombre">Precio cerrado<span className="mini" style={{ display: 'block', fontWeight: 400 }}>Describe los alcances y muestra un único total. Sin materiales.</span></span>
            </button>
            <button type="button" className="item-catalogo" style={modo === 'detallada' ? { borderColor: 'var(--acento)', background: '#fffbeb' } : undefined} onClick={() => setModo('detallada')}>
              <span className="nombre">Mano de obra + materiales<span className="mini" style={{ display: 'block', fontWeight: 400 }}>Usa catálogo, recetas y lista de compra.</span></span>
            </button>
          </div>
        </div>

        {modo === 'detallada' && <div className="tarjeta">
          <h3>Tipo de obra</h3>
          <p className="mini" style={{ marginBottom: 10 }}>
            Ajusta la mano de obra. No cambia las cantidades de material.
          </p>
          <div className="columna">
            {ajustes?.tiposObra.map((t) => {
              const pct = Math.round(t.multiplicadorBps / 100 - 100);
              return (
                <button
                  key={t.id}
                  type="button"
                  className="item-catalogo"
                  style={
                    tipoObra === t.id
                      ? { borderColor: 'var(--acento)', background: '#fffbeb' }
                      : undefined
                  }
                  onClick={() => setTipoObra(t.id)}
                >
                  <span className="nombre">
                    {t.nombre}
                    <span className="mini" style={{ display: 'block', fontWeight: 400 }}>
                      {t.descripcion}
                    </span>
                  </span>
                  <span className="precio">{pct === 0 ? 'base' : `+${pct}%`}</span>
                </button>
              );
            })}
          </div>
        </div>}
      </main>

      <div className="pie">
        <div className="pie-inner">
          <button type="button" className="btn primario" disabled={!puedeSeguir || guardando} onClick={comenzar}>
            Empezar a cotizar
          </button>
        </div>
      </div>
    </>
  );
}
