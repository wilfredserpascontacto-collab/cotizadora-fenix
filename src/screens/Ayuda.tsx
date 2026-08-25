import { useState } from 'react';
import { Barra } from '../components/ui';

type Seccion = {
  titulo: string;
  pasos: string[];
};

const SECCIONES: Seccion[] = [
  {
    titulo: 'Crear servicios o partidas',
    pasos: [
      'Abrí Catálogos desde Inicio y quedate en la pestaña Partidas.',
      'Tocá + Nueva partida, escribí el nombre, el precio de mano de obra y la unidad.',
      'Guardá la partida. Ya aparecerá al crear una nueva cotización.',
    ],
  },
  {
    titulo: 'Agregar materiales',
    pasos: [
      'En Catálogos, abrí la pestaña Materiales.',
      'Agregá cada material con su unidad y precio de compra.',
      'Estos materiales estarán disponibles para crear recetas.',
    ],
  },
  {
    titulo: 'Crear o editar recetas',
    pasos: [
      'En Catálogos, abrí la pestaña Recetas y elegí la partida.',
      'Agregá los materiales y la cantidad que consume una unidad del servicio.',
      'Guardá la receta. La lista de materiales se calcula automáticamente al cotizar.',
    ],
  },
  {
    titulo: 'Preparar una cotización',
    pasos: [
      'Mantené presionado + Nueva cotización desde Inicio.',
      'Elegí el cliente, agregá las partidas y definí sus cantidades.',
      'Revisá el resumen, generá el PDF y compartilo antes de salir del sitio.',
    ],
  },
];

export default function Ayuda() {
  const [abierta, setAbierta] = useState(0);

  return (
    <>
      <Barra titulo="Ayuda rápida" atras="/" />
      <main className="contenido">
        <div className="aviso info">
          Configurá primero tu catálogo; después cotizar es sólo elegir los servicios y sus cantidades.
        </div>

        {SECCIONES.map((seccion, indice) => {
          const activa = abierta === indice;
          return (
            <section className="tarjeta" key={seccion.titulo} style={{ marginBottom: 12 }}>
              <button
                type="button"
                className="btn"
                style={{ width: '100%', textAlign: 'left' }}
                aria-expanded={activa}
                onClick={() => setAbierta(activa ? -1 : indice)}
              >
                {activa ? '− ' : '+ '}{seccion.titulo}
              </button>
              {activa && (
                <ol className="tenue" style={{ paddingLeft: 20, margin: '14px 0 0' }}>
                  {seccion.pasos.map((paso) => <li key={paso} style={{ marginBottom: 8 }}>{paso}</li>)}
                </ol>
              )}
            </section>
          );
        })}
      </main>
    </>
  );
}
