import { useEffect, useRef, useState } from 'react'
import { Link, NavLink, useLocation } from 'react-router-dom'
import { Icon } from '../ui/Icon'
import { isInGroup, NAV_GROUPS, visibleItems, type NavGroup } from './nav-links'
import './NavMenu.css'

/**
 * Las cuatro entradas de la barra en escritorio, con sus paneles.
 *
 * Es el patrón de "disclosure" y no un `role="menu"`: adentro hay links, y un
 * menú de ARIA promete flechas, letras y un foco que se mueve solo, que estos
 * links no hacen. Con botón y `aria-expanded` el lector anuncia lo que es, y el
 * Tab recorre los links como en cualquier otra parte.
 *
 * Se abre con clic y también al pasar el mouse, con una demora corta para
 * cerrarse: bajar en diagonal desde "Comprar" hasta el tercer ítem cruza el
 * borde del panel, y sin demora se cerraba en el camino. En pantallas táctiles
 * no hay hover, y el clic hace todo.
 *
 * El panel abierto recuerda en qué página se abrió. Al navegar ---tocando un
 * link del panel o cualquier otro--- la página cambia y el panel se cierra
 * solo, sin un efecto que mire la ruta ni un `onClick` en cada link.
 */
export function NavMenu({ withSession }: { withSession: boolean }) {
  const location = useLocation()
  const here = location.pathname + location.search
  const [abierto, setAbierto] = useState<{ id: string; en: string } | null>(null)
  const open = abierto?.en === here ? abierto.id : null
  const wrapRef = useRef<HTMLElement>(null)
  const closeTimer = useRef<number | undefined>(undefined)

  const abrir = (id: string) => {
    window.clearTimeout(closeTimer.current)
    setAbierto({ id, en: here })
  }
  const cerrarPronto = () => {
    window.clearTimeout(closeTimer.current)
    closeTimer.current = window.setTimeout(() => setAbierto(null), 160)
  }

  useEffect(() => () => window.clearTimeout(closeTimer.current), [])

  /* Escape y clic afuera, como el menú de la cuenta. */
  useEffect(() => {
    if (!open) return

    function handleKey(event: KeyboardEvent) {
      if (event.key !== 'Escape') return
      setAbierto(null)
      /* El foco vuelve al botón del panel que se cerró. */
      wrapRef.current?.querySelector<HTMLButtonElement>(`[data-group="${open}"]`)?.focus()
    }

    function handleDown(event: MouseEvent) {
      if (wrapRef.current && !wrapRef.current.contains(event.target as Node)) setAbierto(null)
    }

    document.addEventListener('keydown', handleKey)
    document.addEventListener('mousedown', handleDown)
    return () => {
      document.removeEventListener('keydown', handleKey)
      document.removeEventListener('mousedown', handleDown)
    }
  }, [open])

  return (
    <nav className="navbar__links" aria-label="Principal" ref={wrapRef}>
      {NAV_GROUPS.map((group) =>
        group.items ? (
          <div
            key={group.id}
            className="navmenu"
            onMouseEnter={() => {
              /* Sólo con un mouse de verdad: en un táctil el `mouseenter` llega
                 junto con el clic, abre, y el clic lo vuelve a cerrar. */
              if (window.matchMedia('(hover: hover)').matches) abrir(group.id)
            }}
            onMouseLeave={() => {
              if (window.matchMedia('(hover: hover)').matches) cerrarPronto()
            }}
            /* Si el foco se va del grupo con Tab, se cierra: si no, el panel
               queda abierto tapando la página mientras se escribe en otro lado. */
            onBlur={(event) => {
              if (!event.currentTarget.contains(event.relatedTarget as Node | null)) {
                setAbierto((actual) => (actual?.id === group.id ? null : actual))
              }
            }}
          >
            <button
              type="button"
              data-group={group.id}
              className={[
                'navbar__link',
                'navmenu__trigger',
                isInGroup(group, location.pathname) ? 'is-active' : '',
                open === group.id ? 'is-open' : '',
              ]
                .filter(Boolean)
                .join(' ')}
              aria-expanded={open === group.id}
              aria-controls={`navmenu-${group.id}`}
              onClick={() => {
                /* Con mouse, el panel ya se abrió al pasar por encima: el clic
                   que llega después lo cerraría justo cuando se lo quiere
                   usar. Ahí el clic sólo abre; cierra salir, Escape o afuera. */
                if (open === group.id && !window.matchMedia('(hover: hover)').matches) setAbierto(null)
                else abrir(group.id)
              }}
            >
              {group.label}
              <Icon name="chevronDown" size={12} className="navmenu__chevron" />
            </button>
            <Panel group={group} withSession={withSession} hidden={open !== group.id} />
          </div>
        ) : (
          <NavLink
            key={group.id}
            to={group.to!}
            className={() =>
              isInGroup(group, location.pathname) ? 'navbar__link is-active' : 'navbar__link'
            }
          >
            {group.label}
          </NavLink>
        ),
      )}
    </nav>
  )
}

function Panel({ group, withSession, hidden }: { group: NavGroup; withSession: boolean; hidden: boolean }) {
  const items = visibleItems(group, withSession)
  return (
    <div
      id={`navmenu-${group.id}`}
      className={items.length > 3 ? 'navmenu__panel navmenu__panel--wide' : 'navmenu__panel'}
      hidden={hidden}
    >
      {/* Rótulo en mono, como los datos de la cédula: dice dónde se está sin
          repetir el botón con letra grande. */}
      <p className="navmenu__kicker mono" aria-hidden="true">
        {group.label} · {items.length} secciones
      </p>
      <ul className="navmenu__items">
        {items.map((item) => (
          <li key={item.to}>
            <Link to={item.to} className="navmenu__item">
              <span className="navmenu__icon" aria-hidden="true">
                <Icon name={item.icon} size={18} />
              </span>
              <span className="navmenu__text">
                <span className="navmenu__label">{item.label}</span>
                <span className="navmenu__hint">{item.hint}</span>
              </span>
            </Link>
          </li>
        ))}
      </ul>
      {group.extra && (
        <Link to={group.extra.to} className="navmenu__extra">
          {group.extra.label}
          <Icon name="arrowRight" size={16} />
        </Link>
      )}
    </div>
  )
}
