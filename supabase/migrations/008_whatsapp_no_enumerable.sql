-- ============================================================================
-- Sacar el WhatsApp de la lectura pública en bloque.
--
-- Pegalo en Supabase → SQL Editor → Run. Es idempotente.
--
-- El problema: `profiles_select` es `using (true)`, así que la tabla entera de
-- perfiles es legible por cualquiera. Con la anon key —que viaja dentro del
-- JavaScript del sitio y es pública por diseño— una sola consulta devuelve
-- nombre, WhatsApp y ciudad de todos los usuarios:
--
--   GET /rest/v1/profiles?select=name,whatsapp,city
--
-- Que el número se vea en un aviso es el punto del sitio: sin número nadie te
-- escribe. Que se pueda bajar la lista completa sin tener cuenta es otra cosa.
-- Una lista de nombre + celular + ciudad de Argentina tiene comprador directo,
-- y el que la baja no deja rastro: es una sola consulta de lectura.
--
-- La diferencia entre las dos cosas es el trabajo que cuesta obtener un
-- número. Acá pasa a costar un aviso activo por número: hay que saber el slug
-- del aviso, y el aviso tiene que estar publicado. Eso no frena a alguien que
-- quiera raspar el sitio entero, pero deja de ser gratis, deja de ser una sola
-- consulta, y pasa por la lista de avisos, que es pública de todos modos.
--
-- Lo que NO se toca: escribir. El dueño sigue actualizando su número desde el
-- formulario de publicar, que es donde se carga.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. La columna deja de ser legible
-- ----------------------------------------------------------------------------

-- Postgres permite permisos por columna, y es exactamente para esto: la fila
-- sigue siendo pública —el nombre, la ciudad, la foto— y una sola columna deja
-- de estarlo. No alcanza con cambiar la política de RLS, porque RLS filtra
-- filas, no columnas.
--
-- El orden importa y es contraintuitivo: `revoke select (whatsapp)` a secas no
-- hace NADA mientras el rol tenga `select` a nivel tabla, porque el permiso de
-- tabla cubre todas las columnas presentes y futuras. Hay que sacar el de
-- tabla y volver a dar el de cada columna que sí se puede leer.
revoke select on public.profiles from anon, authenticated;

-- Las que la aplicación lee de verdad. `role` y `listing_limit` quedan afuera
-- aposta: los usa `is_admin()` y `listing_allowance()`, que son `security
-- definer` y no dependen de que el cliente pueda verlas.
--
-- Efecto lateral que conviene: una columna nueva en `profiles` nace ilegible
-- hasta que alguien la agregue acá. Falla cerrado, que es como tiene que
-- fallar esto.
grant select (id, name, avatar_url, seller_type, city, province, verified, created_at)
  on public.profiles to anon, authenticated;

-- ----------------------------------------------------------------------------
-- 2. El número, de a uno y contra un aviso publicado
-- ----------------------------------------------------------------------------

-- `security definer` es lo que le deja leer la columna que acabamos de cerrar.
-- Por eso la función es angosta a propósito: recibe un slug, devuelve un solo
-- número, y sólo si ese aviso está activo. Un aviso pausado, en borrador o
-- bloqueado no devuelve nada — que es justo lo que corresponde, porque un
-- aviso bloqueado está bloqueado por algo.
create or replace function public.listing_whatsapp(p_slug text)
returns text
language sql
stable
security definer set search_path = public
as $$
  select p.whatsapp
    from public.listings l
    join public.profiles p on p.id = l.seller_id
   where l.slug = p_slug
     and l.status = 'active';
$$;

revoke all on function public.listing_whatsapp(text) from public;
grant execute on function public.listing_whatsapp(text) to anon, authenticated;

-- ----------------------------------------------------------------------------
-- 3. El propio número, para quien ya lo conoce
-- ----------------------------------------------------------------------------

-- El dueño necesita ver el suyo: el formulario de editar un aviso lo precarga,
-- y el logro de "perfil completo" depende de que esté cargado. Devuelve el de
-- `auth.uid()` y de nadie más, así que no hay parámetro que manipular.
create or replace function public.my_whatsapp()
returns text
language sql
stable
security definer set search_path = public
as $$
  select whatsapp from public.profiles where id = auth.uid();
$$;

revoke all on function public.my_whatsapp() from public;
grant execute on function public.my_whatsapp() to authenticated;

-- ----------------------------------------------------------------------------
-- 4. La vista deja de exponerlo
-- ----------------------------------------------------------------------------

-- `profile_stats` traía `whatsapp` entero y está abierta a `anon`, así que
-- cerrarla en la tabla y dejarla acá no habría cerrado nada. Se va sin
-- reemplazo.
--
-- La tentación era dejar un `has_whatsapp` booleano para el logro de perfil
-- completo, y son dos errores en uno. La vista es `security_invoker`, o sea que
-- corre con los permisos de quien consulta: al no poder `anon` leer la columna,
-- la vista entera fallaría. Y además no hace falta — el único que necesita
-- saber si su número está cargado es su dueño, y para eso está `my_whatsapp()`.
-- Que un desconocido pueda averiguar si vos tenés WhatsApp cargado no le sirve
-- a nadie.
--
-- Va `drop` y `create` y no `create or replace` por lo mismo que en la 007: no
-- se le puede sacar una columna a una vista con `replace`.
drop view if exists public.profile_stats;

create view public.profile_stats
with (security_invoker = on)
as
select
  p.id                             as user_id,
  p.name,
  p.city,
  p.verified,
  p.created_at,
  coalesce(l.active_listings, 0)   as active_listings,
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

grant select on public.profile_stats to anon, authenticated;
