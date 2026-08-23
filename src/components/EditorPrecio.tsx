import { useState } from 'react';
import { centsToInput, fmtMoney, parseCents } from '../domain/money';
import type { RenglonInstalacion } from '../domain/types';
import { Campo, Hoja } from './ui';

/** Edita el precio de mano de obra de UN renglon. El catalogo no se toca. */
export function EditorPrecio({
  renglon,
  onCerrar,
  onGuardar,
}: {
  renglon: RenglonInstalacion;
  onCerrar: () => void;
  onGuardar: (cents: number) => void;
}) {
  const [texto, setTexto] = useState(centsToInput(renglon.precioManoObraCents));
  const cents = parseCents(texto);
  return (
    <Hoja titulo={renglon.descripcion} onCerrar={onCerrar}>
      <Campo
        etiqueta={`Precio de mano de obra por ${renglon.unidad}`}
        ayuda="Solo cambia esta cotización. El catálogo queda igual."
      >
        <input
          value={texto}
          onChange={(e) => setTexto(e.target.value)}
          inputMode="decimal"
          autoFocus
          style={{ fontSize: 22, fontWeight: 700 }}
        />
      </Campo>
      <p className="mini">
        {renglon.cantidad} x {fmtMoney(cents)} = <strong>{fmtMoney(cents * renglon.cantidad)}</strong>
      </p>
      <button type="button" className="btn primario" onClick={() => onGuardar(cents)}>
        Guardar precio
      </button>
    </Hoja>
  );
}
