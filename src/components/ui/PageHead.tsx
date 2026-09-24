import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { Icon } from './Icon'
import './PageHead.css'

interface PageHeadProps {
  /**
   * `ink` para los lugares del sitio ---Explorar, el garage, la ayuda, lo que
   * se viene a leer o a recorrer---; `paper` para las herramientas de cada uno:
   * favoritos, comparar, sus avisos, sus novedades.
   *
   * La regla es esa y no el gusto de cada pantalla. Hasta acá había tres
   * encabezados: negro, banda gris y título suelto sobre el papel, repartidos
   * sin criterio, con el título a tres tamaños distintos y el rótulo en mono a
   * veces sí y a veces no. Ahora el tono dice qué clase de página es.
   */
  tone?: 'ink' | 'paper'
  /** El rótulo en mono de arriba: dónde se está. */
  kicker: ReactNode
  title: ReactNode
  lead?: ReactNode
  /** Un "volver" arriba del rótulo, para las pantallas que cuelgan de otra. */
  back?: { to: string; label: string }
  /** Botones: a la derecha en escritorio, abajo en el celular. */
  actions?: ReactNode
  /** Lo que va abajo del texto: un buscador, un botón grande. */
  children?: ReactNode
  /** El dibujo de la derecha. Se esconde en pantallas angostas. */
  aside?: ReactNode
  className?: string
}

export function PageHead({
  tone = 'ink',
  kicker,
  title,
  lead,
  back,
  actions,
  children,
  aside,
  className,
}: PageHeadProps) {
  const classes = ['pagehead', `pagehead--${tone}`, tone === 'ink' ? 'hero-bleed' : '', className]
    .filter(Boolean)
    .join(' ')

  return (
    <section className={classes}>
      <div className={aside ? 'page pagehead__inner pagehead__inner--aside' : 'page pagehead__inner'}>
        <div className="pagehead__text">
          {back && (
            <Link to={back.to} className="pagehead__back">
              <Icon name="arrowLeft" size={15} />
              {back.label}
            </Link>
          )}
          <span className={tone === 'ink' ? 'over over--invert' : 'over'}>{kicker}</span>
          <h1 className="pagehead__title">{title}</h1>
          {lead && <p className="pagehead__lead">{lead}</p>}
          {children && <div className="pagehead__more">{children}</div>}
        </div>
        {actions && <div className="pagehead__actions">{actions}</div>}
        {aside && (
          <div className="pagehead__aside" aria-hidden="true">
            {aside}
          </div>
        )}
      </div>
    </section>
  )
}
