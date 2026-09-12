import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { GlassStage, useGlass } from './components/GlassStage'
import { Header } from './components/Header'
import { Toast, type ToastMessage } from './components/Toast'
import { Landing } from './pages/Landing'
import { Mix } from './pages/Mix'
import { Cart } from './pages/Cart'
import { Pay } from './pages/Pay'
import { Done, writeReceipt, type Receipt } from './pages/Done'
import { useCart } from './lib/useCart'
import { useDraft } from './lib/useDraft'
import type { Mode } from './canvas/engine'
import { navigate, ROUTES, useRoute } from './lib/router'
import { isBase, PACKAGE_SIZES } from '../shared/data/ingredients'
import { addIngredient, blendColor, removeIngredient, setLevel, weigh } from '../shared/lib/blend'
import { comment } from '../shared/lib/commentary'
import { blendPrice } from '../shared/lib/pricing'
import { PRESETS, randomBlend } from '../shared/lib/presets'
import type { BlendItem, Customer, EntryChoice, Level, OrderResponse } from '../shared/types'

export default function CanvasApp() {
  const draft = useDraft()

  const weighed = useMemo(() => weigh(draft.items, draft.size), [draft.items, draft.size])
  const color = useMemo(() => blendColor(weighed), [weighed])

  return (
    <GlassStage
      items={weighed}
      color={color}
      name={draft.name}
      size={draft.size}
      mode={draft.mode}
    >
      <Shop {...draft} />
    </GlassStage>
  )
}

/**
 * Split out so it can call `useGlass()` — the provider lives one level up and a
 * component cannot consume a context it renders itself.
 */
function Shop({
  items,
  setItems,
  name,
  setName,
  mode,
  setMode,
  size,
  setSize,
}: {
  items: BlendItem[]
  setItems: React.Dispatch<React.SetStateAction<BlendItem[]>>
  name: string
  setName: React.Dispatch<React.SetStateAction<string>>
  mode: Mode
  setMode: React.Dispatch<React.SetStateAction<Mode>>
  size: number
  setSize: React.Dispatch<React.SetStateAction<number>>
}) {
  const { pour } = useGlass()
  const route = useRoute()
  const [receipt, setReceipt] = useState<Receipt | null>(null)
  const [toast, setToast] = useState<ToastMessage | null>(null)
  const cart = useCart()

  const weighed = useMemo(() => weigh(items, size), [items, size])
  const color = useMemo(() => blendColor(weighed), [weighed])
  const line = useMemo(() => comment(weighed), [weighed])
  const price = useMemo(() => blendPrice(weighed, size), [weighed, size])
  /** what the same recipe costs in every pouch size — shown on the size cards */
  const sizePrices = useMemo(
    () => Object.fromEntries(PACKAGE_SIZES.map((s) => [s, blendPrice(weigh(items, s), s)])),
    [items],
  )
  const selected = useMemo(() => new Set(items.map((i) => i.ingredientId)), [items])
  const hasBase = items.some((i) => isBase(i.ingredientId))

  // every navigation starts at the top of the new page
  const first = useRef(true)
  useEffect(() => {
    if (first.current) {
      first.current = false
      return
    }
    window.scrollTo({ top: 0, behavior: 'auto' })
  }, [route])

  const repour = useCallback(() => {
    // two frames of slack: one for React to hand the new blend to the engine,
    // one for the new page's anchor to be measured before the pour starts
    requestAnimationFrame(() => requestAnimationFrame(pour))
  }, [pour])

  const goMix = useCallback(() => navigate(ROUTES.mix), [])
  const clearToast = useCallback(() => setToast(null), [])

  function chooseEntry(id: EntryChoice) {
    setItems(PRESETS[id].map((i) => ({ ...i })))
    goMix()
    repour()
  }

  function toggle(id: string) {
    setItems((prev) => {
      if (prev.some((i) => i.ingredientId === id)) {
        return isBase(id) ? prev : removeIngredient(prev, id)
      }
      return addIngredient(prev, id)
    })
  }

  /** From the catalogue on the landing page: take it, then go and mix it. */
  function pick(id: string) {
    const fresh = !items.some((i) => i.ingredientId === id)
    toggle(id)
    goMix()
    if (fresh) repour()
  }

  function surprise() {
    setItems(randomBlend(items))
    repour()
  }

  function addToCart() {
    const title = name.trim() || 'Adsız qarışıq'
    cart.add(title, weighed, price, size)
    setToast({
      id: Date.now(),
      title: `«${title}» səbətdədir`,
      body: `${size} q · ${weighed.length} tərkib`,
    })
  }

  function orderDone(order: OrderResponse, customer: Customer) {
    const r = { order, customer }
    setReceipt(r)
    writeReceipt(r)
    cart.clear()
  }

  return (
    <>
      <Header cartCount={cart.count} route={route} />

      {/* keyed so every route gets its own mount and its own entrance */}
      <div key={route} data-page>
        {route === ROUTES.mix ? (
          <Mix
            items={weighed}
            selected={selected}
            line={line}
            price={price}
            sizePrices={sizePrices}
            hasBase={hasBase}
            name={name}
            color={color}
            mode={mode}
            size={size}
            onMode={setMode}
            onSize={setSize}
            onName={setName}
            onToggle={toggle}
            onLevel={(id, lvl: Level) => setItems((p) => setLevel(p, id, lvl))}
            onRemove={(id) => setItems((p) => removeIngredient(p, id))}
            onSurprise={surprise}
            onPour={repour}
            onAdd={addToCart}
          />
        ) : route === ROUTES.cart ? (
          <Cart lines={cart.lines} onQty={cart.setQty} onRemove={cart.remove} />
        ) : route === ROUTES.pay ? (
          <Pay lines={cart.lines} onDone={orderDone} />
        ) : route === ROUTES.done ? (
          <Done receipt={receipt} />
        ) : (
          <Landing
            selected={selected}
            onChoose={chooseEntry}
            onPick={pick}
            onStart={goMix}
          />
        )}
      </div>

      <Toast message={toast} onDone={clearToast} />
    </>
  )
}
