import { Link } from 'react-router-dom'
import { GarageShowcase } from '../garage/GarageShowcase'
import { Button } from '../ui/Button'
import './GarageSection.css'

/**
 * El garage en la portada.
 *
 * Hasta acá, para alguien sin cuenta el garage no existía: la portada no lo
 * nombraba, la navbar tampoco, y los únicos accesos estaban adentro del menú
 * de la cuenta. Un visitante nuevo sólo se enteraba si alguien le mandaba un
 * link.
 *
 * Va en banda oscura, como la cabecera del propio garage, porque es lo único de
 * la portada que no es comprar ni vender: tiene que leerse como otra cosa y no
 * como una sección más del marketplace.
 *
 * "Armá el tuyo" va a `/garage/mio`, que resuelve solo si hay sesión o no: con
 * sesión lleva a tu garage, sin sesión pasa por el login y vuelve ahí.
 */
export function GarageSection() {
  return (
    <section className="gsection" aria-labelledby="gsection-title">
      <header className="gsection__head">
        <span className="over over--invert">El garage virtual</span>
        <h2 className="gsection__title" id="gsection-title">
          No todo auto es para vender.
        </h2>
        <p className="gsection__lead">
          El primero, el de hoy, el que soñás y el que no tendrías que haber vendido. Cargalos,
          mandá el link por WhatsApp y seguí el garage de los tuyos.
        </p>
      </header>

      <GarageShowcase tone="dark" />

      <div className="gsection__cta">
        <Link to="/garage/mio">
          <Button variant="yellow">Armá el tuyo</Button>
        </Link>
        <Link to="/gente">
          <Button variant="outline">Buscar a alguien</Button>
        </Link>
        <Link to="/garage" className="gsection__more">
          Qué es el garage
        </Link>
      </div>
    </section>
  )
}
