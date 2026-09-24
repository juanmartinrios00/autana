import type { ReactNode } from 'react'
import { EMPTY_SCENES, type EmptySceneName } from './empty-scenes'
import { Icon, type IconName } from './Icon'

interface EmptyStateProps {
  icon?: IconName
  /** El dibujo, si ya existe; si no, va el ícono. Ver `empty-scenes.tsx`. */
  scene?: EmptySceneName
  title: string
  description: string
  action?: ReactNode
  /** `error` pinta el círculo en rojo. */
  tone?: 'neutral' | 'error'
}

export function EmptyState({
  icon = 'search',
  scene,
  title,
  description,
  action,
  tone = 'neutral',
}: EmptyStateProps) {
  const Scene = scene ? EMPTY_SCENES[scene] : undefined

  return (
    <div className={`empty empty--${tone}`} role={tone === 'error' ? 'alert' : undefined}>
      {Scene ? (
        <Scene className="empty__scene" />
      ) : (
        <span className="empty__icon">
          <Icon name={icon} size={26} />
        </span>
      )}
      <h2 className="empty__title">{title}</h2>
      <p className="empty__text">{description}</p>
      {action && <div className="empty__action">{action}</div>}
    </div>
  )
}
