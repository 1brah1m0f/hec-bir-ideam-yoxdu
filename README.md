# Öz çayın

Fərdi çay qarışığı düzəldib sifariş vermək üçün sayt. Şüşə banka, taxta qapaq,
quru qarışıq və dəmlənmiş çay bir `<canvas>` üzərində canlı çəkilir; canvas
bütün səhifələr boyu davam edir — səhifə dəyişəndə yenidən qurulmur.

```
npm install
npm run dev          # API (:8787) + Vite (:5173) birlikdə
```

Brauzerdə `http://localhost:5173`. Vite `/api` sorğularını `:8787`-ə yönləndirir,
ona görə səhifə inkişaf mühitində də real backend ilə işləyir.

## Səhifələr

| ünvan | nə var |
| --- | --- |
| `/` | landing — hero, «niyə belə», 3 addım, 17 tərkib kataloqu |
| `/qaris` | qarışdırıcı: tam ekran, sürüşmə yoxdur |
| `/sebet` | səbət: qarışıqlar, say, yekun |
| `/odenis` | çatdırılma formu və sifariş xülasəsi |
| `/hazir` | sifariş nömrəsi və qəbz |

Marşrutlaşdırma [lib/router.tsx](src/canvas-app/lib/router.tsx)-dədir — History
API üzərində qırx sətir, kitabxana yoxdur. Hər ünvanın öz URL-i var, geri düyməsi
işləyir, linki paylaşmaq olur; amma keçid səhifəni yenidən yükləmir, ona görə
canvas kəsilmir.

Serverdə `/api` və `/admin`-dən başqa bütün ünvanlar `index.html`-ə düşür, yəni
`/qaris` birbaşa açılanda da işləyir.

### Banka hara yerləşir

`GlassStage` bütün sayt üçün bir canvas yaradır və onu `fixed` saxlayır.
Səhifələr `useGlassAnchor('ad')` ilə boş bir `div` qeyd edir; banka ekranın
mərkəzinə ən yaxın lövbərə yerləşir.

- **Landing**-də yalnız bir lövbər var — hero. Aşağı sürüşdürdükdə banka hero
  ilə birlikdə təbii şəkildə yuxarı gedir və ekrandan çıxır.
- **/qaris**-də lövbər sabit paneldədir və heç vaxt tərpənmir.
- **/sebet**, **/odenis**, **/hazir**-də lövbər yoxdur: banka aşağı süzülüb
  çıxır, yalnız fon işığı qalır. Ekrandan çıxandan sonra ümumiyyətlə çəkilmir.

Lövbər *dəyişəndə* keçid yumşaqdır (yay), lövbər sadəcə *hərəkət edəndə* isə
banka ona demək olar ki, sərt bağlıdır — əks halda səhifə arxasında sürüşürmüş
kimi görünür.

### İki rejim

Qarışdırıcıda bankanın üstündə keçid var: **Quru qarışıq** və **Dəmlənmiş**.
Hər ikisi eyni bankadır, eyni tərkiblə.

**Quru** — qapaq bağlı, yığın dibdə. Bütün məntiq
[pile.ts](src/canvas-app/canvas/pile.ts)-dədir və iki xassə üzərində qurulub.

*Səviyyə çəkidən yox, həcmdən gəlir.* Hər tərkibin `bulk` dəyəri var (ml/qram):
bütöv nanə yarpağı əsasən havadır, mixək sıxdır. 100 q həmişə 100 qramdır, amma
tutduğu həcm tərkibə görə dəyişir — ona görə yığın 68% (sıx qarışıq) ilə 94%
(yarpaqlı) arasında hərəkət edir, orta qarışıq ~83%.

*Yerləşdirmə deterministikdir və tərkibdən asılı deyil.* Hər parçanın yeri yalnız
`hash(tərkib#nömrə)`-dən çıxır. Nəticə: səhifə yenilənəndə qarışıq eyni görünür,
və tərkib əlavə/silinəndə qalan parçalardan **heç biri yerini dəyişmir** — yalnız
səviyyə ilə birlikdə qalxır və ya çökür, yəni dəyişiklik «çoxalma/azalma» kimi
oxunur, qarışdırma kimi yox. Silinən tərkib olduğu yerdə söhbətsiz sönür.

Yayılma R3 aşağı-diskrepanslı ardıcıllıqla verilir: bir tərkibin parçaları
bankanın hər yerinə səpələnir, fərqli tərkiblər fərqli offsetdən başladığı üçün
lay yaratmadan qarışır. Hər tərkibə ən azı 8 parça, onlardan 3-ü məcburi ön
şüşəyə yaxın — az qramlı tərkib də tapıla bilir. Parçaların arxasında tünd bir
kütlə çəkilir; onsuz boşluqlar boş bankanın arxasını göstərir və dolu banka
seyrək səpələnmə kimi görünür.

Tərkibin üstünə gələndə onun parçaları parıldayır, qalanları sönükləşir.
«Yenidən tök» qapağı qaldırıb yarpaqları içəri yağdırır.

**Dəmlənmiş** — qapaq qalxıb yanda masaya qoyulur, yuxarıdan qaynar su tökülür,
yarpaqlar suda qalxıb yavaş konveksiya ilə fırlanır, rəng tədricən dərinləşir
(`steep` 0→1), şüşədə tər damlaları, boyundan buxar. Burada «Qarışdır» düyməsi
yarpaqları qarışdırır.

Geri keçəndə su boşalır, yarpaqlar yenidən yığına düşür, qapaq öz yerinə oturur.
Seçim `localStorage`-də saxlanır.

## Skriptlər

| əmr | nə edir |
| --- | --- |
| `npm run dev` | API və Vite-ı birlikdə işə salır (`scripts/dev.mjs`) |
| `npm run dev:web` | yalnız Vite |
| `npm run dev:api` | yalnız Express |
| `npm run build` | `tsc -b` + `vite build` → `dist/` |
| `npm start` | Express — `dist/` varsa saytı da o verir (:8787) |
| `npm run backup` | `orders.db`-nin bütöv nüsxəsini çıxarır |

Produksiya üçün: `npm run build && npm start`. Real hosta çıxarmaq üçün
[DEPLOY.md](DEPLOY.md) — Vercel (Turso ilə) və tək host (SQLite faylı ilə),
mühit dəyişənləri, ehtiyat nüsxə və deploydan əvvəl yoxlama siyahısı.

## Struktur

```
index.html            → src/canvas-app   sayt (tək səhifə, tək bundle)

src/shared/           səhifə və serverin paylaşdığı hissə
  data/catalog.json   TƏK MƏNBƏ: tərkiblər, qiymətlər, çatdırılma, şəhərlər
  lib/blend.ts        100 qramın bölünməsi, qarışıq rəngi
  lib/pricing.ts      qiymət, çatdırılma, yekun
  lib/commentary.ts   qarışığa uyğun cümlə
  lib/az.ts           Azərbaycan dili hal şəkilçiləri

src/canvas-app/
  canvas/jar.ts       banka profili + şüşə, taxta qapaq, etiket, masa
  canvas/pile.ts      quru yığın: həcm→səviyyə, deterministik yerləşdirmə, kütlə
  canvas/brew.ts      dəmlənmiş çay: maye, səth, tər, tökülən su
  canvas/paint.ts     ortaq çəkmə köməkçiləri (qradiyent keşi, rəng, profil)
  canvas/scene.ts     fon: işıq şüaları, toz, vinyet (yarım ölçülü buferdə)
  canvas/shapes.ts    hər tərkibin sprite-ı
  canvas/engine.ts    yığın/dəmləmə fizikası, rejim keçidi + render döngüsü
  canvas/glass.ts     ƏVVƏLKİ armudu stəkan — heç yerdən import olunmur,
                      geri qaytarmaq istəsən burada durur
  lib/router.tsx      marşrutlar
  lib/useCart.ts      səbət (localStorage)
  lib/useDraft.ts     hazırlanan qarışıq (localStorage) — yeniləmə itirmir
  components/GlassStage.tsx   sabit canvas + lövbər sistemi
  pages/              Landing, Mix, Cart, Pay, Done
  sections/           Hero, Story, Catalog, Footer (landing-in hissələri)

Dockerfile            tək host üçün, iki mərhələli (build + runtime)
vercel.json           Vercel üçün marşrutlar, başlıqlar, funksiya konfiqurasiyası
DEPLOY.md             deploy təlimatı — Vercel və tək host

server/
  app.js              Express tətbiqi: marşrutlar, CSP, təhlükəsizlik başlıqları
  index.js            portu tutur — lokal, Docker, VPS
  driver.js           baza sürücüsü: node:sqlite (fayl) və ya Turso (HTTP)
  db.js               sxem + sorğular, hamısı asinxron
  catalog.js          catalog.json-u oxuyur, qiyməti server tərəfdə hesablayır
  public/admin.html   sifariş paneli
  data/orders.db      SQLite faylı (ilk işə salışda özü yaranır)

api/index.js          Vercel giriş nöqtəsi — eyni tətbiqi funksiya kimi verir
scripts/backup.mjs    VACUUM INTO ilə bütöv ehtiyat nüsxə
```

## Qiymətlər

`src/shared/data/catalog.json` tək mənbədir: səhifə onu import edir, server
`readFileSync` ilə oxuyur. Bir tərkibin qiymətini dəyişmək üçün yalnız bu faylı
redaktə etmək kifayətdir.

Hesablama: `Σ (qram/100 × tərkib qiyməti) + qablaşdırma haqqı`, 10 qəpiyə
yuvarlaqlaşdırılır. Eyni düstur `src/shared/lib/pricing.ts` və `server/catalog.js`
fayllarında var — biri dəyişəndə o biri də dəyişməlidir; server müştərinin
göndərdiyi qiyməti heç vaxt qəbul etmir, yalnız öz hesabladığı ilə tutuşdurur və
fərq varsa 409 qaytarır.

## Admin

`http://localhost:8787/admin` — HTTP Basic. Susmaya görə `admin` / `admin`,
server hər başlayanda bu barədə xəbərdarlıq edir. Dəyişmək üçün `.env.example`-a
baxın.

Panel sifarişləri, tərkibləri və qiymətləri göstərir; statusu dəyişmək olur
(`yeni · təsdiqlənib · hazırlanır · göndərilib · ləğv`).

## API

| metod | ünvan | nə edir |
| --- | --- | --- |
| `GET` | `/api/health` | sağlamlıq + sifariş sayı |
| `GET` | `/api/catalog` | tərkiblər və qiymətlər |
| `POST` | `/api/orders` | sifariş yaradır, `{ nomre, cem, catdirilma, yekun }` qaytarır |
| `GET` | `/api/admin/orders` | sifariş siyahısı (Basic auth) |
| `PATCH` | `/api/admin/orders/:id` | status dəyişir (Basic auth) |

`POST /api/orders` yoxlayır: ad, telefon, şəhər (siyahıdan), ünvan; hər qarışıqda
tam bir baza çayı; təkrarlanan tərkib yox; say 1–99; ən çox 20 sətir. Qramlar və
qiymətlər serverdə yenidən hesablanır. Bir IP saatda `RATE_LIMIT` (susmaya görə
12) sifarişdən çox göndərə bilməz.

## Qeydlər

- `prefers-reduced-motion` aktivdirsə canvas-ın saatı dayanır: tökülmə,
  hissəciklər, ətir buxarı, parıltılar və CSS keçidləri sönür.
- Canvas dar ekranda, 4 nüvədən az prosessorda və ya çox böyük pəncərədə
  hissəcik sayını, buxarı və piksel sıxlığını özü azaldır.
- Səbət və hazırlanan qarışıq `localStorage`-də saxlanır; sifariş qəbzi isə
  `sessionStorage`-də, ona görə `/hazir` səhifəsi yeniləməyə davam gətirir.
- Dev serverin `npm audit` xəbərdarlıqları vite/esbuild-dəndir və yalnız
  inkişaf mühitinə aiddir; `npm audit --omit=dev` təmiz çıxır.
- React `devDependencies`-dədir: bundle-a düşür, amma serverin işləməsi üçün
  lazım deyil. Runtime asılılıqları yalnız express, compression və
  @libsql/client-dir.
- Baza qatı iki sürücülüdür: `TURSO_DATABASE_URL` varsa Turso (Vercel üçün),
  yoxsa `node:sqlite` ilə lokal fayl. SQL ikisində eynidir.
- `dist/` 293 KB-dır (JS 80 KB gzip). Bütün qrafika kodla çəkilir — saytda bir
  dənə də şəkil faylı yoxdur.
