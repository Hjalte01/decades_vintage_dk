import type { Product } from '../types'

/** Stable seams for replacing browser storage with D1/R2 at the pilot stage. */
export interface CatalogRepository {
  list(): Product[]
  save(products: Product[]): void
  clear(): void
}

export interface MediaStore {
  put(file: File): Promise<{ originalUrl: string; storefrontUrl: string; checksum: string }>
}

export type CommerceMode = 'off' | 'inquiry' | 'checkout'
export interface CommerceProvider {
  readonly mode: CommerceMode
  beginCheckout(productIds: string[]): Promise<{ url: string }>
}

export interface DatasetExport {
  version: 1
  exportedAt: string
  products: Product[]
}
