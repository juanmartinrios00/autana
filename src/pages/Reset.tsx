import { useState, type FormEvent } from 'react'
import { Link, Navigate } from 'react-router-dom'
import { Button } from '../components/ui/Button'
import { Input } from '../components/ui/Input'
import { useAuth } from '../hooks/useAuth'
import { useDocumentMeta } from '../hooks/useDocumentMeta'
import { MIN_PASSWORD, setRecoveredPassword } from '../lib/auth'
import './Reset.css'

/**
 * Poner una contraseña nueva después de abrir el link de recuperación.
 *
 * Es la única pantalla que escribe una contraseña sin pedir la anterior, y por
 * eso se apoya en `recovering`: la marca que el proveedor prende sólo cuando
 * Supabase emite `PASSWORD_RECOVERY`, o sea cuando la sesión abierta vino del
 * link que llegó al correo.
 *
 * Sin esa condición, cualquiera con una sesión abierta —un teléfono
 * desbloqueado— entraría acá y se saltearía el pedido de contraseña actual que
 * hace `Ajustes`. Falla cerrado a propósito: si la marca no está, esta pantalla
 * no cambia nada y explica cómo llegar bien.
 */
export function Reset() {
  const { session, loading, recovering } = useAuth()

  const [password, setPassword] = useState('')
  const [repeat, setRepeat] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [done, setDone] = useState(false)

  useDocumentMeta({ title: 'Nueva contraseña | Autana' })

  async function submit(event: FormEvent) {
    event.preventDefault()

    if (password.length < MIN_PASSWORD) {
      setError(`Tiene que tener al menos ${MIN_PASSWORD} caracteres.`)
      return
    }
    if (password !== repeat) {
      setError('Las dos no coinciden.')
      return
    }

    setBusy(true)
    setError('')
    try {
      await setRecoveredPassword(password)
      setDone(true)
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'No pudimos cambiarla.')
    } finally {
      setBusy(false)
    }
  }

  if (loading) return null

  if (done) {
    return (
      <div className="page section reset">
        <div className="card card--pad reset__card">
          <h1 className="reset__title">Listo</h1>
          <p className="reset__text">
            Tu contraseña quedó cambiada y ya estás dentro de tu cuenta. La próxima vez
            entrás con ella, sin pedir ningún link.
          </p>
          <Link to="/profile">
            <Button variant="yellow">Ir a mi perfil</Button>
          </Link>
        </div>
      </div>
    )
  }

  /* Sin sesión, el link no se abrió o venció. Los de recuperación duran poco a
     propósito, así que lo útil es mandar a pedir otro, no explicar el error. */
  if (!session) return <Navigate to="/login" replace />

  if (!recovering) {
    return (
      <div className="page section reset">
        <div className="card card--pad reset__card">
          <h1 className="reset__title">Entrá por el link del mail</h1>
          <p className="reset__text">
            Esta pantalla sólo cambia la contraseña cuando llegás desde el link que te
            mandamos por correo. Ya tenés la sesión abierta, así que si te acordás de tu
            contraseña actual podés cambiarla desde{' '}
            <Link to="/settings">Ajustes</Link>; y si no, pedí un link nuevo.
          </p>
          <Link to="/login">
            <Button variant="outline">Pedir un link</Button>
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="page section reset">
      <form className="card card--pad reset__card" onSubmit={(event) => void submit(event)}>
        <h1 className="reset__title">Poné una contraseña nueva</h1>
        <p className="reset__text">
          No te pedimos la anterior: abrir el link que llegó a tu correo ya prueba que la
          cuenta es tuya.
        </p>

        <Input
          label="Contraseña nueva"
          type="password"
          autoComplete="new-password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
        />
        <Input
          label="Repetila"
          type="password"
          autoComplete="new-password"
          value={repeat}
          error={error || undefined}
          onChange={(event) => setRepeat(event.target.value)}
        />

        <Button type="submit" variant="yellow" block disabled={busy}>
          {busy ? 'Guardando…' : 'Guardar contraseña'}
        </Button>
      </form>
    </div>
  )
}
