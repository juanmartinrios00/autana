-- ============================================================================
-- La señal de confianza que ve el comprador.
--
-- Pegalo en Supabase → SQL Editor → Run. Es idempotente.
--
-- El problema que resuelve: hasta ahora, lo que aparecía junto al precio en
-- cada aviso era el nivel del vendedor — "Fierrero", "Referente". Ese nivel se
-- gana, entre otras cosas, cargando autos en el garage, que es una sección de
-- nostalgia: el primer auto, el que más se extraña. No dice absolutamente nada
-- sobre si es seguro encontrarse con esa persona a entregarle plata.
--
-- Un comprador no lee esa diferencia. Lee un sello lindo al lado del precio y
-- asume que significa algo sobre el vendedor. Así que el nivel vuelve a ser lo
-- que es —un juego, y se queda en el perfil— y al comprador se le muestran
-- hechos.
--
-- Los dos hechos son `verified`, que lo pone una persona a mano, y hace cuánto
-- existe la cuenta. La antigüedad parece poca cosa en un marketplace nuevo,
-- donde todos se registraron el mes pasado, pero es justamente lo que no se
-- puede falsificar apurado: una cuenta creada ayer que publica un auto caro es
-- exactamente lo que conviene que el comprador note.
--
-- Lo que NO se expone acá, a propósito: la cantidad de reportes en contra. Son
-- acusaciones que todavía no revisó nadie, y publicarlas le daría a dos
-- competidores coordinados una forma de ensuciar a alguien sin que haya pasado
-- por moderación. Para eso está el bloqueo, que sí saca el aviso de la vista.
-- ============================================================================

-- Va `drop` y no `create or replace`, que es lo que uno escribiría.
--
-- `create or replace view` sólo sabe AGREGAR columnas al final: no puede
-- insertarlas en el medio, ni renombrarlas, ni reordenarlas. Como acá los dos
-- campos nuevos entran después de `city`, Postgres ve que la quinta columna
-- pasa de llamarse `active_listings` a `verified` y falla con
--
--   42P16: cannot change name of view column "active_listings" to "verified"
--
-- Se podría esquivar poniendo las columnas nuevas al final, pero eso deja el
-- orden de la vista dependiendo del orden en que se corrieron las migraciones,
-- y la próxima que agregue una columna se vuelve a encontrar con lo mismo.
-- Tirarla y rehacerla da el mismo resultado siempre, corra sobre lo que corra.
--
-- Es seguro: no hay ninguna otra vista ni función que dependa de ésta —si la
-- hubiera, el `drop` fallaría en vez de romper algo en silencio— y el `grant`
-- del final la vuelve a dejar legible, que es lo único que el `drop` se lleva.
drop view if exists public.profile_stats;

create view public.profile_stats
with (security_invoker = on)
as
select
  p.id                             as user_id,
  p.name,
  p.whatsapp,
  p.city,
  -- Los dos campos de confianza. `verified` lo pone una persona; `created_at`
  -- no lo pone nadie.
  p.verified,
  p.created_at,
  coalesce(l.active_listings, 0)   as active_listings,
  -- Fotos de la publicación que más tiene, para el logro de aviso completo.
  coalesce(l.best_photos, 0)       as best_photos,
  coalesce(g.garage_cars, 0)       as garage_cars
from public.profiles p

left join (
  select
    li.seller_id,
    count(*)      as active_listings,
    max(img.n)    as best_photos
  from public.listings li
  left join lateral (
    select count(*) as n
    from public.listing_images
    where listing_id = li.id
  ) img on true
  where li.status = 'active'
  group by li.seller_id
) l on l.seller_id = p.id

left join (
  select user_id, count(*) as garage_cars
  from public.garage_entries
  group by user_id
) g on g.user_id = p.id;

-- `security_invoker` hace que la vista respete las políticas de quien la
-- consulta en vez de las del dueño. Todas las tablas que toca ya son de
-- lectura pública, pero dejarlo explícito evita que la vista se convierta en
-- una puerta de atrás si alguna política se endurece más adelante.

grant select on public.profile_stats to anon, authenticated;
