/**
 * Marcas destacadas para el buscador de la home.
 *
 * Es una lista curada, no lo que hay publicado: cars.com y los marketplaces
 * grandes muestran siempre las marcas fuertes, aunque en ese momento no haya
 * stock. Si el usuario entra a una sin avisos ve el empty state, que ya
 * ofrece limpiar filtros.
 *
 * Los logos van en `src/assets/brands/<slug>.svg` y se levantan solos: no hay
 * que tocar este archivo para que aparezcan.
 */
export interface Brand {
  name: string
  slug: string
}

export const brands: Brand[] = [
  { name: 'Toyota', slug: 'toyota' },
  { name: 'Volkswagen', slug: 'volkswagen' },
  { name: 'Ford', slug: 'ford' },
  { name: 'Chevrolet', slug: 'chevrolet' },
  { name: 'Renault', slug: 'renault' },
  { name: 'Fiat', slug: 'fiat' },
  { name: 'Peugeot', slug: 'peugeot' },
  { name: 'Honda', slug: 'honda' },
  { name: 'Nissan', slug: 'nissan' },
  { name: 'Jeep', slug: 'jeep' },
  { name: 'BMW', slug: 'bmw' },
  { name: 'Mercedes-Benz', slug: 'mercedes-benz' },
  { name: 'Audi', slug: 'audi' },
  { name: 'Citroën', slug: 'citroen' },
]
