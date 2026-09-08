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

function initials(name: string): string {
  return name
    .split(' ')
    .slice(0, 2)
    .map((word) => word[0]?.toUpperCase() ?? '')
    .join('')
}

interface NavbarProps {
  /** `true` mientras la página está arriba de todo, sin scrollear. */
  atTop: boolean
}

export function Navbar({ atTop }: NavbarProps) {
  const { session, signOut } = useAuth()
  const location = useLocation()

  /* La home tiene un hero oscuro a sangre: ahí la navbar flota encima, sin
     fondo. En cuanto se scrollea, o en cualquier otra página, se vuelve
     sólida para no perder legibilidad sobre el contenido blanco. */
  const overHero = location.pathname === '/' && atTop

  return (
    <header className={overHero ? 'navbar navbar--over' : 'navbar'}>
      <div className="page navbar__inner">
        <button type="button" className="navbar__burger" aria-label="Abrir menú">
          <Icon name="menu" size={20} />
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
                {initials(session.user.name)}
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
      </div>
    </header>
  )
}
