-- ============================================================================
-- Aparecer (o no) en el buscador de personas
--
-- Pegalo en Supabase → SQL Editor → Run. Es idempotente.
--
-- Hasta acá el garage era público pero no listado: existía si alguien te
-- pasaba el link. El buscador de personas cambia eso — pasa a ser encontrable
-- escribiendo un nombre. No es lo mismo, y hay gente que subió la foto de su
-- auto, con patente, asumiendo lo primero.
--
-- Así que la vuelta atrás tiene que existir antes que el buscador, no después.
--
-- Qué apaga `discoverable`:
--   · el buscador de personas del sitio
--   · el sitemap
--   · la indexación (el worker manda `noindex` en ese garage)
--
-- Qué NO apaga, a propósito:
--   · el link directo. `/g/<id>` sigue funcionando para quien lo tenga. Eso es
--     lo que el garage es, y apagarlo sería otra función —"garage privado"—,
--     no esta.
--   · los avisos. El que publica un auto se muestra como vendedor; eso no se
--     negocia desde acá, se negocia despublicando.
--
-- Honestidad sobre el alcance: `profiles` sigue teniendo `select` por columna
-- para `anon`, así que nombre y ciudad se pueden leer en bloque con la anon
-- key, como desde siempre. Esto no cierra eso —lo cerraría mover cada lectura
-- de perfil a funciones, que es otro trabajo— y tampoco lo empeora: el
-- buscador no agrega ninguna capacidad que la API no tuviera. Lo que cambia es
-- qué es normal, no qué es posible. Por eso el interruptor manda donde sí
-- alcanza: nuestro buscador y Google.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. La columna
-- ----------------------------------------------------------------------------

-- Arranca en `true`: el garage ya era público e indexable antes de esto, así
-- que nacer apagado le cambiaría el trato a todos los que ya lo cargaron.
alter table public.profiles
  add column if not exists discoverable boolean not null default true;

comment on column public.profiles.discoverable is
  'Si aparece en el buscador de personas, en el sitemap y en Google. El link directo al garage funciona igual.';

-- ----------------------------------------------------------------------------
-- 2. Hacerla legible
-- ----------------------------------------------------------------------------

-- Sin esto la columna no se lee. La 008 sacó el `select` de tabla y volvió a
-- darlo columna por columna, justamente para que una columna nueva nazca
-- ilegible hasta que alguien la agregue acá — falla cerrado. Este es el paso
-- que esa decisión pide.
--
-- Se repite la lista entera y no sólo la nueva porque `grant` es acumulativo:
-- nombrarlas todas deja el estado explícito en un solo lugar.
grant select (
  id, name, avatar_url, seller_type, city, province, verified, created_at,
  discoverable
) on public.profiles to anon, authenticated;

-- La escribe el dueño desde Ajustes. `profiles_update_own` ya limita la fila;
-- esto limita la columna, que es lo que `update` mira.
grant update (discoverable) on public.profiles to authenticated;

-- ----------------------------------------------------------------------------
-- 3. Nombres comparables
-- ----------------------------------------------------------------------------

-- Buscar "martin" tiene que encontrar a "Martín", y "nunez" a "Núñez". En
-- Argentina eso no es un detalle: es la mitad de los apellidos.
--
-- Se hace con `translate` y no con la extensión `unaccent` a propósito. En
-- Supabase las extensiones viven en el esquema `extensions`, así que
-- `unaccent()` hay que calificarla, y encima no es inmutable —depende del
-- diccionario instalado—, con lo cual no se puede indexar sin envolverla y
-- mentir sobre su volatilidad. `translate` es inmutable de verdad, no necesita
-- ninguna extensión, y el castellano entra entero en una línea.
create or replace function public.name_key(value text)
returns text
language sql
immutable
parallel safe
as $$
  select lower(translate(
    coalesce(value, ''),
    'áàäâãéèëêíìïîóòöôõúùüûñçÁÀÄÂÃÉÈËÊÍÌÏÎÓÒÖÔÕÚÙÜÛÑÇ',
    'aaaaaeeeeiiiiooooouuuuncAAAAAEEEEIIIIOOOOOUUUUNC'
  ));
$$;

comment on function public.name_key(text) is
  'Nombre normalizado para buscar: sin acentos y en minúscula. Inmutable, para poder indexarla.';

-- Sin índice a propósito. La búsqueda es `like '%algo%'`, que ningún btree
-- resuelve, así que haría falta un GIN de trigramas con `pg_trgm` — otra
-- extensión en `extensions`, con su operator class a calificar. Con la
-- cantidad de perfiles de hoy el recorrido secuencial sobra. Cuando empiece a
-- notarse, lo que hay que agregar es exactamente esto:
--
--   create extension if not exists pg_trgm with schema extensions;
--   create index profiles_name_search_idx on public.profiles
--     using gin (public.name_key(name) extensions.gin_trgm_ops)
--     where discoverable;

-- ----------------------------------------------------------------------------
-- 4. La búsqueda
-- ----------------------------------------------------------------------------

-- Va como función y no como consulta suelta desde el cliente por tres razones,
-- ninguna de seguridad:
--
--   1. Trae la cuenta de autos del garage en la misma vuelta. Sin eso hacen
--      falta dos consultas, o una con embed que no se puede ordenar por la
--      cuenta.
--   2. El orden vive acá. Primero el que empieza con lo que escribiste, después
--      el que lo contiene, y entre iguales el que tiene el garage más armado —
--      que es el que la persona que busca quería encontrar.
--   3. El tope es del servidor. Un `limit` que manda el cliente es un `limit`
--      que el cliente puede sacar.
--
-- No es `security definer`: todas las columnas que toca ya son legibles, así
-- que darle privilegios extra sería regalar alcance sin comprar nada.
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
  )
  select
    p.id,
    p.name,
    p.avatar_url,
    p.city,
    p.province,
    coalesce(g.cars, 0) as garage_cars
  from public.profiles p
  cross join needle n
  left join (
    select user_id, count(*) as cars
    from public.garage_entries
    group by user_id
  ) g on g.user_id = p.id
  where p.discoverable
    /* Menos de dos letras devuelve media base y no ayuda a nadie. */
    and length(n.key) >= 2
    /* `like` y no `ilike`: los dos lados ya vienen en minúscula. */
    and public.name_key(p.name) like '%' || n.key || '%'
  order by
    /* El que arranca con lo que escribiste va primero. */
    (public.name_key(p.name) like n.key || '%') desc,
    coalesce(g.cars, 0) desc,
    p.name
  limit 20;
$$;

comment on function public.search_people(text) is
  'Busca personas por nombre para el buscador del sitio. Respeta discoverable y topea en 20.';

revoke all on function public.search_people(text) from public;
grant execute on function public.search_people(text) to anon, authenticated;

-- ----------------------------------------------------------------------------
-- 5. Los garages que van al sitemap
-- ----------------------------------------------------------------------------

-- Sólo los que se dejan encontrar y además tienen algo adentro. Un garage
-- vacío es una página sin contenido: no le sirve a quien la abre desde Google
-- ni al sitio, que gastaría presupuesto de rastreo en nada.
create or replace view public.garage_sitemap
with (security_invoker = on)
as
select
  p.id               as user_id,
  max(g.updated_at)  as updated_at
from public.profiles p
join public.garage_entries g on g.user_id = p.id
where p.discoverable
group by p.id;

grant select on public.garage_sitemap to anon, authenticated;
