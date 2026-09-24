import type { Vehicle } from '../types'

/** Cuánto tiempo se muestra una rebaja. Lo mismo que miran las novedades. */
export const REBAJA_DIAS = 30

export interface Rebaja {
  /** El precio de antes, en la misma moneda. */
  before: number
  /** Cuánto bajó, en por ciento redondeado: "13% menos". */
  percent: number
}

/**
 * Si el aviso bajó de precio hace poco, cuánto.
 *
 * Los datos los escribe la base (028) con sus reglas ---que el precio de antes
 * haya estado publicado unos días, que baje al menos el uno por ciento---, así
 * que acá sólo se mira que la rebaja siga siendo reciente y que el número
 * tenga sentido. Un "antes" que no es mayor que el de ahora no se muestra: un
 * precio tachado más barato que el vigente sería un error a la vista.
 */
export function rebaja(
  vehicle: Pick<Vehicle, 'price' | 'previousPrice' | 'priceDroppedAt'>,
  now = new Date(),
): Rebaja | null {
  const { price, previousPrice, priceDroppedAt } = vehicle
  if (!previousPrice || !priceDroppedAt || previousPrice <= price) return null

  const when = new Date(priceDroppedAt).getTime()
  if (Number.isNaN(when)) return null
  const days = (now.getTime() - when) / 86_400_000
  if (days < 0 || days > REBAJA_DIAS) return null

  return {
    before: previousPrice,
    percent: Math.max(1, Math.round((1 - price / previousPrice) * 100)),
  }
}
