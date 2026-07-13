import { ArrowUpRight, CalendarDays } from 'lucide-react'
import { events } from '../data/seed'
import { useLanguage } from '../state/LanguageContext'

export function EventsPage() {
  const { text, language } = useLanguage()
  return <section className="page section events-page">
    <header className="page-header"><span className="eyebrow"><CalendarDays size={15}/> Decades IRL</span><h1>{language === 'da' ? 'Det sker.' : 'What’s on.'}</h1><p>{language === 'da' ? 'Lagersalg, særlige drops og andre grunde til at mødes omkring vintage.' : 'Warehouse sales, special drops and other reasons to meet around vintage.'}</p></header>
    <div className="events-list">{events.map((event) => { const date = new Date(event.date); return <article key={event.id} className="event-card"><div className="event-card-date"><strong>{date.getDate()}</strong><span>{date.toLocaleDateString(language === 'da' ? 'da-DK' : 'en-GB', { month:'short' })}</span><small>{date.getFullYear()}</small></div><div><span className="eyebrow">Rødovre · 10.00</span><h2>{text(event.title)}</h2><p>{text(event.description)}</p><strong>{event.place}</strong></div>{event.link ? <a href={event.link}>Billetter <ArrowUpRight/></a> : <span className="coming-pill">Mere info snart</span>}</article>})}</div>
    <div className="event-empty"><span>+</span><p>Her kan teamet nemt tilføje næste event.</p></div>
  </section>
}
