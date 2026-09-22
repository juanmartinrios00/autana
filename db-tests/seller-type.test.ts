import { describe, expect, it } from 'vitest'
import { newUser, readAsService, rest, asService } from './helpers'

/**
 * El tipo de cuenta (023): de particular a concesionaria no se pasa solo.
 *
 * Pasarse subía el tope de avisos activos de 5 a 25 y cambiaba lo que lee el
 * comprador al lado de cada aviso. La pantalla ya no ofrece el cambio, pero
 * la API es la que importa: con la clave pública cualquiera la llama directo.
 */
async function tipo(id: string) {
  return (await readAsService<{ seller_type: string }>('profiles', `id=eq.${id}`, 'seller_type'))
    ?.seller_type
}

describe('el tipo de cuenta', () => {
  it('un particular no se puede pasar a concesionaria', async () => {
    const user = await newUser('Particular')
    expect(await tipo(user.id)).toBe('private')

    const answer = await rest('PATCH', `profiles?id=eq.${user.id}`, user.token, { seller_type: 'dealer' })
    expect(answer.status).toBeGreaterThanOrEqual(400)
    expect(await tipo(user.id)).toBe('private')
  })

  /* Frena sólo ese cambio: el resto de Ajustes, en el mismo pedido o no,
     sigue andando. */
  it('el particular edita todo lo demás igual', async () => {
    const user = await newUser('Particular')
    const answer = await rest('PATCH', `profiles?id=eq.${user.id}`, user.token, {
      name: 'Otro nombre',
      seller_type: 'private',
    })
    expect(answer.status).toBeLessThan(300)
  })

  it('una concesionaria sí se puede pasar a particular', async () => {
    const user = await newUser('Agencia', { seller_type: 'dealer' })
    expect(await tipo(user.id)).toBe('dealer')

    const answer = await rest('PATCH', `profiles?id=eq.${user.id}`, user.token, { seller_type: 'private' })
    expect(answer.status).toBeLessThan(300)
    expect(await tipo(user.id)).toBe('private')
  })

  /* Quien administra la base lo cambia a mano cuando una concesionaria se
     registró como particular por error. */
  it('quien administra lo puede cambiar', async () => {
    const user = await newUser('Se equivocó')
    const answer = await asService('PATCH', `profiles?id=eq.${user.id}`, { seller_type: 'dealer' })
    expect(answer.status).toBeLessThan(300)
    expect(await tipo(user.id)).toBe('dealer')
  })
})
