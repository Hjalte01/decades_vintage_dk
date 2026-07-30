import { act, cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { SocialCarousel } from './SocialCarousel'
import type { SocialPost } from '../types'

const posts: SocialPost[] = [
  { id:'1', caption:'First Reel', publishedAt:'2026-07-11', image:'/images/social/one.webp', postUrl:'https://www.instagram.com/reel/one/', mediaType:'REELS' },
  { id:'2', caption:'Second post', publishedAt:'2026-07-10T10:30:00+00:00', image:'/images/social/two.webp', postUrl:'https://www.instagram.com/p/two/', mediaType:'IMAGE' },
  { id:'3', caption:'Third carousel', publishedAt:'2026-07-09', image:'/images/social/three.webp', postUrl:'https://www.instagram.com/p/three/', mediaType:'CAROUSEL_ALBUM' },
]

describe('SocialCarousel', () => {
  const scrollTo = vi.fn()

  beforeEach(() => {
    vi.stubGlobal('matchMedia', vi.fn().mockReturnValue({
      matches: false,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    }))
    Object.defineProperty(HTMLElement.prototype, 'scrollTo', { configurable: true, value: scrollTo })
    scrollTo.mockClear()
  })

  afterEach(() => {
    cleanup()
    vi.useRealTimers()
    vi.unstubAllGlobals()
  })

  it('renders local covers, original Reel links, arrows and position dots', () => {
    render(<SocialCarousel posts={posts} isDa={false} />)

    const reelLink = screen.getByRole('link', { name: /First Reel/ })
    expect(reelLink).toHaveAttribute('href', 'https://www.instagram.com/reel/one/')
    expect(reelLink.querySelector('img')).toHaveAttribute('src', '/images/social/one.webp')
    expect(screen.getByText('Reel')).toBeInTheDocument()
    expect(screen.getByText('Post')).toBeInTheDocument()
    expect(screen.getByText('Carousel')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Previous post' })).toBeDisabled()

    fireEvent.click(screen.getByRole('button', { name: 'Next post' }))
    expect(scrollTo).toHaveBeenCalled()
    expect(screen.getByRole('button', { name: 'Previous post' })).toBeEnabled()

    fireEvent.click(screen.getByRole('button', { name: 'Go to post 3' }))
    expect(screen.getByRole('button', { name: 'Go to post 3' })).toHaveAttribute('aria-current', 'true')
  })

  it('autoplays after five seconds and stops after manual interaction', () => {
    vi.useFakeTimers()
    render(<SocialCarousel posts={posts} isDa={false} />)

    act(() => vi.advanceTimersByTime(5000))
    expect(scrollTo).toHaveBeenCalledTimes(1)

    fireEvent.pointerDown(screen.getByRole('region', { name: 'Latest Instagram posts' }).querySelector('.social-track')!)
    act(() => vi.advanceTimersByTime(10000))
    expect(scrollTo).toHaveBeenCalledTimes(1)
  })

  it('does not autoplay when reduced motion is requested', () => {
    vi.useFakeTimers()
    vi.stubGlobal('matchMedia', vi.fn().mockReturnValue({
      matches: true,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    }))
    render(<SocialCarousel posts={posts} isDa={false} />)

    act(() => vi.advanceTimersByTime(10000))
    expect(scrollTo).not.toHaveBeenCalled()
  })

  it('uses an accessible fallback for captionless posts and renders nothing for an empty feed', () => {
    const { rerender } = render(
      <SocialCarousel
        posts={[{ ...posts[1], caption: '', publishedAt: 'not-a-date' }]}
        isDa={false}
      />,
    )

    expect(screen.getByRole('link', { name: 'Post — Instagram (opens in a new tab)' })).toBeInTheDocument()
    expect(screen.getByText('View the post on Instagram')).toBeInTheDocument()
    expect(screen.getByText('not-a-date')).toBeInTheDocument()

    rerender(<SocialCarousel posts={[]} isDa={false} />)
    expect(screen.queryByRole('region', { name: 'Latest Instagram posts' })).not.toBeInTheDocument()
  })
})
