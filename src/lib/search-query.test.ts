import { describe, expect, it } from 'vitest'
import type { VehicleFilters } from '../types'
import {
  activeChips,
  applyVehicleFilters,
  countActive,
  list,
  num,
  one,
  parseFilters,
  parseSort,
} from './search-query'

/**
 * Los tests del módulo que interpreta una búsqueda.
 *
 * Se prueba esto y no otra cosa porque acá el error es mudo. La pantalla de
 * resultados al menos se ve: si filtrara mal, alguien lo nota. El aviso por
 * mail de una búsqueda guardada no se ve nunca — sale, llega, y si estaba mal
 * el que se entera es el usuario. Está escrito arriba del módulo.
 *
 * Es además el único archivo que comparten el navegador y el worker, así que
 * es el único lugar donde los dos pueden empezar a entender una búsqueda de
 * forma distinta.
 */

/** Atajo: `p('make=Ford&year=2020')`. */
const p = (query: string) => new URLSearchParams(query)

/**
 * Un constructor de consultas de mentira que anota lo que le piden.
 *
 * Cumple la forma de `FilterableQuery`, que es todo lo que `applyVehicleFilters`
 * necesita. Devolver `this` imita el encadenado de postgrest-js.
 */
class FakeQuery {
  calls: { method: string; args: unknown[] }[] = []

  or(filter: string) {
    this.calls.push({ method: 'or', args: [filter] })
    return this
  }
  eq(column: string, value: unknown) {
    this.calls.push({ method: 'eq', args: [column, value] })
    return this
  }
  gte(column: string, value: unknown) {
    this.calls.push({ method: 'gte', args: [column, value] })
    return this
  }
  lte(column: string, value: unknown) {
    this.calls.push({ method: 'lte', args: [column, value] })
    return this
  }
  in(column: string, values: readonly never[]) {
    this.calls.push({ method: 'in', args: [column, [...values]] })
    return this
  }

  /** Las columnas que la consulta terminó tocando. */
  columns() {
    return this.calls.filter((call) => call.method !== 'or').map((call) => call.args[0] as string)
  }
}

function apply(filters: VehicleFilters, sellerIds?: string[]) {
  const query = new FakeQuery()
  applyVehicleFilters(query, filters, sellerIds)
  return query
}

describe('num', () => {
  it('lee un número', () => {
    expect(num(p('minPrice=15000'), 'minPrice')).toBe(15000)
  })

  it('da undefined si no está, si viene vacío o si no es número', () => {
    expect(num(p(''), 'minPrice')).toBeUndefined()
    expect(num(p('minPrice='), 'minPrice')).toBeUndefined()
    expect(num(p('minPrice=barato'), 'minPrice')).toBeUndefined()
  })

  it('rechaza infinito y NaN en vez de pasarlos a la consulta', () => {
    expect(num(p('maxPrice=Infinity'), 'maxPrice')).toBeUndefined()
    expect(num(p('maxPrice=NaN'), 'maxPrice')).toBeUndefined()
  })

  it('deja pasar el cero, que para kilómetros significa 0 km', () => {
    expect(num(p('maxMileage=0'), 'maxMileage')).toBe(0)
  })
})

describe('list', () => {
  const allowed = ['petrol', 'diesel'] as const

  it('separa por coma y se queda con lo permitido', () => {
    expect(list(p('fuelType=petrol,diesel'), 'fuelType', allowed)).toEqual(['petrol', 'diesel'])
  })

  it('descarta lo que no está en la lista', () => {
    expect(list(p('fuelType=petrol,vapor'), 'fuelType', allowed)).toEqual(['petrol'])
  })

  it('da undefined —no lista vacía— cuando no queda nada', () => {
    expect(list(p('fuelType=vapor'), 'fuelType', allowed)).toBeUndefined()
    expect(list(p('fuelType='), 'fuelType', allowed)).toBeUndefined()
    expect(list(p(''), 'fuelType', allowed)).toBeUndefined()
  })
})

describe('one', () => {
  const allowed = ['manual', 'automatic'] as const

  it('acepta sólo un valor de la lista', () => {
    expect(one(p('transmission=manual'), 'transmission', allowed)).toBe('manual')
    expect(one(p('transmission=cohete'), 'transmission', allowed)).toBeUndefined()
  })
})

describe('parseFilters', () => {
  it('lee una búsqueda completa', () => {
    const filters = parseFilters(
      p(
        'q=hilux&make=Toyota&model=Hilux&province=Salta&minYear=2018&maxYear=2024' +
          '&minPrice=10000&maxPrice=50000&maxMileage=80000' +
          '&fuelType=diesel&bodyType=pickup&condition=used' +
          '&transmission=automatic&sellerType=dealer',
      ),
    )

    expect(filters).toEqual({
      q: 'hilux',
      make: 'Toyota',
      model: 'Hilux',
      province: 'Salta',
      minYear: 2018,
      maxYear: 2024,
      minPrice: 10000,
      maxPrice: 50000,
      maxMileage: 80000,
      fuelType: ['diesel'],
      bodyType: ['pickup'],
      condition: ['used'],
      transmission: 'automatic',
      sellerType: 'dealer',
    })
  })

  it('con la query vacía no inventa ningún filtro', () => {
    expect(countActive(parseFilters(p('')))).toBe(0)
  })

  it('lee la tracción y "acepta ofertas"', () => {
    const filters = parseFilters(p('drivetrain=4x4,awd,cohete&negotiable=1'))
    expect(filters.drivetrain).toEqual(['4x4', 'awd'])
    expect(filters.negotiable).toBe(true)
    expect(parseFilters(p('negotiable=0')).negotiable).toBeUndefined()
  })

  it('ignora valores que no pertenecen al dominio', () => {
    const filters = parseFilters(p('transmission=cohete&bodyType=submarino&condition=nuevito'))
    expect(filters.transmission).toBeUndefined()
    expect(filters.bodyType).toBeUndefined()
    expect(filters.condition).toBeUndefined()
  })
})

describe('parseSort', () => {
  it('cae en relevancia si no viene o si no se entiende', () => {
    expect(parseSort(p(''))).toBe('relevance')
    expect(parseSort(p('sort=por-color'))).toBe('relevance')
  })

  it('respeta un orden conocido', () => {
    expect(parseSort(p('sort=price-asc'))).toBe('price-asc')
  })
})

describe('countActive', () => {
  it('cuenta cada filtro puesto una vez', () => {
    expect(countActive({ make: 'Ford', province: 'Córdoba' })).toBe(2)
  })

  it('no cuenta los vacíos', () => {
    expect(countActive({ make: '', fuelType: [], maxPrice: undefined })).toBe(0)
  })

  /* Cuenta lo que se ve: cada valor de una lista es un chip con su propia ×,
     así que tres combustibles son tres. Contaba uno, y el badge decía "1"
     arriba de tres chips. */
  it('cuenta lo mismo que los chips que se ven', () => {
    const filters: VehicleFilters = { fuelType: ['petrol', 'diesel', 'hybrid'], make: 'Ford' }
    expect(countActive(filters)).toBe(4)
    expect(countActive(filters)).toBe(activeChips(filters).length)
  })

  /* La moneda sola, sin precio, no filtra nada: ver `applyVehicleFilters`. */
  it('la moneda sin precio no cuenta', () => {
    expect(countActive({ currency: 'ARS' })).toBe(0)
  })

  it('cuenta el cero: 0 km es un filtro puesto', () => {
    expect(countActive({ maxMileage: 0 })).toBe(1)
  })
})

describe('activeChips', () => {
  it('un chip por filtro, con el texto que se entiende', () => {
    const chips = activeChips({
      make: 'Toyota',
      maxPrice: 20000,
      currency: 'ARS',
      maxMileage: 0,
      drivetrain: ['4x4'],
      negotiable: true,
    })
    expect(chips.map((chip) => chip.label)).toEqual([
      'Toyota',
      'Hasta ARS 20.000',
      '0 km',
      'Tracción 4x4',
      'Acepta ofertas',
    ])
  })

  /* La × de un valor de lista saca ese valor y no la lista entera. */
  it('en las listas, cada valor lleva el suyo para sacarlo solo', () => {
    const chips = activeChips({ fuelType: ['diesel', 'petrol'] })
    expect(chips).toEqual([
      { key: 'fuelType', value: 'diesel', label: 'Diésel' },
      { key: 'fuelType', value: 'petrol', label: 'Nafta' },
    ])
  })

  /* Cada clave que `parseFilters` entiende tiene que poder verse como chip.
     Si se suma un filtro y no su chip, filtra sin que se vea: el visitante ve
     pocos autos y no sabe por qué. */
  it('todo filtro que se lee de la URL aparece como chip', () => {
    const todo = parseFilters(
      p(
        'q=hilux&make=Toyota&model=Hilux&province=Salta&minYear=2018&maxYear=2024' +
          '&minPrice=10000&maxPrice=50000&maxMileage=80000&fuelType=diesel&bodyType=pickup' +
          '&condition=used&transmission=automatic&sellerType=dealer&drivetrain=4x4&negotiable=1&rebajados=1',
      ),
    )
    const conValor = Object.entries(todo).filter(([, value]) => value !== undefined).map(([key]) => key)
    const conChip = new Set(activeChips(todo).map((chip) => chip.key))
    expect(conValor.filter((key) => key !== 'currency' && !conChip.has(key))).toEqual([])
  })
})

describe('applyVehicleFilters', () => {
  it('sin filtros no toca la consulta', () => {
    expect(apply({}).calls).toEqual([])
  })

  /* La misma ventana de un mes que la marca de "bajó" en la caja: un auto que
     aparece en "Bajaron de precio" tiene que verse rebajado. */
  it('los rebajados son los que bajaron en el último mes', () => {
    const [call] = apply({ rebajados: true }).calls
    expect(call?.method).toBe('gte')
    expect(call?.args[0]).toBe('price_dropped_at')
    const desde = new Date(call?.args[1] as string).getTime()
    const dias = (Date.now() - desde) / 86_400_000
    expect(dias).toBeGreaterThan(29.9)
    expect(dias).toBeLessThan(30.1)
  })

  it('manda cada filtro a su columna y con su operador', () => {
    const query = apply({
      make: 'Ford',
      model: 'Ranger',
      province: 'Salta',
      minYear: 2018,
      maxYear: 2024,
      minPrice: 10000,
      maxPrice: 50000,
      maxMileage: 80000,
      transmission: 'automatic',
      drivetrain: ['4x4'],
      negotiable: true,
      fuelType: ['diesel'],
      bodyType: ['pickup'],
      condition: ['used'],
    })

    expect(query.calls).toEqual([
      { method: 'eq', args: ['make', 'Ford'] },
      { method: 'eq', args: ['model', 'Ranger'] },
      { method: 'eq', args: ['province', 'Salta'] },
      { method: 'gte', args: ['year', 2018] },
      { method: 'lte', args: ['year', 2024] },
      { method: 'eq', args: ['currency', 'USD'] },
      { method: 'gte', args: ['price', 10000] },
      { method: 'lte', args: ['price', 50000] },
      { method: 'lte', args: ['mileage', 80000] },
      { method: 'eq', args: ['transmission', 'automatic'] },
      { method: 'in', args: ['drivetrain', ['4x4']] },
      { method: 'eq', args: ['negotiable', true] },
      { method: 'in', args: ['fuel_type', ['diesel']] },
      { method: 'in', args: ['body_type', ['pickup']] },
      { method: 'in', args: ['condition', ['used']] },
    ])
  })

  /**
   * El tope de precio arrastra la moneda.
   *
   * Sin esto, un `maxPrice=30000` se compara contra la columna cruda y un aviso
   * de treinta millones de pesos entra en "hasta USD 30.000". La consulta
   * funciona, no hay error, y el resultado es un auto de treinta mil dólares al
   * lado de uno que vale diez veces menos.
   */
  it('un tope de precio se aplica en una sola moneda', () => {
    expect(apply({ maxPrice: 30_000 }).calls).toEqual([
      { method: 'eq', args: ['currency', 'USD'] },
      { method: 'lte', args: ['price', 30_000] },
    ])

    expect(apply({ maxPrice: 30_000_000, currency: 'ARS' }).calls).toEqual([
      { method: 'eq', args: ['currency', 'ARS'] },
      { method: 'lte', args: ['price', 30_000_000] },
    ])
  })

  /* Dólares cuando no se dice: es lo que valen los links que ya existen ---el
     selector de presupuesto de la portada manda `maxPrice` a secas--- y es la
     lectura natural de un número como 30.000 en un marketplace de autos
     argentino. */
  it('sin moneda declarada, el tope es en dólares', () => {
    expect(apply({ minPrice: 5000 }).calls).toContainEqual({
      method: 'eq',
      args: ['currency', 'USD'],
    })
  })

  /**
   * Y al revés: sin tope no se filtra por moneda.
   *
   * Alguien que busca un auto busca un auto, no una moneda. Esconderle la mitad
   * del catálogo por un dato que no pidió sería peor que el problema que este
   * filtro viene a resolver.
   */
  it('sin tope de precio, la moneda no filtra nada', () => {
    expect(apply({ currency: 'ARS' }).calls).toEqual([])
    expect(apply({ currency: 'ARS', make: 'Ford' }).calls).toEqual([
      { method: 'eq', args: ['make', 'Ford'] },
    ])
  })

  /* El cero distingue "sin tope" de "0 km", y sólo en kilómetros. Un
     `maxMileage` tratado como el resto haría que pedir 0 km devuelva todo. */
  it('aplica maxMileage=0 como filtro, no como ausencia', () => {
    expect(apply({ maxMileage: 0 }).calls).toEqual([
      { method: 'lte', args: ['mileage', 0] },
    ])
  })

  it('en cambio un precio en cero es no poner tope', () => {
    expect(apply({ minPrice: 0, maxPrice: 0 }).calls).toEqual([])
  })

  it('deja sellerType afuera: esa columna no vive en listings', () => {
    expect(apply({ sellerType: 'dealer' }).columns()).not.toContain('seller_id')
  })

  it('filtra por vendedor cuando le pasan los ids ya resueltos', () => {
    expect(apply({}, ['abc', 'def']).calls).toEqual([
      { method: 'in', args: ['seller_id', ['abc', 'def']] },
    ])
  })

  describe('texto libre', () => {
    it('pide cada palabra por separado, en marca o en modelo', () => {
      /* Encadenados se combinan con AND: "Renault Symbol" tiene que exigir las
         dos, una en cada columna. Pidiendo la frase entera en una sola columna
         no encontraba nada. */
      expect(apply({ q: 'Renault Symbol' }).calls).toEqual([
        { method: 'or', args: ['make.ilike.%Renault%,model.ilike.%Renault%'] },
        { method: 'or', args: ['make.ilike.%Symbol%,model.ilike.%Symbol%'] },
      ])
    })

    it('saca los comodines de LIKE, que si no hacen que todo matchee', () => {
      /* `%` y `_` son comodines dentro de un ilike: dejarlos pasar convierte
         cualquier búsqueda en "traeme todo". */
      expect(apply({ q: 'ford%' }).calls).toEqual([
        { method: 'or', args: ['make.ilike.%ford%,model.ilike.%ford%'] },
      ])
      expect(apply({ q: 'f_rd' }).calls).toEqual([
        { method: 'or', args: ['make.ilike.%frd%,model.ilike.%frd%'] },
      ])
      /* Un término que era puro comodín desaparece entero. */
      expect(apply({ q: '%_' }).calls).toEqual([])
    })

    it('saca las comas y los paréntesis, que son la sintaxis del or()', () => {
      /* Sin esto, un término con coma abre una condición nueva dentro del
         `or()` y la consulta pasa a decir algo que nadie pidió. */
      const query = apply({ q: 'ford,status.eq.deleted' })
      for (const call of query.calls) {
        const filter = call.args[0] as string
        expect(filter).toBe('make.ilike.%fordstatuseqdeleted%,model.ilike.%fordstatuseqdeleted%')
      }
    })

    it('no manda nada si el texto queda vacío después de limpiarlo', () => {
      expect(apply({ q: '   ' }).calls).toEqual([])
      expect(apply({ q: '!!!' }).calls).toEqual([])
    })

    it('corta en seis palabras: una consulta no puede crecer sin límite', () => {
      const query = apply({ q: 'a b c d e f g h i j' })
      expect(query.calls).toHaveLength(6)
    })

    it('conserva números y guiones, que son parte de los nombres', () => {
      expect(apply({ q: 'C4 Mercedes-Benz' }).calls).toEqual([
        { method: 'or', args: ['make.ilike.%C4%,model.ilike.%C4%'] },
        { method: 'or', args: ['make.ilike.%Mercedes-Benz%,model.ilike.%Mercedes-Benz%'] },
      ])
    })

    it('conserva los acentos y la ñ', () => {
      expect(apply({ q: 'Citroën' }).calls).toEqual([
        { method: 'or', args: ['make.ilike.%Citroën%,model.ilike.%Citroën%'] },
      ])
    })
  })

  /**
   * La prueba que cuida el contrato entre la pantalla y el worker.
   *
   * Si mañana alguien agrega un filtro a `VehicleFilters` y lo lee en
   * `parseFilters` pero se olvida de aplicarlo acá, la pantalla lo muestra
   * como activo y la consulta lo ignora. La búsqueda guardada queda más
   * amplia de lo que el usuario pidió y el aviso llega por autos que no
   * corresponden — que es exactamente el error que este módulo existe para
   * evitar, y el que nadie ve hasta que ya se mandó.
   */
  it('aplica todos los filtros que sabe leer', () => {
    const todos = parseFilters(
      p(
        'q=hilux&make=Toyota&model=Hilux&province=Salta&minYear=2018&maxYear=2024' +
          '&minPrice=10000&maxPrice=50000&maxMileage=80000' +
          '&fuelType=diesel&bodyType=pickup&condition=used' +
          '&transmission=automatic&sellerType=dealer',
      ),
    )

    const leidos = Object.keys(todos).filter(
      (key) => todos[key as keyof VehicleFilters] !== undefined,
    )

    /* `sellerType` es la única excepción declarada: vive en `profiles`, así que
       el que llama lo resuelve antes y pasa los ids. */
    const esperados = leidos.filter((key) => key !== 'sellerType')

    const columnas = new Set(apply(todos).columns())
    const porFiltro: Record<string, string> = {
      make: 'make',
      model: 'model',
      province: 'province',
      minYear: 'year',
      maxYear: 'year',
      minPrice: 'price',
      maxPrice: 'price',
      maxMileage: 'mileage',
      transmission: 'transmission',
      fuelType: 'fuel_type',
      bodyType: 'body_type',
      condition: 'condition',
    }

    const sinAplicar = esperados.filter((key) => {
      if (key === 'q') return apply(todos).calls.every((call) => call.method !== 'or')
      const columna = porFiltro[key]
      return columna === undefined || !columnas.has(columna)
    })

    expect(sinAplicar).toEqual([])
  })
})
