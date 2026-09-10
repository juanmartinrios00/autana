import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Button } from '../components/ui/Button'
import { Icon } from '../components/ui/Icon'
import { useAuth } from '../hooks/useAuth'
import { useDocumentMeta } from '../hooks/useDocumentMeta'
import { getStats, type MarketplaceStats } from '../lib/api'
import './Dealers.css'

/**
 * Para concesionarias.
 *
 * Todo lo que promete acá existe y se puede verificar en el código: el tope de
 * 25 publicaciones sale de `005_listing_limits.sql`, el filtro por tipo de
 * vendedor de `FilterPanel`, el slider de la home de `listDealers`, y el sello
 * de verificada de `profiles.verified`.
 *
 * Lo que NO dice, por la misma razón: nada de "miles de compradores" ni de
 * posiciones destacadas. El marketplace recién arranca y una concesionaria que
 * llega por una promesa inflada se va la misma semana.
 */

const PUNTOS = [
  {
    icon: 'list' as const,
    title: '25 publicaciones activas',
    text: 'Contra 5 de un particular. Los vendidos no ocupan lugar: marcás uno como vendido y liberás el espacio en el acto.',
  },
  {
    icon: 'search' as const,
    title: 'Filtro propio',
    text: 'Quien busca sólo concesionarias te encuentra. Es un filtro de la búsqueda, no un destacado que se paga.',
  },
  {
    icon: 'car' as const,
    title: 'Lugar en la portada',
    text: 'Las concesionarias con avisos activos salen en la home, ordenadas por cuántos autos tienen publicados.',
  },
  {
    icon: 'check' as const,
    title: 'El sello de verificada',
    text: 'Lo ponemos a mano, de a una, después de confirmar que la agencia existe. Por eso significa algo cuando aparece.',
  },
]

export function Dealers() {
  const { session } = useAuth()
  const [stats, setStats] = useState<MarketplaceStats | null>(null)

  useEffect(() => {
    let current = true
    /* Si falla, la página se muestra sin los números. Son el respaldo del
       argumento, no el argumento. */
    void getStats()
      .then((value) => {
        if (current) setStats(value)
      })
      .catch(() => {})

    return () => {
      current = false
    }
  }, [])

  useDocumentMeta({
    title: 'Para concesionarias | Autana',
    description:
      'Publicá el stock de tu agencia en Autana: 25 publicaciones activas, filtro propio, lugar en la portada y 0% de comisión.',
  })

  return (
    <>
      <section className="dealers__head">
        <div className="page dealers__head-inner">
          <span className="over over--invert">Para concesionarias</span>
          <h1 className="dealers__title">Tu stock, sin comisión y sin intermediarios.</h1>
          <p className="dealers__lead">
            El comprador te escribe directo por WhatsApp. No cobramos por publicar, ni
            por vender, ni por aparecer más arriba — no hay posiciones que se paguen.
          </p>

          <div className="dealers__actions">
            {session ? (
              <Link to="/settings">
                <Button variant="yellow">Cambiar mi perfil a concesionaria</Button>
              </Link>
            ) : (
              <Link to="/login">
                <Button variant="yellow">Crear la cuenta de la agencia</Button>
              </Link>
            )}
            <Link to="/cars?sellerType=dealer" className="dealers__secondary">
              Ver las que ya publican
            </Link>
          </div>
        </div>
      </section>

      <div className="page dealers__body">
        <ul className="dealers__grid">
          {PUNTOS.map((punto) => (
            <li className="dpoint" key={punto.title}>
              <span className="dpoint__icon" aria-hidden="true">
                <Icon name={punto.icon} size={20} />
              </span>
              <h2 className="dpoint__title">{punto.title}</h2>
              <p className="dpoint__text">{punto.text}</p>
            </li>
          ))}
        </ul>

        {/* Los números salen de la base. Si hay tres autos, dice tres: una
            agencia que llega por un número inflado se va la misma semana. */}
        {stats && stats.listings > 0 && (
          <p className="dealers__stats mono">
            Hoy hay {stats.listings} {stats.listings === 1 ? 'auto' : 'autos'} de{' '}
            {stats.makes} {stats.makes === 1 ? 'marca' : 'marcas'} en {stats.provinces}{' '}
            {stats.provinces === 1 ? 'provincia' : 'provincias'}.
          </p>
        )}

        <section className="dealers__how">
          <span className="over">Cómo se hace</span>
          <h2 className="dealers__how-title">Tres pasos, ninguno con nosotros del otro lado</h2>
          <ol className="dsteps">
            <li className="dstep">
              <span className="dstep__n mono">1</span>
              <p>
                Creás la cuenta con el mail de la agencia. Es la misma cuenta que usa
                cualquiera: no hay un registro aparte ni una aprobación que esperar.
              </p>
            </li>
            <li className="dstep">
              <span className="dstep__n mono">2</span>
              <p>
                En <Link to="/settings">Ajustes</Link> elegís <strong>Concesionaria</strong>
                como tipo de vendedor.
                Ahí mismo pasás de 5 a 25 publicaciones activas.
              </p>
            </li>
            <li className="dstep">
              <span className="dstep__n mono">3</span>
              <p>
                Cargás el stock. Con el primer aviso activo ya aparecés en el filtro y en
                la portada.
              </p>
            </li>
          </ol>

          {/* Decirlo acá y no escondido: el sello no se pide desde ninguna
              pantalla, y esa es la razón por la que sirve. */}
          <p className="dealers__note">
            El sello de <strong>Verificada</strong> es el único paso que no es automático:
            lo ponemos a mano después de confirmar que la agencia existe. No hay un botón
            para pedirlo — si lo hubiera, lo apretaría cualquiera y dejaría de querer decir
            algo.
          </p>
        </section>

        <div className="dealers__cta">
          {session ? (
            <Link to="/settings">
              <Button variant="yellow">Ir a mis ajustes</Button>
            </Link>
          ) : (
            <Link to="/login">
              <Button variant="yellow">Empezar</Button>
            </Link>
          )}
        </div>
      </div>
    </>
  )
}
