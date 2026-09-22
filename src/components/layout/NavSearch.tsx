import { useId, useRef, useState, type FormEvent, type KeyboardEvent } from 'react'
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom'
import { Icon } from '../ui/Icon'
import { listMakeModels } from '../../lib/api'
import { suggest, type MakeModelCount, type Suggestion } from '../../lib/suggest'

/**
 * Buscador por texto de la navbar. Es la entrada más directa al marketplace:
 * la gente escribe "corolla 2015" antes de armar un filtro.
 *
 * Escribe sobre el mismo parámetro `q` que ya leen los filtros, así que buscar
 * desde acá y filtrar desde el listado son la misma cosa.
 *
 * Mientras se escribe, sugiere marcas y modelos publicados (`lib/suggest`).
 * Elegir una sugerencia filtra por marca y modelo; apretar Enter sin elegir
 * busca el texto como antes.
 */
export function NavSearch() {
  const [params] = useSearchParams()
  const navigate = useNavigate()
  const location = useLocation()
  const listId = useId()
  const inputRef = useRef<HTMLInputElement>(null)

  const fromUrl = params.get('q') ?? ''

  /* El input recuerda lo que escribió el usuario, pero si la URL cambia por
     otro camino (un atajo, el botón atrás) gana la URL. Guardar contra qué
     query se tipeó evita tener que sincronizar con un efecto. */
  const [typed, setTyped] = useState({ text: fromUrl, forQuery: fromUrl })
  const value = typed.forQuery === fromUrl ? typed.text : fromUrl

  /* Las marcas y modelos se piden la primera vez que alguien toca el campo, no
     al cargar la página: la navbar está en todas, y la mayoría de las visitas
     no usan el buscador. `null` es que todavía no se pidieron. */
  const [pairs, setPairs] = useState<MakeModelCount[] | null>(null)
  const pedido = useRef(false)
  const [open, setOpen] = useState(false)
  const [active, setActive] = useState(-1)

  const suggestions = open && pairs ? suggest(pairs, value) : []

  function load() {
    if (pedido.current) return
    pedido.current = true
    /* Si falla, el buscador anda igual sin sugerencias. */
    void listMakeModels()
      .then(setPairs)
      .catch(() => setPairs([]))
  }

  function write(text: string) {
    setTyped({ text, forQuery: fromUrl })
    setOpen(true)
    setActive(-1)
  }

  function choose(item: Suggestion) {
    const next = new URLSearchParams({ make: item.make })
    if (item.model) next.set('model', item.model)
    setOpen(false)
    setTyped({ text: '', forQuery: '' })
    inputRef.current?.blur()
    navigate({ pathname: '/autos', search: next.toString() })
  }

  function handleKey(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === 'Escape') {
      setOpen(false)
      return
    }
    if (suggestions.length === 0) return
    if (event.key === 'ArrowDown') {
      event.preventDefault()
      setActive((index) => (index + 1) % suggestions.length)
    } else if (event.key === 'ArrowUp') {
      event.preventDefault()
      setActive((index) => (index <= 0 ? suggestions.length - 1 : index - 1))
    } else if (event.key === 'Enter' && active >= 0) {
      event.preventDefault()
      choose(suggestions[active]!)
    }
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setOpen(false)

    /* Si ya estamos en el listado, buscar afina lo que hay: se conservan los
       filtros puestos. Desde cualquier otra página, arranca limpio. */
    const next = location.pathname === '/autos' ? new URLSearchParams(params) : new URLSearchParams()

    const term = value.trim()
    if (term) next.set('q', term)
    else next.delete('q')
    next.delete('page')

    navigate({ pathname: '/autos', search: next.toString() })
  }

  const showing = suggestions.length > 0

  return (
    <form className="navsearch" onSubmit={handleSubmit} role="search">
      <label className="sr-only" htmlFor="navsearch-input">
        Buscar vehículos
      </label>

      {/* La lupa es el botón de submit, no un adorno: así hay algo clickeable
          sin sumar un bloque de color a una navbar que tiene que ser liviana. */}
      <button type="submit" className="navsearch__submit" aria-label="Buscar">
        <Icon name="search" size={16} />
      </button>

      <input
        ref={inputRef}
        id="navsearch-input"
        type="search"
        className="navsearch__input"
        placeholder="Buscá un auto"
        autoComplete="off"
        role="combobox"
        aria-expanded={showing}
        aria-controls={listId}
        aria-autocomplete="list"
        aria-activedescendant={showing && active >= 0 ? `${listId}-${active}` : undefined}
        value={value}
        onFocus={() => {
          load()
          setOpen(true)
        }}
        onBlur={() => setOpen(false)}
        onKeyDown={handleKey}
        onChange={(event) => write(event.target.value)}
      />

      {value && (
        <button
          type="button"
          className="navsearch__clear"
          aria-label="Borrar la búsqueda"
          onClick={() => setTyped({ text: '', forQuery: fromUrl })}
        >
          <Icon name="close" size={12} />
        </button>
      )}

      {/* Siempre en el DOM, para que `aria-controls` apunte a algo. El
          `mousedown` se frena para que el campo no pierda el foco ---y cierre
          la lista--- antes de que llegue el clic. */}
      <ul
        id={listId}
        role="listbox"
        aria-label="Sugerencias"
        className="navsearch__suggestions"
        hidden={!showing}
        onMouseDown={(event) => event.preventDefault()}
      >
        {suggestions.map((item, index) => (
          <li
            key={`${item.make}|${item.model ?? ''}`}
            id={`${listId}-${index}`}
            role="option"
            aria-selected={index === active}
            className={index === active ? 'navsearch__option is-active' : 'navsearch__option'}
            onMouseEnter={() => setActive(index)}
            onClick={() => choose(item)}
          >
            <span className="navsearch__option-name">
              {item.make}
              {item.model ? ` ${item.model}` : <span className="navsearch__option-all"> · todos los modelos</span>}
            </span>
            <span className="navsearch__option-count mono">
              {item.count} {item.count === 1 ? 'auto' : 'autos'}
            </span>
          </li>
        ))}
      </ul>
    </form>
  )
}
