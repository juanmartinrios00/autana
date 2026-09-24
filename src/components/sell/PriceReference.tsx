import { useEffect, useState } from 'react'
import { Icon } from '../ui/Icon'
import { getPriceReference } from '../../lib/api'
import { formatPrice } from '../../lib/format'
import { limpiarParaBuscar, referencia } from '../../lib/referencia'
import type { Currency } from '../../types'
import './PriceReference.css'

interface PriceReferenceProps {
  make: string
  model: string
  year: number
  currency: Currency
  /** Lo que lleva cargado en el campo, para decir dónde cae. */
  price: number
  excludeId?: string | null
}

/**
 * Cuánto se pide por autos parecidos, abajo del campo de precio.
 *
 * Se pide una vez por marca, modelo, año y moneda: cambiar el número del campo
 * sólo recalcula dónde cae, sin volver a la base. Si falla o no hay suficientes
 * autos, no muestra nada: es una ayuda, y un cartel de error acá distraería
 * del formulario.
 */
export function PriceReference({ make, model, year, currency, price, excludeId }: PriceReferenceProps) {
  /* La búsqueda entera en un texto: marca y modelo limpios y en minúscula (la
     base las compara sin distinguir mayúsculas), año, moneda y el aviso que no
     cuenta. El efecto depende sólo de esto, así que tipear un espacio o cambiar
     una mayúscula no vuelve a la base. */
  const query = {
    make: limpiarParaBuscar(make).toLowerCase(),
    model: limpiarParaBuscar(model).toLowerCase(),
    year,
    currency,
    excludeId: excludeId ?? null,
  }
  const key = JSON.stringify(query)
  /* De qué búsqueda son los precios: si cambia la moneda, los de la anterior
     no se muestran ni un instante. */
  const [loaded, setLoaded] = useState<{ key: string; prices: number[] } | null>(null)

  useEffect(() => {
    let current = true
    void getPriceReference(JSON.parse(key) as typeof query)
      .then((prices) => {
        if (current) setLoaded({ key, prices })
      })
      .catch(() => {
        if (current) setLoaded({ key, prices: [] })
      })
    return () => {
      current = false
    }
  }, [key])

  const ref = loaded?.key === key ? referencia(loaded.prices, price || undefined) : null
  if (!ref) return null

  const nombre = `${make.trim()} ${model.trim()}`
  /* El rango de años que se buscó, sin pasarse del año que viene: para un 0 km
     diría "de 2024 a 2028". */
  const hasta = Math.min(year + 2, new Date().getFullYear() + 1)

  return (
    <div className="pref" role="status">
      <p className="pref__title">
        <Icon name="tag" size={15} />
        Hay {ref.count} {nombre} de {year - 2} a {hasta} publicados
      </p>
      <p className="pref__range">
        La mitad pide entre <strong>{formatPrice(ref.low, currency)}</strong> y{' '}
        <strong>{formatPrice(ref.high, currency)}</strong>.
      </p>
      {ref.position === 'encima' && (
        <p className="pref__note">
          Tu precio está por encima de casi todos. Si tiene algo que lo justifique (pocos
          kilómetros, un service recién hecho), contalo en la descripción.
        </p>
      )}
      {ref.position === 'debajo' && (
        <p className="pref__note">
          Tu precio está bastante por debajo. Si es a propósito, vas a recibir consultas rápido;
          si no, revisá que no falte un cero.
        </p>
      )}
      {ref.position === 'dentro' && <p className="pref__note">Tu precio está dentro de lo que se pide.</p>}
      <p className="pref__fine">
        Es lo que se pide, no lo que se paga: sirve para ubicarte, no para fijar el precio.
      </p>
    </div>
  )
}
