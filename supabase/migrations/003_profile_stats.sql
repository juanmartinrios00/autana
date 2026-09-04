-- ============================================================================
-- Vista con los datos crudos que alimentan el nivel de cada vendedor.
--
-- Pegalo en Supabase → SQL Editor → Run. Es idempotente.
--
-- La vista devuelve NÚMEROS, no el nivel. Las reglas —qué logro se gana con
-- qué, y cuántos logros hacen falta para cada nivel— viven en un solo lugar,
-- `src/lib/levels.ts`. Si las duplicara acá en SQL, tarde o temprano las dos
-- copias se irían separando y el nivel diría una cosa en la card y otra en el
-- perfil.
--
-- Sirve para no hacer una consulta por vendedor al pintar la grilla: se piden
-- de una todos los que aparecen en la página.
-- ============================================================================

create or replace view public.profile_stats
with (security_invoker = on)
as
select
  p.id                             as user_id,
  p.name,
  p.whatsapp,
  p.city,
  coalesce(l.active_listings, 0)   as active_listings,
  -- Fotos de la publicación que más tiene, para el logro de aviso completo.
  coalesce(l.best_photos, 0)       as best_photos,
  coalesce(g.garage_cars, 0)       as garage_cars
from public.profiles p

left join (
  select
    li.seller_id,
    count(*)      as active_listings,
    max(img.n)    as best_photos
  from public.listings li
  left join lateral (
    select count(*) as n
    from public.listing_images
    where listing_id = li.id
  ) img on true
  where li.status = 'active'
  group by li.seller_id
) l on l.seller_id = p.id

left join (
  select user_id, count(*) as garage_cars
  from public.garage_entries
  group by user_id
) g on g.user_id = p.id;

-- `security_invoker` hace que la vista respete las políticas de quien la
-- consulta en vez de las del dueño. Todas las tablas que toca ya son de
-- lectura pública, pero dejarlo explícito evita que la vista se convierta en
-- una puerta de atrás si alguna política se endurece más adelante.

grant select on public.profile_stats to anon, authenticated;
