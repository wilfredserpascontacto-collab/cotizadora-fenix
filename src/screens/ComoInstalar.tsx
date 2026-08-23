import { useEffect, useState } from 'react';
import { Barra } from '../components/ui';

interface EventoInstalacion extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

/** Instrucciones de instalacion, distintas en Android y en iPhone. */
export default function ComoInstalar() {
  const [evento, setEvento] = useState<EventoInstalacion | null>(null);
  const [instalada, setInstalada] = useState(false);

  useEffect(() => {
    setInstalada(window.matchMedia('(display-mode: standalone)').matches);
    const capturar = (e: Event) => {
      e.preventDefault();
      setEvento(e as EventoInstalacion);
    };
    window.addEventListener('beforeinstallprompt', capturar);
    return () => window.removeEventListener('beforeinstallprompt', capturar);
  }, []);

  const esIOS = /iphone|ipad|ipod/i.test(navigator.userAgent);
  const seguro = window.isSecureContext;

  return (
    <>
      <Barra titulo="Instalar en el teléfono" atras="/" />
      <main className="contenido">
        {instalada && (
          <div className="aviso info">Ya está instalada: la estás usando desde la pantalla de inicio.</div>
        )}

        {!seguro && (
          <div className="aviso">
            Esta página no se esta sirviendo por HTTPS. Sin un origen seguro el teléfono no deja
            instalar la app ni guardar el modo sin conexión. Abrila desde su dirección con candado.
          </div>
        )}

        {evento && !instalada && (
          <button
            type="button"
            className="btn primario"
            style={{ marginBottom: 16 }}
            onClick={async () => {
              await evento.prompt();
              const { outcome } = await evento.userChoice;
              if (outcome === 'accepted') setInstalada(true);
              setEvento(null);
            }}
          >
            Instalar ahora
          </button>
        )}

        <div className="tarjeta">
          <h3>{esIOS ? 'En este iPhone' : 'En Android (Chrome)'}</h3>
          {esIOS ? (
            <ol className="tenue" style={{ paddingLeft: 20, margin: 0 }}>
              <li>Abrí esta página en Safari (no en Chrome ni dentro de WhatsApp).</li>
              <li>Tocá el botón de compartir, el cuadrito con la flecha hacia arriba.</li>
              <li>Deslizá y elegí «Agregar a inicio».</li>
              <li>Toca «Agregar». El icono queda en la pantalla de inicio.</li>
            </ol>
          ) : (
            <ol className="tenue" style={{ paddingLeft: 20, margin: 0 }}>
              <li>Abrí esta página en Chrome.</li>
              <li>Tocá los tres puntos de arriba a la derecha.</li>
              <li>Elegí «Instalar app» o «Agregar a pantalla principal».</li>
              <li>Confirmá. El icono queda junto a tus otras apps.</li>
            </ol>
          )}
        </div>

        <div className="tarjeta">
          <h3>{esIOS ? 'En Android (Chrome)' : 'En iPhone (Safari)'}</h3>
          {esIOS ? (
            <ol className="tenue" style={{ paddingLeft: 20, margin: 0 }}>
              <li>Abrí esta página en Chrome.</li>
              <li>Tocá los tres puntos y elegi «Instalar app».</li>
            </ol>
          ) : (
            <ol className="tenue" style={{ paddingLeft: 20, margin: 0 }}>
              <li>Abrí esta página en Safari.</li>
              <li>Tocá compartir y luego «Agregar a inicio».</li>
            </ol>
          )}
        </div>

        <div className="aviso info">
          Una vez instalada funciona sin señal: el catálogo, las cotizaciones y los PDF se arman en el
          teléfono. Lo unico que necesita internet es mandar el mensaje por WhatsApp.
        </div>
      </main>
    </>
  );
}
