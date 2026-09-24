-- ============================================================================
-- Bajó de precio
--
-- Pegalo en Supabase → SQL Editor → Run. Es idempotente.
--
-- Dos cosas:
--   · cada aviso recuerda su precio anterior cuando baja, para mostrarlo
--     tachado al lado del nuevo;
--   · quien tiene el auto en favoritos se entera en sus novedades.
--
-- Es el aviso que más le sirve a alguien que guardó un auto: lo guardó porque
-- le interesaba, y lo más probable es que el precio fuera lo que lo frenaba.
--
-- Lo escribe un trigger y nadie más. Las columnas nuevas no están en los
-- permisos de la 017, así que la API no las puede tocar: un vendedor no puede
-- inventarse un "antes USD 40.000" que nunca publicó.
--
-- Y el trigger no se deja engañar con la vuelta corta: subir el precio a la
-- mañana y bajarlo a la tarde para aparecer como rebajado. Una baja cuenta
-- sólo si el precio de antes estuvo publicado por lo menos tres días, y si es
-- de al menos el uno por ciento: bajar un dólar no es una novedad para nadie.
-- Si después sube, la marca se borra. Si baja dos veces seguidas, el "antes"
-- sigue siendo el primero, que es la rebaja de verdad.
--
-- Cambiar de moneda no es bajar: USD 20.000 → ARS 20.000.000 no se compara.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. Las columnas
-- ----------------------------------------------------------------------------

alter table public.listings
  add column if not exists price_set_at     timestamptz,
  add column if not exists previous_price   int,
  add column if not exists price_dropped_at timestamptz;

-- Los avisos que ya están tienen el precio desde que se publicaron.
update public.listings set price_set_at = created_at where price_set_at is null;

alter table public.listings alter column price_set_at set default now();

-- ----------------------------------------------------------------------------
-- 2. El trigger
-- ----------------------------------------------------------------------------

create or replace function public.listings_track_price()
returns trigger
language plpgsql
set search_path = public
as $$
declare
  rebaja_vigente boolean :=
    old.previous_price is not null
    and old.price_dropped_at > now() - interval '30 days';
begin
  if new.price = old.price and new.currency = old.currency then
    return new;
  end if;

  if new.currency <> old.currency or new.price > old.price then
    -- Subió o cambió de moneda: no hay rebaja que mostrar.
    new.previous_price   := null;
    new.price_dropped_at := null;
  elsif rebaja_vigente then
    -- Segunda baja seguida: el "antes" sigue siendo el de la primera.
    new.previous_price   := old.previous_price;
    new.price_dropped_at := now();
  elsif old.price_set_at <= now() - interval '3 days'
        and new.price <= old.price * 0.99 then
    new.previous_price   := old.price;
    new.price_dropped_at := now();
  else
    new.previous_price   := null;
    new.price_dropped_at := null;
  end if;

  new.price_set_at := now();
  return new;
end;
$$;

drop trigger if exists listings_track_price on public.listings;
create trigger listings_track_price
  before update of price, currency on public.listings
  for each row execute function public.listings_track_price();

-- ----------------------------------------------------------------------------
-- 3. La novedad para quien lo tiene en favoritos
-- ----------------------------------------------------------------------------

-- Misma función que la 025 más un caso: los autos que guardaste y bajaron
-- después de que los guardaste. Sólo activos, y nunca los propios.
--
-- Suma tres columnas (el precio de ahora, el de antes y la moneda), así que
-- cambia la forma: `drop` antes del `create`, como en la 025.

drop function if exists public.my_novedades();

create or replace function public.my_novedades()
returns table (
  kind           text,
  happened_at    timestamptz,
  unseen         boolean,
  actor_id       uuid,
  actor_name     text,
  actor_avatar   text,
  listing_slug   text,
  listing_title  text,
  amount         int,
  garage_slot    text,
  garage_car     text,
  garage_photo   text,
  garage_note    text,
  garage_is_new  boolean,
  -- Sólo en las de precio.
  price_now      int,
  price_before   int,
  price_currency text
)
language sql
stable
security definer
set search_path = public
as $$
  with me as (
    select auth.uid() as id,
           coalesce(
             (select s.seen_at from public.novedades_seen s where s.user_id = auth.uid()),
             '-infinity'::timestamptz
           ) as seen_at,
           now() - interval '30 days' as since
  ),

  interest as (
    select
      'interest'::text                    as kind,
      max(i.created_at)                   as happened_at,
      null::uuid                          as actor_id,
      null::text                          as actor_name,
      null::text                          as actor_avatar,
      l.slug                              as listing_slug,
      concat_ws(' ', l.make, l.model)     as listing_title,
      count(*)::int                       as amount,
      null::text                          as garage_slot,
      null::text                          as garage_car,
      null::text                          as garage_photo,
      null::text                          as garage_note,
      null::boolean                       as garage_is_new,
      null::int                           as price_now,
      null::int                           as price_before,
      null::text                          as price_currency
    from public.listing_interests i
    join public.listings l on l.id = i.listing_id
    cross join me
    where l.seller_id = me.id
      and i.created_at > me.since
    group by l.id, l.slug, l.make, l.model
  ),

  followers as (
    select
      'follow'::text, f.created_at,
      p.id, p.name, p.avatar_url,
      null::text, null::text, 1,
      null::text, null::text, null::text, null::text, null::boolean,
      null::int, null::int, null::text
    from public.follows f
    join public.profiles p on p.id = f.follower_id
    cross join me
    where f.followed_id = me.id
      and f.created_at > me.since
  ),

  garages as (
    select
      'garage'::text, g.updated_at,
      p.id, p.name, p.avatar_url,
      null::text, null::text, 1,
      g.slot,
      trim(concat_ws(' ', g.make, g.model, g.year)),
      case when p.content_hidden then null else g.photo_path end,
      case when p.content_hidden then null else nullif(g.note, '') end,
      g.updated_at - g.created_at < interval '1 minute',
      null::int, null::int, null::text
    from public.follows f
    join public.garage_entries g on g.user_id = f.followed_id
    join public.profiles p on p.id = f.followed_id
    cross join me
    where f.follower_id = me.id
      and g.updated_at > greatest(f.created_at, me.since)
  ),

  /* Bajó un auto que guardaste. Después de guardarlo: si ya estaba rebajado
     cuando lo guardaste, lo viste así y no es novedad. */
  price_drops as (
    select
      'price_drop'::text, l.price_dropped_at,
      null::uuid, null::text, null::text,
      l.slug,
      concat_ws(' ', l.make, l.model),
      (l.previous_price - l.price)::int,
      null::text, null::text, null::text, null::text, null::boolean,
      l.price, l.previous_price, l.currency::text
    from public.favorites f
    join public.listings l on l.id = f.listing_id
    cross join me
    where f.user_id = me.id
      and l.seller_id <> me.id
      and l.status = 'active'
      and l.previous_price is not null
      and l.price_dropped_at > greatest(f.created_at, me.since)
  ),

  everything as (
    select * from interest
    union all select * from followers
    union all select * from garages
    union all select * from price_drops
  )

  select
    e.kind,
    e.happened_at,
    e.happened_at > me.seen_at,
    e.actor_id,
    e.actor_name,
    e.actor_avatar,
    e.listing_slug,
    e.listing_title,
    e.amount,
    e.garage_slot,
    e.garage_car,
    e.garage_photo,
    e.garage_note,
    e.garage_is_new,
    e.price_now,
    e.price_before,
    e.price_currency
  from everything e
  cross join me
  order by e.happened_at desc
  limit 30;
$$;

revoke all on function public.my_novedades() from public, anon;
grant execute on function public.my_novedades() to authenticated;
