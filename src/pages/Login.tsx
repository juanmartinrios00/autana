import { useState, type FormEvent } from 'react'
import { Link, Navigate, useLocation } from 'react-router-dom'
import { Button } from '../components/ui/Button'
import { Icon } from '../components/ui/Icon'
import { Input } from '../components/ui/Input'
import { useAuth } from '../hooks/useAuth'
import {
  MIN_PASSWORD,
  NeedsConfirmationError,
  resendConfirmation,
  sendPasswordReset,
} from '../lib/auth'
import { describeError } from '../lib/errors'
import type { SellerType } from '../types'
import './Login.css'

type Mode = 'signin' | 'signup'

/**
 * El tipo de vendedor se elige acá, al crear la cuenta, y no después en
 * Ajustes.
 *
 * Antes toda cuenta nacía particular y una agencia se enteraba de que existía
 * el ajuste cuando se chocaba con el tope de 5 avisos cargando su stock. Es
 * además la separación sobre la que se apoya cualquier plan pago futuro: si no
 * se sabe quién es agencia desde el primer día, después hay que adivinarlo.
 *
 * Lo que se elige acá es lo mismo que se puede cambiar en Ajustes: no es una
 * cuenta de otro tipo, ni hay una aprobación que esperar.
 */
const KINDS: { value: SellerType; title: string; text: string }[] = [
  {
    value: 'private',
    title: 'Particular',
    text: 'Vendo mi auto. Hasta 5 avisos activos.',
  },
  {
    value: 'dealer',
    title: 'Concesionaria',
    text: 'Tengo una agencia. Hasta 25 avisos activos y lugar en la portada.',
  },
]

export function Login() {
  const { session, signIn, signUp, sendMagicLink } = useAuth()
  const location = useLocation()

  const [mode, setMode] = useState<Mode>('signin')
  const [kind, setKind] = useState<SellerType>('private')
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')

  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [linkSent, setLinkSent] = useState(false)
  const [resetSent, setResetSent] = useState(false)
  const [checkYourMail, setCheckYourMail] = useState(false)
  const [resent, setResent] = useState(false)

  const from = (location.state as { from?: string } | null)?.from ?? '/'

  /* Si ya hay sesión (por ejemplo al volver del magic link), no hay nada que
     pedir: va directo a donde quería ir. */
  if (session) return <Navigate to={from} replace />

  function validate(): string | null {
    if (!email.includes('@') || !email.includes('.')) return 'Ingresá un mail válido.'
    if (password.length < MIN_PASSWORD)
      return `La contraseña tiene que tener al menos ${MIN_PASSWORD} caracteres.`
    if (mode === 'signup' && name.trim().length < 2) {
      return kind === 'dealer' ? 'Poné el nombre de la agencia.' : 'Poné tu nombre.'
    }
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
      else await signUp(email, password, name.trim(), kind)
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
      /* En modo registro el link puede crear la cuenta, así que se lleva lo
         que ya eligió. En modo ingreso no se manda nada: la cuenta ya existe y
         no hay que pisarle el perfil. */
      await sendMagicLink(
        email,
        mode === 'signup' ? { name: name.trim() || undefined, sellerType: kind } : undefined,
      )
      setLinkSent(true)
    } catch (cause) {
      setError(describeError(cause, 'No pudimos mandar el mail. Probá de nuevo en un momento.'))
    } finally {
      setBusy(false)
    }
  }

  /**
   * Reenviar el mail que no llegó, sin salir de esta pantalla.
   *
   * Cuál se reenvía depende de cuál se mandó: el de confirmación de la cuenta o
   * el link para entrar. Antes acá había un "volvé a intentar" que sólo volvía
   * al formulario, y desde el formulario el alta ya no se podía repetir — el
   * mail estaba tomado por la cuenta sin confirmar.
   */
  async function handleResend() {
    setError(null)
    setBusy(true)
    try {
      if (checkYourMail) await resendConfirmation(email)
      else await sendMagicLink(email)
      setResent(true)
    } catch (cause) {
      setError(describeError(cause, 'No pudimos mandar el mail. Probá de nuevo en un momento.'))
    } finally {
      setBusy(false)
    }
  }

  async function handleReset() {
    if (!email.trim()) {
      setError('Poné tu mail y te mandamos el link.')
      return
    }

    setError(null)
    setBusy(true)
    try {
      await sendPasswordReset(email.trim())
      setResetSent(true)
    } catch (cause) {
      setError(describeError(cause, 'No pudimos mandar el mail. Probá de nuevo en un momento.'))
    } finally {
      setBusy(false)
    }
  }

  if (resetSent) {
    return (
      <div className="page login">
        <div className="card card--pad login__card login__card--sent">
          <span className="login__sent-icon">
            <Icon name="message" size={26} />
          </span>
          <h1 className="login__title">Revisá tu mail</h1>
          <p className="login__text">
            Te mandamos un link a <strong>{email}</strong> para poner una contraseña nueva.
            Dura poco tiempo, así que abrilo ahora.
          </p>
        </div>
      </div>
    )
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
              disabled={busy}
              onClick={() => void handleResend()}
            >
              que te lo mandemos de nuevo
            </button>
            .{' '}
            <button
              type="button"
              className="login__again"
              onClick={() => {
                setLinkSent(false)
                setCheckYourMail(false)
                setResent(false)
              }}
            >
              Volver
            </button>
          </p>
          {resent && <p className="login__resent">Listo, lo mandamos de nuevo.</p>}
          {error && <p className="login__resent login__resent--bad">{error}</p>}
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
            <>
              {/* Radios de verdad, no botones: de dos opciones así se elige
                  una sola, y el navegador ya sabe decir eso. */}
              <fieldset className="login__kinds">
                <legend className="login__kinds-legend">¿Cómo vas a publicar?</legend>
                {KINDS.map((option) => (
                  <label
                    key={option.value}
                    className={`login-kind${kind === option.value ? ' login-kind--on' : ''}`}
                  >
                    <input
                      type="radio"
                      name="kind"
                      className="login-kind__radio"
                      value={option.value}
                      checked={kind === option.value}
                      onChange={() => setKind(option.value)}
                    />
                    <span className="login-kind__body">
                      <span className="login-kind__title">{option.title}</span>
                      <span className="login-kind__text">{option.text}</span>
                    </span>
                  </label>
                ))}
              </fieldset>

              <Input
                label={kind === 'dealer' ? 'Nombre de la agencia' : 'Tu nombre'}
                autoComplete={kind === 'dealer' ? 'organization' : 'name'}
                placeholder={
                  kind === 'dealer'
                    ? 'Como la conocen los compradores'
                    : 'Cómo te van a ver los compradores'
                }
                value={name}
                onChange={(event) => setName(event.target.value)}
              />
            </>
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

        {/* Dicho acá y no en la página de concesionarias, porque es acá donde
            alguien podría creer que eligiendo "Concesionaria" ya queda con el
            sello. No queda: ese lo ponemos a mano. */}
        {mode === 'signup' && kind === 'dealer' && (
          <p className="login__kinds-hint">
            Podés cambiarlo después en Ajustes. El sello de <strong>Verificada</strong> es
            aparte: lo ponemos a mano tras confirmar que la agencia existe.{' '}
            <Link to="/dealers">Qué cambia si sos concesionaria</Link>.
          </p>
        )}

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

        {/* Esto es, en los hechos, la recuperación de cuenta: no hay ninguna
            otra forma de volver a entrar si alguien olvida su contraseña. Antes
            decía "Mandame un link por mail" a secas y se leía como un segundo
            camino para registrarse, al punto de tapar que la contraseña era el
            principal.

            Cuando exista un cambio de contraseña de verdad, esto se puede
            reemplazar. Hasta entonces sacarlo dejaría afuera de su propia
            cuenta —y de sus publicaciones— a cualquiera que se olvide. */}
        {mode === 'signin' && (
          /* Esta es la recuperacion de verdad: manda un link que deja poner una
             contrasenia nueva. El de abajo solo deja entrar. */
          <p className="login__recover-hint">
            ¿Olvidaste tu contraseña?{' '}
            <button type="button" className="login__again" onClick={() => void handleReset()}>
              Ponete una nueva
            </button>
          </p>
        )}
        <Button variant="outline" block disabled={busy} onClick={() => void handleMagicLink()}>
          Entrar con un link por mail
        </Button>
        <p className="login__recover-hint login__recover-hint--after">
          Este te deja entrar sin contraseña, pero no la cambia.
        </p>

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
