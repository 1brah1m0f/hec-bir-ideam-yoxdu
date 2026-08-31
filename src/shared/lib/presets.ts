import type { BlendItem, EntryChoice } from '../types'

export const ENTRY_OPTIONS: { id: EntryChoice; label: string; hint: string }[] = [
  { id: 'seher', label: 'Səhər', hint: 'dolğun, oyaq' },
  { id: 'axsam', label: 'Axşam', hint: 'yumşaq, sakit tərkib' },
  { id: 'soyuq', label: 'Soyuq hava', hint: 'ədviyyatlı, isti xətt' },
]

export const PRESETS: Record<EntryChoice, BlendItem[]> = {
  seher: [
    { ingredientId: 'qara-cay', level: 'cox' },
    { ingredientId: 'portagal-qabigi', level: 'orta' },
    { ingredientId: 'hil', level: 'az' },
  ],
  axsam: [
    { ingredientId: 'ag-cay', level: 'cox' },
    { ingredientId: 'cobanyastigi', level: 'orta' },
    { ingredientId: 'melissa', level: 'orta' },
  ],
  soyuq: [
    { ingredientId: 'qara-cay', level: 'cox' },
    { ingredientId: 'itburnu', level: 'orta' },
    { ingredientId: 'darcin', level: 'az' },
    { ingredientId: 'zencefil', level: 'az' },
  ],
}

/** Hand-checked skeletons — random picks stay inside a combination that actually works. */
const RECIPES: BlendItem[][] = [
  [
    { ingredientId: 'qara-cay', level: 'cox' },
    { ingredientId: 'keklikotu', level: 'orta' },
    { ingredientId: 'dag-cayi', level: 'az' },
  ],
  [
    { ingredientId: 'yasil-cay', level: 'cox' },
    { ingredientId: 'nane', level: 'orta' },
    { ingredientId: 'melissa', level: 'az' },
  ],
  [
    { ingredientId: 'qara-cay', level: 'cox' },
    { ingredientId: 'zogal', level: 'orta' },
    { ingredientId: 'itburnu', level: 'az' },
  ],
  [
    { ingredientId: 'ag-cay', level: 'cox' },
    { ingredientId: 'lavanda', level: 'az' },
    { ingredientId: 'cobanyastigi', level: 'orta' },
  ],
  [
    { ingredientId: 'qara-cay', level: 'cox' },
    { ingredientId: 'alma', level: 'orta' },
    { ingredientId: 'darcin', level: 'az' },
    { ingredientId: 'portagal-qabigi', level: 'az' },
  ],
  [
    { ingredientId: 'yasil-cay', level: 'cox' },
    { ingredientId: 'zencefil', level: 'az' },
    { ingredientId: 'portagal-qabigi', level: 'orta' },
  ],
  [
    { ingredientId: 'qara-cay', level: 'cox' },
    { ingredientId: 'hil', level: 'az' },
    { ingredientId: 'mixek', level: 'az' },
    { ingredientId: 'darcin', level: 'orta' },
  ],
  [
    { ingredientId: 'ag-cay', level: 'cox' },
    { ingredientId: 'nane', level: 'orta' },
    { ingredientId: 'alma', level: 'orta' },
  ],
  [
    { ingredientId: 'qara-cay', level: 'orta' },
    { ingredientId: 'keklikotu', level: 'orta' },
    { ingredientId: 'itburnu', level: 'az' },
    { ingredientId: 'zencefil', level: 'az' },
  ],
]

export function randomBlend(avoid?: BlendItem[]): BlendItem[] {
  const key = avoid?.map((i) => i.ingredientId).join(',')
  let choice = RECIPES[Math.floor(Math.random() * RECIPES.length)]
  for (let i = 0; i < 4 && choice.map((c) => c.ingredientId).join(',') === key; i++) {
    choice = RECIPES[Math.floor(Math.random() * RECIPES.length)]
  }
  return choice.map((c) => ({ ...c }))
}
