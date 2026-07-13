import { Route, Routes, useLocation } from 'react-router-dom'
import { useEffect } from 'react'
import { Layout } from './components/Layout'
import { HomePage } from './pages/HomePage'
import { ShopPage } from './pages/ShopPage'
import { ProductPage } from './pages/ProductPage'
import { LocationsPage } from './pages/LocationsPage'
import { EventsPage } from './pages/EventsPage'
import { StudioPage } from './pages/StudioPage'
import { NotFoundPage } from './pages/NotFoundPage'

function ScrollToTop() {
  const { pathname } = useLocation()
  useEffect(() => window.scrollTo({ top: 0, behavior: 'instant' }), [pathname])
  return null
}

export function App() {
  return <Layout><ScrollToTop/><Routes>
    <Route path="/" element={<HomePage/>}/>
    <Route path="/shop" element={<ShopPage/>}/>
    <Route path="/shop/:productId" element={<ProductPage/>}/>
    <Route path="/butikker" element={<LocationsPage/>}/>
    <Route path="/events" element={<EventsPage/>}/>
    <Route path="/studio" element={<StudioPage/>}/>
    <Route path="*" element={<NotFoundPage/>}/>
  </Routes></Layout>
}
