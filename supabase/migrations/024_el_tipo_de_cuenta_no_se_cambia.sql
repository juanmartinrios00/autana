-- ============================================================================
-- El tipo de cuenta no se cambia solo, en ninguna de las dos direcciones
--
-- Pegar en el SQL Editor de Supabase ANTES del deploy que la acompaña.
--
-- Amplía la 023, que frenaba una sola dirección. Hace falta la 023 aplicada
-- antes: esto reemplaza su función y deja el trigger donde está.
--
-- Por qué la otra dirección también
--
-- Que una concesionaria se pase a particular es el engaño más viejo del rubro:
-- la agencia que publica "vendo particular" para que el comprador confíe más y
-- no le pida factura. El sitio muestra al lado de cada aviso si es particular o
-- concesionaria, así que ese cambio es cambiarle un hecho al comprador.
--
-- De paso el tope de avisos deja de ser un botón: de concesionaria a particular
-- bajaba a 5 (005) y después, con la 023, no se podía volver. Quien se pasaba
-- quedaba trabado sin que nada se lo dijera antes.
--
-- Entonces el tipo es lo que se eligió al registrarse (009) y punto. Se cambia
-- por contacto, a mano, igual que `verified` o `listing_limit`.
--
-- Quién sí puede
--
-- Quien administra: desde el SQL Editor (corre como `postgres`, que no es
-- `authenticated`) o con sesión de admin (`is_admin()`).
--
-- Por qué sigue siendo un trigger y no se saca el permiso de la columna
--
-- Ahora sí se podría sacar el `grant update (seller_type)` de la 017. No se
-- saca porque Ajustes manda el perfil entero en un solo PATCH, con el tipo
-- adentro y con el mismo valor de siempre: sin el permiso, guardar el nombre
-- fallaría. El trigger deja pasar lo que no cambia y frena lo que cambia, que
-- es exactamente lo que se quiere decir.
-- ============================================================================

create or replace function public.seller_type_una_sola_via()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if old.seller_type is distinct from new.seller_type
     and current_user in ('authenticated', 'anon')
     and not public.is_admin()
  then
    raise exception 'El tipo de cuenta no se cambia desde la aplicación.'
      using errcode = 'check_violation',
            hint = 'Se elige al registrarse. Para cambiarlo, escribinos desde Contacto.';
  end if;
  return new;
end;
$$;

comment on function public.seller_type_una_sola_via() is
  'Frena cualquier cambio de seller_type hecho por el propio usuario (024).';

-- El trigger de la 023 ya llama a esta función; se recrea por si esta migración
-- corre en una base donde la 023 no dejó el trigger.
drop trigger if exists seller_type_una_sola_via on public.profiles;
create trigger seller_type_una_sola_via
  before update of seller_type on public.profiles
  for each row
  execute function public.seller_type_una_sola_via();
