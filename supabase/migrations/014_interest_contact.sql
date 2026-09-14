-- ============================================================================
-- "Me interesa", y los datos de contacto de cada perfil
--
-- Pegalo en Supabase → SQL Editor → Run. Es idempotente.
--
-- Qué cambia:
--
--   · Cada perfil puede cargar, opcionales, Instagram y un mail de contacto,
--     además del WhatsApp que ya tenía.
--   · En un aviso, el contacto se ve tocando "Me interesa". Pide cuenta. Cada
--     persona cuenta una vez por aviso, el dueño no cuenta, y la cantidad es
--     pública: "a 12 personas les interesa este vehículo".
--   · En el perfil, Instagram lo ve cualquiera. WhatsApp y mail, sólo con
--     sesión.
--   · Juntar contactos tiene tope: 30 personas nuevas por día por cuenta, sumando
--     avisos y perfiles.
--
-- Por qué así, y no todo público. La 008 sacó el WhatsApp de la lectura pública
-- porque "una lista de nombre + celular + ciudad de Argentina tiene comprador
-- directo". Poner el WhatsApp y el mail en cada perfil, legibles como el
-- nombre, deshacía eso: la lista entera volvía a estar a una consulta. Con
-- esto, sacar un contacto cuesta una cuenta, queda registrado, y tiene techo.
-- Un raspador decidido puede abrir muchas cuentas; lo que ya no puede es bajar
-- todo de una vez y sin dejar rastro.
--
-- Instagram va aparte y público porque ya lo es: el perfil de Instagram de
-- alguien se encuentra por su nombre de usuario sin pasar por acá.
--
-- El mail de contacto NO es el de la cuenta. El de la cuenta vive en
-- `auth.users`, es la llave para entrar y nunca se muestra. Este lo pone cada
-- uno si quiere que le escriban.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. Los datos nuevos del perfil
-- ----------------------------------------------------------------------------

alter table public.profiles add column if not exists instagram text;
alter table public.profiles add column if not exists contact_email text;

-- La forma se valida también acá y no sólo en el formulario: lo que llega por
-- la API sin pasar por la pantalla tiene que respetar lo mismo. El usuario de
-- Instagram va sin `@` ni link, que es lo que se guarda; el link se arma al
-- mostrarlo.
alter table public.profiles drop constraint if exists profiles_instagram_format;
alter table public.profiles add constraint profiles_instagram_format
  check (instagram is null or instagram ~ '^[A-Za-z0-9._]{1,30}$');

alter table public.profiles drop constraint if exists profiles_contact_email_format;
alter table public.profiles add constraint profiles_contact_email_format
  check (
    contact_email is null
    or (length(contact_email) <= 254 and contact_email ~ '^[^@\s]+@[^@\s]+\.[^@\s]+$')
  );

-- Instagram se suma a las columnas legibles. `whatsapp` y `contact_email` no
-- están, a propósito: la 008 dejó que una columna nueva nazca ilegible, y así se
-- quedan. Se leen por las funciones de abajo.
grant select (
  id, name, avatar_url, seller_type, city, province, verified, created_at,
  discoverable, instagram
) on public.profiles to anon, authenticated;

-- ----------------------------------------------------------------------------
-- 2. El tope para juntar contactos
-- ----------------------------------------------------------------------------

-- Cada vez que alguien obtiene el contacto de una persona nueva queda una fila.
-- Volver a ver a alguien que ya viste no suma: el tope es de personas, no de
-- clics.
create table if not exists public.contact_reveals (
  viewer_id   uuid not null references public.profiles on delete cascade,
  target_id   uuid not null references public.profiles on delete cascade,
  revealed_at timestamptz not null default now(),
  primary key (viewer_id, target_id)
);

create index if not exists contact_reveals_recent_idx
  on public.contact_reveals (viewer_id, revealed_at);

-- Nadie la lee ni la escribe directo: sólo las funciones de acá. RLS prendido y
-- sin políticas es "cerrado para todos"; el `revoke` lo dice además en voz alta,
-- porque Supabase le da permisos por defecto a `anon` y `authenticated` sobre
-- toda tabla nueva.
alter table public.contact_reveals enable row level security;
revoke all on public.contact_reveals from anon, authenticated;

-- Deja pasar y anota, o corta. Devuelve sin hacer nada si ya se había visto a
-- esa persona.
--
-- 30 por día alcanza de sobra para alguien que está buscando auto —nadie le
-- escribe a treinta vendedores distintos en un día— y para un raspador es
-- nada. El error sale con código `PT429`: PostgREST lo traduce a HTTP 429, y el
-- cliente lo reconoce para decir qué pasó en vez de un error genérico.
create or replace function public.take_contact_reveal(target uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
  recent int;
begin
  if target = uid then
    return;
  end if;

  if exists (select 1 from public.contact_reveals where viewer_id = uid and target_id = target) then
    return;
  end if;

  select count(*) into recent
    from public.contact_reveals
   where viewer_id = uid and revealed_at > now() - interval '24 hours';

  if recent >= 30 then
    raise exception 'Llegaste al máximo de contactos nuevos por hoy. Probá de nuevo mañana.'
      using errcode = 'PT429', hint = 'contact_limit';
  end if;

  insert into public.contact_reveals (viewer_id, target_id) values (uid, target)
    on conflict do nothing;
end;
$$;

-- Es interna: la llaman las funciones de abajo, que corren como el dueño. Desde
-- el cliente no tiene sentido llamarla sola.
revoke all on function public.take_contact_reveal(uuid) from public, anon, authenticated;

-- ----------------------------------------------------------------------------
-- 3. "Me interesa"
-- ----------------------------------------------------------------------------

create table if not exists public.listing_interests (
  user_id    uuid not null references public.profiles on delete cascade,
  listing_id uuid not null references public.listings on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, listing_id)
);

create index if not exists listing_interests_listing_idx on public.listing_interests (listing_id);

-- Cada uno ve los suyos, para que el botón diga "Te interesa". Nadie ve quién
-- más tocó: el vendedor ve cuántos, no quiénes. Escribir, sólo por
-- `express_interest`, que es la que controla el tope.
alter table public.listing_interests enable row level security;

drop policy if exists listing_interests_select_own on public.listing_interests;
create policy listing_interests_select_own on public.listing_interests
  for select to authenticated
  using (user_id = auth.uid());

revoke all on public.listing_interests from anon, authenticated;
grant select on public.listing_interests to authenticated;

-- El número público. Una columna mantenida por trigger, igual que
-- `favorite_count` en la 004: se lee con el aviso en el mismo `select`, sin una
-- consulta más por cada caja del listado.
alter table public.listings add column if not exists interest_count int not null default 0;

create or replace function public.sync_interest_count()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op = 'INSERT' then
    update public.listings set interest_count = interest_count + 1 where id = new.listing_id;
    return new;
  end if;

  /* Baja cuando se borra la cuenta de alguien que había tocado: la cascada
     borra la fila y el número tiene que acompañar. */
  update public.listings
     set interest_count = greatest(interest_count - 1, 0)
   where id = old.listing_id;
  return old;
end;
$$;

drop trigger if exists listing_interests_sync_count on public.listing_interests;
create trigger listing_interests_sync_count
  after insert or delete on public.listing_interests
  for each row execute function public.sync_interest_count();

-- Tocar "Me interesa": anota el interés y devuelve el contacto.
--
-- Es una sola función y no dos pasos a propósito. Si mostrar el contacto y
-- sumar al contador fueran llamadas separadas, se podría pedir el contacto sin
-- sumar, y el número dejaría de decir cuánta gente contactó.
--
-- Sólo avisos activos: uno pausado o vendido no tiene a quién contactar.
create or replace function public.express_interest(p_slug text)
returns table (
  seller_name    text,
  whatsapp       text,
  instagram      text,
  contact_email  text,
  interest_count int
)
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
  found_listing record;
begin
  if uid is null then
    raise exception 'Hay que tener la sesión iniciada para ver el contacto.'
      using errcode = '42501';
  end if;

  select l.id, l.seller_id into found_listing
    from public.listings l
   where l.slug = p_slug and l.status = 'active';

  if not found then
    return;
  end if;

  /* El dueño mirando su propio aviso no suma, ni gasta tope. */
  if found_listing.seller_id <> uid then
    perform public.take_contact_reveal(found_listing.seller_id);
    insert into public.listing_interests (user_id, listing_id)
      values (uid, found_listing.id)
      on conflict do nothing;
  end if;

  return query
    select p.name, p.whatsapp, p.instagram, p.contact_email, l.interest_count
      from public.profiles p
      join public.listings l on l.id = found_listing.id
     where p.id = found_listing.seller_id;
end;
$$;

revoke all on function public.express_interest(text) from public, anon;
grant execute on function public.express_interest(text) to authenticated;

-- ----------------------------------------------------------------------------
-- 4. El contacto en el perfil
-- ----------------------------------------------------------------------------

-- WhatsApp y mail de una persona, para quien tiene sesión. Gasta tope sólo si
-- hay algo que mostrar: pedir el contacto de alguien que no cargó nada no le da
-- nada al que pregunta, así que no le cobra.
create or replace function public.profile_contact(target uuid)
returns table (whatsapp text, contact_email text)
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
  wa text;
  mail text;
begin
  if uid is null then
    raise exception 'Hay que tener la sesión iniciada para ver el contacto.'
      using errcode = '42501';
  end if;

  select p.whatsapp, p.contact_email into wa, mail
    from public.profiles p
   where p.id = target;

  if wa is null and mail is null then
    return;
  end if;

  perform public.take_contact_reveal(target);
  return query select wa, mail;
end;
$$;

revoke all on function public.profile_contact(uuid) from public, anon;
grant execute on function public.profile_contact(uuid) to authenticated;

-- Los propios, para el formulario de Ajustes. Sin parámetro: `auth.uid()` lo
-- resuelve, así que no hay forma de pedir los de otro.
create or replace function public.my_contact()
returns table (whatsapp text, instagram text, contact_email text)
language sql
stable
security definer
set search_path = public
as $$
  select p.whatsapp, p.instagram, p.contact_email
    from public.profiles p
   where p.id = auth.uid();
$$;

revoke all on function public.my_contact() from public, anon;
grant execute on function public.my_contact() to authenticated;

-- ----------------------------------------------------------------------------
-- 5. El camino viejo se cierra
-- ----------------------------------------------------------------------------

-- `listing_whatsapp` daba el número de un aviso sin sesión. Si quedara abierta,
-- el requisito de cuenta de "Me interesa" no serviría de nada: el número se
-- sacaría por acá, sin tope y sin sumar al contador. La función queda —no rompe
-- a nadie que la tenga en caché— pero nadie la puede llamar.
revoke execute on function public.listing_whatsapp(text) from public, anon, authenticated;
