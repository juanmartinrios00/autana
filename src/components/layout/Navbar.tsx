import { useState } from 'react'
import { Link, NavLink, useLocation } from 'react-router-dom'
import { useAuth } from '../../hooks/useAuth'
import { Icon } from '../ui/Icon'
import { NavSearch } from './NavSearch'

const links = [
  { to: '/cars', label: 'Comprar' },
  { to: '/sell', label: 'Vender' },
  { to: '/favorites', label: 'Favoritos' },
  { to: '/compare', label: 'Comparar' },
]

interface NavbarProps {
  /** `true` mientras la página está arriba de todo, sin scrollear. */
  atTop: boolean
}

export function Navbar({ atTop }: NavbarProps) {
  const { session, signOut } = useAuth()
  const location = useLocation()
  const [menuOpen, setMenuOpen] = useState(false)

  /* La home tiene un hero oscuro a sangre: ahí la navbar flota encima, sin
     fondo. En cuanto se scrollea, o en cualquier otra página, se vuelve
     sólida para no perder legibilidad sobre el contenido blanco. */
  const overHero = location.pathname === '/' && atTop
  const navbarClass = overHero ? 'navbar navbar--over' : atTop ? 'navbar' : 'navbar navbar--scrolled'

  return (
    <header className={navbarClass}>
      <div className="page navbar__inner">
        <button
          type="button"
          className="navbar__burger"
          aria-label={menuOpen ? 'Cerrar menú' : 'Abrir menú'}
          aria-expanded={menuOpen}
          aria-controls="mobile-navigation"
          onClick={() => setMenuOpen((open) => !open)}
        >
          <Icon name={menuOpen ? 'close' : 'menu'} size={20} />
        </button>

        <Link to="/" className="navbar__brand">
          <span className="navbar__mark" aria-hidden="true">
            <Icon name="car" size={17} />
          </span>
          <span className="navbar__wordmark">Autana</span>
        </Link>

        <NavSearch />

        {/* Los links van en un grupo con hairlines entre medio, no sueltos. */}
        <nav className="navbar__links" aria-label="Principal">
          {links.map((link) => (
            <NavLink
              key={link.to}
              to={link.to}
              className={({ isActive }) => (isActive ? 'navbar__link is-active' : 'navbar__link')}
            >
              {link.label}
            </NavLink>
          ))}
        </nav>

        <div className="navbar__actions">
          {session ? (
            <>
              <button
                type="button"
                className="navbar__link navbar__desktop-only"
                onClick={() => void signOut()}
              >
                Salir
              </button>
              <Link
                to="/profile"
                className="navbar__avatar"
                title={`${session.user.name} — ver mi perfil`}
                aria-label="Mi perfil y garage"
              >
                {session.user.avatarUrl ? (
                  <img src={session.user.avatarUrl} alt="" className="navbar__avatar-img" />
                ) : (
                  <Icon name="user" size={19} />
                )}
              </Link>
            </>
          ) : (
            <Link to="/login" className="navbar__link navbar__desktop-only">
              Ingresar
            </Link>
          )}

          <Link to="/sell" className="navbar__cta">
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
                  isActive ? 'navbar__mobile-link is-active' : 'navbar__mobile-link'
                }
              >
                {link.label}
                <Icon name="arrowRight" size={18} />
              </NavLink>
            ))}
            {session ? (
              <>
                <Link to="/profile" className="navbar__mobile-link" onClick={() => setMenuOpen(false)}>
                  Mi perfil <Icon name="arrowRight" size={18} />
                </Link>
                <button
                  type="button"
                  className="navbar__mobile-link"
                  onClick={() => {
                    setMenuOpen(false)
                    void signOut()
                  }}
                >
                  Salir
                </button>
              </>
            ) : (
              <Link to="/login" className="navbar__mobile-link" onClick={() => setMenuOpen(false)}>
                Ingresar <Icon name="arrowRight" size={18} />
              </Link>
            )}
          </nav>
        </div>
      </div>
    </header>
  )
}
