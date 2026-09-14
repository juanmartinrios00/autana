import { describe, expect, it } from 'vitest'
import { bodyFor, modelsForMake } from './models'

/**
 * Los tests del catálogo.
 *
 * `bodyFor` decide qué auto se dibuja en el garage de alguien a partir de lo
 * que escribió a mano. Si se equivoca no rompe nada: dibuja una camioneta
 * donde había un sedán, y el dueño lo ve en su propio garage. Es un error que
 * no avisa, así que se fija acá.
 */

describe('bodyFor', () => {
  it('reconoce el modelo escrito tal cual', () => {
    expect(bodyFor('Toyota', 'Hilux')).toBe('pickup')
    expect(bodyFor('Renault', 'Kangoo')).toBe('van')
    expect(bodyFor('Ford', 'Mustang')).toBe('coupe')
  })

  it('reconoce el modelo con la versión atrás, que es como lo escribe la gente', () => {
    expect(bodyFor('Toyota', 'Hilux SRV 4x4')).toBe('pickup')
    expect(bodyFor('Volkswagen', 'Gol Trend Pack I')).toBe('hatchback')
  })

  it('gana el modelo más largo que calce', () => {
    /* Sin esto, todo lo que empieza con "Corolla" sería sedán. */
    expect(bodyFor('Toyota', 'Corolla XEI')).toBe('sedan')
    expect(bodyFor('Toyota', 'Corolla Cross XEI')).toBe('suv')
    expect(bodyFor('Chevrolet', 'Onix')).toBe('hatchback')
    expect(bodyFor('Chevrolet', 'Onix Plus LTZ')).toBe('sedan')
    expect(bodyFor('Renault', 'Duster Oroch')).toBe('pickup')
  })

  it('no confunde Gol con Golf', () => {
    expect(bodyFor('Volkswagen', 'Golf GTI')).toBe('hatchback')
    expect(bodyFor('Volkswagen', 'Gol')).toBe('hatchback')
    /* Mismo cuerpo, así que la prueba de verdad es que "Golf" no se quede en
       "Gol" por prefijo: con un modelo que difiere se ve. */
    expect(bodyFor('Fiat', '500X')).toBe('suv')
    expect(bodyFor('Fiat', '500')).toBe('hatchback')
  })

  it('no le importan mayúsculas, acentos, guiones ni espacios', () => {
    expect(bodyFor('toyota', 'hilux')).toBe('pickup')
    expect(bodyFor('Citroen', 'c4 cactus')).toBe('suv')
    expect(bodyFor('Volkswagen', 'TCross')).toBe('suv')
    expect(bodyFor('Volkswagen', 't cross')).toBe('suv')
    expect(bodyFor('Ford', 'F100')).toBe('pickup')
    expect(bodyFor('Mercedes Benz', 'Sprinter')).toBe('van')
  })

  it('entiende las marcas como se dicen', () => {
    expect(bodyFor('VW', 'Amarok')).toBe('pickup')
    expect(bodyFor('Chevy', 'S10')).toBe('pickup')
    expect(bodyFor('Mercedes', 'Clase G')).toBe('suv')
  })

  it('separa números que empiezan igual', () => {
    expect(bodyFor('Peugeot', '208')).toBe('hatchback')
    expect(bodyFor('Peugeot', '2008')).toBe('suv')
    expect(bodyFor('Peugeot', '3008')).toBe('suv')
    expect(bodyFor('Peugeot', '308')).toBe('hatchback')
  })

  it('reconoce los clásicos que suelen ser el primer auto', () => {
    expect(bodyFor('Ford', 'Falcon')).toBe('sedan')
    expect(bodyFor('Fiat', '600')).toBe('hatchback')
    expect(bodyFor('Renault', '12')).toBe('sedan')
  })

  it('acepta el Renault 12 escrito "R12"', () => {
    expect(bodyFor('Renault', 'R12')).toBe('sedan')
    expect(bodyFor('Renault', 'R19')).toBe('sedan')
  })

  it('no aplica lo de la R a otras marcas, donde la letra es parte del nombre', () => {
    /* BMW no tiene un "3" suelto, y aunque lo tuviera "M3" es otro auto. */
    expect(bodyFor('BMW', 'M3')).toBe('sedan')
    expect(bodyFor('Audi', 'S3')).toBe('hatchback')
  })

  it('devuelve undefined cuando no reconoce, en vez de adivinar', () => {
    expect(bodyFor('Lada', 'Niva')).toBeUndefined()
    expect(bodyFor('Toyota', 'Supra')).toBeUndefined()
    expect(bodyFor('Toyota', '')).toBeUndefined()
    expect(bodyFor('', 'Hilux')).toBeUndefined()
  })

  it('no busca el modelo en otra marca', () => {
    /* La Hilux es Toyota. Cargada con otra marca, mejor el dibujo genérico que
       una camioneta inventada. */
    expect(bodyFor('Ford', 'Hilux')).toBeUndefined()
  })
})

describe('modelsForMake', () => {
  it('trae el catálogo ordenado', () => {
    const models = modelsForMake('Toyota')
    expect(models).toContain('Hilux')
    expect(models).toContain('Corolla Cross')
    expect([...models].sort((a, b) => a.localeCompare(b, 'es'))).toEqual(models)
  })

  it('suma lo publicado que no está en el catálogo', () => {
    expect(modelsForMake('Toyota', ['Supra'])).toContain('Supra')
  })

  it('no duplica un modelo cargado con otra capitalización, y gana la del catálogo', () => {
    const models = modelsForMake('Toyota', ['hilux', 'HILUX'])
    expect(models.filter((model) => model.toLowerCase() === 'hilux')).toEqual(['Hilux'])
  })

  it('una marca desconocida devuelve sólo lo publicado', () => {
    expect(modelsForMake('Lada', ['Niva'])).toEqual(['Niva'])
    expect(modelsForMake('Lada')).toEqual([])
  })
})
