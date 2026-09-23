import { describe, expect, it } from 'vitest'
import { listingMessage, shareMessage, toE164, whatsappLink } from './whatsapp'

/**
 * El numero es el unico dato del que depende una venta: si esto falla, el
 * comprador toca "Me interesa" y no llega a ningun lado, y el vendedor nunca
 * se entera de que su telefono estaba mal escrito.
 *
 * Los casos no son inventados: son las formas en que la gente escribe su
 * numero en un formulario cuando nadie le dice como hacerlo.
 */
describe('toE164', () => {
  it('acepta el que ya viene internacional, escrito de cualquier forma', () => {
    expect(toE164('+54 9 11 4444 5555')).toBe('5491144445555')
    expect(toE164('+5491144445555')).toBe('5491144445555')
    expect(toE164('54 9 11 4444-5555')).toBe('5491144445555')
  })

  it('le saca el 0 de larga distancia', () => {
    expect(toE164('011 4444 5555')).toBe('5491144445555')
    expect(toE164('0341 555 5555')).toBe('5493415555555')
  })

  /* El caso caro. Asi escribe su celular casi todo el mundo en Argentina. */
  it('le saca el 15 del celular', () => {
    expect(toE164('011 15 4444 5555')).toBe('5491144445555')
    expect(toE164('011-15-4444-5555')).toBe('5491144445555')
    expect(toE164('0341 15 555 5555')).toBe('5493415555555')
    expect(toE164('02202 15 44 5555')).toBe('5492202445555')
  })

  /* El 15 se busca solo cuando el largo dice que esta puesto. Un abonado que
     empieza con 15 no se toca: `11 1544 5555` es un numero de diez digitos
     completo y valido. */
  it('no le saca un 15 que es parte del numero', () => {
    expect(toE164('11 1544 5555')).toBe('5491115445555')
    expect(toE164('0221 154 5555')).toBe('5492211545555')
  })

  it('rechaza el celular al que le falta la caracteristica', () => {
    /* `15 4444 5555` es un telefono distinto en cada provincia: sin la
       caracteristica no hay forma de saber a quien se le escribe. */
    expect(toE164('15 4444 5555')).toBeNull()
    expect(toE164('1544445555')).toBeNull()
  })

  it('rechaza lo que es demasiado corto para ser un telefono', () => {
    expect(toE164('4444 555')).toBeNull()
    expect(toE164('')).toBeNull()
    expect(toE164('hola')).toBeNull()
  })

  /* Antes cualquier cosa que empezara con 54 se devolvia tal cual. Un fijo de
     CABA como 5411-2233 salia como `wa.me/54112233`: ocho digitos, el chat de
     nadie. */
  it('no confunde un numero local que empieza con 54 con uno internacional', () => {
    expect(toE164('5411 2233')).toBeNull()
    expect(toE164('011 5411 2233')).toBe('5491154112233')
  })

  it('le cree al + aunque no sea argentino', () => {
    expect(toE164('+598 99 123 456')).toBe('59899123456')
    expect(toE164('+1 555 123 4567')).toBe('15551234567')
  })

  it('todo numero que sale es contactable: pais mas diez, o mas', () => {
    const escrituras = [
      '+54 9 11 4444 5555',
      '011 15 4444 5555',
      '011 4444 5555',
      '1144445555',
      '0341 15 555 5555',
      '+5491144445555',
    ]
    for (const escritura of escrituras) {
      const numero = toE164(escritura)
      expect(numero, escritura).not.toBeNull()
      expect(numero!.length, escritura).toBeGreaterThanOrEqual(12)
      expect(numero, escritura).toMatch(/^\d+$/)
    }
  })

  /* Las seis formas de escribir el mismo telefono tienen que dar el mismo
     chat. Si no, dos compradores del mismo aviso terminan en lados distintos. */
  it('la misma linea escrita de seis formas da un solo numero', () => {
    const mismas = [
      '+54 9 11 4444 5555',
      '5491144445555',
      '011 15 4444 5555',
      '011 4444 5555',
      '11 4444 5555',
      '(011) 4444-5555',
    ]
    const salidas = new Set(mismas.map((forma) => toE164(forma)))
    expect([...salidas]).toEqual(['5491144445555'])
  })
})

describe('whatsappLink', () => {
  it('arma el link con el mensaje escapado', () => {
    const link = whatsappLink('011 15 4444 5555', 'Hola, ¿sigue disponible?')
    expect(link).toBe('https://wa.me/5491144445555?text=Hola%2C%20%C2%BFsigue%20disponible%3F')
  })

  /* Sin numero no hay link, y sin link la pantalla no dibuja el boton. */
  it('no arma link cuando el numero no sirve', () => {
    expect(whatsappLink('15 4444 5555', 'Hola')).toBeNull()
    expect(whatsappLink('', 'Hola')).toBeNull()
  })
})

describe('listingMessage', () => {
  it('nombra el auto y deja el link al final', () => {
    const message = listingMessage('BMW 320i', 'https://autana.com/cars/bmw-320i')
    expect(message).toContain('BMW 320i')
    expect(message.endsWith('https://autana.com/cars/bmw-320i')).toBe(true)
  })
})

describe('shareMessage', () => {
  it('nombra el auto, su precio, y deja el link al final para que WhatsApp lo muestre', () => {
    const message = shareMessage('Renault Symbol 2012', 'USD 7.000', 'https://auteando.com/autos/x')
    expect(message).toContain('Renault Symbol 2012')
    expect(message).toContain('USD 7.000')
    expect(message.endsWith('https://auteando.com/autos/x')).toBe(true)
  })

  /* El que se le manda al vendedor pregunta; el que se le pasa a un amigo, no. */
  it('no es el mensaje que se le escribe a quien vende', () => {
    expect(shareMessage('Fiat 600', 'USD 1', 'https://x/y')).not.toContain('disponible')
  })
})
