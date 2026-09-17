import type { Category, Level } from '../types'

/** Shown on the jar, the pouch, and the cart when the blend has not been named. */
export const DEFAULT_BLEND_NAME = 'Mənim qarışığım'

export const NAME_SUGGESTIONS = ['Axşam Sükutu', 'Səhər Gücü', 'Mənim Ritualım'] as const

export const SIZE_COPY: Record<number, string> = {
  100: 'İlk qarışıq üçün',
  250: 'Ən sərfəli seçim',
  500: 'Ailə və ofis üçün',
}

export const LEVEL_HINT: Record<Level, string> = {
  az: 'yüngül not',
  orta: 'balanslı hiss',
  cox: 'dominant dad',
}

/** How this ingredient reads next to its grams in the proportion list. */
export const DAD_ROLE: Record<string, string> = {
  'qara-cay': 'baza',
  'yasil-cay': 'baza',
  'ag-cay': 'baza',
  keklikotu: 'isti bitki',
  nane: 'təravət',
  cobanyastigi: 'yumşaqlıq',
  melissa: 'sitrus notu',
  lavanda: 'çiçək aroması',
  'dag-cayi': 'bitki notu',
  alma: 'yumşaqlıq',
  zogal: 'turşməzə not',
  itburnu: 'qış dərinliyi',
  'portagal-qabigi': 'sitrus',
  darcin: 'isti sonluq',
  zencefil: 'kəskinlik',
  hil: 'premium ətir',
  mixek: 'dərin istilik',
}

/**
 * One-line benefit shown for about a second after the card is pressed.
 * Phrase matches the QA table — past tense, what just happened to the blend.
 */
export const BENEFIT: Record<string, string> = {
  'qara-cay':
    'Qara çay seçildi — qarışığa dolğunluq, rəng və klassik Azərbaycan çay xarakteri verir.',
  'yasil-cay':
    'Yaşıl çay seçildi — qarışığı daha yüngül, təmiz və təravətli edir.',
  'ag-cay':
    'Ağ çay seçildi — daha zərif və incə profil yaradır. Çiçək və yüngül meyvə notları ilə daha uyğundur.',
  keklikotu:
    'Kəklikotu əlavə olundu — qarışığa lokal, tanış və aromatik bitki xarakteri qatır.',
  nane: 'Nanə əlavə olundu — qarışığı daha təravətli və sərin içimli edir.',
  cobanyastigi:
    'Çobanyastığı əlavə olundu — dadı yumşaldır və çiçək aroması verir.',
  melissa:
    'Melissa əlavə olundu — yüngül limon notu qatır, amma qarışığı turş etmir.',
  lavanda:
    'Lavanda əlavə olundu — güclü çiçək aroması verir. Azı da qarışığı dəyişir.',
  'dag-cayi':
    'Dağ çayı əlavə olundu — quru ot, balabənzər yumşaqlıq və təbii bitki xarakteri qatır.',
  alma: 'Alma əlavə olundu — qarışığa təbii yumşaqlıq və yüngül şirinlik gətirir.',
  zogal: 'Zoğal əlavə olundu — turşməzə meyvə notu və qırmızımtıl rəng verir.',
  itburnu:
    'İtburnu əlavə olundu — qarışığa turşməzə dərinlik və qırmızı rəng tonu qatır.',
  'portagal-qabigi':
    'Portağal qabığı əlavə olundu — parlaq sitrus aroması verir.',
  darcin: 'Darçın əlavə olundu — qarışığa isti, şirin və ədviyyatlı sonluq verir.',
  zencefil:
    'Zəncəfil əlavə olundu — qarışığa yüngül kəskinlik və isti sonluq qatır.',
  hil: 'Hil əlavə olundu — güclü, ətirli və premium ədviyyat notu yaradır.',
  mixek: 'Mixək əlavə olundu — qarışığa dərin istilik və qış xarakteri verir.',
}

/** Shorter clauses used to assemble the running blend-character sentence. */
export const INSIGHT_CLAUSE: Record<string, string> = {
  'qara-cay': 'baza kimi dolğunluq verir',
  'yasil-cay': 'baza kimi yüngüllük və təmizlik verir',
  'ag-cay': 'baza kimi zərif, incə bir profil qurur',
  keklikotu: 'isti, tanış bitki notu qatır',
  nane: 'dadı sərinlədir',
  cobanyastigi: 'dadı yumşaldır',
  melissa: 'yüngül limon notu qatır',
  lavanda: 'güclü çiçək aroması verir',
  'dag-cayi': 'quru ot və yumşaq bal notu qatır',
  alma: 'təbii yumşaqlıq və yüngül şirinlik gətirir',
  zogal: 'turşməzə meyvə notu və qırmızımtıl rəng verir',
  itburnu: 'turşməzə dərinlik qatır',
  'portagal-qabigi': 'parlaq sitrus aroması verir',
  darcin: 'isti, şirin sonluq əlavə edir',
  zencefil: 'yüngül kəskinlik və isti sonluq qatır',
  hil: 'premium ətirli dərinlik yaradır',
  mixek: 'dərin istilik verir',
}

export interface MixCategoryCopy {
  id: Category
  label: string
  blurb: string
  /** shown once the base is in, before this group */
  cue?: string
}

export const MIX_CATEGORIES: MixCategoryCopy[] = [
  {
    id: 'baza',
    label: 'Əvvəl baza',
    blurb: 'Qarışığın əsas dadı buradan başlayır.',
  },
  {
    id: 'ot',
    label: 'Bitki notları',
    blurb: 'Yumşaqlıq və aroma qatır.',
    cue: 'İndi dad qat',
  },
  {
    id: 'meyve',
    label: 'Meyvə notları',
    blurb: 'Rəng, yumşaqlıq və turşməzəlik verir.',
  },
  {
    id: 'edviyyat',
    label: 'İsti notlar',
    blurb: 'Az miqdarla dərinlik yaradır.',
    cue: 'İndi istilik əlavə et',
  },
]

export function blendName(name: string): string {
  const t = name.trim()
  return t || DEFAULT_BLEND_NAME
}
