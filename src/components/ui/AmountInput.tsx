import { useLayoutEffect, useRef, useState, type ComponentProps } from 'react'
import { conPuntos, soloDigitos } from '../../lib/format'
import { Input } from './Input'

interface AmountInputProps
  extends Omit<ComponentProps<typeof Input>, 'value' | 'onChange' | 'type' | 'inputMode' | 'ref'> {
  /** Sólo dígitos: "18500000". */
  value: string
  onValueChange: (digitos: string) => void
  /** Con `false` no pone los puntos: un año se escribe "2018", no "2.018". */
  agrupar?: boolean
}

/** Cuántos dígitos hay antes de la posición `hasta` del texto. */
function digitosAntes(texto: string, hasta: number) {
  return texto.slice(0, hasta).replace(/\D/g, '').length
}

/**
 * Un campo para precios y kilómetros que se escriben como acá: con puntos.
 *
 * Era un `type="number"`, y ese campo no sabe de miles con punto: con
 * "18.500.000" Chromium deja 18,5 y el formulario contesta "Falta el precio" o
 * "Poné un precio realista" a alguien que escribió bien. Con "58.400" km es
 * peor, porque pasa la validación como 58,4 y la base, que guarda enteros,
 * rechaza el aviso entero con un error que no dice por qué.
 *
 * Ahora acepta lo que se escriba, guarda sólo los dígitos y muestra los puntos
 * mientras se tipea. Eso último no es adorno: entre 1.850.000 y 18.500.000 hay
 * un cero, y con los puntos a la vista se nota antes de publicar.
 *
 * Reformatear corre el cursor al final, así que se lo vuelve a poner después
 * del mismo dígito en el que estaba: si no, corregir un número del medio es
 * imposible.
 *
 * Lo escrito vive en el campo y no en `value`. En el buscador `value` sale de
 * la URL, y React Router la actualiza en una transición: hasta que llega, el
 * campo controlado vuelve al valor viejo y la tecla siguiente se escribe
 * encima de él. Tipeando "120000" a 50 ms por tecla ---una persona rápida en
 * una computadora--- quedaba "20.000". Así que el campo anota lo que mandó, y
 * de `value` sólo adopta lo que no mandó él: el "Limpiar" o la × de un chip.
 */
export function AmountInput({ value, onValueChange, agrupar = true, ...rest }: AmountInputProps) {
  const ref = useRef<HTMLInputElement>(null)
  /* Después de cuántos dígitos tiene que quedar el cursor en el próximo render. */
  const cursor = useRef<number | null>(null)

  const [local, setLocal] = useState(value)
  const [enviados, setEnviados] = useState<string[]>([])
  /* Se mira cuándo `value` cambia, no cuándo difiere de lo escrito: mientras
     la URL no llega, sigue trayendo el valor de antes de la tecla, y adoptarlo
     sería perder justo lo que se acaba de escribir. */
  const [anterior, setAnterior] = useState(value)
  if (value !== anterior) {
    setAnterior(value)
    /* Si lo mandó el campo, llegó hasta ahí: lo anterior ya no va a venir. */
    const hasta = enviados.indexOf(value)
    if (hasta === -1) {
      setLocal(value)
      setEnviados([])
    } else {
      setEnviados(enviados.slice(hasta + 1))
    }
  }

  const shown = agrupar ? conPuntos(local) : local

  useLayoutEffect(() => {
    const input = ref.current
    const wanted = cursor.current
    cursor.current = null
    if (!input || wanted === null || document.activeElement !== input) return
    let pos = 0
    for (let seen = 0; pos < input.value.length && seen < wanted; pos += 1) {
      if (/\d/.test(input.value[pos])) seen += 1
    }
    input.setSelectionRange(pos, pos)
  })

  return (
    <Input
      {...rest}
      ref={ref}
      type="text"
      inputMode="numeric"
      autoComplete="off"
      value={shown}
      onChange={(event) => {
        const raw = event.target.value
        const at = event.target.selectionStart ?? raw.length
        let next = soloDigitos(raw)
        let before = Math.min(digitosAntes(raw, at), next.length)

        /* Borrar un punto no cambia ningún dígito, y el formato lo volvería a
           poner: la tecla parecería no andar. Se borra el dígito de antes, que
           es lo que uno quiso. */
        if (next === local && raw.length < shown.length && before > 0) {
          next = next.slice(0, before - 1) + next.slice(before)
          before -= 1
        }

        cursor.current = before
        setLocal(next)
        setEnviados((prev) => [...prev, next])
        onValueChange(next)
      }}
    />
  )
}
