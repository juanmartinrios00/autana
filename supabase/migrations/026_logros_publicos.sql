-- ============================================================================
-- Los logros ganados de una persona, para mostrarlos en su garage
--
-- Pegar en el SQL Editor de Supabase. Es idempotente.
--
-- Por qué en la base y no en el navegador
--
-- Dos de los siete logros no se pueden calcular desde afuera, y son justo los
-- que más le importan al dueño:
--
--   · "Perfil completo" mira el WhatsApp, que desde la 008 no se puede leer.
--   · "Primera venta" mira los avisos vendidos, que sólo ve su dueño: para
--     cualquier otro, `profile_stats` cuenta como si no existieran (022).
--
-- Calculado en el navegador, el propio garage mostraría al visitante cinco de
-- siete medallas y las otras dos apagadas para siempre. Esta función corre con
-- los permisos de su dueño, mira todo, y devuelve sólo la lista de los que
-- ganó: ni el número, ni el WhatsApp, ni cuántos vendió.
--
-- Lo que se puede aprender llamándola: que alguien vendió al menos un auto y
-- que tiene el perfil completo. Las dos son cosas que esa persona eligió
-- mostrar al publicar, y ninguna dice cuántos ni cuáles.
--
-- Los umbrales están escritos también en `src/lib/levels.ts`, que es lo que
-- dibuja la pantalla de niveles. Un test lee este archivo y compara las dos
-- listas, igual que el de la 022.
-- ============================================================================

create or replace function public.profile_badges(target uuid)
returns text[]
language sql
stable
security definer
set search_path = public
as $$
  with datos as (
    select
      p.name,
      p.city,
      p.whatsapp,
      coalesce(l.active_listings, 0)    as active_listings,
      coalesce(l.published_listings, 0) as published_listings,
      coalesce(l.sold_listings, 0)      as sold_listings,
      coalesce(l.best_photos, 0)        as best_photos,
      coalesce(g.garage_cars, 0)        as garage_cars
    from public.profiles p

    left join (
      select
        li.seller_id,
        count(*) filter (where li.status = 'active') as active_listings,
        count(*)                                     as published_listings,
        count(*) filter (where li.status = 'sold')  as sold_listings,
        max(img.n)                                   as best_photos
      from public.listings li
      left join lateral (
        select count(*) as n
        from public.listing_images im
        where im.listing_id = li.id
      ) img on true
      -- Los mismos estados que `PUBLISHED_STATUSES` y la vista de la 022.
      where li.status in ('active', 'paused', 'sold')
      group by li.seller_id
    ) l on l.seller_id = p.id

    left join (
      select user_id, count(*) as garage_cars
      from public.garage_entries
      group by user_id
    ) g on g.user_id = p.id

    where p.id = target
  )

  select coalesce(array_agg(id order by orden), '{}')
  from (
    select id, orden
    from datos, lateral (
      values
        (1, 'profile_complete', name <> '' and coalesce(whatsapp, '') <> '' and coalesce(city, '') <> ''),
        (2, 'first_listing',    published_listings >= 1),
        (3, 'rich_listing',     best_photos >= 8),
        (4, 'three_listings',   active_listings >= 3),
        (5, 'first_sale',       sold_listings >= 1),
        (6, 'garage_started',   garage_cars >= 1),
        (7, 'garage_complete',  garage_cars >= 4)
    ) as logro(orden, id, ganado)
    where logro.ganado
  ) ganados;
$$;

comment on function public.profile_badges(uuid) is
  'Los logros ganados de un perfil, sin exponer los datos con que se calculan (026).';

revoke all on function public.profile_badges(uuid) from public;
grant execute on function public.profile_badges(uuid) to anon, authenticated;
