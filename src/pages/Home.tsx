import { useEffect, useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { BrandSlider } from '../components/home/BrandSlider'
import { BudgetSlider } from '../components/home/BudgetSlider'
import { CategorySlider } from '../components/home/CategorySlider'
import { ClosingBand } from '../components/home/ClosingBand'
import { DealerSlider } from '../components/home/DealerSlider'
import { Faq } from '../components/home/Faq'
import { HowItWorks } from '../components/home/HowItWorks'
import { PopularModels } from '../components/home/PopularModels'
import { ProblemSection } from '../components/home/ProblemSection'
import { VehicleSlider } from '../components/home/VehicleSlider'
import { Badge } from '../components/ui/Badge'
import { Button } from '../components/ui/Button'
import { Card } from '../components/ui/Card'
import { Icon } from '../components/ui/Icon'
import { Select } from '../components/ui/Select'
import { brands } from '../data/brands'
import { priceCaps, provinces } from '../data/makes'
import {
  countsBy,
  getStats,
  listDealers,
  listPopularVehicles,
  listRecentVehicles,
  type MarketplaceStats,
} from '../lib/api'
import { useDocumentMeta } from '../hooks/useDocumentMeta'
import { formatCount } from '../lib/format'
import type { Seller, Vehicle } from '../types'
import './Home.css'

const popular = [
  { label: 'SUV hasta USD 30.000', query: 'bodyType=suv&maxPrice=30000' },
  { label: 'Autos 0 km', query: 'condition=new' },
  { label: 'Toyota Hilux', query: 'make=Toyota&model=Hilux' },
  { label: 'Automáticos 2020+', query: 'transmission=automatic&minYear=2020' },
  { label: 'Híbridos', query: 'fuelType=hybrid' },
]

export function Home() {
  const navigate = useNavigate()

  useDocumentMeta({
    title: 'Autana — Comprá y vendé autos',
    description:
      'Marketplace de vehículos. Autos de particulares y concesionarias, con filtros que sirven y contacto directo con el vendedor.',
  })

  const [make, setMake] = useState('')
  const [province, setProvince] = useState('')
  const [maxPrice, setMaxPrice] = useState('')

  const [recent, setRecent] = useState<Vehicle[]>([])
  const [mostSeen, setMostSeen] = useState<Vehicle[]>([])
  const [makeCounts, setMakeCounts] = useState<Record<string, number>>({})
  const [bodyCounts, setBodyCounts] = useState<Record<string, number>>({})
  const [dealers, setDealers] = useState<Seller[]>([])
  const [stats, setStats] = useState<MarketplaceStats | null>(null)
  const [loadingRecent, setLoadingRecent] = useState(true)

  useEffect(() => {
    let current = true

    void Promise.allSettled([
      listRecentVehicles(8),
      listPopularVehicles(8),
      countsBy('make'),
      countsBy('body_type'),
      getStats(),
      listDealers(8),
    ]).then(([recentResult, popularResult, makesResult, bodiesResult, statsResult, dealersResult]) => {
      if (!current) return

      if (recentResult.status === 'fulfilled') setRecent(recentResult.value)
      if (popularResult.status === 'fulfilled') setMostSeen(popularResult.value)
      if (makesResult.status === 'fulfilled') setMakeCounts(makesResult.value)
      if (bodiesResult.status === 'fulfilled') setBodyCounts(bodiesResult.value)
      if (statsResult.status === 'fulfilled') setStats(statsResult.value)
      if (dealersResult.status === 'fulfilled') setDealers(dealersResult.value)
      setLoadingRecent(false)
    })

    return () => {
      current = false
    }
  }, [])

  /* Los filtros viven en la URL: buscar es navegar a /cars con la query. */
  function handleSearch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const params = new URLSearchParams()
    if (make) params.set('make', make)
    if (province) params.set('province', province)
    if (maxPrice) params.set('maxPrice', maxPrice)
    navigate({ pathname: '/cars', search: params.toString() })
  }

  return (
    <>
      <section className="hero">
        <div className="page hero__inner">
        <span className="over">Marketplace de autos · Argentina</span>
        <h1 className="hero__title">Encontrá el auto justo para vos.</h1>
        <p className="hero__sub">
          Vehículos de particulares y concesionarias, con filtros que sirven y contacto directo
          con el vendedor.
        </p>

        <Card className="search-module">
          <form onSubmit={handleSearch}>
            <h2 className="sr-only">Buscar vehículos</h2>
            <div className="search-module__grid">
              <Select
                label="Marca"
                placeholder="Todas"
                options={brands.map((brand) => ({ value: brand.name, label: brand.name }))}
                value={make}
                onChange={(event) => setMake(event.target.value)}
              />
              <Select
                label="Modelo"
                placeholder={make ? 'Todos' : 'Elegí una marca primero'}
                options={[]}
                disabled={!make}
              />
              <Select
                label="Ubicación"
                placeholder="Todo el país"
                options={provinces.map((item) => ({ value: item, label: item }))}
                value={province}
                onChange={(event) => setProvince(event.target.value)}
              />
              <Select
                label="Precio hasta"
                placeholder="Sin tope"
                options={priceCaps.map((cap) => ({
                  value: String(cap),
                  label: `USD ${cap.toLocaleString('es-AR')}`,
                }))}
                value={maxPrice}
                onChange={(event) => setMaxPrice(event.target.value)}
              />
              <Button type="submit" variant="yellow" className="search-module__submit">
                <Icon name="search" />
                Buscar
              </Button>
            </div>
          </form>

          <div className="search-module__popular">
            <span className="search-module__popular-label">Populares</span>
            {popular.map((item) => (
              <button
                key={item.label}
                type="button"
                className="chip-button"
                onClick={() => navigate({ pathname: '/cars', search: item.query })}
              >
                <Badge>{item.label}</Badge>
              </button>
            ))}
          </div>
        </Card>

        {/* Los números salen de la base. Si hay tres autos, dice tres. */}
        {stats && stats.listings > 0 && (
          <dl className="stats">
            <div className="stats__item">
              <dd className="stats__value mono">{formatCount(stats.listings)}</dd>
              <dt className="stats__label">
                {stats.listings === 1 ? 'auto publicado' : 'autos publicados'}
              </dt>
            </div>
            <span className="stats__divider" aria-hidden="true" />
            <div className="stats__item">
              <dd className="stats__value mono">{formatCount(stats.makes)}</dd>
              <dt className="stats__label">{stats.makes === 1 ? 'marca' : 'marcas'}</dt>
            </div>
            <span className="stats__divider" aria-hidden="true" />
            <div className="stats__item">
              <dd className="stats__value mono">{formatCount(stats.provinces)}</dd>
              <dt className="stats__label">
                {stats.provinces === 1 ? 'provincia' : 'provincias'}
              </dt>
            </div>
          </dl>
        )}
        </div>
      </section>

      <ProblemSection />

      <div className="page home__sections">
        <BrandSlider counts={makeCounts} />

        <VehicleSlider
          eyebrow="Lo último"
          title="Recién publicados"
          vehicles={recent}
          loading={loadingRecent}
          action={{ label: 'Ver todos', to: '/cars' }}
        />

        <CategorySlider counts={bodyCounts} />

        <PopularModels />

        <HowItWorks />

        <VehicleSlider eyebrow="Los que más miran" title="Más vistos" vehicles={mostSeen} />

        <BudgetSlider />

        <DealerSlider dealers={dealers} />
      </div>



      <section className="page home__faq">
        <Faq />
      </section>

      <section className="page home__closing">
        <ClosingBand />
      </section>
    </>
  )
}
