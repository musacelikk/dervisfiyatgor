# Akınsoft Fiyat Gör

Barkod okutarak veya manuel arama ile ürün fiyatını gösteren mobil odaklı uygulama. Excel kataloğu admin panelinden yüklenir.

## Mimari

```
frontend/   → Next.js (mağaza + admin arayüzü)
backend/    → Express + SQLite + xlsx
```

## Yerel kurulum

### Backend

```bash
cd backend
cp .env.example .env
npm install
npm run dev
```

API: `http://localhost:4000`

### Frontend

```bash
cd frontend
cp .env.local.example .env.local
npm install
npm run dev
```

- Mağaza: http://localhost:3000  
- Admin: http://localhost:3000/admin/login  

`ADMIN_SECRET` değeri **frontend** ve **backend** `.env` dosyalarında **aynı** olmalıdır.

## API

| Method | Endpoint | Açıklama |
|--------|----------|----------|
| GET | `/api/health` | Sağlık + ürün sayısı |
| GET | `/api/products/search?by=&q=` | Arama (`by`: barcode, stockCode, name, group) |
| POST | `/api/import?replace=true` | Excel yükle (`file`, header: `X-Admin-Key`) |

## Excel kolonları

| Excel | Alan |
|-------|------|
| Stok Kodu | Birincil anahtar |
| Stok Adı | Ürün adı |
| Birimi | Birim |
| Barkodu | Barkod (benzersiz) |
| Satış Fiyatı 1 / 2 | Satış fiyatları |
| Alış Fiyatı 1 / 2 | Alış fiyatları |
| Grubu | Grup |

---

## Yayına alma — sizin yapmanız gerekenler

### 1. Güçlü admin şifresi

`.env` içindeki `ADMIN_SECRET=1` gibi zayıf değerleri **mutlaka değiştirin** (uzun, rastgele).

### 2. Ortam değişkenleri

**Backend** (`backend/.env`):

```env
PORT=4000
CORS_ORIGIN=https://siteniz.com
ADMIN_SECRET=guclu-sifreniz
```

`CORS_ORIGIN`: Mağaza arayüzünün açıldığı tam adres (birden fazlaysa virgülle: `https://a.com,https://b.com`).

**Frontend** (hosting panelinde, örn. Vercel):

```env
NEXT_PUBLIC_API_URL=https://api.siteniz.com
ADMIN_SECRET=guclu-sifreniz
```

`ADMIN_SECRET` backend ile **birebir aynı** olmalı.

### 3. HTTPS (zorunlu — telefon kamerası)

Barkod tarama mobilde yalnızca **HTTPS** (veya localhost) üzerinde çalışır. Frontend ve API için SSL sertifikası kullanın.

### 4. Backend sunucusu

- Node.js 20+ kurulu bir VPS veya PaaS (Railway, Render, Fly.io vb.)
- `cd backend && npm install && npm run build && npm start`
- `backend/data/` klasörü **kalıcı** olmalı (SQLite dosyası burada; sunucu yenilenince silinmemeli)
- `better-sqlite3` native modül — sunucuda `npm install` build ortamında çalışmalı

### 5. Frontend yayını

- Vercel, Netlify veya kendi sunucunuzda `cd frontend && npm run build && npm start`
- `NEXT_PUBLIC_API_URL` build zamanında okunur; değişince yeniden deploy edin

### 6. İlk veri yüklemesi

1. Telefondan veya bilgisayardan `https://siteniz.com/admin/login` açın  
2. Excel dosyasını yükleyin  
3. Mağaza sayfasında barkod okutmayı test edin  

### 7. Telefon kullanımı

- Ana ekranı tarayıcıda açın → “Ana Ekrana Ekle” (iOS/Android) ile kısayol oluşturabilirsiniz  
- Kamera iznini tarayıcıya verin  
- İyi aydınlatma ve barkodu yeşil çerçeveye hizalayın  

### 8. Kontrol listesi

- [ ] `ADMIN_SECRET` güçlü ve iki tarafta aynı  
- [ ] `NEXT_PUBLIC_API_URL` canlı API adresi  
- [ ] `CORS_ORIGIN` canlı site adresi  
- [ ] HTTPS aktif  
- [ ] SQLite `data/` klasörü yedekleniyor  
- [ ] Excel import test edildi  
- [ ] Telefonda barkod + fiyat sorgusu test edildi  

---

## Geliştirme komutları

```bash
# Backend
cd backend && npm run dev

# Frontend (ayrı terminal)
cd frontend && npm run dev
```
