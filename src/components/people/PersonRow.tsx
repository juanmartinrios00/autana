import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { Skeleton } from '../ui/Skeleton'
import './PersonRow.css'

/**
 * Una persona en una lista, que lleva a su garage.
 *
 * Vive acá y no en la hoja de una pantalla porque la usan dos: el buscador de
 * personas y la lista de a quién seguís. El CSS viaja con el chunk de la
 * página que lo importa, así que en la hoja de una sola pantalla la otra se
 * serviría sin estilos — ya pasó con las tarjetas del garage.
 */

export interface PersonRowData {
  id: string
  name: string
  avatarUrl: string | null
  city: string | null
  province: string | null
  garageCars: number
}

interface PersonRowProps {
  person: PersonRowData
  /** Un dato más al final de la línea de abajo, como cuándo actualizó. */
  extra?: ReactNode
  /** Una acción a la derecha que no navega, como desbloquear. */
  action?: ReactNode
}

export function PersonRow({ person, extra, action }: PersonRowProps) {
  /* Dos datos para distinguir homónimos: de dónde es y qué tan armado tiene el
     garage. Sin eso, un apellido común es una lista de nombres idénticos. Lo
     que no está cargado no se muestra: "Sin ubicación" no desambigua nada. */
  const place = placeOf(person)
  const meta: ReactNode[] = []
  if (place) meta.push(place)
  if (person.garageCars > 0) {
    meta.push(
      <span className="mono">
        {person.garageCars} {person.garageCars === 1 ? 'auto' : 'autos'}
      </span>,
    )
  }
  if (extra) meta.push(extra)

  const inner = (
    <>
      {person.avatarUrl ? (
        <img src={person.avatarUrl} alt="" className="person-row__avatar" />
      ) : (
        <span className="person-row__avatar person-row__avatar--empty" aria-hidden="true">
          {initials(person.name)}
        </span>
      )}

      <span className="person-row__lines">
        <span className="person-row__name">{person.name}</span>
        {meta.length > 0 && (
          <span className="person-row__meta">
            {meta.map((item, index) => (
              <span key={index} className="person-row__meta-item">
                {index > 0 && (
                  <span className="person-row__dot" aria-hidden="true">·</span>
                )}
                {item}
              </span>
            ))}
          </span>
        )}
      </span>
    </>
  )

  /* Con una acción al lado, la fila no puede ser un link entero: un botón
     adentro de un `<a>` es HTML inválido y el clic haría las dos cosas. */
  if (action) {
    return (
      <div className="person-row">
        <Link to={`/g/${person.id}`} className="person-row__main">
          {inner}
        </Link>
        <div className="person-row__action">{action}</div>
      </div>
    )
  }

  return (
    <Link to={`/g/${person.id}`} className="person-row person-row--link">
      {inner}
    </Link>
  )
}

/** Tres filas grises mientras llega la lista. */
export function PersonRowsSkeleton() {
  return (
    <ul className="person-list">
      {[0, 1, 2].map((row) => (
        <li key={row} className="person-row">
          <Skeleton className="person-row__avatar" />
          <div className="person-row__lines">
            <Skeleton width="40%" />
            <Skeleton width="25%" />
          </div>
        </li>
      ))}
    </ul>
  )
}

/**
 * De dónde es, con lo que haya cargado.
 *
 * No se usa `locationLabel` de `lib/format` porque ese espera ciudad y
 * provincia presentes —los avisos las exigen— y acá las dos son opcionales:
 * un perfil puede existir sin haber completado nada.
 */
function placeOf(person: PersonRowData): string {
  const parts = [person.city, person.province].filter(Boolean) as string[]
  return parts[0] === parts[1] ? (parts[0] ?? '') : parts.join(', ')
}

function initials(name: string): string {
  return name
    .split(' ')
    .slice(0, 2)
    .map((word) => word[0]?.toUpperCase() ?? '')
    .join('')
}
