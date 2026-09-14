import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { EmptyState } from '../components/ui/EmptyState'
import { Icon } from '../components/ui/Icon'
import { Skeleton } from '../components/ui/Skeleton'
import { useAuth } from '../hooks/useAuth'
import { useDocumentMeta } from '../hooks/useDocumentMeta'
import { NOVEDADES_SEEN_EVENT } from '../hooks/useUnseenNovedades'
import { listNovedades, markNovedadesSeen, type Novedad } from '../lib/api'
import { relativeDate } from '../lib/format'
import './Novedades.css'

/**
 * Lo que pasó con lo tuyo: interesados en tus avisos, gente que te empezó a
 * seguir, y garages de quienes seguís que cambiaron.
 *
 * Se marcan como vistas al abrir, pero después de pintarlas: las que eran
 * nuevas se ven marcadas esta vez, y la próxima ya no. Marcarlas antes de
 * traerlas haría que nunca se vea cuáles eran las nuevas.
 */
export function Novedades() {
  const { session } = useAuth()
  const userId = session?.user.id ?? ''

  useDocumentMeta({ title: 'Novedades | Autana' })

  const [loaded, setLoaded] = useState<{ for: string; items: Novedad[]; failed: boolean }>({
    for: '',
    items: [],
    failed: false,
  })

  useEffect(() => {
    if (!userId) return
    let current = true

    listNovedades()
      .then((items) => {
        if (!current) return
        setLoaded({ for: userId, items, failed: false })
        if (items.some((item) => item.unseen)) {
          void markNovedadesSeen()
            .then(() => window.dispatchEvent(new Event(NOVEDADES_SEEN_EVENT)))
            .catch(() => {})
        }
      })
      .catch(() => {
        if (current) setLoaded({ for: userId, items: [], failed: true })
      })

    return () => {
      current = false
    }
  }, [userId])

  const ready = loaded.for === userId

  return (
    <>
      <section className="novedades__head">
        <div className="page novedades__head-inner">
          <span className="over">Novedades</span>
          <h1 className="novedades__title">Lo que pasó con lo tuyo</h1>
          <p className="novedades__sub">De los últimos 30 días, lo más reciente arriba.</p>
        </div>
      </section>

      <div className="page novedades__body">
        {!ready && (
          <div className="novedades__list">
            {[0, 1, 2].map((row) => (
              <Skeleton key={row} height="64px" />
            ))}
          </div>
        )}

        {ready && loaded.failed && (
          <EmptyState
            tone="error"
            icon="bell"
            title="No pudimos cargar las novedades"
            description="Probá de nuevo en un momento."
          />
        )}

        {ready && !loaded.failed && !loaded.items.length && (
          <EmptyState
            icon="bell"
            title="Todavía no hay novedades"
            description="Acá aparece cuando alguien se interesa en un auto que publicaste, cuando alguien te empieza a seguir, y cuando cambia el garage de alguien que seguís."
            action={
              <Link to="/gente" className="novedades__empty-link">
                Buscar a alguien para seguir
              </Link>
            }
          />
        )}

        {ready && !loaded.failed && loaded.items.length > 0 && (
          <ul className="novedades__list">
            {loaded.items.map((item) => (
              <li key={`${item.kind}:${item.listing?.slug ?? item.actor?.id}:${item.happenedAt}`}>
                <NovedadRow item={item} />
              </li>
            ))}
          </ul>
        )}
      </div>
    </>
  )
}

function NovedadRow({ item }: { item: Novedad }) {
  const { to, text } = describe(item)

  return (
    <Link to={to} className={`novedad${item.unseen ? ' novedad--unseen' : ''}`}>
      {item.actor ? (
        item.actor.avatarUrl ? (
          <img src={item.actor.avatarUrl} alt="" className="novedad__avatar" />
        ) : (
          <span className="novedad__avatar novedad__avatar--empty" aria-hidden="true">
            {item.actor.name.slice(0, 1).toUpperCase()}
          </span>
        )
      ) : (
        /* Los interesados no tienen cara: la novedad nunca dice quiénes. */
        <span className="novedad__avatar novedad__avatar--icon" aria-hidden="true">
          <Icon name="message" size={18} />
        </span>
      )}

      <span className="novedad__text">
        <span>{text}</span>
        <span className="novedad__when">
          {item.unseen && <span className="novedad__new">Nueva</span>}
          {relativeDate(item.happenedAt)}
        </span>
      </span>
    </Link>
  )
}

/** A dónde lleva y qué dice. Sin adjetivos sobre nadie: sólo lo que pasó. */
function describe(item: Novedad): { to: string; text: string } {
  switch (item.kind) {
    case 'interest':
      return {
        /* Al panel y no a la ficha: quien vende quiere ver cómo le va a sus
           avisos, y ahí tiene las visitas al lado. */
        to: '/my-listings',
        text:
          item.amount === 1
            ? `Una persona se interesó en tu ${item.listing?.title ?? 'aviso'}`
            : `${item.amount} personas se interesaron en tu ${item.listing?.title ?? 'aviso'}`,
      }
    case 'follow':
      return {
        to: `/g/${item.actor?.id ?? ''}`,
        text: `${item.actor?.name ?? 'Alguien'} te empezó a seguir`,
      }
    case 'garage':
      return {
        to: `/g/${item.actor?.id ?? ''}`,
        text: `${item.actor?.name ?? 'Alguien'} actualizó su garage`,
      }
  }
}
