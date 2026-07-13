import { ArrowLeft, Check, Download, ImagePlus, LayoutDashboard, PackagePlus, Pencil, RotateCcw, Search, Trash2, X } from 'lucide-react'
import { useEffect, useMemo, useState, type FormEvent } from 'react'
import { locations } from '../data/seed'
import { createDatasetExport } from '../services/browserCatalog'
import { useCatalog } from '../state/CatalogContext'
import type { Product, ProductStatus } from '../types'

type View = 'dashboard' | 'new'
const EMPTY_FORM = {
  title: '', description: '', price: '', category: 'Jakker', size: '', brand: '', decade: '', condition: 'God', material: '', color: '', storeId: 'city', image: '',
}
type FormState = typeof EMPTY_FORM
const DRAFT_KEY = 'decades-studio-form-draft'

function readDraft(): FormState {
  try { return { ...EMPTY_FORM, ...JSON.parse(localStorage.getItem(DRAFT_KEY) || '{}') } } catch { return EMPTY_FORM }
}

export function StudioPage() {
  const { products, saveProduct, removeProduct, reset } = useCatalog()
  const [view, setView] = useState<View>('dashboard')
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState<ProductStatus | 'all'>('all')
  const [form, setForm] = useState<FormState>(readDraft)
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    const timer = window.setTimeout(() => localStorage.setItem(DRAFT_KEY, JSON.stringify(form)), 250)
    return () => window.clearTimeout(timer)
  }, [form])

  const visible = useMemo(() => products.filter((product) => {
    const query = search.toLowerCase()
    return (status === 'all' || product.status === status) && (product.title.da.toLowerCase().includes(query) || product.brand?.toLowerCase().includes(query))
  }), [products, search, status])

  const update = (field: keyof FormState, value: string) => setForm((current) => ({ ...current, [field]: value }))
  const handleImage = (file?: File) => {
    if (!file) return
    if (file.size > 2_500_000) { alert('Vælg et billede under 2,5 MB til browserdemoen.'); return }
    const reader = new FileReader()
    reader.onload = () => update('image', String(reader.result))
    reader.readAsDataURL(file)
  }
  const submit = (event: FormEvent, productStatus: ProductStatus) => {
    event.preventDefault()
    if (!form.title || !form.price || !form.size || !form.image) { alert('Tilføj titel, pris, størrelse og billede.'); return }
    const product: Product = {
      id: `local-${crypto.randomUUID()}`,
      title: { da: form.title }, description: { da: form.description }, price: Number(form.price), category: form.category,
      size: form.size, brand: form.brand, decade: form.decade, condition: form.condition, material: form.material,
      color: form.color, storeId: form.storeId, status: productStatus, image: form.image, createdAt: new Date().toISOString().slice(0,10),
    }
    saveProduct(product)
    setForm(EMPTY_FORM)
    localStorage.removeItem(DRAFT_KEY)
    setSaved(true)
    window.setTimeout(() => setSaved(false), 2500)
    setView('dashboard')
  }
  const setProductStatus = (product: Product, next: ProductStatus) => saveProduct({ ...product, status: next })
  const exportData = () => {
    const blob = new Blob([JSON.stringify(createDatasetExport(products), null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `decades-demo-dataset-${new Date().toISOString().slice(0, 10)}.json`
    link.click()
    URL.revokeObjectURL(url)
  }

  return <section className="studio-page">
    <header className="studio-header"><div><span className="studio-mark">D</span><div><strong>Decades Studio</strong><small>Privat konceptdemo</small></div></div><a href="/">Se hjemmesiden ↗</a></header>
    <div className="studio-shell">
      <aside className="studio-sidebar"><button className={view === 'dashboard' ? 'active' : ''} onClick={() => setView('dashboard')}><LayoutDashboard/>Varer</button><button className={view === 'new' ? 'active' : ''} onClick={() => setView('new')}><PackagePlus/>Opret vare</button><div className="studio-user"><span>DV</span><div><strong>Demo-bruger</strong><small>Ejer</small></div></div></aside>
      <div className="studio-content">
        {saved && <div className="toast"><Check/> Varen er gemt i denne browser</div>}
        {view === 'dashboard' ? <>
          <div className="studio-title"><div><span className="eyebrow">Lokal browserdata</span><h1>Varer</h1><p>Se hvad der er online, gemt som kladde eller solgt.</p></div><div className="studio-title-actions"><button className="button button--outline" onClick={exportData}><Download/>Eksportér data</button><button className="button button--ink" onClick={() => setView('new')}><PackagePlus/>Ny vare</button></div></div>
          <div className="stats-grid"><div><span>Online</span><strong>{products.filter((p) => p.status === 'published').length}</strong></div><div><span>Kladder</span><strong>{products.filter((p) => p.status === 'draft').length}</strong></div><div><span>Solgt</span><strong>{products.filter((p) => p.status === 'sold').length}</strong></div><div><span>Varer i alt</span><strong>{products.length}</strong></div></div>
          <div className="studio-tools"><label><Search/><input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Søg efter titel eller brand"/></label><select value={status} onChange={(e) => setStatus(e.target.value as ProductStatus | 'all')}><option value="all">Alle statusser</option><option value="published">Online</option><option value="draft">Kladder</option><option value="sold">Solgt</option></select></div>
          <div className="inventory-list">{visible.map((product) => <article key={product.id}><img src={product.image} alt=""/><div className="inventory-name"><strong>{product.title.da}</strong><span>{product.category} · {product.size}</span></div><strong>{product.price.toLocaleString('da-DK')} kr.</strong><span className={`status-pill status-pill--${product.status}`}>{product.status === 'published' ? 'Online' : product.status === 'draft' ? 'Kladde' : product.status}</span><select aria-label="Skift status" value={product.status} onChange={(e) => setProductStatus(product, e.target.value as ProductStatus)}><option value="draft">Kladde</option><option value="published">Online</option><option value="reserved">Reserveret</option><option value="sold">Solgt</option><option value="archived">Arkiveret</option></select><button className="icon-button" aria-label="Rediger" onClick={() => alert('Redigering kan kobles på i næste pilottrin.')}><Pencil/></button><button className="icon-button danger" aria-label="Slet" onClick={() => confirm(`Slet ${product.title.da}?`) && removeProduct(product.id)}><Trash2/></button></article>)}</div>
          {!visible.length && <div className="studio-empty">Ingen varer matcher din søgning.</div>}
          <button className="reset-button" onClick={() => confirm('Nulstil alle demoændringer?') && reset()}><RotateCcw/> Nulstil eksempeldata</button>
        </> : <form className="listing-form" onSubmit={(e) => submit(e, 'published')}>
          <div className="form-topbar"><button type="button" className="back-link" onClick={() => setView('dashboard')}><ArrowLeft/>Tilbage</button><div><button type="button" className="button button--outline" onClick={(e) => submit(e as unknown as FormEvent, 'draft')}>Gem kladde</button><button className="button button--ink" type="submit">Udgiv vare</button></div></div>
          <div className="studio-title"><div><span className="eyebrow">Ny unik vare</span><h1>Hvad har I fundet?</h1><p>Felter med * skal udfyldes. Kladden gemmes automatisk lokalt.</p></div></div>
          <div className="form-layout"><div className="form-main">
            <section className="form-card"><h2>Billede</h2><p>Brug et tydeligt billede. I den færdige app gemmer vi også en original til et fremtidigt datasæt.</p>{form.image ? <div className="image-preview"><img src={form.image} alt="Forhåndsvisning"/><button type="button" onClick={() => update('image','')}><X/></button></div> : <label className="image-drop"><ImagePlus/><strong>Vælg et billede *</strong><span>JPG, PNG eller WebP · maks. 2,5 MB i demoen</span><input type="file" accept="image/jpeg,image/png,image/webp" onChange={(e) => handleImage(e.target.files?.[0])}/></label>}</section>
            <section className="form-card"><h2>Det vigtigste</h2><label>Titel *<input value={form.title} onChange={(e) => update('title',e.target.value)} placeholder="Fx rød læderjakke"/></label><label>Beskrivelse<textarea value={form.description} onChange={(e) => update('description',e.target.value)} placeholder="Pasform, detaljer og det der gør varen særlig…" rows={5}/></label><div className="form-row"><label>Pris i kr. *<input type="number" min="1" value={form.price} onChange={(e) => update('price',e.target.value)} placeholder="595"/></label><label>Størrelse *<input value={form.size} onChange={(e) => update('size',e.target.value)} placeholder="M / 38 / One size"/></label></div></section>
            <section className="form-card"><h2>Detaljer</h2><div className="form-row"><label>Kategori<select value={form.category} onChange={(e) => update('category',e.target.value)}><option>Jakker</option><option>Overdele</option><option>Kjoler</option><option>Strik</option><option>Nederdele</option><option>Bukser</option><option>Accessories</option></select></label><label>Brand<input value={form.brand} onChange={(e) => update('brand',e.target.value)}/></label></div><div className="form-row"><label>Årti<select value={form.decade} onChange={(e) => update('decade',e.target.value)}><option value="">Ukendt</option><option>1960s</option><option>1970s</option><option>1980s</option><option>1990s</option><option>2000s</option></select></label><label>Stand<select value={form.condition} onChange={(e) => update('condition',e.target.value)}><option>Som ny</option><option>Rigtig god</option><option>God</option><option>Elsket</option></select></label></div><div className="form-row"><label>Materiale<input value={form.material} onChange={(e) => update('material',e.target.value)} placeholder="Fx 100% uld"/></label><label>Farve<input value={form.color} onChange={(e) => update('color',e.target.value)} placeholder="Fx mørkeblå"/></label></div></section>
          </div><aside className="form-aside"><section className="form-card"><h2>Butik</h2><label>Hvor hænger varen?<select value={form.storeId} onChange={(e) => update('storeId',e.target.value)}>{locations.slice(0,3).map((location) => <option value={location.id} key={location.id}>{location.name}</option>)}</select></label></section><div className="autosave"><Check/> Kladden gemmes automatisk i denne browser</div></aside></div>
        </form>}
      </div>
    </div>
  </section>
}
