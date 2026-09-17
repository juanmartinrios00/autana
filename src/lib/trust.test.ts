import { describe, expect, it } from 'vitest'
import { BRAND } from '../config/brand'
import { computeTrust } from './trust'

const ahora = new Date(2026, 8, 16) // 16 de septiembre de 2026

describe('computeTrust', () => {
  it('el sello verificado pasa tal cual: lo pone una persona a mano', () => {
    const verificado = computeTrust(
      { verified: true, memberSince: new Date(2025, 0, 10).toISOString() },
      ahora,
    )
    expect(verificado.verified).toBe(true)

    const sinSello = computeTrust(
      { verified: false, memberSince: new Date(2025, 0, 10).toISOString() },
      ahora,
    )
    expect(sinSello.verified).toBe(false)
  })

  /**
   * Meses de calendario cumplidos, no dias sobre treinta. Alguien que se
   * registro el 31 de enero es "de enero" y recien cumple un mes en marzo:
   * contar en dias lo dejaria en un mes y monedas el 2 de marzo, y el texto
   * diria que hace un mes que esta cuando hace un dia que paso el mes.
   */
  it('cuenta meses cumplidos, no dias divididos por treinta', () => {
    const mismoDia = computeTrust(
      { verified: false, memberSince: new Date(2026, 7, 16).toISOString() },
      ahora,
    )
    expect(mismoDia.monthsOn).toBe(1)

    /* Un dia antes de cumplir el mes todavia no lo cumplio. */
    const unDiaAntes = computeTrust(
      { verified: false, memberSince: new Date(2026, 7, 17).toISOString() },
      ahora,
    )
    expect(unDiaAntes.monthsOn).toBe(0)
  })

  it('la cuenta recien hecha se marca como nueva', () => {
    const nueva = computeTrust(
      { verified: false, memberSince: new Date(2026, 8, 10).toISOString() },
      ahora,
    )
    expect(nueva.isNew).toBe(true)
    expect(nueva.monthsOn).toBe(0)
    /* En la card no entra "en auteando desde septiembre de 2026", y poner el mes
       de una cuenta de seis dias es casi una ironia: dice "cuenta nueva". */
    expect(nueva.sinceShort).toBe('Cuenta nueva')
  })

  it('la cuenta con recorrido muestra desde cuando', () => {
    const vieja = computeTrust(
      { verified: false, memberSince: new Date(2026, 2, 4).toISOString() },
      ahora,
    )
    expect(vieja.isNew).toBe(false)
    expect(vieja.monthsOn).toBe(6)
    expect(vieja.since).toBe(`en ${BRAND} desde marzo de 2026`)
    expect(vieja.sinceShort).toBe('Desde mar 2026')
  })

  it('cruza el año sin perder la cuenta', () => {
    const cruzada = computeTrust(
      { verified: false, memberSince: new Date(2024, 10, 20).toISOString() },
      ahora,
    )
    expect(cruzada.monthsOn).toBe(21)
    expect(cruzada.since).toBe(`en ${BRAND} desde noviembre de 2024`)
  })

  /* El reloj del servidor puede sellar una cuenta unos segundos adelante. Un
     "hace -1 meses" al lado del precio se lee como un error del sitio. */
  it('una fecha futura no da meses negativos', () => {
    const futura = computeTrust(
      { verified: false, memberSince: new Date(2026, 11, 1).toISOString() },
      ahora,
    )
    expect(futura.monthsOn).toBe(0)
    expect(futura.isNew).toBe(true)
  })

  /**
   * Los doce meses tienen nombre y ninguno sale vacio. Es el tipo de cosa que
   * se rompe callada: un `MONTHS` corto deja "en auteando desde  de 2026" y
   * nadie lo ve hasta que alguien se registra en diciembre.
   */
  it('los doce meses tienen nombre', () => {
    for (let mes = 0; mes < 12; mes += 1) {
      const señal = computeTrust(
        { verified: false, memberSince: new Date(2024, mes, 15).toISOString() },
        ahora,
      )
      expect(señal.since, `mes ${mes}`).not.toContain('desde  de')
      expect(señal.sinceShort, `mes ${mes}`).toMatch(/^Desde [a-zé]{3} \d{4}$/)
    }
  })

  /* Es a proposito aburrida: hechos, no un puntaje. Si algun dia vuelve a
     aparecer un numero de confianza, este test lo frena. */
  it('no devuelve ningun puntaje', () => {
    const señal = computeTrust(
      { verified: true, memberSince: new Date(2025, 5, 1).toISOString() },
      ahora,
    )
    expect(Object.keys(señal).sort()).toEqual(
      ['isNew', 'monthsOn', 'since', 'sinceShort', 'verified'].sort(),
    )
  })
})
