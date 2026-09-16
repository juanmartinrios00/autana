import { describe, expect, it } from 'vitest'
import { formatBytes, MAX_UPLOAD_BYTES } from './images'

/* `compressImage` no se prueba acá: necesita canvas y `createImageBitmap`, que
   son del navegador, y los tests corren en node a propósito —la config dice que
   acá va lógica pura. Lo que sí es puro es cómo se muestra el peso, que es lo
   que la persona lee mientras sube las fotos. */
describe('formatBytes', () => {
  it('muestra bytes cuando son pocos', () => {
    expect(formatBytes(0)).toBe('0 B')
    expect(formatBytes(512)).toBe('512 B')
    expect(formatBytes(1023)).toBe('1023 B')
  })

  it('pasa a KB en el kilobyte', () => {
    expect(formatBytes(1024)).toBe('1 KB')
    expect(formatBytes(204_800)).toBe('200 KB')
  })

  /* El borde: los bytes que están abajo del mega pero redondean a 1024 KB.
     Antes la decisión se tomaba con el número crudo, así que caían del lado de
     los KB y se mostraban como "1024 KB", que no es una unidad. */
  it('no inventa la unidad de 1024 KB', () => {
    expect(formatBytes(1_048_500)).toBe('1.0 MB')
    expect(formatBytes(1024 * 1024)).toBe('1.0 MB')
    /* Justo abajo del borde sigue siendo KB, que es lo correcto. */
    expect(formatBytes(1_048_000)).toBe('1023 KB')
  })

  it('muestra un decimal en MB', () => {
    expect(formatBytes(4 * 1024 * 1024)).toBe('4.0 MB')
    expect(formatBytes(2_621_440)).toBe('2.5 MB')
  })

  /* El tope que rechaza la subida tiene que leerse redondo en el mensaje de
     error, que dice "supera los 12 MB". */
  it('el tope de subida se lee como el error lo nombra', () => {
    expect(formatBytes(MAX_UPLOAD_BYTES)).toBe('12.0 MB')
  })
})
