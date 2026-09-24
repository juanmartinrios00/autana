import { Link } from 'react-router-dom'
import { Oblea } from './Oblea'
import { achievementInfo, type AchievementId } from '../../lib/levels'
import './Trophies.css'

/**
 * Las medallas del garage: los logros ganados, como trofeos.
 *
 * Sólo los ganados. Mostrar también los que faltan convierte el garage de
 * alguien en una lista de lo que no hizo, y eso lo mira cualquiera que abra el
 * link. Lo que falta se ve en `/niveles` y en el perfil propio, que son de uno.
 *
 * Y con la aclaración puesta: el nivel es un juego del perfil y no una
 * calificación de vendedor ---dos de los siete logros son del garage, que es
 * nostalgia y no dice nada sobre con quién es seguro encontrarse a entregar
 * plata---. Lo que el comprador necesita saber está al lado de cada aviso, en
 * hechos verificables. Está explicado arriba de `lib/levels.ts`; si esta
 * sección se muda a la ficha de un aviso, esa separación se rompe.
 *
 * Cada una es la oblea del logro (`Oblea.tsx`), con el mismo número que en
 * `/niveles`: la tercera es la tercera en todos lados.
 */

interface TrophiesProps {
  earned: AchievementId[]
  /** El dueño mira el suyo: se le ofrece dónde ver los que le faltan. */
  own: boolean
  name: string
}

export function Trophies({ earned, own, name }: TrophiesProps) {
  if (earned.length === 0) return null

  const ganados = achievementInfo()
    .map((item, index) => ({ ...item, number: index + 1 }))
    .filter((item) => earned.includes(item.id))

  return (
    <section className="trophies" aria-labelledby="trofeos-title">
      <span className="over">Logros</span>
      <h2 className="trophies__title" id="trofeos-title">
        {own ? 'Los que ganaste' : `Lo que hizo ${name} acá`}
      </h2>

      <ul className="trophies__list">
        {ganados.map((item) => (
          <li key={item.id} className="trophy">
            <Oblea id={item.id} number={item.number} done size={52} />
            {/* Sólo el nombre. La instrucción de cada logro ---"Cargá tu
                nombre, tu WhatsApp"--- le habla al dueño, y acá la lee
                cualquiera que abra el garage de otro. Está en `/niveles`. */}
            <span className="trophy__name">{item.title}</span>
          </li>
        ))}
      </ul>

      <p className="trophies__note">
        Son logros del perfil, no una calificación de vendedor.{' '}
        <Link to="/niveles">{own ? 'Ver los que faltan' : 'Cómo funcionan'}</Link>.
      </p>
    </section>
  )
}
