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
  eyebrow: string
  title: string
  text: string
  cta: { label: string; to: string }
  Drawing: () => React.ReactElement
}

const svg = {
  viewBox: '0 0 320 220',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.25,
  strokeLinecap: 'square' as const,
  strokeLinejoin: 'miter' as const,
  'aria-hidden': true,
  focusable: 'false' as const,
}

/* La grilla de fondo, igual en los tres: es lo que hace que los dibujos se
   lean como un plano y no como tres ilustraciones distintas. */
function Grid() {
  return (
    <g className="pillar__grid">
      {Array.from({ length: 9 }, (_, i) => (
        <path key={`h${i}`} d={`M0 ${i * 27.5}h320`} />
      ))}
      {Array.from({ length: 13 }, (_, i) => (
        <path key={`v${i}`} d={`M${i * 26.7} 0v220`} />
      ))}
    </g>
  )
}

/* Cuatro pasos: cuatro casillas en fila y el avance marcado sobre la primera. */
function SimpleDrawing() {
  return (
    <svg {...svg} className="pillar__svg">
      <Grid />
      <path d="M62 92h42v42H62zM116 92h42v42h-42zM170 92h42v42h-42zM224 92h42v42h-42z" />
      <path d="M104 113h12M158 113h12M212 113h12" />
      <g className="pillar__accent">
        <path d="M74 113l8 8 16-18" />
        <path d="M62 148h42" />
      </g>
    </svg>
  )
}

/* Directo: dos nodos y una línea entre ellos, sin nada en el medio. */
function DirectDrawing() {
  return (
    <svg {...svg} className="pillar__svg">
      <Grid />
      <circle cx="84" cy="110" r="26" />
      <circle cx="236" cy="110" r="26" />
      <path d="M110 110h116" />
      <path d="M216 100l10 10-10 10" />
      <g className="pillar__accent">
        <rect x="142" y="86" width="36" height="28" />
        <path d="M148 96h24M148 104h16" />
      </g>
    </svg>
  )
}

/* Claro: una ficha con los campos llenos y nada tapado. */
function ClearDrawing() {
  return (
    <svg {...svg} className="pillar__svg">
      <Grid />
      <rect x="82" y="52" width="156" height="116" />
      <path d="M82 84h156" />
      <path d="M100 106h52M100 124h52M100 142h34" />
      <path d="M168 106h52M168 124h34" />
      <g className="pillar__accent">
        <path d="M96 62h40" />
        <circle cx="212" cy="68" r="7" />
        <path d="M168 146h52" />
      </g>
    </svg>
  )
}

const pillars: Pillar[] = [
  {
    id: 'simple',
    eyebrow: 'Simple',
    title: 'Publicar son cuatro pasos.',
    text: 'Datos del vehículo, fotos, precio y contacto. El borrador se guarda solo mientras lo completás, así que podés empezar desde el celular y terminarlo más tarde. Sin llamadas, sin que nadie te tenga que habilitar y sin esperar a que un asesor te confirme el aviso.',
    cta: { label: 'Publicar mi vehículo', to: '/sell' },
    Drawing: SimpleDrawing,
  },
  {
    id: 'directo',
    eyebrow: 'Directo',
    title: 'Del otro lado hay una persona.',
    text: 'El interesado te escribe al WhatsApp que dejaste, con el mensaje armado y el link del aviso. No hay un chat nuestro en el medio, no guardamos la conversación y nadie te llama después para ofrecerte otra cosa.',
    cta: { label: 'Ver los autos publicados', to: '/cars' },
    Drawing: DirectDrawing,
  },
  {
    id: 'claro',
    eyebrow: 'Claro',
    title: 'Los datos son los que son.',
    text: 'Kilometraje, año, dónde está y quién lo publica: si es particular o agencia, y desde cuándo tiene cuenta. Sin puntajes inventados ni sellos que no quieren decir nada. Lo que se puede verificar, y nada más.',
    cta: { label: 'Cómo funcionan los niveles', to: '/levels' },
    Drawing: ClearDrawing,
  },
]

export function Pillars() {
  return (
    <section className="pillars" aria-labelledby="pillars-title">
      <h2 className="sr-only" id="pillars-title">
        Por qué {BRAND}
      </h2>

      {pillars.map((pillar) => (
        <article className="pillar" key={pillar.id}>
          <div className="pillar__inner">
            <div className="pillar__top">
              <h3 className="pillar__title">{pillar.title}</h3>
              <div className="pillar__art">
                <pillar.Drawing />
              </div>
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
