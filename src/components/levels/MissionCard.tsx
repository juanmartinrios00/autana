import { Link } from 'react-router-dom'
import { Button } from '../ui/Button'
import type { Mission } from '../../lib/missions'
import './MissionCard.css'

/**
 * Una misión: el próximo logro, con el botón que lo resuelve.
 *
 * Va en amarillo claro y no en el amarillo de la marca: es una sugerencia, y
 * al lado de "Publicar", que sí es amarillo lleno, no puede competirle.
 * El link a `/niveles` está para quien no sabe de qué logro le hablan.
 */
export function MissionCard({ mission, className }: { mission: Mission; className?: string }) {
  return (
    <aside className={['mission', className].filter(Boolean).join(' ')} aria-label="Próximo logro">
      <div className="mission__body">
        <span className="over mission__over">
          Próximo logro · <Link to="/niveles">{mission.title}</Link>
        </span>
        <p className="mission__text">{mission.text}</p>
      </div>
      {mission.action && (
        <Link to={mission.action.to} className="mission__action">
          <Button size="sm">{mission.action.label}</Button>
        </Link>
      )}
    </aside>
  )
}
