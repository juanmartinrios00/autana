import { Link, Navigate } from 'react-router-dom'
import { GarageShowcase } from '../components/garage/GarageShowcase'
import { Button } from '../components/ui/Button'
import { pageTitle } from '../config/brand'
import { useAuth } from '../hooks/useAuth'
import { useDarkHero } from '../hooks/useDarkHero'
import { useDocumentMeta } from '../hooks/useDocumentMeta'
import './GarageLanding.css'

/**
 * Qué es el garage, para quien todavía no tiene uno.
 *
 * Existe porque la navbar y la portada necesitaban a dónde mandar. `/g/:id`
 * es el garage de alguien en particular y `/perfil` pide sesión, así que un
 * link "Garage" para un visitante nuevo no tenía destino.
 *
 * No exige sesión: es la pantalla que convence a alguien de armar el suyo, y
 * pedirle cuenta para leerla es la forma más rápida de que no la lea.
 */
export function GarageLanding() {
  const { session } = useAuth()

  useDarkHero()

  useDocumentMeta({
    title: pageTitle('El garage virtual'),
    description:
      'Los autos que te marcaron: el primero, el de hoy, el que soñás y el que extrañás. Armá tu garage y compartilo por WhatsApp.',
  })

  return (
    <>
      <section className="glanding__head hero-bleed">
        <div className="page glanding__head-inner">
          <span className="over over--invert">El garage virtual</span>
          <h1 className="glanding__title">Los autos que te marcaron.</h1>
          <p className="glanding__lead">
            No son los que vendés. Son cuatro: el primero, el de hoy, el que soñás y el que no
            tendrías que haber vendido. Cada uno se dibuja con el auto que cargues, y si tenés la
            foto, va la foto.
          </p>

          <div className="glanding__cta">
            <Link to="/garage/mio">
              <Button variant="yellow">{session ? 'Ir a mi garage' : 'Armá el tuyo'}</Button>
            </Link>
            <Link to="/gente">
              <Button variant="outline">Buscar a alguien</Button>
            </Link>
            {session && (
              <Link to="/siguiendo" className="glanding__more">
                A quién seguís
              </Link>
            )}
          </div>
        </div>
      </section>

      <div className="page glanding__body">
        <GarageShowcase />

        <section className="glanding__how" aria-labelledby="glanding-how">
          <h2 className="glanding__subtitle" id="glanding-how">
            Cómo se usa
          </h2>
          <ol className="glanding__steps">
            <li>
              <span className="glanding__n mono">01</span>
              <h3>Cargá los autos</h3>
              <p>
                Marca, modelo y año alcanzan. La foto es opcional: sin foto, el dibujo se arma con
                la forma de tu auto.
              </p>
            </li>
            <li>
              <span className="glanding__n mono">02</span>
              <h3>Mandá el link</h3>
              <p>
                Por WhatsApp se ve con tu nombre y tus autos, no con un link pelado. Es para
                mostrarlo en el grupo.
              </p>
            </li>
            <li>
              <span className="glanding__n mono">03</span>
              <h3>Seguí a los tuyos</h3>
              <p>
                Buscá a alguien por nombre y seguilo. Cuando cambia algo en su garage, aparece
                primero en tu lista.
              </p>
            </li>
          </ol>
        </section>

        <p className="glanding__note">
          Tu garage es público: cualquiera que tenga el link lo abre. Si preferís no aparecer en
          el buscador ni en Google, se apaga en{' '}
          {session ? <Link to="/ajustes">Ajustes</Link> : 'Ajustes'}.
        </p>
      </div>
    </>
  )
}

/**
 * `/garage/mio`: el garage propio, sin saber de antemano de quién es.
 *
 * Vive detrás de `RequireAuth`, así que sin sesión pasa por el login y vuelve
 * acá, que ya sabe el id. Es lo que deja que un mismo botón "Armá el tuyo"
 * sirva para quien tiene cuenta y para quien no.
 */
export function MyGarageRedirect() {
  const { session } = useAuth()
  if (!session) return null
  return <Navigate to={`/g/${session.user.id}`} replace />
}
