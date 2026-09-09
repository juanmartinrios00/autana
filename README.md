# Autana

Marketplace de compra y venta de vehículos. React + TypeScript sobre Vite.

> `Autana` es un nombre provisorio.

## Correr el proyecto

```bash
npm install
npm run dev
```

`npm run lint` (oxlint) · `npm run build` (typecheck + build).

## Deploy

**Se despliega solo al pushear a `main`.** Cloudflare buildea desde el repo y
publica; no hay que correr nada a mano.

No hay script `deploy` a propósito. Cuando existían los dos caminos —el push y
un `wrangler deploy` local— cada publicación disparaba dos builds con quince
segundos de diferencia, y ganaba el que terminaba último. Con el mismo commit
da igual, pero alcanza con que un día corras el manual desde un working tree
desactualizado para publicar código viejo sin enterarte.

Si alguna vez hace falta publicar a mano (Cloudflare caído, un rollback
urgente), el comando es `npm run build && npx wrangler deploy`. Que sea de
escribir y no de tipear `npm run deploy` es parte del punto.

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
  data/        catálogos estáticos: marcas, provincias, topes de precio
  lib/         capa de acceso a datos
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
- Los neutros tienen temperatura cálida deliberada. No son grises fríos.
- **Archivo** para titulares y **Instrument Sans** para la UI y los formularios;
  **JetBrains Mono** (clase `.mono`) solo para datos duros: precios, kilometraje,
  años, cilindrada.
- Todo va redondeado, con el radio creciendo con el tamaño del bloque (`--r-xs`
  a `--r-2xl`, y `--r-pill` para cápsulas y círculos). Las secciones son planos
  redondeados con aire alrededor, no bandas a sangre entre hairlines.
- La profundidad la dan sombras suaves en capas (`--sh-flat` … `--sh-overlay`):
  contorno claro, sombra corta que apoya y sombra difusa que despega. El hover
  levanta el bloque y profundiza la sombra; nunca lo desplaza.
- Movimiento: 150–300 ms, `ease-out`, `transform` y `opacity`.

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
