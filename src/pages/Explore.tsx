import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { BrandSlider } from '../components/home/BrandSlider'
import { BudgetSlider } from '../components/home/BudgetSlider'
import { CategorySlider } from '../components/home/CategorySlider'
import { DealerSlider } from '../components/home/DealerSlider'
import { PopularModels } from '../components/home/PopularModels'
import { ProvinceMap } from '../components/home/ProvinceMap'
import { Button } from '../components/ui/Button'
import { BRAND, pageTitle } from '../config/brand'
import { useDarkHero } from '../hooks/useDarkHero'
import { useDocumentMeta } from '../hooks/useDocumentMeta'
import { countsBy, listDealers } from '../lib/api'
import { reportError } from '../lib/report'
import type { Seller } from '../types'
import './Explore.css'

/**
 * Todas las formas de entrar al listado, juntas.
 *
 * Estas secciones vivían en la portada, una abajo de la otra: marca, modelo,
 * carrocería, presupuesto, provincia y concesionarias. Eran seis maneras de
 * llegar al mismo lugar y hacían de la portada quince pantallas de alto, con
 * cada fila medio vacía mientras haya pocos avisos.
 *
 * Acá tienen sentido juntas, porque son lo único que hay: quien entra ya sabe
 * que vino a mirar. La portada se queda con una sola ---las carrocerías, que
 * son las que tienen foto--- y manda para acá.
 *
 * Las que dependen de datos se piden acá y no en cada componente: así la
 * pantalla hace dos consultas en total y no una por sección.
 */
export function Explore() {
  const [bodyCounts, setBodyCounts] = useState<Record<string, number>>({})
  const [provinceCounts, setProvinceCounts] = useState<Record<string, number>>({})
  const [dealers, setDealers] = useState<Seller[]>([])

  /* La cabecera arranca en tinta y la navbar tiene que flotar en blanco
     encima: lo declara la pantalla, no la barra mirando la ruta. */
  useDarkHero()

  useDocumentMeta({
    title: pageTitle('Explorar'),
    description: `Buscá autos por marca, modelo, carrocería, presupuesto o provincia en ${BRAND}.`,
  })

  useEffect(() => {
    let current = true

    void Promise.allSettled([countsBy('body_type'), countsBy('province'), listDealers(8)]).then(
      ([bodies, provinces, dealerList]) => {
        if (!current) return
        /* Si una falla, su sección queda en cero y las otras andan igual. */
        if (bodies.status === 'fulfilled') setBodyCounts(bodies.value)
        else reportError('countsBy body_type', bodies.reason)
        if (provinces.status === 'fulfilled') setProvinceCounts(provinces.value)
        if (dealerList.status === 'fulfilled') setDealers(dealerList.value)
      },
    )

    return () => {
      current = false
    }
  }, [])

  return (
    <>
      <section className="explore__head hero-bleed">
        <div className="page explore__head-inner">
          <span className="over over--invert">Explorar</span>
          <h1 className="explore__title">Todas las formas de buscar.</h1>
          <p className="explore__lead">
            Por marca, por modelo, por tipo de auto, por lo que tenés para gastar o por dónde
            estás. Todas llevan al mismo listado, con los filtros ya puestos.
          </p>
          <Link to="/autos">
            <Button variant="yellow">Ver todos los autos</Button>
          </Link>
        </div>
      </section>

      <div className="page explore__body">
        <CategorySlider counts={bodyCounts} />
        <BrandSlider />
        <PopularModels />
        <BudgetSlider />
        <ProvinceMap counts={provinceCounts} />
        <DealerSlider dealers={dealers} />
      </div>
    </>
  )
}
