-- ============================================================================
-- Vender un auto no te baja de nivel
--
-- Pegalo en Supabase → SQL Editor → Run. Es idempotente.
--
-- `profile_stats` contaba sólo los avisos activos, y de esa cuenta salían dos
-- logros que hablan de algo que ya hiciste: "Primera publicación" y
-- "Publicación completa". Marcar un auto como vendido lo sacaba de la cuenta y
-- se llevaba los dos. Un particular que publicaba su único auto con ocho fotos
-- quedaba en Vendedor; lo vendía, lo marcaba como vendido y volvía a Recién
-- llegado. El sistema le enseñaba a no marcar nada como vendido, que es dejar
-- avisos muertos publicados: lo contrario de lo que necesita un marketplace.
--
-- Ahora la vista cuenta dos cosas distintas por separado:
--
--   · `active_listings`, igual que antes: los activos hoy. Es lo que pide
--     "Tres autos activos", que sí habla del presente.
--   · `published_listings`: activos, pausados y vendidos. Lo que alguna vez
--     salió publicado y sigue en la base. Un borrador no cuenta porque nunca
--     salió; uno bloqueado por moderación tampoco. Uno borrado no está, y eso
--     sigue siendo a propósito: borrar un aviso sí baja el nivel.
--   · `sold_listings`, para el logro nuevo de la primera venta.
--   · `best_photos` pasa a contarse sobre los publicados y no sólo los activos.
--
-- La lista de estados ---'active', 'paused', 'sold'--- también está escrita en
-- `src/lib/levels.ts` (`PUBLISHED_STATUSES`), porque el perfil cuenta lo mismo
-- sin pasar por esta vista. Un test lee este archivo y los compara.
--
-- Qué ve cada uno. La vista es `security_invoker` y está abierta a `anon`, así
-- que corre con los permisos de quien consulta. Un aviso pausado o vendido sólo
-- lo ve su dueño (política `listings_select`): para cualquier otro,
-- `published_listings` da lo mismo que `active_listings` y `sold_listings` da
-- cero. No se filtra cuánto vendió alguien. Tampoco hace falta que se vea: el
-- nivel sólo se calcula para uno mismo.
--
-- `create or replace` y no `drop` + `create` como en la 007 y la 008: allá se
-- sacaban columnas, y eso `replace` no lo permite. Acá sólo se agregan al final
-- y `best_photos` cambia de cálculo sin cambiar de tipo, que sí se puede. Así la
-- vista no deja de existir ni un instante y conserva sus permisos.
-- ============================================================================

create or replace view public.profile_stats
with (security_invoker = on)
as
select
  p.id                                as user_id,
  p.name,
  p.city,
  p.verified,
  p.created_at,
  coalesce(l.active_listings, 0)      as active_listings,
  coalesce(l.best_photos, 0)          as best_photos,
  coalesce(g.garage_cars, 0)          as garage_cars,
  coalesce(l.published_listings, 0)   as published_listings,
  coalesce(l.sold_listings, 0)        as sold_listings
from public.profiles p

left join (
  select
    li.seller_id,
    count(*) filter (where li.status = 'active')  as active_listings,
    count(*)                                       as published_listings,
    count(*) filter (where li.status = 'sold')    as sold_listings,
    max(img.n)                                     as best_photos
  from public.listings li
  left join lateral (
    select count(*) as n
    from public.listing_images
    where listing_id = li.id
  ) img on true
  where li.status in ('active', 'paused', 'sold')
  group by li.seller_id
) l on l.seller_id = p.id

left join (
  select user_id, count(*) as garage_cars
  from public.garage_entries
  group by user_id
) g on g.user_id = p.id;

grant select on public.profile_stats to anon, authenticated;
