import { fillDays, summarize } from '../../lib/stats'
import type { ListingDay } from '../../lib/api'
import './ListingStats.css'

const DIAS = 14

/**
 * Cómo le fue al aviso en los últimos catorce días.
 *
 * Las barras son visitas por día; el texto, el resumen de la última semana
 * contra la anterior. Dos números sueltos ---"340 visitas, 12 consultas desde
 * siempre"--- no dicen si el aviso anda mejor o peor, que es lo único que
 * quien vende quiere saber para decidir si toca el precio o suma fotos.
 *
 * Sin librería de gráficos: son catorce divs con una altura. Traer una para
 * esto serían cien kilobytes en una pantalla que se abre desde el celular.
 */
export function ListingStats({ days }: { days: ListingDay[] }) {
  const serie = fillDays(days, DIAS)
  const total = serie.reduce((suma, day) => suma + day.views, 0)
  const resumen = summarize(serie)
  const pico = Math.max(...serie.map((day) => day.views), 1)

  /* Sin una sola visita en dos semanas no hay gráfico que mostrar: catorce
     barras en cero se leen como un error de la pantalla. */
  if (total === 0) return null

  return (
    <div className="lstats">
      <div className="lstats__bars" role="img" aria-label={`Visitas por día de los últimos ${DIAS} días`}>
        {serie.map((day) => (
          <span
            key={day.day}
            className={day.interests > 0 ? 'lstats__bar has-interest' : 'lstats__bar'}
            style={{ height: `${Math.max(6, Math.round((day.views / pico) * 100))}%` }}
            title={`${day.day}: ${day.views} ${day.views === 1 ? 'visita' : 'visitas'}${
              day.interests > 0 ? `, ${day.interests} ${day.interests === 1 ? 'consulta' : 'consultas'}` : ''
            }`}
          />
        ))}
      </div>

      <p className="lstats__text">
        <strong>{resumen.views}</strong> {resumen.views === 1 ? 'visita' : 'visitas'} y{' '}
        <strong>{resumen.interests}</strong>{' '}
        {resumen.interests === 1 ? 'consulta' : 'consultas'} esta semana
        {/* El porcentaje sólo cuando hay con qué comparar. */}
        {resumen.trend !== null && resumen.trend !== 0 && (
          <span className={resumen.trend > 0 ? 'lstats__trend is-up' : 'lstats__trend is-down'}>
            {resumen.trend > 0 ? '▲' : '▼'} {Math.abs(resumen.trend)}% vs. la anterior
          </span>
        )}
      </p>
    </div>
  )
}
