import { useEffect, useState } from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import { sembrarSiHaceFalta } from './db/db';
import { Cargando, EstadoConexion } from './components/ui';
import Inicio from './screens/Inicio';
import NuevaCotizacion from './screens/NuevaCotizacion';
import ArmarCotizacion from './screens/ArmarCotizacion';
import ListaMateriales from './screens/ListaMateriales';
import VistaPrevia from './screens/VistaPrevia';
import Firma from './screens/Firma';
import Resumen from './screens/Resumen';
import Historial from './screens/Historial';
import Catalogos from './screens/Catalogos';
import Ajustes from './screens/Ajustes';
import ComoInstalar from './screens/ComoInstalar';
import Ayuda from './screens/Ayuda';
import CotizacionCompacta from './screens/CotizacionCompacta';

export default function App() {
  const [listo, setListo] = useState(false);

  useEffect(() => {
    sembrarSiHaceFalta()
      .catch((e) => console.error('No se pudo sembrar el catalogo', e))
      .finally(() => setListo(true));
  }, []);

  if (!listo) return <Cargando />;

  return (
    <div className="app">
      <EstadoConexion />
      <Routes>
        <Route path="/" element={<Inicio />} />
        <Route path="/nueva" element={<NuevaCotizacion />} />
        <Route path="/cot/:id" element={<ArmarCotizacion />} />
        <Route path="/cot/:id/compacta" element={<CotizacionCompacta />} />
        <Route path="/cot/:id/materiales" element={<ListaMateriales />} />
        <Route path="/cot/:id/vista-previa" element={<VistaPrevia />} />
        <Route path="/cot/:id/firma" element={<Firma />} />
        <Route path="/cot/:id/resumen" element={<Resumen />} />
        <Route path="/historial" element={<Historial />} />
        <Route path="/catalogos" element={<Catalogos />} />
        <Route path="/ajustes" element={<Ajustes />} />
        <Route path="/instalar" element={<ComoInstalar />} />
        <Route path="/ayuda" element={<Ayuda />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </div>
  );
}
