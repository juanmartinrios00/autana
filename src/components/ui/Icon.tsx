import type { SVGProps } from 'react'

/**
 * Set de iconos propio: trazo fino sobre grilla de 24, puntas rectas y uniones
 * en ángulo. Las puntas redondeadas se leen amables; las rectas se leen
 * técnicas, que es el registro que busca el resto de la interfaz.
 *
 * Sin librería externa y sin emoji. `currentColor` para que hereden el color
 * del contexto.
 */
const paths = {
  /* Flechas largas y planas, con la punta corta: se leen como un vector, no
     como una viñeta. */
  arrowRight: <><path d="M3 12h17" /><path d="M14 6.5 20 12l-6 5.5" /></>,
  arrowLeft: <><path d="M21 12H4" /><path d="M10 6.5 4 12l6 5.5" /></>,
  chevronDown: <path d="m5.5 9 6.5 6 6.5-6" />,
  search: <><circle cx="10.5" cy="10.5" r="6.5" /><path d="M20.5 20.5 15.5 15.5" /></>,
  heart: <path d="M12 20.6 3.9 12.4a4.9 4.9 0 0 1 7-6.9l1.1 1.1 1.1-1.1a4.9 4.9 0 0 1 7 6.9z" />,
  check: <path d="m3.5 12.5 5.5 5.5L20.5 6.5" />,
  close: <><path d="M4.5 4.5 19.5 19.5" /><path d="M19.5 4.5 4.5 19.5" /></>,
  menu: <><path d="M3 6.5h18" /><path d="M3 12h18" /><path d="M3 17.5h18" /></>,
  plus: <><path d="M12 3.5v17" /><path d="M3.5 12h17" /></>,
  mapPin: <><path d="M12 21.5 5.5 13.2a7.2 7.2 0 1 1 13 0z" /><path d="M9.5 9.5h5v5h-5z" /></>,
  message: <><path d="M3.5 4.5h17v12h-11l-6 4.5z" /></>,
  /* Perfil lateral de auto, en trazo: da el mismo registro técnico. */
  car: <><path d="M2.5 16.5v-3l2-5h15l2 5v3" /><path d="M2.5 16.5h19v2.5h-19z" /><path d="M6.5 19v1.5" /><path d="M17.5 19v1.5" /><path d="M7 8.5v3" /><path d="M17 8.5v3" /></>,
  grid: <><path d="M3.5 3.5h7v7h-7z" /><path d="M13.5 3.5h7v7h-7z" /><path d="M3.5 13.5h7v7h-7z" /><path d="M13.5 13.5h7v7h-7z" /></>,
  list: <><path d="M3.5 6.5h17" /><path d="M3.5 12h17" /><path d="M3.5 17.5h17" /></>,
} as const

export type IconName = keyof typeof paths

interface IconProps extends Omit<SVGProps<SVGSVGElement>, 'name'> {
  name: IconName
  size?: number
  /** Solo si el icono transmite información que no está en el texto. */
  title?: string
}

export function Icon({ name, size = 18, title, ...rest }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.4}
      strokeLinecap="square"
      strokeLinejoin="miter"
      role={title ? 'img' : undefined}
      aria-hidden={title ? undefined : true}
      focusable="false"
      {...rest}
    >
      {title && <title>{title}</title>}
      {paths[name]}
    </svg>
  )
}
