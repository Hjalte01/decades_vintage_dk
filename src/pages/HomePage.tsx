import { ArrowRight, Camera, MapPin, Sparkles } from 'lucide-react'
import { Link } from 'react-router-dom'
import { ProductCard } from '../components/ProductCard'
import { SocialCarousel } from '../components/SocialCarousel'
import { events, locations, socialPosts } from '../data/seed'
import { useCatalog } from '../state/CatalogContext'
import { useLanguage } from '../state/LanguageContext'

export function HomePage() {
  const { products } = useCatalog()
  const { language } = useLanguage()
  const published = products.filter((item) => item.status === 'published').slice(0, 4)
  const isDa = language === 'da'
  const mapLink = (address: string, area: string) => `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${address}, ${area}`)}`
  return <>
    <section className="hero">
      <div className="hero-image" role="img" aria-label="Farverigt vintageunivers" />
      <div className="hero-copy">
        <span className="eyebrow"><Sparkles size={15}/> København · siden 2022</span>
        <h1>{isDa ? <>Tøj med <em>et liv</em> før dit.</> : <>Clothes with <em>a life</em> before yours.</>}</h1>
        <p>{isDa ? 'Håndplukket vintage, tre butikker og altid kun én af hver.' : 'Hand-picked vintage, three shops and always only one of each.'}</p>
        <div className="hero-actions"><Link className="button button--ink" to="/shop">{isDa ? 'Se nye fund' : 'Shop new finds'} <ArrowRight size={18}/></Link><Link className="text-link" to="/butikker">{isDa ? 'Find en butik' : 'Find a store'}</Link></div>
      </div>
      <div className="hero-sticker">ONE<br/>OF<br/>ONE</div>
    </section>

    <section className="marquee" aria-label="Decades værdier"><div>VINTAGE FOREVER ✦ NEW STORIES ✦ COPENHAGEN ✦ ONE OF ONE ✦ VINTAGE FOREVER ✦ NEW STORIES ✦ COPENHAGEN ✦ ONE OF ONE ✦</div></section>

    <section className="section products-section">
      <div className="section-heading"><div><span className="eyebrow">Frisk på stativet</span><h2>{isDa ? 'Nye fund' : 'New finds'}</h2></div><Link className="text-link" to="/shop">{isDa ? 'Se alle' : 'View all'} <ArrowRight size={17}/></Link></div>
      <div className="product-grid">{published.map((product, index) => <ProductCard key={product.id} product={product} index={index}/>)}</div>
    </section>

    <section className="story-band">
      <div className="story-number">03</div>
      <div><span className="eyebrow">Fra én butik til tre</span><h2>{isDa ? 'Vintage på tværs af København' : 'Vintage across Copenhagen'}</h2><p>{isDa ? 'Hver butik har sit eget udvalg og sin egen energi. Gå på opdagelse i Indre By eller tag en tur ned ad Nørrebrogade.' : 'Every shop has its own edit and energy. Explore the city centre or take a walk down Nørrebrogade.'}</p><Link className="button button--paper" to="/butikker"><MapPin size={18}/>{isDa ? 'Se butikkerne' : 'See the stores'}</Link></div>
      <div className="location-stack">{locations.slice(0,3).map((location, index) => <a href={mapLink(location.address, location.area)} target="_blank" rel="noreferrer" className="location-map-card" key={location.id} style={{ '--card-color': location.color, '--rotation': `${(index - 1) * 2.2}deg` } as React.CSSProperties} aria-label={`${location.name}, ${location.address} — ${isDa ? 'åbn i kort' : 'open in maps'}`}>
        <img src={location.mapImage} alt="" />
        <span className="map-pin" aria-hidden="true"><MapPin /></span>
        <span className="map-attribution">© OpenStreetMap contributors</span>
        <span className="map-card-label"><small>0{index + 1}</small><strong>{location.name}</strong><span>{location.address}</span></span>
      </a>)}</div>
    </section>

    <section className="section social-section">
      <div className="section-heading"><div><span className="eyebrow"><Camera size={15}/> @decadesvintagedk</span><h2>{isDa ? 'Fra vores feed' : 'From our feed'}</h2></div><a className="text-link" href="https://www.instagram.com/decadesvintagedk/" target="_blank" rel="noreferrer">Instagram <ArrowRight size={17}/></a></div>
      <SocialCarousel posts={socialPosts} isDa={isDa} />
      <p className="demo-note">{isDa ? 'Kurateret, lokal kopi af Decades’ Reels. Opslagene opdateres ikke automatisk.' : 'A curated local snapshot of Decades’ Reels. Posts do not update automatically.'}</p>
    </section>

    <section className="event-teaser">
      <div className="event-date"><strong>{new Date(events[0].date).getDate()}</strong><span>AUG</span></div>
      <div><span className="eyebrow">Næste event</span><h2>{isDa ? events[0].title.da : events[0].title.en}</h2><p>{events[0].place}</p></div>
      <Link className="round-link" to="/events" aria-label="Se event"><ArrowRight/></Link>
    </section>
  </>
}
