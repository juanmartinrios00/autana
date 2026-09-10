import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { useDocumentMeta } from '../hooks/useDocumentMeta'
import './Help.css'

/**
 * Ayuda.
 *
 * Todo lo que dice acá es lo que la aplicación hace, no lo que nos gustaría que
 * hiciera: los topes salen de `005_listing_limits.sql`, el bloqueo por tres
 * reportes de `006_reports.sql`, quién ve tu WhatsApp de la `008`, y que los
 * favoritos sin cuenta vivan en el navegador, de `FavoritesProvider`.
 *
 * No se menciona ninguna función que no exista. Es la pantalla que abre alguien
 * que ya se trabó con algo, y mandarlo a buscar un botón que no está es peor que
 * no tener ayuda.
 */

interface Item {
  q: string
  a: ReactNode
}

interface Topic {
  id: string
  label: string
  title: string
  items: Item[]
}

const TOPICS: Topic[] = [
  {
    id: 'comprar',
    label: 'Comprar',
    title: 'Buscar y contactar',
    items: [
      {
        q: '¿Necesito cuenta para buscar?',
        a: (
          <p>
            No. Buscar, filtrar, abrir una ficha y comparar no piden cuenta. Guardar
            favoritos tampoco: sin cuenta se guardan en tu navegador. Eso significa que si
            borrás los datos del navegador, o entrás desde otro teléfono, no van a estar.
            Con cuenta te siguen a donde entres.
          </p>
        ),
      },
      {
        q: '¿Cómo le escribo al vendedor?',
        a: (
          <p>
            Con el botón de WhatsApp de la ficha. Se abre el chat con un mensaje que ya
            menciona el auto y el link, así el vendedor sabe de cuál le hablás. El número
            sólo se entrega desde un aviso publicado: si el aviso está pausado o bloqueado,
            no hay botón.
          </p>
        ),
      },
      {
        q: '¿Cómo comparo dos autos?',
        a: (
          <p>
            Desde el botón de comparar de cada card, y después en{' '}
            <Link to="/compare">Comparar</Link>. La comparación vive en la dirección del
            navegador, así que mandarle a alguien los dos autos es copiar el link.
          </p>
        ),
      },
      {
        q: '¿Puedo guardar una búsqueda para volver después?',
        a: (
          <p>
            Sí, con cuenta y con filtros puestos: arriba de los resultados aparece{' '}
            <strong>Guardar búsqueda</strong>, le ponés un nombre y queda en{' '}
            <Link to="/favorites">Favoritos</Link>. Todavía no avisamos por mail cuando
            aparece un auto que le cierra: eso necesita algo que corra solo todos los días y
            no está construido, así que preferimos no ofrecerlo antes de que exista.
          </p>
        ),
      },
      {
        q: '¿Los primeros resultados están pagos?',
        a: (
          <p>
            No, y no hay forma de pagar para estar más arriba. No vendemos posiciones
            destacadas. El orden sale de lo que elegiste en el filtro y nada más.
          </p>
        ),
      },
    ],
  },
  {
    id: 'vender',
    label: 'Vender',
    title: 'Publicar tu auto',
    items: [
      {
        q: '¿Cuánto cuesta publicar?',
        a: (
          <p>
            Nada, y no cobramos comisión por vender. No intervenimos en el pago: eso lo
            arreglás directo con el comprador.
          </p>
        ),
      },
      {
        q: '¿Cuántos avisos puedo tener?',
        a: (
          <p>
            Cinco activos si sos particular, veinticinco si sos concesionaria. Los que
            marcás como vendidos no ocupan lugar, así que podés seguir publicando sin
            borrar tu historial. Hay además un tope de avisos nuevos por día, alto como
            para que no lo toques cargando tu stock.{' '}
            <Link to="/dealers">Cómo pasar a concesionaria</Link>.
          </p>
        ),
      },
      {
        q: '¿Cuántas fotos conviene subir?',
        a: (
          <p>
            No hay un máximo. Las publicaciones con ocho o más reciben bastante más
            consultas, y la primera es la que se ve en los resultados: poné la mejor
            adelante.
          </p>
        ),
      },
      {
        q: '¿Puedo editar, pausar o marcar como vendido?',
        a: (
          <p>
            Las tres cosas, desde <Link to="/my-listings">Mis publicaciones</Link>. Al
            editar, los cambios en las fotos se aplican al instante; el resto se guarda
            cuando confirmás.
          </p>
        ),
      },
      {
        q: 'Cerré la pestaña a mitad de publicar, ¿perdí todo?',
        a: (
          <p>
            El borrador se guarda solo, en ese navegador. Las fotos no: esas hay que volver
            a subirlas.
          </p>
        ),
      },
    ],
  },
  {
    id: 'seguridad',
    label: 'Seguridad',
    title: 'Antes de cerrar una operación',
    items: [
      {
        q: '¿Autana revisa los autos?',
        a: (
          <p>
            No. No vemos los vehículos, no controlamos la documentación y no participamos
            del pago ni de la entrega. Cada aviso es responsabilidad de quien lo publicó.
          </p>
        ),
      },
      {
        q: '¿Qué miro antes de comprar?',
        a: (
          <ul>
            <li>Vé el auto en persona. Siempre.</li>
            <li>Pedí el informe de dominio y hacé la verificación policial.</li>
            <li>Que los números de motor y chasis coincidan con los papeles.</li>
            <li>
              No transfieras ni señes nada antes de ver el vehículo. Si te apuran a hacerlo,
              eso solo ya es motivo para cortar.
            </li>
            <li>
              Un precio muy por debajo del mercado casi nunca es una ganga. Es la carnada
              más común.
            </li>
          </ul>
        ),
      },
      {
        q: '¿Cómo reporto un aviso?',
        a: (
          <p>
            Con el botón de reportar de la ficha. Hace falta tener cuenta, y se puede
            reportar una vez por aviso. Cuando tres personas distintas reportan el mismo, el
            aviso se bloquea solo y deja de verse mientras alguien lo revisa. Su dueño no lo
            puede reactivar.
          </p>
        ),
      },
      {
        q: '¿Qué significa el sello Verificada?',
        a: (
          <p>
            Que confirmamos a mano que ese vendedor existe. No se pide desde ninguna
            pantalla y no se compra, por eso quiere decir algo. Lo que <em>no</em> significa
            es que respondamos por los autos que publica ni por cómo va a tratarte.
          </p>
        ),
      },
      {
        q: '¿Quién ve mi número de WhatsApp?',
        a: (
          <p>
            Quien abre uno de tus avisos publicados. Es el número con el que te van a
            escribir, así que tiene que ser visible ahí, pero no aparece en ninguna lista ni
            se entrega a quien no esté mirando un aviso tuyo.
          </p>
        ),
      },
      {
        q: '¿Las fotos delatan dónde vivo?',
        a: (
          <p>
            No. Casi todos los teléfonos meten las coordenadas GPS dentro de cada foto, así
            que una foto sacada en tu puerta lleva tu dirección sin que se vea. Antes de
            subir, la imagen se reprocesa en tu propio navegador y eso descarta esos datos.
            Vale para los avisos, el garage y la foto de perfil.
          </p>
        ),
      },
    ],
  },
  {
    id: 'cuenta',
    label: 'Tu cuenta',
    title: 'Entrar y salir',
    items: [
      {
        q: '¿Cómo me registro?',
        a: (
          <p>
            Con tu mail y una contraseña, en <Link to="/login">Ingresar</Link>. Quedás
            dentro en el momento, sin esperar ningún correo.
          </p>
        ),
      },
      {
        q: '¿Cómo cambio mi nombre, mi WhatsApp o mi ubicación?',
        a: (
          <p>
            En <Link to="/settings">Ajustes</Link>, desde el menú de tu cuenta. Ahí también
            elegís si publicás como particular o como concesionaria. Antes esos datos sólo
            se cargaban al publicar un aviso; ya no.
          </p>
        ),
      },
      {
        q: '¿Cómo cambio mi contraseña?',
        a: (
          <p>
            En <Link to="/settings">Ajustes</Link>. Te vamos a pedir la actual: sin eso,
            cualquiera que agarre tu teléfono desbloqueado con la sesión abierta podría
            dejarte afuera de tu propia cuenta.
          </p>
        ),
      },
      {
        q: 'Me olvidé la contraseña',
        a: (
          <p>
            En la pantalla de ingreso, arriba del separador, está{' '}
            <strong>¿Olvidaste tu contraseña? Ponete una nueva</strong>. Te mandamos un link
            al correo y, al abrirlo, podés escribir una nueva sin que te pidamos la anterior:
            abrir ese link ya prueba que la cuenta es tuya. Dura poco, así que abrilo ahí
            mismo.
          </p>
        ),
      },
      {
        q: '¿Dónde cambio mi foto o cierro sesión?',
        a: (
          <p>
            Tocando tu foto arriba a la derecha se abre el menú de tu cuenta, con tus
            publicaciones, tu garage, tus ajustes y el botón de cerrar sesión. La foto se
            cambia desde el ícono de cámara en <Link to="/profile">tu perfil</Link>, y el
            nombre, el WhatsApp y la ubicación desde <Link to="/settings">Ajustes</Link>.
          </p>
        ),
      },
    ],
  },
  {
    id: 'garage',
    label: 'Garage y niveles',
    title: 'Lo que no es vender',
    items: [
      {
        q: '¿Qué es el garage?',
        a: (
          <p>
            Cuatro espacios para los autos que te marcaron, que no son los que vendés: el
            primero, el de hoy, el que soñás y el que más extrañás. Es público y tiene su
            propio link, para compartirlo. Si no querés que se vea, no lo cargues.
          </p>
        ),
      },
      {
        q: '¿Los niveles dicen si un vendedor es confiable?',
        a: (
          <p>
            No, y es importante: son un juego del perfil. Se suben haciendo cosas en el
            sitio, incluido cargar autos en el garage, que es nostalgia y no dice nada sobre
            con quién es seguro encontrarse. A quien mira tus autos le mostramos hechos: si
            estás verificada y desde cuándo tenés cuenta.{' '}
            <Link to="/levels">Cómo funcionan los niveles</Link>.
          </p>
        ),
      },
    ],
  },
]

export function Help() {
  useDocumentMeta({
    title: 'Ayuda | Autana',
    description:
      'Cómo buscar, publicar y contactar en Autana, qué mirar antes de cerrar una operación y cómo funciona tu cuenta.',
  })

  return (
    <>
      <section className="help__head">
        <div className="page help__head-inner">
          <span className="over over--invert">Ayuda</span>
          <h1 className="help__title">Cómo funciona esto</h1>
          <p className="help__lead">
            Si algo no está acá, probablemente todavía no exista. Preferimos decirlo así
            antes que mandarte a buscar un botón que no está.
          </p>
        </div>
      </section>

      <div className="page help__body">
        {/* El índice por tópico. Es lo que hace que la pantalla sirva desde el
            celular: sin él hay que scrollear cinco secciones para ver si lo que
            buscás está. */}
        <nav className="help__index" aria-label="Temas de ayuda">
          {TOPICS.map((topic) => (
            <a key={topic.id} href={`#${topic.id}`} className="help__index-link">
              {topic.label}
            </a>
          ))}
        </nav>

        {TOPICS.map((topic) => (
          <section className="help__topic" key={topic.id} id={topic.id}>
            <h2 className="help__topic-title">{topic.title}</h2>
            <div className="help__list">
              {topic.items.map((item) => (
                <details className="help__item" key={item.q}>
                  <summary className="help__q">{item.q}</summary>
                  <div className="help__a">{item.a}</div>
                </details>
              ))}
            </div>
          </section>
        ))}

        <p className="help__foot">
          También podés leer los <Link to="/terms">términos</Link> y la{' '}
          <Link to="/privacy">política de privacidad</Link>.
        </p>
      </div>
    </>
  )
}
