import { useState } from 'react'
import { Link } from 'react-router-dom'
import { BRAND } from '../../config/brand'
import { useAuth } from '../../hooks/useAuth'
import { ContactLimitError, getProfileContact } from '../../lib/api'
import { instagramUrl } from '../../lib/contact'
import { whatsappLink } from '../../lib/whatsapp'
import './ProfileContact.css'

interface ProfileContactProps {
  targetId: string
  instagram: string | null
}

type ContactState =
  | { kind: 'idle' }
  | { kind: 'busy' }
  | { kind: 'shown'; whatsapp: string | null; contactEmail: string | null }
  | { kind: 'empty' }
  | { kind: 'failed'; message: string }

/**
 * Los datos de contacto en el garage de alguien.
 *
 * Instagram se ve siempre que esté cargado: ya es público por naturaleza.
 * WhatsApp y mail se piden con un botón y sólo con sesión, porque juntar
 * teléfonos es justo lo que la migración 008 cerró (ver la 014).
 *
 * Sin sesión no se ofrece "ver contacto": no se sabe si la persona cargó algo,
 * y la base no lo dice a propósito —que un desconocido averigüe si tenés
 * WhatsApp cargado no le sirve a nadie—. Un botón que casi siempre termina en
 * "no dejó nada" sería peor que no tenerlo.
 */
export function ProfileContact({ targetId, instagram }: ProfileContactProps) {
  const { session } = useAuth()
  const userId = session?.user.id ?? ''
  const own = userId === targetId

  /**
   * El contacto revelado, junto al garage del que es.
   *
   * La página del garage no se desmonta al pasar de una persona a otra:
   * `/g/:id` cambia y `Garage` sigue montado, así que este componente recibe
   * un `targetId` nuevo y nada más. Guardando sólo el estado, el WhatsApp que
   * alguien acababa de revelar quedaba en pantalla abajo del garage de la
   * persona siguiente, con su nombre arriba. Es el mismo dato sensible que la
   * migración 008 sacó de la vista pública, mostrado bajo la identidad
   * equivocada.
   */
  const [revealed, setRevealed] = useState<{ for: string; state: ContactState }>({
    for: '',
    state: { kind: 'idle' },
  })

  /* Del garage que se está mirando. Si es otro, se arranca de cero: el botón
     vuelve a aparecer y hay que pedirlo de nuevo, que es lo correcto ---cada
     pedido cuenta contra el límite de la migración 014. */
  const state: ContactState = revealed.for === targetId ? revealed.state : { kind: 'idle' }

  function put(next: ContactState) {
    setRevealed({ for: targetId, state: next })
  }

  async function reveal() {
    put({ kind: 'busy' })
    try {
      const found = await getProfileContact(targetId)
      put(found ? { kind: 'shown', ...found } : { kind: 'empty' })
    } catch (cause) {
      put({
        kind: 'failed',
        message:
          cause instanceof ContactLimitError
            ? cause.message
            : 'No pudimos traer el contacto. Probá de nuevo.',
      })
    }
  }

  const canAsk = Boolean(userId) && !own
  if (!instagram && !canAsk && !own) return null

  const whatsapp =
    state.kind === 'shown' && state.whatsapp
      ? whatsappLink(state.whatsapp, `Hola, te escribo desde tu garage en ${BRAND}.`)
      : null

  return (
    <div className="pcontact">
      {instagram && (
        <a
          className="pcontact__item"
          href={instagramUrl(instagram)}
          target="_blank"
          rel="noreferrer noopener"
        >
          <span className="pcontact__label">Instagram</span>
          <span className="mono">@{instagram}</span>
        </a>
      )}

      {canAsk && (state.kind === 'idle' || state.kind === 'busy') && (
        <button
          type="button"
          className="pcontact__ask"
          onClick={() => void reveal()}
          disabled={state.kind === 'busy'}
        >
          {state.kind === 'busy' ? 'Buscando…' : 'Ver WhatsApp y mail'}
        </button>
      )}

      {state.kind === 'shown' && (
        <>
          {whatsapp && (
            <a className="pcontact__item" href={whatsapp} target="_blank" rel="noreferrer noopener">
              <span className="pcontact__label">WhatsApp</span>
              <span className="mono">{state.whatsapp}</span>
            </a>
          )}
          {state.contactEmail && (
            <a className="pcontact__item" href={`mailto:${state.contactEmail}`}>
              <span className="pcontact__label">Mail</span>
              <span className="mono">{state.contactEmail}</span>
            </a>
          )}
        </>
      )}

      {state.kind === 'empty' && <span className="pcontact__note">No dejó WhatsApp ni mail.</span>}

      {state.kind === 'failed' && (
        <span className="pcontact__error" role="alert">
          {state.message}
        </span>
      )}

      {own && (
        <Link to="/ajustes" className="pcontact__ask">
          {instagram ? 'Editar tus datos de contacto' : 'Sumar tu Instagram, WhatsApp o mail'}
        </Link>
      )}
    </div>
  )
}
