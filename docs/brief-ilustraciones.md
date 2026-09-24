# Brief de ilustraciones — auteando

Para quien dibuje (Codex, un ilustrador o una persona con Figma). Todo lo que
está acá entra en el sitio sin tocar ninguna pantalla: cada pieza tiene su
lugar ya preparado y su archivo.

Antes de empezar, abrí **`/sistema`** en el sitio (o `npm run dev` y
`localhost:5173/sistema`). Ahí están juntas todas las piezas que ya existen:
los 38 íconos, las obleas de los logros, las escenas del garage y de los
niveles, y los dos dibujos de los encabezados. Lo nuevo tiene que parecer
dibujado por la misma mano.

---

## El registro

Dibujo de línea, técnico, casi de plano. No es ilustración "amable" de
startup: nada de personajes redondeados, degradados, manchas de color ni
perspectivas 3D. La referencia son los planos, los carteles viales y las
chapas de un auto argentino, no un banco de imágenes.

**Reglas que no se negocian** (las mismas del contrato en
`src/components/garage/scenes.tsx`):

1. **SVG inline, como componente de React.** Nada de `<image>`, PNG, JPG ni
   WebP. Pesan poco, escalan y siguen al tema.
2. **Trazo en `currentColor`, relleno `none`.** Sin colores fijos: el dibujo
   hereda el color del contenedor, y así sirve igual sobre fondo claro y
   oscuro.
3. **Un solo acento** amarillo por dibujo, con `stroke="var(--accent)"` o
   `fill="var(--accent)"`. Uno. El amarillo en este sistema es para la acción;
   si toda la escena es amarilla deja de señalar nada.
4. **Puntas y uniones rectas:** `strokeLinecap="square"` y
   `strokeLinejoin="miter"`. Las redondeadas se leen amables; las rectas,
   técnicas.
5. **Grosor de trazo:** 2 en las escenas (viewBox de 320 o 240 de ancho), 1.6
   en los encabezados (440 de ancho). Detalles finos a 1.2, como mínimo.
6. **Sin `id` repetidos** entre dibujos: varios conviven en la misma página.
   Si hace falta un `id` (un `textPath`, por ejemplo), sacalo de `useId()`.
7. **`aria-hidden="true"` y `focusable="false"`.** El dibujo acompaña un texto
   que ya dice lo mismo; el lector de pantalla no lo tiene que anunciar.
8. **Texto adentro del dibujo, sólo en `var(--font-mono)`**, en mayúsculas y
   corto: una patente, un número de cochera, un KM. Si un texto es importante,
   va afuera, en HTML.

Atributos base para copiar (salen de `src/components/ui/sketch.ts`):

```tsx
<svg
  viewBox="0 0 240 150"
  fill="none"
  stroke="currentColor"
  strokeWidth={2}
  strokeLinecap="square"
  strokeLinejoin="miter"
  aria-hidden="true"
  focusable="false"
  className={className}
>
```

---

## 1. Estados vacíos (lo más importante)

**Dónde van:** en `src/components/ui/empty-scenes.tsx`. Cada dibujo es un
componente `({ className }) => <svg …>`, y se registra en el mapa
`EMPTY_SCENES` con su nombre. Las pantallas ya lo piden: apenas está en el
mapa, aparece. Hasta entonces se ve el ícono de siempre.

**Medida:** `viewBox="0 0 240 150"`. Se muestra a 240 px de ancho como
máximo, centrado sobre un fondo gris claro, arriba del título.

| Nombre | Dónde aparece | Idea |
|---|---|---|
| `sinResultados` | Una búsqueda de autos, de gente o de la ayuda que no encontró nada | Una ruta recta que se pierde en el horizonte, vacía, con un cartel vial al costado. **Acento:** el cartel. |
| `noExiste` | Un aviso que ya no está, una nota o un perfil que no existe, y la página 404 | El cartel de "calle sin salida": el rectángulo con la T. Puede haber un cordón y una baldosa. **Acento:** la barra de la T. |
| `sinConexion` | No se pudo cargar algo: la conexión o la base | Un auto parado en la banquina con las balizas puestas (el triángulo detrás). **Acento:** el triángulo. *No* el capó levantado: ese ya lo usa el nivel "Fierrero". |
| `sinFavoritos` | Favoritos, sin ningún auto guardado | Un parabrisas visto desde adentro, limpio, sin nada pegado, con el espejo retrovisor. **Acento:** un corazón chico en el lugar donde iría la oblea, en punteado. |
| `sinNovedades` | Novedades, antes de que pase nada | Un buzón de chapa de pie, cerrado, con la banderita baja. **Acento:** la banderita. |
| `sinComparar` | Comparar, sin ningún auto elegido | Dos o tres lugares de estacionamiento vacíos uno al lado del otro, vistos desde arriba, con los números pintados (como el encabezado del garage). **Acento:** el borde de uno de los lugares. |

**Qué dejar libre:** nada en particular; el dibujo va solo, arriba del texto.
Que se entienda a 160 px de ancho (es lo que mide en un celular chico).

---

## 2. Las siluetas de los autos del garage

**Dónde van:** `src/components/garage/silhouettes.ts`. Son seis carrocerías
(sedán, hatchback, SUV, pick-up, coupé, utilitario) de perfil. La escena del
garage las usa para dibujar el auto que cada persona cargó.

**Hoy:** son correctas pero genéricas; un sedán podría ser cualquier sedán.

**Qué pedir:** que cada una tenga una proporción reconocible de auto de la
calle argentina —el sedán tipo Corolla o Cruze, el hatch tipo Gol, la pick-up
tipo Hilux o Amarok, el utilitario tipo Kangoo— sin copiar ningún modelo ni
ninguna marca. Más detalle en la línea de las ventanas, los pasaruedas y los
paragolpes; no más líneas en general.

**Qué respetar:** la estructura de `Silhouette` en ese archivo (el cuerpo, los
detalles, dónde van las ruedas y los paragolpes) y la línea del piso en
`y = 158`. Las ruedas las dibuja el componente, no la silueta.

---

## 3. Las cuatro escenas del garage (fondos)

**Dónde van:** `src/components/garage/scenes.tsx`, los cuatro `Backdrop`. El
contrato completo está arriba de ese archivo; leelo antes.

**Hoy:** el farol de la cuadra (el primero), la casa (el de hoy), la ruta con
montañas (el soñado) y el box vacío (el que se extraña). Están bien como idea
y flojos como dibujo.

**Qué pedir:** más lugar y más detalle en el fondo, sin tocar el hueco donde
va el auto (`PLACEMENT` en el mismo archivo). Ideas: en "Mi primer auto", la
vereda con el árbol y la baldosa; en "El que tengo hoy", el portón y el
medidor de gas; en "El soñado", la ruta 40 con el cartel verde; en "El que
extraño", el taller o el box con la mancha de aceite.

`viewBox="0 0 320 200"`, un solo acento, y el acento lo lleva el fondo, nunca
el auto.

---

## 4. Las cuatro escenas de niveles

**Dónde van:** `src/components/levels/scenes.tsx`. Recién llegado (la llave),
En marcha (el auto con el cartel), Fierrero (el capó levantado y la llave
inglesa) y Referente (la persona al lado del auto con dos globos de diálogo).

**Qué pedir:** lo mismo que en el garage: mismo concepto, mejor dibujo.
`viewBox="0 0 320 200"`.

---

## Lo que **no** conviene pedir afuera

Estas piezas son código más que dibujo, y ya están hechas o las hacemos acá:

- **Los íconos.** Tienen reglas muy estrictas de grilla y se prueban contra la
  interfaz. Si falta uno, se agrega en `src/components/ui/icon-paths.tsx`
  siguiendo a los otros.
- **Las obleas de los logros** (`src/components/levels/Oblea.tsx`).
- **Los dibujos de los encabezados** (la cochera, los mojones y la agencia).

---

## Cómo se entrega

Un commit por pieza (o por grupo: "los seis estados vacíos"), con el
componente en su archivo y sin tocar las pantallas. Antes de entregar:

```sh
npm run lint
npx tsc -b
npm test
```

Y mirar `/sistema` y la pantalla donde va, en el celular y en la computadora.
