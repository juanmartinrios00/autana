import type { ElementType, HTMLAttributes, ReactNode } from 'react'

interface CardProps extends HTMLAttributes<HTMLElement> {
  /** `article` para una publicacion, `section` para un bloque, etc. */
  as?: ElementType
  pad?: boolean
  raised?: boolean
  interactive?: boolean
  children: ReactNode
}

export function Card({
  as: Tag = 'div',
  pad = false,
  raised = false,
  interactive = false,
  className,
  children,
  ...rest
}: CardProps) {
  const classes = [
    'card',
    pad && 'card--pad',
    raised && 'card--raised',
    interactive && 'card--interactive',
    className,
  ]
    .filter(Boolean)
    .join(' ')

  return (
    <Tag className={classes} {...rest}>
      {children}
    </Tag>
  )
}
