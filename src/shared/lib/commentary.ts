import { BY_ID, isBase } from '../data/ingredients'
import type { WeighedItem } from '../types'
import { cap, f } from './az'

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

const PAIRS: [string, string, string[]][] = [
  [
    'keklikotu',
    'qara-cay',
    [
      'Kəklikotu qara çayla yaxşı gedir, ikisi bir-birini tamamlayır.',
      'Kəklikotu qara çayın üstündə düzgün oturur.',
    ],
  ],
  [
    'nane',
    'yasil-cay',
    [
      'Nanə yaşıl çayla təmiz gedir, qarışıq yüngül qalır.',
      'Yaşıl çay nanəni yaxşı daşıyır.',
    ],
  ],
  [
    'darcin',
    'alma',
    ['Darçınla alma klassik cütdür, bu qarışıqda dinc oturur.', 'Alma darçını yumşaldır.'],
  ],
  [
    'itburnu',
    'zogal',
    [
      'İtburnu ilə zoğal eyni turş xətdə gedir, rəng də tünd qırmızıya çəkir.',
      'Zoğalla itburnu bir-birini gücləndirir.',
    ],
  ],
  [
    'portagal-qabigi',
    'darcin',
    [
      'Portağal qabığı darçınla soyuq havalar üçün tanış bir cüt qurur.',
      'Darçın portağal qabığının arxasında yaxşı dayanır.',
    ],
  ],
  [
    'cobanyastigi',
    'ag-cay',
    [
      'Çobanyastığı ağ çayla incə qalır, axşam üçün rahat qarışıqdır.',
      'Ağ çay çobanyastığının qabağına keçmir, bu yaxşıdır.',
    ],
  ],
  [
    'hil',
    'qara-cay',
    ['Hil qara çaya dərinlik verir, ölçünü qaçırmasan yaxşı işləyir.'],
  ],
  [
    'melissa',
    'ag-cay',
    ['Melissa ağ çayla çox yumşaq gedir, axşam üçün uyğundur.'],
  ],
  [
    'zencefil',
    'portagal-qabigi',
    ['Zəncəfillə portağal qabığı bir-birini itiləşdirir, soyuq havalar üçün yaxşıdır.'],
  ],
  [
    'lavanda',
    'ag-cay',
    ['Lavanda ağ çayın üstündə açıq oxunur, azı da kifayət edir.'],
  ],
  [
    'keklikotu',
    'dag-cayi',
    ['Kəklikotu ilə dağ çayı eyni dağ xəttindədir, birlikdə səliqəli çıxır.'],
  ],
  [
    'zogal',
    'qara-cay',
    ['Zoğal qara çayı turşluğa çəkir, rəng də dərhal qırmızılaşır.'],
  ],
]

const SPICE_IDS = ['darcin', 'zencefil', 'hil', 'mixek']

const MOOD_LINES: Record<string, string[]> = {
  'axşam üçün': [
    'Bu qarışıq axşam üçün oturur, tələsmədən içiləsi bir şeydir.',
    'Axşam üçün balanslı çıxdı, heç nə qabağa keçmir.',
  ],
  'səhər üçün': [
    'Səhər üçün kifayət qədər dolğun, xətti aydındır.',
    'Bu tərkib səhər üçün oyaq bir xarakter verir.',
  ],
  'soyuq havalar üçün': [
    'Soyuq havalar üçün yaxşı yığılıb, isti tərəfi güclüdür.',
    'Soyuq havalar üçün düzgün ağırlıqdadır.',
  ],
  'qış üçün': ['Qış üçün ədviyyatlı və dolğun bir xətt tutub.'],
  'yay üçün': ['Yay üçün yüngül və sərin tərəfdə qalır.'],
  'payız üçün': ['Payız üçün meyvəli və mülayim bir qarışıqdır.'],
  'gün ortası üçün': ['Gün ortası üçün nə ağır, nə də boşdur — ortada dayanır.'],
  'gecə üçün': ['Gecə üçün sakit bir tərkibdir, heç bir tərəfi kəskin deyil.'],
  'yeməkdən sonra': ['Yeməkdən sonra üçün təmiz və sadə çıxır.'],
}

export function comment(items: WeighedItem[]): string {
  if (items.length === 0) {
    return 'Banka hələ boşdur — bir baza çay seç, oradan başlayaq.'
  }

  const seed = hash(items.map((i) => `${i.ingredientId}:${i.grams}`).join('|'))
  const grams = new Map(items.map((i) => [i.ingredientId, i.grams]))
  const base = items.find((i) => isBase(i.ingredientId))
  const extras = items
    .filter((i) => !isBase(i.ingredientId))
    .sort((a, b) => b.grams - a.grams)

  const cands: Candidate[] = []

  if (extras.length === 0 && base) {
    cands.push({
      priority: 90,
      text: pick(
        [
          `Təmiz ${f(base.ingredientId).nom} — yaxşı təməldir, amma hələ öz xarakteri yoxdur.`,
          `Hələlik yalnız ${f(base.ingredientId).nom} var, üstünə bir ot və ya ədviyyat əlavə etsən qarışıq başlayar.`,
        ],
        seed,
      ),
    })
  }

  const loud = extras.find((e) => {
    const ing = BY_ID[e.ingredientId]
    return ing && e.grams >= 30 && ing.strength >= 1.4
  })
  if (loud) {
    const others = extras.filter((e) => e.ingredientId !== loud.ingredientId)
    const victim = others[others.length - 1]
    cands.push({
      priority: 85,
      text: victim
        ? `${cap(f(loud.ingredientId).nom)} ${loud.grams} qramdır — bu qədər olsa ${f(victim.ingredientId).acc} bağlayacaq.`
        : `${cap(f(loud.ingredientId).nom)} ${loud.grams} qramdır, bu qədəri qarışığın qalan hissəsini örtür.`,
    })
  }

  if (base && base.grams < 25) {
    cands.push({
      priority: 80,
      text: `${cap(f(base.ingredientId).nom)} cəmi ${base.grams} qramdır — qarışığın dayağı zəifləyir.`,
    })
  }

  for (const [a, b, lines] of CONFLICTS) {
    const ga = grams.get(a) ?? 0
    const gb = grams.get(b) ?? 0
    if (ga >= 12 && gb >= 12) cands.push({ priority: 70, text: pick(lines, seed) })
  }

  const spiceTotal = SPICE_IDS.reduce((sum, id) => sum + (grams.get(id) ?? 0), 0)
  if (spiceTotal >= 35) {
    cands.push({
      priority: 65,
      text: `Ədviyyatlar birlikdə ${spiceTotal} qramdır, çayın öz dadı arxa plana keçir.`,
    })
  }

  if (items.length >= 7) {
    cands.push({
      priority: 60,
      text: `${items.length} tərkib var — qarışıq öz xəttini itirməyə başlayır.`,
    })
  }

  for (const [a, b, lines] of PAIRS) {
    if (grams.has(a) && grams.has(b)) cands.push({ priority: 40, text: pick(lines, seed) })
  }

  if (extras.length === 1 && base) {
    const e = extras[0]
    cands.push({
      priority: 30,
      text: `${cap(f(base.ingredientId).nom)} və ${f(e.ingredientId).nom} — sadə cütdür, üçüncü bir şey əlavə etsən dərinlik qazanar.`,
    })
  }

  const moodCount = new Map<string, number>()
  for (const it of items) {
    const ing = BY_ID[it.ingredientId]
    if (!ing) continue
    for (const m of ing.mood) moodCount.set(m, (moodCount.get(m) ?? 0) + it.grams)
  }
  const topMood = [...moodCount.entries()].sort((a, b) => b[1] - a[1])[0]
  if (topMood && MOOD_LINES[topMood[0]]) {
    cands.push({ priority: 10, text: pick(MOOD_LINES[topMood[0]], seed) })
  }

  cands.push({ priority: 0, text: 'Tərkib balansdadır, bu haldan da göndərmək olar.' })

  const best = cands.reduce((a, b) => (b.priority > a.priority ? b : a))
  const tied = cands.filter((c) => c.priority === best.priority)
  return pick(tied, seed >>> 3).text
}
