import { ArrowLeft, Camera, MapPin, Ruler, ShieldCheck, Sparkles } from 'lucide-react'
import { Link, useParams } from 'react-router-dom'
import { locations } from '../data/seed'
import { useCatalog } from '../state/CatalogContext'
import { useLanguage } from '../state/LanguageContext'

export function ProductPage() {
  const { productId } = useParams()
  const { products } = useCatalog()
  const { text, language } = useLanguage()
  const product = products.find((item) => item.id === productId && item.status === 'published')
  if (!product) return <section className="page section empty-state"><h1>Fundet er væk</h1><p>Det er måske allerede blevet solgt i butikken.</p><Link className="button button--ink" to="/shop">Tilbage til shop</Link></section>
  const location = locations.find((item) => item.id === product.storeId)
  const details = [
    ['Størrelse', product.size], ['Årti', product.decade], ['Stand', product.condition], ['Materiale', product.material], ['Farve', product.color], ['Brand', product.brand],
  ].filter(([,value]) => value)
  return <section className="product-page page">
    <Link className="back-link" to="/shop"><ArrowLeft size={17}/> {language === 'da' ? 'Alle fund' : 'All finds'}</Link>
    <div className="product-detail">
      <div className="product-detail-image"><img src={product.image} alt={text(product.title)}/><span>Kun 1</span></div>
      <div className="product-detail-info">
        <span className="eyebrow"><Sparkles size={14}/> One of one</span><h1>{text(product.title)}</h1><p className="product-price">{product.price.toLocaleString('da-DK')} kr.</p><p className="product-description">{text(product.description)}</p>
        <div className="detail-grid">{details.map(([label,value]) => <div key={label}><span>{label}</span><strong>{value}</strong></div>)}</div>
        <div className="availability"><MapPin size={19}/><div><span>Findes lige nu i</span><strong>{location?.name} · {location?.address}</strong></div></div>
        <button className="button button--disabled" disabled>Køb online · kommer måske senere</button>
        <a className="button button--outline" href={`https://www.instagram.com/decadesvintagedk/`} target="_blank" rel="noreferrer"><Camera size={18}/>Spørg på Instagram</a>
        <p className="purchase-note"><ShieldCheck size={16}/> Ingen betaling i demoen. Én vare kan ikke sælges dobbelt.</p>
      </div>
    </div>
    <div className="care-strip"><div><Ruler/><strong>Mål før du vælger</strong><span>Vintage størrelser kan variere</span></div><div><Sparkles/><strong>Håndplukket</strong><span>Gennemgået af Decades-teamet</span></div><div><MapPin/><strong>Afhentning senere</strong><span>Kan aktiveres ved lancering</span></div></div>
  </section>
}
