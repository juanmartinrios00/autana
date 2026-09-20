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
    /* `supabase/` tambien: ahi vive un test que no prueba TypeScript sino el
       SQL, leyendolo como texto. Es logica pura igual ---no levanta ninguna
       base--- y vive al lado de lo que revisa, como el resto. */
    include: ['src/**/*.test.ts', 'worker/**/*.test.ts', 'supabase/**/*.test.ts'],
    environment: 'node',
    /* Sin esto, `import.meta.glob` con `?raw` sobre un `.css` devuelve cadena
       vacia: vitest apaga el procesamiento de CSS por defecto y los deja en
       blanco. Hay un test que lee las hojas de las pantallas como texto para
       encontrar los heros oscuros. */
    css: true,
  },
})
