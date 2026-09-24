import { useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { EmptyState } from '../components/ui/EmptyState'
import { PersonRow, PersonRowsSkeleton } from '../components/people/PersonRow'
import { PageHead } from '../components/ui/PageHead'
import { Icon } from '../components/ui/Icon'
import { BRAND, pageTitle } from '../config/brand'
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
 * decisión que en `/autos`.
 */
export function People() {
  const [params, setParams] = useSearchParams()
  const term = params.get('q') ?? ''

  useDocumentMeta({
    title: term ? pageTitle(`${term} | Buscar personas`) : pageTitle('Buscar personas'),
    description:
      `Encontrá a alguien en ${BRAND} y mirá su garage: el primer auto, el de hoy y el que sueña.`,
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
      <PageHead
        tone="paper"
        kicker="Buscar personas"
        title="¿A quién estás buscando?"
        lead="Escribí un nombre y mirá su garage: el primer auto, el de hoy, el que sueña y el que extraña."
      >
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
      </PageHead>

      <div className="page people__body">
        {!term.trim() && (
          <p className="people__idle">
            Los garages son públicos: cualquiera puede ver el tuyo con el link. Si preferís no
            aparecer acá, se apaga en <Link to="/ajustes">Ajustes</Link>.
          </p>
        )}

        {short && <p className="people__idle">Escribí al menos {MIN_PERSON_TERM} letras.</p>}

        {searching && <PersonRowsSkeleton />}

        {!searching && answer.failed && (
          <EmptyState
            scene="sinConexion"
            title="No pudimos buscar"
            description="Probá de nuevo en un momento."
            icon="search"
          />
        )}

        {!searching && !answer.failed && answer.term === term && term.trim() && (
          answer.people.length ? (
            <ul className="person-list">
              {answer.people.map((person) => (
                <li key={person.id}>
                  <PersonRow person={person} />
                </li>
              ))}
            </ul>
          ) : (
            <EmptyState
              scene="sinResultados"
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
