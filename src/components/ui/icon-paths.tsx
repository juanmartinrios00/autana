import type { ReactElement } from 'react'

/**
 * Set de iconos propio: trazo fino sobre grilla de 24, puntas rectas y uniones
 * en ángulo. Las puntas redondeadas se leen amables; las rectas se leen
 * técnicas, que es el registro que busca el resto de la interfaz.
 *
 * Sin librería externa y sin emoji. `currentColor` para que hereden el color
 * del contexto.
 */
export const paths = {
  /* Flechas largas y planas, con la punta corta: se leen como un vector, no
     como una viñeta. */
  arrowRight: <><path d="M3 12h17" /><path d="M14 6.5 20 12l-6 5.5" /></>,
  arrowLeft: <><path d="M21 12H4" /><path d="M10 6.5 4 12l6 5.5" /></>,
  /* La flecha de codo, para los botones oscuros. Baja y dobla a la derecha:
     no empuja hacia adelante como una flecha recta, sugiere "lo que sigue".
     Va con trazo más fino que el resto del set — en un botón lleno el 1.4
     la engorda y se come la elegancia. */
  arrowCorner: <><path d="M7 5v11h11" /><path d="M14.5 12.5 18 16l-3.5 3.5" /></>,
  chevronDown: <path d="m5.5 9 6.5 6 6.5-6" />,
  search: <><circle cx="10.5" cy="10.5" r="6.5" /><path d="M20.5 20.5 15.5 15.5" /></>,
  heart: <path d="M12 20.6 3.9 12.4a4.9 4.9 0 0 1 7-6.9l1.1 1.1 1.1-1.1a4.9 4.9 0 0 1 7 6.9z" />,
  check: <path d="m3.5 12.5 5.5 5.5L20.5 6.5" />,
  close: <><path d="M4.5 4.5 19.5 19.5" /><path d="M19.5 4.5 4.5 19.5" /></>,
  menu: <><path d="M3 6.5h18" /><path d="M3 12h18" /><path d="M3 17.5h18" /></>,
  user: <><circle cx="12" cy="8" r="4" /><path d="M4.5 21c.5-4.1 3.3-6.5 7.5-6.5s7 2.4 7.5 6.5" /></>,
  camera: <><path d="M3 7.5h4l1.5-2h7l1.5 2h4v12H3z" /><circle cx="12" cy="13.5" r="3.5" /></>,
  plus: <><path d="M12 3.5v17" /><path d="M3.5 12h17" /></>,
  link: <><path d="M10.5 13.5a4.5 4.5 0 0 0 6.4 0l2.6-2.6a4.5 4.5 0 0 0-6.4-6.4l-1.5 1.5" /><path d="M13.5 10.5a4.5 4.5 0 0 0-6.4 0l-2.6 2.6a4.5 4.5 0 0 0 6.4 6.4l1.5-1.5" /></>,
  mapPin: <><path d="M12 21.5 5.5 13.2a7.2 7.2 0 1 1 13 0z" /><path d="M9.5 9.5h5v5h-5z" /></>,
  message: <><path d="M3.5 4.5h17v12h-11l-6 4.5z" /></>,
  /* La campana de las novedades: cuerpo recto y badajo como una raya, sin curvas
     de más, para que no desentone con el resto del set. */
  bell: <><path d="M5.5 17V11a6.5 6.5 0 0 1 13 0v6l1.5 1.5h-16z" /><path d="M10 21.5h4" /></>,
  /* Perfil lateral de auto, en trazo: da el mismo registro técnico. */
  car: <><path d="M2.5 16.5v-3l2-5h15l2 5v3" /><path d="M2.5 16.5h19v2.5h-19z" /><path d="M6.5 19v1.5" /><path d="M17.5 19v1.5" /><path d="M7 8.5v3" /><path d="M17 8.5v3" /></>,
  grid: <><path d="M3.5 3.5h7v7h-7z" /><path d="M13.5 3.5h7v7h-7z" /><path d="M3.5 13.5h7v7h-7z" /><path d="M13.5 13.5h7v7h-7z" /></>,
  list: <><path d="M3.5 6.5h17" /><path d="M3.5 12h17" /><path d="M3.5 17.5h17" /></>,

  /* --- Datos del auto. Van en la ficha, al lado de cada dato: se reconocen
     de un vistazo y dejan que el texto sea sólo el valor. --- */
  calendar: <><path d="M3.5 5.5h17v15h-17z" /><path d="M3.5 10h17" /><path d="M8 3v5" /><path d="M16 3v5" /></>,
  /* El odómetro: medio cuadrante, la aguja y dos marcas en la base. */
  gauge: <><path d="M3.5 17a8.5 8.5 0 0 1 17 0" /><path d="m12 17 4.5-5.5" /><path d="M3.5 17h3" /><path d="M17.5 17h3" /></>,
  /* El surtidor, con la manguera colgando al costado. */
  fuel: <><path d="M4.5 20.5v-17h9v17" /><path d="M3 20.5h12" /><path d="M4.5 9.5h9" /><path d="M13.5 7.5h2.5l3 3v7a1.5 1.5 0 0 1-3 0v-3.5h-2.5" /></>,
  /* La H de la palanca de cambios. */
  gearbox: <><circle cx="5" cy="4.5" r="1.5" /><circle cx="12" cy="4.5" r="1.5" /><circle cx="19" cy="4.5" r="1.5" /><circle cx="5" cy="19.5" r="1.5" /><circle cx="12" cy="19.5" r="1.5" /><path d="M5 6v12" /><path d="M12 6v12" /><path d="M19 6v6" /><path d="M5 12h14" /></>,
  engine: <><path d="M5.5 9.5h11l2 2.5v4l-2 2.5h-11z" /><path d="M8 9.5v-3h6v3" /><path d="M5.5 14h-3" /><path d="M2.5 12v4" /><path d="M18.5 14h3" /></>,
  /* Las cuatro ruedas y los ejes, vistos desde arriba. */
  drivetrain: <><path d="M3.5 3.5h4v6h-4z" /><path d="M16.5 3.5h4v6h-4z" /><path d="M3.5 14.5h4v6h-4z" /><path d="M16.5 14.5h4v6h-4z" /><path d="M7.5 6.5h9" /><path d="M7.5 17.5h9" /><path d="M12 6.5v11" /></>,
  door: <><path d="M4.5 20.5v-9l6-7.5h9v16.5z" /><path d="M4.5 11.5h15" /><path d="M15 14.5h2" /></>,
  /* Una gota de pintura. */
  paint: <path d="M12 3 6.3 11a6.6 6.6 0 1 0 11.4 0z" />,
  power: <path d="M13.5 2.5 5.5 13.5h6l-1 8 8-11h-6z" />,

  /* --- Acciones --- */
  share: <><path d="M12 3.5v12" /><path d="m7.5 8 4.5-4.5L16.5 8" /><path d="M8 11.5H4.5v9h15v-9H16" /></>,
  edit: <><path d="M4 20l1-4.5L15.5 5 19 8.5 8.5 19z" /><path d="m13 7.5 3.5 3.5" /></>,
  trash: <><path d="M4 6.5h16" /><path d="M9 6.5v-3h6v3" /><path d="m6 6.5 1 14h10l1-14" /><path d="M10 10.5v6" /><path d="M14 10.5v6" /></>,
  eye: <><path d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12z" /><circle cx="12" cy="12" r="3" /></>,
  /* Dos perillas deslizantes: filtrar. `list` sigue siendo la vista en filas. */
  filter: <><path d="M3.5 7h10" /><path d="M17.5 7h3" /><path d="M13.5 4.5h4v5h-4z" /><path d="M3.5 17h3" /><path d="M10.5 17h10" /><path d="M6.5 14.5h4v5h-4z" /></>,
  sort: <><path d="M7.5 20V4" /><path d="m3.5 8 4-4 4 4" /><path d="M16.5 4v16" /><path d="m12.5 16 4 4 4-4" /></>,
  flag: <><path d="M5 21.5v-18" /><path d="M5 4.5h13l-2.5 4.5 2.5 4.5H5" /></>,

  /* --- Estados --- */
  shield: <><path d="M12 2.5 4.5 5.5v6c0 4.5 3.2 8 7.5 10 4.3-2 7.5-5.5 7.5-10v-6z" /><path d="m8.5 12 2.5 2.5 4.5-5" /></>,
  tag: <><path d="M3.5 3.5h8l9 9-8 8-9-9z" /><circle cx="8" cy="8" r="1.5" /></>,
  /* Bajó de precio: la línea cae y sigue cayendo. */
  trendDown: <><path d="m3 6.5 6.5 6.5 4-4 7.5 7.5" /><path d="M21 11v5.5h-5.5" /></>,
} as const satisfies Record<string, ReactElement>

export type IconName = keyof typeof paths

/** Todos, en el orden en que están dibujados. Para el catálogo de `/sistema`. */
export const iconNames = Object.keys(paths) as IconName[]

