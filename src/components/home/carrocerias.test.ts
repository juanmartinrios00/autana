import { describe, expect, it } from 'vitest'
import { bodyTypes } from '../../lib/format'

/**
 * Las fotos de las cajas de carrocería se levantan solas por el nombre del
 * archivo: `src/assets/carrocerias/<tipo>.webp`. Es cómodo y tiene el problema
 * de siempre con lo que se levanta solo: un nombre mal puesto no falla, deja la
 * caja sin foto.
 *
 * Y es fácil ponerlo mal, porque el nombre que se lee en la caja no es el del
 * archivo: la caja dice "Sedán" y "Pick-up", el archivo tiene que ser `sedan` y
 * `pickup`. Una tilde o un guion de más y la foto está en el repo, se despliega,
 * y no aparece en ningún lado.
 *
 * Sin `eager`: sólo hacen falta los nombres.
 */
const FOTOS = import.meta.glob('../../assets/carrocerias/*')

describe('las fotos de carrocería', () => {
  const validos = bodyTypes.map((body) => `${body}.webp`)

  it('se llaman como una carrocería, y en webp', () => {
    for (const path of Object.keys(FOTOS)) {
      const archivo = path.split('/').pop() ?? ''
      expect(
        validos,
        `"${archivo}" no es el nombre de ninguna carrocería: tiene que ser uno de ${validos.join(', ')}`,
      ).toContain(archivo)
    }
  })
})
