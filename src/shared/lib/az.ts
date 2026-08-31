/**
 * Explicit case forms per ingredient. Azerbaijani suffixation has enough
 * exceptions (mixək → mixəyi, İ/i casing) that a table beats a rules engine here.
 */
interface Forms {
  /** nominative, lowercase */
  nom: string
  /** accusative — "…nı/ni" */
  acc: string
  /** dative — "…a/ə" */
  dat: string
  /** comitative — "… ilə / …la" */
  ile: string
  /** ablative — "…dan/dən" */
  abl: string
}

export const FORMS: Record<string, Forms> = {
  'qara-cay': {
    nom: 'qara çay',
    acc: 'qara çayı',
    dat: 'qara çaya',
    ile: 'qara çayla',
    abl: 'qara çaydan',
  },
  'yasil-cay': {
    nom: 'yaşıl çay',
    acc: 'yaşıl çayı',
    dat: 'yaşıl çaya',
    ile: 'yaşıl çayla',
    abl: 'yaşıl çaydan',
  },
  'ag-cay': {
    nom: 'ağ çay',
    acc: 'ağ çayı',
    dat: 'ağ çaya',
    ile: 'ağ çayla',
    abl: 'ağ çaydan',
  },
  keklikotu: {
    nom: 'kəklikotu',
    acc: 'kəklikotunu',
    dat: 'kəklikotuna',
    ile: 'kəklikotu ilə',
    abl: 'kəklikotundan',
  },
  nane: { nom: 'nanə', acc: 'nanəni', dat: 'nanəyə', ile: 'nanə ilə', abl: 'nanədən' },
  cobanyastigi: {
    nom: 'çobanyastığı',
    acc: 'çobanyastığını',
    dat: 'çobanyastığına',
    ile: 'çobanyastığı ilə',
    abl: 'çobanyastığından',
  },
  melissa: {
    nom: 'melissa',
    acc: 'melissanı',
    dat: 'melissaya',
    ile: 'melissa ilə',
    abl: 'melissadan',
  },
  lavanda: {
    nom: 'lavanda',
    acc: 'lavandanı',
    dat: 'lavandaya',
    ile: 'lavanda ilə',
    abl: 'lavandadan',
  },
  'dag-cayi': {
    nom: 'dağ çayı',
    acc: 'dağ çayını',
    dat: 'dağ çayına',
    ile: 'dağ çayı ilə',
    abl: 'dağ çayından',
  },
  alma: { nom: 'alma', acc: 'almanı', dat: 'almaya', ile: 'alma ilə', abl: 'almadan' },
  zogal: { nom: 'zoğal', acc: 'zoğalı', dat: 'zoğala', ile: 'zoğalla', abl: 'zoğaldan' },
  itburnu: {
    nom: 'itburnu',
    acc: 'itburnunu',
    dat: 'itburnuna',
    ile: 'itburnu ilə',
    abl: 'itburnundan',
  },
  'portagal-qabigi': {
    nom: 'portağal qabığı',
    acc: 'portağal qabığını',
    dat: 'portağal qabığına',
    ile: 'portağal qabığı ilə',
    abl: 'portağal qabığından',
  },
  darcin: {
    nom: 'darçın',
    acc: 'darçını',
    dat: 'darçına',
    ile: 'darçınla',
    abl: 'darçından',
  },
  zencefil: {
    nom: 'zəncəfil',
    acc: 'zəncəfili',
    dat: 'zəncəfilə',
    ile: 'zəncəfillə',
    abl: 'zəncəfildən',
  },
  hil: { nom: 'hil', acc: 'hili', dat: 'hilə', ile: 'hillə', abl: 'hildən' },
  mixek: { nom: 'mixək', acc: 'mixəyi', dat: 'mixəyə', ile: 'mixəklə', abl: 'mixəkdən' },
}

/** Sentence-case a lowercase Azerbaijani word — "i" must become "İ", not "I". */
export function cap(s: string): string {
  if (!s) return s
  const first = s[0]
  const upper = first === 'i' ? 'İ' : first.toLocaleUpperCase('az')
  return upper + s.slice(1)
}

export function f(id: string): Forms {
  return FORMS[id] ?? { nom: id, acc: id, dat: id, ile: id, abl: id }
}
