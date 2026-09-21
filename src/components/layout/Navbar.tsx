import { useEffect, useRef, useState } from 'react'
import { Link, NavLink, useLocation } from 'react-router-dom'
import { BRAND } from '../../config/brand'
import { useAuth } from '../../hooks/useAuth'
import { useUnseenNovedades } from '../../hooks/useUnseenNovedades'
import { Wordmark } from '../brand/Logo'
import { AccountMenu } from './AccountMenu'
import { Icon } from '../ui/Icon'
import { NavSearch } from './NavSearch'

/* "Vender" no está: el botón amarillo "Publicar vehículo" lleva al mismo lugar
   y se ve en todos los tamaños. Su lugar lo toma el garage, que hasta acá era
   invisible para quien no tenía cuenta.

   `matches` es para marcar el link activo en más de una ruta: el garage vive
   repartido entre la página que lo explica, el de cada persona, el buscador y
   a quién seguís, y en cualquiera de esas uno está "en el garage". */
const links: { to: string; label: string; matches?: string[] }[] = [
  { to: '/autos', label: 'Comprar' },
  { to: '/garage', label: 'Garage', matches: ['/garage', '/g/', '/gente', '/siguiendo'] },
  { to: '/favoritos', label: 'Favoritos' },
  { to: '/comparar', label: 'Comparar' },
]

function isActiveLink(link: (typeof links)[number], pathname: string, routerActive: boolean) {
  if (!link.matches) return routerActive
  return link.matches.some((prefix) => pathname === prefix || pathname.startsWith(prefix.endsWith('/') ? prefix : `${prefix}/`))
}

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
  const navbarClass = overHero ? 'navbar navbar--over' : atTop ? 'navbar' : 'navbar navbar--scrolled'

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

        {/* Los links van en un grupo con hairlines entre medio, no sueltos. */}
        <nav className="navbar__links" aria-label="Principal">
          {links.map((link) => (
            <NavLink
              key={link.to}
              to={link.to}
              className={({ isActive }) =>
                isActiveLink(link, location.pathname, isActive) ? 'navbar__link is-active' : 'navbar__link'
              }
            >
              {link.label}
            </NavLink>
          ))}
        </nav>

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

          <Link to="/vender" className="navbar__cta">
            Publicar vehículo
          </Link>
        </div>

        <div
          id="mobile-navigation"
          className={menuOpen ? 'navbar__mobile is-open' : 'navbar__mobile'}
        >
          <nav className="navbar__mobile-links" aria-label="Principal para celulares">
            {links.map((link) => (
              <NavLink
                key={link.to}
                to={link.to}
                onClick={() => setMenuOpen(false)}
                className={({ isActive }) =>
                  isActiveLink(link, location.pathname, isActive)
                    ? 'navbar__mobile-link is-active'
                    : 'navbar__mobile-link'
                }
              >
                {link.label}
                <Icon name="arrowRight" size={18} />
              </NavLink>
            ))}
            {session ? (
              <>
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
                <Link to="/gente" className="navbar__mobile-link" onClick={() => setMenuOpen(false)}>
                  Buscar personas <Icon name="arrowRight" size={18} />
                </Link>
                <Link
                  to="/siguiendo"
                  className="navbar__mobile-link"
                  onClick={() => setMenuOpen(false)}
                >
                  Siguiendo <Icon name="arrowRight" size={18} />
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
