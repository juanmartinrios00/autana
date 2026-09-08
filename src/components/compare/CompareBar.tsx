import { Link, useLocation } from 'react-router-dom'
import { Button } from '../ui/Button'
import { Icon } from '../ui/Icon'
import { useCompare } from '../../hooks/useCompare'
import './CompareBar.css'

/**
 * La barra que aparece abajo cuando hay autos elegidos para comparar.
 *
 * Es el puente entre elegir y comparar: sin ella habría que acordarse de ir a
 * `/compare` a mano, y nadie se acuerda. Aparece sola con el primer auto y se
 * va cuando no queda ninguno.
 *
 * En la propia pantalla de comparación no se muestra: ahí la selección ya está
 * a la vista y la barra sólo taparía contenido.
 */
export function CompareBar() {
  const { slugs, remove, clear } = useCompare()
  const location = useLocation()

  if (slugs.length === 0 || location.pathname === '/compare') return null

  const target = `/compare?ids=${slugs.map(encodeURIComponent).join(',')}`

  return (
    <div className="cmpbar" role="region" aria-label="Autos elegidos para comparar">
      <div className="page cmpbar__inner">
        <div className="cmpbar__picks">
          <span className="cmpbar__count mono">
            {slugs.length} {slugs.length === 1 ? 'auto' : 'autos'}
          </span>
          <ul className="cmpbar__list">
            {slugs.map((slug) => (
              <li key={slug} className="cmpbar__chip">
                {/* El slug ya dice marca, modelo y año: alcanza como etiqueta
                    sin tener que pedir los vehículos completos sólo para la
                    barra. Los guiones se leen mejor como espacios. */}
                <span className="cmpbar__chip-name">{slug.replace(/-/g, ' ')}</span>
                <button
                  type="button"
                  className="cmpbar__chip-remove"
                  onClick={() => remove(slug)}
                  aria-label={`Sacar ${slug.replace(/-/g, ' ')} de la comparación`}
                >
                  <Icon name="close" size={13} />
                </button>
              </li>
            ))}
          </ul>
        </div>

        <div className="cmpbar__actions">
          <Button variant="ghost" size="sm" onClick={clear}>
            Vaciar
          </Button>
          <Link to={target}>
            <Button variant="yellow" size="sm" disabled={slugs.length < 2}>
              {slugs.length < 2 ? 'Elegí uno más' : 'Comparar'}
            </Button>
          </Link>
        </div>
      </div>
    </div>
  )
}
