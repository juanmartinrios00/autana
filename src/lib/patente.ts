/**
 * La "patente" de un perfil: tres pares con forma de patente Mercosur
 * ---`AB 123 CD`--- sacados del id de la cuenta.
 *
 * Es un adorno de la cédula del perfil, no un identificador: no se busca por
 * ella ni se guarda en ningún lado. Lo que importa es que sea siempre la misma
 * para la misma cuenta (sale del uuid, no del azar) y que no se parezca a una
 * patente real de nadie más de lo que se parece cualquier combinación.
 *
 * Sin I, O, Q ni Ñ, como las patentes de verdad: se confunden con 1, 0 y N.
 */
const LETRAS = 'ABCDEFGHJKLMNPRSTUVWXYZ'

export function patente(id: string): string {
  const hex = id.replace(/[^0-9a-fA-F]/g, '').padEnd(12, '0')
  const letra = (at: number) => LETRAS[parseInt(hex.slice(at, at + 2), 16) % LETRAS.length]
  const numero = String(parseInt(hex.slice(4, 8), 16) % 1000).padStart(3, '0')
  return `${letra(0)}${letra(2)} ${numero} ${letra(8)}${letra(10)}`
}
