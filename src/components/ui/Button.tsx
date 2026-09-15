import type { ButtonHTMLAttributes, ReactNode } from 'react'
import { Icon } from './Icon'

type Variant = 'yellow' | 'dark' | 'outline' | 'ghost' | 'danger'
type Size = 'sm' | 'md' | 'lg'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant
  size?: Size
  block?: boolean
  /**
   * Agrega la flecha de codo al final, separada del texto.
   *
   * Es opcional y no automática por variante: un botón oscuro que dice
   * "Borrar" no lleva a ninguna parte, y una flecha ahí promete un paso
   * siguiente que no existe. Va en los que sí continúan algo.
   */
  arrow?: boolean
  children: ReactNode
}

export function Button({
  variant = 'outline',
  size = 'md',
  block = false,
  arrow = false,
  className,
  type = 'button',
  children,
  ...rest
}: ButtonProps) {
  const classes = [
    'btn',
    `btn--${variant}`,
    size !== 'md' && `btn--${size}`,
    block && 'btn--block',
    arrow && 'btn--arrow',
    className,
  ]
    .filter(Boolean)
    .join(' ')

  return (
    <button type={type} className={classes} {...rest}>
      <span className="btn__label">{children}</span>
      {arrow && <Icon name="arrowCorner" size={16} strokeWidth={1} className="btn__arrow" />}
    </button>
  )
}
