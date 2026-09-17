import { BY_ID, isBase } from '../data/ingredients'
import type { WeighedItem } from '../types'
import { cap, f } from './az'
import { INSIGHT_CLAUSE } from './copy'

interface Candidate {
  priority: number
  text: string
}

function hash(s: string): number {
  let h = 2166136261
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  return h >>> 0
}

function pick<T>(list: T[], seed: number): T {
  return list[seed % list.length]
}

const CONFLICTS: [string, string, string[]][] = [
  [
    'lavanda',
    'nane',
    [
      'Lavanda ilə nanə bir-birini itələyir — birini azaltsan qarışıq daha aydın oxunar.',
      'Lavanda və nanə eyni anda öndə olmaq istəyir, ikisindən biri geri çəkilməlidir.',
    ],
  ],
  [
    'mixek',
    'nane',
    [
      'Mixək nanənin sərinliyini tam basır, ikisi eyni qarışıqda çətin yola gedir.',
      'Mixəklə nanə bir-birinə dəyir — nanə burada itir.',
    ],
  ],
  [
    'lavanda',
    'zencefil',
    [
      'Zəncəfilin kəskinliyi lavandanın üstündən keçir, lavandadan az qalır.',
      'Lavanda zəncəfilin yanında güclə eşidilir.',
    ],
  ],
  [
    'mixek',
    'cobanyastigi',
    [
      'Mixək çobanyastığının yumşaq tərəfini örtür, çobanyastığı arxada qalır.',
      'Çobanyastığı mixəyin yanında öz xəttini saxlaya bilmir.',
    ],
  ],
  [
    'lavanda',
    'darcin',
    ['Darçınla lavanda iki ayrı istiqamətə çəkir, qarışıq bir az dağınıq olur.'],
  ],
]

const SPICE_IDS = ['darcin', 'zencefil', 'hil', 'mixek']

const MOOD_RESULT: Record<string, string> = {
  'axşam üçün': 'axşam üçün yumşaq, amma çay xarakterini itirməyən qarışıq',
  'səhər üçün': 'səhər üçün dolğun və oyaq bir qarışıq',
  'soyuq havalar üçün': 'soyuq havalar üçün isti və dərin bir qarışıq',
  'qış üçün': 'qış üçün ədviyyatlı, dolğun bir qarışıq',
  'yay üçün': 'yay üçün yüngül və sərin bir qarışıq',
  'payız üçün': 'payız üçün meyvəli və mülayim bir qarışıq',
  'gün ortası üçün': 'gün ortası üçün nə ağır, nə də boş bir qarışıq',
  'gecə üçün': 'gecə üçün sakit, kəskinliyi olmayan bir qarışıq',
  'yeməkdən sonra': 'yeməkdən sonra üçün təmiz və yüngül bir qarışıq',
}

function joinClauses(parts: string[]): string {
  if (parts.length === 1) return parts[0]
  if (parts.length === 2) return `${parts[0]}, ${parts[1]}`
  return `${parts.slice(0, -1).join(', ')}, ${parts[parts.length - 1]}`
}

/**
 * The running character sentence for the mixer — last pick plus how the cup
 * reads as a whole, not a generic mood line.
 */
export function blendInsight(items: WeighedItem[]): string {
  if (items.length === 0) {
    return 'Əvvəl bir baza seçin. Qarışığın əsas dadı buradan başlayır.'
  }

  const seed = hash(items.map((i) => `${i.ingredientId}:${i.grams}`).join('|'))
  const base = items.find((i) => isBase(i.ingredientId))
  const extras = items
    .filter((i) => !isBase(i.ingredientId))
    .sort((a, b) => b.grams - a.grams)

  if (extras.length === 0 && base) {
    return pick(
      [
        `${cap(f(base.ingredientId).nom)} ${INSIGHT_CLAUSE[base.ingredientId]}. Üstünə bir ot və ya meyvə qatanda qarışıq öz xəttini tapacaq.`,
        `Hələlik yalnız ${f(base.ingredientId).nom} var — yaxşı təməldir, amma xarakter hələ əlavələrdən gələcək.`,
      ],
      seed,
    )
  }

  const named: { name: string; clause: string }[] = []
  if (base && INSIGHT_CLAUSE[base.ingredientId]) {
    named.push({
      name: cap(f(base.ingredientId).nom),
      clause: INSIGHT_CLAUSE[base.ingredientId],
    })
  }
  for (const e of extras) {
    const clause = INSIGHT_CLAUSE[e.ingredientId]
    if (clause) named.push({ name: f(e.ingredientId).nom, clause })
  }

  const moodCount = new Map<string, number>()
  for (const it of items) {
    const ing = BY_ID[it.ingredientId]
    if (!ing) continue
    for (const m of ing.mood) moodCount.set(m, (moodCount.get(m) ?? 0) + it.grams)
  }
  const topMood = [...moodCount.entries()].sort((a, b) => b[1] - a[1])[0]
  const result = topMood ? MOOD_RESULT[topMood[0]] : null

  if (named.length === 0) return 'Tərkib balansdadır, bu haldan da göndərmək olar.'

  const phrases = named.map((p, i) =>
    i === named.length - 1 && named.length > 1
      ? `${p.name} isə ${p.clause}`
      : `${p.name} ${p.clause}`,
  )
  const body = joinClauses(phrases)

  if (result) return `${body}. Nəticə: ${result}.`
  return `${body}.`
}

/**
 * A short craft note from the "çay ustası" — warnings first, then a calm
 * confirmation when the recipe is already sitting well.
 */
export function masterNote(items: WeighedItem[]): string | null {
  if (items.length === 0) return null

  const seed = hash(items.map((i) => `${i.ingredientId}:${i.grams}`).join('|'))
  const grams = new Map(items.map((i) => [i.ingredientId, i.grams]))
  const extras = items.filter((i) => !isBase(i.ingredientId)).sort((a, b) => b.grams - a.grams)
  const cands: Candidate[] = []

  const loud = extras.find((e) => {
    const ing = BY_ID[e.ingredientId]
    return ing && e.grams >= 12 && ing.strength >= 1.4
  })
  if (loud) {
    cands.push({
      priority: 85,
      text: `${cap(f(loud.ingredientId).nom)} bu qədər olsa qalan dadları örtə bilər — bir pillə azalt.`,
    })
  }

  for (const [a, b, lines] of CONFLICTS) {
    const ga = grams.get(a) ?? 0
    const gb = grams.get(b) ?? 0
    if (ga >= 1 && gb >= 1) cands.push({ priority: 70, text: pick(lines, seed) })
  }

  const spiceTotal = SPICE_IDS.reduce((sum, id) => sum + (grams.get(id) ?? 0), 0)
  const total = items.reduce((s, it) => s + it.grams, 0) || 1
  if (spiceTotal / total >= 0.08) {
    cands.push({
      priority: 65,
      text: 'Ədviyyatlar birlikdə çoxdur, çayın öz dadı arxa plana keçir.',
    })
  }

  if (items.length >= 5) {
    cands.push({
      priority: 60,
      text: '4-dən çox tərkib dadı qarışdıra bilər. Birini çıxarsan xətt daha aydın olar.',
    })
  }

  if (cands.length === 0) {
    return pick(
      [
        'Bu haldan da göndərmək olar — baza öndə qalır, əlavələr onu tamamlayır.',
        'Nisbət çay ustası məntiqi ilə oturub: əsas dad bazadadır, ətir üstündədir.',
      ],
      seed,
    )
  }

  const best = cands.reduce((a, b) => (b.priority > a.priority ? b : a))
  const tied = cands.filter((c) => c.priority === best.priority)
  return pick(tied, seed >>> 3).text
}

/** @deprecated use blendInsight — kept so older call sites keep compiling during the swap */
export function comment(items: WeighedItem[]): string {
  return blendInsight(items)
}
