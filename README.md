# DervişMobil Fiyat Gör

Barkod okutarak veya manuel arama ile ürün fiyatını gösteren mobil odaklı uygulama. Excel kataloğu admin panelinden yüklenir.

## Mimari

```
frontend/   → Next.js (mağaza, yönetici, admin)
backend/    → Express + SQLite + xlsx
samples/    → Örnek Excel dosyası (geliştirme)
```

## Yerel kurulum

### 1. Backend

```bash
cd backend
cp .env.example .env
npm install
npm run dev
```

API: http://localhost:4000

### 2. Frontend (ayrı terminal)

```bash
cd frontend
cp .env.local.example .env.local
npm install
npm run dev
```

| Arayüz | Adres |
|--------|--------|
| Mağaza | http://localhost:3000 |
| Çalışan paneli | http://localhost:3000/yonetici/login |
| Admin (ana panel) | http://localhost:3000/admin/login |

### Ortam değişkenleri

**Backend** (`backend/.env`):

| Değişken | Açıklama |
|----------|----------|
| `PORT` | API portu (varsayılan 4000) |
| `CORS_ORIGIN` | Frontend adresi |
| `ADMIN_SECRET` | Excel import ve admin API anahtarı |

**Frontend** (`frontend/.env.local`):

| Değişken | Açıklama |
|----------|----------|
| `NEXT_PUBLIC_API_URL` | Backend adresi |
| `ADMIN_SECRET` | Admin girişi — backend ile **aynı** olmalı |

Çalışan girişleri admin panelinden oluşturulur (`/admin/calisanlar`); ortak şifre yoktur.

`.env` dosyalarını oluşturduktan veya değiştirdikten sonra ilgili sunucuyu **yeniden başlatın**.

## API

| Method | Endpoint | Açıklama |
|--------|----------|----------|
| GET | `/api/health` | Sağlık + ürün sayısı |
| GET | `/api/products/search?by=&q=` | Arama (`by`: barcode, stockCode, name, group) |
| POST | `/api/import?replace=true` | Excel yükle (`file`, header: `X-Admin-Key`) |
| GET/POST/PATCH/DELETE | `/api/employees` | Çalışan hesapları (admin) |
| POST | `/api/auth/employee/login` | Çalışan girişi |

## Excel kolonları

| Excel | Alan |
|-------|------|
| Stok Kodu | Birincil anahtar |
| Stok Adı | Ürün adı |
| Birimi | Birim |
| Barkodu | Barkod |
| Satış Fiyatı 1 / 2 | Satış fiyatları |
| Alış Fiyatı 1 / 2 | Alış fiyatları |
| Kalan Miktar | Stok |
| Açıklama 1 / 2 | Açıklamalar |
| Grubu | Grup |

Örnek dosya: `samples/test-urunler.xlsx`

## Geliştirme

```bash
# Backend
cd backend && npm run dev

# Frontend
cd frontend && npm run dev
```

## Yayına alma

### Güvenlik

- `ADMIN_SECRET` ve `MANAGER_SECRET` için güçlü, rastgele değerler kullanın.
- Canlıda `ADMIN_SECRET=1` gibi zayıf değerler kullanmayın.

### Backend

```env
PORT=4000
CORS_ORIGIN=https://siteniz.com
ADMIN_SECRET=guclu-sifreniz
```

- `backend/data/` kalıcı olmalı (SQLite).
- Node.js 20+, `npm run build && npm start`

### Frontend

```env
NEXT_PUBLIC_API_URL=https://api.siteniz.com
ADMIN_SECRET=guclu-sifreniz
MANAGER_SECRET=yonetici-sifreniz
```

- HTTPS zorunlu (mobil barkod kamerası).
- `NEXT_PUBLIC_API_URL` değişince yeniden deploy edin.

### Vercel (monorepo)

`vercel.json` frontend’i `/`, backend’i `/_/backend` altında yayınlar.

### Kontrol listesi

- [ ] `ADMIN_SECRET` güçlü; frontend ve backend aynı
- [ ] `NEXT_PUBLIC_API_URL` ve `CORS_ORIGIN` doğru
- [ ] HTTPS aktif
- [ ] SQLite yedekleniyor
- [ ] Excel import ve telefon barkod testi yapıldı
