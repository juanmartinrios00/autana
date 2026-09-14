-- ============================================================================
-- Novedades: lo que pasó con lo tuyo desde la última vez que miraste
--
-- Pegalo en Supabase → SQL Editor → Run. Es idempotente.
--
-- Tres cosas:
--   · gente que se interesó en tus avisos
--   · gente que te empezó a seguir
--   · garages de quienes seguís que cambiaron
--
-- Se llaman "novedades" y no "avisos" porque en este sitio "aviso" ya es la
-- publicación de un auto.
--
-- Cómo están hechas, y por qué. No hay una tabla con una fila por novedad. Se
-- calculan al pedirlas, a partir de lo que ya está en la base, y lo único que
-- se guarda por persona es cuándo miró por última vez. Una tabla de
-- notificaciones pide un trigger en cada tabla que genera eventos, se llena
-- para siempre, y hay que limpiarla; y cada evento nuevo que se quiera sumar
-- son dos lugares a tocar. Calculadas, sumar una es agregar un `union all`.
--
-- Lo que se pierde: no se marcan de a una como leídas. Se marcan todas al abrir
-- la pantalla, que es como se usan en la práctica.
--
-- Se miran los últimos 30 días. Más atrás no es una novedad.
--
-- Cuando lleguen los mails (esperan al dominio propio), el trabajo que los
-- mande puede usar esta misma función: lo que no se vio es lo que se manda.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. Cuándo miró cada uno
-- ----------------------------------------------------------------------------

create table if not exists public.novedades_seen (
  user_id uuid primary key references public.profiles on delete cascade,
  seen_at timestamptz not null default now()
);

-- La tocan sólo las funciones de abajo.
alter table public.novedades_seen enable row level security;
revoke all on public.novedades_seen from anon, authenticated;

-- ----------------------------------------------------------------------------
-- 2. Las novedades
-- ----------------------------------------------------------------------------

-- `security definer` porque el dueño de un aviso no puede leer quién se
-- interesó (la 014 lo cierra a propósito). Por eso mismo la novedad de
-- interesados trae la cantidad y nunca quiénes: la función puede ver las filas,
-- pero no las devuelve.
--
-- Sin sesión devuelve vacío: `auth.uid()` es null y ninguna condición calza.
create or replace function public.my_novedades()
returns table (
  kind         text,
  happened_at  timestamptz,
  unseen       boolean,
  actor_id     uuid,
  actor_name   text,
  actor_avatar text,
  listing_slug text,
  listing_title text,
  amount       int
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

  /* Interesados, uno por aviso: "3 personas se interesaron en tu Symbol". De a
     uno por persona sería una lista de filas iguales sin nombre. */
  interest as (
    select
      'interest'::text                    as kind,
      max(i.created_at)                   as happened_at,
      null::uuid                          as actor_id,
      null::text                          as actor_name,
      null::text                          as actor_avatar,
      l.slug                              as listing_slug,
      concat_ws(' ', l.make, l.model)     as listing_title,
      count(*)::int                       as amount
    from public.listing_interests i
    join public.listings l on l.id = i.listing_id
    cross join me
    where l.seller_id = me.id
      and i.created_at > me.since
    group by l.id, l.slug, l.make, l.model
  ),

  /* Quién te empezó a seguir. Acá sí va el nombre: quien es seguido ya puede
     ver quién lo sigue (la 013). */
  followers as (
    select
      'follow'::text, f.created_at,
      p.id, p.name, p.avatar_url,
      null::text, null::text, 1
    from public.follows f
    join public.profiles p on p.id = f.follower_id
    cross join me
    where f.followed_id = me.id
      and f.created_at > me.since
  ),

  /* Garages que cambiaron, uno por persona. Sólo lo que cambió después de que
     la empezaste a seguir: lo de antes no es novedad para vos. */
  garages as (
    select
      'garage'::text, max(g.updated_at),
      p.id, p.name, p.avatar_url,
      null::text, null::text, count(*)::int
    from public.follows f
    join public.garage_entries g on g.user_id = f.followed_id
    join public.profiles p on p.id = f.followed_id
    cross join me
    where f.follower_id = me.id
      and g.updated_at > greatest(f.created_at, me.since)
    group by p.id, p.name, p.avatar_url
  ),

  everything as (
    select * from interest
    union all select * from followers
    union all select * from garages
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
    e.amount
  from everything e
  cross join me
  order by e.happened_at desc
  limit 30;
$$;

revoke all on function public.my_novedades() from public, anon;
grant execute on function public.my_novedades() to authenticated;

-- Marcar todo como visto. Sin parámetro: se marca lo propio y nada más.
create or replace function public.mark_novedades_seen()
returns void
language sql
security definer
set search_path = public
as $$
  insert into public.novedades_seen (user_id, seen_at)
  values (auth.uid(), now())
  on conflict (user_id) do update set seen_at = excluded.seen_at;
$$;

revoke all on function public.mark_novedades_seen() from public, anon;
grant execute on function public.mark_novedades_seen() to authenticated;
