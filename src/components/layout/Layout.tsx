import { Suspense, useEffect, useRef, useState } from 'react'
import { Outlet, useLocation } from 'react-router-dom'
import { DarkHeroContext } from '../../context/dark-hero'
import { useOrphanPhotoCleanup } from '../../hooks/useOrphanPhotoCleanup'
import { CompareBar } from '../compare/CompareBar'
import { ErrorBoundary } from './ErrorBoundary'
import { Footer } from './Footer'
import { Navbar } from './Navbar'

export function Layout() {
  const sentinel = useRef<HTMLDivElement>(null)
  const location = useLocation()
  useOrphanPhotoCleanup()

  /* Se arranca leyendo la posición real: si alguien recarga a mitad de página,
     la navbar tiene que nacer sólida y no transparente sobre contenido blanco. */
  const [atTop, setAtTop] = useState(() => window.scrollY < 24)

  /* Lo declara la pantalla que se esté mostrando, con `useDarkHero`. El
     `setState` es estable, así que el contexto no cambia de identidad y no
     repinta a nadie por existir. */
  const [darkHero, setDarkHero] = useState(false)

  /* Un centinela de 1px cerca del borde superior dice si estamos arriba de
     todo. Es más barato y más fiable que escuchar el scroll: el observador
     avisa sólo cuando cruza, no en cada frame. */
  useEffect(() => {
    const target = sentinel.current
    if (!target) return

    const observer = new IntersectionObserver(([entry]) => setAtTop(entry.isIntersecting))
    observer.observe(target)
    return () => observer.disconnect()
  }, [])

  return (
    <DarkHeroContext.Provider value={setDarkHero}>
      <a className="skip-link" href="#contenido">
        Saltar al contenido
      </a>
      <div className="nav-sentinel" ref={sentinel} aria-hidden="true" />
      {/* Flota sobre el hero sólo si hay hero y todavía no se scrolleó: apenas
          baja, se vuelve sólida en cualquier pantalla. */}
      <Navbar atTop={atTop} overHero={darkHero && atTop} />
      {/* El boundary abraza sólo el contenido: si una pantalla se rompe, la
          navbar y el pie siguen ahí y se puede navegar a otro lado en vez de
          quedar en una pantalla en blanco. La `key` es la ruta porque, sin
          eso, una vez roto el cartel de error no se iría nunca más. */}
      <main className="main" id="contenido">
        <ErrorBoundary key={location.pathname}>
          {/* Las pantallas llegan en su propio chunk, asi que entre el click y
              el primer render hay una descarga. El fallback reserva alto de
              pantalla en vez de mostrar un spinner: sin eso el pie sube hasta
              debajo de la navbar y vuelve a bajar cuando llega el chunk, que
              se ve peor que esperar. */}
          <Suspense fallback={<div className="route-fallback" aria-hidden="true" />}>
            <Outlet />
          </Suspense>
        </ErrorBoundary>
      </main>
      <Footer />
      <CompareBar />
    </DarkHeroContext.Provider>
  )
}
