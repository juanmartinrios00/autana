import { Link } from 'react-router-dom'
import { BrandLockup } from '../brand/Logo'
import { BRAND } from '../../config/brand'
import { LEGAL_LINKS, NAV_GROUPS, visibleItems } from './nav-links'

/* Los mismos tres grupos que la barra, con los mismos nombres y en el mismo
   orden: quien buscó algo en "Garage" arriba lo encuentra en "Garage" abajo.
   Salen de `nav-links`, así que una pantalla nueva aparece en los dos lados.

   El pie suma lo que arriba no va: publicar (que arriba es el botón
   amarillo), favoritos adentro de Comprar, y los legales al final de Ayuda. */
const linkGroups = NAV_GROUPS.filter((group) => group.items).map((group) => {
  const links = visibleItems(group, false).map(({ to, label }) => ({ to, label }))
  if (group.id === 'comprar') {
    links.push({ to: '/favoritos', label: 'Favoritos' }, { to: '/vender', label: 'Publicar un vehículo' })
  }
  if (group.id === 'ayuda') links.push(...LEGAL_LINKS)
  return { label: group.label, links }
})

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
