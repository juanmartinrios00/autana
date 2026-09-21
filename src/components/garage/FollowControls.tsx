import { useEffect, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { Button } from '../ui/Button'
import { useAuth } from '../../hooks/useAuth'
import {
  blockUser,
  followUser,
  getFollowCounts,
  getFollowState,
  unblockUser,
  unfollowUser,
  type FollowCounts,
  type FollowState,
} from '../../lib/api'
import './FollowControls.css'

interface FollowControlsProps {
  targetId: string
  targetName: string
}

/**
 * Seguir, dejar de seguir y bloquear, en la cabecera del garage.
 *
 * Los estados, y por qué cada uno se ve como se ve:
 *
 * - Sin sesión: el botón de seguir está igual y lleva al login, que vuelve
 *   acá. Esconderlo haría que nadie sepa que se puede.
 * - Tu propio garage: sólo las cantidades y el link a quién seguís.
 * - Bloqueaste a esta persona: se dice, y se ofrece deshacerlo. Seguir a
 *   alguien bloqueado es contradictorio, así que el botón no está.
 * - Esta persona te bloqueó: el botón de seguir no aparece, y nada más. No se
 *   anuncia "te bloqueó": no le sirve a nadie.
 */
export function FollowControls({ targetId, targetName }: FollowControlsProps) {
  const { session } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const userId = session?.user.id ?? ''
  const own = userId === targetId

  const [counts, setCounts] = useState<{ for: string; value: FollowCounts } | null>(null)
  const [state, setState] = useState<{ for: string; value: FollowState } | null>(null)
  const [busy, setBusy] = useState(false)
  const [confirming, setConfirming] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    let current = true
    getFollowCounts(targetId)
      .then((value) => {
        if (current) setCounts({ for: targetId, value })
      })
      .catch(() => {})
    return () => {
      current = false
    }
  }, [targetId])

  /* La clave incluye a quien mira: cerrar sesión o cambiar de cuenta en otra
     pestaña no puede dejar el botón diciendo "Siguiendo" por la cuenta
     anterior. */
  const stateKey = `${userId}:${targetId}`

  useEffect(() => {
    if (!userId || own) return
    let current = true
    getFollowState(userId, targetId)
      .then((value) => {
        if (current) setState({ for: stateKey, value })
      })
      .catch(() => {})
    return () => {
      current = false
    }
  }, [userId, targetId, own, stateKey])

  const shownCounts = counts?.for === targetId ? counts.value : null
  const shownState = state?.for === stateKey ? state.value : null

  function bump(delta: number) {
    setCounts((prev) =>
      prev && prev.for === targetId
        ? { ...prev, value: { ...prev.value, followers: Math.max(0, prev.value.followers + delta) } }
        : prev,
    )
  }

  /**
   * Cambia el estado antes de que conteste la base y lo vuelve atrás si
   * falla. Seguir es un toque y tiene que sentirse así; esperar la red para
   * que el botón cambie de texto se lee como que no tomó el clic.
   */
  async function run(next: FollowState, delta: number, action: () => Promise<void>) {
    if (!shownState) return
    const previous = shownState
    setState({ for: stateKey, value: next })
    bump(delta)
    setBusy(true)
    setError('')
    try {
      await action()
    } catch {
      setState({ for: stateKey, value: previous })
      bump(-delta)
      setError('No pudimos hacerlo. Probá de nuevo.')
    } finally {
      setBusy(false)
    }
  }

  function follow() {
    if (!userId) {
      navigate('/entrar', { state: { from: location.pathname + location.search } })
      return
    }
    void run({ following: true, blockedByMe: false, unavailable: false }, 1, () =>
      followUser(userId, targetId),
    )
  }

  function unfollow() {
    void run({ following: false, blockedByMe: false, unavailable: false }, -1, () =>
      unfollowUser(userId, targetId),
    )
  }

  function block() {
    setConfirming(false)
    /* Si lo seguías, deja de contar: el trigger de la base corta el
       seguimiento en las dos direcciones. El contador de la cabecera es el de
       sus seguidores, así que baja sólo si vos eras uno. */
    const delta = shownState?.following ? -1 : 0
    void run({ following: false, blockedByMe: true, unavailable: false }, delta, () =>
      blockUser(userId, targetId),
    )
  }

  function unblock() {
    void run({ following: false, blockedByMe: false, unavailable: false }, 0, () =>
      unblockUser(userId, targetId),
    )
  }

  const followers = shownCounts?.followers ?? 0

  return (
    <div className="follow">
      <div className="follow__row">
        {shownCounts && (
          <span className="follow__count mono">
            {followers} {followers === 1 ? 'seguidor' : 'seguidores'}
          </span>
        )}

        {own && (
          <Link to="/siguiendo" className="follow__link">
            A quién seguís
          </Link>
        )}

        {!own && !userId && (
          <Button variant="yellow" size="sm" onClick={follow}>
            Seguir
          </Button>
        )}

        {!own && shownState && !shownState.blockedByMe && !shownState.unavailable && (
          shownState.following ? (
            <Button variant="outline" size="sm" onClick={unfollow} disabled={busy}>
              Siguiendo
            </Button>
          ) : (
            <Button variant="yellow" size="sm" onClick={follow} disabled={busy}>
              Seguir
            </Button>
          )
        )}

        {!own && shownState?.blockedByMe && (
          <>
            <span className="follow__note">Bloqueaste a {targetName}.</span>
            <button type="button" className="follow__quiet" onClick={unblock} disabled={busy}>
              Desbloquear
            </button>
          </>
        )}

        {!own && shownState && !shownState.blockedByMe && !confirming && (
          <button
            type="button"
            className="follow__quiet"
            onClick={() => setConfirming(true)}
            disabled={busy}
          >
            Bloquear
          </button>
        )}
      </div>

      {confirming && (
        <div className="follow__confirm" role="alertdialog" aria-labelledby="follow-confirm-title">
          <p id="follow-confirm-title" className="follow__confirm-title">
            ¿Bloquear a {targetName}?
          </p>
          <p className="follow__confirm-text">
            Se corta el seguimiento entre ustedes, no te va a poder seguir y no te va a
            encontrar en el buscador con su cuenta. Lo que no cambia: tu garage se sigue
            abriendo con el link, porque es público. Se deshace desde Ajustes.
          </p>
          <div className="follow__confirm-actions">
            <Button variant="yellow" size="sm" onClick={block}>
              Bloquear
            </Button>
            <Button variant="outline" size="sm" onClick={() => setConfirming(false)}>
              Cancelar
            </Button>
          </div>
        </div>
      )}

      {error && (
        <p className="follow__error" role="alert">
          {error}
        </p>
      )}
    </div>
  )
}
