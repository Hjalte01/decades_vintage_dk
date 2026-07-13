import { ArrowUpRight, MapPin } from 'lucide-react'
import { locations } from '../data/seed'
import { useLanguage } from '../state/LanguageContext'

export function LocationsPage() {
  const { text, language } = useLanguage()
  return <section className="page section locations-page">
    <header className="page-header"><span className="eyebrow"><MapPin size={15}/> København + Rødovre</span><h1>{language === 'da' ? 'Kom forbi.' : 'Come by.'}</h1><p>{language === 'da' ? 'Tre butikker, tre forskellige udvalg – og et lager der åbner til særlige events.' : 'Three stores, three different edits — and a warehouse opening for special events.'}</p></header>
    <div className="locations-grid">{locations.map((location, index) => <article className="location-card" key={location.id} style={{ '--location-color': location.color } as React.CSSProperties}>
      <a className="location-map" href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${location.address}, ${location.area}`)}`} target="_blank" rel="noreferrer" aria-label={`${location.name} — åbn i kort`}>
        <img src={location.mapImage} alt={`Kort over ${location.address}`} />
        <span className="map-pin" aria-hidden="true"><MapPin /></span>
        <span className="map-attribution">© OpenStreetMap contributors</span>
      </a>
      <div className="location-copy"><div className="location-index">0{index + 1}</div><span className="location-dot"/><h2>{location.name}</h2><p>{location.address}<br/>{location.area}</p>
      {location.note ? <div className="location-note">{text(location.note)}</div> : <div className="hours-list">{location.hours.map((row) => <div key={row.days.da}><span>{text(row.days)}</span><strong>{row.hours}</strong></div>)}</div>}
      <a href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${location.address}, ${location.area}`)}`} target="_blank" rel="noreferrer">Åbn i kort <ArrowUpRight size={17}/></a>
      </div>
    </article>)}</div>
    <p className="confirmation-note">Bemærk: Åbningstiderne er eksempler til demoen og skal bekræftes før offentlig lancering.</p>
  </section>
}
