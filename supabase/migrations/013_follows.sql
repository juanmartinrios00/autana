-- ============================================================================
-- Seguir a alguien, y bloquear
--
-- Pegalo en Supabase → SQL Editor → Run. Es idempotente.
--
-- Seguir es de una vía, a propósito. La amistad mutua trae solicitudes,
-- aceptar, rechazar, pendientes y notificaciones de todo eso, y para un sitio
-- de autos casi nada de eso se usa. Lo que se quiere es simple: que el garage
-- de tu hermano aparezca cuando cambia algo. Si algún día hace falta
-- reciprocidad, "se siguen los dos" ya es un amigo, sin tabla nueva.
--
-- Bloquear existe desde el primer día. En el momento en que la gente se vuelve
-- encontrable y seguible, eso deja de ser opcional.
--
-- Qué hace bloquear:
--   · corta el seguimiento en las dos direcciones
--   · impide que esa persona te vuelva a seguir
--   · te saca de los resultados del buscador para esa persona
--
-- Qué NO puede hacer, y conviene decirlo en la pantalla y no esconderlo: el
-- garage se abre con el link sin tener sesión, así que bloquear no impide que
-- alguien lo vea. Impedirlo sería hacer el garage privado, que es otra función.
--
-- Quién ve qué del grafo:
--   · cada uno ve a quién sigue y quién lo sigue a él
--   · nadie ve a quién sigue otra persona
--   · las cantidades sí son públicas (`follow_counts`), porque no dicen quién
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. Las tablas
-- ----------------------------------------------------------------------------

-- Las dos cuelgan de `profiles` con `on delete cascade`: borrar la cuenta
-- (la 010) se lleva lo que seguías, lo que te seguía y lo que bloqueaste, sin
-- tocar esa función.
create table if not exists public.follows (
  follower_id uuid not null references public.profiles on delete cascade,
  followed_id uuid not null references public.profiles on delete cascade,
  created_at  timestamptz not null default now(),
  primary key (follower_id, followed_id),
  /* Seguirse a uno mismo no significa nada y ensucia los conteos. */
  check (follower_id <> followed_id)
);

-- La clave primaria ya sirve para "a quién sigo". Esto es para "quién me sigue".
create index if not exists follows_followed_idx on public.follows (followed_id);

create table if not exists public.blocks (
  blocker_id uuid not null references public.profiles on delete cascade,
  blocked_id uuid not null references public.profiles on delete cascade,
  created_at timestamptz not null default now(),
  primary key (blocker_id, blocked_id),
  check (blocker_id <> blocked_id)
);

create index if not exists blocks_blocked_idx on public.blocks (blocked_id);

-- ----------------------------------------------------------------------------
-- 2. ¿Hay un bloqueo entre esta persona y yo?
-- ----------------------------------------------------------------------------

-- Las políticas de `follows` y el buscador necesitan saber si hay un bloqueo
-- entre quien consulta y otra persona, en cualquiera de las dos direcciones.
-- Pero `blocks` sólo lo lee quien bloqueó. De ahí `security definer`.
--
-- Por qué una función y no un `exists` sobre `blocks` directo en el buscador:
-- `search_people` corre también sin sesión, y `anon` no tiene permiso sobre
-- `blocks`. Postgres chequea el permiso de la tabla aunque `auth.uid()` sea
-- null, así que la búsqueda sin sesión fallaría entera. Adentro de la función
-- el permiso es del dueño y sin sesión devuelve `false`.
--
-- Responde sólo sobre `auth.uid()`: "¿hay un bloqueo entre esta persona y yo?".
-- No acepta un segundo id a propósito. Con dos parámetros cualquiera podría
-- preguntar por cualquier par, y el mapa de bloqueos de todo el sitio quedaría
-- a una consulta.
--
-- Lo que sí permite es averiguar si una persona puntual te bloqueó a vos. Eso
-- no se puede evitar: intentar seguirla falla igual, y se entiende por qué.
create or replace function public.blocked_with(target uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.blocks
    where (blocker_id = target and blocked_id = auth.uid())
       or (blocker_id = auth.uid() and blocked_id = target)
  );
$$;

revoke all on function public.blocked_with(uuid) from public;
grant execute on function public.blocked_with(uuid) to anon, authenticated;

-- ----------------------------------------------------------------------------
-- 3. Row Level Security
-- ----------------------------------------------------------------------------

alter table public.follows enable row level security;
alter table public.blocks  enable row level security;

-- Se ve una fila si sos una de las dos puntas. Nadie más.
drop policy if exists follows_select_own on public.follows;
create policy follows_select_own on public.follows
  for select to authenticated
  using (auth.uid() in (follower_id, followed_id));

-- Seguir: sólo en nombre propio, y no si hay un bloqueo en el medio. Tampoco a
-- quien bloqueaste vos: seguir a alguien bloqueado es contradictorio, primero
-- se desbloquea.
drop policy if exists follows_insert_own on public.follows;
create policy follows_insert_own on public.follows
  for insert to authenticated
  with check (
    follower_id = auth.uid()
    and not public.blocked_with(followed_id)
  );

-- Dejar de seguir lo hace el que sigue. Sacarse un seguidor lo puede hacer el
-- seguido: es lo que usa bloquear para cortar las dos direcciones.
drop policy if exists follows_delete_own on public.follows;
create policy follows_delete_own on public.follows
  for delete to authenticated
  using (auth.uid() in (follower_id, followed_id));

-- Los bloqueos son de quien bloquea. El bloqueado no los ve.
drop policy if exists blocks_own on public.blocks;
create policy blocks_own on public.blocks
  for all to authenticated
  using (blocker_id = auth.uid())
  with check (blocker_id = auth.uid());

grant select, insert, delete on public.follows to authenticated;
grant select, insert, delete on public.blocks  to authenticated;

-- ----------------------------------------------------------------------------
-- 4. Bloquear corta el seguimiento
-- ----------------------------------------------------------------------------

-- En un trigger y no en el cliente para que no dependa de que el cliente se
-- acuerde: un bloqueo que deja al bloqueado siguiéndote no es un bloqueo.
-- Las dos filas tienen a quien bloquea en una punta, así que la política de
-- borrado ya lo permite; no necesita `security definer`.
create or replace function public.drop_follows_on_block()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  delete from public.follows
  where (follower_id = new.blocker_id and followed_id = new.blocked_id)
     or (follower_id = new.blocked_id and followed_id = new.blocker_id);
  return new;
end;
$$;

drop trigger if exists blocks_drop_follows on public.blocks;
create trigger blocks_drop_follows
  after insert on public.blocks
  for each row execute function public.drop_follows_on_block();

-- ----------------------------------------------------------------------------
-- 5. Cantidades
-- ----------------------------------------------------------------------------

-- Públicas y sin quiénes: "12 seguidores" no dice nada de nadie. `security
-- definer` porque las filas no son legibles por terceros, y por eso mismo
-- devuelve sólo dos números.
create or replace function public.follow_counts(target uuid)
returns table (followers bigint, following bigint)
language sql
stable
security definer
set search_path = public
as $$
  select
    (select count(*) from public.follows where followed_id = target),
    (select count(*) from public.follows where follower_id = target);
$$;

revoke all on function public.follow_counts(uuid) from public;
grant execute on function public.follow_counts(uuid) to anon, authenticated;

-- ----------------------------------------------------------------------------
-- 6. A quién sigo, con lo último que cambió
-- ----------------------------------------------------------------------------

-- La razón de seguir a alguien: ver cuándo cambió su garage. Por eso el orden
-- es por la última actualización y no por cuándo lo empezaste a seguir.
--
-- No es `security definer`: las filas de `follows` son propias, y perfiles y
-- garages ya son legibles.
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
    p.avatar_url,
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

revoke all on function public.my_following() from public;
grant execute on function public.my_following() to authenticated;

-- A quién bloqueé, con nombre, para poder deshacerlo desde Ajustes.
create or replace function public.my_blocks()
returns table (id uuid, name text, avatar_url text, blocked_at timestamptz)
language sql
stable
set search_path = public
as $$
  select p.id, p.name, p.avatar_url, b.created_at
  from public.blocks b
  join public.profiles p on p.id = b.blocked_id
  where b.blocker_id = auth.uid()
  order by b.created_at desc;
$$;

revoke all on function public.my_blocks() from public;
grant execute on function public.my_blocks() to authenticated;

-- ----------------------------------------------------------------------------
-- 7. El buscador respeta los bloqueos
-- ----------------------------------------------------------------------------

-- Misma función que la 012, con dos condiciones más: no aparece quien te
-- bloqueó, ni quien bloqueaste vos. Sin sesión `auth.uid()` es null y las dos
-- condiciones no filtran nada, que es lo correcto: no hay a quién bloquear.
--
-- Lo de siempre: esto no esconde a nadie de alguien que cierra sesión y busca
-- de nuevo. Es fricción, no un muro, y así lo dice la pantalla.
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
    p.avatar_url,
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

comment on function public.search_people(text) is
  'Busca personas por nombre para el buscador del sitio. Respeta discoverable y bloqueos, escapa los comodines de LIKE y topea en 20.';

revoke all on function public.search_people(text) from public;
grant execute on function public.search_people(text) to anon, authenticated;
