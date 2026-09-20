import { Link } from 'react-router-dom'
import { coverFor, longDate } from '../../lib/blog'
import type { PostMeta } from '../../content/blog/posts'
import { Icon } from '../ui/Icon'
import './PostCard.css'

/**
 * La tarjeta de una nota, en sus tres tamaños.
 *
 * La usan el listado —una destacada arriba y el resto en grilla— y el pie de
 * cada artículo. Es la misma tarjeta con distinto peso y no tres marcados
 * parecidos: si mañana cambia el hover o el recorte de la foto, cambia en un
 * lugar.
 */

type Variant = 'lead' | 'grid' | 'compact'

/**
 * La portada, o una lámina con el tema escrito mientras no haya foto.
 *
 * La lámina es a propósito y no un hueco esperando: un blog que arranca sin
 * fotos tiene que verse terminado igual.
 */
export function PostCover({ post, eager = false }: { post: PostMeta; eager?: boolean }) {
  const src = coverFor(post.slug)

  if (src) {
    return (
      <img
        className="pcard__img"
        src={src}
        alt=""
        loading={eager ? 'eager' : 'lazy'}
        decoding="async"
      />
    )
  }

  return (
    <div className="pcard__fallback" aria-hidden="true">
      <svg viewBox="0 0 320 200" fill="none" stroke="currentColor" strokeWidth={1}>
        {Array.from({ length: 8 }, (_, i) => (
          <path key={`h${i}`} d={`M0 ${i * 28.6}h320`} />
        ))}
        {Array.from({ length: 12 }, (_, i) => (
          <path key={`v${i}`} d={`M${i * 29} 0v200`} />
        ))}
      </svg>
      <span className="pcard__fallback-tag">{post.tag}</span>
    </div>
  )
}

interface PostCardProps {
  post: PostMeta
  variant?: Variant
  /** El encabezado que le corresponde según dónde esté la tarjeta. */
  as?: 'h2' | 'h3'
}

export function PostCard({ post, variant = 'grid', as: Heading = 'h2' }: PostCardProps) {
  const lead = variant === 'lead'
  const compact = variant === 'compact'

  return (
    <Link className={`pcard${lead ? ' pcard--lead' : ''}`} to={`/blog/${post.slug}`}>
      <div className="pcard__media">
        <PostCover post={post} eager={lead} />
      </div>

      <div className="pcard__body">
        {/* La fecha completa sólo en la destacada. En una tarjeta chica ocupa
            media línea y no ayuda a decidir si vale la pena entrar. */}
        <span className="pcard__meta mono">
          {post.tag} · {lead ? `${longDate(post.date)} · ` : ''}
          {post.minutes} min
        </span>

        <Heading className="pcard__title">{post.title}</Heading>

        {!compact && (
          <>
            <p className="pcard__summary">{post.summary}</p>
            <span className="pcard__more">
              Leer la nota
              <Icon name="arrowCorner" size={16} strokeWidth={1} />
            </span>
          </>
        )}
      </div>
    </Link>
  )
}
