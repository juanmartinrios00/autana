/**
 * Datos públicos del proyecto de Supabase.
 *
 * Estos dos valores NO son secretos. La URL identifica el proyecto y la anon
 * key es la credencial anónima: está diseñada para viajar dentro del
 * JavaScript que descarga cualquiera que abra el sitio. Lo que protege la base
 * no es esconderla, son las políticas de RLS, que están activas en las seis
 * tablas.
 *
 * Por eso viven en el repo: así el sitio se despliega en cualquier lado sin
 * configurar nada. Las variables de entorno siguen teniendo prioridad, para el
 * día que haya un proyecto de prueba separado.
 *
 * ⚠️ Acá NUNCA va la `service_role` key ni la contraseña de la base. Esas sí
 * son secretos: saltean el RLS y dan acceso total.
 */
export const SUPABASE_PUBLIC = {
  url: 'https://dvthpxgpayocxvmzpqrb.supabase.co',
  anonKey:
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImR2dGhweGdwYXlvY3h2bXpwcXJiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODgwMDg4MjcsImV4cCI6MjEwMzU4NDgyN30.Cy4KBxV61K5eb68J1ETzUxY2dvMxTIFgqcy_qgQcppo',
} as const
