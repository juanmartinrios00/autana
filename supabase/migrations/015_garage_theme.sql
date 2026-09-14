-- ============================================================================
-- El color de la cabecera del garage
--
-- Pegalo en Supabase → SQL Editor → Run. Es idempotente.
--
-- Cada uno elige el fondo de la cabecera de su garage entre una paleta cerrada.
-- Cerrada a propósito, y no un selector de color libre: la cabecera lleva texto
-- blanco, los dibujos en blanco y el botón amarillo encima. Con un color libre
-- alguien elige un amarillo claro y su nombre deja de leerse, o el botón de
-- seguir desaparece contra el fondo. Todos los de la lista son oscuros y se
-- probaron con lo que va arriba.
--
-- La lista vive en dos lugares que tienen que coincidir: el `check` de acá, y
-- `GARAGE_THEMES` en `src/lib/garage-theme.ts`, que tiene los colores. Si se
-- agrega uno, van los dos.
--
-- Imagen de fondo no, por ahora: pide subirla y comprimirla, oscurecerla para
-- que el texto se lea sobre cualquier foto, y es una imagen pública más para
-- moderar. Se puede sumar encima de esto sin rehacerlo.
-- ============================================================================

alter table public.profiles
  add column if not exists garage_theme text not null default 'ink';

alter table public.profiles drop constraint if exists profiles_garage_theme_known;
alter table public.profiles add constraint profiles_garage_theme_known
  check (garage_theme in ('ink', 'night', 'racing', 'bordo', 'leather', 'graphite'));

-- Legible para cualquiera, como el resto de lo que se ve en el garage. Se
-- repite la lista entera de columnas por lo mismo que en la 011: `grant` es
-- acumulativo y así el estado queda explícito en un solo lugar.
grant select (
  id, name, avatar_url, seller_type, city, province, verified, created_at,
  discoverable, instagram, garage_theme
) on public.profiles to anon, authenticated;
