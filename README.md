# Autana

Marketplace de compra y venta de vehículos. React + TypeScript sobre Vite.

> `Autana` es un nombre provisorio.

## Correr el proyecto

```bash
npm install
npm run dev
```

`npm run lint` (oxlint) · `npm run build` (typecheck + build).

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
  data/        mocks; se van cuando exista el backend
  lib/         capa de acceso a datos
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
- **Instrument Sans** para todo; **JetBrains Mono** (clase `.mono`) solo para datos
  duros: precios, kilometraje, años, cilindrada.
- El borde de las superficies lo hace un `inset` box-shadow; la sombra real aparece
  únicamente en hover y en overlays.
- Movimiento: 150–300 ms, `ease-out`, `transform` y `opacity`.

## Backend

Todavía no existe. Los tipos de `src/types/index.ts` son el contrato previsto y
`src/lib/` es la única capa que va a cambiar cuando esté el servidor (planeado en Go).
