import { Link } from 'react-router-dom'
import { LegalPage, LegalSection } from '../components/legal/LegalPage'
import { useDocumentMeta } from '../hooks/useDocumentMeta'

/**
 * Términos y condiciones.
 *
 * Los límites y las reglas que se mencionan acá son los que el código aplica de
 * verdad: los topes salen de `005_listing_limits.sql`, el bloqueo automático por
 * tres reportes de `006_reports.sql`, y la imposibilidad de reactivar un aviso
 * bloqueado de la política de update de `listings`.
 *
 * Lo que depende de decisiones no técnicas —quién es el titular del servicio, a
 * qué dirección se reclama, qué ley y qué tribunales rigen— queda marcado con
 * `legal__todo` hasta que lo revise un abogado.
 */
export function Terms() {
  useDocumentMeta({
    title: 'Términos y condiciones | Autana',
    description:
      'Las reglas de Autana: qué se puede publicar, cuáles son los límites, cómo funciona la moderación y hasta dónde llega nuestra responsabilidad.',
  })

  return (
    <LegalPage
      eyebrow="Términos"
      title="Las reglas, en criollo"
      updated="10 de septiembre de 2026"
      intro={
        <>
          <p>
            <strong>En corto:</strong> Autana es un tablón de clasificados. Publicar es
            gratis y no cobramos comisión. La operación es entre vos y la otra persona:
            nosotros no vemos el auto, no tocamos la plata y no garantizamos nada de lo que
            se publica.
          </p>
          <p>
            Eso último no es una excusa legal, es cómo funciona: tratá cada aviso como un
            aviso, no como una promesa nuestra.
          </p>
        </>
      }
    >
      <LegalSection n={1} title="Qué es Autana">
        <p>
          Un lugar donde alguien publica un vehículo y otro alguien lo encuentra y le
          escribe. Nada más que eso. No somos concesionaria, ni intermediarios, ni parte de
          la compraventa.
        </p>
        <p>
          Publicar es gratis. No cobramos comisión por vender ni vendemos posiciones
          destacadas: el orden de los resultados no se paga.
        </p>
      </LegalSection>

      <LegalSection n={2} title="Tu cuenta">
        <p>
          Para publicar, guardar favoritos o reportar un aviso hace falta una cuenta. Sos
          responsable de lo que se haga desde la tuya.
        </p>
        <p>
          Los datos que cargues tienen que ser tuyos y ciertos: tu nombre, tu WhatsApp, tu
          ubicación.
        </p>
      </LegalSection>

      <LegalSection n={3} title="Qué se puede publicar">
        <p>
          Vehículos reales, que existan, que sean tuyos o que estés autorizado a vender, con
          fotos del vehículo de verdad y un precio real.
        </p>
        <p>No va:</p>
        <ul>
          <li>Autos que no existen, o que no están a la venta.</li>
          <li>Fotos que no son del vehículo publicado.</li>
          <li>Precios falsos para aparecer primero en el orden por precio.</li>
          <li>Datos de contacto de otra persona.</li>
          <li>El mismo vehículo publicado varias veces.</li>
          <li>Vehículos con pedido de secuestro, adulterados o de origen dudoso.</li>
        </ul>
      </LegalSection>

      <LegalSection n={4} title="Cuántos avisos">
        <p>
          Un particular puede tener hasta <strong>5 publicaciones activas</strong> a la vez;
          una concesionaria, hasta <strong>25</strong>. Los vehículos marcados como vendidos
          no ocupan lugar, así que podés seguir publicando sin borrar tu historial.
        </p>
        <p>
          Hay además un tope de avisos nuevos por día. Está puesto lo bastante alto como
          para que nadie que esté cargando su stock lo toque, y sirve para frenar scripts.
        </p>
      </LegalSection>

      <LegalSection n={5} title="Reportes y moderación">
        <p>
          Cualquiera con cuenta puede reportar un aviso, una vez por aviso. Cuando tres
          personas distintas reportan el mismo, el aviso se bloquea automáticamente y deja
          de verse mientras alguien lo revisa.
        </p>
        <p>
          Un aviso bloqueado no lo podés reactivar ni editar. Borrarlo sí. El umbral de tres
          es a propósito: con dos, dos competidores coordinados podrían bajar un aviso
          legítimo.
        </p>
        <p>
          También podemos bloquear o eliminar un aviso sin que nadie lo reporte, si rompe
          estas reglas.
        </p>
      </LegalSection>

      <LegalSection n={6} title="El sello de verificada">
        <p>
          Algunas cuentas muestran un sello de <strong>Verificada</strong>. Lo ponemos a
          mano, de a una, después de confirmar que el vendedor existe. No se pide desde
          ninguna pantalla y no se compra.
        </p>
        <p>
          Significa que confirmamos quién es, y nada más. No es una garantía sobre los
          vehículos que publica ni sobre cómo va a tratarte.
        </p>
      </LegalSection>

      <LegalSection n={7} title="Hasta dónde llegamos">
        <p>
          No revisamos los vehículos, no verificamos la documentación, no tasamos, no
          participamos del pago ni de la entrega. Todo eso pasa entre las dos personas, sin
          nosotros.
        </p>
        <p>
          Por eso, antes de cerrar: mirá el auto en persona, verificá la documentación y el
          informe de dominio, y desconfiá de cualquiera que te apure a señar sin verlo. Un
          precio muy por debajo del mercado casi nunca es una ganga.
        </p>
        <span className="legal__todo">
          Pendiente de revisión de un abogado: el alcance exacto de la limitación de
          responsabilidad, y qué corresponde bajo la Ley 24.240 de Defensa del Consumidor
          para una plataforma que pone en contacto a las partes.
        </span>
      </LegalSection>

      <LegalSection n={8} title="Los niveles y el garage">
        <p>
          Los niveles y el garage son una función del perfil, no una calificación de
          vendedor ni un aval nuestro. Salen de cosas que hiciste en el sitio y cambian solos
          si esas cosas cambian.
        </p>
      </LegalSection>

      <LegalSection n={9} title="Cambios y contacto">
        <p>
          Si estas reglas cambian, cambia la fecha de arriba. Ver también la{' '}
          <Link to="/privacy">política de privacidad</Link>.
        </p>
        <span className="legal__todo">
          Pendiente de definir: quién es el titular del servicio, el mail de contacto para
          reclamos, y la ley y jurisdicción aplicables.
        </span>
      </LegalSection>
    </LegalPage>
  )
}
