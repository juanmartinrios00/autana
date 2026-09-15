-- ============================================================================
-- Los mensajes de contacto
--
-- Pegalo en Supabase → SQL Editor → Run. Es idempotente.
--
-- La página de contacto armaba un `mailto:` y abría el cliente de correo del
-- visitante. Eso falla justo con quien más necesita escribir: en el celular y
-- en una máquina sin cliente configurado el botón no hace nada visible, y el
-- mensaje que sí sale llega sin forma, sin motivo y sin saber si esa persona
-- tiene cuenta. Desde acá el mensaje se guarda, como un reporte.
--
-- Tres decisiones que conviene tener presentes:
--
-- 1. NO pide cuenta, y es a propósito. "No puedo entrar a mi cuenta" es de las
--    razones más comunes para escribir a soporte; exigir sesión dejaría afuera
--    exactamente ese caso. El precio es que hay que aguantar spam — abajo.
--
-- 2. Si hay sesión, el mensaje queda atado a esa cuenta y no se puede mandar
--    en nombre de otra. `user_id is not distinct from auth.uid()` dice las dos
--    cosas de una: sin sesión va en null, con sesión va la propia y ninguna
--    otra.
--
-- 3. Los lee quien modera, nadie más — ni siquiera quien lo escribió. Un
--    mensaje de contacto lleva un mail y a veces un problema de seguridad; la
--    respuesta va por correo, no por una pantalla que haya que proteger.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. La tabla
-- ----------------------------------------------------------------------------

create table if not exists public.contact_messages (
  id      uuid primary key default gen_random_uuid(),
  -- Si la persona borra su cuenta, el mensaje queda: puede haber una consulta
  -- abierta, y el mail para responder está en la fila.
  user_id uuid references public.profiles on delete set null,

  -- Los largos son del lado de la base y no sólo del formulario: cualquiera
  -- puede postear a la API sin pasar por la pantalla.
  name    text not null check (length(btrim(name)) between 2 and 80),
  email   text not null check (length(email) between 6 and 160 and email like '%_@_%.__%'),
  subject text not null check (
    subject in ('account', 'listing', 'dealers', 'security', 'press', 'other')
  ),
  message text not null check (length(btrim(message)) between 20 and 4000),

  -- Lo marca quien modera cuando ya respondió. No hay estado intermedio: o
  -- está contestado o no, y el resto vive en el correo.
  handled    boolean not null default false,
  created_at timestamptz not null default now()
);

comment on table public.contact_messages is
  'Mensajes de la página de contacto. Los lee sólo quien modera.';

-- Sin índice, la pantalla de moderación ordena la tabla entera cada vez que se
-- abre. Los sin responder primero, y dentro de esos el más nuevo arriba.
create index if not exists contact_messages_pending_idx
  on public.contact_messages (handled, created_at desc);

-- Para el freno de abajo: cuenta por correo dentro de la última hora.
create index if not exists contact_messages_email_idx
  on public.contact_messages (lower(email), created_at desc);

-- ----------------------------------------------------------------------------
-- 2. Quién puede qué
-- ----------------------------------------------------------------------------

alter table public.contact_messages enable row level security;

-- Qué columnas se pueden escribir, como en la 017. Las políticas de abajo
-- dicen QUIÉN escribe; esto dice QUÉ, y hacen falta las dos. Sin esto,
-- cualquiera manda un mensaje con `handled = true` y no aparece nunca entre
-- los pendientes, o con un `created_at` viejo y queda enterrado al fondo de
-- la lista. Los dos los pone la base sola y los cambia quien modera.
revoke insert, update on public.contact_messages from anon, authenticated;
grant insert (user_id, name, email, subject, message)
  on public.contact_messages to anon, authenticated;
-- Quien modera sólo cambia si está respondido. El mensaje no se edita: es lo
-- que la persona escribió.
grant update (handled) on public.contact_messages to authenticated;

-- Escribe cualquiera, con sesión o sin ella, y siempre a nombre propio.
drop policy if exists contact_messages_insert on public.contact_messages;
create policy contact_messages_insert on public.contact_messages
  for insert to anon, authenticated
  with check (user_id is not distinct from auth.uid());

-- Los lee quien modera. Nadie más, y tampoco quien lo escribió: si la lista se
-- pudiera leer con el mail, alguien la usa para juntar mails.
drop policy if exists contact_messages_select_admin on public.contact_messages;
create policy contact_messages_select_admin on public.contact_messages
  for select using (public.is_admin());

drop policy if exists contact_messages_update_admin on public.contact_messages;
create policy contact_messages_update_admin on public.contact_messages
  for update using (public.is_admin()) with check (public.is_admin());

drop policy if exists contact_messages_delete_admin on public.contact_messages;
create policy contact_messages_delete_admin on public.contact_messages
  for delete using (public.is_admin());

-- ----------------------------------------------------------------------------
-- 3. El freno
--
-- Honestidad sobre el alcance: esto para el doble click, el que insiste
-- enojado, y el script perezoso que repite el mismo mail. NO para un flood
-- decidido, que cambia el mail en cada intento. Contra eso hace falta algo que
-- vea la IP —Turnstile o un límite en el worker—, y la base no la tiene: desde
-- PostgREST todos los pedidos llegan igual.
--
-- Se elige el mail y no `user_id` porque la mayoría de los mensajes van a
-- venir sin sesión, que es justo el caso que hay que frenar.
-- ----------------------------------------------------------------------------

create or replace function public.contact_rate_limit()
returns trigger
language plpgsql
-- `security definer` porque tiene que contar filas que quien escribe no puede
-- leer: las políticas de arriba sólo dejan leer a quien modera.
security definer set search_path = public
as $$
declare
  recent int;
begin
  select count(*) into recent
    from public.contact_messages
   where lower(email) = lower(new.email)
     and created_at > now() - interval '1 hour';

  if recent >= 3 then
    raise exception 'Ya nos llegaron varios mensajes desde este correo. Probá de nuevo en un rato.'
      using errcode = '54000';
  end if;

  return new;
end;
$$;

drop trigger if exists contact_messages_rate_limit on public.contact_messages;
create trigger contact_messages_rate_limit
  before insert on public.contact_messages
  for each row execute function public.contact_rate_limit();
