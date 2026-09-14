import { defineConfig } from 'vitest/config'

/**
 * Los tests contra Supabase local. Aparte de `vitest.config.ts` porque
 * necesitan la base levantada: se corren con `npm run test:db`, no con
 * `npm test`, que tiene que andar siempre y en un segundo.
 */
export default defineConfig({
  test: {
    include: ['db-tests/**/*.test.ts'],
    environment: 'node',
    /* Cada caso crea usuarios y avisos por HTTP: más lento que un test puro. */
    testTimeout: 30_000,
    /* En serie: todos pegan contra la misma base, y en paralelo el tope diario
       de contactos o las cantidades se pisan entre archivos. */
    fileParallelism: false,
  },
})
