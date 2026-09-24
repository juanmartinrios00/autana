import { useEffect, useState } from 'react'
import { VehicleSlider } from '../home/VehicleSlider'
import { getVehiclesBySlugs } from '../../lib/api'
import { readRecent } from '../../lib/recent'
import { reportError } from '../../lib/report'
import type { Vehicle } from '../../types'

/**
 * Los autos que esta persona miró, en una fila.
 *
 * Se lee del navegador al montar y no se actualiza sola: mientras la pantalla
 * está abierta, la lista no cambia salvo que alguien entre a un aviso, y ahí
 * ya hubo una navegación.
 *
 * No se muestra nada hasta que llegan los autos: una fila vacía que aparece
 * y se llena mueve todo lo de abajo. Y si sólo queda uno ---porque los otros
 * se vendieron--- tampoco: una fila de un auto que ya se vio no es una
 * sección, es un recordatorio inútil.
 */
export function RecentlyViewed({ excluir = [] }: { excluir?: string[] }) {
  const [vehicles, setVehicles] = useState<Vehicle[]>([])
  /* El efecto depende de esto y no del arreglo: `excluir` es uno nuevo en cada
     render del padre, y con él en las dependencias la consulta se repetiría
     sola para siempre. */
  const saltear = excluir.join(',')

  useEffect(() => {
    const slugs = readRecent().filter((slug) => !saltear.split(',').includes(slug))
    if (slugs.length === 0) return

    let current = true
    void getVehiclesBySlugs(slugs)
      .then((found) => {
        if (!current) return
        /* En el orden en que se miraron: la consulta los devuelve como quiera. */
        setVehicles(slugs.map((slug) => found.find((car) => car.slug === slug)).filter((car) => car !== undefined))
      })
      .catch((cause) => reportError('vistos recientemente', cause))

    return () => {
      current = false
    }
  }, [saltear])

  if (vehicles.length < 2) return null

  return <VehicleSlider eyebrow="Tu recorrido" title="Vistos recientemente" vehicles={vehicles} />
}
