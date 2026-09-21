import { Link } from 'react-router-dom'
import { BRAND } from '../../config/brand'
import { Icon } from '../ui/Icon'
import './Pillars.css'

/**
 * Los tres motivos, en paneles que se apilan.
 *
 * Cada panel se pega arriba de la pantalla y el siguiente le sube encima. Uno
 * se lee entero antes de que aparezca el otro, y al final quedan los tres
 * amontonados como un mazo — se ve que eran tres y que se leyeron todos.
 *
 * Es `position: sticky` y nada más: sin librería de scroll, sin JavaScript
 * midiendo la página y sin `IntersectionObserver`. Un scroll que depende de JS
 * se traba en un celular barato justo en la parte que tiene que impresionar.
 *
 * Son sólo texto. Tenían un dibujo cada uno ---casillas, dos nodos, una ficha,
 * sobre una grilla de plano--- y se sacaron: el título a ese tamaño ya llena el
 * panel, y el dibujo le competía sin decir nada que el texto no dijera.
 *
 * Los tres hablan de cómo funciona el producto —es simple, hablás con la
 * persona, los datos son los que son— y ninguno habla de precio.
 *
 * Eso es a propósito. El precio todavía no está decidido para siempre: hoy
 * publicar no cuesta nada, pero es probable que en algún momento haya planes,
 * sobre todo para agencias. Una sección que se apoya en "es gratis" hay que
 * reescribirla el día que eso cambie, y mientras tanto queda como una promesa
 * que alguien puede citar. Lo que dicen estos tres va a seguir siendo verdad
 * con cualquier lista de precios.
 *
 * Lo que sí cuesta hoy, y cuánto, vive en la pantalla de concesionarias y en
 * las preguntas frecuentes, que son dos lugares y se actualizan sin tocar la
 * portada.
 */

interface Pillar {
  id: string
  /**
   * De qué color va el panel. Los tres eran tinta y el apilado se sostenía con
   * una hairline arriba de cada uno; con un color por panel, el que sube tapa
   * al anterior con un cambio de fondo entero y la línea sobra.
   *
   * Va declarado y no salido del índice para que reordenar la lista reordene
   * también los colores, sin que haya que acordarse de nada.
   */
  tone: 'tinta' | 'amarillo' | 'claro'
  eyebrow: string
  title: string
  text: string
  cta: { label: string; to: string }
}

const pillars: Pillar[] = [
  {
    id: 'simple',
    tone: 'tinta',
    eyebrow: 'Simple',
    title: 'Publicar son cuatro pasos.',
    text: 'Datos del vehículo, fotos, precio y contacto. El borrador se guarda solo mientras lo completás, así que podés empezar desde el celular y terminarlo más tarde. Sin llamadas, sin que nadie te tenga que habilitar y sin esperar a que un asesor te confirme el aviso.',
    cta: { label: 'Publicar mi vehículo', to: '/vender' },
  },
  {
    id: 'directo',
    tone: 'amarillo',
    eyebrow: 'Directo',
    title: 'Del otro lado hay una persona.',
    text: 'El interesado te escribe al WhatsApp que dejaste, con el mensaje armado y el link del aviso. No hay un chat nuestro en el medio, no guardamos la conversación y nadie te llama después para ofrecerte otra cosa.',
    cta: { label: 'Ver los autos publicados', to: '/autos' },
  },
  {
    id: 'claro',
    tone: 'claro',
    eyebrow: 'Claro',
    title: 'Los datos son los que son.',
    text: 'Kilometraje, año, dónde está y quién lo publica: si es particular o agencia, y desde cuándo tiene cuenta. Sin puntajes inventados ni sellos que no quieren decir nada. Lo que se puede verificar, y nada más.',
    cta: { label: 'Cómo funcionan los niveles', to: '/niveles' },
  },
]

export function Pillars() {
  return (
    <section className="pillars" aria-labelledby="pillars-title">
      <h2 className="sr-only" id="pillars-title">
        Por qué {BRAND}
      </h2>

      {pillars.map((pillar) => (
        <article className={`pillar pillar--${pillar.tone}`} key={pillar.id}>
          <div className="pillar__inner">
            <div className="pillar__top">
              <h3 className="pillar__title">{pillar.title}</h3>
            </div>

            <span className="pillar__eyebrow">{pillar.eyebrow}</span>

            <div className="pillar__bottom">
              <p className="pillar__text">{pillar.text}</p>
              <Link className="pillar__cta" to={pillar.cta.to}>
                {pillar.cta.label}
                <Icon name="arrowCorner" size={16} strokeWidth={1} />
              </Link>
            </div>
          </div>
        </article>
      ))}
    </section>
  )
}
