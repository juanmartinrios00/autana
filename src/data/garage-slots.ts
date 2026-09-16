import type { GarageSlot } from '../types'

/**
 * Los cuatro espacios del garage, con el texto que los presenta.
 *
 * Vive en `data` y no en `lib/garage` porque lo necesitan dos mundos que no se
 * pueden tocar entre sí. `lib/garage` importa Supabase para leer y escribir, y
 * `lib/levels` ---que calcula el nivel y es una función pura de datos--- tiene
 * que saber cuántos espacios hay para el logro de garage completo. Con la
 * lista adentro de `lib/garage`, calcular un nivel arrastraba el cliente de la
 * base; con el número escrito a mano en `levels`, agregar un quinto espacio
 * dejaba el logro ganándose con cuatro de cinco y nadie se enteraba.
 *
 * Los ids los valida además un `check` en la migración 002. Son tres
 * definiciones de la misma lista ---esta, el tipo `GarageSlot` y el check--- y
 * hay un test que las ata.
 */
export const SLOTS: { id: GarageSlot; title: string; hint: string }[] = [
  { id: 'first', title: 'Mi primer auto', hint: 'Con el que aprendiste a manejar.' },
  { id: 'current', title: 'El que tengo hoy', hint: 'Tu auto actual.' },
  { id: 'dream', title: 'El auto de mis sueños', hint: 'Ese que algún día.' },
  { id: 'missed', title: 'El que más extraño', hint: 'El que no tendrías que haber vendido.' },
]
