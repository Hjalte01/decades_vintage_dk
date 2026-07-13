import { beforeEach, describe, expect, it } from 'vitest'
import { BrowserCatalogRepository, createDatasetExport } from './browserCatalog'
import { seedProducts } from '../data/seed'

describe('BrowserCatalogRepository', () => {
  beforeEach(() => localStorage.clear())

  it('starts with the demo catalog and persists changes', () => {
    const repository = new BrowserCatalogRepository()
    expect(repository.list()).toHaveLength(seedProducts.length)
    repository.save(seedProducts.slice(0, 2))
    expect(new BrowserCatalogRepository().list()).toHaveLength(2)
  })

  it('creates a versioned future-ML export', () => {
    const result = createDatasetExport(seedProducts)
    expect(result.version).toBe(1)
    expect(result.products[0]).toMatchObject({ size: 'M', decade: '1980s', status: 'published' })
  })
})
