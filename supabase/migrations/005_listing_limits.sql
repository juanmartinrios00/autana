-- ============================================================================
-- Tope de publicaciones por usuario.
--
-- Pegalo en Supabase → SQL Editor → Run. Es idempotente.
--
-- Hasta acá cualquier usuario con cuenta podía insertar avisos sin límite. La
-- anon key viaja en el JavaScript de todo el mundo, así que "sin límite"
-- significa que un script con una cuenta gratuita puede llenar la base en una
-- tarde. RLS decide QUIÉN puede escribir; no decía nada de CUÁNTO.
--
-- Dos controles distintos, porque atajan cosas distintas:
--
--   1. El tope de avisos vivos es una regla de producto: cuántos autos puede
--      tener alguien a la venta al mismo tiempo.
--   2. El tope diario es antiabuso: frena al script, no a la persona.
--
-- Sobre los números: `seller_type` lo declara el propio usuario, así que NO es
-- una frontera de seguridad — quien quiera abusar se marca "concesionaria" y
-- listo. Por eso el tope de concesionaria también es finito. Es más alto
-- porque el producto ya las trata como ciudadanas de primera (la sección de
-- concesionarias en la home, el filtro por tipo de vendedor), no porque
-- confiemos en la etiqueta.
-- ============================================================================

-- El override por perfil. `null` significa "usá el que te corresponde por tipo".
-- Es el enganche para los planes: subirle el tope a alguien va a ser un UPDATE,
-- sin migración ni deploy.
alter table public.profiles
  add column if not exists listing_limit int
    check (listing_limit is null or listing_limit >= 0);

comment on column public.profiles.listing_limit is
  'Tope propio de avisos vivos. NULL = el que corresponde por seller_type.';

create or replace function public.listing_allowance(profile_id uuid)
returns int
language sql
stable
security definer set search_path = public
as $$
  select coalesce(
    p.listing_limit,
    case when p.seller_type = 'dealer' then 25 else 5 end
  )
  from public.profiles p
  where p.id = profile_id;
$$;

create or replace function public.enforce_listing_limit()
returns trigger
language plpgsql
security definer set search_path = public
as $$
declare
  allowed int;
  alive   int;
  today   int;
begin
  allowed := public.listing_allowance(new.seller_id);

  -- Perfil inexistente: la clave foránea ya se va a encargar.
  if allowed is null then
    return new;
  end if;

  -- Los vendidos no cuentan: alguien que vendió cinco autos tiene que poder
  -- seguir publicando. Los pausados sí, porque siguen ocupando lugar y su
  -- dueño puede reactivarlos cuando quiera.
  select count(*) into alive
    from public.listings
   where seller_id = new.seller_id
     and status in ('draft', 'active', 'paused');

  if alive >= allowed then
    raise exception
      'Llegaste al tope de % publicaciones. Marcá alguna como vendida o eliminala para publicar otra.',
      allowed
      using errcode = 'P0001';
  end if;

  -- El tope de arriba se puede esquivar marcando todo como vendido y volviendo
  -- a publicar. A una persona no le sirve de nada; a un script, sí. Este es el
  -- que lo frena, y está puesto lo bastante alto como para que un vendedor real
  -- cargando su lista nunca lo toque.
  select count(*) into today
    from public.listings
   where seller_id = new.seller_id
     and created_at > now() - interval '24 hours';

  if today >= 20 then
    raise exception
      'Publicaste demasiados avisos en las últimas 24 horas. Probá de nuevo mañana.'
      using errcode = 'P0001';
  end if;

  return new;
end;
$$;

drop trigger if exists listings_enforce_limit on public.listings;
create trigger listings_enforce_limit
  before insert on public.listings
  for each row execute function public.enforce_listing_limit();

-- Para que el conteo diario no haga un scan completo cuando la tabla crezca.
create index if not exists listings_seller_created_idx
  on public.listings (seller_id, created_at desc);
