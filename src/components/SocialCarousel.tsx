import { ArrowLeft, ArrowRight, ExternalLink } from 'lucide-react'
import { useCallback, useEffect, useRef, useState } from 'react'
import type { SocialPost } from '../types'

const AUTOPLAY_DELAY = 5000

function mediaLabel(post: SocialPost, isDa: boolean) {
  if (post.mediaType === 'REELS') return 'Reel'
  if (post.mediaType === 'CAROUSEL_ALBUM') return isDa ? 'Karrusel' : 'Carousel'
  return isDa ? 'Opslag' : 'Post'
}

function formatPublishedAt(value: string, isDa: boolean) {
  const date = new Date(/^\d{4}-\d{2}-\d{2}$/.test(value) ? `${value}T12:00:00` : value)
  if (!Number.isFinite(date.getTime())) return value
  return new Intl.DateTimeFormat(isDa ? 'da-DK' : 'en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  }).format(date)
}

export function SocialCarousel({ posts, isDa }: { posts: SocialPost[]; isDa: boolean }) {
  const trackRef = useRef<HTMLDivElement>(null)
  const [activeIndex, setActiveIndex] = useState(0)
  const [hovered, setHovered] = useState(false)
  const [focused, setFocused] = useState(false)
  const [manuallyPaused, setManuallyPaused] = useState(false)
  const [hidden, setHidden] = useState(() => document.visibilityState === 'hidden')
  const [reducedMotion, setReducedMotion] = useState(false)

  const scrollToIndex = useCallback((index: number, manual = false) => {
    const track = trackRef.current
    if (!track || posts.length === 0) return
    const nextIndex = Math.max(0, Math.min(index, posts.length - 1))
    const slide = track.children[nextIndex] as HTMLElement | undefined
    if (!slide) return
    if (manual) setManuallyPaused(true)
    track.scrollTo({ left: slide.offsetLeft - track.offsetLeft, behavior: reducedMotion ? 'auto' : 'smooth' })
    setActiveIndex(nextIndex)
  }, [posts.length, reducedMotion])

  useEffect(() => {
    const media = window.matchMedia('(prefers-reduced-motion: reduce)')
    const updateMotion = () => setReducedMotion(media.matches)
    updateMotion()
    media.addEventListener('change', updateMotion)
    return () => media.removeEventListener('change', updateMotion)
  }, [])

  useEffect(() => {
    const updateVisibility = () => setHidden(document.visibilityState === 'hidden')
    document.addEventListener('visibilitychange', updateVisibility)
    return () => document.removeEventListener('visibilitychange', updateVisibility)
  }, [])

  useEffect(() => {
    if (hovered || focused || manuallyPaused || hidden || reducedMotion || posts.length < 2) return
    const timer = window.setInterval(() => {
      setActiveIndex((current) => {
        const next = (current + 1) % posts.length
        const track = trackRef.current
        const slide = track?.children[next] as HTMLElement | undefined
        if (track && slide) track.scrollTo({ left: slide.offsetLeft - track.offsetLeft, behavior: 'smooth' })
        return next
      })
    }, AUTOPLAY_DELAY)
    return () => window.clearInterval(timer)
  }, [focused, hidden, hovered, manuallyPaused, posts.length, reducedMotion])

  useEffect(() => {
    const track = trackRef.current
    if (!track) return
    let frame = 0
    const updateIndex = () => {
      window.cancelAnimationFrame(frame)
      frame = window.requestAnimationFrame(() => {
        const slides = Array.from(track.children) as HTMLElement[]
        if (!slides.length) return
        const nearest = slides.reduce((best, slide, index) =>
          Math.abs(slide.offsetLeft - track.offsetLeft - track.scrollLeft) <
          Math.abs(slides[best].offsetLeft - track.offsetLeft - track.scrollLeft) ? index : best, 0)
        setActiveIndex(nearest)
      })
    }
    track.addEventListener('scroll', updateIndex, { passive: true })
    return () => {
      track.removeEventListener('scroll', updateIndex)
      window.cancelAnimationFrame(frame)
    }
  }, [])

  const stopAutoplay = () => setManuallyPaused(true)

  if (posts.length === 0) return null

  return (
    <section
      className="social-carousel"
      aria-roledescription="carousel"
      aria-label={isDa ? 'Seneste Instagram-opslag' : 'Latest Instagram posts'}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onFocus={() => setFocused(true)}
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setFocused(false)
      }}
    >
      <div
        className="social-track"
        ref={trackRef}
        onPointerDown={stopAutoplay}
        onWheel={stopAutoplay}
        onTouchStart={stopAutoplay}
      >
        {posts.map((post, index) => (
          <article
            className="social-slide"
            key={post.id}
            aria-roledescription="slide"
            aria-label={`${index + 1} / ${posts.length}`}
          >
            <a
              href={post.postUrl}
              target="_blank"
              rel="noreferrer"
              aria-label={`${post.caption || mediaLabel(post, isDa)} — Instagram (${isDa ? 'åbner i ny fane' : 'opens in a new tab'})`}
            >
              <div className="social-image-wrap">
                <img src={post.image} alt="" loading="lazy" />
                <span className="social-media-badge">{mediaLabel(post, isDa)} <ExternalLink size={13} aria-hidden="true" /></span>
              </div>
              <p>{post.caption || (isDa ? 'Se opslaget på Instagram' : 'View the post on Instagram')}</p>
              <time dateTime={post.publishedAt}>{formatPublishedAt(post.publishedAt, isDa)}</time>
            </a>
          </article>
        ))}
      </div>
      <div className="carousel-controls">
        <div className="carousel-arrows">
          <button type="button" onClick={() => scrollToIndex(activeIndex - 1, true)} disabled={activeIndex === 0} aria-label={isDa ? 'Forrige opslag' : 'Previous post'}><ArrowLeft /></button>
          <button type="button" onClick={() => scrollToIndex(activeIndex + 1, true)} disabled={activeIndex === posts.length - 1} aria-label={isDa ? 'Næste opslag' : 'Next post'}><ArrowRight /></button>
        </div>
        <div className="carousel-dots" role="group" aria-label={isDa ? 'Vælg opslag' : 'Choose post'}>
          {posts.map((post, index) => <button key={post.id} type="button" className={index === activeIndex ? 'active' : ''} onClick={() => scrollToIndex(index, true)} aria-label={`${isDa ? 'Gå til opslag' : 'Go to post'} ${index + 1}`} aria-current={index === activeIndex ? 'true' : undefined} />)}
        </div>
      </div>
      <span className="sr-only" aria-live="polite">{`${isDa ? 'Opslag' : 'Post'} ${activeIndex + 1} ${isDa ? 'af' : 'of'} ${posts.length}`}</span>
    </section>
  )
}
