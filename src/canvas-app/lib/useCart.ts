import { useCallback, useEffect, useRef, useState } from 'react'
import type { CartLine, WeighedItem } from '../../shared/types'

const KEY = 'oz-cayin.cart.v1'

function load(): CartLine[] {
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw)
    if (!Array.isArray(parsed)) return []
    // a stale schema is not worth migrating for a shopping cart
    return parsed.filter(
      (l): l is CartLine =>
        l &&
        typeof l.id === 'string' &&
        Array.isArray(l.items) &&
        typeof l.qty === 'number' &&
        typeof l.unitPrice === 'number',
    )
  } catch {
    return []
  }
}

export function useCart() {
  const [lines, setLines] = useState<CartLine[]>([])
  const hydrated = useRef(false)

  useEffect(() => {
    setLines(load())
    hydrated.current = true
  }, [])

  useEffect(() => {
    if (!hydrated.current) return
    try {
      localStorage.setItem(KEY, JSON.stringify(lines))
    } catch {
      /* private mode — the cart just does not survive a reload */
    }
  }, [lines])

  const add = useCallback((name: string, items: WeighedItem[], unitPrice: number) => {
    const id = `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`
    setLines((prev) => {
      // the same recipe under the same name is a quantity bump, not a new line
      const key = signature(items)
      const at = prev.findIndex((l) => l.name === name && signature(l.items) === key)
      if (at >= 0) {
        const next = [...prev]
        next[at] = { ...next[at], qty: Math.min(99, next[at].qty + 1) }
        return next
      }
      return [...prev, { id, name, items, qty: 1, unitPrice }]
    })
    return id
  }, [])

  const setQty = useCallback((id: string, qty: number) => {
    setLines((prev) =>
      qty <= 0
        ? prev.filter((l) => l.id !== id)
        : prev.map((l) => (l.id === id ? { ...l, qty: Math.min(99, qty) } : l)),
    )
  }, [])

  const remove = useCallback((id: string) => {
    setLines((prev) => prev.filter((l) => l.id !== id))
  }, [])

  const clear = useCallback(() => setLines([]), [])

  const count = lines.reduce((s, l) => s + l.qty, 0)

  return { lines, add, setQty, remove, clear, count }
}

function signature(items: WeighedItem[]): string {
  return items
    .map((i) => `${i.ingredientId}:${i.level}`)
    .sort()
    .join('|')
}
