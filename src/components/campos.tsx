import { useEffect, useRef, useState } from 'react';
import type { InputHTMLAttributes, TextareaHTMLAttributes } from 'react';

/**
 * Campos que se guardan solos, sin estorbar mientras se escribe.
 *
 * El problema que resuelven: si el `value` de un campo sale directo de
 * IndexedDB y cada tecla dispara una escritura, cada letra hace un viaje de
 * ida y vuelta por la base antes de volver a la pantalla. En una computadora
 * no se nota. En un telefono barato el viaje tarda mas que la siguiente tecla,
 * y React repinta el campo con el texto viejo: las letras se pierden o salen
 * barajadas. Escribiendo "Grupo Fenix Servicios Generales" en un navegador
 * frenado a la velocidad de un telefono de gama baja salia, literalmente,
 * "Guxevco Geels". Eso es lo que Francisco reportaba como "a veces no me deja
 * escribir".
 *
 * Aqui lo que se ve en pantalla es estado local: responde a la tecla en el
 * acto, sin esperar a nadie. La base se escribe un momento despues, cuando la
 * persona hace una pausa, cuando sale del campo, o cuando deja la pantalla.
 * Se sigue guardando solo, como siempre; lo unico que cambio es que ya no hay
 * que esperar al disco entre tecla y tecla.
 */
function useBorrador(guardado: string, guardar: (texto: string) => void, esperaMs: number) {
  const [texto, setTexto] = useState(guardado);
  // Lo escrito que todavia no llega a la base. En null cuando no hay nada
  // pendiente, que no es lo mismo que pendiente con la cadena vacia: borrar un
  // campo entero tambien hay que guardarlo.
  const pendiente = useRef<string | null>(null);
  const reloj = useRef<ReturnType<typeof setTimeout> | null>(null);
  const guardarRef = useRef(guardar);
  guardarRef.current = guardar;

  useEffect(() => {
    // Un cambio que viene de afuera (termino de cargar el perfil, se restauro
    // un respaldo) se adopta. Lo que la persona escribio y aun no se guarda
    // manda sobre lo que traiga la base: nunca se le borra lo tecleado.
    if (pendiente.current === null) setTexto(guardado);
  }, [guardado]);

  const volcar = useRef(() => {
    if (reloj.current) {
      clearTimeout(reloj.current);
      reloj.current = null;
    }
    const v = pendiente.current;
    if (v === null) return;
    pendiente.current = null;
    guardarRef.current(v);
  }).current;

  // Al dejar la pantalla se guarda lo que quede sin volcar.
  useEffect(() => volcar, [volcar]);

  function escribir(v: string) {
    setTexto(v);
    pendiente.current = v;
    if (reloj.current) clearTimeout(reloj.current);
    reloj.current = setTimeout(volcar, esperaMs);
  }

  return { texto, escribir, volcar };
}

type Comun = { guardar: (valor: string) => void; esperaMs?: number };

type PropsTexto = Omit<InputHTMLAttributes<HTMLInputElement>, 'value' | 'onChange' | 'onBlur'> &
  Comun & { valor: string };

/** Un input de texto normal, pero que no pierde letras. */
export function CampoTexto({ valor, guardar, esperaMs = 400, ...resto }: PropsTexto) {
  const { texto, escribir, volcar } = useBorrador(valor, guardar, esperaMs);
  return (
    <input {...resto} value={texto} onChange={(e) => escribir(e.target.value)} onBlur={volcar} />
  );
}

type PropsArea = Omit<TextareaHTMLAttributes<HTMLTextAreaElement>, 'value' | 'onChange' | 'onBlur'> &
  Comun & { valor: string };

/** Lo mismo para los textos largos: condiciones, notas, garantia. */
export function AreaTexto({ valor, guardar, esperaMs = 400, ...resto }: PropsArea) {
  const { texto, escribir, volcar } = useBorrador(valor, guardar, esperaMs);
  return (
    <textarea {...resto} value={texto} onChange={(e) => escribir(e.target.value)} onBlur={volcar} />
  );
}

type PropsNumero = Omit<InputHTMLAttributes<HTMLInputElement>, 'value' | 'onChange' | 'onBlur'> & {
  valor: number;
  guardar: (valor: number) => void;
  /** Si se omite, no se recorta por abajo: hay porcentajes que pueden ser negativos. */
  minimo?: number;
  maximo?: number;
  /** Que guardar si el campo queda vacio. Por defecto, el minimo, o cero. */
  siVacio?: number;
  esperaMs?: number;
};

/**
 * Para los numeros sueltos: dias de validez, porcentajes de holgura.
 *
 * Mientras se escribe, el campo puede quedar vacio. Antes no podia: al borrar
 * el 1 para escribir 15, el campo se rellenaba solo con un 0 o un 1 y habia
 * que pelearse con el. Ahora se guarda un numero valido recien al hacer una
 * pausa o al soltar el campo, y si quedo vacio se vuelve al valor de respaldo.
 */
export function CampoNumero({
  valor,
  guardar,
  minimo,
  maximo,
  siVacio,
  esperaMs = 600,
  ...resto
}: PropsNumero) {
  const { texto, escribir, volcar } = useBorrador(
    String(valor),
    (t) => {
      const n = Number(t);
      if (t.trim() === '' || !Number.isFinite(n)) return guardar(siVacio ?? minimo ?? 0);
      let v = n;
      if (minimo !== undefined) v = Math.max(minimo, v);
      if (maximo !== undefined) v = Math.min(maximo, v);
      guardar(v);
    },
    esperaMs,
  );
  return (
    <input
      type="number"
      inputMode="numeric"
      {...resto}
      value={texto}
      onChange={(e) => escribir(e.target.value)}
      onBlur={volcar}
    />
  );
}
