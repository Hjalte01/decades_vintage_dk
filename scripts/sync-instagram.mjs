#!/usr/bin/env node

import { createHash } from 'node:crypto'
import { link, mkdir, mkdtemp, readFile, rename, rm, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { pathToFileURL } from 'node:url'

const DAY_MS = 24 * 60 * 60 * 1000
const LATEST_LIMIT = 8
const VIRAL_LIMIT = 3
const MEDIA_CAP = 250
const DEFAULT_GRAPH_VERSION = 'v26.0'
const DEFAULT_MANIFEST = 'src/data/instagram-feed.json'
const DEFAULT_IMAGES = 'public/images/social'
const PUBLIC_IMAGE_DIRECTORY = 'images/social'
const MEDIA_FIELDS = [
  'id',
  'caption',
  'media_type',
  'media_product_type',
  'media_url',
  'thumbnail_url',
  'permalink',
  'timestamp',
  'children{id,media_type,media_url,thumbnail_url,timestamp}',
].join(',')
const INSIGHT_METRICS = ['views', 'reach', 'total_interactions']
const SUPPORTED_MEDIA_TYPES = new Set(['IMAGE', 'VIDEO', 'CAROUSEL_ALBUM', 'REELS'])
const PROVENANCE_VALUES = new Set(['instagram', 'fixture'])
const MAX_CAPTION_CODE_POINTS = 500
const MAX_IMAGE_BYTES = 25 * 1024 * 1024
const MAX_CDN_REDIRECTS = 4
const DOWNLOAD_TIMEOUT_MS = 15_000
const GRAPH_TIMEOUT_MS = 20_000
const CDN_HOST_SUFFIXES = ['.cdninstagram.com', '.fbcdn.net']
const REDIRECT_STATUSES = new Set([301, 302, 303, 307, 308])
const IMAGE_EXTENSIONS = new Map([
  ['image/jpeg', 'jpg'],
  ['image/jpg', 'jpg'],
  ['image/pjpeg', 'jpg'],
  ['image/png', 'png'],
  ['image/webp', 'webp'],
  ['image/avif', 'avif'],
  ['image/gif', 'gif'],
])

class InstagramApiError extends Error {
  constructor(message, status) {
    super(message)
    this.name = 'InstagramApiError'
    this.status = status
  }
}

function asNonEmptyString(value, field) {
  if (typeof value !== 'string' || value.trim() === '') {
    throw new Error(`Instagram media is missing a valid ${field}`)
  }
  return value
}

function asDate(value, field = 'timestamp') {
  const date = value instanceof Date ? new Date(value) : new Date(value)
  if (Number.isNaN(date.getTime())) {
    throw new Error(`Invalid ${field}: expected an ISO date`)
  }
  return date
}

function safeMediaId(value) {
  const id = asNonEmptyString(value, 'id')
  if (!/^[A-Za-z0-9_-]+$/.test(id)) {
    throw new Error(`Instagram media id contains unsafe characters: ${id}`)
  }
  return id
}

function safeHttpUrl(value, field) {
  const raw = asNonEmptyString(value, field)
  let url
  try {
    url = new URL(raw)
  } catch {
    throw new Error(`Instagram media has an invalid ${field}`)
  }
  if (!['https:', 'http:', 'data:'].includes(url.protocol)) {
    throw new Error(`Instagram media has an unsupported ${field} protocol`)
  }
  return url.href
}

function safeInstagramPermalink(value) {
  const raw = asNonEmptyString(value, 'permalink')
  let url
  try {
    url = new URL(raw)
  } catch {
    throw new Error('Instagram media has an invalid permalink')
  }
  if (
    url.protocol !== 'https:'
    || !['instagram.com', 'www.instagram.com'].includes(url.hostname.toLowerCase())
    || url.username !== ''
    || url.password !== ''
    || url.port !== ''
  ) {
    throw new Error('Instagram media permalink must be an HTTPS Instagram URL')
  }
  return url.href
}

function normalizedMediaType(media) {
  if (media.media_type === 'REELS' || media.media_product_type === 'REELS') {
    return 'REELS'
  }
  return media.media_type
}

function normalizedCaption(value) {
  if (typeof value !== 'string') return ''
  const codePoints = Array.from(value)
  if (codePoints.length <= MAX_CAPTION_CODE_POINTS) return value
  return `${codePoints.slice(0, MAX_CAPTION_CODE_POINTS - 1).join('')}…`
}

function childItems(media) {
  if (Array.isArray(media.children)) return media.children
  if (Array.isArray(media.children?.data)) return media.children.data
  return []
}

function imageUrlForItem(media) {
  const type = normalizedMediaType(media)
  if (type === 'VIDEO' || type === 'REELS') {
    return media.thumbnail_url ?? media.media_url
  }
  return media.media_url ?? media.thumbnail_url
}

function coverUrlForMedia(media, mediaType) {
  const parentCover = imageUrlForItem(media)
  if (parentCover) return safeHttpUrl(parentCover, 'cover URL')

  if (mediaType === 'CAROUSEL_ALBUM') {
    const firstChild = childItems(media)[0]
    const childCover = firstChild && imageUrlForItem(firstChild)
    if (childCover) return safeHttpUrl(childCover, 'carousel child cover URL')
  }

  throw new Error(`Instagram media ${String(media.id ?? '')} has no usable cover`)
}

/**
 * Normalize a parent item from `GET /me/media`.
 * Children are used only as a cover fallback; their insights are never queried.
 */
export function normalizeMedia(media) {
  if (!media || typeof media !== 'object' || Array.isArray(media)) {
    throw new Error('Instagram media response contains a malformed item')
  }

  const mediaType = normalizedMediaType(media)
  if (!SUPPORTED_MEDIA_TYPES.has(mediaType)) return null
  if (media.media_product_type === 'STORY') return null

  const id = safeMediaId(media.id)
  const publishedAt = asDate(media.timestamp).toISOString()
  const postUrl = safeInstagramPermalink(media.permalink)
  const coverUrl = coverUrlForMedia(media, mediaType)

  return {
    id,
    caption: normalizedCaption(media.caption),
    publishedAt,
    postUrl,
    mediaType,
    coverUrl,
  }
}

function compareNewest(a, b) {
  const byDate = Date.parse(b.publishedAt) - Date.parse(a.publishedAt)
  return byDate || a.id.localeCompare(b.id)
}

function pageData(page) {
  if (!page || typeof page !== 'object' || !Array.isArray(page.data)) {
    throw new Error('Instagram media response is malformed: expected a data array')
  }
  return page.data
}

/**
 * Fetch parent media until there are at least eight usable items and a page has
 * crossed the 90-day boundary, or until pagination/the 250-item cap is reached.
 */
export async function collectMedia(source, now) {
  const currentTime = asDate(now, 'now')
  const cutoff = currentTime.getTime() - 90 * DAY_MS
  const seenIds = new Set()
  const seenCursors = new Set()
  const media = []
  let cursor = null
  let inspected = 0
  let crossedCutoff = false
  let selectionWindowComplete = false

  while (inspected < MEDIA_CAP) {
    const cursorKey = cursor ?? '__first__'
    if (seenCursors.has(cursorKey)) {
      throw new Error('Instagram pagination returned a cursor loop')
    }
    seenCursors.add(cursorKey)

    const page = await source.getMediaPage(cursor)
    const items = pageData(page)

    for (const item of items) {
      if (inspected >= MEDIA_CAP) break
      inspected += 1

      const normalized = normalizeMedia(item)
      if (!normalized) continue
      if (Date.parse(normalized.publishedAt) < cutoff) crossedCutoff = true
      if (seenIds.has(normalized.id)) continue

      seenIds.add(normalized.id)
      media.push(normalized)
    }

    media.sort(compareNewest)
    if (media.length >= LATEST_LIMIT && crossedCutoff) {
      selectionWindowComplete = true
      break
    }

    cursor = page.nextCursor ?? page.paging?.next ?? null
    if (!cursor || items.length === 0) break
  }

  if (inspected >= MEDIA_CAP && !selectionWindowComplete) {
    throw new Error(
      'Instagram media exceeded the 250-item safety cap before the 90-day selection window was complete',
    )
  }

  return media.sort(compareNewest)
}

function metricValue(metric) {
  if (!metric || typeof metric !== 'object') return undefined
  if (metric.period != null && metric.period !== 'lifetime') return undefined

  if (metric.total_value && typeof metric.total_value === 'object') {
    return metric.total_value.value
  }
  if (Array.isArray(metric.values) && metric.values.length > 0) {
    return metric.values.at(-1)?.value
  }
  return metric.value
}

function isValidCount(value) {
  return Number.isSafeInteger(value) && value >= 0
}

/**
 * Return a complete, genuine insight triple or null. A partial response is not
 * filled with zeroes because doing so would mix real analytics with fake values.
 */
export function parseInsights(response) {
  if (response == null) return null

  let values
  if (Array.isArray(response.data)) {
    values = Object.fromEntries(
      response.data
        .filter((metric) => metric && typeof metric.name === 'string')
        .map((metric) => [metric.name, metricValue(metric)]),
    )
  } else if (typeof response === 'object' && !Array.isArray(response)) {
    values = response
  } else {
    return null
  }

  const views = values.views
  const reach = values.reach
  const totalInteractions = values.total_interactions
  if (![views, reach, totalInteractions].every(isValidCount)) return null

  return { views, reach, totalInteractions }
}

function compareViral(a, b) {
  return (
    b.insights.views - a.insights.views
    || b.insights.reach - a.insights.reach
    || b.insights.totalInteractions - a.insights.totalInteractions
    || Date.parse(b.post.publishedAt) - Date.parse(a.post.publishedAt)
    || a.post.id.localeCompare(b.post.id)
  )
}

async function mapWithConcurrency(items, concurrency, callback) {
  const results = new Array(items.length)
  let nextIndex = 0

  async function worker() {
    while (nextIndex < items.length) {
      const index = nextIndex
      nextIndex += 1
      results[index] = await callback(items[index], index)
    }
  }

  const workers = await Promise.allSettled(
    Array.from({ length: Math.min(concurrency, items.length) }, () => worker()),
  )
  const failedWorker = workers.find(({ status }) => status === 'rejected')
  if (failedWorker) throw failedWorker.reason
  return results
}

/**
 * Select the latest eight and the top three eligible posts. Exactly 48 hours
 * and exactly 90 days old are eligible. Viral output is all-or-nothing.
 */
export async function selectPosts(media, source, now) {
  const currentTime = asDate(now, 'now')
  const currentMs = currentTime.getTime()
  const newestEligible = currentMs - 48 * 60 * 60 * 1000
  const oldestEligible = currentMs - 90 * DAY_MS
  const ordered = [...media].sort(compareNewest)
  const latest = ordered.slice(0, LATEST_LIMIT)
  const candidates = ordered.filter((post) => {
    const publishedMs = Date.parse(post.publishedAt)
    return publishedMs >= oldestEligible && publishedMs <= newestEligible
  })

  const insightResults = await mapWithConcurrency(candidates, 4, async (post) => {
    const response = await source.getInsights(post.id)
    const insights = parseInsights(response)
    return insights ? { post, insights } : null
  })

  const ranked = insightResults.filter(Boolean).sort(compareViral)
  const viral = ranked.length >= VIRAL_LIMIT
    ? ranked.slice(0, VIRAL_LIMIT).map(({ post }) => post)
    : []
  const insightsById = new Map(
    insightResults
      .filter(Boolean)
      .map(({ post, insights }) => [post.id, insights]),
  )

  return { latest, viral, insightsById }
}

function manifestPost(post, insights, imageFilename) {
  const result = {
    id: post.id,
    caption: post.caption,
    publishedAt: post.publishedAt,
    image: `${PUBLIC_IMAGE_DIRECTORY}/${imageFilename}`,
    postUrl: post.postUrl,
    mediaType: post.mediaType,
  }
  if (insights) result.viewCount = insights.views
  return result
}

function uniquePosts(latest, viral) {
  const posts = new Map()
  for (const post of [...latest, ...viral]) posts.set(post.id, post)
  return [...posts.values()]
}

function normalizeDownload(download) {
  if (download instanceof Uint8Array || Buffer.isBuffer(download)) {
    const bytes = Buffer.from(download)
    if (bytes.length === 0) throw new Error('Image download returned an empty file')
    if (bytes.length > MAX_IMAGE_BYTES) {
      throw new Error('Instagram cover exceeds the 25 MB safety limit')
    }
    return { bytes, contentType: undefined, extension: 'jpg' }
  }
  if (!download || typeof download !== 'object') {
    throw new Error('Image download returned no data')
  }

  const bytes = download.bytes instanceof Uint8Array
    ? Buffer.from(download.bytes)
    : Buffer.isBuffer(download.bytes)
      ? Buffer.from(download.bytes)
      : null
  if (!bytes || bytes.length === 0) throw new Error('Image download returned an empty file')
  const contentType = download.contentType == null
    ? undefined
    : String(download.contentType).split(';', 1)[0].trim().toLowerCase()
  const extension = contentType ? IMAGE_EXTENSIONS.get(contentType) : 'jpg'
  if (!extension) throw new Error('Instagram cover download returned an unsupported image format')
  if (bytes.length > MAX_IMAGE_BYTES) {
    throw new Error('Instagram cover exceeds the 25 MB safety limit')
  }
  return { bytes, contentType, extension }
}

function contentHash(bytes) {
  return createHash('sha256').update(bytes).digest('hex')
}

async function publishImmutableImages(stagedDirectory, outputDirectory, downloads) {
  await mkdir(outputDirectory, { recursive: true })

  for (const { filename, hash } of downloads) {
    const staged = path.join(stagedDirectory, filename)
    const destination = path.join(outputDirectory, filename)
    try {
      // Hard-linking is atomic and exclusive: an immutable destination can
      // never be observed half-written or silently replaced.
      await link(staged, destination)
    } catch (error) {
      if (error?.code !== 'EEXIST') throw error
      const existing = await readFile(destination)
      if (contentHash(existing) !== hash) {
        throw new Error(`Immutable Instagram cover collision for ${filename}`)
      }
    }
  }
}

/**
 * Run a complete synchronization. Every cover is downloaded into staging
 * before existing output is touched. Covers are published first and the
 * manifest is replaced atomically last.
 */
export async function syncInstagram({
  source,
  outputManifest = DEFAULT_MANIFEST,
  outputImages = DEFAULT_IMAGES,
  now = new Date(),
  provenance = 'fixture',
}) {
  if (!source?.getMediaPage || !source?.getInsights || !source?.download) {
    throw new Error('Instagram source must provide media, insights, and downloads')
  }
  if (!PROVENANCE_VALUES.has(provenance)) {
    throw new Error("Instagram manifest provenance must be 'instagram' or 'fixture'")
  }

  const currentTime = asDate(now, 'now')
  const manifestPath = path.resolve(outputManifest)
  const imagesPath = path.resolve(outputImages)
  const media = await collectMedia(source, currentTime)
  const { latest, viral, insightsById } = await selectPosts(media, source, currentTime)
  if (latest.length === 0) {
    throw new Error('Instagram returned no usable parent feed or Reel media')
  }
  const selected = uniquePosts(latest, viral)
  const viralIds = new Set(viral.map(({ id }) => id))

  await mkdir(path.dirname(imagesPath), { recursive: true })
  await mkdir(path.dirname(manifestPath), { recursive: true })
  const imageStage = await mkdtemp(path.join(path.dirname(imagesPath), '.instagram-stage-'))
  const manifestStage = await mkdtemp(path.join(path.dirname(manifestPath), '.instagram-manifest-'))

  try {
    const downloads = await mapWithConcurrency(selected, 4, async (post) => {
      const download = normalizeDownload(await source.download(post.coverUrl))
      const hash = contentHash(download.bytes)
      const filename = `ig-${post.id}-${hash}.${download.extension}`
      await writeFile(path.join(imageStage, filename), download.bytes, { flag: 'wx' })
      return { post, filename, hash }
    })

    const filenamesById = new Map(downloads.map(({ post, filename }) => [post.id, filename]))
    const posts = Object.fromEntries(
      selected.map((post) => [
        post.id,
        manifestPost(
          post,
          viralIds.has(post.id) ? insightsById.get(post.id) : undefined,
          filenamesById.get(post.id),
        ),
      ]),
    )
    const manifest = {
      schemaVersion: 1,
      source: provenance,
      updatedAt: currentTime.toISOString(),
      latestIds: latest.map(({ id }) => id),
      viralIds: viral.map(({ id }) => id),
      posts,
    }
    const stagedManifest = path.join(manifestStage, path.basename(manifestPath))
    await writeFile(stagedManifest, `${JSON.stringify(manifest, null, 2)}\n`, { flag: 'wx' })

    await publishImmutableImages(imageStage, imagesPath, downloads)
    await rename(stagedManifest, manifestPath)

    return manifest
  } finally {
    await rm(imageStage, { recursive: true, force: true })
    await rm(manifestStage, { recursive: true, force: true })
  }
}

function safeGraphUrl(input) {
  const url = input instanceof URL ? new URL(input.href) : new URL(input)
  if (url.protocol !== 'https:' || url.hostname !== 'graph.instagram.com') {
    throw new Error('Refusing to send Instagram credentials outside graph.instagram.com')
  }
  url.username = ''
  url.password = ''
  url.searchParams.delete('access_token')
  return url
}

function safeApiLocation(url) {
  return `${url.origin}${url.pathname}`
}

async function graphJson(fetchImpl, token, input) {
  const url = safeGraphUrl(input)
  const abortController = new AbortController()
  const timeout = setTimeout(() => abortController.abort(), GRAPH_TIMEOUT_MS)
  timeout.unref?.()

  try {
    let response
    try {
      response = await fetchImpl(url, {
        headers: {
          Accept: 'application/json',
          Authorization: `Bearer ${token}`,
        },
        redirect: 'error',
        signal: abortController.signal,
      })
    } catch {
      if (abortController.signal.aborted) {
        throw new InstagramApiError(`Instagram API request timed out at ${safeApiLocation(url)}`)
      }
      throw new InstagramApiError(`Instagram API request failed at ${safeApiLocation(url)}`)
    }

    if (!response.ok) {
      throw new InstagramApiError(
        `Instagram API request failed (HTTP ${response.status}) at ${safeApiLocation(url)}`,
        response.status,
      )
    }

    try {
      return await response.json()
    } catch {
      if (abortController.signal.aborted) {
        throw new InstagramApiError(`Instagram API request timed out at ${safeApiLocation(url)}`)
      }
      throw new InstagramApiError(`Instagram API returned malformed JSON at ${safeApiLocation(url)}`)
    }
  } finally {
    clearTimeout(timeout)
  }
}

function safeCdnUrl(input) {
  let url
  try {
    url = input instanceof URL ? new URL(input.href) : new URL(input)
  } catch {
    throw new Error('Instagram cover URL is invalid')
  }
  const hostname = url.hostname.toLowerCase()
  const allowedHost = CDN_HOST_SUFFIXES.some((suffix) => hostname.endsWith(suffix))
  if (
    url.protocol !== 'https:'
    || !allowedHost
    || url.username !== ''
    || url.password !== ''
    || !['', '443'].includes(url.port)
  ) {
    throw new Error('Instagram cover URL must use an approved Meta CDN host')
  }
  return url
}

function headerValue(response, name) {
  return response.headers?.get?.(name) ?? undefined
}

async function readLimitedResponseBody(response) {
  if (!response.body) throw new Error('Instagram cover download returned no body')
  const chunks = []
  let byteLength = 0

  const append = (chunk) => {
    const bytes = Buffer.from(chunk)
    byteLength += bytes.length
    if (byteLength > MAX_IMAGE_BYTES) {
      throw new Error('Instagram cover exceeds the 25 MB safety limit')
    }
    chunks.push(bytes)
  }

  if (typeof response.body[Symbol.asyncIterator] === 'function') {
    for await (const chunk of response.body) append(chunk)
  } else if (typeof response.body.getReader === 'function') {
    const reader = response.body.getReader()
    try {
      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        append(value)
      }
    } catch (error) {
      await reader.cancel().catch(() => {})
      throw error
    } finally {
      reader.releaseLock()
    }
  } else {
    throw new Error('Instagram cover response body is not streamable')
  }

  if (byteLength === 0) throw new Error('Image download returned an empty file')
  return Buffer.concat(chunks, byteLength)
}

async function downloadLiveCover(fetchImpl, input) {
  let url = safeCdnUrl(input)
  const abortController = new AbortController()
  const timeout = setTimeout(() => abortController.abort(), DOWNLOAD_TIMEOUT_MS)
  timeout.unref?.()

  try {
    for (let redirects = 0; ; redirects += 1) {
      let response
      try {
        response = await fetchImpl(url, {
          headers: { Accept: 'image/*' },
          redirect: 'manual',
          signal: abortController.signal,
        })
      } catch {
        if (abortController.signal.aborted) {
          throw new Error('Instagram cover download timed out')
        }
        throw new Error('Instagram cover download failed')
      }

      if (REDIRECT_STATUSES.has(response.status)) {
        if (redirects >= MAX_CDN_REDIRECTS) {
          throw new Error('Instagram cover exceeded the redirect limit')
        }
        const location = headerValue(response, 'location')
        if (!location) throw new Error('Instagram cover redirect is missing a location')
        if (typeof response.body?.cancel === 'function') {
          await response.body.cancel().catch(() => {})
        }
        let redirectUrl
        try {
          redirectUrl = new URL(location, url)
        } catch {
          throw new Error('Instagram cover redirect location is invalid')
        }
        url = safeCdnUrl(redirectUrl)
        continue
      }

      if (!response.ok) {
        throw new Error(`Instagram cover download failed (HTTP ${response.status})`)
      }
      const contentLength = Number(headerValue(response, 'content-length'))
      if (Number.isFinite(contentLength) && contentLength > MAX_IMAGE_BYTES) {
        throw new Error('Instagram cover exceeds the 25 MB safety limit')
      }
      const contentType = headerValue(response, 'content-type')
      if (!contentType) throw new Error('Instagram cover download returned no image content type')
      const normalizedContentType = contentType.split(';', 1)[0].trim().toLowerCase()
      if (!IMAGE_EXTENSIONS.has(normalizedContentType)) {
        throw new Error('Instagram cover download returned an unsupported image format')
      }

      return {
        bytes: await readLimitedResponseBody(response),
        contentType: normalizedContentType,
      }
    }
  } catch (error) {
    if (abortController.signal.aborted && error?.message !== 'Instagram cover download timed out') {
      throw new Error('Instagram cover download timed out')
    }
    throw error
  } finally {
    clearTimeout(timeout)
  }
}

export function createLiveSource({
  token,
  graphVersion = DEFAULT_GRAPH_VERSION,
  fetchImpl = globalThis.fetch,
} = {}) {
  if (typeof token !== 'string' || token.trim() === '') {
    throw new Error('INSTAGRAM_ACCESS_TOKEN is required for a live sync')
  }
  if (!/^v\d+\.\d+$/.test(graphVersion)) {
    throw new Error('INSTAGRAM_GRAPH_VERSION must look like v26.0')
  }
  if (typeof fetchImpl !== 'function') throw new Error('A Fetch API implementation is required')

  const baseUrl = `https://graph.instagram.com/${graphVersion}`
  return {
    async getMediaPage(cursor) {
      const url = cursor
        ? safeGraphUrl(cursor)
        : new URL(`${baseUrl}/me/media`)
      if (!cursor) {
        url.searchParams.set('fields', MEDIA_FIELDS)
        url.searchParams.set('limit', '50')
      }
      const response = await graphJson(fetchImpl, token, url)
      if (!response || typeof response !== 'object' || !Array.isArray(response.data)) {
        throw new Error('Instagram media response is malformed: expected a data array')
      }
      let nextCursor = null
      if (response.paging?.next) nextCursor = safeGraphUrl(response.paging.next).href
      return { data: response.data, nextCursor }
    },

    async getInsights(id) {
      const mediaId = safeMediaId(id)
      const url = new URL(`${baseUrl}/${mediaId}/insights`)
      url.searchParams.set('metric', INSIGHT_METRICS.join(','))
      return graphJson(fetchImpl, token, url)
    },

    async download(input) {
      return downloadLiveCover(fetchImpl, input)
    },
  }
}

function decodeDataUrl(url) {
  const match = /^data:([^;,]+)?(;base64)?,(.*)$/s.exec(url)
  if (!match) throw new Error('Fixture contains a malformed data URL')
  return {
    bytes: match[2]
      ? Buffer.from(match[3], 'base64')
      : Buffer.from(decodeURIComponent(match[3])),
    contentType: match[1] || undefined,
  }
}

function fixtureAsset(value, fixtureDirectory) {
  if (typeof value === 'string') {
    return { bytes: Buffer.from(value, 'base64'), contentType: 'image/jpeg' }
  }
  if (!value || typeof value !== 'object') {
    throw new Error('Fixture asset must be a base64 string or object')
  }
  if (typeof value.base64 === 'string') {
    return {
      bytes: Buffer.from(value.base64, 'base64'),
      contentType: value.contentType ?? 'image/jpeg',
    }
  }
  if (typeof value.text === 'string') {
    return {
      bytes: Buffer.from(value.text),
      contentType: value.contentType ?? 'image/jpeg',
    }
  }
  if (typeof value.file === 'string') {
    return {
      file: path.resolve(fixtureDirectory, value.file),
      contentType: value.contentType,
    }
  }
  throw new Error('Fixture asset must define base64, text, or file')
}

/**
 * Fixture format:
 * `{ mediaPages: [{data:[...]}], insights: {id: {...}}, assets: {url: {...}} }`.
 * Pages are automatically linked, keeping fixture runs fully credential-free.
 */
export function createFixtureSource(fixture, { fixtureDirectory = process.cwd() } = {}) {
  if (!fixture || typeof fixture !== 'object' || Array.isArray(fixture)) {
    throw new Error('Instagram fixture must be a JSON object')
  }
  const pages = fixture.mediaPages ?? fixture.pages
  if (!Array.isArray(pages) || pages.length === 0) {
    throw new Error('Instagram fixture must contain a non-empty mediaPages array')
  }
  const insights = fixture.insights ?? {}
  const assets = fixture.assets ?? fixture.downloads ?? {}

  return {
    async getMediaPage(cursor) {
      const index = cursor == null ? 0 : Number(String(cursor).replace('fixture:page:', ''))
      if (!Number.isInteger(index) || index < 0 || index >= pages.length) {
        throw new Error('Fixture pagination cursor is invalid')
      }
      const page = Array.isArray(pages[index]) ? { data: pages[index] } : pages[index]
      pageData(page)
      return {
        data: page.data,
        nextCursor: index + 1 < pages.length ? `fixture:page:${index + 1}` : null,
      }
    },

    async getInsights(id) {
      return Object.hasOwn(insights, id) ? insights[id] : null
    },

    async download(url) {
      if (url.startsWith('data:')) return decodeDataUrl(url)
      if (!Object.hasOwn(assets, url)) {
        throw new Error(`Fixture has no asset for Instagram cover ${url}`)
      }
      const asset = fixtureAsset(assets[url], fixtureDirectory)
      if (asset.file) {
        return { bytes: await readFile(asset.file), contentType: asset.contentType }
      }
      return asset
    },
  }
}

export function redactSecrets(value, secrets = []) {
  let result = String(value)
    .replace(/([?&]access_token=)[^&\s]+/giu, '$1[REDACTED]')
    .replace(/\bBearer\s+[^\s]+/giu, 'Bearer [REDACTED]')
  for (const secret of secrets) {
    if (typeof secret === 'string' && secret !== '') {
      result = result.split(secret).join('[REDACTED]')
    }
  }
  return result
}

function usage() {
  return `Usage: node scripts/sync-instagram.mjs [options]

Options:
  --fixture <file>          Use an offline JSON fixture instead of Meta's API
  --output-manifest <file>  Manifest destination (default: ${DEFAULT_MANIFEST})
  --output-images <dir>     Cover destination (default: ${DEFAULT_IMAGES})
  --now <iso-date>          Override the current time for a deterministic run
  --help                    Show this help

Live mode reads INSTAGRAM_ACCESS_TOKEN and optional INSTAGRAM_GRAPH_VERSION.
Fixture mode requires both output options and refuses the production defaults.`
}

export function parseArguments(argv) {
  const options = {}
  const valueFlags = new Set(['fixture', 'output-manifest', 'output-images', 'now'])

  for (let index = 0; index < argv.length; index += 1) {
    const argument = argv[index]
    if (argument === '--help') {
      options.help = true
      continue
    }
    if (!argument.startsWith('--')) throw new Error(`Unexpected argument: ${argument}`)

    const equalsIndex = argument.indexOf('=')
    const name = argument.slice(2, equalsIndex === -1 ? undefined : equalsIndex)
    if (!valueFlags.has(name)) throw new Error(`Unknown option: --${name}`)
    const value = equalsIndex === -1 ? argv[++index] : argument.slice(equalsIndex + 1)
    if (value == null || value === '' || value.startsWith('--')) {
      throw new Error(`Option --${name} requires a value`)
    }
    options[name.replaceAll('-', '_')] = value
  }

  return options
}

export async function main(argv = process.argv.slice(2), environment = process.env) {
  const options = parseArguments(argv)
  if (options.help) {
    console.log(usage())
    return
  }

  let source
  let fixture
  let provenance
  if (options.fixture) {
    const manifestTarget = options.output_manifest && path.resolve(options.output_manifest)
    const imagesTarget = options.output_images && path.resolve(options.output_images)
    if (
      !manifestTarget
      || !imagesTarget
      || manifestTarget === path.resolve(DEFAULT_MANIFEST)
      || imagesTarget === path.resolve(DEFAULT_IMAGES)
    ) {
      throw new Error(
        'Fixture mode requires explicit non-production --output-manifest and --output-images values',
      )
    }

    const fixturePath = path.resolve(options.fixture)
    try {
      fixture = JSON.parse(await readFile(fixturePath, 'utf8'))
    } catch (error) {
      if (error instanceof SyntaxError) throw new Error('Instagram fixture contains invalid JSON')
      throw error
    }
    source = createFixtureSource(fixture, { fixtureDirectory: path.dirname(fixturePath) })
    provenance = 'fixture'
  } else {
    source = createLiveSource({
      token: environment.INSTAGRAM_ACCESS_TOKEN,
      graphVersion: environment.INSTAGRAM_GRAPH_VERSION ?? DEFAULT_GRAPH_VERSION,
    })
    provenance = 'instagram'
  }

  const now = options.now ?? fixture?.now ?? new Date()
  const manifest = await syncInstagram({
    source,
    outputManifest: options.output_manifest ?? DEFAULT_MANIFEST,
    outputImages: options.output_images ?? DEFAULT_IMAGES,
    now,
    provenance,
  })
  console.log(
    `Instagram sync complete: ${manifest.latestIds.length} latest, ${manifest.viralIds.length} most watched`,
  )
}

const isCli = process.argv[1]
  && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href

if (isCli) {
  main().catch((error) => {
    const token = process.env.INSTAGRAM_ACCESS_TOKEN
    const message = error instanceof Error ? error.message : 'Instagram sync failed'
    console.error(redactSecrets(message, [token]))
    process.exitCode = 1
  })
}
