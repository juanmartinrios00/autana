import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { AchievementList } from '../components/levels/AchievementList'
import { LevelScene } from '../components/levels/scenes'
import { Button } from '../components/ui/Button'
import { Icon } from '../components/ui/Icon'
import { BRAND, pageTitle } from '../config/brand'
import { useAuth } from '../hooks/useAuth'
import { useDarkHero } from '../hooks/useDarkHero'
import { useDocumentMeta } from '../hooks/useDocumentMeta'
import { getLevelInput } from '../lib/api'
import { computeLevel, LEVELS, type LevelInput, type LevelState } from '../lib/levels'
import './Levels.css'

/**
 * La pantalla que explica los niveles.
 *
 * Existe porque el nivel solo, arriba del perfil, no se explica: dice
 * "Fierrero" y no dice de dónde salió ni qué falta para el que sigue. Acá se
 * ven los cuatro niveles y todos los logros, con el propio marcado encima.
 *
 * Funciona sin sesión a propósito. Es la pantalla a la que se manda a alguien
 * que pregunta qué son los niveles, y pedirle que se registre para leer una
 * explicación es la forma más rápida de que no la lea.
 */

/* Cuántos logros hay, en letras, que es como se leen en esta pantalla. Sale del
   largo de la lista y no escrito a mano: decía "seis" en cinco lugares, y sumar
   un logro obligaba a encontrarlos todos. Así pasó con "Primera venta". */
const EN_LETRAS = ['cero', 'uno', 'dos', 'tres', 'cuatro', 'cinco', 'seis', 'siete', 'ocho', 'nueve', 'diez']

/* Sin sesión se muestra la escalera con el primer nivel como si fuera el
   propio: es el estado real de alguien que todavía no se registró, y deja ver
   la pantalla completa sin inventar datos. */
const EMPTY: LevelInput = {
  profile: null,
  activeListings: 0,
  publishedListings: 0,
  soldListings: 0,
  bestPhotoCount: 0,
  garageCars: 0,
}

export function Levels() {
  const { session } = useAuth()
  const userId = session?.user.id ?? ''

  /* Con la cuenta a la que pertenece, como el resto del código. Acá el caso es
     angosto ---hay que cambiar de cuenta sin salir de esta pantalla--- pero el
     resultado sería ver los logros de la cuenta anterior hasta que llegue la
     consulta nueva, que es la clase de dato equivocado que nadie reporta. */
  const [fetched, setFetched] = useState<{ for: string; value: LevelInput } | null>(null)

  useEffect(() => {
    if (!userId) return

    let current = true
    /* Si falla, se muestra la escalera sin marcar nada. La explicación vale por
       sí sola; el progreso propio es el agregado. */
    void getLevelInput(userId)
      .catch(() => EMPTY)
      .then((value) => {
        if (current) setFetched({ for: userId, value })
      })

    return () => {
      current = false
    }
  }, [userId])

  /* Sin sesión no hay nada que pedir, así que el vacío se deriva en el render
     en vez de escribirse en el estado desde el efecto. */
  const input = userId && fetched?.for === userId ? fetched.value : EMPTY
  const state: LevelState = computeLevel(input)
  const total = EN_LETRAS[state.achievements.length] ?? String(state.achievements.length)
  const signedIn = Boolean(session)

  useDarkHero()

  useDocumentMeta({
    title: pageTitle('Los niveles'),
    description:
      `Cómo funcionan los niveles de ${BRAND}: ${total} logros, cuatro escalones, y todos salen de cosas que ya hiciste.`,
  })

  return (
    <>
      <section className="levels__head hero-bleed">
        <div className="page levels__head-inner">
          <span className="over over--invert">Los niveles</span>
          <h1 className="levels__title">Se suben haciendo, no participando.</h1>
          <p className="levels__lead">
            Los {total} logros salen de datos que ya existen: si borrás una publicación, el
            nivel baja; si la marcás como vendida, no. No hay puntos por entrar todos los
            días.
          </p>
          {/* La misma aclaración que está en el perfil. Va acá arriba y no al
              pie porque es lo que más se malinterpreta: alguien que llega desde
              un aviso tiene que enterarse antes de mirar la escalera. */}
          <p className="levels__warn">
            <Icon name="user" size={16} />
            Es un juego del perfil, no una calificación de vendedor. A quien mira tus
            autos le mostramos hechos: si estás verificada y desde cuándo tenés cuenta.
          </p>
        </div>
      </section>

      <div className="page levels__body">
        <ol className="ladder">
          {LEVELS.map((rung, index) => {
            const number = index + 1
            const reached = state.earned >= rung.at
            const here = state.level === number && signedIn

            return (
              <li
                key={rung.title}
                className={['rung', reached && 'is-reached', here && 'is-here']
                  .filter(Boolean)
                  .join(' ')}
                aria-current={here ? 'step' : undefined}
              >
                <div className="rung__art">
                  <LevelScene level={number} className="rung__scene" />
                </div>

                <div className="rung__body">
                  <span className="over rung__number">Nivel {number}</span>
                  <h2 className="rung__title">{rung.title}</h2>
                  <p className="rung__need">
                    {/* "Los que sean" en el último: si no se aclara, se lee
                        como que falta uno en particular y se busca cuál. */}
                    {rung.at === 0
                      ? 'Desde que abrís la cuenta.'
                      : index === LEVELS.length - 1
                        ? `Con ${rung.at} de los ${total} logros, los que sean.`
                        : `Con ${rung.at} de los ${total} logros.`}
                  </p>
                  {here && <span className="rung__badge">Estás acá</span>}
                </div>
              </li>
            )
          })}
        </ol>

        <section className="levels__section">
          <header className="levels__section-head">
            <span className="over">Los {total}</span>
            <h2 className="levels__section-title">Qué cuenta como logro</h2>
            {signedIn && (
              <p className="levels__progress mono">
                {state.earned} de {state.achievements.length}
              </p>
            )}
          </header>

          <AchievementList achievements={state.achievements} showDone={signedIn} />
        </section>

        <div className="levels__cta">
          {signedIn ? (
            <Link to="/perfil">
              <Button variant="yellow">Ver mi perfil</Button>
            </Link>
          ) : (
            <Link to="/entrar">
              <Button variant="yellow">Crear mi cuenta</Button>
            </Link>
          )}
        </div>
      </div>
    </>
  )
}
