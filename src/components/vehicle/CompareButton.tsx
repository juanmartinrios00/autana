import { useCompare } from '../../hooks/useCompare'
import { Icon } from '../ui/Icon'

interface CompareButtonProps {
  slug: string
  /** Título del vehículo, para que la etiqueta diga de cuál se trata. */
  title: string
  className?: string
  /** Sólo el ícono, redondo, para ir sobre la foto de la card al lado del favorito. */
  compact?: boolean
}

export function CompareButton({ slug, title, className, compact = false }: CompareButtonProps) {
  const { has, toggle, full } = useCompare()
  const picked = has(slug)
  /* Con tres elegidos, los que no están adentro dejan de poder sumarse. Sacar
     uno sigue disponible, si no habría que adivinar cómo salir del tope. */
  const blocked = full && !picked

  return (
    <button
      type="button"
      className={[compact ? 'fav cmp-dot' : 'cmp-btn', picked && (compact ? 'fav--on' : 'cmp-btn--on'), className]
        .filter(Boolean)
        .join(' ')}
      aria-pressed={picked}
      disabled={blocked}
      title={blocked ? 'Ya elegiste tres autos para comparar' : compact ? (picked ? 'Comparando' : 'Comparar') : undefined}
      aria-label={picked ? `Sacar ${title} de la comparación` : `Comparar ${title}`}
      onClick={() => toggle(slug)}
    >
      <Icon name={picked ? 'check' : 'compare'} size={15} />
      {!compact && (picked ? 'Comparando' : 'Comparar')}
    </button>
  )
}
