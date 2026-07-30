import { cleanup, render, screen, within } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'
import type { SocialPost } from '../types'
import { ViralShowcase } from './ViralShowcase'

const posts: SocialPost[] = [
  {
    id: 'one',
    caption: 'First look',
    publishedAt: '2026-07-11',
    image: '/images/social/one.webp',
    postUrl: 'https://www.instagram.com/reel/one/',
    mediaType: 'REELS',
    viewCount: 1_234_567,
  },
  {
    id: 'two',
    caption: 'Second look',
    publishedAt: '2026-07-10',
    image: '/images/social/two.webp',
    postUrl: 'https://www.instagram.com/p/two/',
    mediaType: 'IMAGE',
    viewCount: 12_500,
  },
  {
    id: 'three',
    caption: 'Third look',
    publishedAt: '2026-07-09',
    image: '/images/social/three.webp',
    postUrl: 'https://www.instagram.com/p/three/',
    mediaType: 'CAROUSEL_ALBUM',
    viewCount: 987,
  },
]

afterEach(cleanup)

describe('ViralShowcase', () => {
  it('stays hidden until three posts have valid insight counts', () => {
    const { container, rerender } = render(<ViralShowcase posts={posts.slice(0, 2)} isDa={false} />)
    expect(container).toBeEmptyDOMElement()

    rerender(<ViralShowcase posts={[posts[0], { ...posts[1], viewCount: undefined }, posts[2]]} isDa={false} />)
    expect(container).toBeEmptyDOMElement()

    rerender(<ViralShowcase posts={[posts[0], { ...posts[1], viewCount: Number.NaN }, posts[2]]} isDa={false} />)
    expect(container).toBeEmptyDOMElement()

    rerender(<ViralShowcase posts={[posts[0], { ...posts[1], viewCount: Number.POSITIVE_INFINITY }, posts[2]]} isDa={false} />)
    expect(container).toBeEmptyDOMElement()

    rerender(<ViralShowcase posts={[posts[0], { ...posts[1], viewCount: -1 }, posts[2]]} isDa={false} />)
    expect(container).toBeEmptyDOMElement()
  })

  it('keeps the supplied top-three order, visible ranks, and direct Instagram links', () => {
    render(
      <ViralShowcase
        posts={[...posts, { ...posts[0], id: 'four' }]}
        isDa={false}
        updatedAt="2026-07-30T12:00:00.000Z"
      />,
    )

    const showcase = screen.getByRole('region', { name: 'Most watched' })
    expect(within(showcase).getByText('Posts published in the 90 days through 30 Jul 2026'))
      .toBeInTheDocument()
    const items = within(showcase).getAllByRole('listitem')
    expect(items).toHaveLength(3)
    expect(items.map((item) => within(item).getByRole('link'))).toEqual([
      expect.objectContaining({ href: 'https://www.instagram.com/reel/one/' }),
      expect.objectContaining({ href: 'https://www.instagram.com/p/two/' }),
      expect.objectContaining({ href: 'https://www.instagram.com/p/three/' }),
    ])
    expect(items.map((item, index) => within(item).getByText(`#${index + 1}`).textContent)).toEqual(['#1', '#2', '#3'])
    expect(within(items[0]).getByRole('link')).toHaveAccessibleName(/Number 1: First look.*Instagram reel.*1\.2M views.*opens in a new tab/i)
    expect(within(items[0]).getByRole('link')).toHaveAttribute('target', '_blank')
    expect(within(items[0]).getByRole('link')).toHaveAttribute('rel', 'noreferrer')
  })

  it('formats compact view totals in Danish and English', () => {
    const { rerender } = render(<ViralShowcase posts={posts} isDa />)
    expect(screen.getByText(/1,2 mio\. visninger/)).toBeInTheDocument()
    expect(screen.getByText(/12,5 t visninger/)).toBeInTheDocument()
    expect(screen.getByText('987 visninger')).toBeInTheDocument()

    rerender(<ViralShowcase posts={posts} isDa={false} />)
    expect(screen.getByText(/^1\.2m views$/i)).toBeInTheDocument()
    expect(screen.getByText(/^12\.5k views$/i)).toBeInTheDocument()
    expect(screen.getByText('987 views')).toBeInTheDocument()
  })

  it('uses localized media labels for Reels, posts, and carousels', () => {
    const { rerender } = render(<ViralShowcase posts={posts} isDa={false} />)
    expect(screen.getByText('Reel')).toBeInTheDocument()
    expect(screen.getByText('Post')).toBeInTheDocument()
    expect(screen.getByText('Carousel')).toBeInTheDocument()

    rerender(<ViralShowcase posts={posts} isDa />)
    expect(screen.getByText('Reel')).toBeInTheDocument()
    expect(screen.getByText('Opslag')).toBeInTheDocument()
    expect(screen.getByText('Karrusel')).toBeInTheDocument()

    rerender(<ViralShowcase posts={[posts[0], { ...posts[1], mediaType: 'VIDEO' }, posts[2]]} isDa={false} />)
    expect(screen.getByText('Post')).toBeInTheDocument()
  })
})
