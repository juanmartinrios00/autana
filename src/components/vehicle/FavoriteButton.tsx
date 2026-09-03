import { useFavorites } from '../../hooks/useFavorites'
import { Icon } from '../ui/Icon'

interface FavoriteButtonProps {
  vehicleId: string
  /** Título del vehículo, para que la etiqueta diga de cuál se trata. */
  title: string
  className?: string
}

export function FavoriteButton({ vehicleId, title, className }: FavoriteButtonProps) {
  const { has, toggle } = useFavorites()
  const saved = has(vehicleId)

  return (
    <button
      type="button"
      className={['fav', saved && 'fav--on', className].filter(Boolean).join(' ')}
      aria-pressed={saved}
      aria-label={saved ? `Quitar ${title} de favoritos` : `Guardar ${title} en favoritos`}
      onClick={() => toggle(vehicleId)}
    >
      <Icon name="heart" size={17} className={saved ? 'fav__icon fav__icon--on' : 'fav__icon'} />
    </button>
  )
}
