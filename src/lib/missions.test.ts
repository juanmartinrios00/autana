import { describe, expect, it } from 'vitest'
import { computeLevel, RICH_PHOTOS, type LevelInput } from './levels'
import { garageMission, levelChange, listingMission, photosMission } from './missions'
import { SLOTS } from '../data/garage-slots'
import type { ListingStatus } from '../types'

/** Un aviso con lo único que miran las misiones. */
function aviso(status: ListingStatus, fotos: number, model = 'Symbol') {
  return {
    make: 'Renault',
    model,
    slug: `renault-${model.toLowerCase()}-${status}-${fotos}`,
    status,
    images: Array.from({ length: fotos }, (_, order) => ({ url: `${order}.webp`, order })),
  } as Parameters<typeof listingMission>[0][number]
}

describe('la misión de Mis avisos', () => {
  it('sin nada publicado no hay misión: de eso se ocupa la pantalla vacía', () => {
    expect(listingMission([])).toBeNull()
    expect(listingMission([aviso('draft', 2)])).toBeNull()
  })

  it('pide las fotos que faltan al activo que menos le falta, con el número exacto', () => {
    const mission = listingMission([aviso('active', 2, 'Clio'), aviso('active', 5, 'Symbol')])!
    expect(mission.achievement).toBe('rich_listing')
    expect(mission.text).toContain('A tu Renault Symbol le faltan 3 fotos')
    expect(mission.action?.to).toBe('/vender/renault-symbol-active-5/editar')
  })

  it('en singular cuando falta una', () => {
    expect(listingMission([aviso('active', RICH_PHOTOS - 1)])!.text).toContain('le falta 1 foto ')
  })

  /* El logro cuenta el mejor aviso: con uno que ya llegó, pedirle fotos a otro
     es pedir algo que no suma nada. */
  it('si un aviso ya llegó a las fotos, no se las pide a otro', () => {
    const mission = listingMission([aviso('active', RICH_PHOTOS), aviso('active', 1, 'Clio')])
    expect(mission?.achievement).not.toBe('rich_listing')
  })

  it('a un auto vendido no le pide fotos', () => {
    expect(listingMission([aviso('sold', 2)])).toBeNull()
  })

  it('con las fotos listas, lo que sigue es marcarlo vendido, sin un segundo botón', () => {
    const mission = listingMission([aviso('active', RICH_PHOTOS)])!
    expect(mission.achievement).toBe('first_sale')
    expect(mission.text).toContain('tu Renault Symbol')
    expect(mission.action).toBeUndefined()
  })

  it('con todo hecho, no insiste', () => {
    expect(listingMission([aviso('sold', RICH_PHOTOS), aviso('active', 3)])).toBeNull()
  })

  /* Las misiones repiten umbrales de `levels.ts`. Si se desacuerdan, la
     misión pide algo que no da el logro, o no pide lo que falta. */
  it('la misión de fotos desaparece justo cuando el logro se cumple', () => {
    for (let fotos = 0; fotos <= RICH_PHOTOS + 1; fotos += 1) {
      const input: LevelInput = {
        profile: null,
        activeListings: 1,
        publishedListings: 1,
        soldListings: 0,
        bestPhotoCount: fotos,
        garageCars: 0,
      }
      const done = computeLevel(input).achievements.find((item) => item.id === 'rich_listing')!.done
      expect(photosMission(aviso('active', fotos), fotos) === null, `${fotos} fotos`).toBe(done)
    }
  })
})

describe('la misión del garage', () => {
  it('vacío pide el primero; a medias, los que faltan; lleno, nada', () => {
    expect(garageMission(0)!.achievement).toBe('garage_started')
    expect(garageMission(1)!.text).toContain(`faltan ${SLOTS.length - 1}`)
    expect(garageMission(SLOTS.length - 1)!.text).toContain('falta 1 ')
    expect(garageMission(SLOTS.length)).toBeNull()
  })
})

describe('lo que se ganó al publicar', () => {
  const base: LevelInput = {
    profile: { name: 'Tiziano', hasWhatsapp: true, city: 'Rosario' },
    activeListings: 0,
    publishedListings: 0,
    soldListings: 0,
    bestPhotoCount: 0,
    garageCars: 0,
  }

  it('dice los logros nuevos y el nivel al que subió', () => {
    const before = computeLevel(base)
    const after = computeLevel({ ...base, activeListings: 1, publishedListings: 1, bestPhotoCount: 8 })
    const change = levelChange(before, after)
    expect(change.earned.map((item) => item.id)).toEqual(['first_listing', 'rich_listing'])
    expect(change.newLevel).toBe(after.title)
  })

  it('publicar otro sin ganar nada no anuncia nada', () => {
    const one = computeLevel({ ...base, activeListings: 1, publishedListings: 1 })
    const two = computeLevel({ ...base, activeListings: 2, publishedListings: 2 })
    expect(levelChange(one, two)).toEqual({ earned: [], newLevel: null })
  })
})
