import { describe, expect, it } from 'vitest'
/* Con `?raw`, igual que los tests que leen el esquema: lo que se prueba es
   el archivo de configuracion tal cual se despliega. */
import wranglerRaw from '../wrangler.jsonc?raw'
import appRaw from '../src/App.tsx?raw'
import { provinces } from '../src/data/makes'
import { LIMITS } from '../src/lib/limits'
import {
  attr,
  buildDescription,
  buildTitle,
  canonicalFor,
  canonicalRedirect,
  legacyRedirect,
  listingJsonLd,
  xmlEscape,
} from './index'
/* Las constantes viven aparte: el archivo de entrada del Worker sólo puede
   exportar funciones. Está explicado arriba de `rutas.ts`. */
import {
  BLOG_URL,
  CANONICAL_HOST,
  esRutaConocida,
  DISALLOWED,
  GARAGE_URL,
  LISTING_URL,
  RUTAS_VIEJAS,
  STATIC_PAGES,
} from './rutas'

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
  condition: 'used',
  description: 'Impecable, único dueño, service al día.',
  city: 'Rosario',
  province: 'Santa Fe',
  listing_images: null,
}

describe('las URL que el worker reescribe', () => {
  it('reconoce la ficha de un aviso', () => {
    expect('/autos/bmw-320i-2022'.match(LISTING_URL)?.[1]).toBe('bmw-320i-2022')
    /* Con barra al final es la misma pagina. */
    expect('/autos/bmw-320i-2022/'.match(LISTING_URL)?.[1]).toBe('bmw-320i-2022')
  })

  it('no toca el listado ni las busquedas', () => {
    expect('/autos'.match(LISTING_URL)).toBeNull()
    expect('/autos/'.match(LISTING_URL)).toBeNull()
    expect('/autos/bmw/320i'.match(LISTING_URL)).toBeNull()
  })

  /**
   * El slug se interpola en un filtro de PostgREST. El patron es lo unico que
   * separa un slug nuestro de una cadena armada para salirse del filtro, asi
   * que tiene que rechazar todo lo que no sea letras, numeros y guiones.
   */
  it('rechaza lo que no tiene forma de slug', () => {
    const intentos = [
      "/autos/bmw'or'1'='1",
      '/autos/bmw%20320i',
      '/autos/bmw.320i',
      '/autos/bmw_320i',
      '/autos/bmw,320i',
      '/autos/bmw*',
      '/autos/bmw(320i)',
      `/autos/${'a'.repeat(121)}`,
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

/**
 * Los datos estructurados del aviso: lo que hace que en Google aparezca con
 * precio, año y kilómetros en vez de un renglón de texto.
 *
 * Se prueba porque el error es mudo en los dos sentidos: un JSON mal armado lo
 * descarta el buscador sin avisar, y un dato equivocado ---un precio en la
 * moneda que no es--- se publica igual y lo ve todo el mundo.
 */
describe('listingJsonLd', () => {
  const canonical = 'https://auteando.com/autos/bmw-320i-2022'
  const parse = (r = row, image: string | null = null) =>
    JSON.parse(listingJsonLd(r, canonical, image).replaceAll('\\u003c', '<'))

  it('dice qué auto es, con su precio y su moneda', () => {
    const data = parse()
    expect(data['@type']).toBe('Car')
    expect(data.brand.name).toBe('BMW')
    expect(data.model).toBe('320i')
    expect(data.vehicleModelDate).toBe('2022')
    expect(data.offers).toMatchObject({ price: 32_900, priceCurrency: 'USD', url: canonical })
  })

  it('los kilómetros con su unidad, que es lo que los hace kilómetros', () => {
    expect(parse().mileageFromOdometer).toEqual({
      '@type': 'QuantitativeValue',
      value: 34_200,
      unitCode: 'KMT',
    })
  })

  it('la condición del aviso, y usado si viniera algo raro', () => {
    expect(parse({ ...row, condition: 'new' }).itemCondition).toBe('https://schema.org/NewCondition')
    expect(parse({ ...row, condition: 'used' }).itemCondition).toBe('https://schema.org/UsedCondition')
    expect(parse({ ...row, condition: 'vaya a saber' }).itemCondition).toBe(
      'https://schema.org/UsedCondition',
    )
  })

  /* Sin foto propia no se declara ninguna: la lámina genérica es la marca, no
     el auto. */
  it('la foto sólo si es del auto', () => {
    expect(parse(row, 'https://auteando.com/foto.webp').image).toEqual([
      'https://auteando.com/foto.webp',
    ])
    expect(parse().image).toBeUndefined()
  })

  /**
   * El JSON va adentro de un `<script>`: si alguien escribe `</script>` en la
   * descripción de su aviso y sale tal cual, la etiqueta se cierra ahí y el
   * resto del JSON lo lee el navegador como HTML. Es una forma de meter
   * cualquier cosa en la página desde un formulario.
   */
  it('no deja cerrar la etiqueta desde la descripción de un aviso', () => {
    const malicioso = { ...row, description: '</script><img src=x onerror=alert(1)>' }
    const salida = listingJsonLd(malicioso, canonical, null)
    expect(salida).not.toContain('</script>')
    expect(salida).not.toContain('<img')
    expect(salida).toContain('\\u003c')
    /* Y sigue siendo JSON válido después de desescapar. */
    expect(JSON.parse(salida.replaceAll('\\u003c', '<')).description).toContain('</script>')
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

/**
 * La redirección al dominio propio sólo sirve si el worker llega a correr.
 *
 * Cloudflare sirve directo cualquier pedido que coincida con un archivo de
 * `dist`, y en ese caso el worker no se ejecuta. Como la portada es
 * `index.html` ---un archivo de verdad--- durante unas horas `/autos` redirigió
 * al dominio propio y `/` no: el sitio siguió existiendo dos veces justo en la
 * página que más importa, contestando 200 y sin `canonical` que desempatara.
 *
 * Lo arregla `run_worker_first`, que es configuración y no código: ningún test
 * de `canonicalRedirect` lo alcanza, porque la función estaba bien. Por eso
 * este lee el archivo que se despliega.
 */
describe('run_worker_first', () => {
  const assets = JSON.parse(wranglerRaw.replace(/^\s*\/\/.*$/gm, '')).assets as {
    run_worker_first?: string[]
  }

  /* Cómo lee Cloudflare la lista: lo que cae en una regla negativa lo sirve el
     asset worker, y todo lo demás que matchee una positiva pasa por el nuestro.
     Las reglas son prefijos con `*` al final, así que alcanza con eso. */
  const correElWorker = (path: string) => {
    const reglas = assets.run_worker_first ?? []
    const matchea = (regla: string) =>
      regla.endsWith('*') ? path.startsWith(regla.slice(0, -1)) : path === regla

    if (reglas.some((regla) => regla.startsWith('!') && matchea(regla.slice(1)))) return false
    return reglas.some((regla) => !regla.startsWith('!') && matchea(regla))
  }

  it('corre en la portada, que es la que se escapaba', () => {
    expect(correElWorker('/')).toBe(true)
  })

  it('corre en las pantallas y en los archivos sueltos de la raiz', () => {
    expect(correElWorker('/autos')).toBe(true)
    expect(correElWorker('/blog/transferir-un-auto-en-argentina')).toBe(true)
    expect(correElWorker('/favicon.ico')).toBe(true)
  })

  /* Los bundles llevan el hash en el nombre y nadie los escribe a mano: los
     pide el navegador después de abrir una página que ya redirigió. Hacerlos
     pasar por el worker sería una invocación por archivo y no cambia nada. */
  it('no corre en los bundles', () => {
    expect(correElWorker('/assets/index-NXXoz_Hn.js')).toBe(false)
    expect(correElWorker('/assets/index-eXG7-A66.css')).toBe(false)
  })
})

/**
 * Cuál es la URL buena de cada pantalla.
 *
 * Lo que de verdad se está probando es que la query se caiga. Los filtros viven
 * en la URL a propósito, así que el listado se alcanza de infinitas formas
 * ---una por cada combinación--- y todas sirven el mismo listado abajo. Sin un
 * canonical que las junte, lo que le corresponde a `/autos` queda repartido
 * entre todas y no alcanza para nada.
 */
/**
 * Las rutas que existen, atadas a las que declara la aplicación.
 *
 * El Worker contesta 404 a lo que no está en `RUTAS_FIJAS`. Si alguien agrega
 * una pantalla en `App.tsx` y no la suma a esa lista, la pantalla anda ---la
 * SPA la dibuja igual--- pero el servidor la declara inexistente y Google la
 * saca del buscador. Nada lo avisaría: es el error mudo que este test cubre.
 */
describe('las rutas que el Worker reconoce', () => {
  /* Del archivo de rutas tal cual, como los otros tests que leen el esquema. */
  const declaradas = [...appRaw.matchAll(/<Route\s+path="([^"]+)"/g)]
    .map((match) => match[1]!)
    .filter((path) => path !== '*')

  it('la aplicación no declara ninguna pantalla que el Worker desconozca', () => {
    const sinCubrir = declaradas.filter((path) => {
      /* `autos/:slug` se prueba con un ejemplo: los patrones con parámetro no
         se pueden comparar como texto. */
      const ejemplo = `/${path}`
        .replace(':slug/editar', 'renault-symbol-2012/editar')
        .replace(':slug', 'renault-symbol-2012')
        .replace(':id', '419025f7-a7e0-4ee2-b6ce-162ce8319b33')
      return !esRutaConocida(ejemplo)
    })
    expect(sinCubrir, `faltan en RUTAS_FIJAS: ${sinCubrir.join(', ')}`).toEqual([])
  })

  it('la portada y las puertas de entrada existen', () => {
    expect(esRutaConocida('/')).toBe(true)
    expect(esRutaConocida('/tiktok')).toBe(true)
  })

  it('con la barra del final es la misma pantalla', () => {
    expect(esRutaConocida('/autos/')).toBe(true)
    expect(esRutaConocida('/autos/renault-symbol-2012/')).toBe(true)
  })

  it('lo que no existe, no existe', () => {
    expect(esRutaConocida('/autoss')).toBe(false)
    expect(esRutaConocida('/wp-admin')).toBe(false)
    expect(esRutaConocida('/autos/renault/symbol')).toBe(false)
    expect(esRutaConocida('/blog/nota/parte-2')).toBe(false)
    expect(esRutaConocida('/g/no-es-un-uuid')).toBe(false)
  })
})

describe('canonicalFor', () => {
  const de = (href: string) => canonicalFor(new URL(href))

  it('tira los filtros', () => {
    expect(de('https://auteando.com/cars?make=BMW&minPrice=20000')).toBe(
      'https://auteando.com/cars',
    )
    expect(de('https://auteando.com/cars?maxYear=2015')).toBe('https://auteando.com/cars')
  })

  /* Las puertas de entrada son la portada con otro nombre. Sin esto Google ve
     tres portadas iguales y reparte entre ellas lo que es de una. */
  it('las puertas de entrada apuntan a la portada', () => {
    expect(de('https://auteando.com/tiktok')).toBe('https://auteando.com/')
    expect(de('https://auteando.com/tiktok/')).toBe('https://auteando.com/')
    expect(de('https://auteando.com/instagram?x=1')).toBe('https://auteando.com/')
    expect(de('https://auteando.com/tiktokers')).toBe('https://auteando.com/tiktokers')
  })

  it('tira la barra del final, que sirve la misma pantalla', () => {
    expect(de('https://auteando.com/cars/')).toBe('https://auteando.com/cars')
    expect(de('https://auteando.com/help/')).toBe('https://auteando.com/help')
  })

  it('la portada se queda con su barra', () => {
    expect(de('https://auteando.com/')).toBe('https://auteando.com/')
  })

  /* Las fijas son las que no tienen preview propio y son justo las que hasta
     ahora salian sin canonical. Ninguna deberia cambiar de forma al pasar. */
  it('deja las pantallas fijas como estan', () => {
    for (const path of STATIC_PAGES) {
      expect(de(`https://auteando.com${path}`)).toBe(`https://auteando.com${path}`)
    }
  })
})

/**
 * Las rutas viejas, de cuando los caminos estaban en inglés.
 *
 * Lo que sostiene este bloque no es que redirija ---eso se ve enseguida--- sino
 * que **no entre en un bucle**. Si alguna ruta nueva empezara con una vieja, el
 * 301 se mandaría a sí mismo y esa pantalla dejaría de existir, con el agravante
 * de que la que se rompe es la nueva: la vieja sigue "funcionando" hasta que
 * alguien la abre. Es exactamente lo que pasa si dentro de un año se agrega una
 * ruta sin mirar esta lista.
 */
describe('las rutas viejas', () => {
  const pedido = (href: string, method = 'GET') =>
    legacyRedirect(new URL(href), new Request(href, { method }))

  const destino = (href: string) => pedido(href)?.headers.get('location')

  it('manda cada una a la nueva', () => {
    expect(destino('https://auteando.com/cars')).toBe('https://auteando.com/autos')
    expect(destino('https://auteando.com/login')).toBe('https://auteando.com/entrar')
    expect(pedido('https://auteando.com/cars')?.status).toBe(301)
  })

  it('conserva lo que viene despues, y la query', () => {
    expect(destino('https://auteando.com/cars/bmw-320i-2022')).toBe(
      'https://auteando.com/autos/bmw-320i-2022',
    )
    expect(destino('https://auteando.com/cars?make=BMW&minPrice=20000')).toBe(
      'https://auteando.com/autos?make=BMW&minPrice=20000',
    )
  })

  /* La unica vieja que ademas tenia una palabra propia despues del slug. */
  it('traduce el editar del formulario', () => {
    expect(destino('https://auteando.com/sell/bmw-320i-2022/edit')).toBe(
      'https://auteando.com/vender/bmw-320i-2022/editar',
    )
  })

  it('ninguna ruta nueva cae en una vieja', () => {
    for (const nueva of Object.values(RUTAS_VIEJAS)) {
      expect(pedido(`https://auteando.com${nueva}`), nueva).toBeNull()
      expect(pedido(`https://auteando.com${nueva}/algo`), nueva).toBeNull()
    }
  })

  it('no toca lo que no es una lectura', () => {
    expect(pedido('https://auteando.com/cars', 'POST')).toBeNull()
  })

  /* Las dos listas del robots y el sitemap se escribieron a mano con los
     caminos nuevos. Si quedo una vieja adentro, el sitemap estaria ofreciendo
     una URL que redirige, que es pedirle a Google que gaste dos pedidos en cada
     pagina y que ademas no es la que queremos que muestre. */
  it('el sitemap y el robots no nombran ninguna vieja', () => {
    for (const path of [...STATIC_PAGES, ...DISALLOWED]) {
      expect(RUTAS_VIEJAS[path], path).toBeUndefined()
    }
  })
})
