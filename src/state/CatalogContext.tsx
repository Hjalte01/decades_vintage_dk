import { createContext, useContext, useMemo, useState, type ReactNode } from 'react'
import { seedProducts } from '../data/seed'
import { BrowserCatalogRepository } from '../services/browserCatalog'
import type { Product } from '../types'

const repository = new BrowserCatalogRepository()

interface CatalogValue {
  products: Product[]
  saveProduct: (product: Product) => void
  removeProduct: (id: string) => void
  reset: () => void
}

const CatalogContext = createContext<CatalogValue | null>(null)

export function CatalogProvider({ children }: { children: ReactNode }) {
  const [products, setProducts] = useState<Product[]>(() => repository.list())
  const persist = (next: Product[]) => {
    setProducts(next)
    try { repository.save(next) } catch { /* storage may be unavailable */ }
  }
  const value = useMemo<CatalogValue>(() => ({
    products,
    saveProduct: (product) => persist([product, ...products.filter((item) => item.id !== product.id)]),
    removeProduct: (id) => persist(products.filter((item) => item.id !== id)),
    reset: () => persist(seedProducts),
  }), [products])
  return <CatalogContext.Provider value={value}>{children}</CatalogContext.Provider>
}

export function useCatalog() {
  const value = useContext(CatalogContext)
  if (!value) throw new Error('useCatalog must be used inside CatalogProvider')
  return value
}
