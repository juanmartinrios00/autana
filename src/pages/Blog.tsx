import { PostCard } from '../components/blog/PostCard'
import { BRAND, pageTitle } from '../config/brand'
import { postsByDate } from '../content/blog/posts'
import { useDocumentMeta } from '../hooks/useDocumentMeta'
import './Blog.css'

/**
 * El listado del blog.
 *
 * La nota más nueva va grande y al ancho, y el resto en grilla. Con cuatro
 * artículos una grilla pareja no le da entrada a nadie: son cuatro tarjetas
 * del mismo peso y el ojo no sabe por dónde empezar.
 */
export function Blog() {
  const [lead, ...rest] = postsByDate()

  useDocumentMeta({
    title: pageTitle('Notas'),
    description: `Trámites, precios y qué mirar antes de comprar o vender un auto en Argentina. Las notas de ${BRAND}.`,
  })

  return (
    <div className="blog">
      <header className="page blog__head">
        <span className="over">Notas</span>
        <h1 className="blog__title">Lo que conviene saber antes de firmar.</h1>
        <p className="blog__lead">
          Trámites, precios y las cosas que nadie te cuenta hasta que ya es tarde. Escrito para
          comprar y vender en Argentina, sin relleno.
        </p>
      </header>

      <div className="page blog__list">
        {lead && <PostCard post={lead} variant="lead" />}

        <div className="blog__grid">
          {rest.map((post) => (
            <PostCard post={post} key={post.slug} />
          ))}
        </div>
      </div>
    </div>
  )
}
