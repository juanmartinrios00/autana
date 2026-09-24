import { useEffect, useRef, useState } from 'react'
import { Link, NavLink, useLocation } from 'react-router-dom'
import { BRAND } from '../../config/brand'
import { useAuth } from '../../hooks/useAuth'
import { useUnseenNovedades } from '../../hooks/useUnseenNovedades'
import { Wordmark } from '../brand/Logo'
import { AccountMenu } from './AccountMenu'
import { Icon } from '../ui/Icon'
import { NavMenu } from './NavMenu'
import { isInGroup, NAV_GROUPS, visibleItems } from './nav-links'
import { NavSearch } from './NavSearch'

interface NavbarProps {
  /** `true` mientras la página está arriba de todo, sin scrollear. */
  atTop: boolean
  /**
   * `true` cuando hay que flotar sobre un hero oscuro: sin fondo y en blanco.
   *
   * Lo decide el layout con lo que declara cada pantalla, y no esta barra
   * mirando la ruta. Antes acá adentro decía `pathname === '/'`, así que la
   * portada quedaba bien y las otras seis que arrancan en tinta se llevaban una
   * barra blanca sobre fondo negro.
   */
  overHero: boolean
}

export function Navbar({ atTop, overHero }: NavbarProps) {
  const { session, signOut } = useAuth()
  const location = useLocation()
  const [menuOpen, setMenuOpen] = useState(false)
  /* El buscador en el celular: cerrado es una lupa. Ver `--nav-h` en el CSS. */
  const [searchOpen, setSearchOpen] = useState(false)
  const burgerRef = useRef<HTMLButtonElement>(null)
  const unseen = useUnseenNovedades()

  /* Escape y click afuera, igual que el menú de la cuenta, que está a dos
     centímetros de este y ya se comportaba así. Cerrar al navegar lo hace cada
     link en su `onClick` y no necesita efecto; esto escucha al documento, que
     es un sistema externo.

     Sin esto, el menú de celular sólo se cerraba tocando de nuevo la
     hamburguesa: tocar en cualquier otro lado de la pantalla no hacía nada, que
     es lo primero que uno prueba. */
  useEffect(() => {
    if (!menuOpen) return

    function handleKey(event: KeyboardEvent) {
      if (event.key !== 'Escape') return
      setMenuOpen(false)
      /* El foco vuelve a la hamburguesa: si se queda adentro de un menú que ya
         no está, quien navega con teclado pierde el lugar. */
      burgerRef.current?.focus()
    }

    function handleDown(event: MouseEvent) {
      const target = event.target as Node
      const panel = document.getElementById('mobile-navigation')
      if (panel?.contains(target) || burgerRef.current?.contains(target)) return
      setMenuOpen(false)
    }

    document.addEventListener('keydown', handleKey)
    document.addEventListener('mousedown', handleDown)
    return () => {
      document.removeEventListener('keydown', handleKey)
      document.removeEventListener('mousedown', handleDown)
    }
  }, [menuOpen])

  /* Tres estados: flotando sobre un hero oscuro, apoyada sobre el papel arriba
     de todo, y sólida en tinta apenas se scrollea. */
  const navbarClass = [
    'navbar',
    overHero ? 'navbar--over' : atTop ? '' : 'navbar--scrolled',
    searchOpen ? 'navbar--searching' : '',
  ]
    .filter(Boolean)
    .join(' ')

  return (
    <header className={navbarClass}>
      <div className="page navbar__inner">
        <button
          ref={burgerRef}
          type="button"
          className="navbar__burger"
          aria-label={menuOpen ? 'Cerrar menú' : 'Abrir menú'}
          aria-expanded={menuOpen}
          aria-controls="mobile-navigation"
          onClick={() => setMenuOpen((open) => !open)}
        >
          <Icon name={menuOpen ? 'close' : 'menu'} size={20} />
        </button>

        {/* El logotipo solo, sin el símbolo. Se probaron los dos lado a lado,
            con el texto del mismo alto. A 20 px la `a` del símbolo se pierde y
            queda un cuadrado amarillo con un aro, que repite la primera letra
            de la palabra; y el amarillo en esta barra es del botón de
            publicar: un segundo amarillo a la izquierda le compite. El símbolo
            va donde la marca firma sola: el pie, el favicon, las láminas. */}
        <Link to="/" className="navbar__brand" aria-label={`${BRAND}, inicio`}>
          <Wordmark className="navbar__logo" aria-hidden="true" />
        </Link>

        <NavSearch />

        {/* Sólo en el celular (lo esconde el CSS). Con el buscador siempre a la
            vista la barra medía dos filas y 108 px, que en una pantalla de 844
            son el 13% del alto en todas las pantallas del sitio. Cerrado es una
            lupa y la barra mide 64. */}
        <button
          type="button"
          className="navbar__search-toggle"
          aria-label={searchOpen ? 'Cerrar el buscador' : 'Buscar'}
          aria-expanded={searchOpen}
          aria-controls="navsearch-input"
          onClick={() => {
            const next = !searchOpen
            setSearchOpen(next)
            /* El foco después de que aparezca, si no el navegador no lo toma. */
            if (next) setTimeout(() => document.getElementById('navsearch-input')?.focus(), 50)
          }}
        >
          <Icon name={searchOpen ? 'close' : 'search'} size={20} />
        </button>

        {/* Cuatro entradas, tres con panel. Ver `nav-links`. */}
        <NavMenu withSession={Boolean(session)} />

        <div className="navbar__actions">
          {session && (
            /* La campanita va al lado del menú de la cuenta y no adentro: lo que
               está escondido en un menú no avisa nada. El número es de novedades
               sin ver, y desaparece en cero en vez de mostrar un "0". */
            <Link
              to="/novedades"
              className="navbar__bell"
              aria-label={
                unseen > 0
                  ? `Novedades: ${unseen} sin ver`
                  : 'Novedades'
              }
            >
              <Icon name="bell" size={19} />
              {unseen > 0 && (
                <span className="navbar__bell-count mono" aria-hidden="true">
                  {unseen > 9 ? '9+' : unseen}
                </span>
              )}
            </Link>
          )}
          {session ? (
            <AccountMenu user={session.user} onSignOut={() => void signOut()} />
          ) : (
            <Link to="/entrar" className="navbar__link navbar__desktop-only">
              Ingresar
            </Link>
          )}

          {/* Dice "Publicar" y nada más, en todos los tamaños. Decía "Publicar
              vehículo", y esa palabra de más eran 150 px que ahora se lleva el
              buscador: el botón amarillo se entiende igual. */}
          <Link to="/vender" className="navbar__cta">
            Publicar
          </Link>
        </div>

        <div
          id="mobile-navigation"
          className={menuOpen ? 'navbar__mobile is-open' : 'navbar__mobile'}
        >
          <nav className="navbar__mobile-links" aria-label="Principal para celulares">
            {/* Los mismos grupos que la barra de escritorio, uno abajo del
                otro con su rótulo: en el celular no hay paneles que abrir, y
                un acordeón adentro de un menú es un clic de más. */}
            {NAV_GROUPS.map((group) => {
              const items = group.items ? visibleItems(group, Boolean(session)) : null
              if (!items) {
                return (
                  <NavLink
                    key={group.id}
                    to={group.to!}
                    onClick={() => setMenuOpen(false)}
                    className={() =>
                      isInGroup(group, location.pathname)
                        ? 'navbar__mobile-link navbar__mobile-link--item navbar__mobile-link--solo is-active'
                        : 'navbar__mobile-link navbar__mobile-link--item navbar__mobile-link--solo'
                    }
                  >
                    <span className="navbar__mobile-item">
                      {group.icon && <Icon name={group.icon} size={17} />}
                      {group.label}
                    </span>
                  </NavLink>
                )
              }
              return (
                <div key={group.id} className="navbar__mobile-group">
                  <span className="navbar__mobile-label mono">{group.label}</span>
                  {items.map((item) => (
                    <Link
                      key={item.to}
                      to={item.to}
                      onClick={() => setMenuOpen(false)}
                      className={
                        location.pathname + location.search === item.to
                          ? 'navbar__mobile-link navbar__mobile-link--item is-active'
                          : 'navbar__mobile-link navbar__mobile-link--item'
                      }
                    >
                      <span className="navbar__mobile-item">
                        <Icon name={item.icon} size={17} />
                        {item.label}
                      </span>
                    </Link>
                  ))}
                </div>
              )
            })}
            {session ? (
              <>
                <span className="navbar__mobile-label mono">Tu cuenta</span>
                <Link to="/perfil" className="navbar__mobile-link" onClick={() => setMenuOpen(false)}>
                  Mi perfil <Icon name="arrowRight" size={18} />
                </Link>
                <Link
                  to="/mis-avisos"
                  className="navbar__mobile-link"
                  onClick={() => setMenuOpen(false)}
                >
                  Mis publicaciones <Icon name="arrowRight" size={18} />
                </Link>
                <Link
                  to={`/g/${session.user.id}`}
                  className="navbar__mobile-link"
                  onClick={() => setMenuOpen(false)}
                >
                  Mi garage <Icon name="arrowRight" size={18} />
                </Link>
                {/* Estaban en el menú de escritorio y faltaban acá, que es de
                    donde entra la mayoría. */}
                <Link
                  to="/novedades"
                  className="navbar__mobile-link"
                  onClick={() => setMenuOpen(false)}
                >
                  {unseen > 0 ? `Novedades (${unseen})` : 'Novedades'}{' '}
                  <Icon name="arrowRight" size={18} />
                </Link>
                <Link
                  to="/ajustes"
                  className="navbar__mobile-link"
                  onClick={() => setMenuOpen(false)}
                >
                  Ajustes <Icon name="arrowRight" size={18} />
                </Link>
                {/* Mismo criterio que en el menú de escritorio: cerrar sesión
                    al final y marcado, no mezclado con la navegación. */}
                <button
                  type="button"
                  className="navbar__mobile-link navbar__mobile-link--out"
                  onClick={() => {
                    setMenuOpen(false)
                    void signOut()
                  }}
                >
                  Cerrar sesión
                </button>
              </>
            ) : (
              <Link to="/entrar" className="navbar__mobile-link" onClick={() => setMenuOpen(false)}>
                Ingresar <Icon name="arrowRight" size={18} />
              </Link>
            )}
          </nav>
        </div>
      </div>
    </header>
  )
}
