import { describe, expect, it } from 'vitest'
import { provinces } from '../src/data/makes'
import { LIMITS } from '../src/lib/limits'
import {
  attr,
  BLOG_URL,
  buildDescription,
  buildTitle,
  CANONICAL_HOST,
  canonicalRedirect,
  DISALLOWED,
  GARAGE_URL,
  LISTING_URL,
  STATIC_PAGES,
  xmlEscape,
} from './index'

/**
 * Lo que el worker decide antes de tocar nada: qué URL es un aviso, qué texto
 * se mete en el `<head>` y cómo se escapa.
 *
 * Los tres son errores mudos. Una URL que no matchea deja el preview genérico
 * y nadie se entera; un escapado flojo mete contenido del vendedor adentro del
 * HTML que se le sirve a todo el mundo.
 */

const row = {
  slug: 'bmw-320i-2022',
  make: 'BMW',
  model: '320i',
  trim: 'Sport Line',
  year: 2022,
  price: 32_900,
  currency: 'USD',
  mileage: 34_200,
  description: 'Impecable, único dueño, service al día.',
  city: 'Rosario',
  province: 'Santa Fe',
  listing_images: null,
}

describe('las URL que el worker reescribe', () => {
  it('reconoce la ficha de un aviso', () => {
    expect('/cars/bmw-320i-2022'.match(LISTING_URL)?.[1]).toBe('bmw-320i-2022')
    /* Con barra al final es la misma pagina. */
    expect('/cars/bmw-320i-2022/'.match(LISTING_URL)?.[1]).toBe('bmw-320i-2022')
  })

  it('no toca el listado ni las busquedas', () => {
    expect('/cars'.match(LISTING_URL)).toBeNull()
    expect('/cars/'.match(LISTING_URL)).toBeNull()
    expect('/cars/bmw/320i'.match(LISTING_URL)).toBeNull()
  })

  /**
   * El slug se interpola en un filtro de PostgREST. El patron es lo unico que
   * separa un slug nuestro de una cadena armada para salirse del filtro, asi
   * que tiene que rechazar todo lo que no sea letras, numeros y guiones.
   */
  it('rechaza lo que no tiene forma de slug', () => {
    const intentos = [
      "/cars/bmw'or'1'='1",
      '/cars/bmw%20320i',
      '/cars/bmw.320i',
      '/cars/bmw_320i',
      '/cars/bmw,320i',
      '/cars/bmw*',
      '/cars/bmw(320i)',
      `/cars/${'a'.repeat(121)}`,
    ]
    for (const intento of intentos) {
      expect(intento.match(LISTING_URL), intento).toBeNull()
    }
  })

  it('el garage exige la forma exacta de un uuid', () => {
    const uuid = '3f8c1e2a-9b4d-4c7e-8a15-2d6f0b9e3c71'
    expect(`/g/${uuid}`.match(GARAGE_URL)?.[1]).toBe(uuid)
    expect(`/g/${uuid}/`.match(GARAGE_URL)?.[1]).toBe(uuid)

    expect('/g/3f8c1e2a'.match(GARAGE_URL)).toBeNull()
    expect('/g/no-es-un-uuid-para-nada-nada-nada'.match(GARAGE_URL)).toBeNull()
    expect(`/g/${uuid}x`.match(GARAGE_URL)).toBeNull()
    expect('/g/'.match(GARAGE_URL)).toBeNull()
  })

  /* Los slugs del blog se escriben a mano en `posts.ts`, siempre en minuscula. */
  it('el blog acepta minusculas y rechaza la portada', () => {
    expect('/blog/como-comprar-un-usado'.match(BLOG_URL)?.[1]).toBe('como-comprar-un-usado')
    expect('/blog'.match(BLOG_URL)).toBeNull()
    expect('/blog/Como-Comprar'.match(BLOG_URL)).toBeNull()
  })
})

describe('buildTitle', () => {
  it('dice el auto, el año y el precio', () => {
    expect(buildTitle(row)).toContain('BMW 320i Sport Line 2022')
    expect(buildTitle(row)).toContain('USD 32.900')
  })

  it('no deja espacios cuando el aviso no tiene version', () => {
    expect(buildTitle({ ...row, trim: null })).toContain('BMW 320i 2022')
  })
})

describe('buildDescription', () => {
  it('arranca por los datos duros y sigue con el texto del vendedor', () => {
    const description = buildDescription(row)
    expect(description.startsWith('2022 · 34.200 km · Rosario, Santa Fe')).toBe(true)
    expect(description).toContain('único dueño')
  })

  it('aplasta los saltos de linea del vendedor', () => {
    const description = buildDescription({ ...row, description: 'Impecable.\n\n  Único dueño.' })
    expect(description).toContain('Impecable. Único dueño.')
    expect(description).not.toContain('\n')
  })

  it('sin descripcion queda solo el encabezado', () => {
    expect(buildDescription({ ...row, description: '   ' })).toBe(
      '2022 · 34.200 km · Rosario, Santa Fe',
    )
  })

  it('corta antes de que los scrapers corten', () => {
    const description = buildDescription({ ...row, description: 'Impecable. '.repeat(60) })
    expect(description.length).toBeLessThanOrEqual(201)
    expect(description.endsWith('…')).toBe(true)
  })

  /**
   * La ciudad es texto libre y la columna no tiene tope. Con una lo bastante
   * larga el espacio disponible daba negativo, y `slice(0, -40)` no corta los
   * primeros cuarenta caracteres: corta los ultimos cuarenta y devuelve casi
   * toda la descripcion. El corte hacia lo contrario de cortar.
   */
  it('una ciudad larguisima no desborda la descripcion', () => {
    const largo = buildDescription({
      ...row,
      city: 'Ciudad'.repeat(40),
      description: 'Impecable, único dueño. '.repeat(30),
    })
    expect(largo).not.toContain('Impecable')
    expect(largo.endsWith('…')).toBe(false)
  })

  /**
   * El vinculo entre los topes de los formularios y el presupuesto de este
   * corte. `LIMITS.city` existe justamente para que el encabezado no se coma
   * el lugar del texto: si alguien afloja ese tope, el preview de los avisos
   * de la provincia con el nombre mas largo empieza a salir sin descripcion, y
   * eso no se ve desde el sitio.
   */
  it('con los topes puestos, siempre queda lugar para el texto del vendedor', () => {
    const provinciaMasLarga = [...provinces].sort((a, b) => b.length - a.length)[0]!

    const peorCaso = buildDescription({
      ...row,
      city: 'C'.repeat(LIMITS.city),
      province: provinciaMasLarga,
      mileage: 999_999,
      description: 'Impecable, único dueño, service al día, cubiertas nuevas.',
    })

    expect(peorCaso).toContain('Impecable')
  })

  /* El borde: cuando queda justo el lugar minimo, el fragmento tiene que
     entrar entero y no salir cortado en un caracter. */
  it('no deja un fragmento de dos letras', () => {
    for (let relleno = 100; relleno < 200; relleno += 7) {
      const description = buildDescription({
        ...row,
        city: 'C'.repeat(relleno),
        description: 'Impecable, único dueño, service al día, cubiertas nuevas.',
      })
      const cola = description.split(`, ${row.province}. `)[1]
      if (cola !== undefined) expect(cola.length, `relleno ${relleno}`).toBeGreaterThan(10)
    }
  })
})

describe('el escapado del preview', () => {
  /**
   * El titulo y la descripcion salen de lo que escribio el vendedor y se
   * interpolan adentro de atributos de un `<meta>` en el HTML que se le sirve
   * a cualquiera que abra el link.
   */
  it('cierra las comillas y los angulos', () => {
    expect(attr('Ford "Falcon" <coupe>')).toBe('Ford &quot;Falcon&quot; &lt;coupe&gt;')
  })

  it('no se puede salir del atributo', () => {
    const intento = '"><script>alert(1)</script><meta x="'
    const escapado = attr(intento)
    expect(escapado).not.toContain('<')
    expect(escapado).not.toContain('>')
    expect(escapado).not.toContain('"')
  })

  /* El ampersand va primero: al reves, `&lt;` de la primera pasada se volveria
     `&amp;lt;` en la segunda y el texto saldria con la entidad a la vista. */
  it('escapa el ampersand una sola vez', () => {
    expect(attr('Renault & Cia')).toBe('Renault &amp; Cia')
    expect(attr('a < b')).toBe('a &lt; b')
    expect(attr('&lt;')).toBe('&amp;lt;')
  })

  it('el sitemap escapa tambien la comilla simple', () => {
    expect(xmlEscape(`O'Higgins & <hijos>`)).toBe('O&apos;Higgins &amp; &lt;hijos&gt;')
  })

  it('el texto sin nada raro pasa igual', () => {
    expect(attr('BMW 320i Sport Line')).toBe('BMW 320i Sport Line')
    expect(xmlEscape('https://autana.com/cars/bmw-320i')).toBe('https://autana.com/cars/bmw-320i')
  })
})


/**
 * `robots.txt` y `sitemap.xml` hablan de las mismas URLs y dicen cosas
 * opuestas: uno las ofrece, el otro las prohíbe. Una página que caiga en los
 * dos es una contradicción que Google resuelve solo y a su criterio.
 */
describe('robots y sitemap no se contradicen', () => {
  it('ninguna página del sitemap está bloqueada', () => {
    for (const page of STATIC_PAGES) {
      const bloqueada = DISALLOWED.find(
        (path) => page === path || page.startsWith(`${path}/`),
      )
      expect(bloqueada, `${page} está en el sitemap y en el Disallow`).toBeUndefined()
    }
  })

  /* La home no se puede bloquear ni por accidente: un `Disallow: /` sacaría el
     sitio entero del buscador, y es un carácter de distancia. */
  it('nunca se bloquea la raíz', () => {
    expect(DISALLOWED).not.toContain('/')
  })

  it('todas las rutas empiezan con barra y no terminan en una', () => {
    for (const path of [...DISALLOWED, ...STATIC_PAGES]) {
      expect(path.startsWith('/'), path).toBe(true)
      if (path !== '/') expect(path.endsWith('/'), path).toBe(false)
    }
  })

  it('no hay repetidas', () => {
    expect(new Set(DISALLOWED).size).toBe(DISALLOWED.length)
    expect(new Set(STATIC_PAGES).size).toBe(STATIC_PAGES.length)
  })
})

/**
 * La redirección al dominio propio.
 *
 * Es una pieza que sólo se prende una vez y que, prendida mal, tira el sitio
 * entero: apunta a un dominio que no resuelve y nadie entra. Prendida, lo que
 * hay que sostener es que mande a donde tiene que mandar, que no se mande a sí
 * misma ---que es un bucle, y el sitio deja de existir igual--- y que conserve
 * el camino y la query, porque un link viejo a una ficha tiene que seguir
 * cayendo en esa ficha y no en la portada.
 */
describe('el dominio canónico', () => {
  const pedido = (href: string, method = 'GET') =>
    canonicalRedirect(new URL(href), new Request(href, { method }))

  it('manda el dominio de workers.dev al propio', () => {
    expect(CANONICAL_HOST).toBe('auteando.com')
    const salida = pedido('https://autana.riosjuanm10.workers.dev/cars')
    expect(salida?.status).toBe(301)
    expect(salida?.headers.get('location')).toBe('https://auteando.com/cars')
  })

  it('conserva el camino y la query', () => {
    const salida = pedido(
      'https://autana.riosjuanm10.workers.dev/cars?make=BMW&minPrice=20000',
    )
    expect(salida?.headers.get('location')).toBe(
      'https://auteando.com/cars?make=BMW&minPrice=20000',
    )
  })

  it('no se redirige a sí mismo', () => {
    expect(pedido('https://auteando.com/cars')).toBeNull()
  })

  it('no toca lo que no es una lectura', () => {
    expect(pedido('https://autana.riosjuanm10.workers.dev/cars', 'POST')).toBeNull()
  })
})
