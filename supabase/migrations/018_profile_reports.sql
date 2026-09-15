-- ============================================================================
-- Reportar garages y perfiles
--
-- Pegalo en Supabase → SQL Editor → Run. Es idempotente.
--
-- Hasta acá sólo se podían reportar avisos. Pero desde el buscador de personas
-- y seguir, los garages y las fotos de perfil son públicos y encontrables, y
-- no había forma de avisar que uno tiene una foto inapropiada o se hace pasar
-- por otra persona.
--
-- Mismo criterio que los reportes de avisos (006):
--   · reportar pide cuenta, y es uno por persona
--   · con tres personas distintas se actúa solo, mientras alguien revisa
--   · quien reportó queda anónimo para el reportado
--
-- Lo que cambia es qué se hace solo. A un aviso se lo bloquea entero. A una
-- persona no: su garage y su nombre siguen, y sus avisos también. Lo que se
-- oculta es lo que puede hacer daño —la foto de perfil, las fotos del garage y
-- las notas, que son imagen y texto libre— hasta que quien modera decida.
--
-- Honestidad sobre el alcance: ocultar es no mostrarlo en el sitio, en el
-- buscador y en el preview de WhatsApp. Los archivos siguen en Storage con su
-- link público, y las notas se siguen pudiendo leer por la API. Borrarlos de
-- verdad es una decisión de quien modera, y es irreversible; ocultar es lo que
-- corresponde hacer solo, sin que nadie lo haya mirado.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. Contenido oculto
-- ----------------------------------------------------------------------------

alter table public.profiles
  add column if not exists content_hidden boolean not null default false;

comment on column public.profiles.content_hidden is
  'Foto de perfil, fotos y notas del garage ocultas por moderación. No lo puede cambiar la persona.';

-- Legible, para que la pantalla sepa qué no mostrar. NO se agrega a las
-- columnas que la persona puede escribir (017): si pudiera, se lo sacaría sola.
grant select (
  id, name, avatar_url, seller_type, city, province, verified, created_at,
  discoverable, instagram, garage_theme, content_hidden
) on public.profiles to anon, authenticated;

-- La foto de perfil, salvo que esté oculta. La usan las funciones que devuelven
-- listas de personas, para que una foto oculta no se cuele por el buscador, las
-- novedades o a quién seguís.
--
-- Recibe las dos columnas y no la fila entera a propósito. Pasarle la fila
-- (`visible_avatar(p)`) exige permiso de lectura sobre TODAS las columnas del
-- perfil, y el buscador corre con los permisos de quien llama: sin sesión no
-- puede leer `whatsapp` ni `role` (008), y la búsqueda entera fallaría.
drop function if exists public.visible_avatar(public.profiles);
create or replace function public.visible_avatar(avatar_url text, hidden boolean)
returns text
language sql
immutable
as $$
  select case when hidden then null else avatar_url end;
$$;

-- ----------------------------------------------------------------------------
-- 2. Los reportes
-- ----------------------------------------------------------------------------

create table if not exists public.profile_reports (
  id          uuid primary key default gen_random_uuid(),
  profile_id  uuid not null references public.profiles on delete cascade,
  -- Si quien reportó borra su cuenta, el reporte queda: como en la 006.
  reporter_id uuid references public.profiles on delete set null,
  reason      text not null check (
    reason in ('photo', 'impersonation', 'offensive', 'spam', 'other')
  ),
  detail      text not null default '' check (length(detail) <= 500),
  created_at  timestamptz not null default now(),
  /* Reportarse a uno mismo no dice nada, y sumaría al conteo. */
  check (profile_id <> reporter_id)
);

-- Uno por persona y por perfil: sin esto, alguien solo junta los tres reportes
-- que ocultan el garage de otro.
create unique index if not exists profile_reports_one_per_person
  on public.profile_reports (profile_id, reporter_id);

create index if not exists profile_reports_profile_idx on public.profile_reports (profile_id);

alter table public.profile_reports enable row level security;

drop policy if exists profile_reports_insert_own on public.profile_reports;
create policy profile_reports_insert_own on public.profile_reports
  for insert to authenticated
  with check (reporter_id = auth.uid());

-- Quien reportó ve el suyo, para que la pantalla le diga "ya lo reportaste".
-- Quien modera ve todos. El reportado, ninguno.
drop policy if exists profile_reports_select on public.profile_reports;
create policy profile_reports_select on public.profile_reports
  for select to authenticated
  using (reporter_id = auth.uid() or public.is_admin());

drop policy if exists profile_reports_delete_admin on public.profile_reports;
create policy profile_reports_delete_admin on public.profile_reports
  for delete to authenticated
  using (public.is_admin());

-- Por columna, como manda la 017: `created_at` y el `id` los pone la base.
revoke all on public.profile_reports from anon, authenticated;
grant select, delete on public.profile_reports to authenticated;
grant insert (profile_id, reporter_id, reason, detail) on public.profile_reports to authenticated;

-- ----------------------------------------------------------------------------
-- 3. Ocultar solo, con tres personas distintas
-- ----------------------------------------------------------------------------

-- Tres, igual que con los avisos: con dos, dos personas coordinadas le ocultan
-- el garage a cualquiera. No reemplaza la revisión, le gana tiempo.
create or replace function public.auto_hide_reported_profile()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  reporters int;
begin
  select count(distinct reporter_id) into reporters
    from public.profile_reports
   where profile_id = new.profile_id;

  if reporters >= 3 then
    update public.profiles
       set content_hidden = true
     where id = new.profile_id
       and not content_hidden;
  end if;

  return new;
end;
$$;

drop trigger if exists profile_reports_auto_hide on public.profile_reports;
create trigger profile_reports_auto_hide
  after insert on public.profile_reports
  for each row execute function public.auto_hide_reported_profile();

-- ----------------------------------------------------------------------------
-- 4. Lo que decide quien modera
-- ----------------------------------------------------------------------------

-- Ocultar o volver a mostrar. Va por función y no por un permiso de update
-- porque `content_hidden` no lo puede escribir nadie desde la API (017); esta
-- función es la única puerta, y chequea que quien llama modere.
create or replace function public.admin_set_content_hidden(target uuid, hidden boolean)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_admin() then
    raise exception 'Sólo quien modera puede hacer esto.' using errcode = '42501';
  end if;

  update public.profiles set content_hidden = hidden where id = target;
end;
$$;

revoke all on function public.admin_set_content_hidden(uuid, boolean) from public, anon;
grant execute on function public.admin_set_content_hidden(uuid, boolean) to authenticated;

-- ----------------------------------------------------------------------------
-- 5. Las listas de personas no muestran fotos ocultas
-- ----------------------------------------------------------------------------

-- Las mismas funciones de la 013 y la 016, con `visible_avatar(...)` en lugar
-- de `p.avatar_url`. Nada más cambia.

create or replace function public.search_people(term text)
returns table (
  id          uuid,
  name        text,
  avatar_url  text,
  city        text,
  province    text,
  garage_cars bigint
)
language sql
stable
set search_path = public
as $$
  with needle as (
    select public.name_key(btrim(coalesce(term, ''))) as key
  ),
  pattern as (
    select
      key,
      replace(replace(replace(key, '\', '\\'), '%', '\%'), '_', '\_') as safe
    from needle
  )
  select
    p.id,
    p.name,
    public.visible_avatar(p.avatar_url, p.content_hidden),
    p.city,
    p.province,
    coalesce(g.cars, 0) as garage_cars
  from public.profiles p
  cross join pattern n
  left join (
    select user_id, count(*) as cars
    from public.garage_entries
    group by user_id
  ) g on g.user_id = p.id
  where p.discoverable
    and length(n.key) >= 2
    and public.name_key(p.name) like '%' || n.safe || '%' escape '\'
    and not public.blocked_with(p.id)
  order by
    (public.name_key(p.name) like n.safe || '%' escape '\') desc,
    coalesce(g.cars, 0) desc,
    p.name
  limit 20;
$$;

revoke all on function public.search_people(text) from public;
grant execute on function public.search_people(text) to anon, authenticated;

create or replace function public.my_following()
returns table (
  id          uuid,
  name        text,
  avatar_url  text,
  city        text,
  province    text,
  garage_cars bigint,
  updated_at  timestamptz,
  followed_at timestamptz
)
language sql
stable
set search_path = public
as $$
  select
    p.id,
    p.name,
    public.visible_avatar(p.avatar_url, p.content_hidden),
    p.city,
    p.province,
    coalesce(g.cars, 0),
    g.updated_at,
    f.created_at
  from public.follows f
  join public.profiles p on p.id = f.followed_id
  left join (
    select user_id, count(*) as cars, max(updated_at) as updated_at
    from public.garage_entries
    group by user_id
  ) g on g.user_id = p.id
  where f.follower_id = auth.uid()
  order by g.updated_at desc nulls last, f.created_at desc;
$$;

create or replace function public.my_blocks()
returns table (id uuid, name text, avatar_url text, blocked_at timestamptz)
language sql
stable
set search_path = public
as $$
  select p.id, p.name, public.visible_avatar(p.avatar_url, p.content_hidden), b.created_at
  from public.blocks b
  join public.profiles p on p.id = b.blocked_id
  where b.blocker_id = auth.uid()
  order by b.created_at desc;
$$;

create or replace function public.my_novedades()
returns table (
  kind          text,
  happened_at   timestamptz,
  unseen        boolean,
  actor_id      uuid,
  actor_name    text,
  actor_avatar  text,
  listing_slug  text,
  listing_title text,
  amount        int
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
      count(*)::int                       as amount
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
      p.id, p.name, public.visible_avatar(p.avatar_url, p.content_hidden),
      null::text, null::text, 1
    from public.follows f
    join public.profiles p on p.id = f.follower_id
    cross join me
    where f.followed_id = me.id
      and f.created_at > me.since
  ),

  garages as (
    select
      'garage'::text, max(g.updated_at),
      p.id, p.name, public.visible_avatar(p.avatar_url, p.content_hidden),
      null::text, null::text, count(*)::int
    from public.follows f
    join public.garage_entries g on g.user_id = f.followed_id
    join public.profiles p on p.id = f.followed_id
    cross join me
    where f.follower_id = me.id
      and g.updated_at > greatest(f.created_at, me.since)
    group by p.id, p.name, p.avatar_url, p.content_hidden
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
