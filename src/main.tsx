import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { registerSW } from 'virtual:pwa-register';
import App from './App';
import './styles/app.css';

// Service worker: precache del app shell para que abra sin conexion.
// Se registra cuando la app ya cargo y se asento: el precache baja ~1 MB y
// escribe en disco, y hacerlo en el mismo instante que arranca la app y se
// siembra el catalogo es lo que volvia lentos los primeros toques tras instalar.
function registrarCuandoSeAsiente() {
  const registrar = () => window.setTimeout(() => registerSW({ immediate: true }), 4000);
  if (document.readyState === 'complete') registrar();
  else window.addEventListener('load', registrar, { once: true });
}
registrarCuandoSeAsiente();

// Pide que el navegador no borre los datos (cotizaciones, catalogo) si el telefono
// anda corto de espacio. Si no lo concede, no pasa nada: la app sigue igual.
void navigator.storage?.persist?.().catch(() => {});

const base = import.meta.env.BASE_URL.replace(/\/$/, '');

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter basename={base || undefined}>
      <App />
    </BrowserRouter>
  </StrictMode>,
);
