import { Icon } from '../ui/Icon'
import type { Achievement } from '../../lib/levels'
import './AchievementList.css'

interface AchievementListProps {
  achievements: Achievement[]
  /**
   * Sin sesión los logros se listan pero ninguno se marca. Es la diferencia
   * entre "esto es lo que hay que hacer" y "esto es lo que hiciste", y sin
   * cuenta sólo la primera tiene sentido.
   */
  showDone?: boolean
}

export function AchievementList({ achievements, showDone = true }: AchievementListProps) {
  return (
    <ul className="achievements">
      {achievements.map((item) => {
        const done = item.done && showDone
        return (
          <li key={item.id} className={done ? 'achievement is-done' : 'achievement'}>
            <span className="achievement__mark" aria-hidden="true">
              {done && <Icon name="check" size={14} />}
            </span>
            <div>
              <h3 className="achievement__title">{item.title}</h3>
              <p className="achievement__hint">{item.hint}</p>
            </div>
          </li>
        )
      })}
    </ul>
  )
}
