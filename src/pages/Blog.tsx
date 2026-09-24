import { PostCard } from '../components/blog/PostCard'
import { PageHead } from '../components/ui/PageHead'
import { BRAND, pageTitle } from '../config/brand'
import { postsByDate } from '../content/blog/posts'
import { useDarkHero } from '../hooks/useDarkHero'
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
  useDarkHero()

  useDocumentMeta({
    title: pageTitle('Blog'),
    description: `Trámites, precios y qué mirar antes de comprar o vender un auto en Argentina. El blog de ${BRAND}.`,
  })

  return (
    <div className="blog">
      <PageHead
        kicker="Blog"
        title="Lo que conviene saber antes de firmar."
        lead="Trámites, precios y las cosas que nadie te cuenta hasta que ya es tarde. Escrito para comprar y vender en Argentina, sin relleno."
      />

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
