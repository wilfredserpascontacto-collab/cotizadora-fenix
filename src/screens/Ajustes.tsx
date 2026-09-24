import { useRef } from 'react';
import { Link } from 'react-router-dom';
import { useLiveQuery } from 'dexie-react-hooks';
import {
  actualizarAjustes,
  actualizarPerfil,
  db,
  exportarRespaldo,
  importarRespaldo,
  leerAjustes,
  leerPerfil,
} from '../db/db';
import type { Ajustes as AjustesTipo, CuentaBancaria, PerfilEmpresa } from '../domain/types';
import { useAviso } from '../state/useCotizacion';
import { Barra, Campo, Cargando } from '../components/ui';
import { AreaTexto, CampoNumero, CampoTexto } from '../components/campos';

export default function Ajustes() {
  const perfil = useLiveQuery(() => leerPerfil(), []);
  const ajustes = useLiveQuery(() => leerAjustes(), []);
  const [aviso, setAviso] = useAviso();
  const archivoRef = useRef<HTMLInputElement>(null);

  if (!perfil || !ajustes) return <Cargando />;

  const set = (cambios: Partial<PerfilEmpresa>) => void actualizarPerfil(cambios);
  const setAj = (
    cambios: Partial<AjustesTipo> | ((actual: AjustesTipo) => Partial<AjustesTipo>),
  ) => void actualizarAjustes(cambios);
  // La cuenta bancaria vive anidada: hay que rearmarla sobre lo que este
  // guardado, no sobre la copia pintada, o cambiar el banco borra el titular.
  const setBanco = (cambios: Partial<CuentaBancaria>) =>
    void actualizarPerfil((p) => ({ cuentaBancaria: { ...p.cuentaBancaria, ...cambios } }));

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
            <CampoTexto valor={perfil.nombre} guardar={(v) => set({ nombre: v })} />
          </Campo>
          <div className="grid-2">
            <Campo etiqueta="Teléfono">
              <CampoTexto valor={perfil.telefono} inputMode="tel" guardar={(v) => set({ telefono: v })} />
            </Campo>
            <Campo etiqueta="Correo">
              <CampoTexto valor={perfil.correo ?? ''} inputMode="email" guardar={(v) => set({ correo: v })} />
            </Campo>
          </div>
          <Campo etiqueta="Dirección">
            <CampoTexto valor={perfil.direccion ?? ''} guardar={(v) => set({ direccion: v })} />
          </Campo>
          <div className="grid-2">
            <Campo etiqueta="NIT">
              <CampoTexto valor={perfil.nit ?? ''} guardar={(v) => set({ nit: v })} />
            </Campo>
            <Campo etiqueta="NRC">
              <CampoTexto valor={perfil.nrc ?? ''} guardar={(v) => set({ nrc: v })} />
            </Campo>
          </div>
        </div>

        <div className="tarjeta">
          <h3>Condiciones por defecto</h3>
          <Campo etiqueta="Condiciones" ayuda="Una por linea. Se copian a cada cotización nueva.">
            <AreaTexto
              rows={5}
              valor={perfil.condicionesPorDefecto}
              guardar={(v) => set({ condicionesPorDefecto: v })}
            />
          </Campo>
          <Campo etiqueta="Garantía del trabajo">
            <AreaTexto rows={2} valor={perfil.garantia} guardar={(v) => set({ garantia: v })} />
          </Campo>
          <Campo etiqueta="Días de validez">
            <CampoNumero
              min={1}
              minimo={1}
              valor={perfil.diasValidezPorDefecto}
              guardar={(v) => set({ diasValidezPorDefecto: v })}
            />
          </Campo>
          <Campo
            etiqueta="Prefijo del correlativo"
            ayuda="Si algún dia hay un segundo teléfono, cambiale el prefijo para que los números no choquen."
          >
            <CampoTexto
              valor={perfil.prefijoCorrelativo}
              guardar={(v) => set({ prefijoCorrelativo: v })}
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
              <CampoNumero
                valor={ajustes.holguraCablePct}
                guardar={(v) => setAj({ holguraCablePct: v })}
              />
            </Campo>
            <Campo etiqueta="Tubería %">
              <CampoNumero
                valor={ajustes.holguraTuberiaPct}
                guardar={(v) => setAj({ holguraTuberiaPct: v })}
              />
            </Campo>
          </div>
          <Campo etiqueta="Resto de materiales %">
            <CampoNumero
              valor={ajustes.holguraGeneralPct}
              guardar={(v) => setAj({ holguraGeneralPct: v })}
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
          {ajustes.tiposObra.map((t) => (
            <Campo key={t.id} etiqueta={`${t.nombre} (%)`} ayuda={t.descripcion}>
              <CampoNumero
                valor={Math.round(t.multiplicadorBps / 100 - 100)}
                guardar={(pct) =>
                  setAj((a) => ({
                    tiposObra: a.tiposObra.map((x) =>
                      x.id === t.id ? { ...x, multiplicadorBps: 10000 + Math.round(pct * 100) } : x,
                    ),
                  }))
                }
              />
            </Campo>
          ))}
        </div>

        <div className="tarjeta">
          <h3>Formas de pago</h3>
          <p className="mini" style={{ marginBottom: 12 }}>
            Los porcentajes de cada cuota. Se eligen por cotización en la revisión final.
          </p>
          {ajustes.formasPago.map((f) => (
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
                      <CampoNumero
                        min={0}
                        max={100}
                        minimo={0}
                        maximo={100}
                        valor={c.pct}
                        guardar={(pct) =>
                          setAj((a) => ({
                            formasPago: a.formasPago.map((fx) =>
                              fx.id === f.id
                                ? {
                                    ...fx,
                                    cuotas: fx.cuotas.map((cx, k) => (k === j ? { ...cx, pct } : cx)),
                                  }
                                : fx,
                            ),
                          }))
                        }
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
              <AreaTexto
                rows={2}
                valor={cl.texto}
                guardar={(v) =>
                  setAj((a) => ({
                    clausulas: a.clausulas.map((x) => (x.id === cl.id ? { ...x, texto: v } : x)),
                  }))
                }
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
              <CampoTexto
                valor={perfil.cuentaBancaria.banco}
                guardar={(v) => setBanco({ banco: v })}
              />
            </Campo>
            <Campo etiqueta="Tipo de cuenta">
              <CampoTexto
                valor={perfil.cuentaBancaria.tipoCuenta}
                placeholder="Cuenta corriente"
                guardar={(v) => setBanco({ tipoCuenta: v })}
              />
            </Campo>
          </div>
          <Campo etiqueta="Número de cuenta">
            <CampoTexto
              valor={perfil.cuentaBancaria.numero}
              inputMode="numeric"
              guardar={(v) => setBanco({ numero: v })}
            />
          </Campo>
          <Campo etiqueta="Titular">
            <CampoTexto
              valor={perfil.cuentaBancaria.titular}
              guardar={(v) => setBanco({ titular: v })}
            />
          </Campo>
        </div>

        <div className="tarjeta">
          <h3>Instalar en otro teléfono</h3>
          <p className="mini" style={{ marginBottom: 12 }}>
            Si cambiás de equipo, acá están los pasos. Acordate de exportar el respaldo antes y de
            importarlo en el teléfono nuevo: la información no viaja sola.
          </p>
          <Link className="btn" to="/instalar" style={{ display: 'block', textAlign: 'center' }}>
            Cómo instalar la app
          </Link>
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
