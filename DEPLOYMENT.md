# Canlı ortam: GoDaddy + Vercel + Railway

## Mimari

| Subdomain | Amaç | Platform |
|-----------|------|----------|
| `fiyatgor.dervisplastik.com` | Müşteri mağaza (fiyat gör) | Vercel (frontend) |
| `admin.dervisplastik.com` | Admin paneli | Vercel (frontend) |
| `personel.dervisplastik.com` | Çalışan paneli | Vercel (frontend) |
| `satis.dervisplastik.com` | Ürün kataloğu (resimli) | Vercel (frontend) |
| `giris.dervisplastik.com` | Personel mesai girişi (konum doğrulamalı) | Vercel (frontend) |
| `dervisplastik.up.railway.app` | Backend API | Railway (public URL) |

Beş frontend subdomain'i **aynı Vercel projesine** bağlanır. Her subdomain yalnızca kendi bölümünü açar:

| Subdomain | Davranış |
|-----------|----------|
| `fiyatgor.*` | Yalnızca mağaza (`/`). `/admin`, `/yonetici`, `/satis`, `/giris` engellenir. |
| `admin.*` | Yalnızca `/admin/*` (admin-nav menüsü). Giriş sonrası `/admin` anasayfa. |
| `personel.*` | Yalnızca `/yonetici/*` (employee-nav menüsü). Giriş sonrası yetkiye göre ilk sayfa. |
| `satis.*` | Yalnızca `/satis` ürün kataloğu. |
| `giris.*` | Yalnızca `/giris` mesai ekranı. Tek buton: **Mesaiye Başla**. |

---

## 1. Railway (Backend API)

### Deploy

1. [railway.app](https://railway.app) → New Project → Deploy from GitHub repo
2. **Root Directory:** `backend`
3. **Start Command:** `npm run build && npm start` (veya `npm start` build aşaması ayrıysa)

### PostgreSQL

1. Projeye **PostgreSQL** eklentisi ekleyin
2. `DATABASE_URL` otomatik oluşur — backend servisinin **Variables** bölümüne referans olarak ekleyin

### Ortam değişkenleri (Railway → backend servisi → Variables)

```env
PORT=4000
ADMIN_SECRET=guclu-rastgele-sifre
DATABASE_URL=postgresql://...   # PostgreSQL eklentisinden
CORS_ORIGIN=https://fiyatgor.dervisplastik.com,https://admin.dervisplastik.com,https://personel.dervisplastik.com,https://satis.dervisplastik.com,https://giris.dervisplastik.com

# Tigris (S3 uyumlu) — ürün resimleri, presigned upload
S3_ENDPOINT=https://t3.storageapi.dev
S3_REGION=auto
S3_BUCKET=foldable-basketcase-tru32x
S3_ACCESS_KEY_ID=...
S3_SECRET_ACCESS_KEY=...
S3_PUBLIC_BASE_URL=https://t3.storageapi.dev/foldable-basketcase-tru32x
S3_PUBLIC_READ=false

# Mesai / yoklama — dükkan konumu ve kurallar
SHOP_LAT=37.1591
SHOP_LNG=38.7969
SHOP_RADIUS_M=150
ATTENDANCE_HALF_DAY_AFTER=11:00
MAGHRIB_OFFSET_MIN=7
```

> Yerel geliştirme için `http://localhost:3000` CORS'a eklenmeli; canlı Railway'de gerekmez.
> S3 anahtarlarını **yalnızca Railway**'e koyun; Vercel'e veya git'e koymayın.
>
> **Resim görüntüleme:** Bucket private ise (varsayılan) backend, resimleri 12 saatlik
> presigned GET URL'leriyle servis eder — ek ayar gerekmez. Bucket'ı dashboard'dan
> herkese açık okunur yaparsanız `S3_PUBLIC_READ=true` verin; sabit URL'ler kullanılır
> ve tarayıcı cache'i daha verimli çalışır.

### Public URL

1. Railway → backend servisi → **Settings** → **Networking**
2. **Generate Domain** / **Public Networking** açık olsun
3. Adres örneği: `https://dervisplastik.up.railway.app` (sizinki farklı olabilir; Vercel'de aynısını kullanın)

---

## 2. Vercel (Frontend)

### Deploy

1. [vercel.com](https://vercel.com) → Import GitHub repo
2. **Root Directory:** `frontend`
3. Framework: Next.js (otomatik algılanır)

### Ortam değişkenleri (Vercel → Project → Settings → Environment Variables)

Production için:

```env
NEXT_PUBLIC_API_URL=https://dervisplastik.up.railway.app
NEXT_PUBLIC_STORE_HOST=fiyatgor.dervisplastik.com
NEXT_PUBLIC_ADMIN_HOST=admin.dervisplastik.com
NEXT_PUBLIC_EMPLOYEE_HOST=personel.dervisplastik.com
NEXT_PUBLIC_SALES_HOST=satis.dervisplastik.com
NEXT_PUBLIC_SHIFT_HOST=giris.dervisplastik.com
```

> `ADMIN_SECRET` ve `S3_*` **Vercel'e konmaz** — yalnızca Railway backend'de.

### Custom domain'ler (5 adet)

Vercel → Project → **Settings** → **Domains** → her birini ekleyin:

- `fiyatgor.dervisplastik.com`
- `admin.dervisplastik.com`
- `personel.dervisplastik.com`
- `satis.dervisplastik.com`
- `giris.dervisplastik.com`

Her domain için Vercel bir **CNAME kaydı** ister (genelde `cname.vercel-dns.com` veya proje bazlı özel değer).

---

## 3. GoDaddy DNS

GoDaddy → **dervisplastik.com** → **DNS Yönetimi** → **Kayıt Ekle**

### Frontend (Vercel) — 5 kayıt

| Tip | Ad (Host) | Değer (Points to) | TTL |
|-----|-----------|-------------------|-----|
| CNAME | `fiyatgor` | Vercel'in verdiği CNAME | 600 |
| CNAME | `admin` | Vercel'in verdiği CNAME | 600 |
| CNAME | `personel` | Vercel'in verdiği CNAME | 600 |
| CNAME | `satis` | Vercel'in verdiği CNAME | 600 |
| CNAME | `giris` | Vercel'in verdiği CNAME | 600 |

> Beş subdomain aynı Vercel projesine gider; Vercel hangi domain'den geldiğini `Host` header'ından bilir.

Backend için GoDaddy'de **DNS kaydı eklemezsiniz** — API doğrudan `https://dervisplastik.up.railway.app` üzerinden çalışır.

### Notlar

- **A kaydı kullanmayın** subdomain'ler için; CNAME yeterli.
- DNS yayılımı 5 dakika – 48 saat sürebilir; genelde 15–30 dk.
- SSL sertifikaları Vercel ve Railway tarafından otomatik üretilir (HTTPS zorunlu).

---

## 4. Doğrulama checklist

- [ ] `https://dervisplastik.up.railway.app/api/health` JSON döndürüyor
- [ ] `https://fiyatgor.dervisplastik.com` mağaza açılıyor
- [ ] `https://admin.dervisplastik.com` → `/admin` paneline yönleniyor
- [ ] `https://personel.dervisplastik.com` → `/yonetici` paneline yönleniyor
- [ ] Admin girişi çalışıyor (şifre: Railway `ADMIN_SECRET`)
- [ ] Çalışan girişi çalışıyor (DB'deki hesap)
- [ ] Barkod / arama mağazada çalışıyor (HTTPS gerekli)
- [ ] `https://giris.dervisplastik.com` mesai ekranı açılıyor
- [ ] Dükkanda mesai başlatma çalışıyor, dükkan dışında reddediliyor
- [ ] Admin → Yoklama sayfasında bugünün kaydı görünüyor

---

## 5. Sık sorunlar

### CORS hatası (tarayıcı konsolu)

Railway `CORS_ORIGIN` içinde **tam HTTPS URL** olmalı, sonunda `/` olmamalı:

```
https://fiyatgor.dervisplastik.com,https://admin.dervisplastik.com,https://personel.dervisplastik.com
```

Değiştirdikten sonra Railway servisini redeploy edin.

### Admin / personel girişi "Backend'e bağlanılamadı"

Vercel'de `NEXT_PUBLIC_API_URL=https://dervisplastik.up.railway.app` doğru mu? (Railway Networking'teki URL ile birebir aynı olmalı.) Değiştirince **frontend redeploy** gerekir.

### Domain Vercel'de "Invalid Configuration"

GoDaddy'deki CNAME değerinin Vercel'in gösterdiği ile birebir aynı olduğundan emin olun. `@` (kök domain) yerine subdomain adını (`admin`, `fiyatgor`…) kullanın.

### Oturum / cookie sorunu

Admin, personel ve mağaza **ayrı subdomain**'lerde; oturum çerezleri birbirine karışmaz (istenen davranış). Her panel kendi subdomain'inde giriş yapılır.

---

## 6. Yerel geliştirme

Yerelde subdomain zorunlu değil:

```bash
# Terminal 1
cd backend && npm run dev

# Terminal 2
cd frontend && npm run dev
```

- Mağaza: http://localhost:3000
- Admin: http://localhost:3000/admin/login
- Personel: http://localhost:3000/yonetici/login
- Mesai girişi: http://localhost:3000/giris

`NEXT_PUBLIC_*_HOST` değişkenlerini yerelde **tanımlamayın**.


---

## 7. Mesai / yoklama sistemi

### Akış

1. Personel `giris.dervisplastik.com` adresini telefonunda açar.
2. **İlk açılışta** 4 haneli mesai ID'sini (veya kullanıcı adı + şifresini) girer.
3. Cihazda **30 günlük token** saklanır — sonraki açılışlarda doğrudan
   "Hoş geldin *Ahmet Bey*" ekranı ve **Mesaiye Başla** butonu görünür.
4. Butona basınca tarayıcı **konum izni** ister; konum dükkana `SHOP_RADIUS_M`
   metreden yakınsa giriş kaydedilir, uzaksa reddedilir (evden okutma engellenir).
5. Çıkışlar her gün **Şanlıurfa akşam ezanında** otomatik yapılır; personelin
   çıkış işlemi yapması gerekmez. Vakitler Diyanet'in resmi yıllık tablosundan
   okunur (`backend/src/data/prayer-times-<yıl>.json`).

### Yoklama kuralları

| Durum | Kural |
|-------|-------|
| **Tam Gün** | `ATTENDANCE_HALF_DAY_AFTER` (varsayılan 11:00) saatine kadar giriş |
| **Yarım Gün** | Bu saatten sonra yapılan giriş |
| **Gelmedi** | O gün hiç giriş yapılmamış |

### Admin → Yoklama sayfası

- **Bugünün kartları:** giriş yapan / gelmeyen / tam gün / yarım gün / konum dışı deneme
- **Filtreler:** bugün, bu hafta, bu ay, özel tarih aralığı; personel ve durum
- **Rapor:** seçili aralık için toplam ve personel bazlı tam/yarım/gelmedi dağılımı
- **Düzenleme:** giriş saatini değiştirme, Tam ↔ Yarım Gün, Gelmedi → Tam/Yarım Gün,
  kaydı silme, açıklama ekleme

> Dükkan koordinatını Google Maps'te dükkana sağ tıklayıp kopyalayın ve Railway'de
> `SHOP_LAT` / `SHOP_LNG` olarak girin. GPS sapması nedeniyle `SHOP_RADIUS_M` için
> 100–200 m önerilir; çok küçük değer dükkandaki personeli de reddedebilir.

### Akşam ezanı vakitleri (yıllık güncelleme)

Otomatik çıkış saatleri **Diyanet İşleri Başkanlığı**'nın resmi Şanlıurfa tablosundan
gelir. Repoda `2026` yılı hazırdır. Her yıl sonunda bir sonraki yılı eklemek gerekir:

1. [namazvakitleri.diyanet.gov.tr](https://namazvakitleri.diyanet.gov.tr/tr-TR/9224/sanliurfa-icin-namaz-vakti)
   → **Yıllık Namaz Vakti** listesini PDF olarak kaydedin.
2. Tabloyu üretin:
   ```bash
   node scripts/parse-prayer-times.mjs ~/Downloads/urfa-2027.pdf 2027
   ```
   Script gün sayısını (365/366), yılı ve saatlerin mantıklı aralıkta olduğunu
   doğrular; hata varsa dosya yazılmaz.
3. `backend/src/lib/prayerTimes.ts` içine yeni yılın import'unu ekleyin:
   ```ts
   import prayerTimes2027 from "../data/prayer-times-2027.json";

   const PRAYER_TABLES: Record<number, PrayerTable> = {
     2026: prayerTimes2026 as PrayerTable,
     2027: prayerTimes2027 as PrayerTable,
   };
   ```
4. Commit + Railway deploy.

> Tablosu olmayan bir yıla girilirse sistem durmaz: gün batımı formülüyle yaklaşık
> hesaba düşer (±1-2 dk). Yine de her yıl resmi tabloyu eklemek en doğrusudur.
