import { Link } from 'react-router-dom'
import { BRAND } from '../../config/brand'
import { Icon } from '../ui/Icon'

/* El pie es donde viven las pantallas que se leen una vez: explicaciones,
   legales, captación. Es a propósito y no por descarte — la navbar es para lo
   que se usa seguido, y meter ahí un desplegable con esto cuesta caro en
   celular, que es de donde entra la mayoría.

   Cuando sean más, se parten en grupos por tópico. Con seis todavía no hace
   falta: agrupar en dos columnas de tres es más ruido que ayuda. */
const linkGroups = [
  {
    label: 'Marketplace',
    links: [
      { to: '/cars', label: 'Comprar un auto' },
      { to: '/sell', label: 'Publicar un vehículo' },
      { to: '/favorites', label: 'Favoritos' },
      { to: '/compare', label: 'Comparar vehículos' },
    ],
  },
  {
    label: 'Comunidad',
    links: [
      { to: '/garage', label: `Garage ${BRAND}` },
      { to: '/gente', label: 'Buscar personas' },
      { to: '/dealers', label: 'Concesionarias' },
      { to: '/levels', label: 'Niveles y logros' },
    ],
  },
  {
    label: 'Soporte',
    links: [
      { to: '/help', label: 'Centro de ayuda' },
      { to: '/contact', label: 'Contacto' },
      { to: '/terms', label: 'Términos' },
      { to: '/privacy', label: 'Privacidad' },
    ],
  },
]

export function Footer() {
  return (
    <footer className="footer">
      <div className="page footer__inner">
        <div className="footer__main">
          <Link to="/" className="footer__brand" aria-label={`${BRAND}, inicio`}>
            <span className="footer__mark" aria-hidden="true">
              <Icon name="car" size={18} />
            </span>
            <span>{BRAND}</span>
          </Link>
          <p className="footer__claim">Comprar y vender un auto debería ser simple.</p>
          <p className="footer__description">
            Un marketplace argentino para encontrar, comparar y publicar vehículos sin
            intermediarios ni comisiones.
          </p>
        </div>

        <nav className="footer__nav" aria-label="Enlaces del pie">
          {linkGroups.map((group) => (
            <div className="footer__nav-block" key={group.label}>
              <span className="footer__nav-label">{group.label}</span>
              <div className="footer__links">
                {group.links.map((link) => (
                  <Link key={link.to} to={link.to} className="footer__link">
                    {link.label}
                  </Link>
                ))}
              </div>
            </div>
          ))}
        </nav>

        <div className="footer__bottom">
          <span className="footer__note">© 2026 {BRAND}</span>
          <span className="footer__note">Hecho para comprar y vender vehículos en Argentina.</span>
        </div>
      </div>
    </footer>
  )
}
