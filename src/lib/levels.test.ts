import { describe, expect, it } from 'vitest'
/* Con `?raw`, igual que los otros tests que leen el esquema. */
import migracion022 from '../../supabase/migrations/022_niveles_cuentan_vendidos.sql?raw'
import { computeLevel, LEVELS, PUBLISHED_STATUSES, type LevelInput } from './levels'

/**
 * Los avisos, coherentes entre sí: los activos, los pausados y los vendidos
 * son parte de los publicados. Escribir los tres números a mano deja armar
 * combinaciones que la base nunca devuelve ---tres activos y cero publicados---
 * y un test sobre eso prueba algo que no puede pasar.
 */
function avisos({ activos = 0, pausados = 0, vendidos = 0 } = {}) {
  return {
    activeListings: activos,
    publishedListings: activos + pausados + vendidos,
    soldListings: vendidos,
  }
}

const vacio: LevelInput = {
  profile: null,
  ...avisos(),
  bestPhotoCount: 0,
  garageCars: 0,
}

const perfilCompleto = { name: 'Tiziano', hasWhatsapp: true, city: 'Rosario' }

/** El que tiene los siete logros. */
const completo: LevelInput = {
  profile: perfilCompleto,
  ...avisos({ activos: 3, vendidos: 1 }),
  bestPhotoCount: 8,
  garageCars: 4,
}

describe('la escalera', () => {
  /**
   * `LEVELS` y la lista de logros son dos definiciones separadas. El ultimo
   * nivel pide todos menos uno, a proposito: ver `LEVELS`. Si alguien suma un
   * logro y no toca la escalera, el ultimo pasa a ganarse con dos de menos; si
   * sube el umbral a todos, vuelve a quedar sólo para agencias. Este test es lo
   * unico que ata las dos listas.
   */
  it('el ultimo nivel pide todos los logros menos uno', () => {
    const cima = LEVELS[LEVELS.length - 1]!
    expect(cima.at).toBe(computeLevel(vacio).achievements.length - 1)
  })

  /* El caso por el que se bajo el tope: un particular con un solo auto, que
     nunca va a tener tres activos a la vez. */
  it('un particular con un solo auto llega arriba', () => {
    const state = computeLevel({
      profile: perfilCompleto,
      ...avisos({ vendidos: 1 }),
      bestPhotoCount: 8,
      garageCars: 4,
    })
    expect(state.achievements.find((item) => item.id === 'three_listings')!.done).toBe(false)
    expect(state.level).toBe(LEVELS.length)
    expect(state.toNext).toBeNull()
  })

  it('arranca en cero y sube de a uno', () => {
    expect(LEVELS[0]!.at).toBe(0)
    for (let i = 1; i < LEVELS.length; i += 1) {
      expect(LEVELS[i]!.at).toBeGreaterThan(LEVELS[i - 1]!.at)
    }
  })
})

/**
 * Qué estados cuentan como "lo publicaste" está escrito dos veces: en
 * `PUBLISHED_STATUSES`, que usa el perfil, y en la vista `profile_stats` de la
 * migración 022, que usa la pantalla de niveles. Si se desacuerdan, el mismo
 * usuario tiene un nivel en su perfil y otro en `/niveles`, y ninguno de los
 * dos da error.
 */
describe('los estados que cuentan como publicados', () => {
  it('la vista cuenta los mismos que el perfil', () => {
    const lista = migracion022.match(/li\.status in \(([^)]+)\)/)
    expect(lista, 'no se encontró la lista de estados en la 022').not.toBeNull()
    const enLaBase = [...lista![1]!.matchAll(/'([^']+)'/g)].map((match) => match[1])

    expect([...PUBLISHED_STATUSES].sort()).toEqual([...enLaBase].sort())
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

    expect(done(avisos({ activos: 2 }), 'three_listings')).toBe(false)
    expect(done(avisos({ activos: 3 }), 'three_listings')).toBe(true)

    expect(done({ garageCars: 3 }, 'garage_complete')).toBe(false)
    expect(done({ garageCars: 4 }, 'garage_complete')).toBe(true)

    expect(done(avisos(), 'first_listing')).toBe(false)
    expect(done(avisos({ activos: 1 }), 'first_listing')).toBe(true)

    expect(done(avisos(), 'first_sale')).toBe(false)
    expect(done(avisos({ vendidos: 1 }), 'first_sale')).toBe(true)
  })

  /* "Tres autos activos" es el unico logro que habla del presente: tener tres
     a la vez. Los vendidos cuentan para todo lo demas, pero no para este. */
  it('tres activos son tres activos hoy, no tres alguna vez', () => {
    const tres = computeLevel({ ...vacio, ...avisos({ activos: 2, vendidos: 1 }) })
    expect(tres.achievements.find((item) => item.id === 'three_listings')!.done).toBe(false)
  })

  /* "Perfil completo" es el unico logro con tres condiciones, y las tres son
     una y. Un perfil a medias no cuenta. */
  it('el perfil completo pide las tres cosas', () => {
    const perfil = (extra: Partial<{ name: string; hasWhatsapp: boolean; city: string | null }>) =>
      computeLevel({
        ...vacio,
        profile: { ...perfilCompleto, ...extra },
      }).achievements[0]!.done

    expect(perfil({})).toBe(true)
    expect(perfil({ name: '' })).toBe(false)
    expect(perfil({ hasWhatsapp: false })).toBe(false)
    expect(perfil({ city: null })).toBe(false)
    expect(perfil({ city: '' })).toBe(false)
  })

  /**
   * Barrido por los ocho estados posibles de `earned`. La barra de progreso
   * es lo que mas se mira de esta pantalla y un valor fuera de rango la dibuja
   * vacia o desbordada; un nivel que baja al sumar un logro es peor todavia.
   */
  it('el progreso vive entre 0 y 1, y el nivel nunca baja', () => {
    /* Ordenados para que cada uno sume un logro al anterior. */
    const escalones: LevelInput[] = [
      vacio,
      { ...vacio, ...avisos({ activos: 1 }) },
      { ...vacio, ...avisos({ activos: 1 }), garageCars: 1 },
      { ...vacio, ...avisos({ activos: 3 }), garageCars: 1 },
      { ...vacio, ...avisos({ activos: 3 }), garageCars: 4 },
      { ...vacio, ...avisos({ activos: 3 }), garageCars: 4, bestPhotoCount: 8 },
      { ...vacio, ...avisos({ activos: 3, vendidos: 1 }), garageCars: 4, bestPhotoCount: 8 },
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
    const state = computeLevel({ ...vacio, ...avisos({ activos: 1 }) })
    expect(state.earned).toBe(1)
    expect(state.toNext).toBe(1)

    const subio = computeLevel({ ...vacio, ...avisos({ activos: 1 }), garageCars: 1 })
    expect(subio.level).toBe(state.level + 1)
  })

  /**
   * El caso que motivo la 022. Un particular publica su unico auto con ocho
   * fotos y completa el perfil: queda en Vendedor. Lo vende y lo marca como
   * vendido. Antes perdia "Primera publicacion" y "Publicacion completa" y
   * volvia a Recien llegado: el sistema premiaba dejar publicado un auto que
   * ya no estaba. Ahora conserva los dos y suma la primera venta.
   */
  it('vender no te baja de nivel, te sube', () => {
    const publicado = computeLevel({
      ...vacio,
      profile: perfilCompleto,
      ...avisos({ activos: 1 }),
      bestPhotoCount: 8,
    })
    const vendido = computeLevel({
      ...vacio,
      profile: perfilCompleto,
      ...avisos({ vendidos: 1 }),
      bestPhotoCount: 8,
    })

    const hecho = (id: string) => vendido.achievements.find((item) => item.id === id)!.done
    expect(hecho('first_listing')).toBe(true)
    expect(hecho('rich_listing')).toBe(true)
    expect(hecho('first_sale')).toBe(true)
    expect(vendido.earned).toBe(publicado.earned + 1)
    expect(vendido.level).toBeGreaterThanOrEqual(publicado.level)
  })

  /* Pausar un aviso ---de vacaciones, o mientras se arregla algo--- tampoco
     puede costar logros: sigue siendo tuyo y sigue estando. */
  it('pausar no te baja de nivel', () => {
    const activo = computeLevel({ ...vacio, ...avisos({ activos: 1 }), bestPhotoCount: 8 })
    const pausado = computeLevel({ ...vacio, ...avisos({ pausados: 1 }), bestPhotoCount: 8 })
    expect(pausado.earned).toBe(activo.earned)
  })

  /* El nivel no se guarda: sale de los datos. Borrar tiene que bajarlo, que es
     justo lo que los contadores guardados hacen mal. Un aviso borrado se lleva
     todo: la publicacion, sus fotos y la venta si la tenia. */
  it('el nivel baja si el dato que lo sostenia desaparece', () => {
    const conAvisos = computeLevel({ ...completo })
    const sinAvisos = computeLevel({ ...completo, ...avisos(), bestPhotoCount: 0 })
    expect(sinAvisos.earned).toBe(conAvisos.earned - 4)
    expect(sinAvisos.level).toBeLessThan(conAvisos.level)
  })
})
