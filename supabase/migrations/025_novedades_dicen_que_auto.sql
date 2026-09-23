-- ============================================================================
-- Las novedades del garage dicen qué auto
--
-- Pegar en el SQL Editor de Supabase. Es idempotente.
--
-- Antes decía "Pepito actualizó su garage" y no se sabía qué pasó: el dato
-- ---el auto, el año, la foto, la nota--- ya estaba guardado y no se usaba. Es
-- el momento que mejor funciona de seguir a alguien: se compró un auto y lo
-- muestra.
--
-- Cambia la forma de las novedades de garage: antes era una fila por persona
-- ("cambió 2 cosas"), ahora una por auto. Son cuatro espacios por persona, así
-- que no puede crecer: el tope de cuatro filas por garage lo pone la 002.
--
-- La foto y la nota no salen si el perfil está oculto por moderación (018), que
-- es la misma regla que aplica la pantalla del garage. El nombre y el modelo sí:
-- no son contenido cargado por la persona, son campos de un formulario, y la
-- novedad sin ellos no se entiende.
--
-- `drop` antes del `create`: cambia el tipo de las columnas que devuelve, y
-- `create or replace` no lo permite.
-- ============================================================================

drop function if exists public.my_novedades();

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
  amount        int,
  -- Sólo en las de garage: qué auto, en qué espacio, con qué foto y nota, y si
  -- es nuevo o lo cambió.
  garage_slot   text,
  garage_car    text,
  garage_photo  text,
  garage_note   text,
  garage_is_new boolean
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
      count(*)::int                       as amount,
      null::text                          as garage_slot,
      null::text                          as garage_car,
      null::text                          as garage_photo,
      null::text                          as garage_note,
      null::boolean                       as garage_is_new
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
      null::text, null::text, 1,
      null::text, null::text, null::text, null::text, null::boolean
    from public.follows f
    join public.profiles p on p.id = f.follower_id
    cross join me
    where f.followed_id = me.id
      and f.created_at > me.since
  ),

  /* Los autos que cargó o cambió la gente que seguís, uno por auto. Sólo lo
     que pasó después de que la empezaste a seguir: lo de antes no es novedad
     para vos.

     "Lo sumó" y "lo cambió" se distinguen por la distancia entre `created_at` y
     `updated_at`: al crearlo son iguales, y el minuto de margen cubre la foto,
     que se sube después de la fila. */
  garages as (
    select
      'garage'::text, g.updated_at,
      p.id, p.name, p.avatar_url,
      null::text, null::text, 1,
      g.slot,
      trim(concat_ws(' ', g.make, g.model, g.year)),
      case when p.content_hidden then null else g.photo_path end,
      case when p.content_hidden then null else nullif(g.note, '') end,
      g.updated_at - g.created_at < interval '1 minute'
    from public.follows f
    join public.garage_entries g on g.user_id = f.followed_id
    join public.profiles p on p.id = f.followed_id
    cross join me
    where f.follower_id = me.id
      and g.updated_at > greatest(f.created_at, me.since)
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
    e.amount,
    e.garage_slot,
    e.garage_car,
    e.garage_photo,
    e.garage_note,
    e.garage_is_new
  from everything e
  cross join me
  order by e.happened_at desc
  limit 30;
$$;

revoke all on function public.my_novedades() from public, anon;
grant execute on function public.my_novedades() to authenticated;
