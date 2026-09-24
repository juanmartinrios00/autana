import { describe, expect, it } from 'vitest'
/* Con `?raw`, igual que los otros tests que leen el esquema: la app se tipa sin
   los tipos de Node a propósito. */
import schema from '../../supabase/schema.sql?raw'
/* El estado vive en la 006 y no en el esquema: ahí se amplió el `check` para
   sumar `blocked`, que es lo que pone la moderación. */
import reportsSql from '../../supabase/migrations/006_reports.sql?raw'
import {
  bodyLabels,
  bodyTypes,
  conditionLabels,
  conditions,
  currencies,
  currencyLabels,
  drivetrainLabels,
  sellerTypeLabels,
  statusLabels,
  formatMileage,
  formatPrice,
  fuelLabels,
  fuelTypes,
  locationLabel,
  relativeDate,
  transmissionLabels,
  transmissions,
  vehicleMeta,
  vehicleTitle, slugTitle, soloDigitos, conPuntos,
} from './format'

describe('formatPrice', () => {
  it('separa los miles con punto y no muestra centavos', () => {
    expect(formatPrice(32_900, 'USD')).toBe('USD 32.900')
    expect(formatPrice(1_250_000, 'USD')).toBe('USD 1.250.000')
    expect(formatPrice(9_990.4, 'USD')).toBe('USD 9.990')
  })

  it('los pesos se separan igual, y son números mucho más largos', () => {
    expect(formatPrice(4_500_000, 'ARS')).toBe('ARS 4.500.000')
    expect(formatPrice(38_900_000, 'ARS')).toBe('ARS 38.900.000')
  })

  it('el cero se muestra, no se esconde', () => {
    expect(formatPrice(0, 'USD')).toBe('USD 0')
  })

  /* La moneda no tiene default a propósito: con avisos en pesos, una llamada
     que se la olvide muestra un precio en pesos rotulado en dólares, que es un
     error de tres ceros que nadie lee como error. Esto deja anotado que el
     parámetro es obligatorio y que sacarlo es una regresión. */
  it('siempre dice en qué moneda está', () => {
    for (const currency of currencies) {
      expect(formatPrice(1000, currency).startsWith(currency)).toBe(true)
    }
  })
})

describe('formatMileage', () => {
  it('lleva la unidad pegada al numero', () => {
    expect(formatMileage(34_200)).toBe('34.200 km')
    expect(formatMileage(0)).toBe('0 km')
  })
})

describe('soloDigitos', () => {
  it('entiende los miles con punto, que un campo numerico no entiende', () => {
    expect(soloDigitos('18.500.000')).toBe('18500000')
    expect(soloDigitos('58.400')).toBe('58400')
    expect(soloDigitos('USD 12 500')).toBe('12500')
  })

  it('tira los centavos, pero no una coma de miles', () => {
    expect(soloDigitos('18.500.000,00')).toBe('18500000')
    expect(soloDigitos('12500,5')).toBe('12500')
    expect(soloDigitos('12,500')).toBe('12500')
  })

  it('deja el cero solo, que es un 0 km, y saca los de adelante', () => {
    expect(soloDigitos('0')).toBe('0')
    expect(soloDigitos('00058')).toBe('58')
    expect(soloDigitos('')).toBe('')
    expect(soloDigitos('abc')).toBe('')
  })
})

describe('conPuntos', () => {
  it('separa los miles como se leen aca', () => {
    expect(conPuntos('18500000')).toBe('18.500.000')
    expect(conPuntos('12500')).toBe('12.500')
    expect(conPuntos('950')).toBe('950')
    expect(conPuntos('')).toBe('')
  })

  it('ida y vuelta da lo mismo', () => {
    expect(soloDigitos(conPuntos('1234567'))).toBe('1234567')
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


/**
 * Cada lista del dominio está escrita tres veces: el tipo de TypeScript, el
 * `Record` de etiquetas y el `check` de la columna en Postgres.
 *
 * Las dos primeras las ata el compilador ---un `Record<FuelType, string>` no
 * compila si falta una--- y por eso las opciones del panel de filtros ahora
 * salen de las etiquetas en vez de ser una cuarta lista escrita a mano. La
 * tercera no la ata nadie, y es la que puede romper de verdad: si el `check`
 * conoce un valor que las etiquetas no, la ficha muestra un campo vacío donde
 * iba el combustible; si las etiquetas conocen uno que el `check` no, publicar
 * ese auto falla con un error de Postgres que nadie va a entender.
 */
describe('las listas del dominio contra el esquema', () => {
  const checkValues = (column: string) => {
    /* `String.raw` y no un template común: adentro de uno común `\s` es `s`,
       `\(` es `(` y `\n` es un salto de línea de verdad, así que la expresión
       le llega al `RegExp` ya desarmada. */
    const pattern = String.raw`${column}\s+text[^\n]*check \(${column} in \(([^)]+)\)\)`
    const match = schema.match(new RegExp(pattern))
    expect(match, `no se encontró el check de ${column}`).not.toBeNull()
    return [...match![1]!.matchAll(/'([^']+)'/g)].map((m) => m[1]).sort()
  }

  it('los combustibles', () => {
    expect([...fuelTypes].sort()).toEqual(checkValues('fuel_type'))
  })

  it('las transmisiones', () => {
    expect([...transmissions].sort()).toEqual(checkValues('transmission'))
  })

  it('las carrocerías', () => {
    expect([...bodyTypes].sort()).toEqual(checkValues('body_type'))
  })

  it('las condiciones', () => {
    expect([...conditions].sort()).toEqual(checkValues('condition'))
  })

  /* La tracción no tiene lista derivada porque no es un filtro, pero la
     etiqueta se muestra en las especificaciones igual. */
  it('las tracciones', () => {
    expect(Object.keys(drivetrainLabels).sort()).toEqual(checkValues('drivetrain'))
  })

  /* Las opciones que se pintan son exactamente las etiquetas: si alguien vuelve
     a escribir una lista al lado, esto lo agarra. */
  it('las opciones del filtro son las etiquetas, en el mismo orden', () => {
    expect(fuelTypes).toEqual(Object.keys(fuelLabels))
    expect(transmissions).toEqual(Object.keys(transmissionLabels))
    expect(bodyTypes).toEqual(Object.keys(bodyLabels))
    expect(conditions).toEqual(Object.keys(conditionLabels))
  })

  it('ninguna etiqueta queda vacía', () => {
    const todas = [fuelLabels, transmissionLabels, bodyLabels, conditionLabels, drivetrainLabels]
    for (const labels of todas) {
      for (const [key, label] of Object.entries(labels)) {
        expect(label.length, key).toBeGreaterThan(0)
      }
    }
  })
})


describe('las otras dos listas contra el esquema', () => {
  const values = (text: string, pattern: string) => {
    const match = text.match(new RegExp(pattern))
    expect(match, `no se encontró: ${pattern}`).not.toBeNull()
    return [...match![1]!.matchAll(/'([^']+)'/g)].map((m) => m[1]).sort()
  }

  /* `statusLabels` tiene cinco: los cuatro del esquema más `blocked`, que la
     migración 006 agregó para la moderación. Si alguien lee sólo el esquema y
     "corrige" las etiquetas sacando `blocked`, un aviso bloqueado queda con la
     celda de estado vacía justo en el panel donde se lo mira. */
  it('los estados de un aviso salen de la 006, no del esquema', () => {
    expect(Object.keys(statusLabels).sort()).toEqual(
      values(reportsSql, String.raw`status in \(([^)]+)\)`),
    )
  })

  /* La moneda es la lista mas chica y la que mas cuesta si se desincroniza: un
     valor que el `check` acepta y las etiquetas no deja el select sin esa
     opcion, y uno que las etiquetas ofrecen y el `check` no hace que publicar
     falle recien al apretar el boton, con el aviso entero escrito. */
  it('las monedas', () => {
    expect(Object.keys(currencyLabels).sort()).toEqual(
      values(schema, String.raw`currency\s+text[^
]*check \(currency in \(([^)]+)\)\)`),
    )
  })

  it('los tipos de vendedor', () => {
    expect(Object.keys(sellerTypeLabels).sort()).toEqual(
      values(schema, String.raw`seller_type\s+text[^\n]*check \(seller_type in \(([^)]+)\)\)`),
    )
  })
})

/**
 * La barra de comparación etiqueta lo elegido con el slug, sin pedirle los
 * autos a la base. El slug termina en un código al azar ---dos avisos iguales
 * no pueden chocar--- y ese código se veía en pantalla.
 */
describe('slugTitle', () => {
  it('saca el código del final y deja el nombre', () => {
    expect(slugTitle('renault-symbol-2010-3hbszl')).toBe('Renault Symbol 2010')
    expect(slugTitle('toyota-corolla-xei-2018-egobba')).toBe('Toyota Corolla Xei 2018')
  })

  it('con un slug corto no inventa: devuelve lo que hay', () => {
    expect(slugTitle('fiat-600')).toBe('Fiat 600')
    expect(slugTitle('auto')).toBe('Auto')
  })

  it('no rompe con un slug vacío', () => {
    expect(slugTitle('')).toBe('')
  })
})
