import { useRef, useState, type ComponentType, type KeyboardEvent } from 'react'
import { Link } from 'react-router-dom'
import { Button } from '../ui/Button'
import {
  ContactScene,
  DetailScene,
  FilterScene,
  FreeScene,
  InboxScene,
  UploadScene,
} from './steps-scenes'
import './HowItWorks.css'

/**
 * Cómo funciona, en dos caminos que no se miran a la vez.
 *
 * Antes eran dos columnas lado a lado, comprar y vender. Con seis pasos en
 * pantalla al mismo tiempo, el que entra a vender lee tres que no le sirven
 * antes de llegar a los suyos, y en el celular las columnas se apilan: el
 * vendedor tiene que pasar de largo los tres de comprar.
 *
 * Con solapas se lee sólo el camino propio. Arranca en vender porque quien
 * entra a comprar ya tiene el buscador arriba de todo, y el que llega a
 * publicar no tiene ninguna otra puerta en la portada.
 *
 * Las solapas son `role="tab"` de verdad, con flechas del teclado, y no dos
 * botones que cambian un estado: quien navega con teclado o lector de pantalla
 * necesita saber que hay dos vistas y en cuál está.
 */

interface Step {
  title: string
  text: string
  Scene: ComponentType<{ className?: string }>
}

const selling: Step[] = [
  {
    title: 'Cargá tu auto en 4 pasos',
    text: 'Datos del vehículo, fotos, precio y contacto. El borrador se guarda solo mientras lo completás, así que podés cerrar y seguir después.',
    Scene: UploadScene,
  },
  {
    title: 'Publicá gratis',
    text: 'No cobramos por publicar ni nos quedamos con una comisión de la venta. Tampoco vendemos posiciones destacadas: nadie te pasa por delante pagando.',
    Scene: FreeScene,
  },
  {
    title: 'Recibí consultas',
    text: 'Los interesados te escriben directo al WhatsApp que dejaste, con el mensaje ya armado y el link del aviso. No hay un chat nuestro en el medio.',
    Scene: InboxScene,
  },
]

const buying: Step[] = [
  {
    title: 'Filtrá hasta encontrarlo',
    text: 'Marca, precio, kilometraje, transmisión y ubicación. Los filtros quedan en el link, así que compartir una búsqueda es copiar la dirección.',
    Scene: FilterScene,
  },
  {
    title: 'Mirá la ficha completa',
    text: 'Todos los datos del vehículo, las fotos que subió el vendedor, y quién lo publica: si es particular o agencia, y desde cuándo tiene cuenta.',
    Scene: DetailScene,
  },
  {
    title: 'Escribile al vendedor',
    text: 'El contacto va directo por WhatsApp. Sin intermediarios, sin dejar tu teléfono y sin que nadie te llame después para ofrecerte otra cosa.',
    Scene: ContactScene,
  },
]

const TABS = [
  { id: 'sell' as const, label: 'Quiero vender', steps: selling },
  { id: 'buy' as const, label: 'Quiero comprar', steps: buying },
]

type TabId = (typeof TABS)[number]['id']

export function HowItWorks() {
  const [active, setActive] = useState<TabId>('sell')
  const tabRefs = useRef<Record<string, HTMLButtonElement | null>>({})

  const current = TABS.find((tab) => tab.id === active) ?? TABS[0]

  /* Flechas para moverse entre solapas, que es lo que espera quien navega con
     teclado. Sin esto el Tab entra y sale de cada solapa una por una. */
  function onKeyDown(event: KeyboardEvent<HTMLButtonElement>) {
    const step = event.key === 'ArrowRight' ? 1 : event.key === 'ArrowLeft' ? -1 : 0
    if (step === 0) return

    event.preventDefault()
    const index = TABS.findIndex((tab) => tab.id === active)
    const next = TABS[(index + step + TABS.length) % TABS.length]
    setActive(next.id)
    tabRefs.current[next.id]?.focus()
  }

  return (
    <section className="how" aria-labelledby="how-title">
      <header className="how__head">
        <span className="over">Cómo funciona</span>
        <h2 className="how__title" id="how-title">
          Tres pasos, y del otro lado una persona.
        </h2>
      </header>

      <div className="how__tabs" role="tablist" aria-label="Comprar o vender">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            ref={(node) => {
              tabRefs.current[tab.id] = node
            }}
            type="button"
            role="tab"
            id={`how-tab-${tab.id}`}
            aria-selected={active === tab.id}
            aria-controls={`how-panel-${tab.id}`}
            /* Sólo la solapa activa entra en el orden de tabulación: el resto
               se alcanza con las flechas. Es cómo funciona un tablist. */
            tabIndex={active === tab.id ? 0 : -1}
            className={`how__tab${active === tab.id ? ' how__tab--on' : ''}`}
            onClick={() => setActive(tab.id)}
            onKeyDown={onKeyDown}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div
        className="how__panel"
        role="tabpanel"
        id={`how-panel-${current.id}`}
        aria-labelledby={`how-tab-${current.id}`}
      >
        <ol className="how__steps">
          {current.steps.map((step, index) => (
            <li className="hstep" key={step.title}>
              <div className="hstep__art">
                <step.Scene className="hstep__scene" />
              </div>
              <span className="hstep__n mono">{String(index + 1).padStart(2, '0')}</span>
              <h3 className="hstep__title">{step.title}</h3>
              <p className="hstep__text">{step.text}</p>
            </li>
          ))}
        </ol>

        <div className="how__cta">
          {current.id === 'sell' ? (
            <Link to="/sell">
              <Button variant="yellow">Publicar mi vehículo</Button>
            </Link>
          ) : (
            <Link to="/cars">
              <Button variant="yellow">Ver los autos publicados</Button>
            </Link>
          )}
        </div>
      </div>
    </section>
  )
}
