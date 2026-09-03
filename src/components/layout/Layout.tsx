import { useEffect, useRef, useState } from 'react'
import { Outlet } from 'react-router-dom'
import { Footer } from './Footer'
import { Navbar } from './Navbar'

export function Layout() {
  const sentinel = useRef<HTMLDivElement>(null)

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
      <main className="main" id="contenido">
        <Outlet />
      </main>
      <Footer />
    </>
  )
}
