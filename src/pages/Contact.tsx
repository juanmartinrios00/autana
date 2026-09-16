import { useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { Button } from '../components/ui/Button'
import { EmptyState } from '../components/ui/EmptyState'
import { Input } from '../components/ui/Input'
import { Select } from '../components/ui/Select'
import { BRAND, pageTitle } from '../config/brand'
import { useAuth } from '../hooks/useAuth'
import { useDocumentMeta } from '../hooks/useDocumentMeta'
import { contactSubjects, sendContactMessage, type ContactSubject } from '../lib/api'
import { describeError } from '../lib/errors'
import { CONTACT_LIMITS } from '../lib/limits'
import './Contact.css'

const contactEmail = 'contacto@autana.com.ar'

/**
 * La página de contacto.
 *
 * El mensaje se guarda en la base y lo lee quien modera (019). Antes esto
 * abría el cliente de correo del visitante con un `mailto:`, que falla justo
 * con quien más necesita escribir: en el celular y en una máquina sin cliente
 * configurado el botón no hacía nada visible.
 *
 * No pide cuenta a propósito: "no puedo entrar a mi cuenta" es de las razones
 * más comunes para escribir. Si hay sesión, el nombre y el mail vienen puestos
 * y el mensaje queda atado a esa cuenta.
 */
export function Contact() {
  const { session } = useAuth()
  const user = session?.user ?? null

  const [sending, setSending] = useState(false)
  const [sent, setSent] = useState(false)
  const [failure, setFailure] = useState<string | null>(null)

  useDocumentMeta({
    title: pageTitle('Contacto'),
    description: `Contactá al equipo de ${BRAND} por consultas, soporte o propuestas comerciales.`,
  })

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (sending) return

    const data = new FormData(event.currentTarget)

    /* Campo señuelo: está escondido y una persona nunca lo ve, así que si vino
       lleno lo llenó un bot que completa todo lo que encuentra. Se le contesta
       que salió bien y no se manda nada — si le dijéramos que falló, ajusta y
       vuelve. No reemplaza al freno de la base, le saca el ruido barato. */
    if (String(data.get('website') ?? '')) {
      setSent(true)
      return
    }

    setSending(true)
    setFailure(null)

    try {
      await sendContactMessage(
        {
          name: String(data.get('name') ?? ''),
          email: String(data.get('email') ?? ''),
          subject: String(data.get('subject') ?? 'other') as ContactSubject,
          message: String(data.get('message') ?? ''),
        },
        user?.id ?? null,
      )
      setSent(true)
    } catch (cause) {
      console.error('contacto', cause)
      setFailure(describeError(cause, 'No pudimos enviar el mensaje. Probá de nuevo en un momento.'))
    } finally {
      setSending(false)
    }
  }

  return (
    <div className="contact">
      <header className="contact__hero">
        <div className="page contact__hero-inner">
          <span className="over over--invert">Hablemos</span>
          <h1 className="contact__title">Estamos para ayudarte.</h1>
          <p className="contact__lead">
            Consultas sobre publicaciones, tu cuenta, concesionarias o alianzas. Elegí el tema y
            contanos qué necesitás.
          </p>
        </div>
      </header>

      <div className="page contact__layout">
        <aside className="contact__aside">
          <div className="contact__aside-block">
            <span className="contact__label">Ayuda rápida</span>
            <p>Las respuestas sobre cuentas, publicaciones y seguridad también están en el centro de ayuda.</p>
            <Link to="/help" className="contact__text-link">Ir al centro de ayuda →</Link>
          </div>
          <div className="contact__aside-block">
            <span className="contact__label">Email</span>
            <a href={`mailto:${contactEmail}`} className="contact__email">{contactEmail}</a>
          </div>
          <div className="contact__aside-block">
            <span className="contact__label">Antes de escribir</span>
            <p>No compartas contraseñas, códigos de acceso ni datos bancarios en el mensaje.</p>
          </div>
        </aside>

        <section className="contact__form-panel" aria-labelledby="contact-form-title">
          {sent ? (
            <EmptyState
              icon="check"
              title="Recibimos tu mensaje"
              description="Te respondemos por correo al mail que dejaste. Suele tardar un día hábil."
              action={
                <Button variant="ghost" onClick={() => setSent(false)}>
                  Escribir otro
                </Button>
              }
            />
          ) : (
            <>
              <div className="contact__form-head">
                <span className="over">Formulario de contacto</span>
                <h2 id="contact-form-title">Contanos en qué podemos ayudarte</h2>
              </div>

              <form className="contact__form" onSubmit={(event) => void handleSubmit(event)}>
                <div className="contact__row">
                  <Input
                    label="Nombre"
                    name="name"
                    autoComplete="name"
                    defaultValue={user?.name ?? ''}
                    minLength={CONTACT_LIMITS.name.min}
                    maxLength={CONTACT_LIMITS.name.max}
                    required
                  />
                  <Input
                    label="Email"
                    name="email"
                    type="email"
                    autoComplete="email"
                    defaultValue={user?.email ?? ''}
                    minLength={CONTACT_LIMITS.email.min}
                    maxLength={CONTACT_LIMITS.email.max}
                    required
                  />
                </div>

                <Select
                  label="Motivo"
                  name="subject"
                  placeholder="Elegí una opción"
                  required
                  options={Object.entries(contactSubjects).map(([value, label]) => ({
                    value,
                    label,
                  }))}
                />

                <div className="field">
                  <label className="field__label" htmlFor="contact-message">Mensaje</label>
                  <textarea
                    className="field__control contact__textarea"
                    id="contact-message"
                    name="message"
                    rows={7}
                    minLength={CONTACT_LIMITS.message.min}
                    maxLength={CONTACT_LIMITS.message.max}
                    placeholder="Incluí todos los detalles que nos ayuden a entender tu consulta."
                    required
                  />
                </div>

                {/* El señuelo del comentario de arriba. `aria-hidden` y
                    `tabIndex={-1}` lo sacan también del lector de pantalla y
                    del tabulador: nadie que navegue de verdad lo encuentra. */}
                <div className="contact__trap" aria-hidden="true">
                  <label htmlFor="contact-website">No completar</label>
                  <input id="contact-website" name="website" tabIndex={-1} autoComplete="off" />
                </div>

                {failure && (
                  <p className="contact__failure" role="alert">
                    {failure}
                  </p>
                )}

                <div className="contact__submit">
                  <Button type="submit" variant="yellow" disabled={sending}>
                    {sending ? 'Enviando…' : 'Enviar mensaje'}
                  </Button>
                  <span className="contact__form-note">
                    Te respondemos por correo al mail que dejes.
                  </span>
                </div>
              </form>
            </>
          )}
        </section>
      </div>
    </div>
  )
}
