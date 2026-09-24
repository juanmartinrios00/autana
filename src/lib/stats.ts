/**
 * Las cuentas de "cómo le va a tu aviso", sin React ni base de datos.
 *
 * La función de la base devuelve sólo los días con movimiento: los días en que
 * nadie entró no existen como fila. Para un gráfico eso no sirve ---dos barras
 * pegadas serían dos días seguidos aunque haya una semana muerta en el
 * medio--- así que acá se rellenan los huecos con ceros.
 *
 * Las fechas vienen como `2026-09-24` y se comparan como texto a propósito: es
 * el mismo día calendario en la base y en la pantalla, y pasarlas por `Date`
 * las correría de día según la zona horaria, que es el error clásico de este
 * sitio (está escrito en `lib/blog.ts`).
 */

import type { ListingDay } from './api'

/** `2026-09-24` de una fecha local, sin pasar por UTC. */
export function isoDay(date: Date): string {
  const mes = String(date.getMonth() + 1).padStart(2, '0')
  const dia = String(date.getDate()).padStart(2, '0')
  return `${date.getFullYear()}-${mes}-${dia}`
}

/** Los últimos `count` días, del más viejo al de hoy, sin huecos. */
export function fillDays(rows: readonly ListingDay[], count: number, today = new Date()): ListingDay[] {
  const porDia = new Map(rows.map((row) => [row.day, row]))
  const dias: ListingDay[] = []

  for (let atras = count - 1; atras >= 0; atras -= 1) {
    const fecha = new Date(today.getFullYear(), today.getMonth(), today.getDate() - atras)
    const day = isoDay(fecha)
    dias.push(porDia.get(day) ?? { day, views: 0, interests: 0 })
  }
  return dias
}

export interface Summary {
  views: number
  interests: number
  /** Cuánto cambiaron las visitas contra los días anteriores, en por ciento.
   *  `null` cuando antes no hubo ninguna: de cero a diez no es "infinito por
   *  ciento más", es "antes no entraba nadie". */
  trend: number | null
}

/**
 * Lo que pasó en la última mitad del período y cómo se compara con la primera.
 *
 * Catorce días partidos al medio: la semana que pasó contra la anterior. Es la
 * comparación que contesta "¿sirvió bajar el precio el lunes?".
 */
export function summarize(days: readonly ListingDay[]): Summary {
  const mitad = Math.floor(days.length / 2)
  const antes = days.slice(0, mitad)
  const ahora = days.slice(mitad)

  const sumar = (lista: readonly ListingDay[], campo: 'views' | 'interests') =>
    lista.reduce((total, day) => total + day[campo], 0)

  const viewsAntes = sumar(antes, 'views')
  const views = sumar(ahora, 'views')

  return {
    views,
    interests: sumar(ahora, 'interests'),
    trend: viewsAntes === 0 ? null : Math.round(((views - viewsAntes) / viewsAntes) * 100),
  }
}
