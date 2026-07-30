import { ExternalLink } from 'lucide-react'
import { useId } from 'react'
import type { SocialPost } from '../types'

type ViralShowcaseProps = {
  posts: SocialPost[]
  isDa: boolean
  updatedAt?: string | null
}

const mediaLabels: Record<SocialPost['mediaType'], { da: string; en: string }> = {
  IMAGE: { da: 'Opslag', en: 'Post' },
  VIDEO: { da: 'Opslag', en: 'Post' },
  CAROUSEL_ALBUM: { da: 'Karrusel', en: 'Carousel' },
  REELS: { da: 'Reel', en: 'Reel' },
}

function formatViews(viewCount: number, isDa: boolean) {
  const locale = isDa ? 'da-DK' : 'en-GB'
  const count = new Intl.NumberFormat(locale, {
    notation: 'compact',
    compactDisplay: 'short',
    maximumFractionDigits: 1,
  }).format(viewCount)

  if (isDa) return `${count} ${viewCount === 1 ? 'visning' : 'visninger'}`
  return `${count} ${viewCount === 1 ? 'view' : 'views'}`
}

function formatDate(publishedAt: string, isDa: boolean) {
  const date = new Date(publishedAt.includes('T') ? publishedAt : `${publishedAt}T12:00:00`)
  if (!Number.isFinite(date.getTime())) return publishedAt

  return new Intl.DateTimeFormat(isDa ? 'da-DK' : 'en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  }).format(date)
}

export function ViralShowcase({ posts, isDa, updatedAt }: ViralShowcaseProps) {
  const headingId = useId()
  const topPosts = posts.slice(0, 3)
  const hasCompleteInsights = topPosts.length === 3 && topPosts.every(
    (post) => typeof post.viewCount === 'number' && Number.isFinite(post.viewCount) && post.viewCount >= 0,
  )
  const rankingWindow = updatedAt
    ? (isDa
        ? `Opslag udgivet i de 90 dage frem til ${formatDate(updatedAt, true)}`
        : `Posts published in the 90 days through ${formatDate(updatedAt, false)}`)
    : (isDa ? '90-dagesvinduet ved seneste synkronisering' : '90-day window at the latest sync')

  if (!hasCompleteInsights) return null

  return (
    <section className="viral-showcase" aria-labelledby={headingId}>
      <div className="viral-showcase-heading">
        <span className="eyebrow">{rankingWindow}</span>
        <h3 id={headingId}>{isDa ? 'Mest set' : 'Most watched'}</h3>
        <p>{isDa ? 'De opslag, I ikke kunne slippe.' : 'The posts you could not stop watching.'}</p>
      </div>

      <ol className="viral-showcase-list" role="list">
        {topPosts.map((post, index) => {
          const rank = index + 1
          const mediaLabel = mediaLabels[post.mediaType][isDa ? 'da' : 'en']
          const views = formatViews(post.viewCount!, isDa)
          const caption = post.caption.trim() || (isDa ? 'Se opslaget på Instagram' : 'View the post on Instagram')
          const linkLabel = isDa
            ? `Nummer ${rank}: ${caption} — ${mediaLabel} på Instagram, ${views} (åbner i ny fane)`
            : `Number ${rank}: ${caption} — Instagram ${mediaLabel.toLowerCase()}, ${views} (opens in a new tab)`

          return (
            <li className={`viral-card viral-card--${rank}`} key={post.id}>
              <a href={post.postUrl} target="_blank" rel="noreferrer" aria-label={linkLabel}>
                <span className="viral-rank" aria-hidden="true">#{rank}</span>
                <div className="viral-image-wrap">
                  <img src={post.image} alt="" loading="lazy" />
                  <span className="viral-media-badge">
                    {mediaLabel}
                    <ExternalLink size={13} aria-hidden="true" />
                  </span>
                </div>
                <div className="viral-card-copy">
                  <strong className="viral-view-count">{views}</strong>
                  <p>{caption}</p>
                  <time dateTime={post.publishedAt}>{formatDate(post.publishedAt, isDa)}</time>
                </div>
              </a>
            </li>
          )
        })}
      </ol>
    </section>
  )
}
