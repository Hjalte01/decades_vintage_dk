import type { EventItem, Product, SocialPost, StoreLocation } from '../types'

const asset = (path: string) => `${import.meta.env.BASE_URL}${path}`

export const locations: StoreLocation[] = [
  {
    id: 'city', name: 'Indre By', address: 'Larsbjørnsstræde 16', area: '1454 København K', color: '#8b6668', mapImage: asset('images/maps/city.webp'),
    hours: [
      { days: { da: 'Mandag – fredag', en: 'Monday – Friday' }, hours: '11.00 – 18.00' },
      { days: { da: 'Lørdag', en: 'Saturday' }, hours: '11.00 – 17.00' },
      { days: { da: 'Søndag', en: 'Sunday' }, hours: '12.00 – 16.00' },
    ],
  },
  {
    id: 'n27', name: 'Nørrebro 27', address: 'Nørrebrogade 27', area: '2200 København N', color: '#69777a', mapImage: asset('images/maps/n27.webp'),
    hours: [
      { days: { da: 'Mandag – fredag', en: 'Monday – Friday' }, hours: '11.00 – 18.00' },
      { days: { da: 'Lørdag – søndag', en: 'Saturday – Sunday' }, hours: '11.00 – 17.00' },
    ],
  },
  {
    id: 'n49', name: 'Nørrebro 49A', address: 'Nørrebrogade 49A', area: '2200 København N', color: '#a68d69', mapImage: asset('images/maps/n49.webp'),
    hours: [
      { days: { da: 'Mandag – fredag', en: 'Monday – Friday' }, hours: '11.00 – 18.00' },
      { days: { da: 'Lørdag – søndag', en: 'Saturday – Sunday' }, hours: '11.00 – 17.00' },
    ],
  },
  {
    id: 'warehouse', name: 'Lageret', address: 'Roskildevej 398', area: '2610 Rødovre', color: '#687566', mapImage: asset('images/maps/warehouse.webp'),
    hours: [], note: { da: 'Kun åbent til events – følg med her.', en: 'Open for events only — watch this space.' },
  },
]

export const seedProducts: Product[] = [
  { id:'p1', title:{da:'Rød læderjakke',en:'Red leather jacket'}, description:{da:'Blødt læder med den helt rigtige patina. Kort pasform og quiltet fór.',en:'Soft leather with just the right patina. Cropped fit and quilted lining.'}, price:895, category:'Jakker', size:'M', brand:'Unknown', decade:'1980s', condition:'Rigtig god', material:'Læder', color:'Rød', storeId:'city', status:'published', image:asset('images/products/red-leather-jacket.webp'), createdAt:'2026-07-11' },
  { id:'p2', title:{da:'Broderet denimvest',en:'Embroidered denim vest'}, description:{da:'Håndbroderede blomster og flotte slidspor.',en:'Hand-embroidered flowers with beautiful wear.'}, price:445, category:'Overdele', size:'S/M', decade:'1990s', condition:'God', material:'Denim', color:'Blå', storeId:'n27', status:'published', image:asset('images/products/embroidered-denim-vest.webp'), createdAt:'2026-07-10' },
  { id:'p3', title:{da:'Silkekjole med print',en:'Printed silk dress'}, description:{da:'Let silkekjole med levende botanisk print.',en:'Lightweight silk dress with a vibrant botanical print.'}, price:625, category:'Kjoler', size:'38', decade:'1970s', condition:'Rigtig god', material:'Silke', color:'Multifarvet', storeId:'n49', status:'published', image:asset('images/products/printed-silk-dress.webp'), createdAt:'2026-07-09' },
  { id:'p4', title:{da:'Oversized trenchcoat',en:'Oversized trench coat'}, description:{da:'Klassisk trench med rummelig skulder og bælte.',en:'Classic trench with a roomy shoulder and belt.'}, price:745, category:'Jakker', size:'L', decade:'1990s', condition:'God', material:'Bomuld', color:'Sand', storeId:'city', status:'published', image:asset('images/products/oversized-trench-coat.webp'), createdAt:'2026-07-08' },
  { id:'p5', title:{da:'Grafisk strik',en:'Graphic knit'}, description:{da:'Tung, blød strik med grafisk mønster.',en:'Heavy, soft knit with a graphic pattern.'}, price:395, category:'Strik', size:'M/L', decade:'1980s', condition:'God', material:'Uldblanding', color:'Sort / creme', storeId:'n27', status:'published', image:asset('images/products/graphic-knit.webp'), createdAt:'2026-07-07' },
  { id:'p6', title:{da:'Plisseret nederdel',en:'Pleated skirt'}, description:{da:'Flydende midi-nederdel med flot bevægelse.',en:'Fluid midi skirt with beautiful movement.'}, price:345, category:'Nederdele', size:'36', decade:'1980s', condition:'Rigtig god', material:'Viskose', color:'Grøn', storeId:'n49', status:'published', image:asset('images/products/green-pleated-skirt.webp'), createdAt:'2026-07-06' },
]

export const events: EventItem[] = [
  { id:'e1', date:'2026-08-23T10:00:00', title:{da:'Kæmpe lagersalg',en:'Huge warehouse sale'}, description:{da:'En hel dag med stativer, kilo-fund, musik og gode priser. Mere info kommer snart.',en:'A full day of rails, kilo finds, music and good prices. More info soon.'}, place:'Roskildevej 398, Rødovre' },
]

export const socialPosts: SocialPost[] = [
  { id:'social-1', shortcode:'Dapd0UdthqR', caption:'Sommer trend?? 👀', publishedAt:'2026-07-11', image:asset('images/social/Dapd0UdthqR.webp'), postUrl:'https://www.instagram.com/reel/Dapd0UdthqR/' },
  { id:'social-2', shortcode:'DalIyTYtAWc', caption:'Nævn et bedre outfit! 🧡', publishedAt:'2026-07-09', image:asset('images/social/DalIyTYtAWc.webp'), postUrl:'https://www.instagram.com/reel/DalIyTYtAWc/' },
  { id:'social-3', shortcode:'DadSnkAtpnN', caption:'Det er self bare en joke. Han smiler meget mere irl 🌸🩵✨', publishedAt:'2026-07-06', image:asset('images/social/DadSnkAtpnN.webp'), postUrl:'https://www.instagram.com/reel/DadSnkAtpnN/' },
  { id:'social-4', shortcode:'DaanqTytc6M', caption:'Bedste farver at mixe 💛🩵🩷', publishedAt:'2026-07-05', image:asset('images/social/DaanqTytc6M.webp'), postUrl:'https://www.instagram.com/reel/DaanqTytc6M/' },
  { id:'social-5', shortcode:'DaVKmWDAzo4', caption:'Benhårdt Roskilde fit 👊', publishedAt:'2026-07-03', image:asset('images/social/DaVKmWDAzo4.webp'), postUrl:'https://www.instagram.com/reel/DaVKmWDAzo4/' },
  { id:'social-6', shortcode:'DaNb3ycNZCn', caption:'Pauser så du kan se min nye taske 👜', publishedAt:'2026-06-30', image:asset('images/social/DaNb3ycNZCn.webp'), postUrl:'https://www.instagram.com/reel/DaNb3ycNZCn/' },
  { id:'social-7', shortcode:'DaK9iBBtjmi', caption:'Jeg gør det for folket 😮‍💨', publishedAt:'2026-06-29', image:asset('images/social/DaK9iBBtjmi.webp'), postUrl:'https://www.instagram.com/reel/DaK9iBBtjmi/' },
  { id:'social-8', shortcode:'DaH5zoLt_rR', caption:'Lavede videoen inden det blev 30 GRADER I DK!!!!! 🤯', publishedAt:'2026-06-28', image:asset('images/social/DaH5zoLt_rR.webp'), postUrl:'https://www.instagram.com/reel/DaH5zoLt_rR/' },
]
