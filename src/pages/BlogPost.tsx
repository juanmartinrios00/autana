import { Link, useParams } from 'react-router-dom'
import { PostCard } from '../components/blog/PostCard'
import { Button } from '../components/ui/Button'
import { EmptyState } from '../components/ui/EmptyState'
import { Icon } from '../components/ui/Icon'
import { BRAND, pageTitle } from '../config/brand'
import { bodies } from '../content/blog/bodies'
import { findPost, postsByDate } from '../content/blog/posts'
import { useDocumentMeta } from '../hooks/useDocumentMeta'
import { coverFor, longDate } from '../lib/blog'
import './BlogPost.css'

/**
 * Un artículo.
 *
 * El `structuredData` no es adorno: es lo que hace que Google muestre la fecha
 * y el autor en el resultado en vez de una línea suelta. Un blog que existe
 * para posicionar y no lo declara está trabajando a medias.
 *
 * Las etiquetas para WhatsApp y las redes las pone el Worker antes de que
 * corra nada de esto —leen el HTML crudo y no ejecutan JavaScript—. Acá se
 * ponen igual para Google, que sí lo ejecuta, y para el título de la pestaña.
 */
export function BlogPost() {
  const { slug = '' } = useParams()
  const post = findPost(slug)
  const body = bodies[slug]

  const cover = post ? coverFor(post.slug) : null

  useDocumentMeta({
    title: post ? pageTitle(post.title) : pageTitle('Nota no encontrada'),
    description: post?.summary,
    image: cover ?? undefined,
    structuredData: post
      ? {
          '@context': 'https://schema.org',
          '@type': 'Article',
          headline: post.title,
          description: post.summary,
          datePublished: post.date,
          dateModified: post.date,
          author: { '@type': 'Organization', name: BRAND },
          publisher: { '@type': 'Organization', name: BRAND },
        }
      : undefined,
  })

  if (!post || !body) {
    return (
      <div className="page section">
        <EmptyState
          icon="search"
          title="No encontramos esa nota"
          description="Puede que haya cambiado de dirección o que nunca haya existido."
          action={
            <Link to="/blog">
              <Button variant="yellow">Ver todas las notas</Button>
            </Link>
          }
        />
      </div>
    )
  }

  /* Las otras notas, para que el artículo no termine en una pared. Se sacan
     por fecha y se saca la actual: con cuatro no hace falta nada más fino que
     eso, y "relacionadas por tema" con cuatro artículos es una mentira. */
  const others = postsByDate()
    .filter((other) => other.slug !== post.slug)
    .slice(0, 3)

  return (
    <article className="post">
      <header className="page post__head">
        <Link className="post__back" to="/blog">
          <Icon name="arrowLeft" size={16} />
          Todas las notas
        </Link>

        <span className="over">{post.tag}</span>
        <h1 className="post__title">{post.title}</h1>
        <p className="post__summary">{post.summary}</p>

        <div className="post__meta mono">
          <time dateTime={post.date}>{longDate(post.date)}</time>
          <span aria-hidden="true">·</span>
          <span>{post.minutes} minutos de lectura</span>
        </div>
      </header>

      {cover && (
        <div className="page post__cover">
          <img src={cover} alt="" decoding="async" />
        </div>
      )}

      <div className="page post__body prose">{body}</div>

      <div className="page post__cta">
        <div className="post__cta-copy">
          <h2>¿Estás por vender el tuyo?</h2>
          <p>Publicar es gratis y el contacto va directo a tu WhatsApp. Sin comisión.</p>
        </div>
        <Link to="/sell">
          <Button variant="dark" arrow>
            Publicar mi vehículo
          </Button>
        </Link>
      </div>

      <aside className="page post__more" aria-labelledby="post-more-title">
        <h2 className="post__more-title" id="post-more-title">
          Seguí leyendo
        </h2>
        <div className="post__more-grid">
          {others.map((other) => (
            <PostCard post={other} variant="compact" as="h3" key={other.slug} />
          ))}
        </div>
      </aside>
    </article>
  )
}
