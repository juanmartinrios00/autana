-- ============================================================================
-- Autana — schema inicial
--
-- Cómo aplicarlo: Supabase → SQL Editor → New query → pegar todo → Run.
-- Es idempotente: se puede correr de nuevo sin romper nada.
--
-- Dos decisiones que conviene tener presentes:
--
-- 1. `profiles` ES el vendedor. No hay tabla `sellers` aparte. Para esta
--    versión cada usuario que publica es un vendedor, y separarlos agregaba
--    un join y políticas de acceso extra sin comprar nada. Si algún día una
--    concesionaria necesita varios usuarios, ahí se separa.
--
-- 2. Los enums son `text` con CHECK, no tipos ENUM de Postgres. Agregar un
--    valor a un ENUM exige una migración; a un CHECK, no. Y los valores son
--    exactamente los mismos que las uniones de TypeScript en src/types.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- Perfiles
-- ----------------------------------------------------------------------------

create table if not exists public.profiles (
  id           uuid primary key references auth.users on delete cascade,
  name         text not null default '',
  avatar_url   text,
  seller_type  text not null default 'private' check (seller_type in ('dealer', 'private')),
  city         text,
  province     text,
  -- En formato local; el link de wa.me se arma en el cliente.
  whatsapp     text,
  verified     boolean not null default false,
  created_at   timestamptz not null default now()
);

comment on table public.profiles is 'Usuario y vendedor a la vez. Se crea solo al registrarse.';

-- ----------------------------------------------------------------------------
-- Publicaciones
-- ----------------------------------------------------------------------------

create table if not exists public.listings (
  id             uuid primary key default gen_random_uuid(),
  slug           text unique not null,
  seller_id      uuid not null references public.profiles on delete cascade,

  make           text not null,
  model          text not null,
  trim           text,
  year           int  not null check (year between 1950 and 2100),

  price          int  not null check (price > 0),
  currency       text not null default 'USD' check (currency in ('USD', 'ARS')),
  negotiable     boolean not null default false,

  mileage        int  not null check (mileage >= 0),
  condition      text not null check (condition in ('new', 'used', 'certified')),
  fuel_type      text not null check (fuel_type in ('petrol', 'diesel', 'hybrid', 'electric', 'gnc')),
  transmission   text not null check (transmission in ('manual', 'automatic', 'cvt')),
  drivetrain     text check (drivetrain in ('fwd', 'rwd', 'awd', '4x4')),
  body_type      text not null check (body_type in ('sedan', 'suv', 'hatchback', 'pickup', 'coupe', 'van')),
  engine         text,
  power          int,
  doors          int,
  color          text,

  city           text not null,
  province       text not null,
  description    text not null default '',

  status         text not null default 'draft' check (status in ('draft', 'active', 'paused', 'sold')),
  view_count     int  not null default 0,
  favorite_count int  not null default 0,

  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);

-- Índices para los filtros que realmente se usan en /cars.
create index if not exists listings_browse_idx on public.listings (status, created_at desc);
create index if not exists listings_make_model_idx on public.listings (make, model);
create index if not exists listings_price_idx on public.listings (price);
create index if not exists listings_year_idx on public.listings (year);
create index if not exists listings_seller_idx on public.listings (seller_id);

-- ----------------------------------------------------------------------------
-- Fotos
--
-- Se guarda la ruta dentro del bucket, no la URL completa: si algún día
-- cambiamos de proveedor de storage, las filas siguen sirviendo.
-- ----------------------------------------------------------------------------

create table if not exists public.listing_images (
  id         uuid primary key default gen_random_uuid(),
  listing_id uuid not null references public.listings on delete cascade,
  path       text not null,
  position   int  not null default 0,
  created_at timestamptz not null default now()
);

create index if not exists listing_images_listing_idx
  on public.listing_images (listing_id, position);

-- ----------------------------------------------------------------------------
-- Favoritos y búsquedas guardadas
-- ----------------------------------------------------------------------------

create table if not exists public.favorites (
  user_id    uuid not null references public.profiles on delete cascade,
  listing_id uuid not null references public.listings on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, listing_id)
);

create table if not exists public.saved_searches (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references public.profiles on delete cascade,
  name       text not null,
  -- La query string tal cual va en la URL de /cars. Una sola representación.
  query      text not null,
  notify     boolean not null default false,
  created_at timestamptz not null default now()
);

-- ----------------------------------------------------------------------------
-- Triggers
-- ----------------------------------------------------------------------------

-- Crea el perfil apenas se registra el usuario, sin que el cliente tenga que
-- acordarse de hacerlo.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, name)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'name', split_part(new.email, '@', 1))
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

create or replace function public.touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists listings_touch_updated_at on public.listings;
create trigger listings_touch_updated_at
  before update on public.listings
  for each row execute function public.touch_updated_at();

-- ----------------------------------------------------------------------------
-- Row Level Security
--
-- Esto es lo que hace que la anon key sea segura de exponer en el navegador.
-- Sin RLS, esa clave deja leer y escribir cualquier cosa.
-- ----------------------------------------------------------------------------

alter table public.profiles       enable row level security;
alter table public.listings       enable row level security;
alter table public.listing_images enable row level security;
alter table public.favorites      enable row level security;
alter table public.saved_searches enable row level security;

-- Perfiles: los ve cualquiera (hay que mostrar quién vende), los edita el dueño.
drop policy if exists profiles_select on public.profiles;
create policy profiles_select on public.profiles
  for select using (true);

drop policy if exists profiles_insert_own on public.profiles;
create policy profiles_insert_own on public.profiles
  for insert with check (auth.uid() = id);

drop policy if exists profiles_update_own on public.profiles;
create policy profiles_update_own on public.profiles
  for update using (auth.uid() = id) with check (auth.uid() = id);

-- Publicaciones: las activas las ve cualquiera; el dueño ve también sus
-- borradores y pausadas.
drop policy if exists listings_select_public on public.listings;
create policy listings_select_public on public.listings
  for select using (status = 'active' or auth.uid() = seller_id);

drop policy if exists listings_insert_own on public.listings;
create policy listings_insert_own on public.listings
  for insert with check (auth.uid() = seller_id);

drop policy if exists listings_update_own on public.listings;
create policy listings_update_own on public.listings
  for update using (auth.uid() = seller_id) with check (auth.uid() = seller_id);

drop policy if exists listings_delete_own on public.listings;
create policy listings_delete_own on public.listings
  for delete using (auth.uid() = seller_id);

-- Fotos: se ven si se ve la publicación, y las maneja el dueño de esa
-- publicación.
drop policy if exists listing_images_select on public.listing_images;
create policy listing_images_select on public.listing_images
  for select using (
    exists (
      select 1 from public.listings l
      where l.id = listing_id and (l.status = 'active' or l.seller_id = auth.uid())
    )
  );

drop policy if exists listing_images_write_own on public.listing_images;
create policy listing_images_write_own on public.listing_images
  for all using (
    exists (select 1 from public.listings l where l.id = listing_id and l.seller_id = auth.uid())
  ) with check (
    exists (select 1 from public.listings l where l.id = listing_id and l.seller_id = auth.uid())
  );

-- Favoritos y búsquedas guardadas: privados, solo del dueño.
drop policy if exists favorites_own on public.favorites;
create policy favorites_own on public.favorites
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists saved_searches_own on public.saved_searches;
create policy saved_searches_own on public.saved_searches
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- ----------------------------------------------------------------------------
-- Storage
--
-- Bucket público de lectura: las fotos de un auto en venta son públicas por
-- definición. Escribir solo puede el dueño, y solo dentro de su carpeta:
-- listing-photos/<user_id>/<lo que sea>.
-- ----------------------------------------------------------------------------

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'listing-photos',
  'listing-photos',
  true,
  5242880,
  array['image/webp', 'image/jpeg', 'image/png']
)
on conflict (id) do update
  set public = excluded.public,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists listing_photos_read on storage.objects;
create policy listing_photos_read on storage.objects
  for select using (bucket_id = 'listing-photos');

drop policy if exists listing_photos_write_own on storage.objects;
create policy listing_photos_write_own on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'listing-photos'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists listing_photos_delete_own on storage.objects;
create policy listing_photos_delete_own on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'listing-photos'
    and (storage.foldername(name))[1] = auth.uid()::text
  );
