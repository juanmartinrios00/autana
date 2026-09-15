import { useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { Button } from '../components/ui/Button'
import { Input } from '../components/ui/Input'
import { Select } from '../components/ui/Select'
import { useDocumentMeta } from '../hooks/useDocumentMeta'
import './Contact.css'

const contactEmail = 'contacto@autana.com.ar'

export function Contact() {
  const [sent, setSent] = useState(false)

  useDocumentMeta({
    title: 'Contacto | Autana',
    description: 'Contactá al equipo de Autana por consultas, soporte o propuestas comerciales.',
  })

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const data = new FormData(event.currentTarget)
    const subject = String(data.get('subject') ?? 'Consulta general')
    const name = String(data.get('name') ?? '')
    const email = String(data.get('email') ?? '')
    const message = String(data.get('message') ?? '')
    const body = [`Nombre: ${name}`, `Email: ${email}`, '', message].join('\n')

    setSent(true)
    window.location.href = `mailto:${contactEmail}?subject=${encodeURIComponent(`[Autana] ${subject}`)}&body=${encodeURIComponent(body)}`
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
          <div className="contact__form-head">
            <span className="over">Formulario de contacto</span>
            <h2 id="contact-form-title">Contanos en qué podemos ayudarte</h2>
          </div>

          <form className="contact__form" onSubmit={handleSubmit}>
            <div className="contact__row">
              <Input label="Nombre" name="name" autoComplete="name" required />
              <Input label="Email" name="email" type="email" autoComplete="email" required />
            </div>
            <Select
              label="Motivo"
              name="subject"
              placeholder="Elegí una opción"
              required
              options={[
                { value: 'Ayuda con mi cuenta', label: 'Ayuda con mi cuenta' },
                { value: 'Consulta sobre una publicación', label: 'Consulta sobre una publicación' },
                { value: 'Concesionarias y planes', label: 'Concesionarias y planes' },
                { value: 'Seguridad o reporte', label: 'Seguridad o reporte' },
                { value: 'Prensa y alianzas', label: 'Prensa y alianzas' },
                { value: 'Otra consulta', label: 'Otra consulta' },
              ]}
            />
            <div className="field">
              <label className="field__label" htmlFor="contact-message">Mensaje</label>
              <textarea
                className="field__control contact__textarea"
                id="contact-message"
                name="message"
                rows={7}
                minLength={20}
                placeholder="Incluí todos los detalles que nos ayuden a entender tu consulta."
                required
              />
            </div>
            <div className="contact__submit">
              <Button type="submit" variant="yellow">Preparar mensaje</Button>
              <span className="contact__form-note">
                {sent ? 'Abrimos tu aplicación de correo con el mensaje listo.' : 'Al enviar, se abrirá tu aplicación de correo.'}
              </span>
            </div>
          </form>
        </section>
      </div>
    </div>
  )
}
