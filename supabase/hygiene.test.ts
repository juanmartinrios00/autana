import { readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

/**
 * Revisiones sobre el SQL como texto. No levanta ninguna base: eso es
 * `npm run test:db`, que necesita Docker. Esto corre siempre, con el resto.
 *
 * Acá se prueba lo que no se ve leyendo una migración sola, porque es una regla
 * que vale para todas y que se rompe por omisión: nadie escribe algo mal, se
 * olvida de escribir algo.
 */

const dir = join(import.meta.dirname, '.')

/* Sin los comentarios. Estos archivos explican más de lo que ejecutan ---la 017
   arranca con treinta líneas contando qué agujero cierra--- y adentro de esas
   explicaciones hay SQL de ejemplo. Sin sacarlos, el `create index` que la 011
   muestra comentado como sugerencia cuenta como si estuviera declarado. */
const stripComments = (sql: string) => sql.replace(/^\s*--.*$/gm, '')

const read = (name: string, path: string) => ({
  name,
  sql: stripComments(readFileSync(path, 'utf-8')),
})

const files = [
  read('schema.sql', join(dir, 'schema.sql')),
  ...readdirSync(join(dir, 'migrations'))
    .filter((name) => name.endsWith('.sql'))
    .sort()
    .map((name) => read(name, join(dir, 'migrations', name))),
]

/** Cada `create function` con su nombre, lo que devuelve y su cuerpo de opciones. */
function declarations(sql: string) {
  const pattern = /create\s+(?:or\s+replace\s+)?function\s+(public\.\w+)\s*\(([^)]*)\)([\s\S]*?)\bas\s+\$\$/gi
  return [...sql.matchAll(pattern)].map((m) => ({
    name: m[1]!,
    args: m[2]!,
    options: m[3]!,
    returnsTrigger: /returns\s+trigger/i.test(m[3]!),
    definer: /security\s+definer/i.test(m[3]!),
  }))
}

const all = files.flatMap((file) => declarations(file.sql).map((fn) => ({ ...fn, file: file.name })))
const revoked = new Set(
  files.flatMap((file) => [
    ...file.sql.matchAll(/revoke\s+all\s+on\s+function\s+(public\.\w+)/gi),
  ].map((m) => m[1]!)),
)

describe('las funciones security definer', () => {
  /**
   * Una función `security definer` corre con los permisos de su dueño, así que
   * saltea el RLS y los permisos por columna. Esa es la razón de existir de
   * todas las que hay acá: leer o escribir algo que el que llama no puede.
   *
   * Postgres, por defecto, le deja ejecutar cualquier función a `public`. Y
   * PostgREST expone como endpoint RPC toda función que pueda ejecutar quien
   * pide. O sea que una función `security definer` sin `revoke` es una puerta
   * abierta con la forma exacta del agujero que esa función fue creada para
   * abrir de manera controlada.
   *
   * Las de trigger no cuentan: devuelven `trigger`, PostgREST no las expone, y
   * llamarlas fuera de un trigger falla.
   */
  it('todas las invocables tienen su revoke', () => {
    const sinRevoke = all
      .filter((fn) => fn.definer && !fn.returnsTrigger && !revoked.has(fn.name))
      .map((fn) => `${fn.name} (${fn.file})`)

    expect(sinRevoke).toEqual([])
  })

  /* Sin `search_path` fijo, quien llama puede anteponer un esquema propio y
     hacer que las referencias sin calificar de adentro apunten a sus tablas.
     En una función que corre con los permisos del dueño, eso es escalar
     privilegios. */
  it('todas fijan el search_path', () => {
    const sinPath = all
      .filter((fn) => fn.definer && !/set\s+search_path/i.test(fn.options))
      .map((fn) => `${fn.name} (${fn.file})`)

    expect(sinPath).toEqual([])
  })

  it('se encontraron funciones: el parser no está mirando al vacío', () => {
    expect(all.filter((fn) => fn.definer).length).toBeGreaterThan(15)
  })
})

describe('las migraciones', () => {
  /* El orden lo da el nombre, así que un número repetido deja el orden de
     aplicación librado a cómo ordene el sistema de archivos. */
  it('no tienen números repetidos', () => {
    const numbers = readdirSync(join(dir, 'migrations'))
      .filter((name) => name.endsWith('.sql'))
      .map((name) => name.slice(0, 3))
    expect(new Set(numbers).size).toBe(numbers.length)
  })

  /* El README promete que se pegan en el SQL Editor y que son idempotentes.
     Un `create function` sin `or replace`, o un `create table` sin `if not
     exists`, falla en la segunda corrida y deja la migración a medias. */
  it('son idempotentes', () => {
    const problemas: string[] = []
    for (const file of files) {
      for (const m of file.sql.matchAll(/create\s+(function|table|policy|index|view)\s+(?!if not exists)(\S+)/gi)) {
        const kind = m[1]!.toLowerCase()
        const before = file.sql.slice(Math.max(0, m.index! - 60), m.index!)
        if (kind === 'function' && /or\s+replace\s*$/i.test(before)) continue
        if (kind === 'policy' || kind === 'view') continue /* llevan `drop ... if exists` antes */
        if (/if\s+not\s+exists/i.test(file.sql.slice(m.index!, m.index! + 80))) continue
        problemas.push(`${file.name}: create ${kind} ${m[2]}`)
      }
    }
    expect(problemas).toEqual([])
  })
})
