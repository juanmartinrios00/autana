-- ============================================================================
-- Contador de visitas por publicación.
--
-- Pegalo en Supabase → SQL Editor → Run. Es idempotente.
--
-- Hace falta una función `security definer` porque la política de `listings`
-- sólo deja actualizar al dueño del aviso, y el que suma una visita es el
-- comprador. La función incrementa una única columna y nada más: no puede
-- usarse para tocar el precio ni el estado.
-- ============================================================================

create or replace function public.register_listing_view(listing_slug text)
returns void
language plpgsql
security definer set search_path = public
as $$
begin
  update public.listings
     set view_count = view_count + 1
   where slug = listing_slug
     and status = 'active';
end;
$$;

revoke all on function public.register_listing_view(text) from public;
grant execute on function public.register_listing_view(text) to anon, authenticated;
