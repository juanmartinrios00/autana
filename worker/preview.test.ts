import { describe, expect, it } from 'vitest'
import { buildGarageDescription, garageImage, garagePreviewImage, orderedEntries } from './index'

/**
 * Los tests del preview del garage.
 *
 * Se prueba esto porque es otro error mudo: el preview no se ve desde el
 * sitio. Sale mal, se manda a un grupo de WhatsApp, y el que se entera es el
 * que abrió el link — si es que lo abre, porque un preview vacío es
 * justamente lo que hace que no lo abra.
 *
 * No se prueba el `fetch` ni el `HTMLRewriter`: eso es la plataforma. Lo que
 * puede estar mal acá es el texto y el orden.
 */

const car = (slot: string, make: string, model: string, year: number | null = null, photo: string | null = null) => ({
  slot,
  make,
  model,
  year,
  photo_path: photo,
})

describe('orderedEntries', () => {
  it('ordena por consigna y no por como vino de la base', () => {
    const row = {
      name: 'Juan',
      discoverable: true,
      garage_entries: [
        car('dream', 'Porsche', '911'),
        car('first', 'Renault', '12'),
        car('missed', 'Fiat', '600'),
        car('current', 'Toyota', 'Corolla'),
      ],
    }

    expect(orderedEntries(row).map((entry) => entry.slot)).toEqual([
      'first',
      'current',
      'dream',
      'missed',
    ])
  })

  it('aguanta un garage vacío y uno nulo', () => {
    expect(orderedEntries({ name: 'Juan', discoverable: true, garage_entries: [] })).toEqual([])
    expect(orderedEntries({ name: 'Juan', discoverable: true, garage_entries: null })).toEqual([])
  })

  it('no rompe el orden si aparece una consigna que no conoce', () => {
    const row = {
      name: 'Juan',
      discoverable: true,
      garage_entries: [car('inventada', 'X', 'Y'), car('first', 'Renault', '12')],
    }
    /* `indexOf` da -1 para la desconocida, así que queda primera. Lo que
       importa es que no tire y que las conocidas sigan entre sí. */
    expect(orderedEntries(row)).toHaveLength(2)
  })
})

describe('buildGarageDescription', () => {
  it('dice los autos, que es lo que hace que alguien abra el link', () => {
    const texto = buildGarageDescription('Juan', [
      car('first', 'Renault', '12', 1978),
      car('current', 'Toyota', 'Corolla', 2019),
    ])

    expect(texto).toBe('2 autos en el garage de Juan: Renault 12 1978, Toyota Corolla 2019.')
  })

  it('usa singular con un solo auto', () => {
    expect(buildGarageDescription('Ana', [car('first', 'Fiat', '600', 1971)])).toBe(
      'Un auto en el garage de Ana: Fiat 600 1971.',
    )
  })

  it('omite el año cuando no está cargado', () => {
    expect(buildGarageDescription('Ana', [car('dream', 'Porsche', '911')])).toBe(
      'Un auto en el garage de Ana: Porsche 911.',
    )
  })

  it('avisa cuando el garage está vacío en vez de dejar la frase colgada', () => {
    expect(buildGarageDescription('Ana', [])).toBe(
      'Ana todavía no cargó ningún auto en su garage.',
    )
  })

  describe('recorte', () => {
    const muchos = Array.from({ length: 12 }, (_, i) =>
      car('first', 'Mercedes-Benz', `Clase ${i} Larguisimo`, 2020),
    )

    it('corta entre autos y no por la mitad de uno', () => {
      const texto = buildGarageDescription('Juan', muchos)
      expect(texto.endsWith('…')).toBe(true)
      /* Lo que quedó después de los dos puntos tienen que ser autos enteros. */
      const listados = texto.slice(texto.indexOf(': ') + 2, -1).split(', ')
      for (const listado of listados) {
        expect(muchos.map((entry) => `${entry.make} ${entry.model} ${entry.year}`)).toContain(
          listado,
        )
      }
    })

    it('se mantiene cerca del tope que cortan los scrapers', () => {
      expect(buildGarageDescription('Juan', muchos).length).toBeLessThanOrEqual(201)
    })

    it('termina en punto y no en puntos suspensivos si entraron todos', () => {
      const texto = buildGarageDescription('Juan', [car('first', 'Fiat', 'Uno', 1995)])
      expect(texto.endsWith('.')).toBe(true)
      expect(texto.endsWith('…')).toBe(false)
    })

    it('con un nombre larguísimo no arma una lista rota', () => {
      const texto = buildGarageDescription('A'.repeat(220), [car('first', 'Fiat', 'Uno', 1995)])
      /* No entra ningún auto: mejor la frase sola que una lista cortada. */
      expect(texto.endsWith('.')).toBe(true)
      expect(texto).not.toContain('Fiat')
    })
  })
})

describe('garageImage', () => {
  it('toma la primera foto en el orden de las consignas', () => {
    const url = garageImage([
      car('first', 'Renault', '12', 1978),
      car('current', 'Toyota', 'Corolla', 2019, 'abc/current.webp'),
      car('dream', 'Porsche', '911', null, 'abc/dream.webp'),
    ])

    expect(url).toContain('/garage-photos/abc/current.webp')
  })

  it('da null si nadie subió foto: el preview va sin imagen', () => {
    expect(garageImage([car('first', 'Renault', '12', 1978)])).toBeNull()
    expect(garageImage([])).toBeNull()
  })
})

describe('garagePreviewImage', () => {
  it('usa la foto si hay alguna', () => {
    expect(
      garagePreviewImage([car('first', 'Renault', '12', 1978, 'abc/first.webp')], 'https://autana.app'),
    ).toContain('/garage-photos/abc/first.webp')
  })

  it('sin fotos usa la lámina fija, y no deja el preview sin imagen', () => {
    expect(garagePreviewImage([car('first', 'Renault', '12', 1978)], 'https://autana.app')).toBe(
      'https://autana.app/og-garage.png',
    )
    expect(garagePreviewImage([], 'https://autana.app')).toBe('https://autana.app/og-garage.png')
  })
})
