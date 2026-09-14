import { defineConfig } from 'vitest/config'

/**
 * Config aparte de `vite.config.ts` a propósito.
 *
 * Lo que se prueba acá es lógica pura: no toca el DOM, ni React, ni Supabase.
 * Cargarle los plugins de la aplicación —React, el de imágenes— sería pedirle
 * a cada corrida que levante un pipeline que los tests no usan.
 */
export default defineConfig({
  test: {
    include: ['src/**/*.test.ts', 'worker/**/*.test.ts'],
    environment: 'node',
  },
})
