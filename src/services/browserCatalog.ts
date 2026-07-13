import { seedProducts } from '../data/seed'
import type { Product } from '../types'
import type { CatalogRepository, DatasetExport } from './contracts'

const STORAGE_KEY = 'decades-demo-products-v2'

export class BrowserCatalogRepository implements CatalogRepository {
  list(): Product[] {
    try {
      const saved = localStorage.getItem(STORAGE_KEY)
      return saved ? JSON.parse(saved) as Product[] : seedProducts
    } catch {
      return seedProducts
    }
  }
  save(products: Product[]) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(products))
  }
  clear() {
    localStorage.removeItem(STORAGE_KEY)
  }
}

export function createDatasetExport(products: Product[]): DatasetExport {
  return { version: 1, exportedAt: new Date().toISOString(), products }
}
