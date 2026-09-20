import { PostCard } from '../blog/PostCard'
import { postsByDate } from '../../content/blog/posts'
import { Slider } from '../ui/Slider'

export function BlogSlider() {
  const posts = postsByDate()

  if (posts.length === 0) return null

  return (
    <Slider
      eyebrow="Blog"
      title="Lo que conviene saber"
      action={{ label: 'Ver todo', to: '/blog' }}
      itemWidth="340px"
    >
      {posts.map((post) => (
        <PostCard post={post} variant="compact" as="h3" key={post.slug} />
      ))}
    </Slider>
  )
}
