import storedFeed from './instagram-feed.json'
import type { SocialFeed, SocialFeedManifest, SocialPost } from '../types'

const mediaTypes = new Set(['IMAGE', 'VIDEO', 'CAROUSEL_ALBUM', 'REELS'])
const sources = new Set(['fallback', 'fixture', 'instagram'])

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value)
}

function assertIdList(value: unknown, field: string, limit: number) {
  if (!Array.isArray(value) || value.some((id) => typeof id !== 'string')) {
    throw new Error(`Instagram feed ${field} must be an array of post IDs`)
  }
  if (value.length > limit || new Set(value).size !== value.length) {
    throw new Error(`Instagram feed ${field} contains too many or duplicate IDs`)
  }
}

export function validateSocialFeedManifest(value: unknown): SocialFeedManifest {
  if (!isRecord(value) || value.schemaVersion !== 1) {
    throw new Error('Instagram feed has an unsupported schema version')
  }
  if (typeof value.source !== 'string' || !sources.has(value.source)) {
    throw new Error('Instagram feed has an invalid source')
  }
  if (value.source === 'fixture') {
    throw new Error('Fixture Instagram feeds cannot be loaded by the customer app')
  }
  if (
    value.updatedAt !== null
    && (typeof value.updatedAt !== 'string' || !Number.isFinite(Date.parse(value.updatedAt)))
  ) {
    throw new Error('Instagram feed has an invalid update time')
  }
  if (value.source === 'instagram' && value.updatedAt === null) {
    throw new Error('A verified Instagram feed must include an update time')
  }

  assertIdList(value.latestIds, 'latestIds', 8)
  assertIdList(value.viralIds, 'viralIds', 3)
  if ((value.viralIds as string[]).length !== 0 && (value.viralIds as string[]).length !== 3) {
    throw new Error('Instagram feed viralIds must contain either zero or three IDs')
  }
  if (!isRecord(value.posts)) throw new Error('Instagram feed posts must be an object')

  for (const [key, candidate] of Object.entries(value.posts)) {
    if (!isRecord(candidate) || candidate.id !== key) {
      throw new Error(`Instagram feed post ${key} has an invalid ID`)
    }
    if (
      !/^[A-Za-z0-9_-]+$/.test(key) ||
      typeof candidate.caption !== 'string'
      || Array.from(candidate.caption as string).length > 500
      || typeof candidate.publishedAt !== 'string'
      || !Number.isFinite(Date.parse(candidate.publishedAt))
      || typeof candidate.image !== 'string'
      || !/^images\/social\/[A-Za-z0-9_-]+\.(?:avif|gif|jpe?g|png|webp)$/i.test(candidate.image)
      || typeof candidate.postUrl !== 'string'
      || typeof candidate.mediaType !== 'string'
      || !mediaTypes.has(candidate.mediaType)
    ) {
      throw new Error(`Instagram feed post ${key} is malformed`)
    }
    let postUrl
    try {
      postUrl = new URL(candidate.postUrl)
    } catch {
      throw new Error(`Instagram feed post ${key} has an invalid permalink`)
    }
    if (
      postUrl.protocol !== 'https:'
      || !['instagram.com', 'www.instagram.com'].includes(postUrl.hostname.toLowerCase())
      || postUrl.username !== ''
      || postUrl.password !== ''
      || postUrl.port !== ''
    ) {
      throw new Error(`Instagram feed post ${key} has an invalid permalink`)
    }
    if (
      candidate.viewCount !== undefined
      && (!Number.isSafeInteger(candidate.viewCount) || (candidate.viewCount as number) < 0)
    ) {
      throw new Error(`Instagram feed post ${key} has an invalid view count`)
    }
  }

  for (const id of [...(value.latestIds as string[]), ...(value.viralIds as string[])]) {
    if (!Object.hasOwn(value.posts, id)) {
      throw new Error(`Instagram feed references missing post ${id}`)
    }
  }
  for (const id of value.viralIds as string[]) {
    const post = value.posts[id] as Record<string, unknown>
    if (!Number.isSafeInteger(post.viewCount) || (post.viewCount as number) < 0) {
      throw new Error(`Instagram viral post ${id} has no verified view count`)
    }
  }

  return value as unknown as SocialFeedManifest
}

const manifest = validateSocialFeedManifest(storedFeed)

export function hydrateSocialFeed(stored: SocialFeedManifest, baseUrl: string): SocialFeed {
  const base = baseUrl.endsWith('/') ? baseUrl : `${baseUrl}/`
  const hydratePost = (id: string): SocialPost | undefined => {
    const post = stored.posts[id]
    return post ? { ...post, image: `${base}${post.image.replace(/^\/+/, '')}` } : undefined
  }
  const hydrateList = (ids: string[]) =>
    ids.map(hydratePost).filter((post): post is SocialPost => Boolean(post))

  return {
    schemaVersion: stored.schemaVersion,
    source: stored.source,
    updatedAt: stored.updatedAt,
    latest: hydrateList(stored.latestIds),
    viral: stored.source === 'instagram' ? hydrateList(stored.viralIds) : [],
  }
}

export const socialFeed = hydrateSocialFeed(manifest, import.meta.env.BASE_URL)
