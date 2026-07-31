import { ExternalLink, Heart } from 'lucide-react'
import { useId } from 'react'
import type { SocialPost } from '../types'

type InstagramShowcaseMode = 'featured' | 'ranked'

type InstagramShowcaseProps = {
  posts: SocialPost[]
  isDa: boolean
  mode: InstagramShowcaseMode
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

function formatCount(value: number, isDa: boolean) {
  return new Intl.NumberFormat(isDa ? 'da-DK' : 'en-GB', {
    notation: 'compact',
    compactDisplay: 'short',
    maximumFractionDigits: 1,
  }).format(value)
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

export function InstagramShowcase({ posts, isDa, mode, updatedAt }: InstagramShowcaseProps) {
  const headingId = useId()
  const topPosts = posts.slice(0, 3)
  const isRanked = mode === 'ranked'
  const hasCompleteInsights = topPosts.length === 3 && topPosts.every(
    (post) => typeof post.viewCount === 'number' && Number.isFinite(post.viewCount) && post.viewCount >= 0,
  )
  const hasValidCaptureDate = typeof updatedAt === 'string' && Number.isFinite(Date.parse(updatedAt))
  const hasCompleteLikeSnapshot = !isRanked && hasValidCaptureDate && topPosts.length === 3
    && topPosts.every(
      (post) => typeof post.likeCount === 'number'
        && Number.isSafeInteger(post.likeCount)
        && post.likeCount >= 0,
    )
  const rankingWindow = updatedAt
    ? (isDa
        ? `Opslag udgivet i de 90 dage frem til ${formatDate(updatedAt, true)}`
        : `Posts published in the 90 days through ${formatDate(updatedAt, false)}`)
    : (isDa ? '90-dagesvinduet ved seneste synkronisering' : '90-day window at the latest sync')
  const eyebrow = isRanked
    ? rankingWindow
    : (isDa ? 'Udvalgt fra feedet' : 'Selected from the feed')
  const heading = isRanked
    ? (isDa ? 'Mest set' : 'Most watched')
    : (isDa ? 'Lige nu på Instagram' : 'Right now on Instagram')
  const description = isRanked
    ? (isDa ? 'De opslag, I ikke kunne slippe.' : 'The posts you could not stop watching.')
    : (isDa
        ? 'Tre glimt fra Decades — åbn opslagene på Instagram.'
        : 'Three glimpses from Decades — open each post on Instagram.')
  const likeSnapshotLabel = hasCompleteLikeSnapshot
    ? (isDa
        ? `Likes aflæst ${formatDate(updatedAt!, true)} — ikke live`
        : `Likes captured ${formatDate(updatedAt!, false)} — not live`)
    : null
  const List = isRanked ? 'ol' : 'ul'

  if (topPosts.length === 0 || (isRanked && !hasCompleteInsights)) return null

  return (
    <section className="viral-showcase" aria-labelledby={headingId}>
      <div className="viral-showcase-heading">
        <span className="eyebrow">{eyebrow}</span>
        <h3 id={headingId}>{heading}</h3>
        <div className="viral-showcase-summary">
          <p>{description}</p>
          {likeSnapshotLabel && (
            <span className="viral-like-snapshot">
              <Heart size={13} aria-hidden="true" />
              {likeSnapshotLabel}
            </span>
          )}
        </div>
      </div>

      <List className="viral-showcase-list" role="list">
        {topPosts.map((post, index) => {
          const position = index + 1
          const mediaLabel = mediaLabels[post.mediaType][isDa ? 'da' : 'en']
          const views = isRanked ? formatViews(post.viewCount!, isDa) : null
          const likes = hasCompleteLikeSnapshot ? formatCount(post.likeCount!, isDa) : null
          const accessibleLikes = hasCompleteLikeSnapshot
            ? `${post.likeCount} ${post.likeCount === 1 ? 'like' : 'likes'}, ${likeSnapshotLabel}`
            : null
          const caption = post.caption.trim() || (isDa ? 'Se opslaget på Instagram' : 'View the post on Instagram')
          const linkLabel = isRanked
            ? (isDa
                ? `Nummer ${position}: ${caption} — ${mediaLabel} på Instagram, ${views} (åbner i ny fane)`
                : `Number ${position}: ${caption} — Instagram ${mediaLabel.toLowerCase()}, ${views} (opens in a new tab)`)
            : (isDa
                ? `${caption} — ${mediaLabel} på Instagram${accessibleLikes ? `, ${accessibleLikes}` : ''} (åbner i ny fane)`
                : `${caption} — Instagram ${mediaLabel.toLowerCase()}${accessibleLikes ? `, ${accessibleLikes}` : ''} (opens in a new tab)`)
          const marker = isRanked ? `#${position}` : String(position).padStart(2, '0')

          return (
            <li className={`viral-card viral-card--${position}`} key={post.id}>
              <a href={post.postUrl} target="_blank" rel="noreferrer" aria-label={linkLabel}>
                <span className="viral-rank" aria-hidden="true">{marker}</span>
                <div className="viral-image-wrap">
                  <img src={post.image} alt="" loading="lazy" />
                  <span className="viral-media-badge">
                    {mediaLabel}
                    <ExternalLink size={13} aria-hidden="true" />
                  </span>
                </div>
                <div className="viral-card-copy">
                  {views && <strong className="viral-view-count">{views}</strong>}
                  {likes && (
                    <strong
                      className="viral-like-count"
                      aria-label={`${post.likeCount} ${post.likeCount === 1 ? 'like' : 'likes'}`}
                    >
                      <Heart size={14} fill="currentColor" aria-hidden="true" />
                      {likes}
                    </strong>
                  )}
                  <p>{caption}</p>
                  <time dateTime={post.publishedAt}>{formatDate(post.publishedAt, isDa)}</time>
                </div>
              </a>
            </li>
          )
        })}
      </List>
    </section>
  )
}
