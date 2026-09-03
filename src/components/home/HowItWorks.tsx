import { Link } from 'react-router-dom'
import { Button } from '../ui/Button'
import './HomeSections.css'

const buying = [
  { title: 'Filtrá hasta encontrarlo', text: 'Marca, precio, kilometraje, transmisión y ubicación. Los filtros quedan en el link, así que podés compartir una búsqueda.' },
  { title: 'Mirá la ficha completa', text: 'Todos los datos del vehículo, las fotos que subió el vendedor y quién lo publica.' },
  { title: 'Escribile al vendedor', text: 'El contacto va directo por WhatsApp, con el mensaje ya armado. Sin intermediarios.' },
]

const selling = [
  { title: 'Cargá tu auto en 4 pasos', text: 'Datos del vehículo, fotos, precio y contacto. El borrador se guarda solo mientras lo completás.' },
  { title: 'Publicá gratis', text: 'No cobramos por publicar ni nos quedamos con una comisión de la venta.' },
  { title: 'Recibí consultas', text: 'Los interesados te escriben directo al WhatsApp que dejaste.' },
]

function Steps({ items }: { items: { title: string; text: string }[] }) {
  return (
    <ol className="steps">
      {items.map((item, index) => (
        <li className="steps__item" key={item.title}>
          <span className="steps__number mono">{String(index + 1).padStart(2, '0')}</span>
          <h3 className="steps__title">{item.title}</h3>
          <p className="steps__text">{item.text}</p>
        </li>
      ))}
    </ol>
  )
}

export function HowItWorks() {
  return (
    <section className="how">
      <div className="how__col">
        <header className="how__head">
          <span className="over">Si querés comprar</span>
          <h2 className="how__title">Encontrar auto, sin vueltas</h2>
        </header>
        <Steps items={buying} />
        <Link to="/cars">
          <Button variant="outline">Ver los autos publicados</Button>
        </Link>
      </div>

      <div className="how__col">
        <header className="how__head">
          <span className="over">Si querés vender</span>
          <h2 className="how__title">Publicar te lleva cinco minutos</h2>
        </header>
        <Steps items={selling} />
        <Link to="/sell">
          <Button variant="yellow">Publicar mi vehículo</Button>
        </Link>
      </div>
    </section>
  )
}
