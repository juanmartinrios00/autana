-- ============================================================================
-- Qué columnas puede escribir cada uno
--
-- Pegalo en Supabase → SQL Editor → Run. Es idempotente.
--
-- ⚠️ ARREGLO DE SEGURIDAD. Correla antes que cualquier otra cosa.
--
-- El agujero: las políticas de RLS de `profiles` y `listings` controlan QUÉ
-- FILA se puede editar —la propia—, pero no QUÉ COLUMNAS. Y Supabase le da a
-- `authenticated` permiso de `update` sobre todas las columnas de toda tabla
-- nueva. La 008 sacó el permiso de LEER columnas, pero el de ESCRIBIR quedó
-- entero. Con eso, cualquiera con cuenta podía, con una sola llamada a la API
-- y sobre su propia fila:
--
--   profiles.role = 'admin'      → moderar: leer todos los reportes con quién
--                                   los hizo, bloquear y borrar avisos ajenos.
--                                   La 006 decía "no hay forma de que alguien
--                                   se ascienda solo", y la había.
--   profiles.verified = true     → el sello "Verificada", que el comprador lee
--                                   como la señal más fuerte. Ideal para estafar.
--   profiles.listing_limit = 999 → saltear el tope de avisos.
--   listings.interest_count      → "A 500 personas les interesa", en el aviso
--                                   propio. Lo mismo con visitas y favoritos.
--
-- El arreglo es el mismo camino que la 008, pero para escribir: se saca el
-- permiso sobre la tabla y se da columna por columna, sólo sobre lo que la
-- aplicación escribe de verdad. Falla cerrado: una columna nueva nace sin
-- permiso de escritura hasta que alguien la agregue acá.
--
-- Lo que sigue escribiendo cada contador es la función o el trigger que ya lo
-- hacía, y que corre como el dueño de la base: esos no dependen de estos
-- permisos.
--
-- Si una pantalla deja de guardar algo después de esto, es una columna que
-- falta en una de las listas de abajo. Se agrega acá; no se vuelve a dar el
-- permiso de tabla.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. profiles
-- ----------------------------------------------------------------------------

revoke insert, update on public.profiles from anon, authenticated;

-- Lo que la gente edita de sí misma: Ajustes, la foto, el tipo de vendedor, el
-- interruptor del buscador, el color del garage, y el WhatsApp y la ubicación
-- que se cargan al publicar.
--
-- Afuera, a propósito: `id`, `role`, `verified`, `listing_limit`, `created_at`.
-- Esas se cambian por SQL, por quien administra la base.
grant update (
  name, avatar_url, seller_type, city, province,
  whatsapp, instagram, contact_email,
  discoverable, garage_theme
) on public.profiles to authenticated;

-- Insertar no hace falta: el perfil lo crea el trigger de alta de usuario, que
-- corre como el dueño. Sin este permiso, nadie puede crearse un perfil a mano
-- con `role = 'admin'` adentro.

-- ----------------------------------------------------------------------------
-- 2. listings
-- ----------------------------------------------------------------------------

revoke insert, update on public.listings from anon, authenticated;

-- Publicar. Afuera: los contadores (`view_count`, `favorite_count`,
-- `interest_count`), las fechas, y el `id`.
grant insert (
  seller_id, slug, status,
  make, model, trim, year, price, currency, negotiable, mileage,
  condition, fuel_type, transmission, drivetrain, body_type,
  engine, power, doors, color, city, province, description
) on public.listings to authenticated;

-- Editar, pausar, marcar vendido, y moderar (el admin también es
-- `authenticated`; su política de RLS decide sobre qué filas). Afuera, además
-- de lo anterior: `seller_id` y `slug`, que no cambian después de publicar.
grant update (
  status,
  make, model, trim, year, price, currency, negotiable, mileage,
  condition, fuel_type, transmission, drivetrain, body_type,
  engine, power, doors, color, city, province, description
) on public.listings to authenticated;
