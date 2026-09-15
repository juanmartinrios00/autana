import { useEffect, useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { BrandSlider } from '../components/home/BrandSlider'
import { AudienceSection } from '../components/home/AudienceSection'
import { BudgetSlider } from '../components/home/BudgetSlider'
import { CategorySlider } from '../components/home/CategorySlider'
import { ClosingBand } from '../components/home/ClosingBand'
import { DealerSlider } from '../components/home/DealerSlider'
import { Faq } from '../components/home/Faq'
import { GarageSection } from '../components/home/GarageSection'
import { HowItWorks } from '../components/home/HowItWorks'
import { Pillars } from '../components/home/Pillars'
import { PopularModels } from '../components/home/PopularModels'
import { ProvinceMap } from '../components/home/ProvinceMap'
import { MarketplaceProof } from '../components/home/MarketplaceProof'
import { VehicleSlider } from '../components/home/VehicleSlider'
import { Badge } from '../components/ui/Badge'
import { Button } from '../components/ui/Button'
import { Card } from '../components/ui/Card'
import { Icon } from '../components/ui/Icon'
import { Select } from '../components/ui/Select'
import { BRAND } from '../config/brand'
import { brands } from '../data/brands'
import { priceCaps, provinces } from '../data/makes'
import { modelsForMake } from '../data/models'
import {
  countsBy,
  getStats,
  listDealers,
  listModels,
  listPopularVehicles,
  listRecentVehicles,
  type MarketplaceStats,
} from '../lib/api'
import { useDocumentMeta } from '../hooks/useDocumentMeta'
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
    title: `${BRAND} — Comprá y vendé autos`,
    description:
      'Marketplace de vehículos. Autos de particulares y concesionarias, con filtros que sirven y contacto directo con el vendedor.',
  })

  const [make, setMake] = useState('')
  const [model, setModel] = useState('')
  const [province, setProvince] = useState('')
  const [maxPrice, setMaxPrice] = useState('')

  const [recent, setRecent] = useState<Vehicle[]>([])
  const [mostSeen, setMostSeen] = useState<Vehicle[]>([])
  const [bodyCounts, setBodyCounts] = useState<Record<string, number>>({})
  const [provinceCounts, setProvinceCounts] = useState<Record<string, number>>({})
  const [dealers, setDealers] = useState<Seller[]>([])
  const [stats, setStats] = useState<MarketplaceStats | null>(null)
  const [publishedModels, setPublishedModels] = useState<Record<string, string[]>>({})
  const [loadingRecent, setLoadingRecent] = useState(true)

  useEffect(() => {
    let current = true

    void Promise.allSettled([
      listRecentVehicles(8),
      listPopularVehicles(8),
      countsBy('body_type'),
      countsBy('province'),
      getStats(),
      listDealers(8),
    ]).then(([recentResult, popularResult, bodiesResult, provincesResult, statsResult, dealersResult]) => {
      if (!current) return

      if (recentResult.status === 'fulfilled') setRecent(recentResult.value)
      if (popularResult.status === 'fulfilled') setMostSeen(popularResult.value)
      if (bodiesResult.status === 'fulfilled') setBodyCounts(bodiesResult.value)
      if (provincesResult.status === 'fulfilled') setProvinceCounts(provincesResult.value)
      if (statsResult.status === 'fulfilled') setStats(statsResult.value)
      if (dealersResult.status === 'fulfilled') setDealers(dealersResult.value)
      setLoadingRecent(false)
    })

    return () => {
      current = false
    }
  }, [])

  /* Los modelos publicados de la marca elegida, para sumarlos al catálogo. Se
     cachean por marca porque el usuario va y viene entre marcas mientras
     arma la búsqueda, y cada vuelta sería otra consulta por lo mismo.

     Si la consulta falla no hay nada que avisar: el select ya tiene el
     catálogo, que es la mayor parte de lo que el usuario espera ver. */
  useEffect(() => {
    if (!make || publishedModels[make]) return
    let current = true

    void listModels(make)
      .then((list) => {
        if (current) setPublishedModels((prev) => ({ ...prev, [make]: list }))
      })
      .catch(() => {})

    return () => {
      current = false
    }
  }, [make, publishedModels])

  const models = make ? modelsForMake(make, publishedModels[make]) : []

  /* Los filtros viven en la URL: buscar es navegar a /cars con la query. */
  function handleSearch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const params = new URLSearchParams()
    if (make) params.set('make', make)
    if (model) params.set('model', model)
    if (province) params.set('province', province)
    if (maxPrice) params.set('maxPrice', maxPrice)
    navigate({ pathname: '/cars', search: params.toString() })
  }

  return (
    <>
      <section className="hero">
        <div className="page hero__inner">
        <span className="over over--invert">Marketplace de autos · Argentina</span>
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
                onChange={(event) => {
                  setMake(event.target.value)
                  /* El modelo elegido no existe en la marca nueva. */
                  setModel('')
                }}
              />
              <Select
                label="Modelo"
                placeholder={make ? 'Todos' : 'Elegí una marca primero'}
                options={models.map((item) => ({ value: item, label: item }))}
                value={model}
                disabled={!make}
                onChange={(event) => setModel(event.target.value)}
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

        </div>
      </section>

      {/* Fuera de `.page` a propósito: es la única sección que llega a los dos
          bordes de la pantalla, y desde adentro del contenedor con márgenes no
          hay forma de llegar sin sumar una barra de scroll horizontal. */}
      {stats && stats.listings > 0 && <MarketplaceProof stats={stats} />}

      <div className="page home__sections">
        <div className="home__cluster home__cluster--discovery">
          <BrandSlider />
          <CategorySlider counts={bodyCounts} />
          <PopularModels />
        </div>

        <div className="home__cluster home__cluster--listings">
          <VehicleSlider
            eyebrow="Lo último"
            title="Recién publicados"
            vehicles={recent}
            loading={loadingRecent}
            action={{ label: 'Ver todos', to: '/cars' }}
          />
          <VehicleSlider eyebrow="Los que más miran" title="Más vistos" vehicles={mostSeen} />
        </div>

        <ProvinceMap counts={provinceCounts} />
      </div>

      {/* Los tres motivos van acá y no arriba: quien entra a un clasificado
          quiere ver autos, no leer por qué somos distintos. Primero los autos,
          después el argumento, y recién después el resto de las secciones.

          Fuera de `.page` como la banda de números: los paneles llegan a los
          dos bordes. */}
      <Pillars />

      <div className="page home__sections">
        <AudienceSection />
        <HowItWorks />
        <GarageSection />
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
