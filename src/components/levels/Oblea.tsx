import { useId } from 'react'
import { Icon, type IconName } from '../ui/Icon'
import type { AchievementId } from '../../lib/levels'
import './Oblea.css'

/** El pictograma de cada logro, en el centro de la oblea. */
const PICTO: Record<AchievementId, IconName> = {
  profile_complete: 'user',
  first_listing: 'car',
  rich_listing: 'camera',
  three_listings: 'grid',
  first_sale: 'tag',
  garage_started: 'heart',
  garage_complete: 'shield',
}

interface ObleaProps {
  id: AchievementId
  /** Su número entre los siete: 1 a 7. */
  number: number
  done: boolean
  /** Lado en píxeles. */
  size?: number
  className?: string
}

/**
 * Un logro, como una oblea de VTV pegada en el parabrisas.
 *
 * Es el objeto que cualquiera que tuvo un auto en Argentina reconoce: el disco
 * con el texto alrededor del aro y el número grande en el medio. Ganada, va en
 * el amarillo pleno de la paleta. Sin ganar no es una oblea gris: es el
 * círculo punteado del lugar donde todavía falta pegarla.
 *
 * SVG inline como las escenas: sigue al color del texto, pesa nada y escala a
 * cualquier tamaño. El texto del aro es fijo ---la marca y el número--- porque
 * los nombres de los logros tienen largos muy distintos y en el aro no entran
 * parejos; el nombre va al lado, en texto de verdad.
 */
export function Oblea({ id, number, done, size = 64, className }: ObleaProps) {
  const pathId = `oblea-${useId().replace(/[^a-zA-Z0-9]/g, '')}`
  const nn = String(number).padStart(2, '0')
  const ring = `AUTEANDO · LOGRO Nº ${nn} · AUTEANDO · LOGRO Nº ${nn} ·`

  return (
    <svg
      className={['oblea', done ? 'oblea--done' : 'oblea--pending', className].filter(Boolean).join(' ')}
      width={size}
      height={size}
      viewBox="0 0 100 100"
      aria-hidden="true"
      focusable="false"
    >
      {/* El disco, y el troquel: la línea fina de adentro por donde se corta. */}
      <circle className="oblea__disc" cx="50" cy="50" r="47" />
      <circle className="oblea__cut" cx="50" cy="50" r="44" />
      <circle className="oblea__ring" cx="50" cy="50" r="34" />

      {/* Horario desde arriba: así la letra mira hacia afuera. */}
      <path id={pathId} d="M50 11.5a38.5 38.5 0 1 1 0 77a38.5 38.5 0 1 1 0-77" fill="none" />
      <text className="oblea__text">
        <textPath href={`#${pathId}`} textLength="238" lengthAdjust="spacing">
          {ring}
        </textPath>
      </text>

      <Icon name={PICTO[id]} x={40} y={25} size={20} strokeWidth={1.8} className="oblea__picto" />
      <text className="oblea__number" x="50" y="68" textAnchor="middle">
        {nn}
      </text>
    </svg>
  )
}
