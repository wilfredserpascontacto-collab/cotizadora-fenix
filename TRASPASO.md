# Traspaso

Estado del proyecto al **23 de agosto de 2026**, commit `a2fa3c8` en `main`.

El [README](README.md) explica qué hace la app y cómo está armada. Este
documento es lo otro: por qué está armada así, qué se verificó de verdad, qué
rompe si se toca sin saber, y qué falta.

---

## Qué funciona, y cómo lo sé

No es "compila y parece andar". Esto es lo que se probó y de qué manera.

**Funciona sin conexión.** Se compiló la build de producción, se sirvió, se
esperó a que el service worker precacheara, **se apagó el servidor** y se
recargó la página en Chrome. La app abrió, se armó una cotización completa, se
calcularon los materiales, se asignó el correlativo y se generaron los dos PDF,
todo con el servidor caído.

Aclaración importante: el navegador embebido de Claude Code **no registra
service workers**, así que ahí la prueba de offline da un falso negativo. Hay
que verificarlo en Chrome de verdad.

**El correlativo no se repite ni se salta.** Se emitieron la 0001 y la 0002, se
creó un tercer borrador, se borró, y la siguiente emitida salió **0003**. Un
borrador abandonado no consume número.

**Las cuentas dan.** `npm run verificar` corre las reglas contra el catálogo
real y las imprime: el cable se consolida una sola vez entre tomacorrientes,
luminarias e interruptores (196 m → 3 rollos), 36 m siguen dando 1 rollo de 100,
y el multiplicador de tipo de obra mueve la mano de obra sin tocar un solo metro
de material.

**Los PDF se revisaron, no sólo se generaron.** `npm run verificar:pdf` los
arma con datos de ejemplo y les extrae el texto. Además se abrieron en Chrome
para verlos: encabezado con logo, tablas, totales y el recuadro de advertencia.

**Lo que no está probado:** no hay pruebas automatizadas. Los dos scripts de
verificación imprimen resultados para que un humano los mire, no fallan solos.
Tampoco se probó nunca en un teléfono real, porque eso necesita el HTTPS que
todavía no existe.

---

## Decisiones no obvias, y por qué

**Holgura 0 en piezas caras y discretas.** El brief pedía 5% de desperdicio
general. Con eso, una caja térmica de 8 espacios salía como **2 unidades**
(1 × 1.05 redondeado hacia arriba): $38 de más y una lista que le hace perder
credibilidad a la cotización. En una pieza discreta la holgura no es
desperdicio, es un segundo producto. Van con 0: breakers, cajas térmicas,
varillas y barras de tierra, el set de cobre, el soporte de mini split, el
tomacorriente 220V y el interruptor de tres vías. Los consumibles que sí se
dañan mantienen su 5%.

**El correlativo se asigna al emitir, no al crear.** Si se asignara al crear el
borrador, cada cotización abandonada dejaría un hueco en la serie. Como
contrapartida, una cotización ya emitida **no se puede borrar** (sólo marcarse
rechazada o vencida), porque borrarla dejaría el mismo hueco.

**Los precios se congelan en el renglón.** Cambiar un precio en Catálogos no
altera ninguna cotización vieja. Eso es intencional, no un bug: una cotización
de agosto tiene que seguir diciendo lo que decía en agosto.

**Todo entero.** Los montos son centavos y las cantidades de material son
milésimas. No hay un solo float en las cuentas.

**El logo entra por dos caminos distintos.** Sobre negro plano para el icono de
la app; con fondo transparente para el encabezado de los PDF, que es papel
blanco. El negro texturado del JPEG original hacía que el icono de 512 px
pesara 366 KB; plano pesa 40 KB.

---

## Trampas

Cosas que parecen mejoras y rompen algo.

**No excluir chunks del precache del service worker.** jsPDF arrastra canvg,
html2canvas y dompurify con imports **estáticos**, aunque sólo los use
`doc.html()`, que esta app nunca llama. Son 400 KB que dan muchas ganas de sacar
del precache. Si se sacan, el grafo de módulos no instancia sin conexión y la
app **no abre**: pantalla en blanco, sin ningún error en consola. Ya pasó una
vez. El precache pesa 1.2 MB de una sola vez y así se queda.

**No pisar los ceros de holgura.** El botón *Aplicar a todos los materiales* en
Ajustes respeta a propósito los materiales que tienen holgura en 0. Si alguien
"arregla" eso, vuelven las dos cajas térmicas.

**El monto de materiales no suma nunca.** Es la regla que sostiene todo el
producto. Si aparece sumando en algún total, en pantalla o en un PDF, es un bug
grave aunque las cuentas cierren.

**`scripts/logo-a-iconos.ps1` sólo corre en Windows** (usa .NET). Si el proyecto
se mueve a Linux o a un CI, hay que rehacerlo con otra herramienta.

**El catálogo va acentuado a propósito.** Los nombres de partidas y materiales
terminan impresos en el PDF que el cliente lleva a la distribuidora. "Caja
termica" ahí resta seriedad.

---

## Pendientes, en orden de importancia

**1. El subdominio con HTTPS.** Bloqueante para la entrega. Una PWA no se
instala ni registra su service worker sin origen seguro; servida por HTTP plano
o por IP con puerto pierde la instalación y el modo sin conexión, que son las
dos razones por las que se eligió PWA. Va en el VPS de Vultr con Coolify, con
certificado de Let's Encrypt. Si la primera vez que Francisco intenta instalarla
no funciona, la impresión ya no se recupera.

**2. Las recetas reales de Francisco.** Es el activo del producto y lo único que
no se puede inventar. Las sembradas son realistas pero genéricas. Hay que
sentarse una hora con él y sacarle las diez o quince partidas que más usa. Una
receta corta manda al cliente a comprar de menos, el trabajo se para a media
instalación, y la culpa se la lleva la app. Se editan en Catálogos → Recetas.

**3. Llenar el perfil de la empresa.** En `PERFIL_DEFAULT` el teléfono, el
correo, la dirección, el NIT y el NRC están **vacíos**. Hoy el encabezado de los
PDF sale con el logo y el nombre solos. Se llena desde Ajustes en el teléfono, o
se cambian los valores por defecto en `src/db/seed.ts`.

**4. Repositorio remoto.** El repo es local. Coolify despliega desde un
repositorio, así que hace falta subirlo. Siendo código de un cliente, conviene
privado.

**5. Decisión de color pendiente.** La lista de materiales usa violeta para
distinguirse de la cotización de servicio. Con la marca naranja y negra del logo
quedó desentonando. Se puede pasar a un gris pizarra manteniendo la distinción,
o dejarlo. Está en `--material` en `src/styles/app.css` y en los colores del
encabezado de tabla en `src/pdf/materialesPdf.ts`.

---

## Un error ya cometido, para no repetirlo

Se intentó acentuar toda la copy de la interfaz de una pasada, con un script que
buscaba nodos de texto JSX por expresión regular (`>texto<`). El patrón también
capturó las flechas `=>` de las funciones y reordenó el código: nueve archivos
destrozados. Se restauró de un respaldo y se rehizo con reglas conservadoras
(sólo líneas de prosa pura y atributos entre comillas), más un puñado de
correcciones a mano.

Si hace falta otra pasada masiva de texto: no parsear JSX con expresiones
regulares, y hacer copia de seguridad antes.

---

## Datos de prueba

La app siembra sola el catálogo la primera vez que abre. Para volver a cero,
borrar la base IndexedDB `cotizadora-fenix` desde las herramientas de
desarrollador del navegador. Los dos clientes de ejemplo y cualquier cotización
de prueba se van con eso.
