import { useMemo, useState } from 'react';

export interface OpcionBusqueda {
  id: string;
  nombre: string;
  /** Segunda linea: unidad de venta, categoria, lo que ayude a distinguir. */
  detalle?: string;
  deshabilitado?: boolean;
  /** Por que no se puede elegir. Se muestra en lugar del detalle. */
  razon?: string;
}

/**
 * Quita tildes y mayusculas para comparar.
 *
 * Veinte de los cincuenta y dos materiales del catalogo llevan tilde o enie,
 * y eso es a proposito: esos nombres terminan impresos en el PDF que el
 * cliente lleva a la distribuidora. Pero nadie va a escribir "termica" con
 * tilde en el teclado del telefono, asi que la busqueda las ignora.
 */
const normalizar = (s: string) =>
  s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();

/**
 * Ordena por que tan al principio pega lo que el usuario escribio, para que
 * mientras teclea la lista se vaya cerrando hacia lo exacto.
 *  0 = el nombre empieza con todo lo escrito
 *  1 = alguna palabra del nombre empieza con lo escrito
 *  2 = aparece en algun lado
 */
function puntaje(texto: string, consulta: string): number {
  if (texto.startsWith(consulta)) return 0;
  if (texto.split(/[\s(/,-]+/).some((palabra) => palabra.startsWith(consulta))) return 1;
  return 2;
}

/**
 * Filtra y ordena. Separada del componente para poder probarla contra el
 * catalogo real sin montar la interfaz.
 *
 * Acepta varias palabras en cualquier orden y exige que todas aparezcan:
 * "caja term" encuentra "Caja térmica de 8 espacios", y cada tecla nueva
 * cierra mas la lista.
 */
export function buscarOpciones(
  opciones: OpcionBusqueda[],
  consulta: string,
  maxResultados = 8,
): OpcionBusqueda[] {
  const escrito = normalizar(consulta.trim());
  const partes = escrito.split(/\s+/).filter(Boolean);
  if (partes.length === 0) return [];
  return opciones
    .map((o) => {
      const texto = normalizar(`${o.nombre} ${o.detalle ?? ''}`);
      return { o, texto, pegado: texto.replace(/\s+/g, '') };
    })
    .filter(({ texto, pegado }) =>
      partes.every(
        (parte) =>
          texto.includes(parte) ||
          // "minisplit" tiene que encontrar "mini split". Solo para palabras
          // largas: en las cortas, ignorar los espacios trae de todo.
          (parte.length >= 5 && pegado.includes(parte)),
      ),
    )
    .sort((a, b) => {
      const d = puntaje(a.texto, escrito) - puntaje(b.texto, escrito);
      return d !== 0 ? d : a.o.nombre.localeCompare(b.o.nombre, 'es');
    })
    .slice(0, maxResultados)
    .map(({ o }) => o);
}

/**
 * Busca escribiendo. Filtra a cada tecla.
 */
export function BuscadorMaterial({
  opciones,
  onElegir,
  marcador = 'Escribí para buscar…',
  maxResultados = 8,
}: {
  opciones: OpcionBusqueda[];
  onElegir: (id: string) => void;
  marcador?: string;
  maxResultados?: number;
}) {
  const [consulta, setConsulta] = useState('');

  const hayConsulta = consulta.trim().length > 0;
  const resultados = useMemo(
    () => buscarOpciones(opciones, consulta, maxResultados),
    [opciones, consulta, maxResultados],
  );

  return (
    <>
      <input
        value={consulta}
        onChange={(e) => setConsulta(e.target.value)}
        placeholder={marcador}
        aria-label="Buscar material"
        autoComplete="off"
      />

      {hayConsulta && resultados.length === 0 && (
        <p className="mini" style={{ marginTop: 8 }}>
          Ningún material coincide con «{consulta.trim()}».
        </p>
      )}

      {resultados.length > 0 && (
        <ul className="resultados-busqueda">
          {resultados.map((o) => (
            <li key={o.id}>
              <button
                type="button"
                className="resultado"
                disabled={o.deshabilitado}
                onClick={() => {
                  onElegir(o.id);
                  setConsulta('');
                }}
              >
                <span className="nombre">{o.nombre}</span>
                {(o.razon ?? o.detalle) && (
                  <span className="mini">{o.razon ?? o.detalle}</span>
                )}
              </button>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
