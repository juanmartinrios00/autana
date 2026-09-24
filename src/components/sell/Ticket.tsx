import './Ticket.css'

interface TicketProps {
  /** El slug del aviso: de su código salen el número y las barras. */
  slug: string
  vehiculo: string
  precio: string
  /** Cuándo se publicó. */
  entrada: Date
}

/**
 * La confirmación de publicar, como el ticket que te da la barrera del
 * estacionamiento al entrar.
 *
 * Es el mismo momento: el auto ya está adentro, tiene un número y una hora de
 * entrada. El número es el código del final del slug ---el que distingue dos
 * avisos iguales---, así que es de verdad el de este aviso, y las barras salen
 * de ese mismo código: dos tickets distintos nunca se ven iguales.
 *
 * Lo importante también está afuera, en el título de la pantalla; el ticket
 * lo repite en su idioma.
 */
export function Ticket({ slug, vehiculo, precio, entrada }: TicketProps) {
  const codigo = (slug.split('-').pop() ?? slug).toUpperCase()
  const fecha = entrada.toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: '2-digit' })
  const hora = entrada.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit', hour12: false })

  return (
    <div className="ticket">
      <div className="ticket__head">
        <span className="ticket__brand">auteando</span>
        <span className="ticket__kind">Ticket de entrada</span>
      </div>

      <dl className="ticket__datos">
        <div className="ticket__dato ticket__dato--wide">
          <dt>Vehículo</dt>
          <dd>{vehiculo}</dd>
        </div>
        <div className="ticket__dato">
          <dt>Entrada</dt>
          <dd>
            {fecha} {hora}
          </dd>
        </div>
        <div className="ticket__dato">
          <dt>N°</dt>
          <dd>{codigo}</dd>
        </div>
        <div className="ticket__dato ticket__dato--wide">
          <dt>Precio</dt>
          <dd className="ticket__precio">{precio}</dd>
        </div>
      </dl>

      <p className="ticket__estado">Estacionado · visible para todos</p>

      <span className="ticket__barras" aria-hidden="true">
        {barras(codigo).map((ancho, index) => (
          <span key={index} style={{ width: ancho }} className={index % 2 ? 'is-hueco' : undefined} />
        ))}
      </span>
    </div>
  )
}

/** Anchos alternados de barra y hueco, sacados de cada letra del código. */
function barras(codigo: string) {
  const anchos: number[] = []
  for (const letra of codigo.repeat(4)) {
    const n = letra.charCodeAt(0)
    anchos.push(1 + (n % 3), 1 + ((n >> 2) % 2))
  }
  return anchos
}
