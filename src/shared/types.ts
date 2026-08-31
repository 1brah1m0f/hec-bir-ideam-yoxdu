export type Category = 'baza' | 'ot' | 'meyve' | 'edviyyat'

export type WeightClass = 'heavy' | 'mid' | 'light'

export type ShapeKind =
  | 'tea-black'
  | 'tea-green'
  | 'tea-white'
  | 'thyme'
  | 'mint'
  | 'chamomile'
  | 'melissa'
  | 'lavender'
  | 'mountain-tea'
  | 'apple'
  | 'cornel'
  | 'rosehip'
  | 'orange-peel'
  | 'cinnamon'
  | 'ginger'
  | 'cardamom'
  | 'clove'

export interface Ingredient {
  id: string
  name: string
  category: Category
  /** retail price of 100 g of this ingredient on its own, in manat */
  price: number
  /** liquid tint colour this ingredient contributes, as [r,g,b] */
  color: [number, number, number]
  /** how strongly one gram of this tints the liquid relative to others */
  strength: number
  weightClass: WeightClass
  shape: ShapeKind
  /** short neutral framing tag used by the commentary engine, e.g. "axşam üçün" */
  mood: string[]
  /** one sentence for the catalogue card */
  note: string
}

export type Level = 'az' | 'orta' | 'cox'

export interface BlendItem {
  ingredientId: string
  level: Level
}

export interface WeighedItem extends BlendItem {
  grams: number
}

export type EntryChoice = 'seher' | 'axsam' | 'soyuq'

/** Where the glass sits and how it behaves — driven by scroll position. */
export type Stage = 'hero' | 'story' | 'catalog' | 'mix' | 'order'

export interface CartLine {
  /** stable local id, not a server id */
  id: string
  name: string
  items: WeighedItem[]
  qty: number
  /** manat, one 100 g package */
  unitPrice: number
}

export type Payment = 'nagd' | 'kart'

export interface Customer {
  ad: string
  telefon: string
  seher: string
  unvan: string
  qeyd: string
  odenis: Payment
}

export interface OrderResponse {
  ok: true
  nomre: string
  cem: number
  catdirilma: number
  yekun: number
}
