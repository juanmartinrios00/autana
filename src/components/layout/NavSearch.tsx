import { useState, type FormEvent } from 'react'
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom'
import { Icon } from '../ui/Icon'

/**
 * Buscador por texto de la navbar. Es la entrada más directa al marketplace:
 * la gente escribe "corolla 2015" antes de armar un filtro.
 *
 * Escribe sobre el mismo parámetro `q` que ya leen los filtros, así que buscar
 * desde acá y filtrar desde el listado son la misma cosa.
 */
export function NavSearch() {
  const [params] = useSearchParams()
  const navigate = useNavigate()
  const location = useLocation()

  const fromUrl = params.get('q') ?? ''

  /* El input recuerda lo que escribió el usuario, pero si la URL cambia por
     otro camino (un atajo, el botón atrás) gana la URL. Guardar contra qué
     query se tipeó evita tener que sincronizar con un efecto. */
  const [typed, setTyped] = useState({ text: fromUrl, forQuery: fromUrl })
  const value = typed.forQuery === fromUrl ? typed.text : fromUrl

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    /* Si ya estamos en el listado, buscar afina lo que hay: se conservan los
       filtros puestos. Desde cualquier otra página, arranca limpio. */
    const next = location.pathname === '/cars' ? new URLSearchParams(params) : new URLSearchParams()

    const term = value.trim()
    if (term) next.set('q', term)
    else next.delete('q')
    next.delete('page')

    navigate({ pathname: '/cars', search: next.toString() })
  }

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
        id="navsearch-input"
        type="search"
        className="navsearch__input"
        placeholder="Buscá un auto"
        value={value}
        onChange={(event) => setTyped({ text: event.target.value, forQuery: fromUrl })}
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
    </form>
  )
}
