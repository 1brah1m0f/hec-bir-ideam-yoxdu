import { useEffect, useRef, useState } from 'react'
import { BY_ID } from '../../shared/data/ingredients'
import type { BlendItem } from '../../shared/types'
import type { Mode } from '../canvas/engine'

const KEY = 'oz-cayin.draft.v1'
const LEVELS = new Set(['az', 'orta', 'cox'])

interface Draft {
  items: BlendItem[]
  name: string
  mode: Mode
}

function load(): Draft {
  const empty: Draft = { items: [], name: '', mode: 'dry' }
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) return empty
    const parsed = JSON.parse(raw)
    if (!parsed || !Array.isArray(parsed.items)) return empty
    return {
      // an ingredient that has since been removed from the catalogue is dropped
      // rather than crashing the mixer on a stale draft
      items: parsed.items.filter(
        (i: unknown): i is BlendItem =>
          !!i &&
          typeof (i as BlendItem).ingredientId === 'string' &&
          !!BY_ID[(i as BlendItem).ingredientId] &&
          LEVELS.has((i as BlendItem).level),
      ),
      name: typeof parsed.name === 'string' ? parsed.name.slice(0, 28) : '',
      mode: parsed.mode === 'brewed' ? 'brewed' : 'dry',
    }
  } catch {
    return empty
  }
}

/** The blend in progress, kept across reloads so a refresh never loses work. */
export function useDraft() {
  const [items, setItems] = useState<BlendItem[]>([])
  const [name, setName] = useState('')
  const [mode, setMode] = useState<Mode>('dry')
  const hydrated = useRef(false)

  useEffect(() => {
    const draft = load()
    setItems(draft.items)
    setName(draft.name)
    setMode(draft.mode)
    hydrated.current = true
  }, [])

  useEffect(() => {
    if (!hydrated.current) return
    try {
      localStorage.setItem(KEY, JSON.stringify({ items, name, mode }))
    } catch {
      /* private mode — the draft just does not survive a reload */
    }
  }, [items, name, mode])

  return { items, setItems, name, setName, mode, setMode }
}
