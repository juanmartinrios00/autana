import { Oblea } from './Oblea'
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
      {achievements.map((item, index) => {
        const done = item.done && showDone
        return (
          <li key={item.id} className={done ? 'achievement is-done' : 'achievement'}>
            <Oblea id={item.id} number={index + 1} done={done} size={60} />
            <div>
              <h3 className="achievement__title">
                {item.title}
                {/* La oblea es aria-hidden: el estado tiene que estar en el texto. */}
                {done && <span className="sr-only"> (logrado)</span>}
              </h3>
              <p className="achievement__hint">{item.hint}</p>
            </div>
          </li>
        )
      })}
    </ul>
  )
}
