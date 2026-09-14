import type { BodyType } from '../types'

/**
 * Modelos por marca, con su carrocería.
 *
 * Lo usan dos cosas, y por eso es una sola lista:
 *
 * 1. El select de modelos del buscador. Mismo criterio que `brands.ts`: es una
 *    lista curada, no lo que hay publicado. Un select que sale de la base
 *    arranca vacío el día uno, y un desplegable vacío no se lee como "todavía
 *    no hay", se lee como roto. Lo curado y lo publicado no compiten:
 *    `modelsForMake` los une.
 *
 * 2. El dibujo del garage. El garage guarda marca y modelo como texto libre, y
 *    `bodyFor` deduce de acá qué silueta dibujar. Tenerlo en el mismo lugar que
 *    la lista de modelos es lo que evita que un modelo nuevo aparezca en el
 *    select y se dibuje con la silueta equivocada: agregarlo obliga a decir
 *    qué carrocería tiene.
 *
 * Es el parque automotor argentino, no la gama actual de cada marca: la mayor
 * parte del marketplace son usados, y "mi primer auto" es muy seguido un auto
 * que se dejó de fabricar hace treinta años. Por eso están el Falcon, el 12 y
 * el 600.
 *
 * La carrocería es la forma que se reconoce en la calle, no la ficha técnica.
 * Los monovolúmenes (Spin, Zafira, Suran) van como `van` porque es el dibujo
 * que más se les parece, y los que salieron en dos versiones van con la más
 * común acá.
 */

/** La clave de afuera es el `name` exacto de `brands.ts`. */
const catalog: Record<string, Record<string, BodyType>> = {
  Audi: {
    A1: 'hatchback', A3: 'hatchback', A4: 'sedan', A5: 'coupe', A6: 'sedan',
    A7: 'coupe', A8: 'sedan',
    Q2: 'suv', Q3: 'suv', Q5: 'suv', Q7: 'suv', Q8: 'suv',
    RS3: 'hatchback', S3: 'hatchback', TT: 'coupe', R8: 'coupe', 'e-tron': 'suv',
  },

  BMW: {
    'Serie 1': 'hatchback', 'Serie 2': 'coupe', 'Serie 3': 'sedan', 'Serie 4': 'coupe',
    'Serie 5': 'sedan', 'Serie 6': 'coupe', 'Serie 7': 'sedan',
    X1: 'suv', X2: 'suv', X3: 'suv', X4: 'suv', X5: 'suv', X6: 'suv', X7: 'suv',
    M2: 'coupe', M3: 'sedan', M4: 'coupe', Z4: 'coupe', i3: 'hatchback', iX: 'suv', iX3: 'suv',
  },

  Chevrolet: {
    '400': 'sedan', Agile: 'hatchback', Astra: 'hatchback', Aveo: 'sedan', Blazer: 'suv',
    Camaro: 'coupe', Captiva: 'suv', Celta: 'hatchback', Chevy: 'coupe', Classic: 'sedan',
    Cobalt: 'sedan', Corsa: 'hatchback', Cruze: 'sedan', Equinox: 'suv', Meriva: 'van',
    Montana: 'pickup', Onix: 'hatchback', 'Onix Plus': 'sedan', Prisma: 'sedan',
    S10: 'pickup', Silverado: 'pickup', Sonic: 'hatchback', Spin: 'van', Tracker: 'suv',
    Trailblazer: 'suv', Vectra: 'sedan', Zafira: 'van',
  },

  Citroën: {
    '2CV': 'hatchback', '3CV': 'hatchback', Basalt: 'suv', Berlingo: 'van', C3: 'hatchback',
    'C3 Aircross': 'suv', C4: 'hatchback', 'C4 Cactus': 'suv', 'C4 Lounge': 'sedan',
    'C4 Picasso': 'van', 'C4 Spacetourer': 'van', 'C5 Aircross': 'suv',
    'C-Elysée': 'sedan', Jumper: 'van', Jumpy: 'van', Xsara: 'hatchback',
    'Xsara Picasso': 'van',
  },

  Fiat: {
    '128': 'sedan', '147': 'hatchback', '500': 'hatchback', '500X': 'suv', '600': 'hatchback',
    Argo: 'hatchback', Bravo: 'hatchback', Cronos: 'sedan', Doblo: 'van', Ducato: 'van',
    Duna: 'sedan', Fastback: 'suv', Fiorino: 'van', Idea: 'van', Linea: 'sedan',
    Mobi: 'hatchback', Palio: 'hatchback', Pulse: 'suv', Punto: 'hatchback',
    Regata: 'sedan', Siena: 'sedan', Stilo: 'hatchback', Strada: 'pickup',
    Tipo: 'hatchback', Toro: 'pickup', Uno: 'hatchback',
  },

  Ford: {
    Bronco: 'suv', 'Bronco Sport': 'suv', Courier: 'pickup', EcoSport: 'suv', Edge: 'suv',
    Escort: 'hatchback', Explorer: 'suv', 'F-100': 'pickup', 'F-150': 'pickup',
    Falcon: 'sedan', Fiesta: 'hatchback', Focus: 'hatchback', Ka: 'hatchback', Kuga: 'suv',
    Maverick: 'pickup', Mondeo: 'sedan', Mustang: 'coupe', Ranger: 'pickup',
    Sierra: 'hatchback', Taunus: 'sedan', Territory: 'suv', Transit: 'van',
  },

  Honda: {
    Accord: 'sedan', City: 'sedan', Civic: 'sedan', 'CR-V': 'suv', Fit: 'hatchback',
    'HR-V': 'suv', Pilot: 'suv', 'WR-V': 'suv', 'ZR-V': 'suv',
  },

  Jeep: {
    Avenger: 'suv', Cherokee: 'suv', Commander: 'suv', Compass: 'suv', Gladiator: 'pickup',
    'Grand Cherokee': 'suv', Patriot: 'suv', Renegade: 'suv', Wrangler: 'suv',
  },

  'Mercedes-Benz': {
    'Clase A': 'hatchback', 'Clase B': 'hatchback', 'Clase C': 'sedan', 'Clase E': 'sedan',
    'Clase G': 'suv', 'Clase S': 'sedan', CLA: 'coupe', GLA: 'suv', GLB: 'suv', GLC: 'suv',
    GLE: 'suv', GLK: 'suv', ML: 'suv', 'AMG GT': 'coupe', SLK: 'coupe',
    Sprinter: 'van', Vito: 'van', Viano: 'van',
  },

  Nissan: {
    Altima: 'sedan', Frontier: 'pickup', Kicks: 'suv', Leaf: 'hatchback', March: 'hatchback',
    Murano: 'suv', Note: 'hatchback', NP300: 'pickup', Pathfinder: 'suv', Qashqai: 'suv',
    Sentra: 'sedan', Tiida: 'hatchback', Versa: 'sedan', 'X-Trail': 'suv',
  },

  Peugeot: {
    '206': 'hatchback', '207': 'hatchback', '208': 'hatchback', '2008': 'suv', '301': 'sedan',
    '307': 'hatchback', '308': 'hatchback', '3008': 'suv', '404': 'sedan', '405': 'sedan',
    '406': 'sedan', '408': 'sedan', '5008': 'suv', '504': 'sedan', '505': 'sedan',
    '508': 'sedan', Boxer: 'van', Expert: 'van', Hoggar: 'pickup', Landtrek: 'pickup',
    Partner: 'van', RCZ: 'coupe', Rifter: 'van',
  },

  Renault: {
    '9': 'sedan', '11': 'hatchback', '12': 'sedan', '18': 'sedan', '19': 'sedan', '21': 'sedan',
    Alaskan: 'pickup', Captur: 'suv', Clio: 'hatchback', Duster: 'suv',
    'Duster Oroch': 'pickup', Fluence: 'sedan', Kangoo: 'van', Koleos: 'suv',
    Kwid: 'hatchback', Logan: 'sedan', Master: 'van', Megane: 'hatchback',
    Sandero: 'hatchback', 'Sandero Stepway': 'hatchback', Scenic: 'van', Symbol: 'sedan',
    Trafic: 'van', Twingo: 'hatchback',
  },

  Toyota: {
    '4Runner': 'suv', 'C-HR': 'suv', Camry: 'sedan', Corolla: 'sedan', 'Corolla Cross': 'suv',
    Corona: 'sedan', Etios: 'hatchback', Hiace: 'van', Hilux: 'pickup', Innova: 'van',
    'Land Cruiser': 'suv', Prius: 'hatchback', RAV4: 'suv', SW4: 'suv', Tercel: 'sedan',
    Yaris: 'hatchback',
  },

  Volkswagen: {
    Amarok: 'pickup', Bora: 'sedan', Caddy: 'van', Crafter: 'van', Escarabajo: 'hatchback',
    Fox: 'hatchback', Gacel: 'hatchback', Gol: 'hatchback', 'Gol Trend': 'hatchback',
    Golf: 'hatchback', Nivus: 'suv', Passat: 'sedan', Polo: 'hatchback', Saveiro: 'pickup',
    Senda: 'sedan', Suran: 'van', Taos: 'suv', 'T-Cross': 'suv', Tiguan: 'suv',
    Touareg: 'suv', Transporter: 'van', 'Up!': 'hatchback', Vento: 'sedan',
    Virtus: 'sedan', Voyage: 'sedan',
  },
}

/**
 * Los modelos a mostrar para una marca: el catálogo más lo que haya publicado.
 *
 * `published` viene de `listModels()`, que lee los avisos activos. Se compara
 * en minúscula para no listar dos veces el mismo modelo cargado con otra
 * capitalización, y en ese caso gana la forma del catálogo — que es la que
 * está bien escrita.
 */
export function modelsForMake(make: string, published: readonly string[] = []): string[] {
  const seen = new Map<string, string>()

  for (const model of Object.keys(catalog[make] ?? {})) seen.set(model.toLowerCase(), model)
  for (const model of published) {
    const key = model.toLowerCase()
    if (!seen.has(key)) seen.set(key, model)
  }

  return [...seen.values()].sort((a, b) => a.localeCompare(b, 'es'))
}

/**
 * Deja sólo letras y números, en minúscula y sin acentos.
 *
 * Es lo que hace comparables "T-Cross", "t cross" y "TCross", o "Citroën" y
 * "citroen": la gente escribe el modelo como le sale, y el guión o el espacio
 * no cambian de qué auto se trata.
 */
function compact(value: string): string {
  return value
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '')
}

/** Cómo se escribe la marca en la calle, contra cómo está en `brands.ts`. */
const MAKE_ALIASES: Record<string, string> = {
  vw: 'volkswagen',
  chevy: 'chevrolet',
  mercedes: 'mercedesbenz',
  benz: 'mercedesbenz',
}

/** El catálogo indexado ya compactado, armado una sola vez. */
const index = new Map(
  Object.entries(catalog).map(([make, models]) => [
    compact(make),
    Object.entries(models)
      .map(([model, body]) => ({ key: compact(model), body }))
      /* De más largo a más corto: el primero que calce es el más específico,
         así "Corolla Cross XEI" es Corolla Cross y no Corolla. */
      .sort((a, b) => b.key.length - a.key.length),
  ]),
)

/**
 * La carrocería de un auto a partir de lo que alguien escribió, o `undefined`
 * si no se reconoce.
 *
 * El modelo se compara por prefijo y no por igualdad, porque en el garage
 * nadie escribe "Hilux": escribe "Hilux SRV 4x4". Gana el modelo más largo que
 * calce, que es lo que separa "Gol" de "Golf" y "Onix" de "Onix Plus".
 *
 * No reconocer no es un error: el dibujo cae en la silueta de la consigna, que
 * es lo que había antes. Por eso esto nunca adivina con otra marca — mejor el
 * dibujo genérico que una camioneta donde había un sedán.
 */
export function bodyFor(make: string, model: string): BodyType | undefined {
  const makeKey = compact(make)
  const models = index.get(MAKE_ALIASES[makeKey] ?? makeKey)
  if (!models) return undefined

  const modelKey = compact(model)
  if (!modelKey) return undefined

  const found = models.find((entry) => modelKey.startsWith(entry.key))
  if (found) return found.body

  /* El Renault 12 se escribe "R12" tanto como "12". Sólo para Renault: en
     otra marca una letra adelante del número es parte del nombre (M3, S3). */
  if (makeKey === 'renault' && /^r\d/.test(modelKey)) {
    return models.find((entry) => modelKey.slice(1).startsWith(entry.key))?.body
  }

  return undefined
}
