import { cleanup, render, screen, within } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'
import type { SocialPost } from '../types'
import { InstagramShowcase } from './InstagramShowcase'

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

describe('InstagramShowcase', () => {
  it('shows an editorial preview without popularity claims or metrics', () => {
    const featuredPosts = [
      ...posts,
      { ...posts[0], id: 'four', postUrl: 'https://www.instagram.com/p/four/' },
    ]
    render(<InstagramShowcase posts={featuredPosts} isDa={false} mode="featured" />)

    const showcase = screen.getByRole('region', { name: 'Right now on Instagram' })
    expect(within(showcase).getByText('Selected from the feed')).toBeInTheDocument()
    expect(within(showcase).getByText('Three glimpses from Decades — open each post on Instagram.'))
      .toBeInTheDocument()
    expect(within(showcase).queryByText('Most watched')).not.toBeInTheDocument()
    expect(within(showcase).queryByText(/views$/i)).not.toBeInTheDocument()

    const list = within(showcase).getByRole('list')
    expect(list.tagName).toBe('UL')
    const items = within(list).getAllByRole('listitem')
    expect(items).toHaveLength(3)
    expect(items.map((item) => within(item).getByRole('link'))).toEqual([
      expect.objectContaining({ href: 'https://www.instagram.com/reel/one/' }),
      expect.objectContaining({ href: 'https://www.instagram.com/p/two/' }),
      expect.objectContaining({ href: 'https://www.instagram.com/p/three/' }),
    ])
    expect(items.map((item, index) => within(item).getByText(`0${index + 1}`).textContent))
      .toEqual(['01', '02', '03'])
    expect(within(items[0]).getByRole('link'))
      .toHaveAccessibleName(/First look.*Instagram reel.*opens in a new tab/i)
    expect(within(showcase).queryByRole('link', { name: /four/i })).not.toBeInTheDocument()
  })

  it('localizes the editorial preview in Danish', () => {
    render(<InstagramShowcase posts={posts} isDa mode="featured" />)

    const showcase = screen.getByRole('region', { name: 'Lige nu på Instagram' })
    expect(within(showcase).getByText('Udvalgt fra feedet')).toBeInTheDocument()
    expect(within(showcase).getByText('Tre glimt fra Decades — åbn opslagene på Instagram.'))
      .toBeInTheDocument()
    expect(within(showcase).queryByText(/visninger$/i)).not.toBeInTheDocument()
  })

  it('shows a complete dated like snapshot without turning the feature into a ranking', () => {
    const likedPosts = posts.map((post, index) => ({
      ...post,
      caption: index === 1 ? '' : post.caption,
      likeCount: [6, 20, 16][index],
    }))
    render(
      <InstagramShowcase
        posts={likedPosts}
        isDa={false}
        mode="featured"
        updatedAt="2026-07-31T04:20:00.000Z"
      />,
    )

    const showcase = screen.getByRole('region', { name: 'Right now on Instagram' })
    expect(within(showcase).getByText('Likes captured 31 Jul 2026 — not live'))
      .toBeInTheDocument()
    expect(within(showcase).getByLabelText('6 likes')).toHaveTextContent('6')
    expect(within(showcase).getByLabelText('20 likes')).toHaveTextContent('20')
    expect(within(showcase).getByLabelText('16 likes')).toHaveTextContent('16')
    expect(within(showcase).getByText('View the post on Instagram')).toBeInTheDocument()
    expect(within(showcase).getByRole('list').tagName).toBe('UL')
    expect(within(showcase).queryByText('Most watched')).not.toBeInTheDocument()
    expect(within(showcase).queryByText(/views$/i)).not.toBeInTheDocument()
    expect(within(showcase).getAllByRole('link')[0])
      .toHaveAccessibleName(/First look.*6 likes.*Likes captured 31 Jul 2026.*opens in a new tab/i)
  })

  it('localizes the like snapshot and hides every like when the snapshot is incomplete', () => {
    const likedPosts = posts.map((post, index) => ({
      ...post,
      likeCount: [6, 20, 16][index],
    }))
    const { rerender } = render(
      <InstagramShowcase
        posts={likedPosts}
        isDa
        mode="featured"
        updatedAt="2026-07-31T04:20:00.000Z"
      />,
    )

    expect(screen.getByText('Likes aflæst 31. jul. 2026 — ikke live')).toBeInTheDocument()
    expect(screen.getByLabelText('6 likes')).toBeInTheDocument()

    rerender(
      <InstagramShowcase
        posts={[likedPosts[0], { ...likedPosts[1], likeCount: undefined }, likedPosts[2]]}
        isDa
        mode="featured"
        updatedAt="2026-07-31T04:20:00.000Z"
      />,
    )
    expect(screen.queryByText(/Likes aflæst/)).not.toBeInTheDocument()
    expect(screen.queryByLabelText(/likes/)).not.toBeInTheDocument()

    rerender(
      <InstagramShowcase
        posts={likedPosts}
        isDa
        mode="featured"
        updatedAt={null}
      />,
    )
    expect(screen.queryByText(/Likes aflæst/)).not.toBeInTheDocument()
    expect(screen.queryByLabelText(/likes/)).not.toBeInTheDocument()
  })

  it('stays hidden in ranked mode until three posts have valid insight counts', () => {
    const { container, rerender } = render(
      <InstagramShowcase posts={posts.slice(0, 2)} isDa={false} mode="ranked" />,
    )
    expect(container).toBeEmptyDOMElement()

    rerender(<InstagramShowcase posts={[posts[0], { ...posts[1], viewCount: undefined }, posts[2]]} isDa={false} mode="ranked" />)
    expect(container).toBeEmptyDOMElement()

    rerender(<InstagramShowcase posts={[posts[0], { ...posts[1], viewCount: Number.NaN }, posts[2]]} isDa={false} mode="ranked" />)
    expect(container).toBeEmptyDOMElement()

    rerender(<InstagramShowcase posts={[posts[0], { ...posts[1], viewCount: Number.POSITIVE_INFINITY }, posts[2]]} isDa={false} mode="ranked" />)
    expect(container).toBeEmptyDOMElement()

    rerender(<InstagramShowcase posts={[posts[0], { ...posts[1], viewCount: -1 }, posts[2]]} isDa={false} mode="ranked" />)
    expect(container).toBeEmptyDOMElement()
  })

  it('keeps the supplied top-three order, visible ranks, and direct Instagram links', () => {
    render(
      <InstagramShowcase
        posts={[...posts, { ...posts[0], id: 'four' }]}
        isDa={false}
        mode="ranked"
        updatedAt="2026-07-30T12:00:00.000Z"
      />,
    )

    const showcase = screen.getByRole('region', { name: 'Most watched' })
    expect(within(showcase).getByText('Posts published in the 90 days through 30 Jul 2026'))
      .toBeInTheDocument()
    expect(within(showcase).getByRole('list').tagName).toBe('OL')
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
    const { rerender } = render(<InstagramShowcase posts={posts} isDa mode="ranked" />)
    expect(screen.getByText(/1,2 mio\. visninger/)).toBeInTheDocument()
    expect(screen.getByText(/12,5 t visninger/)).toBeInTheDocument()
    expect(screen.getByText('987 visninger')).toBeInTheDocument()

    rerender(<InstagramShowcase posts={posts} isDa={false} mode="ranked" />)
    expect(screen.getByText(/^1\.2m views$/i)).toBeInTheDocument()
    expect(screen.getByText(/^12\.5k views$/i)).toBeInTheDocument()
    expect(screen.getByText('987 views')).toBeInTheDocument()
  })

  it('uses localized media labels for Reels, posts, and carousels', () => {
    const { rerender } = render(<InstagramShowcase posts={posts} isDa={false} mode="ranked" />)
    expect(screen.getByText('Reel')).toBeInTheDocument()
    expect(screen.getByText('Post')).toBeInTheDocument()
    expect(screen.getByText('Carousel')).toBeInTheDocument()

    rerender(<InstagramShowcase posts={posts} isDa mode="ranked" />)
    expect(screen.getByText('Reel')).toBeInTheDocument()
    expect(screen.getByText('Opslag')).toBeInTheDocument()
    expect(screen.getByText('Karrusel')).toBeInTheDocument()

    rerender(<InstagramShowcase posts={[posts[0], { ...posts[1], mediaType: 'VIDEO' }, posts[2]]} isDa={false} mode="ranked" />)
    expect(screen.getByText('Post')).toBeInTheDocument()
  })
})
