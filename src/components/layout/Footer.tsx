import { Link } from 'react-router-dom'
import { BrandLockup } from '../brand/Logo'
import { BRAND } from '../../config/brand'

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
      { to: '/autos', label: 'Comprar un auto' },
      { to: '/vender', label: 'Publicar un vehículo' },
      { to: '/favoritos', label: 'Favoritos' },
      { to: '/comparar', label: 'Comparar vehículos' },
    ],
  },
  {
    label: 'Comunidad',
    links: [
      { to: '/garage', label: `Garage ${BRAND}` },
      { to: '/gente', label: 'Buscar personas' },
      { to: '/agencias', label: 'Concesionarias' },
      { to: '/niveles', label: 'Niveles y logros' },
    ],
  },
  {
    label: 'Soporte',
    links: [
      { to: '/blog', label: 'Blog' },
      { to: '/ayuda', label: 'Centro de ayuda' },
      { to: '/contacto', label: 'Contacto' },
      { to: '/terminos', label: 'Términos' },
      { to: '/privacidad', label: 'Privacidad' },
    ],
  },
]

export function Footer() {
  return (
    <footer className="footer">
      <div className="page footer__inner">
        <div className="footer__main">
          {/* Acá va siempre el símbolo con el logotipo: el pie tiene lugar, y
              es donde la marca firma. Un solo dibujo y no dos piezas al lado,
              porque el kit los alinea al píxel ---ver `BrandLockup`---. */}
          <Link to="/" className="footer__brand" aria-label={`${BRAND}, inicio`}>
            <BrandLockup className="footer__logo" aria-hidden="true" />
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
