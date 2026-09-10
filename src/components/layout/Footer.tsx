import { Link } from 'react-router-dom'
import { Icon } from '../ui/Icon'

/* El pie es donde viven las pantallas que se leen una vez: explicaciones,
   legales, captación. Es a propósito y no por descarte — la navbar es para lo
   que se usa seguido, y meter ahí un desplegable con esto cuesta caro en
   celular, que es de donde entra la mayoría.

   Cuando sean más, se parten en grupos por tópico. Con cinco todavía no hace
   falta: agrupar cuatro cosas en dos columnas de dos es más ruido que ayuda. */
const links = [
  { to: '/dealers', label: 'Para concesionarias' },
  { to: '/levels', label: 'Los niveles' },
  { to: '/help', label: 'Ayuda' },
  { to: '/terms', label: 'Términos' },
  { to: '/privacy', label: 'Privacidad' },
]

export function Footer() {
  return (
    <footer className="footer">
      <div className="page footer__inner">
        <div className="footer__main">
          <Link to="/" className="footer__brand" aria-label="Autana, inicio">
            <span className="footer__mark" aria-hidden="true">
              <Icon name="car" size={18} />
            </span>
            <span>Autana</span>
          </Link>
          <p className="footer__claim">Comprar y vender un auto debería ser simple.</p>
        </div>

        <div className="footer__nav-block">
          <span className="footer__nav-label">Explorá Autana</span>
          <nav className="footer__links" aria-label="Enlaces del pie">
            {links.map((link) => (
              <Link key={link.to} to={link.to} className="footer__link">
                {link.label}
              </Link>
            ))}
          </nav>
        </div>

        <div className="footer__bottom">
          <span className="footer__note">© 2026 Autana</span>
          <span className="footer__note">Marketplace de vehículos · Argentina</span>
        </div>
      </div>
    </footer>
  )
}
