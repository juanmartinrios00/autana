import { useEffect, useState } from 'react'

/**
 * `true` cuando algo lleva demasiado cargando.
 *
 * Sin esto, una pantalla que espera datos muestra esqueletos y nada más. Y
 * cuando la base no contesta, el error tarda unos ocho segundos en aparecer:
 * el cliente de Supabase reintenta cuatro veces, con esperas de uno, dos y
 * cuatro segundos. Son ocho segundos de pantalla muda, que en un celular con
 * mala señal es cuando la gente se va.
 *
 * Esto no acelera nada: avisa. A los cuatro segundos, la mitad de esa espera,
 * la pantalla puede decir que está tardando más de lo normal, que es
 * información y no un adorno.
 */
export function useSlowHint(esperando: boolean, despuesDe = 4000): boolean {
  const [tardo, setTardo] = useState(false)

  useEffect(() => {
    if (!esperando) return

    const id = window.setTimeout(() => setTardo(true), despuesDe)
    return () => {
      window.clearTimeout(id)
      /* En la limpieza y no en el cuerpo del efecto: apagarlo arriba sería un
         cambio de estado que dispara otro render por cada vez que la pantalla
         deja de esperar, y es justo lo que la regla del linter evita. */
      setTardo(false)
    }
  }, [esperando, despuesDe])

  /* Mientras no se esté esperando nada, no hay nada que avisar: así el valor
     nunca queda prendido de una espera anterior. */
  return esperando && tardo
}
