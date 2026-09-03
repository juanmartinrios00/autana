import type { ReactNode } from 'react'
import { Icon, type IconName } from './Icon'

interface EmptyStateProps {
  icon?: IconName
  title: string
  description: string
  action?: ReactNode
  /** `error` pinta el círculo en rojo. */
  tone?: 'neutral' | 'error'
}

export function EmptyState({
  icon = 'search',
  title,
  description,
  action,
  tone = 'neutral',
}: EmptyStateProps) {
  return (
    <div className={`empty empty--${tone}`} role={tone === 'error' ? 'alert' : undefined}>
      <span className="empty__icon">
        <Icon name={icon} size={26} />
      </span>
      <h2 className="empty__title">{title}</h2>
      <p className="empty__text">{description}</p>
      {action && <div className="empty__action">{action}</div>}
    </div>
  )
}
