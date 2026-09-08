-- ============================================================================
-- Contador de favoritos por publicación.
--
-- Pegalo en Supabase → SQL Editor → Run. Es idempotente.
--
-- La columna `favorite_count` existía desde el schema inicial pero nunca la
-- escribía nadie: los favoritos vivían en el navegador, así que la base ni se
-- enteraba. Ahora que se guardan en `favorites`, el contador lo mantiene un
-- trigger y no el cliente. Que lo escriba el cliente sería confiar en que
-- cada navegador sume y reste bien, y alcanza con una pestaña que falle a
-- mitad de camino para que el número quede mal para siempre.
--
-- Va `security definer` porque la política de `listings` sólo deja actualizar
-- al dueño del aviso, y el que marca un favorito es el comprador. La función
-- toca una sola columna: no puede usarse para cambiar el precio ni el estado.
-- ============================================================================

create or replace function public.sync_favorite_count()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  if tg_op = 'INSERT' then
    update public.listings
       set favorite_count = favorite_count + 1
     where id = new.listing_id;
    return new;
  end if;

  if tg_op = 'DELETE' then
    -- `greatest` es un cinturón de seguridad: si el contador quedó
    -- desincronizado por lo que sea, no baja a negativo.
    update public.listings
       set favorite_count = greatest(favorite_count - 1, 0)
     where id = old.listing_id;
    return old;
  end if;

  return null;
end;
$$;

drop trigger if exists favorites_sync_count on public.favorites;
create trigger favorites_sync_count
  after insert or delete on public.favorites
  for each row execute function public.sync_favorite_count();

-- Deja el contador en su valor real. Corriendo esto de nuevo no rompe nada:
-- siempre recalcula desde la tabla de favoritos, que es la fuente de verdad.
update public.listings l
   set favorite_count = coalesce(
     (select count(*) from public.favorites f where f.listing_id = l.id),
     0
   );
