-- ============================================================================
-- Cómo le va a cada aviso, día por día
--
-- Pegar en el SQL Editor de Supabase. Es idempotente.
--
-- Quien publica ve hoy dos números sueltos: visitas y consultas, desde
-- siempre. Con eso no se puede contestar lo único que importa: si el aviso
-- anda mejor o peor que la semana pasada, y si bajar el precio o sumar fotos
-- cambió algo. Para eso hace falta la serie, no el total.
--
-- Las consultas ya tienen fecha (`listing_interests.created_at`, de la 014).
-- Las visitas no: `listings.view_count` es un contador que sólo sube. Esta
-- migración le suma una fila por aviso y por día, que es el grano más grueso
-- que sirve y el que menos escribe.
--
-- Y es también el argumento de venta para una concesionaria: no "publicá
-- gratis", sino "tus autos tuvieron 300 visitas y 12 personas te pidieron el
-- WhatsApp este mes".
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. Las visitas, por día
-- ----------------------------------------------------------------------------

/* El día es el de acá, no el de UTC.

   Supabase corre en UTC, así que `current_date` cambia a las 21 hora
   argentina: una visita de las 22 quedaba anotada al día siguiente, y el
   gráfico ---que arma los días con la fecha del navegador--- no la mostraba
   nunca. Es el mismo corrimiento que ya está documentado en `lib/blog.ts` para
   las fechas de las notas. */
create table if not exists public.listing_views_daily (
  listing_id uuid not null references public.listings on delete cascade,
  day        date not null default (now() at time zone 'America/Argentina/Buenos_Aires')::date,
  views      int  not null default 0,
  primary key (listing_id, day)
);

comment on table public.listing_views_daily is
  'Visitas por aviso y por día. La escribe register_listing_view (027).';

-- Nadie la toca directo: se escribe por la función de abajo y se lee por
-- `my_listing_stats`, que sólo devuelve lo propio. Sin esto, cualquiera podría
-- leer cuántas visitas tiene el aviso de otro, que es información del negocio
-- de esa persona.
alter table public.listing_views_daily enable row level security;
revoke all on public.listing_views_daily from anon, authenticated;

-- ----------------------------------------------------------------------------
-- 2. La visita suma en los dos lados
-- ----------------------------------------------------------------------------

-- El contador de siempre (que es lo que se muestra en la ficha) y la fila del
-- día. `security definer` por lo mismo que antes: la política de `listings`
-- sólo deja actualizar al dueño, y el que suma una visita es el comprador.
create or replace function public.register_listing_view(listing_slug text)
returns void
language plpgsql
security definer set search_path = public
as $$
declare
  id_del_aviso uuid;
begin
  update public.listings
     set view_count = view_count + 1
   where slug = listing_slug
     and status = 'active'
  returning id into id_del_aviso;

  /* Sin aviso activo con ese slug no hay nada que anotar. */
  if id_del_aviso is null then
    return;
  end if;

  insert into public.listing_views_daily (listing_id, day, views)
  values (id_del_aviso, (now() at time zone 'America/Argentina/Buenos_Aires')::date, 1)
  on conflict (listing_id, day) do update
    set views = public.listing_views_daily.views + 1;
end;
$$;

revoke all on function public.register_listing_view(text) from public;
grant execute on function public.register_listing_view(text) to anon, authenticated;

-- ----------------------------------------------------------------------------
-- 3. Lo propio, día por día
-- ----------------------------------------------------------------------------

-- Devuelve una fila por aviso y por día con visitas y consultas. Sólo de los
-- avisos de quien pregunta: el `where` contra `auth.uid()` es lo único que
-- separa los datos de una concesionaria de los de otra.
--
-- `security definer` porque las filas de `listing_interests` no se pueden leer
-- ---el vendedor ve cuántos, no quiénes (014)--- y acá se cuentan sin
-- devolver un solo `user_id`.
create or replace function public.my_listing_stats(days int default 14)
returns table (
  listing_id uuid,
  day        date,
  views      int,
  interests  int
)
language sql
stable
security definer
set search_path = public
as $$
  with mios as (
    select l.id from public.listings l where l.seller_id = auth.uid()
  ),
  /* El tope es por las dudas: un `days` gigante pedido a mano no puede
     convertir esto en una consulta de años. */
  desde as (
    select (now() at time zone 'America/Argentina/Buenos_Aires')::date
      - (least(greatest(coalesce(days, 14), 1), 90) - 1) as dia
  ),
  visitas as (
    select v.listing_id, v.day, v.views
    from public.listing_views_daily v
    join mios on mios.id = v.listing_id
    cross join desde
    where v.day >= desde.dia
  ),
  consultas as (
    select
      i.listing_id,
      (i.created_at at time zone 'America/Argentina/Buenos_Aires')::date as day,
      count(*)::int as interests
    from public.listing_interests i
    join mios on mios.id = i.listing_id
    cross join desde
    where (i.created_at at time zone 'America/Argentina/Buenos_Aires')::date >= desde.dia
    group by i.listing_id, 2
  )
  select
    coalesce(v.listing_id, c.listing_id) as listing_id,
    coalesce(v.day, c.day)               as day,
    coalesce(v.views, 0)                 as views,
    coalesce(c.interests, 0)             as interests
  from visitas v
  full outer join consultas c
    on c.listing_id = v.listing_id and c.day = v.day
  order by 2;
$$;

revoke all on function public.my_listing_stats(int) from public, anon;
grant execute on function public.my_listing_stats(int) to authenticated;
