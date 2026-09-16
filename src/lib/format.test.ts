import { describe, expect, it } from 'vitest'
import {
  formatMileage,
  formatPrice,
  locationLabel,
  relativeDate,
  vehicleMeta,
  vehicleTitle,
} from './format'

describe('formatPrice', () => {
  it('separa los miles con punto y no muestra centavos', () => {
    expect(formatPrice(32_900)).toBe('USD 32.900')
    expect(formatPrice(1_250_000)).toBe('USD 1.250.000')
    expect(formatPrice(9_990.4)).toBe('USD 9.990')
  })

  it('acepta pesos', () => {
    expect(formatPrice(4_500_000, 'ARS')).toBe('ARS 4.500.000')
  })

  it('el cero se muestra, no se esconde', () => {
    expect(formatPrice(0)).toBe('USD 0')
  })
})

describe('formatMileage', () => {
  it('lleva la unidad pegada al numero', () => {
    expect(formatMileage(34_200)).toBe('34.200 km')
    expect(formatMileage(0)).toBe('0 km')
  })
})

describe('vehicleTitle', () => {
  it('arma marca, modelo y version', () => {
    expect(vehicleTitle({ make: 'BMW', model: '320i', trim: 'Sport Line' })).toBe(
      'BMW 320i Sport Line',
    )
  })

  /* La version es opcional y no todos los autos tienen: sin ella el titulo no
     puede quedar con un espacio colgando al final. */
  it('no deja espacios cuando no hay version', () => {
    expect(vehicleTitle({ make: 'Renault', model: 'Symbol', trim: '' })).toBe('Renault Symbol')
    expect(vehicleTitle({ make: 'Renault', model: 'Symbol', trim: null })).toBe('Renault Symbol')
  })
})

describe('vehicleMeta', () => {
  it('es la linea de datos duros de la card', () => {
    expect(vehicleMeta({ year: 2022, mileage: 34_200, transmission: 'automatic' })).toBe(
      '2022 · 34.200 km · Automática',
    )
  })
})

describe('locationLabel', () => {
  it('junta ciudad y provincia', () => {
    expect(locationLabel({ city: 'Rosario', province: 'Santa Fe' })).toBe('Rosario, Santa Fe')
  })

  /* "Buenos Aires, Buenos Aires" y "Córdoba, Córdoba" se leen como un error de
     carga, no como una ubicacion. */
  it('no repite el nombre cuando la ciudad se llama igual que la provincia', () => {
    expect(locationLabel({ city: 'Córdoba', province: 'Córdoba' })).toBe('Córdoba')
  })
})

describe('relativeDate', () => {
  const ahora = new Date(2026, 8, 16, 8, 0) // 16 de septiembre de 2026, 8 de la mañana

  it('lo de hoy dice hoy', () => {
    expect(relativeDate(new Date(2026, 8, 16, 1, 0).toISOString(), ahora)).toBe('hoy')
    expect(relativeDate(new Date(2026, 8, 16, 7, 59).toISOString(), ahora)).toBe('hoy')
  })

  /**
   * El caso que antes salia mal. Publicado anoche a las once y mirado hoy a
   * las ocho hay nueve horas de diferencia: contando por horas da cero dias y
   * la ficha decia "publicado hoy".
   */
  it('lo de anoche dice ayer, aunque hayan pasado pocas horas', () => {
    expect(relativeDate(new Date(2026, 8, 15, 23, 0).toISOString(), ahora)).toBe('ayer')
  })

  /* Y al reves: veintitres horas que no cruzan la medianoche siguen siendo hoy. */
  it('no adelanta un dia por sumar horas dentro del mismo dia', () => {
    const tarde = new Date(2026, 8, 16, 23, 30)
    expect(relativeDate(new Date(2026, 8, 16, 0, 30).toISOString(), tarde)).toBe('hoy')
  })

  it('cuenta en dias hasta el mes', () => {
    expect(relativeDate(new Date(2026, 8, 13).toISOString(), ahora)).toBe('hace 3 días')
    expect(relativeDate(new Date(2026, 7, 27).toISOString(), ahora)).toBe('hace 20 días')
  })

  it('pasa a meses y despues a años', () => {
    expect(relativeDate(new Date(2026, 7, 10).toISOString(), ahora)).toBe('hace un mes')
    expect(relativeDate(new Date(2026, 2, 16).toISOString(), ahora)).toBe('hace 6 meses')
    expect(relativeDate(new Date(2025, 8, 16).toISOString(), ahora)).toBe('hace un año')
    expect(relativeDate(new Date(2023, 8, 16).toISOString(), ahora)).toBe('hace 3 años')
  })

  /* Los relojes desincronizados existen: si el servidor sella un aviso un
     minuto en el futuro, la ficha no puede decir "hace -1 dias". */
  it('una fecha futura no rompe el texto', () => {
    expect(relativeDate(new Date(2026, 8, 20).toISOString(), ahora)).toBe('hoy')
  })

  /* Barrido: ningun dia del ultimo año puede salir con un numero negativo ni
     con un texto vacio. */
  it('nunca devuelve un numero negativo', () => {
    for (let atras = 0; atras < 400; atras += 1) {
      const fecha = new Date(2026, 8, 16 - atras, 12, 0)
      const texto = relativeDate(fecha.toISOString(), ahora)
      expect(texto, `hace ${atras} dias`).not.toMatch(/-/)
      expect(texto.length, `hace ${atras} dias`).toBeGreaterThan(0)
    }
  })
})
