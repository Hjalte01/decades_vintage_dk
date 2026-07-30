// @vitest-environment node

import { createHash } from 'node:crypto'
import { access, mkdtemp, mkdir, readFile, readdir, rm, writeFile } from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  collectMedia,
  createFixtureSource,
  createLiveSource,
  main,
  normalizeMedia,
  parseInsights,
  redactSecrets,
  selectPosts,
  syncInstagram,
} from './sync-instagram.mjs'

const NOW = new Date('2026-07-30T12:00:00.000Z')
const DAY_MS = 24 * 60 * 60 * 1000
const temporaryDirectories = []
const REPOSITORY_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')

function timestampForAge(milliseconds) {
  return new Date(NOW.getTime() - milliseconds).toISOString()
}

function rawMedia(id, age, overrides = {}) {
  return {
    id,
    caption: `Caption ${id}`,
    media_type: 'IMAGE',
    media_url: `https://cdn.example/${id}.jpg`,
    permalink: `https://www.instagram.com/p/${id}/`,
    timestamp: timestampForAge(age),
    ...overrides,
  }
}

function completeInsights(views, reach = views, totalInteractions = reach) {
  return {
    data: [
      { name: 'views', period: 'lifetime', values: [{ value: views }] },
      { name: 'reach', period: 'lifetime', values: [{ value: reach }] },
      {
        name: 'total_interactions',
        period: 'lifetime',
        values: [{ value: totalInteractions }],
      },
    ],
  }
}

function fixtureFor(media, insights = {}) {
  return {
    mediaPages: [{ data: media }],
    insights,
    assets: Object.fromEntries(
      media.flatMap((item) => {
        const children = item.children?.data ?? []
        return [item, ...children]
          .flatMap((candidate) => [candidate.thumbnail_url, candidate.media_url])
          .filter(Boolean)
          .map((url) => [url, { text: `image:${url}`, contentType: 'image/jpeg' }])
      }),
    ),
  }
}

async function makeOutput() {
  const root = await mkdtemp(path.join(os.tmpdir(), 'instagram-sync-test-'))
  temporaryDirectories.push(root)
  return {
    root,
    manifest: path.join(root, 'data', 'instagram-feed.json'),
    images: path.join(root, 'public', 'images', 'social'),
  }
}

afterEach(async () => {
  vi.restoreAllMocks()
  await Promise.all(
    temporaryDirectories.splice(0).map((directory) => (
      rm(directory, { recursive: true, force: true })
    )),
  )
})

describe('checked-in Instagram feed', () => {
  it('references covers that exist in the public production assets', async () => {
    const manifest = JSON.parse(await readFile(
      path.join(REPOSITORY_ROOT, 'src/data/instagram-feed.json'),
      'utf8',
    ))
    const publicRoot = path.join(REPOSITORY_ROOT, 'public')
    const referencedIds = new Set([...manifest.latestIds, ...manifest.viralIds])

    await Promise.all([...referencedIds].map(async (id) => {
      expect(manifest.posts).toHaveProperty(id)
      const cover = path.resolve(publicRoot, manifest.posts[id].image)
      expect(cover.startsWith(`${publicRoot}${path.sep}`)).toBe(true)
      await expect(access(cover)).resolves.toBeUndefined()
    }))
  })
})

describe('Instagram selection and manifest generation', () => {
  it('emits latest parents and a ranked top three, using a carousel child only as its cover', async () => {
    const media = [
      rawMedia('new-1', 1 * 60 * 60 * 1000),
      rawMedia('new-2', 24 * 60 * 60 * 1000),
      rawMedia('a', 48 * 60 * 60 * 1000),
      rawMedia('b', 3 * DAY_MS, { caption: undefined }),
      rawMedia('carousel', 4 * DAY_MS, {
        media_type: 'CAROUSEL_ALBUM',
        media_url: undefined,
        children: {
          data: [
            {
              id: 'carousel-child',
              media_type: 'IMAGE',
              media_url: 'https://cdn.example/carousel-child.jpg',
            },
            {
              id: 'carousel-child-2',
              media_type: 'IMAGE',
              media_url: 'https://cdn.example/carousel-child-2.jpg',
            },
          ],
        },
      }),
      rawMedia('d', 5 * DAY_MS),
      rawMedia('e', 6 * DAY_MS),
      rawMedia('f', 7 * DAY_MS),
      rawMedia('older-viral', 30 * DAY_MS),
      rawMedia('past-cutoff', 91 * DAY_MS),
    ]
    const insights = {
      a: completeInsights(500, 400, 30),
      b: completeInsights(500, 450, 10),
      carousel: completeInsights(700, 600, 50),
      d: completeInsights(650, 600, 50),
      e: completeInsights(100, 90, 8),
      f: completeInsights(90, 80, 7),
      'older-viral': completeInsights(1_000, 900, 80),
    }
    const fixture = fixtureFor(media, insights)
    const baseSource = createFixtureSource(fixture)
    const insightIds = []
    const downloadedUrls = []
    const source = {
      getMediaPage: baseSource.getMediaPage,
      async getInsights(id) {
        insightIds.push(id)
        return baseSource.getInsights(id)
      },
      async download(url) {
        downloadedUrls.push(url)
        return baseSource.download(url)
      },
    }
    const output = await makeOutput()

    const manifest = await syncInstagram({
      source,
      outputManifest: output.manifest,
      outputImages: output.images,
      now: NOW,
    })

    expect(manifest).toEqual(JSON.parse(await readFile(output.manifest, 'utf8')))
    expect(manifest.schemaVersion).toBe(1)
    expect(manifest.source).toBe('fixture')
    expect(manifest.updatedAt).toBe(NOW.toISOString())
    expect(manifest.latestIds).toEqual([
      'new-1',
      'new-2',
      'a',
      'b',
      'carousel',
      'd',
      'e',
      'f',
    ])
    expect(manifest.viralIds).toEqual(['older-viral', 'carousel', 'd'])
    expect(Object.keys(manifest.posts)).toHaveLength(9)
    expect(manifest.posts.carousel).toMatchObject({
      mediaType: 'CAROUSEL_ALBUM',
      viewCount: 700,
    })
    expect(manifest.posts.carousel.image)
      .toMatch(/^images\/social\/ig-carousel-[a-f0-9]{64}\.jpg$/)
    expect(manifest.posts.b.caption).toBe('')
    expect(manifest.posts.a).not.toHaveProperty('viewCount')
    expect(manifest.posts['older-viral'].viewCount).toBe(1_000)
    expect(insightIds).toContain('carousel')
    expect(insightIds).not.toContain('carousel-child')
    expect(downloadedUrls).toHaveLength(9)
    expect(downloadedUrls).toContain('https://cdn.example/carousel-child.jpg')
    expect(await readFile(
      path.join(output.images, path.basename(manifest.posts.carousel.image)),
      'utf8',
    ))
      .toBe('image:https://cdn.example/carousel-child.jpg')
  })

  it('honors ranking precedence and includes exact 48-hour and 90-day boundaries', async () => {
    const firstSet = [
      rawMedia('views', 4 * DAY_MS),
      rawMedia('reach', 4 * DAY_MS),
      rawMedia('interactions', 4 * DAY_MS),
      rawMedia('lower', 4 * DAY_MS),
    ].map(normalizeMedia)
    const firstInsights = {
      views: completeInsights(101, 1, 1),
      reach: completeInsights(100, 60, 1),
      interactions: completeInsights(100, 50, 20),
      lower: completeInsights(100, 50, 10),
    }
    const firstSelection = await selectPosts(firstSet, {
      getInsights: async (id) => firstInsights[id],
    }, NOW)
    expect(firstSelection.viral.map(({ id }) => id))
      .toEqual(['views', 'reach', 'interactions'])

    const boundarySet = [
      rawMedia('b', 48 * 60 * 60 * 1000),
      rawMedia('a', 48 * 60 * 60 * 1000),
      rawMedia('ninety', 90 * DAY_MS),
      rawMedia('too-young', 48 * 60 * 60 * 1000 - 1),
      rawMedia('too-old', 90 * DAY_MS + 1),
    ].map(normalizeMedia)
    const boundaryInsights = Object.fromEntries(
      boundarySet.map(({ id }) => [id, completeInsights(100, 50, 10)]),
    )
    const boundarySelection = await selectPosts(boundarySet, {
      getInsights: async (id) => boundaryInsights[id],
    }, NOW)

    expect(boundarySelection.viral.map(({ id }) => id)).toEqual(['a', 'b', 'ninety'])
    expect(boundarySelection.insightsById.has('too-young')).toBe(false)
    expect(boundarySelection.insightsById.has('too-old')).toBe(false)
  })

  it('publishes no partial viral list when fewer than three complete insight records exist', async () => {
    const media = Array.from({ length: 8 }, (_, index) => (
      rawMedia(`post-${index}`, (index + 3) * DAY_MS)
    ))
    media.push(rawMedia('past-cutoff', 91 * DAY_MS))
    const fixture = fixtureFor(media, {
      'post-0': completeInsights(300, 200, 20),
      'post-1': completeInsights(200, 150, 15),
      'post-2': {
        data: [
          { name: 'views', period: 'lifetime', values: [{ value: 100 }] },
          { name: 'reach', period: 'lifetime', values: [{ value: 80 }] },
        ],
      },
    })
    const output = await makeOutput()

    const manifest = await syncInstagram({
      source: createFixtureSource(fixture),
      outputManifest: output.manifest,
      outputImages: output.images,
      now: NOW,
    })

    expect(manifest.viralIds).toEqual([])
    expect(Object.values(manifest.posts).every((post) => post.viewCount === undefined)).toBe(true)
  })

  it('keeps the validated raster format in immutable cover filenames', async () => {
    const media = [rawMedia('png-post', 3 * DAY_MS)]
    const fixture = fixtureFor(media)
    fixture.assets[media[0].media_url].contentType = 'image/png'
    const output = await makeOutput()

    const manifest = await syncInstagram({
      source: createFixtureSource(fixture),
      outputManifest: output.manifest,
      outputImages: output.images,
      now: NOW,
    })

    expect(manifest.posts['png-post'].image)
      .toMatch(/^images\/social\/ig-png-post-[a-f0-9]{64}\.png$/)
  })
})

describe('pagination and validation', () => {
  it('continues beyond eight items at the exact cutoff and stops after crossing it', async () => {
    const pages = [
      [1, 2, 3, 4].map((days) => rawMedia(`day-${days}`, days * DAY_MS)),
      [
        rawMedia('day-5', 5 * DAY_MS),
        rawMedia('day-6', 6 * DAY_MS),
        rawMedia('day-7', 7 * DAY_MS),
        rawMedia('exactly-90', 90 * DAY_MS),
      ],
      [rawMedia('past-90', 90 * DAY_MS + 1)],
    ]
    const calls = []
    const source = {
      async getMediaPage(cursor) {
        calls.push(cursor)
        const index = cursor == null ? 0 : Number(cursor)
        return {
          data: pages[index],
          nextCursor: index + 1 < pages.length ? String(index + 1) : null,
        }
      },
    }

    const result = await collectMedia(source, NOW)

    expect(calls).toEqual([null, '1', '2'])
    expect(result).toHaveLength(9)
  })

  it('throws when 250 items are inspected without completing the selection window', async () => {
    let calls = 0
    const source = {
      async getMediaPage(cursor) {
        const page = cursor == null ? 0 : Number(cursor)
        calls += 1
        return {
          data: Array.from({ length: 100 }, (_, index) => (
            rawMedia(`item-${page}-${index}`, (page + 1) * DAY_MS)
          )),
          nextCursor: String(page + 1),
        }
      },
    }

    await expect(collectMedia(source, NOW)).rejects.toThrow(/250-item safety cap/)
    expect(calls).toBe(3)
  })

  it('rejects non-Instagram and insecure permalinks', () => {
    expect(() => normalizeMedia(rawMedia('bad-host', DAY_MS, {
      permalink: 'https://example.com/p/bad-host/',
    }))).toThrow(/HTTPS Instagram URL/)
    expect(() => normalizeMedia(rawMedia('bad-scheme', DAY_MS, {
      permalink: 'http://www.instagram.com/p/bad-scheme/',
    }))).toThrow(/HTTPS Instagram URL/)
  })

  it('caps captions at 500 Unicode code points including a truncation ellipsis', () => {
    const original = `${'😀'.repeat(499)}AB`
    const normalized = normalizeMedia(rawMedia('long-caption', DAY_MS, {
      caption: original,
    }))

    expect(Array.from(normalized.caption)).toHaveLength(500)
    expect(normalized.caption).toBe(`${'😀'.repeat(499)}…`)
  })

  it('accepts only a complete set of lifetime integer insight metrics', () => {
    expect(parseInsights(completeInsights(12, 10, 3))).toEqual({
      views: 12,
      reach: 10,
      totalInteractions: 3,
    })
    expect(parseInsights({
      views: 12,
      reach: 10,
    })).toBeNull()
    expect(parseInsights({
      data: [
        { name: 'views', period: 'day', values: [{ value: 12 }] },
        { name: 'reach', period: 'lifetime', values: [{ value: 10 }] },
        { name: 'total_interactions', period: 'lifetime', values: [{ value: 3 }] },
      ],
    })).toBeNull()
  })

  it('refuses to replace a valid feed with an empty response', async () => {
    const output = await makeOutput()
    await mkdir(path.dirname(output.manifest), { recursive: true })
    await writeFile(output.manifest, '{"sentinel":true}\n')

    await expect(syncInstagram({
      source: {
        getMediaPage: async () => ({ data: [], nextCursor: null }),
        getInsights: async () => null,
        download: async () => Buffer.from('unused'),
      },
      outputManifest: output.manifest,
      outputImages: output.images,
      now: NOW,
    })).rejects.toThrow(/no usable parent feed or Reel media/)
    expect(await readFile(output.manifest, 'utf8')).toBe('{"sentinel":true}\n')
  })

  it('requires explicit non-production outputs for fixture CLI runs', async () => {
    const output = await makeOutput()
    const fixturePath = path.join(output.root, 'fixture.json')
    const cover = 'data:image/jpeg;base64,aW1hZ2U='
    await writeFile(fixturePath, JSON.stringify({
      now: NOW.toISOString(),
      mediaPages: [{
        data: [rawMedia('fixture-post', 3 * DAY_MS, { media_url: cover })],
      }],
    }))

    await expect(main(['--fixture', fixturePath], {}))
      .rejects.toThrow(/explicit non-production/)
    await expect(main([
      '--fixture',
      fixturePath,
      '--output-manifest',
      output.manifest,
    ], {})).rejects.toThrow(/explicit non-production/)
    await expect(main([
      '--fixture',
      fixturePath,
      '--output-manifest',
      'src/data/instagram-feed.json',
      '--output-images',
      output.images,
    ], {})).rejects.toThrow(/explicit non-production/)

    vi.spyOn(console, 'log').mockImplementation(() => {})
    await main([
      '--fixture',
      fixturePath,
      '--output-manifest',
      output.manifest,
      '--output-images',
      output.images,
    ], {})
    const manifest = JSON.parse(await readFile(output.manifest, 'utf8'))
    expect(manifest.source).toBe('fixture')
    expect(manifest.latestIds).toEqual(['fixture-post'])
  })
})

describe('safe publication and credentials', () => {
  it('leaves the previous manifest and images untouched when any cover download fails', async () => {
    const media = Array.from({ length: 8 }, (_, index) => (
      rawMedia(`post-${index}`, (index + 3) * DAY_MS)
    ))
    media.push(rawMedia('past-cutoff', 91 * DAY_MS))
    const fixture = fixtureFor(media)
    const baseSource = createFixtureSource(fixture)
    const source = {
      getMediaPage: baseSource.getMediaPage,
      getInsights: baseSource.getInsights,
      async download(url) {
        if (url.endsWith('/post-3.jpg')) throw new Error('simulated download failure')
        return baseSource.download(url)
      },
    }
    const output = await makeOutput()
    await mkdir(path.dirname(output.manifest), { recursive: true })
    await mkdir(output.images, { recursive: true })
    await writeFile(output.manifest, '{"sentinel":true}\n')
    await writeFile(path.join(output.images, 'ig-post-0.jpg'), 'previous-image')

    await expect(syncInstagram({
      source,
      outputManifest: output.manifest,
      outputImages: output.images,
      now: NOW,
    })).rejects.toThrow('simulated download failure')

    expect(await readFile(output.manifest, 'utf8')).toBe('{"sentinel":true}\n')
    expect(await readFile(path.join(output.images, 'ig-post-0.jpg'), 'utf8'))
      .toBe('previous-image')
    await expect(readFile(path.join(output.images, 'ig-post-1.jpg')))
      .rejects.toMatchObject({ code: 'ENOENT' })
  })

  it('never overwrites an existing immutable cover when publication detects a collision', async () => {
    const media = [rawMedia('only-post', 3 * DAY_MS)]
    const fixture = fixtureFor(media)
    const output = await makeOutput()
    const imageBytes = Buffer.from('image:https://cdn.example/only-post.jpg')
    const hash = createHash('sha256').update(imageBytes).digest('hex')
    const immutableFilename = `ig-only-post-${hash}.jpg`
    await mkdir(path.dirname(output.manifest), { recursive: true })
    await mkdir(output.images, { recursive: true })
    await writeFile(output.manifest, '{"sentinel":true}\n')
    await writeFile(path.join(output.images, immutableFilename), 'tampered')

    await expect(syncInstagram({
      source: createFixtureSource(fixture),
      outputManifest: output.manifest,
      outputImages: output.images,
      now: NOW,
    })).rejects.toThrow(/immutable Instagram cover collision/i)

    expect(await readFile(output.manifest, 'utf8')).toBe('{"sentinel":true}\n')
    expect(await readFile(path.join(output.images, immutableFilename), 'utf8')).toBe('tampered')
  })

  it('keeps old image references intact if the final manifest rename fails', async () => {
    const media = [rawMedia('new-post', 3 * DAY_MS)]
    const fixture = fixtureFor(media)
    const output = await makeOutput()
    await mkdir(output.manifest, { recursive: true })
    await writeFile(path.join(output.manifest, 'sentinel'), 'old-manifest-placeholder')
    await mkdir(output.images, { recursive: true })
    await writeFile(path.join(output.images, 'ig-old-post.jpg'), 'old-image')

    await expect(syncInstagram({
      source: createFixtureSource(fixture),
      outputManifest: output.manifest,
      outputImages: output.images,
      now: NOW,
    })).rejects.toThrow()

    expect(await readFile(path.join(output.manifest, 'sentinel'), 'utf8'))
      .toBe('old-manifest-placeholder')
    expect(await readFile(path.join(output.images, 'ig-old-post.jpg'), 'utf8')).toBe('old-image')
    expect((await readdir(output.images)).some((name) => (
      /^ig-new-post-[a-f0-9]{64}\.jpg$/.test(name)
    ))).toBe(true)
  })

  it('uses Bearer authentication without putting or leaking the token in URLs or errors', async () => {
    const secret = 'super-secret-token'
    const requests = []
    const fetchImpl = vi.fn(async (url, init) => {
      requests.push({ url: String(url), init })
      return {
        ok: false,
        status: 401,
        json: async () => ({ error: { message: `token ${secret}` } }),
      }
    })
    const source = createLiveSource({ token: secret, graphVersion: 'v26.0', fetchImpl })

    let message = ''
    try {
      await source.getMediaPage(null)
    } catch (error) {
      message = error.message
    }

    expect(message).toContain('HTTP 401')
    expect(message).not.toContain(secret)
    expect(requests[0].url).not.toContain(secret)
    expect(new URL(requests[0].url).searchParams.has('access_token')).toBe(false)
    expect(requests[0].init.headers.Authorization).toBe(`Bearer ${secret}`)
    expect(redactSecrets(
      `Bearer ${secret} https://x.test/?access_token=${secret}`,
      [secret],
    )).not.toContain(secret)
  })

  it('aborts a stalled Meta Graph request instead of hanging indefinitely', async () => {
    vi.useFakeTimers()
    try {
      const fetchImpl = vi.fn((_url, init) => new Promise((resolve, reject) => {
        init.signal.addEventListener('abort', () => reject(new Error('aborted')), { once: true })
      }))
      const source = createLiveSource({
        token: 'token',
        graphVersion: 'v26.0',
        fetchImpl,
      })
      const assertion = expect(source.getMediaPage(null)).rejects.toThrow(/timed out/)

      await vi.advanceTimersByTimeAsync(20_000)
      await assertion
      expect(fetchImpl).toHaveBeenCalledTimes(1)
    } finally {
      vi.useRealTimers()
    }
  })

  it('allows only HTTPS Meta CDN covers and revalidates every redirect', async () => {
    const fetchImpl = vi.fn()
    const source = createLiveSource({
      token: 'token',
      graphVersion: 'v26.0',
      fetchImpl,
    })

    await expect(source.download('http://scontent.cdninstagram.com/cover.jpg'))
      .rejects.toThrow(/approved Meta CDN host/)
    await expect(source.download('https://cdninstagram.com.evil.example/cover.jpg'))
      .rejects.toThrow(/approved Meta CDN host/)
    expect(fetchImpl).not.toHaveBeenCalled()

    fetchImpl.mockResolvedValueOnce({
      ok: false,
      status: 302,
      headers: new Headers({ location: 'https://evil.example/redirected.jpg' }),
    })
    await expect(source.download('https://scontent.cdninstagram.com/cover.jpg'))
      .rejects.toThrow(/approved Meta CDN host/)
    expect(fetchImpl).toHaveBeenCalledTimes(1)
    expect(fetchImpl.mock.calls[0][1]).toMatchObject({ redirect: 'manual' })
  })

  it('follows validated CDN redirects and streams the response body', async () => {
    const fetchImpl = vi.fn()
      .mockResolvedValueOnce({
        ok: false,
        status: 307,
        headers: new Headers({ location: 'https://scontent.fbcdn.net/final.jpg' }),
      })
      .mockResolvedValueOnce(new Response('cover-bytes', {
        status: 200,
        headers: { 'content-type': 'image/jpeg' },
      }))
    const source = createLiveSource({
      token: 'token',
      graphVersion: 'v26.0',
      fetchImpl,
    })

    const result = await source.download('https://scontent.cdninstagram.com/start.jpg')

    expect(result.bytes.toString()).toBe('cover-bytes')
    expect(result.contentType).toBe('image/jpeg')
    expect(fetchImpl).toHaveBeenCalledTimes(2)
    expect(String(fetchImpl.mock.calls[1][0]))
      .toBe('https://scontent.fbcdn.net/final.jpg')
  })

  it('stops a streamed cover as soon as it exceeds 25 MB without a length header', async () => {
    let yieldedChunks = 0
    const response = {
      ok: true,
      status: 200,
      headers: new Headers({ 'content-type': 'image/jpeg' }),
      body: {
        async *[Symbol.asyncIterator]() {
          for (let index = 0; index < 30; index += 1) {
            yieldedChunks += 1
            yield Buffer.alloc(1024 * 1024)
          }
        },
      },
    }
    const source = createLiveSource({
      token: 'token',
      graphVersion: 'v26.0',
      fetchImpl: vi.fn().mockResolvedValue(response),
    })

    await expect(source.download('https://scontent.cdninstagram.com/large.jpg'))
      .rejects.toThrow(/25 MB safety limit/)
    expect(yieldedChunks).toBe(26)
  })
})
