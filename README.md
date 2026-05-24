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
| `CORS_ORIGIN` | Frontend origin'leri (virgülle ayırın) |
| `ADMIN_SECRET` | Admin panel şifresi (yalnızca backend) |

**Frontend** (`frontend/.env.local`):

| Değişken | Açıklama |
|----------|----------|
| `NEXT_PUBLIC_API_URL` | Backend adresi |
| `NEXT_PUBLIC_STORE_HOST` | Mağaza subdomain (canlı) |
| `NEXT_PUBLIC_ADMIN_HOST` | Admin subdomain (canlı) |
| `NEXT_PUBLIC_EMPLOYEE_HOST` | Personel subdomain (canlı) |

Canlı subdomain yapısı ve GoDaddy / Vercel / Railway adımları: **[DEPLOYMENT.md](./DEPLOYMENT.md)**

Admin şifresi yalnızca `backend/.env` içindeki `ADMIN_SECRET` ile kontrol edilir. Çalışan girişleri veritabanındaki hesaplarla doğrulanır.

`.env` dosyalarını oluşturduktan veya değiştirdikten sonra ilgili sunucuyu **yeniden başlatın**.

## API

| Method | Endpoint | Açıklama |
|--------|----------|----------|
| GET | `/api/health` | Sağlık + ürün sayısı |
| GET | `/api/products/search?by=&q=` | Arama (`by`: barcode, stockCode, name, group) |
| POST | `/api/import?replace=true` | Excel yükle (admin/personel oturumu) |
| GET/POST/PATCH/DELETE | `/api/employees` | Çalışan hesapları (admin) |
| POST | `/api/auth/admin/login` | Admin girişi |
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

- `ADMIN_SECRET` için güçlü, rastgele bir değer kullanın.
- Canlıda `ADMIN_SECRET=1` gibi zayıf değerler kullanmayın.

### Backend (Railway)

```env
PORT=4000
CORS_ORIGIN=https://fiyatgor.dervisplastik.com,https://admin.dervisplastik.com,https://personel.dervisplastik.com
ADMIN_SECRET=guclu-sifreniz
DATABASE_URL=postgresql://...
```

### Frontend (Vercel)

```env
NEXT_PUBLIC_API_URL=https://api.dervisplastik.com
NEXT_PUBLIC_STORE_HOST=fiyatgor.dervisplastik.com
NEXT_PUBLIC_ADMIN_HOST=admin.dervisplastik.com
NEXT_PUBLIC_EMPLOYEE_HOST=personel.dervisplastik.com
```

Detaylı DNS ve domain bağlama: **[DEPLOYMENT.md](./DEPLOYMENT.md)**

### Kontrol listesi

- [ ] `ADMIN_SECRET` güçlü (yalnızca backend)
- [ ] `NEXT_PUBLIC_API_URL` ve `CORS_ORIGIN` doğru
- [ ] HTTPS aktif
- [ ] SQLite yedekleniyor
- [ ] Excel import ve telefon barkod testi yapıldı
