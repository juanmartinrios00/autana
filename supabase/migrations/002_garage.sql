-- ============================================================================
-- Garage virtual
--
-- Pegalo en Supabase → SQL Editor → Run. Es idempotente.
--
-- Cada usuario tiene cuatro espacios, uno por consigna. La consigna es el
-- producto: "mi primer auto" hace que alguien se siente a completarlo, "auto 1"
-- no. Por eso el slot es un valor cerrado y no texto libre.
--
-- La foto la sube el usuario y se guarda como ruta dentro del bucket, igual
-- que las de las publicaciones. Nadie modela nada en 3D ni se usan imágenes de
-- las marcas: eso evita el problema de marcas registradas y el costo de
-- assets, y además la foto real del auto de alguien emociona más que un modelo
-- genérico.
-- ============================================================================

create table if not exists public.garage_entries (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references public.profiles on delete cascade,

  slot       text not null check (slot in ('first', 'current', 'dream', 'missed')),

  make       text not null,
  model      text not null,
  year       int check (year between 1900 and 2100),
  /* Ruta dentro del bucket. Vacío = se muestra el placeholder neutro. */
  photo_path text,
  note       text not null default '',

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  /* Un auto por consigna: el garage es una historia, no una lista. */
  unique (user_id, slot)
);

create index if not exists garage_entries_user_idx on public.garage_entries (user_id);

drop trigger if exists garage_touch_updated_at on public.garage_entries;
create trigger garage_touch_updated_at
  before update on public.garage_entries
  for each row execute function public.touch_updated_at();

-- ----------------------------------------------------------------------------
-- Row Level Security
--
-- El garage se ve público: esa es la gracia, se comparte por WhatsApp. Sólo el
-- dueño lo edita.
-- ----------------------------------------------------------------------------

alter table public.garage_entries enable row level security;

drop policy if exists garage_select on public.garage_entries;
create policy garage_select on public.garage_entries
  for select using (true);

drop policy if exists garage_write_own on public.garage_entries;
create policy garage_write_own on public.garage_entries
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- ----------------------------------------------------------------------------
-- Storage
--
-- Bucket propio, con las mismas reglas que el de publicaciones: lectura
-- pública, y cada usuario escribe sólo dentro de su carpeta.
-- ----------------------------------------------------------------------------

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'garage-photos',
  'garage-photos',
  true,
  5242880,
  array['image/webp', 'image/jpeg', 'image/png']
)
on conflict (id) do update
  set public = excluded.public,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists garage_photos_read on storage.objects;
create policy garage_photos_read on storage.objects
  for select using (bucket_id = 'garage-photos');

drop policy if exists garage_photos_write_own on storage.objects;
create policy garage_photos_write_own on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'garage-photos'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists garage_photos_update_own on storage.objects;
create policy garage_photos_update_own on storage.objects
  for update to authenticated
  using (
    bucket_id = 'garage-photos'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists garage_photos_delete_own on storage.objects;
create policy garage_photos_delete_own on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'garage-photos'
    and (storage.foldername(name))[1] = auth.uid()::text
  );
