import { describe, expect, it } from 'vitest'

/**
 * Una pantalla que arranca con un hero oscuro tiene que declararlo.
 *
 * La navbar tiene que ser legible sobre lo que tenga debajo, y eso lo sabe la
 * pantalla: lo dice con `useDarkHero`, y sube su hero por detrás de la barra
 * con `.hero-bleed`. Las dos mitades van juntas ---declarar sin subir el bloque
 * deja la barra transparente flotando sobre el papel blanco, y subirlo sin
 * declarar deja la barra blanca tapando el hero.
 *
 * Este test existe porque el barrido a ojo ya falló dos veces. La primera me
 * quedaron seis pantallas con la barra blanca encima de un fondo negro; la
 * segunda, buscando las reglas que se llamaran `__head`, se me escaparon
 * Contacto ---que la suya se llama `contact__hero`--- y Ajustes.
 *
 * Lo que se busca acá no es el nombre sino el fondo, que es lo que de verdad
 * define un hero oscuro: una regla de la hoja de esa pantalla que pinte un
 * `__head` o un `__hero` con tinta.
 */

const CSS = import.meta.glob('./*.css', { eager: true, query: '?raw', import: 'default' }) as Record<string, string>
const TSX = import.meta.glob('./*.tsx', { eager: true, query: '?raw', import: 'default' }) as Record<string, string>

/** Las pantallas cuya hoja pinta su cabecera con tinta. */
function conHeroOscuro() {
  const pantallas: string[] = []

  for (const [path, css] of Object.entries(CSS)) {
    /* Sin comentarios: varios explican el fondo que tenían antes. */
    const limpio = css.replace(/\/\*[\s\S]*?\*\//g, '')

    for (const regla of limpio.matchAll(/(\.[\w-]+)\s*\{([^}]*)\}/g)) {
      const selector = regla[1]!
      const cuerpo = regla[2]!
      if (!/__(head|hero)$/.test(selector)) continue
      if (!/background:\s*var\(--(ink|garage-bg)/.test(cuerpo)) continue
      pantallas.push(path.replace('./', '').replace('.css', ''))
      break
    }
  }

  return pantallas.sort()
}

describe('las pantallas que arrancan en oscuro', () => {
  const pantallas = conHeroOscuro()

  it('se encontró alguna: el barrido no está mirando al vacío', () => {
    expect(pantallas.length).toBeGreaterThan(5)
  })

  it('todas declaran su hero oscuro con useDarkHero', () => {
    const sinDeclarar = pantallas.filter((nombre) => {
      const tsx = TSX[`./${nombre}.tsx`]
      return !tsx || !tsx.includes('useDarkHero')
    })

    expect(sinDeclarar).toEqual([])
  })

  /**
   * La otra mitad: sin subir el bloque, el hero arranca abajo de la navbar y la
   * barra transparente queda flotando sobre el papel blanco.
   *
   * Se mira la propiedad y no la clase. Casi todas lo hacen con `.hero-bleed`,
   * pero la portada lo resuelve en su propio CSS ---su hero tiene un `min-height`
   * y mover el `padding` a la utilidad le cambiaría el alto--- y eso está bien:
   * lo que importa es que el bloque suba, no con qué clase.
   */
  it('todas suben su hero por detrás de la barra', () => {
    const sinSubir = pantallas.filter((nombre) => {
      const tsx = TSX[`./${nombre}.tsx`] ?? ''
      const css = CSS[`./${nombre}.css`] ?? ''
      const conClase = tsx.includes('hero-bleed')
      const aMano = /margin-top:\s*calc\(var\(--nav-h\)\s*\*\s*-1\)/.test(css)
      return !conClase && !aMano
    })

    expect(sinSubir).toEqual([])
  })

  /* Y el error simétrico: subir el bloque sin avisarle a la navbar deja la
     barra blanca tapando el hero. Va sólo en un sentido porque la portada sube
     el suyo sin usar la clase. */
  it('ninguna usa hero-bleed sin declarar el hero oscuro', () => {
    const desparejas = Object.entries(TSX)
      .filter(([, tsx]) => tsx.includes('hero-bleed') && !tsx.includes('useDarkHero'))
      .map(([path]) => path.replace('./', ''))

    expect(desparejas).toEqual([])
  })
})
