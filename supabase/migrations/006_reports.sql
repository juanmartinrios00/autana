-- ============================================================================
-- Reportes de publicaciones y moderación.
--
-- Pegalo en Supabase → SQL Editor → Run. Es idempotente.
--
-- El problema que resuelve: hoy no hay forma de avisar que un aviso es una
-- estafa, y tampoco de sacarlo. Un clasificado sin eso se pudre solo.
--
-- Tres decisiones que conviene tener presentes:
--
-- 1. Reportar exige cuenta. Sin identidad, un script manda mil reportes y el
--    sistema no sirve para nada. Además el bloqueo automático cuenta personas
--    distintas, y para eso hay que saber quién es quién.
--
-- 2. El estado `blocked` es distinto de `paused`. Pausar lo hace el vendedor y
--    lo puede deshacer cuando quiera; si un aviso reportado quedara "pausado",
--    el que abusa lo reactiva desde su panel y volvemos al principio. Un aviso
--    bloqueado su dueño no lo puede tocar — sólo borrarlo, que también nos
--    sirve.
--
-- 3. `role` no se toca desde la aplicación. Se hace admin a alguien con un
--    UPDATE acá; no hay pantalla que lo permita, y así no hay forma de que
--    alguien se ascienda solo.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- Quién modera
-- ----------------------------------------------------------------------------

alter table public.profiles
  add column if not exists role text not null default 'user'
    check (role in ('user', 'admin'));

comment on column public.profiles.role is
  'Sólo se cambia por SQL. No hay pantalla que ascienda a nadie.';

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer set search_path = public
as $$
  select exists (
    select 1 from public.profiles
     where id = auth.uid() and role = 'admin'
  );
$$;

-- ----------------------------------------------------------------------------
-- El estado bloqueado
-- ----------------------------------------------------------------------------

-- El constraint viejo se busca por lo que dice, no por como se llama. Si el
-- nombre no fuera exactamente el que esperamos, un `drop ... if exists` no
-- haria nada, el constraint viejo sobreviviria y rechazaria 'blocked' — con el
-- agravante de que todo lo demas parece funcionar hasta que alguien bloquea.
do $$
declare
  c record;
begin
  for c in
    select conname
      from pg_constraint
     where conrelid = 'public.listings'::regclass
       and contype = 'c'
       and pg_get_constraintdef(oid) ilike '%status%'
  loop
    execute format('alter table public.listings drop constraint %I', c.conname);
  end loop;
end
$$;

alter table public.listings add constraint listings_status_check
  check (status in ('draft', 'active', 'paused', 'sold', 'blocked'));

-- ----------------------------------------------------------------------------
-- Reportes
-- ----------------------------------------------------------------------------

create table if not exists public.reports (
  id          uuid primary key default gen_random_uuid(),
  listing_id  uuid not null references public.listings on delete cascade,
  -- Si el que reportó borra su cuenta, el reporte queda: la denuncia sigue
  -- siendo información válida sobre el aviso.
  reporter_id uuid references public.profiles on delete set null,
  reason      text not null check (
    reason in ('scam', 'sold', 'duplicate', 'wrong_data', 'offensive', 'other')
  ),
  detail      text not null default '',
  created_at  timestamptz not null default now()
);

-- Uno por persona y por aviso: sin esto, alguien solo puede hundir un aviso
-- reportándolo tres veces.
create unique index if not exists reports_one_per_person
  on public.reports (listing_id, reporter_id);

create index if not exists reports_listing_idx on public.reports (listing_id);

alter table public.reports enable row level security;

-- Cualquiera con cuenta reporta, y sólo a nombre propio.
drop policy if exists reports_insert_own on public.reports;
create policy reports_insert_own on public.reports
  for insert to authenticated
  with check (auth.uid() = reporter_id);

-- Los reportes los lee quien modera. El que reportó ve el suyo, para que la
-- pantalla pueda decirle "ya reportaste este aviso".
drop policy if exists reports_select on public.reports;
create policy reports_select on public.reports
  for select using (auth.uid() = reporter_id or public.is_admin());

drop policy if exists reports_delete_admin on public.reports;
create policy reports_delete_admin on public.reports
  for delete using (public.is_admin());

-- ----------------------------------------------------------------------------
-- Bloqueo automático
--
-- Tres personas distintas es a propósito conservador: con dos, dos competidores
-- coordinados bajan un aviso legítimo. No reemplaza la revisión humana, le gana
-- tiempo — el aviso deja de verse mientras alguien lo mira.
-- ----------------------------------------------------------------------------

create or replace function public.auto_block_reported()
returns trigger
language plpgsql
security definer set search_path = public
as $$
declare
  reporters int;
begin
  select count(distinct reporter_id) into reporters
    from public.reports
   where listing_id = new.listing_id;

  if reporters >= 3 then
    update public.listings
       set status = 'blocked'
     where id = new.listing_id
       and status <> 'blocked';
  end if;

  return new;
end;
$$;

drop trigger if exists reports_auto_block on public.reports;
create trigger reports_auto_block
  after insert on public.reports
  for each row execute function public.auto_block_reported();

-- ----------------------------------------------------------------------------
-- Políticas de listings, actualizadas
-- ----------------------------------------------------------------------------

-- Quien modera ve todo, incluidos los bloqueados y los borradores ajenos.
drop policy if exists listings_select_public on public.listings;
create policy listings_select_public on public.listings
  for select using (
    status = 'active' or auth.uid() = seller_id or public.is_admin()
  );

-- El dueño edita lo suyo, salvo que esté bloqueado: ahí no lo puede reactivar
-- ni maquillar. Borrarlo sí puede, y que lo haga.
drop policy if exists listings_update_own on public.listings;
create policy listings_update_own on public.listings
  for update
  using (auth.uid() = seller_id and status <> 'blocked')
  with check (auth.uid() = seller_id and status <> 'blocked');

drop policy if exists listings_update_admin on public.listings;
create policy listings_update_admin on public.listings
  for update using (public.is_admin()) with check (public.is_admin());

drop policy if exists listings_delete_admin on public.listings;
create policy listings_delete_admin on public.listings
  for delete using (public.is_admin());

-- ----------------------------------------------------------------------------
-- Para hacerte admin a vos, corré esto con tu mail:
--
--   update public.profiles set role = 'admin'
--    where id = (select id from auth.users where email = 'TU@MAIL.COM');
-- ----------------------------------------------------------------------------
