/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_SUPABASE_URL?: string
  readonly VITE_SUPABASE_ANON_KEY?: string
  /** Sin él no se reporta nada: ver `lib/report.ts`. */
  readonly VITE_SENTRY_DSN?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}

/**
 * Los imports de imagen con `?as=picture`, que resuelve `vite-imagetools`.
 *
 * Se declara acá y no con el `types` del tsconfig porque el paquete no publica
 * un subpath de tipos para el cliente: `vite-imagetools/client` no existe.
 *
 * El patrón no lleva `?` adelante a propósito: la directiva `as=picture` va
 * al final de una query con varios parámetros, así que llega como `&as=picture`.
 *
 * `sources` viene indexado por formato —avif, webp— y cada valor es el srcset
 * ya armado. `img` es el fallback, con las medidas reales de la imagen
 * generada, que sirven para reservar el espacio y evitar el salto al cargar.
 */
declare module '*as=picture' {
  const picture: {
    sources: Record<string, string>
    img: { src: string; w: number; h: number }
  }
  export default picture
}
