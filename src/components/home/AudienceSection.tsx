import { useRef, useState, type KeyboardEvent } from 'react'
import dealerImage from '../../assets/home/audience-dealers.jpg'
import individualImage from '../../assets/home/audience-individual.jpg'
import './AudienceSection.css'

const audiences = [
  {
    id: 'dealers' as const,
    number: '01',
    title: 'Para concesionarias',
    text: 'Publicá todo tu stock, ordená las consultas y mostrá cada vehículo con información clara desde el primer contacto.',
    image: dealerImage,
    alt: 'Una concesionaria atendiendo a un cliente',
  },
  {
    id: 'individuals' as const,
    number: '02',
    title: 'Para individuales',
    text: 'Publicá tu auto sin comisión, recibí consultas directas y administrá la venta desde un solo lugar.',
    image: individualImage,
    alt: 'Una persona junto a su auto',
  },
]

type AudienceId = (typeof audiences)[number]['id']

export function AudienceSection() {
  const [active, setActive] = useState<AudienceId>('dealers')
  const tabRefs = useRef<Record<AudienceId, HTMLButtonElement | null>>({
    dealers: null,
    individuals: null,
  })
  const current = audiences.find((item) => item.id === active) ?? audiences[0]

  function onKeyDown(event: KeyboardEvent<HTMLButtonElement>) {
    const direction = ['ArrowRight', 'ArrowDown'].includes(event.key)
      ? 1
      : ['ArrowLeft', 'ArrowUp'].includes(event.key)
        ? -1
        : 0

    if (!direction) return
    event.preventDefault()
    const index = audiences.findIndex((item) => item.id === active)
    const next = audiences[(index + direction + audiences.length) % audiences.length]
    setActive(next.id)
    tabRefs.current[next.id]?.focus()
  }

  return (
    <section className="audience" aria-labelledby="audience-title">
      <header className="audience__head">
        <span className="over">Una plataforma, dos caminos</span>
        <h2 id="audience-title" className="audience__title">
          Hecha para quien vende vehículos.
        </h2>
      </header>

      <div className="audience__frame">
        <div className="audience__tabs" role="tablist" aria-label="Tipo de vendedor">
          {audiences.map((item) => {
            const selected = active === item.id
            return (
              <button
                key={item.id}
                ref={(node) => {
                  tabRefs.current[item.id] = node
                }}
                type="button"
                role="tab"
                id={`audience-tab-${item.id}`}
                aria-selected={selected}
                aria-controls="audience-panel"
                tabIndex={selected ? 0 : -1}
                className={`audience__tab${selected ? ' audience__tab--active' : ''}`}
                onClick={() => setActive(item.id)}
                onKeyDown={onKeyDown}
              >
                <span className="audience__number mono">{item.number}</span>
                <span className="audience__copy">
                  <span className="audience__label">{item.title}</span>
                  <span className="audience__text">{item.text}</span>
                </span>
              </button>
            )
          })}
        </div>

        <div
          className="audience__visual"
          id="audience-panel"
          role="tabpanel"
          aria-labelledby={`audience-tab-${current.id}`}
        >
          <img key={current.id} src={current.image} alt={current.alt} />
        </div>
      </div>
    </section>
  )
}
