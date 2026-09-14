import react from '@vitejs/plugin-react'
import { imagetools } from 'vite-imagetools'
import { defineConfig } from 'vite'

/**
 * Las fotos se achican en el build, no a mano.
 *
 * Lo hecho a mano se pierde en el primer reemplazo: alguien arrastra el JPG
 * que salió de la cámara, se ve bien en pantalla, y la home vuelve a pesar
 * cuatro megas sin que nadie se entere hasta que alguien la abre con datos.
 * Ya pasó dos veces —está anotado arriba de `components/garage/scenes.tsx`—
 * así que esta vez lo hace el build.
 *
 * `defaultDirectives` es la parte que importa: cualquier import de un JPG o un
 * PNG, lleve query o no, sale redimensionado. Un archivo nuevo entra acotado
 * aunque quien lo suba no sepa que este archivo existe.
 *
 * El techo es 1600px de lado. Las fotos más grandes de la home se pintan a
 * 400px de alto, así que 1600 ya cubre una pantalla Retina al doble y sobra.
 */
export default defineConfig({
  plugins: [
    imagetools({
      defaultDirectives: (url) => {
        /* El mapa de provincias queda afuera: `ProvinceMap` lee sus píxeles
           uno por uno para saber qué región es cuál, y las semillas de cada
           provincia son coordenadas absolutas. Redimensionarlo las deja
           apuntando a cualquier lado. */
        if (url.pathname.endsWith('argentina-provinces.png')) return new URLSearchParams()

        /* Ya trae directivas propias: manda el import. */
        if (url.searchParams.size > 0) return url.searchParams

        /* Se acotan los dos lados, no sólo el ancho: con `w` a secas una foto
           vertical sale de 1600 de ancho por 2500 de alto y sigue pesando.
           `inside` mete la imagen dentro del cuadrado sin recortar ni
           deformar — el encuadre lo decide el CSS, que en esta pantalla
           cambia de forma entre escritorio y teléfono. */
        return new URLSearchParams({
          w: '1600',
          h: '1600',
          fit: 'inside',
          withoutEnlargement: 'true',
        })
      },
    }),
    react(),
  ],
})
