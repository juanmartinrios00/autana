/**
 * Corre los tests contra una base de Supabase local, desde cero.
 *
 *   npm run test:db                  todas las migraciones
 *   npm run test:db -- --upto 016    sólo hasta la 016 (reproducir un bug ya arreglado)
 *   npm run test:db -- --stop        apaga la base local al terminar
 *
 * Necesita Docker prendido. La primera vez baja las imágenes de Supabase.
 *
 * Qué hace:
 *   1. Arma `node_modules/.cache/db-local/supabase/migrations` con `schema.sql`
 *      primero y después las migraciones numeradas. El CLI de Supabase exige
 *      que se llamen `<timestamp>_nombre.sql`; las del repo son `001_…`, así que
 *      se copian con un prefijo que respeta el orden. Nada de esto toca la
 *      carpeta `supabase/` del repo.
 *   2. Levanta sólo lo que los tests usan: la base, auth, la API y storage. Sin
 *      panel, realtime ni analytics, que en una máquina de 8 GB se notan.
 *   3. `db reset`: base vacía y todas las migraciones aplicadas de nuevo. Cada
 *      corrida arranca igual, y así una migración que sólo anda sobre datos
 *      viejos se descubre acá y no en producción.
 *   4. Corre `vitest` con las claves locales en variables de entorno.
 */
import { spawnSync } from 'node:child_process'
import { copyFileSync, existsSync, mkdirSync, readdirSync, rmSync } from 'node:fs'
import { join } from 'node:path'

const root = process.cwd()
const work = join(root, 'node_modules', '.cache', 'db-local')
const migrationsOut = join(work, 'supabase', 'migrations')

const args = process.argv.slice(2)
const uptoIndex = args.indexOf('--upto')
const upto = uptoIndex === -1 ? null : Number(args[uptoIndex + 1])
const stopAfter = args.includes('--stop')

const EXCLUDED = 'realtime,imgproxy,mailpit,postgres-meta,studio,edge-runtime,logflare,vector,supavisor'

function supabase(command, { quiet = false } = {}) {
  const result = spawnSync(`npx supabase ${command}`, {
    cwd: work,
    shell: true,
    encoding: 'utf8',
    stdio: quiet ? 'pipe' : 'inherit',
  })
  return result
}

/* 1. La carpeta de trabajo ------------------------------------------------- */

mkdirSync(work, { recursive: true })
if (!existsSync(join(work, 'supabase', 'config.toml'))) {
  console.log('› preparando Supabase local')
  supabase('init --force')
}

rmSync(migrationsOut, { recursive: true, force: true })
mkdirSync(migrationsOut, { recursive: true })

copyFileSync(join(root, 'supabase', 'schema.sql'), join(migrationsOut, '20000101000000_schema.sql'))

const migrations = readdirSync(join(root, 'supabase', 'migrations'))
  .filter((name) => /^\d{3}_.+\.sql$/.test(name))
  .sort()
  .filter((name) => upto === null || Number(name.slice(0, 3)) <= upto)

for (const name of migrations) {
  const number = name.slice(0, 3)
  copyFileSync(
    join(root, 'supabase', 'migrations', name),
    join(migrationsOut, `20000101000${number}_${name.slice(4)}`),
  )
}
console.log(`› ${migrations.length} migraciones${upto === null ? '' : ` (hasta la ${upto})`}`)

/* 2. Levantar -------------------------------------------------------------- */

if (supabase('status', { quiet: true }).status !== 0) {
  console.log('› levantando la base local (la primera vez tarda)')
  const started = supabase(`start -x ${EXCLUDED}`)
  if (started.status !== 0) {
    console.error('No se pudo levantar Supabase local. ¿Está Docker prendido?')
    process.exit(1)
  }
}

/* 3. Desde cero ------------------------------------------------------------ */

console.log('› aplicando schema y migraciones desde cero')
const reset = supabase('db reset')
if (reset.status !== 0) {
  console.error('Falló aplicar las migraciones: el error está arriba.')
  process.exit(1)
}

/* 4. Tests ----------------------------------------------------------------- */

const status = supabase('status -o env', { quiet: true })
const env = Object.fromEntries(
  status.stdout
    .split(/\r?\n/)
    .map((line) => line.match(/^([A-Z_]+)="?(.*?)"?$/))
    .filter(Boolean)
    .map((match) => [match[1], match[2]]),
)

const testEnv = {
  ...process.env,
  DB_TEST_URL: env.API_URL,
  DB_TEST_ANON_KEY: env.ANON_KEY ?? env.PUBLISHABLE_KEY,
  DB_TEST_SERVICE_KEY: env.SERVICE_ROLE_KEY ?? env.SECRET_KEY,
}

if (!testEnv.DB_TEST_URL || !testEnv.DB_TEST_ANON_KEY || !testEnv.DB_TEST_SERVICE_KEY) {
  console.error('No se pudieron leer las claves de la base local:\n' + status.stdout)
  process.exit(1)
}

const tests = spawnSync('npx vitest run -c vitest.db.config.ts', {
  cwd: root,
  shell: true,
  stdio: 'inherit',
  env: testEnv,
})

if (stopAfter) supabase('stop')
process.exit(tests.status ?? 1)
