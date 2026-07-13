import { SlidersHorizontal } from 'lucide-react'
import { useMemo, useState } from 'react'
import { ProductCard } from '../components/ProductCard'
import { useCatalog } from '../state/CatalogContext'
import { useLanguage } from '../state/LanguageContext'

export function ShopPage() {
  const { products } = useCatalog()
  const { language } = useLanguage()
  const [category, setCategory] = useState('Alle')
  const [sort, setSort] = useState('new')
  const visible = useMemo(() => {
    const filtered = products.filter((item) => item.status === 'published' && (category === 'Alle' || item.category === category))
    return [...filtered].sort((a,b) => sort === 'low' ? a.price-b.price : sort === 'high' ? b.price-a.price : b.createdAt.localeCompare(a.createdAt))
  }, [products, category, sort])
  const categories = ['Alle', ...new Set(products.filter((item) => item.status === 'published').map((item) => item.category))]
  const da = language === 'da'
  return <section className="page section shop-page">
    <header className="page-header"><span className="eyebrow">Online rail · demo</span><h1>{da ? 'En af hver.' : 'One of each.'}</h1><p>{da ? 'Et lille udvalg fra butikkerne. Varerne herunder er eksempler og kan ikke købes endnu.' : 'A small edit from our stores. These are sample products and cannot be purchased yet.'}</p></header>
    <div className="shop-toolbar">
      <div className="filter-scroll">{categories.map((item) => <button className={category === item ? 'active' : ''} key={item} onClick={() => setCategory(item)}>{item}</button>)}</div>
      <label className="sort-select"><SlidersHorizontal size={17}/><span className="sr-only">Sortér</span><select value={sort} onChange={(event) => setSort(event.target.value)}><option value="new">Nyeste</option><option value="low">Laveste pris</option><option value="high">Højeste pris</option></select></label>
    </div>
    <p className="result-count">{visible.length} {da ? 'unikke fund' : 'unique finds'}</p>
    <div className="product-grid product-grid--shop">{visible.map((product, index) => <ProductCard key={product.id} product={product} index={index}/>)}</div>
    {!visible.length && <div className="empty-state">Ingen fund i denne kategori endnu.</div>}
  </section>
}
