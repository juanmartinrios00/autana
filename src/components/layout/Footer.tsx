import { Link } from 'react-router-dom'

const links = [
  { to: '/help', label: 'Ayuda' },
  { to: '/terms', label: 'Términos' },
  { to: '/privacy', label: 'Privacidad' },
  { to: '/dealers', label: 'Para concesionarias' },
]

export function Footer() {
  return (
    <footer className="footer">
      <div className="page footer__inner">
        <span className="footer__note">© 2026 Autana · Marketplace de vehículos</span>
        <nav className="footer__links" aria-label="Enlaces del pie">
          {links.map((link) => (
            <Link key={link.to} to={link.to} className="footer__link">
              {link.label}
            </Link>
          ))}
        </nav>
      </div>
    </footer>
  )
}
