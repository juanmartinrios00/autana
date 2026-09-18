import { useContext, useLayoutEffect } from 'react'
import { DarkHeroContext } from '../context/dark-hero'

/**
 * Declara que esta pantalla arranca con un hero oscuro a sangre, y que por lo
 * tanto la navbar tiene que flotar encima ---sin fondo, en blanco--- mientras
 * esté arriba de todo.
 *
 * @param active Si el hero se está dibujando de verdad. Varias de estas
 *   pantallas arrancan con un esqueleto sobre papel blanco mientras cargan el
 *   perfil, y algunas terminan en un cartel de error: en esos dos casos no hay
 *   hero, y una barra transparente ahí deja el logotipo blanco sobre blanco.
 *   Los hooks no se pueden llamar dentro de un `if`, así que la condición entra
 *   por acá.
 *
 * Va en `useLayoutEffect` y no en `useEffect`: con el segundo, la navbar se
 * pinta blanca y se corrige en el frame siguiente, que se ve como un parpadeo
 * justo arriba del hero.
 */
export function useDarkHero(active = true): void {
  const declare = useContext(DarkHeroContext)

  useLayoutEffect(() => {
    if (!active) return
    declare(true)
    return () => declare(false)
  }, [declare, active])
}
