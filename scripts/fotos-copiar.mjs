/**
 * Copia las fotos que ya existen en Supabase Storage al bucket de R2.
 *
 *   npm run fotos:copiar                     copia todo
 *   npm run fotos:copiar -- --verificar URL  además comprueba cada una en R2
 *
 * Es el paso del medio para prender R2 (ver `src/config/fotos.ts`): el bucket
 * ya tiene que existir, y `FOTOS_URL` se pone recién cuando esto termina sin
 * fallas. Se puede correr las veces que haga falta: pisa lo que ya estaba con
 * el mismo contenido.
 *
 * La clave en R2 es `<bucket>/<ruta en Supabase>`, así la ruta que guarda la
 * base vale igual en los dos lados y no hay que tocar ninguna fila.
 *
 * Lista con la clave pública, que alcanza porque los dos buckets se leen sin
 * sesión, y sube con wrangler, que usa la sesión de Cloudflare de esta máquina.
 */
import { execFileSync } from 'node:child_process'
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

const BUCKET_R2 = 'auteando-fotos'
const BUCKETS = ['listing-photos', 'garage-photos']

const config = readFileSync(new URL('../src/config/supabase-public.ts', import.meta.url), 'utf8')
const SUPABASE = config.match(/url:\s*'([^']+)'/)[1]
const ANON = config.match(/'(eyJ[^']+)'/)[1]

const verificarEn = (() => {
  const i = process.argv.indexOf('--verificar')
  return i === -1 ? null : process.argv[i + 1]?.replace(/\/+$/, '')
})()

async function listar(bucket, prefix = '') {
  const response = await fetch(`${SUPABASE}/storage/v1/object/list/${bucket}`, {
    method: 'POST',
    headers: { apikey: ANON, Authorization: `Bearer ${ANON}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ prefix, limit: 1000, offset: 0 }),
  })
  if (!response.ok) throw new Error(`no se pudo listar ${bucket}/${prefix}: ${response.status}`)
  const archivos = []
  for (const entrada of await response.json()) {
    const ruta = prefix ? `${prefix}/${entrada.name}` : entrada.name
    /* Las carpetas vienen con `id` en null. */
    if (entrada.id === null) archivos.push(...(await listar(bucket, ruta)))
    else archivos.push({ ruta, tipo: entrada.metadata?.mimetype ?? 'image/webp', peso: entrada.metadata?.size })
  }
  return archivos
}

const cacheDe = (bucket) =>
  bucket === 'garage-photos' ? 'public, max-age=3600' : 'public, max-age=31536000, immutable'

const carpeta = mkdtempSync(join(tmpdir(), 'fotos-'))
let copiadas = 0
const fallas = []

try {
  for (const bucket of BUCKETS) {
    const archivos = await listar(bucket)
    console.log(`${bucket}: ${archivos.length} fotos`)

    for (const { ruta, tipo, peso } of archivos) {
      const origen = `${SUPABASE}/storage/v1/object/public/${bucket}/${ruta.split('/').map(encodeURIComponent).join('/')}`
      try {
        const response = await fetch(origen)
        if (!response.ok) throw new Error(`Supabase contestó ${response.status}`)
        const archivo = join(carpeta, 'foto')
        writeFileSync(archivo, Buffer.from(await response.arrayBuffer()))

        execFileSync(
          'npx',
          [
            'wrangler', 'r2', 'object', 'put', `${BUCKET_R2}/${bucket}/${ruta}`,
            '--file', archivo, '--content-type', tipo, '--cache-control', cacheDe(bucket), '--remote',
          ],
          { stdio: 'pipe', shell: true },
        )

        if (verificarEn) {
          const copia = await fetch(`${verificarEn}/${bucket}/${ruta.split('/').map(encodeURIComponent).join('/')}`)
          const bytes = (await copia.arrayBuffer()).byteLength
          if (!copia.ok) throw new Error(`en R2 contesta ${copia.status}`)
          if (peso && bytes !== peso) throw new Error(`en R2 pesa ${bytes} y en Supabase ${peso}`)
        }

        copiadas++
        console.log(`  ✓ ${ruta}`)
      } catch (cause) {
        fallas.push(`${bucket}/${ruta}: ${cause.message.split('\n')[0]}`)
        console.log(`  ✗ ${ruta}`)
      }
    }
  }
} finally {
  rmSync(carpeta, { recursive: true, force: true })
}

console.log(`\n${copiadas} copiadas, ${fallas.length} con falla`)
for (const falla of fallas) console.log(`  ${falla}`)
if (fallas.length > 0) {
  console.log('\nNo prendas FOTOS_URL hasta que esto salga sin fallas.')
  process.exit(1)
}
