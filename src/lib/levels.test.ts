import { describe, expect, it } from 'vitest'
import { computeLevel, LEVELS, type LevelInput } from './levels'

const vacio: LevelInput = {
  profile: null,
  activeListings: 0,
  bestPhotoCount: 0,
  garageCars: 0,
}

/** El que tiene los seis logros. */
const completo: LevelInput = {
  profile: { name: 'Tiziano', hasWhatsapp: true, city: 'Rosario' },
  activeListings: 3,
  bestPhotoCount: 8,
  garageCars: 4,
}

describe('la escalera', () => {
  /**
   * `LEVELS` y la lista de logros son dos definiciones separadas que hoy
   * coinciden en seis. Si alguien suma un logro y no toca la escalera, el
   * ultimo nivel pasa a ganarse con seis de siete y queda un logro que no
   * sirve para nada; si suma un nivel y no un logro, el ultimo es inalcanzable
   * y la barra de progreso de todo el mundo se queda a mitad de camino para
   * siempre. Este test es lo unico que ata las dos listas.
   */
  it('el ultimo nivel pide exactamente todos los logros', () => {
    const cima = LEVELS[LEVELS.length - 1]!
    expect(cima.at).toBe(computeLevel(vacio).achievements.length)
  })

  it('arranca en cero y sube de a uno', () => {
    expect(LEVELS[0]!.at).toBe(0)
    for (let i = 1; i < LEVELS.length; i += 1) {
      expect(LEVELS[i]!.at).toBeGreaterThan(LEVELS[i - 1]!.at)
    }
  })
})

describe('computeLevel', () => {
  it('el que recien llega esta en el primer nivel, sin nada hecho', () => {
    const state = computeLevel(vacio)
    expect(state.level).toBe(1)
    expect(state.title).toBe('Recién llegado')
    expect(state.earned).toBe(0)
    expect(state.progress).toBe(0)
    expect(state.achievements.every((item) => !item.done)).toBe(true)
  })

  it('el que tiene todo llega al ultimo nivel y no tiene proximo', () => {
    const state = computeLevel(completo)
    expect(state.level).toBe(LEVELS.length)
    expect(state.earned).toBe(state.achievements.length)
    expect(state.toNext).toBeNull()
    expect(state.nextTitle).toBeNull()
    expect(state.progress).toBe(1)
  })

  /* Los umbrales son la parte que se toca cuando alguien "afloja un poco los
     requisitos", y el borde es donde se rompe. */
  it('los umbrales se cumplen justo, no antes', () => {
    const done = (input: Partial<LevelInput>, id: string) =>
      computeLevel({ ...vacio, ...input }).achievements.find((item) => item.id === id)!.done

    expect(done({ bestPhotoCount: 7 }, 'rich_listing')).toBe(false)
    expect(done({ bestPhotoCount: 8 }, 'rich_listing')).toBe(true)

    expect(done({ activeListings: 2 }, 'three_listings')).toBe(false)
    expect(done({ activeListings: 3 }, 'three_listings')).toBe(true)

    expect(done({ garageCars: 3 }, 'garage_complete')).toBe(false)
    expect(done({ garageCars: 4 }, 'garage_complete')).toBe(true)

    expect(done({ activeListings: 0 }, 'first_listing')).toBe(false)
    expect(done({ activeListings: 1 }, 'first_listing')).toBe(true)
  })

  /* "Perfil completo" es el unico logro con tres condiciones, y las tres son
     una y. Un perfil a medias no cuenta. */
  it('el perfil completo pide las tres cosas', () => {
    const perfil = (extra: Partial<{ name: string; hasWhatsapp: boolean; city: string | null }>) =>
      computeLevel({
        ...vacio,
        profile: { name: 'Tiziano', hasWhatsapp: true, city: 'Rosario', ...extra },
      }).achievements[0]!.done

    expect(perfil({})).toBe(true)
    expect(perfil({ name: '' })).toBe(false)
    expect(perfil({ hasWhatsapp: false })).toBe(false)
    expect(perfil({ city: null })).toBe(false)
    expect(perfil({ city: '' })).toBe(false)
  })

  /**
   * Barrido por los siete estados posibles de `earned`. La barra de progreso
   * es lo que mas se mira de esta pantalla y un valor fuera de rango la dibuja
   * vacia o desbordada; un nivel que baja al sumar un logro es peor todavia.
   */
  it('el progreso vive entre 0 y 1, y el nivel nunca baja', () => {
    /* Ordenados para que cada uno sume un logro al anterior. */
    const escalones: LevelInput[] = [
      vacio,
      { ...vacio, activeListings: 1 },
      { ...vacio, activeListings: 1, garageCars: 1 },
      { ...vacio, activeListings: 3, garageCars: 1 },
      { ...vacio, activeListings: 3, garageCars: 4 },
      { ...vacio, activeListings: 3, garageCars: 4, bestPhotoCount: 8 },
      completo,
    ]

    let anterior = 0
    escalones.forEach((input, ganados) => {
      const state = computeLevel(input)
      expect(state.earned, `escalon ${ganados}`).toBe(ganados)
      expect(state.progress, `escalon ${ganados}`).toBeGreaterThanOrEqual(0)
      expect(state.progress, `escalon ${ganados}`).toBeLessThanOrEqual(1)
      expect(state.level, `escalon ${ganados}`).toBeGreaterThanOrEqual(anterior)
      anterior = state.level
    })
  })

  /* Lo que falta para el proximo tiene que ser una cuenta que cierre: si dice
     "te faltan 2" y con uno mas subis, el numero miente. */
  it('lo que falta para el proximo nivel es exacto', () => {
    const state = computeLevel({ ...vacio, activeListings: 1 })
    expect(state.earned).toBe(1)
    expect(state.toNext).toBe(1)

    const subio = computeLevel({ ...vacio, activeListings: 1, garageCars: 1 })
    expect(subio.level).toBe(state.level + 1)
  })

  /* El nivel no se guarda: sale de los datos. Borrar una publicacion tiene que
     bajarlo, que es justo lo que los contadores guardados hacen mal. */
  it('el nivel baja si el dato que lo sostenia desaparece', () => {
    const conAvisos = computeLevel({ ...completo })
    const sinAvisos = computeLevel({ ...completo, activeListings: 0 })
    expect(sinAvisos.earned).toBe(conAvisos.earned - 2)
    expect(sinAvisos.level).toBeLessThan(conAvisos.level)
  })
})
