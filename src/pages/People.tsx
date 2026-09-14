import { useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { EmptyState } from '../components/ui/EmptyState'
import { Icon } from '../components/ui/Icon'
import { Skeleton } from '../components/ui/Skeleton'
import { useDocumentMeta } from '../hooks/useDocumentMeta'
import { MIN_PERSON_TERM, searchPeople, type PersonResult } from '../lib/api'
import './People.css'

/**
 * Buscar una persona para ver su garage.
 *
 * El garage siempre fue público, pero hasta acá sólo se llegaba si alguien te
 * pasaba el link. Esto es la otra mitad: encontrar a alguien que sabés que
 * está, sin tener que pedirle el link.
 *
 * El término vive en la URL y no en el estado: buscar es navegar, y así una
 * búsqueda se comparte y el botón atrás hace lo que se espera. Es la misma
 * decisión que en `/cars`.
 */
export function People() {
  const [params, setParams] = useSearchParams()
  const term = params.get('q') ?? ''

  useDocumentMeta({
    title: term ? `${term} | Buscar personas | Autana` : 'Buscar personas | Autana',
    description:
      'Encontrá a alguien en Autana y mirá su garage: el primer auto, el de hoy y el que sueña.',
  })

  /* El input responde al instante y la URL va atrás: escribir no puede esperar
     a que navegue. Cuando la URL cambia por otro camino —el botón atrás, un
     link— gana la URL, comparando contra qué término se tipeó. */
  const [typed, setTyped] = useState({ text: term, forTerm: term })
  const value = typed.forTerm === term ? typed.text : term

  const [answer, setAnswer] = useState<{
    term: string
    people: PersonResult[]
    failed: boolean
  }>({ term: '', people: [], failed: false })

  /* Escribir no dispara una consulta por tecla: se espera a que la mano pare.
     250ms es lo que tarda en sentirse instantáneo sin pegarle a la base en
     cada letra de un nombre. */
  useEffect(() => {
    const pending = window.setTimeout(() => {
      const next = new URLSearchParams(params)
      if (value.trim()) next.set('q', value.trim())
      else next.delete('q')
      if (next.toString() !== params.toString()) setParams(next, { replace: true })
    }, 250)

    return () => window.clearTimeout(pending)
  }, [value, params, setParams])

  /* Un término corto no busca y tampoco limpia el estado: alcanza con que el
     render no muestre nada cuyo `answer.term` no sea el término de ahora, que
     es la misma condición que evita pintar resultados viejos. Limpiarlo con un
     `setState` acá sería una render de más por cada tecla. */
  useEffect(() => {
    if (term.trim().length < MIN_PERSON_TERM) return

    let current = true
    searchPeople(term)
      .then((people) => {
        if (current) setAnswer({ term, people, failed: false })
      })
      .catch(() => {
        if (current) setAnswer({ term, people: [], failed: true })
      })

    /* La búsqueda anterior puede resolver después de que cambió el término:
       sin esta bandera pintaría los resultados de lo que ya no se está
       buscando. */
    return () => {
      current = false
    }
  }, [term])

  const short = term.trim().length > 0 && term.trim().length < MIN_PERSON_TERM
  const searching = term.trim().length >= MIN_PERSON_TERM && answer.term !== term

  return (
    <>
      <section className="people__head">
        <div className="page people__head-inner">
          <span className="over">Buscar personas</span>
          <h1 className="people__title">¿A quién estás buscando?</h1>
          <p className="people__sub">
            Escribí un nombre y mirá su garage: el primer auto, el de hoy, el que sueña y el
            que extraña.
          </p>

          <form className="people__form" role="search" onSubmit={(event) => event.preventDefault()}>
            <label className="sr-only" htmlFor="people-search">
              Buscar una persona por nombre
            </label>
            <Icon name="search" size={18} />
            <input
              id="people-search"
              type="search"
              className="people__input"
              placeholder="Ej. Juan Martín"
              autoComplete="off"
              value={value}
              onChange={(event) => setTyped({ text: event.target.value, forTerm: term })}
            />
          </form>
        </div>
      </section>

      <div className="page people__body">
        {!term.trim() && (
          <p className="people__idle">
            Los garages son públicos: cualquiera puede ver el tuyo con el link. Si preferís no
            aparecer acá, se apaga en <Link to="/settings">Ajustes</Link>.
          </p>
        )}

        {short && <p className="people__idle">Escribí al menos {MIN_PERSON_TERM} letras.</p>}

        {searching && (
          <ul className="people__list">
            {[0, 1, 2].map((row) => (
              <li key={row} className="people__row">
                <Skeleton className="people__avatar" />
                <div className="people__lines">
                  <Skeleton width="40%" />
                  <Skeleton width="25%" />
                </div>
              </li>
            ))}
          </ul>
        )}

        {!searching && answer.failed && (
          <EmptyState
            title="No pudimos buscar"
            description="Probá de nuevo en un momento."
            icon="search"
          />
        )}

        {!searching && !answer.failed && answer.term === term && term.trim() && (
          answer.people.length ? (
            <ul className="people__list">
              {answer.people.map((person) => (
                <li key={person.id}>
                  <Link to={`/g/${person.id}`} className="people__row people__row--link">
                    {person.avatarUrl ? (
                      <img src={person.avatarUrl} alt="" className="people__avatar" />
                    ) : (
                      <span className="people__avatar people__avatar--empty" aria-hidden="true">
                        {initials(person.name)}
                      </span>
                    )}

                    <span className="people__lines">
                      <span className="people__name">{person.name}</span>
                      <span className="people__meta">
                        {/* Dos datos para distinguir homónimos: de dónde es y
                            qué tan armado tiene el garage. Sin eso, buscar un
                            apellido común devuelve una lista de nombres
                            idénticos. */}
                        {placeOf(person)}
                        {person.garageCars > 0 && (
                          <>
                            <span className="people__dot" aria-hidden="true">·</span>
                            <span className="mono">
                              {person.garageCars} {person.garageCars === 1 ? 'auto' : 'autos'}
                            </span>
                          </>
                        )}
                      </span>
                    </span>

                  </Link>
                </li>
              ))}
            </ul>
          ) : (
            <EmptyState
              title={`No encontramos a nadie con "${term.trim()}"`}
              description="Puede que el nombre esté escrito distinto, o que esa persona haya elegido no aparecer en el buscador. El link directo a su garage siempre funciona."
              icon="search"
            />
          )
        )}
      </div>
    </>
  )
}

/**
 * De dónde es, con lo que haya cargado.
 *
 * No se usa `locationLabel` de `lib/format` porque ese espera ciudad y
 * provincia presentes —los avisos las exigen— y acá las dos son opcionales:
 * un perfil puede existir sin haber completado nada.
 */
function placeOf(person: PersonResult): string {
  const parts = [person.city, person.province].filter(Boolean) as string[]
  if (!parts.length) return 'Sin ubicación'
  return parts[0] === parts[1] ? parts[0]! : parts.join(', ')
}

function initials(name: string): string {
  return name
    .split(' ')
    .slice(0, 2)
    .map((word) => word[0]?.toUpperCase() ?? '')
    .join('')
}
