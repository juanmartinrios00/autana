-- ============================================================================
-- Que `%` y `_` en el buscador sean letras, no comodines
--
-- Pegalo en Supabase → SQL Editor → Run. Es idempotente.
--
-- Bug de la 011. El término va a un `like '%' || termino || '%'`, y `%` y `_`
-- son comodines ahí adentro. Escribir `%%` en el buscador armaba `'%%%%'`, que
-- matchea todo:
--
--   search_people('%%')  →  los primeros 20 perfiles
--   search_people('_a')  →  cualquier nombre con una letra y después una "a"
--
-- El piso de dos letras estaba justamente para que nadie pidiera "media base
-- de una", y `%%` son dos caracteres: lo saltea sin esforzarse. Encima la 011
-- se pasa media cabecera explicando que el buscador no tiene que volver normal
-- el listado de perfiles, y así lo dejaba a dos teclas.
--
-- Se escapan en vez de borrarlos. Borrarlos sería más corto pero miente: hay
-- nombres de usuario con guión bajo —`juan_m` sin ir más lejos— y buscando
-- `juan_m` tenés que encontrar a `juan_m`, no a `juanXm`. Escapado, el
-- comodín se busca como lo que es: un carácter más.
--
-- El piso de dos letras sigue midiendo el término tal como se escribió, no el
-- escapado: si no, `%%` pasaría a medir cuatro y volvería a colarse.
-- ============================================================================

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
      /* El orden importa: primero la barra, o escaparía las que se agregan
         después. `standard_conforming_strings` está en on, así que '\' es una
         sola barra y no una secuencia de escape del literal. */
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
    /* Sobre `key` y no sobre `safe`: escapar alarga el término, y midiendo el
       escapado `%%` contaría cuatro caracteres y pasaría el piso. */
    and length(n.key) >= 2
    /* `like` y no `ilike`: los dos lados ya vienen en minúscula. */
    and public.name_key(p.name) like '%' || n.safe || '%' escape '\'
  order by
    /* El que arranca con lo que escribiste va primero. */
    (public.name_key(p.name) like n.safe || '%' escape '\') desc,
    coalesce(g.cars, 0) desc,
    p.name
  limit 20;
$$;

comment on function public.search_people(text) is
  'Busca personas por nombre para el buscador del sitio. Respeta discoverable, escapa los comodines de LIKE y topea en 20.';

revoke all on function public.search_people(text) from public;
grant execute on function public.search_people(text) to anon, authenticated;
