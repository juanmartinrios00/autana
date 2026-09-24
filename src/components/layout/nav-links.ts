import { BRAND } from '../../config/brand'
import { MAX_COMPARE } from '../../context/compare-context'
import type { IconName } from '../ui/icon-paths'

/**
 * El mapa del sitio, escrito una vez.
 *
 * Lo leen la navbar, el menú del celular y el pie. Antes cada uno tenía su
 * lista: la navbar cinco links sueltos, el pie quince repartidos en tres
 * grupos con otros nombres, y el menú del celular una tercera versión. Una
 * pantalla nueva había que acordarse de sumarla en tres lugares, y lo normal
 * era que quedara en uno solo ---el blog y la ayuda vivían sólo en el pie, que
 * en un celular es el último lugar que alguien mira---.
 *
 * Arriba van cuatro entradas y no cinco. Tres abren un panel con todo lo de su
 * tema y la cuarta, Favoritos, es un link: es lo único de la barra que la misma
 * persona toca varias veces por visita, y esconderlo detrás de un clic más no
 * tiene sentido. Lo que sale de la barra le deja lugar al buscador, que es lo
 * principal de un marketplace y se tiene que notar por tamaño.
 */

export interface NavItem {
  to: string
  label: string
  /** Una línea que dice qué hay adentro. En el panel, no en el pie. */
  hint: string
  icon: IconName
  /** Sólo con sesión: `/siguiendo` sin cuenta es una pantalla de ingreso. */
  session?: boolean
}

export interface NavGroup {
  id: string
  label: string
  /** Prefijos de ruta en los que uno "está" en este grupo, para marcarlo. */
  matches: string[]
  /** Sin `items` la entrada es un link directo a `to`, con este ícono en el celular. */
  to?: string
  icon?: IconName
  items?: NavItem[]
  /** La invitación del pie del panel: lo que sigue para quien llegó hasta acá. */
  extra?: { to: string; label: string }
}

export const NAV_GROUPS: NavGroup[] = [
  {
    id: 'comprar',
    label: 'Comprar',
    matches: ['/autos', '/explorar', '/comparar', '/agencias'],
    items: [
      { to: '/autos', label: 'Todos los autos', hint: 'Con filtros por precio, año y kilómetros', icon: 'search' },
      { to: '/explorar', label: 'Explorar', hint: 'Por marca, carrocería o presupuesto', icon: 'grid' },
      { to: '/autos?rebajados=1', label: 'Bajaron de precio', hint: 'Los que se rebajaron este mes', icon: 'trendDown' },
      { to: '/agencias', label: 'Concesionarias', hint: 'Agencias verificadas y sus autos', icon: 'store' },
      { to: '/comparar', label: 'Comparar', hint: `Hasta ${MAX_COMPARE} autos, lado a lado`, icon: 'compare' },
    ],
    extra: { to: '/vender', label: '¿Vendés el tuyo? Publicalo gratis' },
  },
  {
    id: 'garage',
    label: 'Garage',
    matches: ['/garage', '/g/', '/gente', '/siguiendo', '/niveles'],
    items: [
      { to: '/garage', label: `Garage ${BRAND}`, hint: 'Los autos de la gente, con su historia', icon: 'car' },
      { to: '/gente', label: 'Buscar personas', hint: 'Encontrá el garage de alguien', icon: 'users' },
      { to: '/siguiendo', label: 'Siguiendo', hint: 'Los garages que seguís', icon: 'user', session: true },
      { to: '/niveles', label: 'Niveles y logros', hint: 'Las obleas que se ganan usando el sitio', icon: 'flag' },
    ],
    extra: { to: '/garage/mio', label: 'Cargá tu primer auto' },
  },
  {
    id: 'favoritos',
    label: 'Favoritos',
    matches: ['/favoritos'],
    to: '/favoritos',
    icon: 'heart',
  },
  {
    id: 'ayuda',
    label: 'Ayuda',
    matches: ['/ayuda', '/blog', '/contacto'],
    items: [
      { to: '/ayuda', label: 'Centro de ayuda', hint: 'Cómo comprar, vender y cuidarse', icon: 'help' },
      { to: '/blog', label: 'Blog', hint: 'Guías y notas para elegir mejor', icon: 'news' },
      { to: '/contacto', label: 'Contacto', hint: 'Para lo que no está en la ayuda', icon: 'mail' },
    ],
  },
]

/** Lo que se lee una vez y sólo va en el pie. */
export const LEGAL_LINKS = [
  { to: '/terminos', label: 'Términos' },
  { to: '/privacidad', label: 'Privacidad' },
]

/** Si `pathname` cae dentro de alguno de los prefijos. */
export function isInGroup(group: Pick<NavGroup, 'matches'>, pathname: string) {
  return group.matches.some((prefix) =>
    prefix.endsWith('/')
      ? pathname.startsWith(prefix)
      : pathname === prefix || pathname.startsWith(`${prefix}/`),
  )
}

/** Los ítems que se muestran: sin sesión se van los que la piden. */
export function visibleItems(group: NavGroup, withSession: boolean) {
  return (group.items ?? []).filter((item) => withSession || !item.session)
}
