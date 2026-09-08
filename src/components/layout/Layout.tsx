import { useEffect, useRef, useState } from 'react'
import { Outlet, useLocation } from 'react-router-dom'
import { ErrorBoundary } from './ErrorBoundary'
import { Footer } from './Footer'
import { Navbar } from './Navbar'

export function Layout() {
  const sentinel = useRef<HTMLDivElement>(null)
  const location = useLocation()

  /* Se arranca leyendo la posición real: si alguien recarga a mitad de página,
     la navbar tiene que nacer sólida y no transparente sobre contenido blanco. */
  const [atTop, setAtTop] = useState(() => window.scrollY < 24)

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
    <>
      <a className="skip-link" href="#contenido">
        Saltar al contenido
      </a>
      <div className="nav-sentinel" ref={sentinel} aria-hidden="true" />
      <Navbar atTop={atTop} />
      {/* El boundary abraza sólo el contenido: si una pantalla se rompe, la
          navbar y el pie siguen ahí y se puede navegar a otro lado en vez de
          quedar en una pantalla en blanco. La `key` es la ruta porque, sin
          eso, una vez roto el cartel de error no se iría nunca más. */}
      <main className="main" id="contenido">
        <ErrorBoundary key={location.pathname}>
          <Outlet />
        </ErrorBoundary>
      </main>
      <Footer />
    </>
  )
}
