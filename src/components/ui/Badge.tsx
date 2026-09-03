import type { ReactNode } from 'react'

type BadgeTone = 'neutral' | 'accent' | 'dark' | 'outline' | 'tint' | 'success' | 'warning' | 'danger'

interface BadgeProps {
  tone?: BadgeTone
  children: ReactNode
  className?: string
}

export function Badge({ tone = 'neutral', children, className }: BadgeProps) {
  const classes = ['badge', tone !== 'neutral' && `badge--${tone}`, className]
    .filter(Boolean)
    .join(' ')

  return <span className={classes}>{children}</span>
}
