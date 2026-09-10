-- ============================================================================
-- 009 — El tipo de vendedor se elige al crear la cuenta
--
-- Hasta ahora `handle_new_user` insertaba el perfil con el `seller_type` por
-- defecto ('private') y no había forma de nacer concesionaria: había que
-- crearse la cuenta, entrar a Ajustes y cambiarlo. Una agencia que se registra
-- para cargar su stock se choca con el tope de 5 publicaciones antes de
-- enterarse de que ese ajuste existe.
--
-- Ahora el registro manda `seller_type` en la metadata del usuario y el trigger
-- lo lee. La metadata la escribe el cliente, así que NO se confía: cualquier
-- valor que no sea exactamente 'dealer' cae en 'private'. Esa lista blanca no
-- es decorativa — sin ella, un valor cualquiera viola el CHECK de la tabla, el
-- insert falla dentro del trigger y se rompe el alta entera.
--
-- Sobre cobrarle un plan a las concesionarias, que es hacia dónde va esto:
-- `seller_type` sigue siendo declarado por el propio usuario, acá y en Ajustes.
-- Mientras ser concesionaria sólo da más lugar para publicar, alcanza. El día
-- que dé algo que se paga, este campo deja de poder ser autodeclarado y la
-- condición tiene que vivir en la base —un estado de suscripción—, no en el
-- formulario: cualquiera puede mandar la metadata que quiera.
-- ============================================================================

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
declare
  -- Lo que declaró el formulario. Puede ser null (magic link, o una cuenta
  -- creada antes de esta migración) o cualquier cosa: es entrada del cliente.
  declared text := new.raw_user_meta_data ->> 'seller_type';
begin
  insert into public.profiles (id, name, seller_type)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'name', split_part(new.email, '@', 1)),
    case when declared = 'dealer' then 'dealer' else 'private' end
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

-- El trigger `on_auth_user_created` ya apunta a esta función por nombre, así
-- que reemplazar el cuerpo alcanza. Se recrea igual para que correr sólo este
-- archivo, sin el schema, deje todo en pie.
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

comment on function public.handle_new_user() is
  'Crea el perfil al registrarse. Lee seller_type de la metadata con lista blanca.';
