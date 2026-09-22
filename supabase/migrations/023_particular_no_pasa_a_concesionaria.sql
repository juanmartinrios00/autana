-- ============================================================================
-- Una cuenta particular no puede pasarse a concesionaria
--
-- Pegar en el SQL Editor de Supabase ANTES del deploy que la acompaña: la
-- pantalla de Ajustes ya no ofrece el cambio, pero sin esto la API lo sigue
-- aceptando.
--
-- Por qué
--
-- El tipo se elige al registrarse (009) y se podía cambiar en Ajustes cuando
-- uno quisiera. Pasarse de particular a concesionaria sube el tope de avisos
-- activos de 5 a 25 (005), y cambia lo que el comprador lee al lado de cada
-- aviso. Ser concesionaria tiene que ser una decisión del alta, no un
-- interruptor.
--
-- Por qué un trigger y no sacar el permiso de la columna
--
-- El `grant update (seller_type)` de la 017 tiene que quedar: la otra
-- dirección, de concesionaria a particular, sigue permitida. Un permiso de
-- columna no distingue el valor viejo del nuevo; un trigger sí.
--
-- Quién sí puede
--
-- Quien administra: desde el SQL Editor (corre como `postgres`, que no es
-- `authenticated`) o con sesión de admin (`is_admin()`). Si alguien de verdad
-- es una concesionaria y se registró como particular, lo pide por contacto y
-- se cambia a mano.
-- ============================================================================

create or replace function public.seller_type_una_sola_via()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if old.seller_type = 'private'
     and new.seller_type = 'dealer'
     and current_user in ('authenticated', 'anon')
     and not public.is_admin()
  then
    raise exception 'Una cuenta particular no puede pasar a concesionaria.'
      using errcode = 'check_violation',
            hint = 'Si sos una concesionaria, escribinos desde Contacto y la cambiamos.';
  end if;
  return new;
end;
$$;

comment on function public.seller_type_una_sola_via() is
  'Frena el paso de particular a concesionaria hecho por el propio usuario (023).';

drop trigger if exists seller_type_una_sola_via on public.profiles;
create trigger seller_type_una_sola_via
  before update of seller_type on public.profiles
  for each row
  execute function public.seller_type_una_sola_via();
