import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../../hooks/useAuth'
import { ContactLimitError, getProfileContact } from '../../lib/api'
import { instagramUrl } from '../../lib/contact'
import { whatsappLink } from '../../lib/whatsapp'
import './ProfileContact.css'

interface ProfileContactProps {
  targetId: string
  instagram: string | null
}

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

  const [state, setState] = useState<
    | { kind: 'idle' }
    | { kind: 'busy' }
    | { kind: 'shown'; whatsapp: string | null; contactEmail: string | null }
    | { kind: 'empty' }
    | { kind: 'failed'; message: string }
  >({ kind: 'idle' })

  async function reveal() {
    setState({ kind: 'busy' })
    try {
      const found = await getProfileContact(targetId)
      setState(found ? { kind: 'shown', ...found } : { kind: 'empty' })
    } catch (cause) {
      setState({
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
      ? whatsappLink(state.whatsapp, 'Hola, te escribo desde tu garage en Autana.')
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
        <Link to="/settings" className="pcontact__ask">
          {instagram ? 'Editar tus datos de contacto' : 'Sumar tu Instagram, WhatsApp o mail'}
        </Link>
      )}
    </div>
  )
}
