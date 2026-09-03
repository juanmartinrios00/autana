import { Link } from 'react-router-dom'
import { Icon } from './Icon'

interface CtaSplitProps {
  to: string
  children: string
  size?: 'md' | 'sm'
  className?: string
}

/**
 * CTA dividida: visualmente son dos bloques, pero es un solo enlace con un
 * solo destino, asi que para el teclado y el lector de pantalla se comporta
 * como cualquier link. Uso puntual: una por pantalla, y solo en la accion
 * principal de la pagina.
 */
export function CtaSplit({ to, children, size = 'md', className }: CtaSplitProps) {
  const classes = ['cta', size === 'sm' && 'cta--sm', className].filter(Boolean).join(' ')

  return (
    <Link to={to} className={classes}>
      <span className="cta__label">{children}</span>
      <span className="cta__arrow">
        <Icon name="arrowRight" size={size === 'sm' ? 17 : 20} />
      </span>
    </Link>
  )
}
