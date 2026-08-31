# Deploy

Sayt iki hissədən ibarətdir: statik `dist/` və bir Express tətbiqi (`/api` +
`/admin`). Baza — SQLite dialekti.

İki qurulum var, kod ikisini də dəstəkləyir:

| | statik hissə | Express | baza |
| --- | --- | --- | --- |
| **Vercel** | edge CDN | bir serverless funksiya (`api/index.js`) | **Turso** (məcburi) |
| Tək host (Railway, Fly, VPS) | Express özü verir | uzun ömürlü proses | disk üzərində SQLite faylı |

Fərq yalnız mühit dəyişənlərindədir: `TURSO_DATABASE_URL` varsa Turso, yoxsa
lokal fayl — [server/driver.js](server/driver.js).

---

## 1 · Vercel

Vercel-də fayl sistemi müvəqqətidir: hər sorğu ayrı instansiyada işləyə bilər və
yazdığın fayl itir. Ona görə burada SQLite faylı **olmaz** — Turso lazımdır.
Turso SQLite dialektindədir, deməli SQL-in hamısı olduğu kimi qalır.

### 1.1 Turso bazası yarat — **region vacibdir**

Ən asan yol — brauzer: [turso.tech](https://turso.tech) → qeydiyyat → yeni
database → **URL** və **token**-i kopyala.

Bazanı **`eu-central-1` (Frankfurt)** regionunda yarat. Vercel funksiyası
`vercel.json`-da `fra1`-ə bağlanıb, yəni Frankfurtda işləyir; baza da orada olsa
aralarındakı gecikmə ~5 ms olur. Baza başqa qitədə olsa hər sorğu 200–300 ms
əlavə edir.

Ölçdüm: Tokio (`aws-ap-northeast-1`) bazası ilə bir sifariş yazmaq 1.3 saniyə
çəkir; Frankfurtda ~50 ms olacaq. Baza boş olduğu müddətdə region dəyişmək
sadəcə yeni database yaratmaq deməkdir — köçürüləsi məlumat yoxdur.

CLI istəyirsənsə (Windows-da WSL lazımdır):

```bash
curl -sSfL https://get.tur.so/install.sh | bash
turso auth signup
turso db create ozcayin
turso db show ozcayin --url        # libsql://ozcayin-<org>.turso.io
turso db tokens create ozcayin
```

Cədvəlləri əl ilə yaratmaq lazım deyil — server ilk sorğuda özü yaradır.

### 1.2 Vercel-ə qoş

Repo-nu Vercel-də import et. `vercel.json` build əmrini, çıxış qovluğunu və
marşrutları özü təyin edir — **Framework Preset**-i `Other` saxla.

**Environment Variables** (Production + Preview):

| dəyişən | dəyər |
| --- | --- |
| `TURSO_DATABASE_URL` | `libsql://…turso.io` |
| `TURSO_AUTH_TOKEN` | Turso-dan aldığın token |
| `ADMIN_PASS` | uzun, təsadüfi parol |
| `TRUST_PROXY` | `1` |

`NODE_ENV=production` Vercel özü qoyur, əlavə etmə. `PORT` də lazım deyil.

> **Diqqət:** `NODE_ENV=production` olduğuna görə `ADMIN_PASS` təyin
> edilməyibsə funksiya qəsdən çökür — hər sorğu 500 qaytarır. Bu səhv deyil,
> qorumadır. `ADMIN_PASS`-ı ilk deploydan **əvvəl** əlavə et.

Parol yaratmaq:

```bash
node -e "console.log(require('crypto').randomBytes(24).toString('base64url'))"
```

### 1.3 Deploydan sonra yoxla

```
https://<domen>/api/health        → {"ok":true,"sifaris":0}
https://<domen>/qaris             → qarışdırıcı açılmalıdır (SPA fallback)
https://<domen>/admin             → 401, parolla açılır
```

Sonra bir test sifarişi ver, admin panelində gör, `turso db shell` ilə sil.

### 1.4 Vercel-də bilməli olduğun şeylər

**Soyuq start.** Funksiya bir müddət istifadə olunmasa növbəti sorğu ~1 saniyə
gecikir. Statik səhifə buna bağlı deyil — yalnız sifariş göndərmək və admin
paneli.

**Ehtiyat nüsxə.** `npm run backup` lokal fayl üçündür, Turso-da işləməyəcək.
Turso-nun öz point-in-time restore-u var, amma öz nüsxəni də saxla:

```bash
turso db dump ozcayin > ozcayin-$(date +%F).sql
```

Bunu həftədə bir dəfə (öz kompüterində cron/Task Scheduler ilə) işə sal.

**`maxDuration` 15 saniyədir** (`vercel.json`). Sifariş yazmaq bir neçə yüz
millisaniyə çəkir; limit yalnız Turso cavab vermədikdə işə düşür.

**Rate limit işləyir** — sayğac bazadadır, prosesin yaddaşında deyil, ona görə
instansiyalar arasında bölünmür.

**Bir sifariş 2 sorğu edir.** Sifariş və onun bütün sətirləri tək atomik
`batch()` ilə yazılır ([server/db.js](server/db.js)) — rate-limit yoxlaması ilə
birlikdə cəmi iki gediş-gəliş. Açıq tranzaksiya sətir başına bir gediş-gəliş
tələb edərdi.

**Qiymətlər.** `catalog.json` funksiyaya `includeFiles` ilə daxil edilir. Qiyməti
dəyişəndə yeni deploy lazımdır — bazada saxlanmır.

---

## 2 · Tək host (Railway, Fly.io, VPS)

Bu qurulumda Turso lazım deyil: SQLite faylı **kalıcı diskdə** yaşayır.
`Dockerfile` hazırdır.

### Railway

1. Repo-nu bağla — Railway `Dockerfile`-ı özü tapır.
2. Variables: `NODE_ENV=production`, `ADMIN_PASS=…`, `DATA_DIR=/data`, `TRUST_PROXY=1`.
3. **Volume** əlavə et, mount yolu `/data`.
4. Deploy. Sağlamlıq: `/api/health`.

### Fly.io

```bash
fly launch --no-deploy
fly volumes create data --size 1 --region fra
fly secrets set ADMIN_PASS="…"
```

`fly.toml`:

```toml
[env]
  NODE_ENV = "production"
  DATA_DIR = "/data"
  TRUST_PROXY = "1"
  PORT = "8787"

[[mounts]]
  source = "data"
  destination = "/data"

[http_service]
  internal_port = 8787
  force_https = true
  auto_stop_machines = false     # SQLite yazan proses dayanmamalıdır

[[http_service.checks]]
  path = "/api/health"
```

Replikanı **1-də saxla** — iki maşın aynı volume-a yaza bilməz.

### VPS (Docker-siz)

```bash
git clone … /srv/ozcayin && cd /srv/ozcayin
npm ci && npm run build
sudo mkdir -p /var/lib/ozcayin && sudo chown $USER /var/lib/ozcayin
```

`/etc/systemd/system/ozcayin.service`:

```ini
[Unit]
Description=Öz çayın
After=network.target

[Service]
WorkingDirectory=/srv/ozcayin
ExecStart=/usr/bin/node server/index.js
Restart=always
Environment=NODE_ENV=production
Environment=PORT=8787
Environment=DATA_DIR=/var/lib/ozcayin
Environment=TRUST_PROXY=1
EnvironmentFile=/etc/ozcayin.env      # ADMIN_PASS burada

[Install]
WantedBy=multi-user.target
```

nginx qarşıda, `proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;`.
Node ≥ 22.5 lazımdır (`node:sqlite` üçün); 24 tövsiyə olunur.

### Ehtiyat nüsxə (lokal fayl)

```bash
DATA_DIR=/var/lib/ozcayin npm run backup
```

`VACUUM INTO` ilə server yazarkən də bütöv nüsxə çıxarır (adi `cp` WAL ilə
etibarlı deyil). Son 14 nüsxəni saxlayır — `BACKUP_KEEP`. Gündəlik cron:

```
17 3 * * * cd /srv/ozcayin && DATA_DIR=/var/lib/ozcayin npm run backup >> /var/log/ozcayin-backup.log 2>&1
```

Nüsxələri serverdən kənara da çıxar — disk itsə, onlar da itir.

Geri qaytarmaq: serveri dayandır, `orders-*.db`-ni `$DATA_DIR/orders.db` adı ilə
köçür, `-wal` və `-shm` fayllarını sil, başlat.

---

## 3 · Deploydan əvvəl yoxlama

- [ ] `ADMIN_PASS` təyin edilib (produksiyada bu olmadan server qəsdən çökür)
- [ ] Vercel: `TURSO_DATABASE_URL` + `TURSO_AUTH_TOKEN` var
- [ ] Tək host: `DATA_DIR` kalıcı diskə baxır
- [ ] `TRUST_PROXY` doğru rəqəmdir (bir load balancer = 1)
- [ ] `/api/health` 200 qaytarır
- [ ] `/admin` 401 verir, parolla açılır
- [ ] `/qaris` birbaşa açılanda işləyir
- [ ] Test sifarişi verilib, panelə düşüb, sonra silinib
- [ ] Ehtiyat nüsxə bir dəfə əl ilə işə salınıb
- [ ] Domen + TLS
- [ ] `index.html`-dəki `og:` meta və `robots.txt` real domenlə yenilənib

---

## 4 · Ümumi qeydlər

**`dist/` 293 KB-dır** — JS 80 KB gzip, CSS 8 KB. Saytda bir dənə də şəkil faylı
yoxdur, bütün qrafika canvas-da kodla çəkilir. CDN, şəkil optimizasiyası və ya
obyekt anbarı lazım deyil.

**Bir yazan.** SQLite də, Turso-nun bir bazası da bir yazana hesablanıb. Bu
ölçüdə problem deyil; ciddi miqyas lazım olsa Postgres-ə keç.

**`npm audit` 2 xəbərdarlıq verir** (vite, esbuild) — ikisi də yalnız inkişaf
serverinə aiddir, `dist/`-ə düşmür. `npm audit --omit=dev` təmiz çıxır. Düzəlişi
yalnız vite 8-ə keçid verir, o da breaking change-dir.

**`node:sqlite` eksperimental sayılır**, ona görə lokal işə salışda bir
`ExperimentalWarning` yazılır. Vercel-də bu modul heç yüklənmir.

**Qiymət düsturu iki yerdədir**: [pricing.ts](src/shared/lib/pricing.ts) və
[catalog.js](server/catalog.js). Birini dəyişəndə o birini də dəyiş — server
müştərinin göndərdiyi qiyməti qəbul etmir, öz hesabladığı ilə tutuşdurur və fərq
varsa 409 qaytarır. Yəni uyğunsuzluq sifarişləri dayandırar, səssiz keçməz.

**`vercel.json` sınaqdan keçirilməmişdir.** Turso sürücüsünü və bütün API-ni
lokal olaraq uçdan-uca yoxladım, amma Vercel-in özündə deploy etmədim (hesab
yoxdur). İlk deployda nə səhv gedə bilər: `rewrites` (`/qaris` 404 verər) və ya
`includeFiles` (funksiya `catalog.json`-u tapmaz → 500). İkisi də bir sətirlik
düzəlişdir; loglara bax, mənə de.
