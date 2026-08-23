# Cotizadora Grupo Fénix

PWA instalable para armar cotizaciones de trabajos eléctricos desde el celular,
parada en el sitio del trabajo y sin señal.

El criterio de éxito es uno solo: **que Francisco pueda cotizar y enviar el PDF
por WhatsApp antes de irse de la propiedad del cliente.**

---

## El modelo de negocio, que define toda la app

Francisco vende **mano de obra**. No vende materiales.

Eso parte la cotización en dos documentos con naturaleza distinta, y la app no
los mezcla nunca:

| | Cotización de servicio | Lista de materiales |
|---|---|---|
| Qué es | Lo que Francisco cobra por instalar | Lo que el cliente va a comprar |
| Suma al total | Sí, es el único monto que suma | **Nunca** |
| IVA 13% | Sí | No |
| Naturaleza | Un cobro | Una instrucción de compra |

Un cliente que crea que le están cobrando los materiales se asusta con el total
y no contrata. Por eso los dos bloques van visualmente separados en pantalla, y
salen como dos PDF distintos que el usuario elige mandar juntos o por separado.

---

## Arrancar en local

```bash
npm install
```

```bash
npm run dev
```

Queda en `http://localhost:5174`. La primera vez siembra sola el catálogo:
26 partidas, 38 materiales con su unidad de venta, las recetas armadas y dos
clientes de ejemplo para poder probar de inmediato.

Otros comandos:

```bash
npm run build
```

```bash
npm run verificar
```

`verificar` corre las reglas de cálculo (consolidación, holgura, redondeo a
unidad de venta, IVA) e imprime los resultados. `npm run verificar:pdf` genera
los dos PDF con datos de ejemplo en `node_modules/.cache/` y extrae su texto,
para revisarlos sin abrir el navegador.

---

## Cómo cotiza

**Por instalación.** Se cuentan unidades de cosas instalables: tantos
tomacorrientes, tantas cajas térmicas, tantos aires. Cada partida tiene un
precio que es **solo mano de obra**, sin material.

### Los materiales se calculan solos

Cada partida trae una **receta**: qué materiales consume una unidad y cuánto.
Al armar la cotización el sistema recorre las partidas, multiplica por las
cantidades, **consolida los repetidos** y produce una sola lista de compra: el
cable aparece una vez, con el total.

Tres reglas, en este orden:

1. **Holgura.** Porcentaje de desperdicio configurable por material. 10% en
   cable y tubería, 5% en el resto.
2. **Redondeo a unidad de venta, siempre hacia arriba.** Si el cálculo da 37 m
   de cable, la lista dice **1 rollo de 100 m**: en una distribuidora no se
   compran 37 metros.
3. **Precios de referencia, marcados como tales.** El estimado le dice al
   cliente cuánto va a gastar, dice con todas sus letras que está sujeto a la
   distribuidora, y **jamás se suma al total de Francisco**. La columna de
   precios se puede ocultar desde la pantalla de materiales.

> **Holgura 0 a propósito.** Breakers, cajas térmicas, varillas de tierra,
> barras de tierra y el set de cobre van con holgura 0. En una pieza cara y
> discreta un 5% no es desperdicio: es un segundo producto. Con holgura, un
> tablero de 8 espacios salía como *2 unidades* — $38 de más y una lista que
> le hace perder credibilidad a la cotización.

### Ajuste por tipo de obra

Un tomacorriente en obra gris no cuesta lo mismo que en pared terminada. El
selector aplica un multiplicador configurable (obra nueva base, remodelación
+30%, reparación puntual +15%) que toca **solo la mano de obra**, nunca las
cantidades de material. Sale visible en pantalla y como su propio renglón en el
PDF.

---

## Decisiones que sostienen el código

**Todo monto es un entero de centavos.** Nunca un float. `money.ts` concentra
el formateo y el parseo.

**Toda cantidad de material es un entero de milésimas** de su unidad de medida
(12.5 m = `12500`). Así las recetas admiten fracciones sin aritmética flotante.

**Los precios se congelan en el renglón.** Al agregar una partida se copian su
nombre, su precio y su receta. Si Francisco sube precios en enero, la cotización
de agosto sigue diciendo lo de agosto. Al emitir se congelan además el cliente y
el catálogo de materiales usado.

**El correlativo se asigna al emitir, no al crear.** Un borrador abandonado no
deja un hueco en la serie, y una cotización ya emitida no se puede borrar (se
marca rechazada o vencida). Así la serie no se repite ni se salta. La asignación
va dentro de una transacción de Dexie y se recupera del máximo emitido si algún
día se restaura un respaldo.

**Nada se pierde al cerrar.** La cotización se reescribe en IndexedDB en cada
cambio, no al final. Al volver a abrir, la pantalla de inicio ofrece retomar el
borrador donde quedó.

**Sin backend.** Todo vive en el teléfono. Eso la hace offline por diseño. El
modelo de datos ya deja las puertas abiertas para la fase dos: `ordenTrabajoId`
para convertir una cotización aceptada en orden de trabajo, `crmExternoId` para
amarrar el cliente a un CRM, y `syncVersion` para cuando exista servidor.

---

## Estructura

```
src/
  domain/      reglas de negocio puras, sin React ni Dexie
    types.ts        modelo de datos
    money.ts        centavos y milésimas
    materiales.ts   consolidación, holgura y redondeo
    cotizacion.ts   totales, IVA, congelado, correlativo
  db/          Dexie: esquema, semilla, repositorio, respaldo
  state/       hooks sobre la base
  screens/     una pantalla por archivo
  pdf/         los dos documentos
  share/       Web Share API y caída a wa.me
```

Las reglas de cálculo están en `domain/` y no dependen de nada: por eso se
pueden verificar con `npm run verificar` sin levantar un navegador.

---

## El logo

El original está en `image/Logo_Fenix.jpg`: un banner de 2816x1536 con el fénix
naranja sobre negro texturado. De ahí salen todas las piezas:

```bash
npm run iconos
```

El script (`scripts/logo-a-iconos.ps1`, usa .NET, así que corre en Windows)
recorta la marca, la pasa a fondo transparente y genera:

- `public/icons/*.png` — los iconos de la app instalada, con la marca sobre
  negro plano. El `maskable` deja más aire porque Android recorta las esquinas.
- `src/assets/logo-fenix.png` — la marca sola, sin fondo, para el encabezado de
  los dos PDF. Va incrustada en el bundle como dataURL, no como archivo aparte:
  los PDF se arman en el teléfono y no pueden depender de una descarga.

Aplanar el fondo no es cosmético: el negro texturado del JPEG hacía que el icono
de 512 px pesara 366 KB. Plano pesa 40 KB.

El naranja de la marca es **#E27F32**, medido del propio archivo. La paleta de
la app usa ese naranja y el negro del logo (`--acento` y `--marca` en
`src/styles/app.css`), así que el encabezado, la barra de estado del teléfono y
la pantalla de arranque van a juego con el icono.

El logo ya viene puesto en el perfil por defecto, así que los PDF salen con
marca sin configurar nada. Si Francisco quiere cambiarlo, en Ajustes puede subir
otro y se guarda en el teléfono.

---

## Respaldo: leelo antes de entregarle la app

Sin backend, **si Francisco pierde el teléfono pierde el catálogo, las recetas y
el historial**. En Ajustes está *Exportar respaldo (JSON)* e *Importar respaldo*.
Enseñale a exportar cada tanto y mandarse el archivo por correo. Es un parche
hasta que exista sincronización, pero evita el desastre.

El correlativo es local al dispositivo. Si algún día hay un segundo teléfono,
cambiale el **prefijo del correlativo** en Ajustes (`COT-`, `COT-B`) para que
los números no choquen.

---

## Despliegue en Coolify

### El HTTPS no es opcional

Una PWA **no se instala ni registra su service worker sin un origen seguro**.
Servida por HTTP plano o desde una IP con puerto, la app pierde la instalación y
el modo sin conexión, que son las dos razones por las que se eligió PWA.

Resolvelo **antes** de la entrega: subdominio propio con certificado de Let's
Encrypt. Si la primera vez que Francisco intenta instalarla no funciona, la
impresión ya no se recupera.

### Pasos

1. En Coolify: **New Resource → Application → Dockerfile**, apuntando al
   repositorio y a la rama.
2. Build Pack: `Dockerfile`. El del repo compila con Node 22 y sirve el `dist`
   con nginx.
3. Puerto expuesto: **80**.
4. Domains: el subdominio, con **Generate SSL** activado (Let's Encrypt). Esto
   es lo que habilita instalar la app.
5. Deploy.

La ruta base es configurable. Por defecto la app se sirve en la raíz del
dominio. Si necesitás montarla en un subdirectorio, pasá el build arg:

```bash
docker build --build-arg VITE_BASE_PATH=/cotizadora/ -t cotizadora .
```

En Coolify, el mismo valor va en *Build Arguments*. La variable también se lee
en desarrollo desde `.env` (mirá `.env.example`).

### Probarlo en local como en producción

```bash
docker build -t cotizadora . && docker run --rm -p 8080:80 cotizadora
```

Ojo: en `http://localhost` el service worker sí registra (localhost cuenta como
origen seguro), pero desde otro dispositivo de la red **no**, porque ya no es
localhost ni HTTPS. Para probar en un teléfono real hace falta el subdominio con
certificado.

### Cacheo

`nginx.conf` sirve `sw.js`, `index.html` y el manifest con `no-cache`, y los
assets con hash como inmutables. Es lo que hace que una versión nueva llegue al
teléfono en vez de quedarse pegada la vieja para siempre.

---

## Instalar en el teléfono

La app trae la pantalla *Instalar app* con las instrucciones de cada sistema y,
en Android, un botón que dispara la instalación directa. En iPhone hay que
abrirla **en Safari** (no en Chrome ni dentro del navegador de WhatsApp) y usar
compartir → «Agregar a inicio».

---

## Fuera de alcance en esta versión

No hay cuentas de usuario, sincronización con servidor, facturación electrónica
ni DTE, órdenes de trabajo, cobros ni panel de administración. Todo eso viene
después y no debe complicar esta versión.

---

## Lo que falta afinar, y es lo que más vale

**Las recetas son el activo.** La app se levanta rápido; lo que toma tiempo es
que cada partida tenga bien puesto qué consume. Las que trae el repo son
realistas pero genéricas: sentate una hora con Francisco y sacale las diez o
quince partidas que más usa. El resto se llena después.

Una receta corta manda al cliente a comprar de menos, el trabajo se para a media
instalación, y la culpa se la lleva la app. Las recetas se editan en
**Catálogos → Recetas**.
