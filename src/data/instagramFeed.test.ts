import { describe, expect, it } from 'vitest'
import storedFeed from './instagram-feed.json'
import { hydrateSocialFeed, socialFeed, validateSocialFeedManifest } from './instagramFeed'
import type { SocialFeedManifest } from '../types'

describe('instagram feed manifest', () => {
  it('hydrates the checked-in fallback in manifest order', () => {
    expect(socialFeed.schemaVersion).toBe(1)
    expect(socialFeed.source).toBe('fallback')
    expect(socialFeed.updatedAt).toBeNull()
    expect(socialFeed.latest).toHaveLength(8)
    expect(socialFeed.latest.map((post) => post.id)).toEqual([
      'social-1',
      'social-2',
      'social-3',
      'social-4',
      'social-5',
      'social-6',
      'social-7',
      'social-8',
    ])
  })

  it('hydrates local covers with the configured Vite base path', () => {
    const deployedFeed = hydrateSocialFeed(storedFeed as SocialFeedManifest, '/decades_vintage_dk/')
    expect(deployedFeed.latest[0].image).toBe('/decades_vintage_dk/images/social/Dapd0UdthqR.webp')
  })

  it('does not publish unverified popularity data in the fallback', () => {
    expect(socialFeed.viral).toEqual([])
    expect(socialFeed.latest.every((post) => post.viewCount === undefined)).toBe(true)
  })

  it('does not expose fixture popularity data as verified Instagram insights', () => {
    const fixture = structuredClone(storedFeed) as unknown as SocialFeedManifest
    fixture.source = 'fixture'
    fixture.updatedAt = '2026-07-30T12:00:00.000Z'
    fixture.viralIds = fixture.latestIds.slice(0, 3)
    fixture.viralIds.forEach((id, index) => {
      fixture.posts[id].viewCount = 1_000 - index
    })

    expect(() => validateSocialFeedManifest(fixture)).toThrow(/Fixture Instagram feeds/)

    fixture.source = 'instagram'
    expect(hydrateSocialFeed(validateSocialFeedManifest(fixture), '/').viral).toHaveLength(3)
  })

  it('rejects duplicate IDs, external assets, and incomplete viral rankings', () => {
    const duplicate = structuredClone(storedFeed) as unknown as SocialFeedManifest
    duplicate.latestIds = ['social-1', 'social-1']
    expect(() => validateSocialFeedManifest(duplicate)).toThrow(/duplicate IDs/)

    const externalAsset = structuredClone(storedFeed) as unknown as SocialFeedManifest
    externalAsset.posts['social-1'].image = 'https://example.com/tracker.jpg'
    expect(() => validateSocialFeedManifest(externalAsset)).toThrow(/malformed/)

    const incompleteViral = structuredClone(storedFeed) as unknown as SocialFeedManifest
    incompleteViral.viralIds = ['social-1', 'social-2']
    expect(() => validateSocialFeedManifest(incompleteViral)).toThrow(/zero or three/)
  })
})
