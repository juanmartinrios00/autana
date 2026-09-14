/**
 * Modelos por marca para el select del buscador.
 *
 * Mismo criterio que `brands.ts`: es una lista curada, no lo que hay
 * publicado. Un select de modelos que sale de la base arranca vacío el día
 * uno y se va llenando de a uno — y un desplegable vacío no se lee como
 * "todavía no hay", se lee como roto.
 *
 * Lo curado y lo publicado no compiten: `modelsForMake` los une. Si alguien
 * publica un modelo que acá no está, igual aparece; y si el catálogo tiene uno
 * que nadie publicó, el usuario cae en el empty state de /cars, que ya ofrece
 * limpiar filtros.
 *
 * Es el parque automotor argentino, no la gama actual de cada marca: la mayor
 * parte del marketplace son usados, así que están los que se dejaron de
 * fabricar hace veinte años y siguen circulando.
 */

/** Catálogo por marca. La clave es el `name` exacto de `brands.ts`. */
const catalog: Record<string, readonly string[]> = {
  Audi: [
    'A1', 'A3', 'A4', 'A5', 'A6', 'A7', 'A8',
    'Q2', 'Q3', 'Q5', 'Q7', 'Q8',
    'RS3', 'S3', 'TT', 'R8', 'e-tron',
  ],

  BMW: [
    'Serie 1', 'Serie 2', 'Serie 3', 'Serie 4', 'Serie 5', 'Serie 6', 'Serie 7',
    'X1', 'X2', 'X3', 'X4', 'X5', 'X6', 'X7',
    'M2', 'M3', 'M4', 'Z4', 'i3', 'iX', 'iX3',
  ],

  Chevrolet: [
    'Agile', 'Astra', 'Aveo', 'Blazer', 'Camaro', 'Captiva', 'Celta', 'Classic',
    'Cobalt', 'Corsa', 'Cruze', 'Equinox', 'Meriva', 'Montana', 'Onix',
    'Onix Plus', 'Prisma', 'S10', 'Silverado', 'Sonic', 'Spin', 'Tracker',
    'Trailblazer', 'Vectra', 'Zafira',
  ],

  Citroën: [
    'Berlingo', 'Basalt', 'C3', 'C3 Aircross', 'C4', 'C4 Cactus', 'C4 Lounge',
    'C4 Picasso', 'C4 Spacetourer', 'C5 Aircross', 'C-Elysée', 'Jumper',
    'Jumpy', 'Xsara', 'Xsara Picasso',
  ],

  Fiat: [
    '500', 'Argo', 'Bravo', 'Cronos', 'Doblo', 'Ducato', 'Duna', 'Fastback',
    'Fiorino', 'Idea', 'Linea', 'Mobi', 'Palio', 'Pulse', 'Punto', 'Siena',
    'Stilo', 'Strada', 'Tipo', 'Toro', 'Uno',
  ],

  Ford: [
    'Bronco', 'Bronco Sport', 'Courier', 'EcoSport', 'Edge', 'Escort',
    'Explorer', 'F-100', 'F-150', 'Fiesta', 'Focus', 'Ka', 'Kuga', 'Maverick',
    'Mondeo', 'Mustang', 'Ranger', 'Territory', 'Transit',
  ],

  Honda: [
    'Accord', 'City', 'Civic', 'CR-V', 'Fit', 'HR-V', 'Pilot', 'WR-V', 'ZR-V',
  ],

  Jeep: [
    'Avenger', 'Cherokee', 'Commander', 'Compass', 'Gladiator',
    'Grand Cherokee', 'Patriot', 'Renegade', 'Wrangler',
  ],

  'Mercedes-Benz': [
    'Clase A', 'Clase B', 'Clase C', 'Clase E', 'Clase G', 'Clase S',
    'CLA', 'GLA', 'GLB', 'GLC', 'GLE', 'GLK', 'ML',
    'AMG GT', 'SLK', 'Sprinter', 'Vito', 'Viano',
  ],

  Nissan: [
    'Altima', 'Frontier', 'Kicks', 'Leaf', 'March', 'Murano', 'Note', 'NP300',
    'Pathfinder', 'Qashqai', 'Sentra', 'Tiida', 'Versa', 'X-Trail',
  ],

  Peugeot: [
    '206', '207', '208', '2008', '301', '307', '308', '3008', '405', '406',
    '408', '5008', '504', '505', '508', 'Boxer', 'Expert', 'Hoggar',
    'Landtrek', 'Partner', 'RCZ', 'Rifter',
  ],

  Renault: [
    'Alaskan', 'Captur', 'Clio', 'Duster', 'Duster Oroch', 'Fluence', 'Kangoo',
    'Koleos', 'Kwid', 'Logan', 'Master', 'Megane', 'Sandero', 'Sandero Stepway',
    'Scenic', 'Symbol', 'Trafic', 'Twingo',
  ],

  Toyota: [
    '4Runner', 'C-HR', 'Camry', 'Corolla', 'Corolla Cross', 'Corona', 'Etios',
    'Hiace', 'Hilux', 'Innova', 'Land Cruiser', 'Prius', 'RAV4', 'SW4',
    'Tercel', 'Yaris',
  ],

  Volkswagen: [
    'Amarok', 'Bora', 'Caddy', 'Crafter', 'Fox', 'Gol', 'Gol Trend', 'Golf',
    'Nivus', 'Passat', 'Polo', 'Saveiro', 'Suran', 'Taos', 'T-Cross', 'Tiguan',
    'Touareg', 'Transporter', 'Up!', 'Vento', 'Virtus', 'Voyage',
  ],
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

  for (const model of catalog[make] ?? []) seen.set(model.toLowerCase(), model)
  for (const model of published) {
    const key = model.toLowerCase()
    if (!seen.has(key)) seen.set(key, model)
  }

  return [...seen.values()].sort((a, b) => a.localeCompare(b, 'es'))
}
