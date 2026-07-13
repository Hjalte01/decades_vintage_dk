import { ArrowUpRight } from 'lucide-react'
import { Link } from 'react-router-dom'
import { locations } from '../data/seed'
import { useLanguage } from '../state/LanguageContext'
import type { Product } from '../types'

export function ProductCard({ product, index = 0 }: { product: Product; index?: number }) {
  const { text } = useLanguage()
  const location = locations.find((item) => item.id === product.storeId)
  return <Link to={`/shop/${product.id}`} className={`product-card offset-${index % 3}`}>
    <div className="product-image-wrap">
      <img src={product.image} alt={text(product.title)} loading="lazy" style={{ objectPosition: product.imagePosition }} />
      <span className="one-only">1 stk.</span>
    </div>
    <div className="product-card-info">
      <div><h3>{text(product.title)}</h3><p>{product.size} · {location?.name}</p></div>
      <strong>{product.price.toLocaleString('da-DK')} kr.</strong>
      <ArrowUpRight className="card-arrow" size={20}/>
    </div>
  </Link>
}
