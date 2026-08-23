import { useRef } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import {
  db,
  exportarRespaldo,
  guardarAjustes,
  guardarPerfil,
  importarRespaldo,
  leerAjustes,
  leerPerfil,
} from '../db/db';
import type { Ajustes as AjustesTipo, PerfilEmpresa } from '../domain/types';
import { useAviso } from '../state/useCotizacion';
import { Barra, Campo, Cargando } from '../components/ui';

export default function Ajustes() {
  const perfil = useLiveQuery(() => leerPerfil(), []);
  const ajustes = useLiveQuery(() => leerAjustes(), []);
  const [aviso, setAviso] = useAviso();
  const archivoRef = useRef<HTMLInputElement>(null);

  if (!perfil || !ajustes) return <Cargando />;

  const set = (cambios: Partial<PerfilEmpresa>) => void guardarPerfil({ ...perfil, ...cambios });
  const setAj = (cambios: Partial<AjustesTipo>) => void guardarAjustes({ ...ajustes, ...cambios });

  async function cargarLogo(archivo: File) {
    try {
      const dataUrl = await reducirImagen(archivo, 320);
      set({ logoDataUrl: dataUrl });
      setAviso('Logo actualizado.');
    } catch {
      setAviso('No se pudo leer esa imagen.');
    }
  }

  async function exportar() {
    const respaldo = await exportarRespaldo();
    const blob = new Blob([JSON.stringify(respaldo, null, 2)], { type: 'application/json' });
    const fecha = new Date().toISOString().slice(0, 10);
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `respaldo-cotizadora-${fecha}.json`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 60_000);
    setAviso('Respaldo descargado. Mandatelo por correo para tenerlo a salvo.');
  }

  async function importar(archivo: File) {
    if (!confirm('Se reemplaza TODO lo que hay en este telefono. Continuar?')) return;
    try {
      const datos = JSON.parse(await archivo.text());
      const { cotizaciones } = await importarRespaldo(datos);
      setAviso(`Respaldo restaurado: ${cotizaciones} cotizaciones.`);
    } catch (e) {
      setAviso((e as Error).message || 'El archivo no se pudo leer.');
    }
  }

  return (
    <>
      <Barra titulo="Ajustes" atras="/" />
      <main className="contenido">
        {aviso && <div className="aviso info">{aviso}</div>}

        <div className="tarjeta">
          <h3>Perfil de la empresa</h3>
          <p className="mini" style={{ marginBottom: 12 }}>
            Esto es lo que ve el cliente en el encabezado de los dos PDF.
          </p>

          <div className="fila" style={{ marginBottom: 14, gap: 14 }}>
            {perfil.logoDataUrl ? (
              <img
                src={perfil.logoDataUrl}
                alt="Logo"
                style={{ width: 72, height: 72, objectFit: 'contain', borderRadius: 12, border: '1px solid var(--borde)' }}
              />
            ) : (
              <div
                style={{
                  width: 72, height: 72, borderRadius: 12,
                  border: '1px dashed var(--borde)', display: 'grid', placeItems: 'center',
                  color: 'var(--tinta-tenue)', fontSize: 12, textAlign: 'center',
                }}
              >
                Sin logo
              </div>
            )}
            <div style={{ flex: 1 }}>
              <label className="btn chico" style={{ width: '100%' }}>
                {perfil.logoDataUrl ? 'Cambiar logo' : 'Subir logo'}
                <input
                  type="file"
                  accept="image/png,image/jpeg"
                  style={{ display: 'none' }}
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) void cargarLogo(f);
                    e.target.value = '';
                  }}
                />
              </label>
              {perfil.logoDataUrl && (
                <button
                  type="button"
                  className="btn chico fantasma"
                  style={{ width: '100%', marginTop: 6 }}
                  onClick={() => set({ logoDataUrl: undefined })}
                >
                  Quitar
                </button>
              )}
            </div>
          </div>

          <Campo etiqueta="Nombre">
            <input value={perfil.nombre} onChange={(e) => set({ nombre: e.target.value })} />
          </Campo>
          <div className="grid-2">
            <Campo etiqueta="Teléfono">
              <input value={perfil.telefono} inputMode="tel" onChange={(e) => set({ telefono: e.target.value })} />
            </Campo>
            <Campo etiqueta="Correo">
              <input value={perfil.correo ?? ''} inputMode="email" onChange={(e) => set({ correo: e.target.value })} />
            </Campo>
          </div>
          <Campo etiqueta="Dirección">
            <input value={perfil.direccion ?? ''} onChange={(e) => set({ direccion: e.target.value })} />
          </Campo>
          <div className="grid-2">
            <Campo etiqueta="NIT">
              <input value={perfil.nit ?? ''} onChange={(e) => set({ nit: e.target.value })} />
            </Campo>
            <Campo etiqueta="NRC">
              <input value={perfil.nrc ?? ''} onChange={(e) => set({ nrc: e.target.value })} />
            </Campo>
          </div>
        </div>

        <div className="tarjeta">
          <h3>Condiciones por defecto</h3>
          <Campo etiqueta="Condiciones" ayuda="Una por linea. Se copian a cada cotización nueva.">
            <textarea
              rows={5}
              value={perfil.condicionesPorDefecto}
              onChange={(e) => set({ condicionesPorDefecto: e.target.value })}
            />
          </Campo>
          <Campo etiqueta="Garantía del trabajo">
            <textarea rows={2} value={perfil.garantia} onChange={(e) => set({ garantia: e.target.value })} />
          </Campo>
          <Campo etiqueta="Días de validez">
            <input
              type="number"
              inputMode="numeric"
              min={1}
              value={perfil.diasValidezPorDefecto}
              onChange={(e) => set({ diasValidezPorDefecto: Math.max(1, Number(e.target.value) || 1) })}
            />
          </Campo>
          <Campo
            etiqueta="Prefijo del correlativo"
            ayuda="Si algún dia hay un segundo teléfono, cambiale el prefijo para que los números no choquen."
          >
            <input
              value={perfil.prefijoCorrelativo}
              onChange={(e) => set({ prefijoCorrelativo: e.target.value })}
            />
          </Campo>
        </div>

        <div className="tarjeta">
          <h3>Holgura por desperdicio</h3>
          <p className="mini" style={{ marginBottom: 12 }}>
            Porcentaje que se agrega al material antes de redondear a la presentación de venta. Los
            materiales que tienen holgura en 0 (breakers, cajas termicas, varillas) se quedan en 0.
          </p>
          <div className="grid-2">
            <Campo etiqueta="Cable %">
              <input
                type="number"
                inputMode="numeric"
                value={ajustes.holguraCablePct}
                onChange={(e) => setAj({ holguraCablePct: Number(e.target.value) || 0 })}
              />
            </Campo>
            <Campo etiqueta="Tubería %">
              <input
                type="number"
                inputMode="numeric"
                value={ajustes.holguraTuberiaPct}
                onChange={(e) => setAj({ holguraTuberiaPct: Number(e.target.value) || 0 })}
              />
            </Campo>
          </div>
          <Campo etiqueta="Resto de materiales %">
            <input
              type="number"
              inputMode="numeric"
              value={ajustes.holguraGeneralPct}
              onChange={(e) => setAj({ holguraGeneralPct: Number(e.target.value) || 0 })}
            />
          </Campo>
          <button
            type="button"
            className="btn"
            onClick={async () => {
              // Cada material guarda su propia holgura; esto la reescribe en bloque.
              const materiales = await db.materiales.toArray();
              await db.materiales.bulkPut(
                materiales.map((m) => ({
                  ...m,
                  // Las que estan en 0 quedan en 0: son piezas caras y discretas
                  // donde un porcentaje obligaria a comprar una unidad de mas.
                  holguraPct: m.holguraPct === 0 ? 0 :
                    m.categoria === 'conductores' || m.id.startsWith('cable-')
                      ? ajustes.holguraCablePct
                      : m.categoria === 'canalizacion'
                        ? ajustes.holguraTuberiaPct
                        : ajustes.holguraGeneralPct,
                })),
              );
              setAviso('Holguras aplicadas a todo el catálogo.');
            }}
          >
            Aplicar a todos los materiales
          </button>
        </div>

        <div className="tarjeta">
          <h3>Ajuste por tipo de obra</h3>
          <p className="mini" style={{ marginBottom: 12 }}>
            Multiplica la mano de obra. Nunca cambia las cantidades de material.
          </p>
          {ajustes.tiposObra.map((t, i) => (
            <Campo key={t.id} etiqueta={`${t.nombre} (%)`} ayuda={t.descripcion}>
              <input
                type="number"
                inputMode="numeric"
                value={Math.round(t.multiplicadorBps / 100 - 100)}
                onChange={(e) => {
                  const pct = Number(e.target.value) || 0;
                  const tipos = [...ajustes.tiposObra];
                  tipos[i] = { ...t, multiplicadorBps: 10000 + Math.round(pct * 100) };
                  setAj({ tiposObra: tipos });
                }}
              />
            </Campo>
          ))}
        </div>

        <div className="tarjeta">
          <h3>Formas de pago</h3>
          <p className="mini" style={{ marginBottom: 12 }}>
            Los porcentajes de cada cuota. Se eligen por cotización en la revisión final.
          </p>
          {ajustes.formasPago.map((f, i) => (
            <div key={f.id} style={{ marginBottom: 14 }}>
              <label className="fila" style={{ marginBottom: 8, cursor: 'pointer' }}>
                <input
                  type="radio"
                  name="forma-pago-defecto"
                  style={{ width: 20, height: 20, minHeight: 20, flex: '0 0 auto' }}
                  checked={perfil.formaPagoPorDefectoId === f.id}
                  onChange={() => set({ formaPagoPorDefectoId: f.id })}
                />
                <strong>{f.nombre}</strong>
                <span className="mini">{perfil.formaPagoPorDefectoId === f.id ? '(por defecto)' : ''}</span>
              </label>
              {f.cuotas.length > 1 && (
                <div className="grid-2">
                  {f.cuotas.map((c, j) => (
                    <Campo key={c.etiqueta} etiqueta={`${c.etiqueta} %`}>
                      <input
                        type="number"
                        inputMode="numeric"
                        min={0}
                        max={100}
                        value={c.pct}
                        onChange={(e) => {
                          const pct = Math.min(100, Math.max(0, Number(e.target.value) || 0));
                          const formasPago = [...ajustes.formasPago];
                          const cuotas = [...f.cuotas];
                          cuotas[j] = { ...c, pct };
                          formasPago[i] = { ...f, cuotas };
                          setAj({ formasPago });
                        }}
                      />
                    </Campo>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>

        <div className="tarjeta">
          <h3>Cláusulas</h3>
          <p className="mini" style={{ marginBottom: 12 }}>
            Textos reutilizables para agregar al PDF. "Por defecto" las deja pre-marcadas en cada
            cotización nueva, pero siempre se pueden desmarcar ahí.
          </p>
          {ajustes.clausulas.map((cl, i) => (
            <div key={cl.id} className="tarjeta plana" style={{ marginBottom: 10, padding: 10 }}>
              <textarea
                rows={2}
                value={cl.texto}
                onChange={(e) => {
                  const clausulas = [...ajustes.clausulas];
                  clausulas[i] = { ...cl, texto: e.target.value };
                  setAj({ clausulas });
                }}
              />
              <div className="fila entre" style={{ marginTop: 8 }}>
                <label className="fila" style={{ cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    style={{ width: 20, height: 20, minHeight: 20, flex: '0 0 auto' }}
                    checked={cl.porDefecto}
                    onChange={(e) => {
                      const clausulas = [...ajustes.clausulas];
                      clausulas[i] = { ...cl, porDefecto: e.target.checked };
                      setAj({ clausulas });
                    }}
                  />
                  <span className="mini">Por defecto</span>
                </label>
                <button
                  type="button"
                  className="btn chico peligro"
                  onClick={() => setAj({ clausulas: ajustes.clausulas.filter((c) => c.id !== cl.id) })}
                >
                  Quitar
                </button>
              </div>
            </div>
          ))}
          <button
            type="button"
            className="btn"
            onClick={() =>
              setAj({
                clausulas: [
                  ...ajustes.clausulas,
                  { id: `clausula-${Date.now()}`, texto: '', porDefecto: false },
                ],
              })
            }
          >
            + Agregar cláusula
          </button>
        </div>

        <div className="tarjeta">
          <h3>Cuenta bancaria</h3>
          <p className="mini" style={{ marginBottom: 12 }}>
            Aparece en el PDF para el cliente que prefiera pagar por transferencia.
          </p>
          <div className="grid-2">
            <Campo etiqueta="Banco">
              <input
                value={perfil.cuentaBancaria.banco}
                onChange={(e) => set({ cuentaBancaria: { ...perfil.cuentaBancaria, banco: e.target.value } })}
              />
            </Campo>
            <Campo etiqueta="Tipo de cuenta">
              <input
                value={perfil.cuentaBancaria.tipoCuenta}
                placeholder="Cuenta corriente"
                onChange={(e) =>
                  set({ cuentaBancaria: { ...perfil.cuentaBancaria, tipoCuenta: e.target.value } })
                }
              />
            </Campo>
          </div>
          <Campo etiqueta="Número de cuenta">
            <input
              value={perfil.cuentaBancaria.numero}
              inputMode="numeric"
              onChange={(e) => set({ cuentaBancaria: { ...perfil.cuentaBancaria, numero: e.target.value } })}
            />
          </Campo>
          <Campo etiqueta="Titular">
            <input
              value={perfil.cuentaBancaria.titular}
              onChange={(e) => set({ cuentaBancaria: { ...perfil.cuentaBancaria, titular: e.target.value } })}
            />
          </Campo>
        </div>

        <div className="tarjeta">
          <h3>Respaldo</h3>
          <p className="mini" style={{ marginBottom: 12 }}>
            Todo vive en este teléfono. Si lo perdés, perdes el catálogo, las recetas y el historial.
            Exportá cada tanto y mandate el archivo por correo.
          </p>
          <div className="columna">
            <button type="button" className="btn" onClick={() => void exportar()}>
              Exportar respaldo (JSON)
            </button>
            <button type="button" className="btn" onClick={() => archivoRef.current?.click()}>
              Importar respaldo
            </button>
            <input
              ref={archivoRef}
              type="file"
              accept="application/json,.json"
              style={{ display: 'none' }}
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) void importar(f);
                e.target.value = '';
              }}
            />
          </div>
        </div>
      </main>
    </>
  );
}

/** Reduce el logo antes de guardarlo: los PDF van por WhatsApp y deben ser livianos. */
function reducirImagen(archivo: File, maxLado: number): Promise<string> {
  return new Promise((resolve, reject) => {
    const lector = new FileReader();
    lector.onerror = () => reject(new Error('lectura'));
    lector.onload = () => {
      const img = new Image();
      img.onerror = () => reject(new Error('decodificacion'));
      img.onload = () => {
        const escala = Math.min(1, maxLado / Math.max(img.width, img.height));
        const canvas = document.createElement('canvas');
        canvas.width = Math.round(img.width * escala);
        canvas.height = Math.round(img.height * escala);
        const ctx = canvas.getContext('2d');
        if (!ctx) return reject(new Error('canvas'));
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        resolve(canvas.toDataURL('image/png'));
      };
      img.src = String(lector.result);
    };
    lector.readAsDataURL(archivo);
  });
}
