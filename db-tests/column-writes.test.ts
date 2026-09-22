import { describe, expect, it } from 'vitest'
import { newListing, newUser, readAsService, rest, rpc } from './helpers'

/**
 * Qué columnas puede escribir cada uno (migración 017).
 *
 * Las políticas de RLS deciden qué FILA; los permisos por columna, qué se puede
 * cambiar de esa fila. Hasta la 017, cualquiera con cuenta podía cambiar
 * cualquier columna de su propia fila: hacerse admin, ponerse "Verificada",
 * inflar el número de interesados de su aviso.
 *
 * Cada caso prueba las dos mitades: que lo prohibido rebota Y que no quedó
 * escrito. Una respuesta de error con el cambio aplicado igual sería peor que
 * el agujero, porque parece arreglado.
 *
 * Y del otro lado, que lo que la aplicación escribe siga andando: un permiso
 * por columna al que le falta una columna rompe una pantalla sin avisar.
 */

describe('profiles: lo que nadie se puede cambiar solo', () => {
  it('no se puede hacer admin', async () => {
    const user = await newUser()
    const answer = await rest('PATCH', `profiles?id=eq.${user.id}`, user.token, { role: 'admin' })

    expect(answer.status).toBeGreaterThanOrEqual(400)
    const row = await readAsService<{ role: string }>('profiles', `id=eq.${user.id}`, 'role')
    expect(row?.role).toBe('user')
  })

  it('no se puede poner "Verificada"', async () => {
    const user = await newUser()
    const answer = await rest('PATCH', `profiles?id=eq.${user.id}`, user.token, { verified: true })

    expect(answer.status).toBeGreaterThanOrEqual(400)
    const row = await readAsService<{ verified: boolean }>('profiles', `id=eq.${user.id}`, 'verified')
    expect(row?.verified).toBe(false)
  })

  it('no se puede subir el tope de avisos', async () => {
    const user = await newUser()
    const answer = await rest('PATCH', `profiles?id=eq.${user.id}`, user.token, { listing_limit: 999 })

    expect(answer.status).toBeGreaterThanOrEqual(400)
    const row = await readAsService<{ listing_limit: number | null }>(
      'profiles',
      `id=eq.${user.id}`,
      'listing_limit',
    )
    expect(row?.listing_limit).toBeNull()
  })

  it('tampoco colándolo junto con un cambio legítimo', async () => {
    /* Un PATCH con una columna permitida y una prohibida tiene que rebotar
       entero: si pasara la mitad, bastaría con esconder el cambio malo adentro
       de uno bueno. */
    const user = await newUser()
    const answer = await rest('PATCH', `profiles?id=eq.${user.id}`, user.token, {
      city: 'Rosario',
      role: 'admin',
    })

    expect(answer.status).toBeGreaterThanOrEqual(400)
    const row = await readAsService<{ role: string; city: string | null }>(
      'profiles',
      `id=eq.${user.id}`,
      'role,city',
    )
    expect(row?.role).toBe('user')
    expect(row?.city).not.toBe('Rosario')
  })

  it('no se puede crear un perfil a mano', async () => {
    /* El perfil lo crea el trigger de alta. Si se pudiera insertar a mano, un
       perfil con `role = 'admin'` adentro sería otra puerta. */
    const user = await newUser()
    const answer = await rest('POST', 'profiles', user.token, {
      id: crypto.randomUUID(),
      name: 'Otro',
      role: 'admin',
    })
    expect(answer.status).toBeGreaterThanOrEqual(400)
  })
})

describe('profiles: lo que la aplicación escribe sigue andando', () => {
  /* Registrada como concesionaria para poder cambiar el tipo: de particular a
     concesionaria ya no se puede (023). */
  it('Ajustes: nombre, contacto, ubicación y tipo de vendedor', async () => {
    const user = await newUser('Test', { seller_type: 'dealer' })
    const answer = await rest('PATCH', `profiles?id=eq.${user.id}`, user.token, {
      name: 'Nombre nuevo',
      whatsapp: '11 2345 6789',
      city: 'Rosario',
      province: 'Santa Fe',
      seller_type: 'private',
      instagram: 'autos.test',
      contact_email: 'ventas@test.local',
    })
    expect(answer.status).toBeLessThan(300)

    const row = await readAsService<Record<string, string>>(
      'profiles',
      `id=eq.${user.id}`,
      'name,whatsapp,city,province,seller_type,instagram,contact_email',
    )
    expect(row).toMatchObject({
      name: 'Nombre nuevo',
      whatsapp: '11 2345 6789',
      city: 'Rosario',
      province: 'Santa Fe',
      seller_type: 'private',
      instagram: 'autos.test',
      contact_email: 'ventas@test.local',
    })
  })

  it('la foto, el buscador y el color del garage', async () => {
    const user = await newUser()
    for (const change of [
      { avatar_url: `${user.id}/avatar/profile-1.webp` },
      { discoverable: false },
      { garage_theme: 'night' },
    ]) {
      const answer = await rest('PATCH', `profiles?id=eq.${user.id}`, user.token, change)
      expect(answer.status, JSON.stringify(change)).toBeLessThan(300)
    }

    const row = await readAsService<{ avatar_url: string; discoverable: boolean; garage_theme: string }>(
      'profiles',
      `id=eq.${user.id}`,
      'avatar_url,discoverable,garage_theme',
    )
    expect(row).toMatchObject({ discoverable: false, garage_theme: 'night' })
    expect(row?.avatar_url).toContain('/avatar/')
  })

  it('no puede editar el perfil de otro, aunque la columna esté permitida', async () => {
    const [user, other] = await Promise.all([newUser(), newUser('Otro')])
    await rest('PATCH', `profiles?id=eq.${other.id}`, user.token, { name: 'Hackeado' })

    const row = await readAsService<{ name: string }>('profiles', `id=eq.${other.id}`, 'name')
    expect(row?.name).not.toBe('Hackeado')
  })
})

describe('listings: los contadores no los toca el dueño', () => {
  for (const counter of ['interest_count', 'view_count', 'favorite_count']) {
    it(`no puede escribir ${counter} en su propio aviso`, async () => {
      const owner = await newUser()
      const listing = await newListing(owner)

      const answer = await rest('PATCH', `listings?id=eq.${listing.id}`, owner.token, { [counter]: 500 })
      expect(answer.status).toBeGreaterThanOrEqual(400)

      const row = await readAsService<Record<string, number>>('listings', `id=eq.${listing.id}`, counter)
      expect(row?.[counter]).toBe(0)
    })

    it(`no puede publicar con ${counter} ya inflado`, async () => {
      const owner = await newUser()
      await expect(newListing(owner, { [counter]: 500 })).rejects.toThrow()
    })
  }
})

describe('listings: publicar y editar siguen andando', () => {
  it('publica con todos los campos de la pantalla', async () => {
    const owner = await newUser()
    const listing = await newListing(owner)
    const row = await readAsService<{ make: string; status: string }>(
      'listings',
      `id=eq.${listing.id}`,
      'make,status',
    )
    expect(row).toEqual({ make: 'Toyota', status: 'active' })
  })

  it('edita los datos del aviso', async () => {
    const owner = await newUser()
    const listing = await newListing(owner)
    const answer = await rest('PATCH', `listings?id=eq.${listing.id}`, owner.token, {
      price: 28000,
      mileage: 81000,
      description: 'Bajó de precio',
    })
    expect(answer.status).toBeLessThan(300)

    const row = await readAsService<{ price: number; description: string }>(
      'listings',
      `id=eq.${listing.id}`,
      'price,description',
    )
    expect(row).toEqual({ price: 28000, description: 'Bajó de precio' })
  })

  it('pausa y marca vendido', async () => {
    const owner = await newUser()
    const listing = await newListing(owner)
    for (const status of ['paused', 'sold']) {
      const answer = await rest('PATCH', `listings?id=eq.${listing.id}`, owner.token, { status })
      expect(answer.status, status).toBeLessThan(300)
    }
    const row = await readAsService<{ status: string }>('listings', `id=eq.${listing.id}`, 'status')
    expect(row?.status).toBe('sold')
  })

  it('no puede pasarle el aviso a otra persona', async () => {
    const [owner, other] = await Promise.all([newUser(), newUser('Otro')])
    const listing = await newListing(owner)
    await rest('PATCH', `listings?id=eq.${listing.id}`, owner.token, { seller_id: other.id })

    const row = await readAsService<{ seller_id: string }>('listings', `id=eq.${listing.id}`, 'seller_id')
    expect(row?.seller_id).toBe(owner.id)
  })
})

describe('los contadores los siguen escribiendo las funciones de siempre', () => {
  /* Después de sacarle al dueño el permiso sobre los contadores, lo que los
     mueve tiene que seguir andando: las funciones y triggers que corren como
     el dueño de la base. Si alguna corriera con los permisos de quien llama,
     la 017 la habría roto sin que ninguna pantalla lo muestre. */

  it('una visita suma, incluso sin sesión', async () => {
    const owner = await newUser()
    const listing = await newListing(owner)
    const answer = await rpc('register_listing_view', { listing_slug: listing.slug }, null)
    expect(answer.status).toBeLessThan(300)

    const row = await readAsService<{ view_count: number }>('listings', `id=eq.${listing.id}`, 'view_count')
    expect(row?.view_count).toBe(1)
  })

  it('un favorito suma', async () => {
    const [owner, fan] = await Promise.all([newUser(), newUser()])
    const listing = await newListing(owner)
    const answer = await rest('POST', 'favorites', fan.token, { user_id: fan.id, listing_id: listing.id })
    expect(answer.status).toBeLessThan(300)

    const row = await readAsService<{ favorite_count: number }>('listings', `id=eq.${listing.id}`, 'favorite_count')
    expect(row?.favorite_count).toBe(1)
  })
})
