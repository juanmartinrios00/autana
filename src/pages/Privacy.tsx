import { Link } from 'react-router-dom'
import { LegalPage, LegalSection } from '../components/legal/LegalPage'
import { useDocumentMeta } from '../hooks/useDocumentMeta'

/**
 * Política de privacidad.
 *
 * Todo lo que dice acá está verificado contra el código, no redactado de
 * memoria ni copiado de otra política: qué columnas existen, qué políticas de
 * RLS las dejan leer, qué terceros contacta el navegador, y qué le pasa a una
 * foto antes de subirse.
 *
 * Los párrafos marcados con `legal__todo` son los que dependen de decisiones
 * que no son técnicas —quién es el responsable legal, a qué dirección se
 * reclama, cuánto se conserva una cuenta dada de baja— y de una revisión de
 * abogado. Se ven a propósito: si estuvieran disimulados, el documento
 * parecería cerrado cuando no lo está.
 */
export function Privacy() {
  useDocumentMeta({
    title: 'Política de privacidad | Autana',
    description:
      'Qué datos guarda Autana, cuáles son públicos, qué hacemos con las fotos y quiénes son los terceros que intervienen.',
  })

  return (
    <LegalPage
      eyebrow="Privacidad"
      title="Qué sabemos de vos, y qué hacemos con eso"
      updated="10 de septiembre de 2026"
      intro={
        <>
          <p>
            <strong>En corto:</strong> guardamos lo mínimo para que el sitio funcione, no
            vendemos datos a nadie y no tenemos ningún rastreador. Tu WhatsApp y tu
            ubicación son públicos — es la única forma de que un comprador te escriba.
          </p>
          <p>
            A las fotos que subís les borramos las coordenadas GPS antes de que salgan de
            tu teléfono.
          </p>
        </>
      }
    >
      <LegalSection n={1} title="Qué guardamos">
        <p>Cuando creás la cuenta:</p>
        <ul>
          <li>Tu mail y tu nombre.</li>
          <li>
            Tu contraseña, cifrada por nuestro proveedor de identidad. Nosotros no la
            vemos ni podemos recuperarla — por eso, si la olvidás, la salida es entrar
            con un link por mail.
          </li>
        </ul>
        <p>Cuando publicás un vehículo:</p>
        <ul>
          <li>Tu WhatsApp, tu ciudad y tu provincia.</li>
          <li>Los datos del vehículo y las fotos que cargues.</li>
        </ul>
        <p>Y, si los usás:</p>
        <ul>
          <li>Tu foto de perfil.</li>
          <li>Tu Instagram y un mail de contacto, si los cargás. Son opcionales.</li>
          <li>
            Los avisos en los que tocaste "Me interesa", y de quién viste los datos de
            contacto y cuándo. Lo primero es para que el botón te diga que ya lo tocaste y
            para contar cuánta gente se interesó; lo segundo, para aplicar el máximo diario
            de contactos. Quien publicó ve cuántas personas se interesaron, no quiénes.
          </li>
          <li>Los autos de tu garage, con sus fotos y sus notas.</li>
          <li>Tus favoritos, si tenés cuenta. Sin cuenta viven en tu navegador y no llegan hasta nosotros.</li>
          <li>Los reportes que hagas sobre un aviso.</li>
        </ul>
        <p>
          Cada aviso lleva además una cuenta de cuántas veces se vio. Es un número por
          aviso, no un registro de quién lo miró.
        </p>
      </LegalSection>

      <LegalSection n={2} title="Qué es público">
        <p>
          Un marketplace no funciona si el vendedor no es contactable. Estas cosas las ve
          cualquiera, incluso sin tener cuenta:
        </p>
        <ul>
          <li>Tu nombre, tu foto de perfil, tu ciudad y tu provincia.</li>
          <li>Tu Instagram, si lo cargaste.</li>
          <li>Cuántas personas tocaron "Me interesa" en cada aviso tuyo.</li>
          <li>Tus avisos activos, con sus fotos y su precio.</li>
          <li>
            Tu garage, que además tiene su propio link para compartir. Si no querés que se
            vea, no lo cargues.
          </li>
          <li>Desde cuándo tenés cuenta, y si estás verificada.</li>
        </ul>
        <p>
          <strong>Tu WhatsApp y tu mail de contacto</strong> los ve sólo quien tiene cuenta, al
          tocar "Me interesa" en un aviso tuyo publicado o al pedirlos desde tu garage. Cada
          cuenta puede ver los datos de hasta 30 personas nuevas por día. Es lo que evita que
          alguien baje la lista de teléfonos de todo el sitio.
        </p>
        <p>
          No son públicos: el mail de tu cuenta, tu contraseña, tus favoritos, en qué avisos
          tocaste "Me interesa", ni los reportes que hayas hecho. Un reporte lo ve quien lo hizo y quien modera.
        </p>
      </LegalSection>

      <LegalSection n={3} title="Las fotos y tu ubicación">
        <p>
          Casi todos los teléfonos guardan las coordenadas GPS dentro de cada foto. Una
          foto del auto sacada en la puerta de tu casa lleva, sin que se vea, la dirección
          de tu casa.
        </p>
        <p>
          Antes de subir cualquier imagen la reprocesamos en tu propio navegador, y eso
          descarta esos metadatos. La foto que llega a nuestro servidor ya no los tiene.
          Vale para las fotos de los avisos, las del garage y la de perfil.
        </p>
      </LegalSection>

      <LegalSection n={4} title="Qué no hacemos">
        <ul>
          <li>No vendemos ni cedemos tus datos a terceros.</li>
          <li>
            No tenemos analítica, ni píxeles de publicidad, ni cookies de rastreo. No hay
            un solo script de terceros midiendo lo que hacés en el sitio.
          </li>
          <li>No te mandamos mails promocionales.</li>
          <li>No publicamos nada en tu nombre.</li>
        </ul>
      </LegalSection>

      <LegalSection n={5} title="Quiénes más intervienen">
        <p>
          Para que el sitio exista hay tres terceros, y ninguno recibe tus datos para usarlos
          por su cuenta:
        </p>
        <ul>
          <li>
            <strong>Supabase</strong> aloja la base de datos, las cuentas y las fotos.
          </li>
          <li>
            <strong>Cloudflare</strong> sirve el sitio. Como cualquier servidor web, ve la
            dirección IP desde la que entrás.
          </li>
          <li>
            <strong>Google Fonts</strong> entrega las tipografías. Tu navegador se las pide
            a Google directamente, así que Google ve tu IP al cargar la página.
          </li>
        </ul>
        <p>
          Cuando tocás el botón de contacto de un aviso, salís de Autana y entrás a
          WhatsApp. Lo que pase de ahí en adelante se rige por las condiciones de WhatsApp,
          no por las nuestras.
        </p>
      </LegalSection>

      <LegalSection n={6} title="Borrar tus cosas">
        <p>
          Podés borrar cualquier aviso y cualquier auto del garage desde tu cuenta. Cuando
          borrás un aviso o sacás un auto del garage, se borran también sus fotos. Cuando
          cambiás tu foto de perfil, la anterior se borra: no queda publicada en otro link.
        </p>
        <p>
          Y podés borrar la cuenta entera desde <Link to="/settings">Ajustes</Link>, abajo
          de todo. Se borra en el momento: tu perfil, tus avisos y sus fotos, tu garage,
          tus favoritos y tus búsquedas guardadas. No hay período de gracia ni copia que
          podamos restaurar después — si te arrepentís al día siguiente, no hay nada que
          traer de vuelta.
        </p>
        <p>
          Lo único que sobrevive son los reportes que hayas hecho sobre avisos de otras
          personas, y quedan sin tu nombre: el reporte sigue, quién lo hizo se borra. Si se
          borraran del todo, cualquiera podría limpiar el historial de moderación de sus
          reportes dándose de baja.
        </p>
      </LegalSection>

      <LegalSection n={7} title="Tus derechos">
        <p>
          En Argentina rige la Ley 25.326 de Protección de Datos Personales, que te da
          derecho a acceder a tus datos, corregirlos y pedir que se supriman. Los tres se
          ejercen desde la propia aplicación, sin pedirle permiso a nadie: ver lo tuyo en{' '}
          <Link to="/profile">tu perfil</Link>, corregirlo en{' '}
          <Link to="/settings">Ajustes</Link>, y suprimirlo con el borrado de cuenta de esa
          misma pantalla.
        </p>
        <span className="legal__todo">
          Pendiente de definir y de revisión legal: el mail al que reclamar cuando lo de
          arriba no alcance, y en qué plazo se responde. También que un profesional revise
          que este documento cumpla lo que corresponde.
        </span>
      </LegalSection>

      <LegalSection n={8} title="Cambios">
        <p>
          Si esto cambia, cambia la fecha de arriba. Los cambios que te afecten de verdad
          los vas a ver anunciados en el sitio, no escondidos en una fecha nueva.
        </p>
        <p>
          Ver también los <Link to="/terms">términos y condiciones</Link>.
        </p>
      </LegalSection>
    </LegalPage>
  )
}
