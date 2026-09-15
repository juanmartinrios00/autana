import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { PersonRow, PersonRowsSkeleton } from '../components/people/PersonRow'
import { Button } from '../components/ui/Button'
import { EmptyState } from '../components/ui/EmptyState'
import { pageTitle } from '../config/brand'
import { useAuth } from '../hooks/useAuth'
import { useDocumentMeta } from '../hooks/useDocumentMeta'
import { getFollowCounts, listFollowing, type FollowedPerson } from '../lib/api'
import { relativeDate } from '../lib/format'
import './Following.css'

/**
 * A quién seguís.
 *
 * Es la razón de seguir a alguien: enterarte de que cambió su garage. Por eso
 * arriba va el que lo tocó más recientemente, y no el último que empezaste a
 * seguir — el orden lo hace la base (`my_following`).
 *
 * No hay avisos por mail todavía: eso espera al dominio propio, igual que el
 * aviso de búsquedas guardadas. Mientras, esta lista es la novedad.
 */
export function Following() {
  const { session } = useAuth()
  const userId = session?.user.id ?? ''

  useDocumentMeta({ title: pageTitle('A quién seguís') })

  const [loaded, setLoaded] = useState<{
    for: string
    people: FollowedPerson[]
    followers: number | null
    failed: boolean
  }>({ for: '', people: [], followers: null, failed: false })

  useEffect(() => {
    if (!userId) return
    let current = true

    /* `allSettled`: si falla la cuenta de seguidores, la lista —que es lo que
       se vino a ver— se muestra igual. */
    void Promise.allSettled([listFollowing(), getFollowCounts(userId)]).then(
      ([peopleResult, countsResult]) => {
        if (!current) return
        setLoaded({
          for: userId,
          people: peopleResult.status === 'fulfilled' ? peopleResult.value : [],
          followers: countsResult.status === 'fulfilled' ? countsResult.value.followers : null,
          failed: peopleResult.status === 'rejected',
        })
      },
    )

    return () => {
      current = false
    }
  }, [userId])

  const ready = loaded.for === userId

  return (
    <>
      <section className="following__head">
        <div className="page following__head-inner">
          <span className="over">Siguiendo</span>
          <h1 className="following__title">A quién seguís</h1>
          <p className="following__sub">
            Arriba, el que cambió su garage más recientemente.
            {ready && loaded.followers !== null && (
              <>
                {' '}
                A vos te {loaded.followers === 1 ? 'sigue' : 'siguen'}{' '}
                <span className="mono">{loaded.followers}</span>{' '}
                {loaded.followers === 1 ? 'persona' : 'personas'}.
              </>
            )}
          </p>
        </div>
      </section>

      <div className="page following__body">
        {!ready && <PersonRowsSkeleton />}

        {ready && loaded.failed && (
          <EmptyState
            tone="error"
            icon="user"
            title="No pudimos cargar la lista"
            description="Probá de nuevo en un momento."
          />
        )}

        {ready && !loaded.failed && !loaded.people.length && (
          <EmptyState
            icon="user"
            title="Todavía no seguís a nadie"
            description="Buscá a alguien que conozcas y seguilo desde su garage: cuando cambie algo, aparece acá arriba."
            action={
              <Link to="/gente">
                <Button variant="yellow">Buscar personas</Button>
              </Link>
            }
          />
        )}

        {ready && !loaded.failed && loaded.people.length > 0 && (
          <ul className="person-list">
            {loaded.people.map((person) => (
              <li key={person.id}>
                <PersonRow
                  person={person}
                  extra={
                    person.updatedAt ? (
                      <span>actualizó {relativeDate(person.updatedAt)}</span>
                    ) : (
                      <span>sin autos todavía</span>
                    )
                  }
                />
              </li>
            ))}
          </ul>
        )}
      </div>
    </>
  )
}
