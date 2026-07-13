export type Language = 'da' | 'en'
export type ProductStatus = 'draft' | 'published' | 'reserved' | 'sold' | 'archived'

export interface LocalizedText {
  da: string
  en?: string
}

export interface Product {
  id: string
  title: LocalizedText
  description: LocalizedText
  price: number
  category: string
  size: string
  brand?: string
  decade?: string
  condition: string
  material?: string
  color: string
  storeId: string
  status: ProductStatus
  image: string
  imagePosition?: string
  createdAt: string
}

export interface StoreLocation {
  id: string
  name: string
  address: string
  area: string
  hours: { days: LocalizedText; hours: string }[]
  note?: LocalizedText
  color: string
  mapImage: string
}

export interface EventItem {
  id: string
  date: string
  title: LocalizedText
  description: LocalizedText
  place: string
  link?: string
}

export interface SocialPost {
  id: string
  shortcode: string
  caption: string
  publishedAt: string
  image: string
  postUrl: string
}
