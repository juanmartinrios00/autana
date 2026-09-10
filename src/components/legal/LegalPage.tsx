import type { ReactNode } from 'react'
import './LegalPage.css'

/**
 * El armazón de los documentos legales.
 *
 * Lo comparten términos y privacidad porque son la misma forma: un título, una
 * fecha, y secciones numeradas de texto corrido. Tenerlo en un componente evita
 * que las dos páginas se vayan separando de a poco.
 */

interface LegalPageProps {
  eyebrow: string
  title: string
  /** Última actualización, en texto. Se muestra arriba: en un documento legal
   *  la fecha es parte del contenido, no un detalle. */
  updated: string
  intro: ReactNode
  children: ReactNode
}

export function LegalPage({ eyebrow, title, updated, intro, children }: LegalPageProps) {
  return (
    <>
      <section className="legal__head">
        <div className="page legal__head-inner">
          <span className="over over--invert">{eyebrow}</span>
          <h1 className="legal__title">{title}</h1>
          <p className="legal__updated mono">Última actualización: {updated}</p>
        </div>
      </section>

      <div className="page legal__body">
        <div className="legal__intro">{intro}</div>
        <div className="legal__doc">{children}</div>
      </div>
    </>
  )
}

export function LegalSection({ n, title, children }: { n: number; title: string; children: ReactNode }) {
  return (
    <section className="legal__section">
      <h2 className="legal__section-title">
        <span className="legal__n mono">{n}.</span> {title}
      </h2>
      {children}
    </section>
  )
}
