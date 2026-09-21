# auteando

Marketplace de compra y venta de vehículos. React + TypeScript sobre Vite.

El nombre va en minúscula: así está dibujado el logotipo, y así se lee en medio
de una oración, que es donde más aparece.

## La marca

El logotipo, el símbolo y los dos juntos viven en
`src/components/brand/Logo.tsx`, no como archivos en `assets`.

El logotipo es geométrico, en minúsculas y en bold: cada letra es un trazo de
20 unidades con curvas de radio 21, y la `o` se estira en un remate que cierra
la palabra. El símbolo es esa misma `a`, en tinta, sobre un cuadrado amarillo
con las esquinas redondeadas, y el remate de la `a` se sale por el borde.

Van adentro de un componente y no como `<img>` por una razón concreta: **el
texto va en `currentColor`**. La identidad entrega el logo en veintiún colores y
no hace falta importar ninguno, porque la navbar ya decide de qué color va su
contenido en cada estado y el logo lo hereda. El símbolo sí trae sus colores
escritos: es la parte de la marca que no cambia sobre fondo claro ni oscuro.

`BrandLockup` es el símbolo con el logotipo, y no son dos piezas puestas al
lado con CSS: el kit ajusta el símbolo para que su borde de arriba y el de abajo
coincidan con los del texto, y el componente es ese dibujo con las coordenadas
del kit. El pie lo lleva siempre.

Los `d` y los `transform` salen tal cual del kit (`auteando-minuscula-bold/02-bold`
y `auteando-bold-alineado`). Si el logotipo cambia, se reemplazan por los del
archivo nuevo, y después:

    npm run iconos      favicon.svg, favicon.ico y apple-touch-icon.png
    npm run og:home     la lámina que se ve al compartir la portada
    npm run og:garage   la del garage sin fotos
    npm run og:blog     una por nota

Todo sale del mismo componente, así que con eso no queda ninguna pieza con la
marca vieja.

El nombre de la marca sale de `src/config/brand.ts`. El único lugar que no puede
importarlo es `index.html`.

**La paleta de la identidad es `tokens.css`.** Los veinte colores coinciden uno
a uno, nombre por nombre: amarillo `#FFD100`, negro-verdoso `#0A100C`, marfil,
piedra, grafito, los dos ámbar, el verde y el rojo. Si alguna vez hay que tocar
un color, se toca en los tokens y la identidad sigue siendo cierta.

## Correr el proyecto

```bash
npm install
npm run dev
```

`npm run lint` (oxlint) · `npm run build` (typecheck + build) · `npm test`.

## Deploy

    npm run deploy

Buildea y publica en Cloudflare Workers con `wrangler deploy`, que toma el
nombre y el directorio de assets de `wrangler.jsonc`.

**Es manual.** No hay integración de Git: pushear a `main` no publica nada. Si
alguna vez se conecta, hay que sacar este script — con los dos caminos activos
cada publicación dispara dos builds y gana el que termina último, que es la
forma de publicar un commit viejo sin enterarse.

Ojo con una trampa al leer `wrangler deployments list`: un solo `wrangler
deploy` deja **dos** registros con unos quince segundos de diferencia, uno por
la subida de los assets y otro por los triggers. Parecen dos deploys y no lo
son.

## Cómo está organizado

```
src/
  styles/      tokens.css · base.css · ui.css · layout.css  → el design system
  components/
    ui/        primitivas sin conocimiento del dominio: Button, Input, Select,
               Badge, Card, Skeleton, Icon, CtaSplit
    layout/    Navbar, Footer, Layout
  pages/       una carpeta por pantalla; el CSS propio vive al lado del .tsx
  types/       el modelo de dominio: Vehicle, Seller, Favorite, SavedSearch…
  data/        catálogos estáticos: marcas, provincias, topes de precio,
               los espacios del garage
  lib/         acceso a datos (api.ts) y la lógica pura que no es de React:
               formato, niveles, confianza, teléfonos, límites de campo
supabase/      schema.sql y migraciones, para pegar en el SQL Editor
```

Dos reglas que sostienen todo lo demás:

- **`components/ui` no sabe qué es un auto** y `components/vehicle` no hace fetch.
  Los datos entran por props desde las páginas.
- **Los filtros viven en la URL.** `/cars?make=BMW&minPrice=20000` es la única
  representación del estado de búsqueda: compartir una búsqueda es copiar el link,
  y una búsqueda guardada es esa misma query string.

## Design system

Los tokens están en `src/styles/tokens.css` y son la traducción directa del canvas
de diseño. Lo que hay que respetar:

- Fondo blanco, negro para texto y estructura, **amarillo solo para acción**: CTA,
  estado seleccionado, favorito activo, un badge por card. Nunca fondo de sección,
  nunca color de texto.
- Los neutros tiran a verde-gris frío. Es lo que deja al amarillo como lo único
  cálido de la pantalla, y por lo tanto lo primero que se mira.
- **Archivo** para todo, titulares y UI, en una sola familia variable;
  **JetBrains Mono** (clase `.mono`) solo para datos duros: precios, kilometraje,
  años, cilindrada. Las dos salen del `<link>` de Google Fonts en `index.html`:
  no metas un `@font-face` apuntando al CDN de otro sitio, que es un archivo que
  no controlamos y una licencia que no tenemos.
- **Casi recto.** El radio va de 2px a 10px (`--r-xs` a `--r-2xl`) — lo justo para
  que una esquina no corte, no para que se lea como redondeo. El carácter lo dan
  la tipografía y la grilla. `--r-pill` es la excepción, solo para lo que de verdad
  es un círculo o una cápsula.
- La profundidad la dan una hairline que dibuja el contorno más una sombra difusa
  (`--sh-flat` … `--sh-overlay`). El hover **no desplaza el bloque**: pasa la
  hairline a tinta plena, que sobre esquinas casi rectas se lee mucho antes que
  un cambio de sombra.
- Movimiento: 150–300 ms, `ease-out`, `transform` y `opacity`.

## La regla que más se rompe

**Todo estado que pertenece a algo guarda a qué pertenece.**

Casi ninguna pantalla se desmonta al cambiar de objeto. Ir de `/cars/a` a
`/cars/b` deja `VehicleDetail` montado y sólo cambia el `vehicle`; lo mismo
`/g/id1` → `/g/id2` con el garage, y lo mismo una card de la grilla cuyo aviso
sigue estando después de cambiar un filtro. React reusa la instancia: el estado
local sobrevive y el `useState(algoDeProps)` no vuelve a correr.

Un estado que no dice de quién es, entonces, se arrastra:

```ts
const [contact, setContact] = useState<SellerContact | null>(null)   // ❌
const [contact, setContact] = useState<{ id: string; data: Contact } | null>(null)
const shown = contact?.id === vehicle.id ? contact.data : null       // ✅
```

No es teórico. Con la primera versión, tocar "Me interesa" en el segundo auto
abría el WhatsApp del vendedor del primero y no anotaba el interés en ninguno.

El síntoma es siempre el mismo y es el peor que hay: **no falla, muestra otra
cosa.** Un dato equivocado con cara de bueno no lo reporta nadie, porque nadie
sabe que está mirando algo que no le corresponde.

Vale para los datos que se piden, para los booleanos de "ya lo hiciste", y para
los contadores que suben con un clic. `FollowControls` es el ejemplo a copiar:
mete también al usuario que mira dentro de la clave, así cerrar sesión en otra
pestaña no deja el botón diciendo "Siguiendo".

Lo mismo vale para las listas cargadas en paralelo: **`Promise.allSettled` y no
`Promise.all`** cuando lo que se pide son cosas distintas. Con `all`, un
tropiezo de red en una se lleva puestas las otras y cae en el `catch` general,
que casi siempre concluye algo demasiado grande — el panel de moderación
llegaba a decirle a quien modera que no tenía permiso.

## Enlazar el dominio

`auteando.com` está comprado en Hostinger y el sitio vive en un Worker de
Cloudflare. El orden importa, y el paso 4 va último por una razón: prendido
antes de tiempo, el sitio se redirige a un lugar que todavía no existe.

1. **Cloudflare.** Agregar el sitio y mover los *nameservers* en Hostinger a los
   que indique Cloudflare. Mover los nameservers y no crear registros sueltos:
   es lo que da el SSL y lo que deja atar el dominio al Worker sin tocar DNS a
   mano. Tarda un rato en propagar.
2. **El Worker.** En su configuración, *Domains & Routes* → agregar
   `auteando.com` y `www.auteando.com` como dominio personalizado.
3. **Supabase.** En *Authentication → URL Configuration*: poner `Site URL` en
   `https://auteando.com` y agregar `https://auteando.com/**` a las *Redirect
   URLs*. **Esto no es opcional.** Los links de vuelta del mail salen de
   `window.location.origin`, así que apuntan solos al dominio nuevo, pero
   Supabase rechaza cualquier retorno que no esté en esa lista: sin este paso,
   entrar con link por mail y recuperar la contraseña dejan de funcionar, y el
   síntoma es que la persona vuelve al dominio viejo sin sesión.
4. **Recién ahí**, poner `CANONICAL_HOST = 'auteando.com'` en `worker/index.ts`
   y desplegar. Eso manda con un 301 a todo el que entre por `workers.dev`, que
   es lo que evita que el sitio exista dos veces para Google, y hace que el
   canonical, el `og:url` y el sitemap digan siempre el mismo dominio.

## Medición

Cloudflare Web Analytics está prendido para `auteando.com` y **no hay nada de
esto en el repo**. El beacon lo inyecta Cloudflare en el borde, después del
worker, y sólo cuando el pedido trae un `Accept` de navegador. Por eso no
aparece con un `curl` a secas ---hay que mandarle
`Accept: text/html,application/xhtml+xml,...`--- y por eso tampoco hay un
`<script>` que buscar en `index.html`.

Se prende y se mira en el panel: *Analytics & Logs* → *Web analytics*. No usa
cookies ni huellas del navegador, así que no pide cartel de consentimiento.

Cuenta las navegaciones del router como páginas vistas y no sólo las cargas
completas: el beacon entra con `"spa": 2`, que es el modo que sigue los cambios
de ruta de una SPA. Es la explicación de que tres visitas den veintidós páginas
vistas, que la primera vez parece un error y no lo es.

### Errores

Van a Sentry, sin su SDK: `src/lib/report.ts` le manda el sobre directo a la
API. Todo lo que antes era `console.error` pasa por `reportError`, más lo que
se escapa de todo (`window.onerror` y promesas sin atrapar) y los errores de
render de `ErrorBoundary`. Sentry manda un mail la primera vez que aparece
cada error.

Se prende con `VITE_SENTRY_DSN` en el `.env` de la máquina que hace el deploy
---el build lo lee de ahí---. Sin esa variable no se manda nada, y en
desarrollo tampoco. El DSN es público por diseño: va en el JavaScript que baja
cualquiera, igual que la clave `anon` de Supabase.

## Tests

    npm test

Vitest sobre Node, con una config aparte de la de la app (`vitest.config.ts`).
No hay jsdom, ni React, ni Supabase: **lo que se prueba es lógica pura**, y
cargarle a cada corrida el pipeline de la aplicación sería pedirle que levante
algo que los tests no usan. Los archivos viven al lado de lo que prueban.

El criterio para decidir qué se prueba no es la cobertura, es **qué falla
callado**. Una pantalla rota se ve; estas cosas no:

- El teléfono del vendedor. Si `toE164` lo arma mal, el comprador toca "Me
  interesa", WhatsApp abre un chat con un número que no existe, y el vendedor
  se queda esperando un mensaje que nunca llega. No hay error en ningún lado.
- El preview que se comparte. No se ve desde el sitio: sale mal, se manda a un
  grupo, y el que se entera es el que no abrió el link.
- El escapado del worker. El título y la descripción salen de lo que escribió
  el vendedor y terminan dentro de un atributo del HTML que se le sirve a
  cualquiera.

Hay un tipo de test que vale la pena entender antes de tocar nada, porque es el
que va a fallar dentro de un año sin que nadie lo esté buscando: **los que atan
dos definiciones de la misma lista.** El repo tiene varias listas escritas en
dos lugares que tienen que coincidir y que nada obliga a coincidir.

- `GARAGE_THEMES` y el `check` de la migración 015.
- `SLOTS`, el tipo `GarageSlot` y el `check` de la migración 002.
- `LEVELS` y la cantidad de logros: el último nivel pide todos menos uno,
  para que un particular con un solo auto llegue sin "Tres autos activos". Si
  se suma un logro y no se toca la escalera, se gana con dos de menos.
- `LIMITS.city` y el presupuesto de 200 caracteres del preview: aflojar el tope
  deja los avisos de la provincia con el nombre más largo sin descripción.
- Las notas del blog y sus láminas de `public/og-blog-*.png`: escribir una nota
  y no correr `npm run og:blog` deja el link compartido con una imagen rota,
  que es peor que sin imagen.

Esos tests leen el SQL con `?raw` y lo comparan contra el TypeScript. Si uno
falla, **no lo ajustes al valor nuevo**: fijate cuál de las dos definiciones
quedó sola.

## Backend

**Supabase**: Postgres con RLS, Auth y Storage. El esquema completo está en
`supabase/schema.sql` y los cambios posteriores en `supabase/migrations/`; los dos
son idempotentes y se aplican pegándolos en el SQL Editor.

La URL y la anon key viven en `src/config/supabase-public.ts` y **no son secretos**:
la anon key está diseñada para viajar en el JavaScript del navegador. Lo que protege
la base es el RLS, activo en todas las tablas. La `service_role` key nunca va al repo.

Todo el acceso a datos pasa por `src/lib/api.ts`. Si algún día esto se muda a un
servidor propio, cambia el interior de esas funciones y ninguna pantalla se entera.

Dos cosas de RLS que conviene tener presentes al escribir queries:

- **RLS no rechaza los `UPDATE` y `DELETE`: los filtra.** Una escritura sobre una
  fila ajena devuelve OK con cero filas y sin error. Por eso las mutaciones piden
  `.select()` y tratan el resultado vacío como `NotAllowedError`.
- El `on delete cascade` limpia las filas de `listing_images`, pero **no** los
  archivos del bucket: eso se borra a mano en `deleteListing`.
