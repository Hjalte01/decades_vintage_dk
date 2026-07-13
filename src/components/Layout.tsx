import { CalendarDays, House, MapPin, Menu, ShoppingBag, X } from 'lucide-react'
import { useState, type ReactNode } from 'react'
import { Link, NavLink } from 'react-router-dom'
import { useLanguage } from '../state/LanguageContext'
import { Logo } from './Logo'

const nav = [
  { to: '/', da: 'Forside', en: 'Home', icon: House },
  { to: '/shop', da: 'Shop', en: 'Shop', icon: ShoppingBag },
  { to: '/butikker', da: 'Butikker', en: 'Stores', icon: MapPin },
  { to: '/events', da: 'Events', en: 'Events', icon: CalendarDays },
]

export function Layout({ children }: { children: ReactNode }) {
  const { language, setLanguage } = useLanguage()
  const [menuOpen, setMenuOpen] = useState(false)
  return <>
    <div className="demo-ribbon">Konceptdemo · ingen rigtige køb</div>
    <header className="site-header">
      <Link to="/" className="brand-link"><Logo /></Link>
      <nav className="desktop-nav" aria-label="Primær navigation">
        {nav.map((item) => <NavLink key={item.to} to={item.to} end={item.to === '/'}>{language === 'da' ? item.da : item.en}</NavLink>)}
      </nav>
      <div className="header-actions">
        <button className="language-toggle" onClick={() => setLanguage(language === 'da' ? 'en' : 'da')} aria-label="Skift sprog">{language === 'da' ? 'EN' : 'DA'}</button>
        <button className="menu-button" onClick={() => setMenuOpen(!menuOpen)} aria-label="Åbn menu">{menuOpen ? <X /> : <Menu />}</button>
      </div>
      {menuOpen && <nav className="mobile-menu">
        {nav.map((item) => <NavLink onClick={() => setMenuOpen(false)} key={item.to} to={item.to} end={item.to === '/'}>{language === 'da' ? item.da : item.en}</NavLink>)}
        <NavLink onClick={() => setMenuOpen(false)} to="/studio">Demo-studio</NavLink>
      </nav>}
    </header>
    <main>{children}</main>
    <footer className="site-footer">
      <div className="footer-brand"><span>DEC / CPH</span><p>Unikke fund.<br/><em>Nye kapitler.</em></p></div>
      <div><strong>Følg med</strong><a href="https://www.instagram.com/decadesvintagedk/" target="_blank" rel="noreferrer">@decadesvintagedk ↗</a><Link to="/studio">Medarbejder-demo</Link></div>
      <p className="footer-note">Denne side er en privat konceptdemo. Åbningstider, varer og events er eksempler og skal bekræftes.</p>
    </footer>
    <nav className="bottom-nav" aria-label="Mobil navigation">
      {nav.map(({ to, da, en, icon: Icon }) => <NavLink key={to} to={to} end={to === '/'}><Icon size={20}/><span>{language === 'da' ? da : en}</span></NavLink>)}
    </nav>
  </>
}
