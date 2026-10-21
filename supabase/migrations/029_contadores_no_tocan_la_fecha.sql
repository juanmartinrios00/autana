-- ============================================================================
-- Los contadores no cuentan como un cambio del aviso
--
-- Pegalo en Supabase → SQL Editor → Run. Es idempotente.
--
-- `listings.updated_at` lo pone un trigger en cada `update`, y los contadores
-- también son `update`: cada visita (001, 027), cada "Me interesa" (014) y
-- cada favorito (004) le ponía al aviso la fecha de ahora, aunque nadie
-- hubiera tocado nada.
--
-- Esa fecha es el `lastmod` del sitemap. Con un aviso mirado todos los días,
-- el sitemap le decía a Google que el aviso cambiaba todos los días, y Google
-- termina ignorando un `lastmod` que no dice la verdad ---para ese aviso y
-- para el resto del sitio---. Que diga cuándo cambió de verdad es lo que hace
-- que vuelva a pasar justo cuando el vendedor bajó el precio.
--
-- La regla: si lo único distinto entre la fila de antes y la de después son
-- los contadores, la fecha queda como estaba. Se compara la fila entera menos
-- los contadores, y no una lista de las columnas que sí cuentan: una columna
-- nueva que se sume mañana cuenta como cambio sin que nadie se acuerde de
-- agregarla acá. Lo que hay que mantener es la lista corta, la de los números
-- que escribe el sistema.
--
-- Las fechas que ya quedaron pisadas por visitas no se pueden reconstruir: se
-- corrigen solas la próxima vez que el vendedor edite el aviso.
-- ============================================================================

create or replace function public.touch_listing_updated_at()
returns trigger
language plpgsql
as $$
declare
  sin_contar constant text[] := array['view_count', 'interest_count', 'favorite_count', 'updated_at'];
begin
  /* Si no cambió nada más que los contadores, `new` se va con la fecha que
     traía: la de antes, o la que haya escrito a propósito el servicio, que es
     el único que puede (la 017 no le da `updated_at` a nadie más). */
  if (to_jsonb(new) - sin_contar) <> (to_jsonb(old) - sin_contar) then
    new.updated_at := now();
  end if;
  return new;
end;
$$;

drop trigger if exists listings_touch_updated_at on public.listings;
create trigger listings_touch_updated_at
  before update on public.listings
  for each row execute function public.touch_listing_updated_at();
