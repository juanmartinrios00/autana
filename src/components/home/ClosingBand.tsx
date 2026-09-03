import { Link } from 'react-router-dom'
import { CtaSplit } from '../ui/CtaSplit'
import { Icon } from '../ui/Icon'
import './HomeSections.css'

/** Cierre de la home: los dos caminos, uno al lado del otro. */
export function ClosingBand() {
  return (
    <section className="closing">
      <div className="closing__col">
        <span className="over closing__eyebrow">Si querés vender</span>
        <h2 className="closing__title">Publicá tu auto gratis</h2>
        <p className="closing__text">
          Cuatro pasos cortos, el borrador se guarda solo y los interesados te escriben
          directo al WhatsApp. No cobramos comisión.
        </p>
        <CtaSplit to="/sell">Publicar mi vehículo</CtaSplit>
      </div>

      <div className="closing__col closing__col--alt">
        <span className="over closing__eyebrow">Si querés comprar</span>
        <h2 className="closing__title">Mirá lo que hay publicado</h2>
        <p className="closing__text">
          Filtrá por marca, precio, kilometraje y ubicación. Guardá los que te gusten y
          contactá al vendedor cuando quieras.
        </p>
        <Link to="/cars" className="closing__link">
          Ver todos los autos
          <Icon name="arrowRight" size={17} />
        </Link>
      </div>
    </section>
  )
}
