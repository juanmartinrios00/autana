-- ============================================================================
-- 010 — Borrar la propia cuenta
--
-- Hasta ahora se podía borrar un aviso o un auto del garage, pero no la cuenta:
-- no había botón ni mail al que escribir. La Ley 25.326 da derecho a pedir la
-- supresión de los datos personales, así que tenía que existir de verdad y no
-- como una promesa en la política de privacidad.
--
-- Por qué una función y no un delete desde el cliente: el cliente no puede
-- tocar `auth.users` con la clave anónima, y borrar sólo el perfil dejaría el
-- usuario de autenticación vivo — el mail seguiría ocupado y la persona no
-- podría volver a registrarse con él. Borrar la fila de `auth.users` es lo
-- único que borra la cuenta entera.
--
-- No lleva parámetro a propósito. Si recibiera un id habría que confiar en que
-- el que llama mande el suyo; sin parámetro, `auth.uid()` lo resuelve del token
-- y no hay forma de pedir el borrado de otro.
--
-- Lo que arrastra la cascada, desde `auth.users`:
--   profiles → listings → listing_images
--            → favorites, saved_searches, garage_entries
--
-- Lo que NO arrastra, y es a propósito:
--   reports.reporter_id es `on delete set null`. Los reportes que hiciste sobre
--   avisos de otros quedan, sin tu nombre. Si se borraran, alguien podría
--   limpiar el historial de moderación dándose de baja. Un aviso que ya está
--   bloqueado sigue bloqueado: el conteo corre al insertar un reporte nuevo, no
--   al borrar una cuenta.
--
-- Lo que tampoco arrastra, y por eso lo hace el cliente antes de llamar acá:
--   las fotos en Storage. Están fuera de estas tablas y no las alcanza ninguna
--   foreign key. Borrar la fila de `storage.objects` desde acá tampoco serviría:
--   dejaría el archivo colgado. Se borran con la API de Storage, que es la que
--   borra el archivo de verdad.
--
-- Si al correr esto da "permission denied for table users": esta función se
-- apoya en que `postgres` —el dueño, por ser quien la crea— pueda borrar en
-- `auth.users`. Es lo normal en Supabase; si no lo fuera, avisá y lo movemos a
-- una llamada con la clave de servicio desde el worker.
-- ============================================================================

create or replace function public.delete_my_account()
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
begin
  -- Sin sesión no hay a quién borrar. Falla ruidoso en vez de no hacer nada:
  -- un borrado que "salió bien" sin borrar sería lo peor de los dos mundos.
  if uid is null then
    raise exception 'Hay que tener la sesión iniciada para borrar la cuenta.'
      using errcode = '42501';
  end if;

  delete from auth.users where id = uid;
end;
$$;

-- `security definer` corre con los permisos del dueño, así que quién puede
-- ejecutarla es la única defensa que queda. Postgres se la da a `public` por
-- defecto: hay que sacarla y darla a mano.
revoke all on function public.delete_my_account() from public, anon;
grant execute on function public.delete_my_account() to authenticated;

comment on function public.delete_my_account() is
  'Borra la cuenta de quien llama (auth.uid()). Las fotos de Storage las borra el cliente antes.';

-- ----------------------------------------------------------------------------
-- El timbre, para preguntar sin borrar nada
--
-- El cliente borra las fotos ANTES de llamar a `delete_my_account`, y ese orden
-- no se puede invertir: si la cuenta se va primero, nadie tiene ya permiso de
-- tocar esos archivos y quedan públicos para siempre.
--
-- El problema del orden es que si `delete_my_account` no estuviera —esta
-- migración sin correr, o el caché de esquema de PostgREST todavía sin
-- refrescar, que pasa durante unos segundos después de crear una función—, las
-- fotos ya se habrían borrado y la cuenta seguiría viva.
--
-- No se puede probar llamando a la de verdad. Por eso esta, que no hace nada:
-- si responde, la migración está aplicada y el caché la ve, así que la otra
-- también está. Van juntas en el mismo archivo justamente para que no puedan
-- existir por separado.
-- ----------------------------------------------------------------------------

create or replace function public.account_deletion_ready()
returns boolean
language sql
immutable
as $$ select true $$;

revoke all on function public.account_deletion_ready() from public, anon;
grant execute on function public.account_deletion_ready() to authenticated;

comment on function public.account_deletion_ready() is
  'Sonda sin efectos: si responde, delete_my_account existe y PostgREST la ve.';
