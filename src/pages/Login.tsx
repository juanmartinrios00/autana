import { useState, type FormEvent } from 'react'
import { Link, Navigate, useLocation } from 'react-router-dom'
import { Button } from '../components/ui/Button'
import { Icon } from '../components/ui/Icon'
import { Input } from '../components/ui/Input'
import { useAuth } from '../hooks/useAuth'
import { MIN_PASSWORD, NeedsConfirmationError } from '../lib/auth'
import { describeError } from '../lib/errors'
import './Login.css'

type Mode = 'signin' | 'signup'

export function Login() {
  const { session, signIn, signUp, sendMagicLink } = useAuth()
  const location = useLocation()

  const [mode, setMode] = useState<Mode>('signin')
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')

  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [linkSent, setLinkSent] = useState(false)
  const [checkYourMail, setCheckYourMail] = useState(false)

  const from = (location.state as { from?: string } | null)?.from ?? '/'

  /* Si ya hay sesión (por ejemplo al volver del magic link), no hay nada que
     pedir: va directo a donde quería ir. */
  if (session) return <Navigate to={from} replace />

  function validate(): string | null {
    if (!email.includes('@') || !email.includes('.')) return 'Ingresá un mail válido.'
    if (password.length < MIN_PASSWORD)
      return `La contraseña tiene que tener al menos ${MIN_PASSWORD} caracteres.`
    if (mode === 'signup' && name.trim().length < 2) return 'Poné tu nombre.'
    return null
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    const invalid = validate()
    if (invalid) {
      setError(invalid)
      return
    }

    setError(null)
    setBusy(true)
    try {
      if (mode === 'signin') await signIn(email, password)
      else await signUp(email, password, name.trim())
      /* No hace falta navegar: en cuanto hay sesión, el `Navigate` de arriba
         se encarga de llevarlo a donde quería ir. */
    } catch (cause) {
      if (cause instanceof NeedsConfirmationError) setCheckYourMail(true)
      else setError(describeError(cause, 'No pudimos ingresar. Probá de nuevo en un momento.'))
    } finally {
      setBusy(false)
    }
  }

  async function handleMagicLink() {
    if (!email.includes('@') || !email.includes('.')) {
      setError('Ingresá tu mail para que te mandemos el link.')
      return
    }

    setError(null)
    setBusy(true)
    try {
      await sendMagicLink(email)
      setLinkSent(true)
    } catch (cause) {
      setError(describeError(cause, 'No pudimos mandar el mail. Probá de nuevo en un momento.'))
    } finally {
      setBusy(false)
    }
  }

  if (linkSent || checkYourMail) {
    return (
      <div className="page login">
        <div className="card card--pad login__card login__card--sent">
          <span className="login__sent-icon">
            <Icon name="message" size={26} />
          </span>
          <h1 className="login__title">Revisá tu mail</h1>
          <p className="login__text">
            {linkSent ? (
              <>
                Te mandamos un link a <strong>{email}</strong>. Abrilo desde este mismo
                dispositivo y entrás sin contraseña.
              </>
            ) : (
              <>
                Te mandamos un mail a <strong>{email}</strong> para confirmar la cuenta. Abrilo
                y después volvé a ingresar.
              </>
            )}
          </p>
          <p className="login__legal">
            ¿No te llegó? Fijate en spam, o{' '}
            <button
              type="button"
              className="login__again"
              onClick={() => {
                setLinkSent(false)
                setCheckYourMail(false)
              }}
            >
              volvé a intentar
            </button>
            .
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="page login">
      <div className="card card--pad login__card">
        <span className="over">Autana</span>
        <h1 className="login__title">
          {mode === 'signin' ? 'Ingresá a tu cuenta' : 'Creá tu cuenta'}
        </h1>
        <p className="login__text">
          {mode === 'signin'
            ? 'Para publicar, guardar favoritos y seguir tus consultas.'
            : 'Con el mail y una contraseña alcanza. Es gratis y lleva menos de un minuto.'}
        </p>

        <form className="login__form" onSubmit={handleSubmit} noValidate>
          {mode === 'signup' && (
            <Input
              label="Tu nombre"
              autoComplete="name"
              placeholder="Cómo te van a ver los compradores"
              value={name}
              onChange={(event) => setName(event.target.value)}
            />
          )}

          <Input
            label="Mail"
            type="email"
            autoComplete="email"
            placeholder="nombre@mail.com"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
          />

          <Input
            label="Contraseña"
            type="password"
            autoComplete={mode === 'signin' ? 'current-password' : 'new-password'}
            placeholder={`Mínimo ${MIN_PASSWORD} caracteres`}
            value={password}
            error={error ?? undefined}
            onChange={(event) => setPassword(event.target.value)}
          />

          <Button type="submit" variant="yellow" size="lg" block disabled={busy}>
            {busy ? 'Un segundo…' : mode === 'signin' ? 'Ingresar' : 'Crear cuenta'}
          </Button>
        </form>

        <p className="login__switch">
          {mode === 'signin' ? '¿Todavía no tenés cuenta?' : '¿Ya tenés cuenta?'}{' '}
          <button
            type="button"
            className="login__again"
            onClick={() => {
              setMode(mode === 'signin' ? 'signup' : 'signin')
              setError(null)
            }}
          >
            {mode === 'signin' ? 'Creá una' : 'Ingresá'}
          </button>
        </p>

        <div className="login__divider">
          <span>o</span>
        </div>

        {/* Alternativa para quien no quiera inventar otra contraseña. */}
        <Button variant="outline" block disabled={busy} onClick={() => void handleMagicLink()}>
          Mandame un link por mail
        </Button>

        <p className="login__legal">
          Al continuar aceptás los <Link to="/terms">términos</Link> y la{' '}
          <Link to="/privacy">política de privacidad</Link>.
        </p>

        <div className="login__note">
          <Icon name="check" size={15} />
          <span>
            Nunca vamos a publicar nada en tu nombre ni a compartir tu mail con los compradores.
          </span>
        </div>
      </div>
    </div>
  )
}
