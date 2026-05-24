# Canlı ortam: GoDaddy + Vercel + Railway

## Mimari

| Subdomain | Amaç | Platform |
|-----------|------|----------|
| `fiyatgor.dervisplastik.com` | Müşteri mağaza | Vercel (frontend) |
| `admin.dervisplastik.com` | Admin paneli | Vercel (frontend) |
| `personel.dervisplastik.com` | Çalışan paneli | Vercel (frontend) |
| `api.dervisplastik.com` | Backend API | Railway |

Üç frontend subdomain'i **aynı Vercel projesine** bağlanır. Middleware, gelen host'a göre doğru bölüme yönlendirir.

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
CORS_ORIGIN=https://fiyatgor.dervisplastik.com,https://admin.dervisplastik.com,https://personel.dervisplastik.com
```

> Yerel geliştirme için `http://localhost:3000` CORS'a eklenmeli; canlı Railway'de gerekmez.

### Custom domain (api.dervisplastik.com)

1. Railway → backend servisi → **Settings** → **Networking** → **Custom Domain**
2. `api.dervisplastik.com` yazın
3. Railway size bir **CNAME hedefi** verir (ör. `xxxx.up.railway.app`)

---

## 2. Vercel (Frontend)

### Deploy

1. [vercel.com](https://vercel.com) → Import GitHub repo
2. **Root Directory:** `frontend`
3. Framework: Next.js (otomatik algılanır)

### Ortam değişkenleri (Vercel → Project → Settings → Environment Variables)

Production için:

```env
NEXT_PUBLIC_API_URL=https://api.dervisplastik.com
NEXT_PUBLIC_STORE_HOST=fiyatgor.dervisplastik.com
NEXT_PUBLIC_ADMIN_HOST=admin.dervisplastik.com
NEXT_PUBLIC_EMPLOYEE_HOST=personel.dervisplastik.com
```

> `ADMIN_SECRET` **Vercel'e konmaz** — yalnızca Railway backend'de.

### Custom domain'ler (3 adet)

Vercel → Project → **Settings** → **Domains** → her birini ekleyin:

- `fiyatgor.dervisplastik.com`
- `admin.dervisplastik.com`
- `personel.dervisplastik.com`

Her domain için Vercel bir **CNAME kaydı** ister (genelde `cname.vercel-dns.com` veya proje bazlı özel değer).

---

## 3. GoDaddy DNS

GoDaddy → **dervisplastik.com** → **DNS Yönetimi** → **Kayıt Ekle**

### Frontend (Vercel) — 3 kayıt

| Tip | Ad (Host) | Değer (Points to) | TTL |
|-----|-----------|-------------------|-----|
| CNAME | `fiyatgor` | Vercel'in verdiği CNAME | 600 |
| CNAME | `admin` | Vercel'in verdiği CNAME | 600 |
| CNAME | `personel` | Vercel'in verdiği CNAME | 600 |

> Üç subdomain aynı Vercel projesine gider; Vercel hangi domain'den geldiğini `Host` header'ından bilir.

### Backend (Railway) — 1 kayıt

| Tip | Ad (Host) | Değer (Points to) | TTL |
|-----|-----------|-------------------|-----|
| CNAME | `api` | Railway'in verdiği CNAME (ör. `xxxx.up.railway.app`) | 600 |

### Notlar

- **A kaydı kullanmayın** subdomain'ler için; CNAME yeterli.
- DNS yayılımı 5 dakika – 48 saat sürebilir; genelde 15–30 dk.
- SSL sertifikaları Vercel ve Railway tarafından otomatik üretilir (HTTPS zorunlu).

---

## 4. Doğrulama checklist

- [ ] `https://api.dervisplastik.com/api/health` JSON döndürüyor
- [ ] `https://fiyatgor.dervisplastik.com` mağaza açılıyor
- [ ] `https://admin.dervisplastik.com` → `/admin` paneline yönleniyor
- [ ] `https://personel.dervisplastik.com` → `/yonetici` paneline yönleniyor
- [ ] Admin girişi çalışıyor (şifre: Railway `ADMIN_SECRET`)
- [ ] Çalışan girişi çalışıyor (DB'deki hesap)
- [ ] Barkod / arama mağazada çalışıyor (HTTPS gerekli)

---

## 5. Sık sorunlar

### CORS hatası (tarayıcı konsolu)

Railway `CORS_ORIGIN` içinde **tam HTTPS URL** olmalı, sonunda `/` olmamalı:

```
https://fiyatgor.dervisplastik.com,https://admin.dervisplastik.com,https://personel.dervisplastik.com
```

Değiştirdikten sonra Railway servisini redeploy edin.

### Admin / personel girişi "Backend'e bağlanılamadı"

Vercel'de `NEXT_PUBLIC_API_URL=https://api.dervisplastik.com` doğru mu? Değiştirince **frontend redeploy** gerekir.

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

`NEXT_PUBLIC_*_HOST` değişkenlerini yerelde **tanımlamayın**.
