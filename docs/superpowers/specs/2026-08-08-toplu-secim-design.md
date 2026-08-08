# Çoklu seçim ve toplu işlemler — tasarım

Tarih: 2026-08-08
Durum: Onaylandı (Faz A uygulanacak, Faz B ertelendi)

## Problem

Panelde hiçbir listede çoklu seçim yok. Sipariş ve ürün silme tek tek, her biri ayrı
`confirm()` ile yapılıyor. 30 eski siparişi temizlemek 30 ayrı tıklama + 30 onay demek.
Aynı şekilde birden fazla siparişi "Tamamlandı" yapmak veya bir grup siparişi tek dosyada
dışa aktarmak mümkün değil.

Backend de yalnızca tekil `DELETE /:id` ve `PATCH /:id` uçlarını sunuyor.

## Kapsam

**Faz A (bu spec'in uyguladığı iş):**

- `OrdersPage` — `/admin/sepet`, `/admin/toplu-siparisler` ve yönetici sipariş listesi
  aynı bileşeni kullandığı için üçü birden kazanır.
- `ProductsPage` — `/admin/stok/urunler` ve çalışan ürün ekranı.

**Faz B (ertelendi, karar alındı):** Ayarlar'daki "İzinli günler (bayram / resmi tatil)"
kartının takvim görünümüne çevrilmesi. Bkz. sondaki *Sonraki faz* bölümü.

Kapsam dışı: Giderler, Kategoriler, Çalışanlar, Loglar sayfaları.

## Mimari

Üç katman, her biri bağımsız test edilebilir:

```
UI katmanı        useBulkSelection (durum)  +  BulkActionBar (sunum)
                              │
API istemcisi     orders-api.ts / admin-api.ts / manager-api.ts  bulk fonksiyonları
                              │
Next proxy        /api/admin/*/bulk-*   ve   /api/yonetici/*/bulk-*
                              │
Backend           routes/admin{Orders,Products}.ts  →  services/{orders,products}
```

### 1. `lib/use-bulk-selection.ts` (yeni)

```ts
useBulkSelection<K extends string | number>(visibleKeys: K[]): {
  selectionMode: boolean;
  setSelectionMode(on: boolean): void;   // kapatınca seçimi temizler
  selected: ReadonlySet<K>;
  selectedKeys: K[];
  count: number;
  isSelected(key: K): boolean;
  toggle(key: K): void;
  toggleAll(): void;                     // görünen hepsi seçili ise temizler
  clear(): void;
  allVisibleSelected: boolean;
  someVisibleSelected: boolean;          // başlık checkbox'ının indeterminate hali
}
```

`visibleKeys` değiştiğinde (filtre, arama, sayfa) seçim **görünen kümeye budanır**.
Gerekçe: kullanıcının göremediği bir kaydın toplu silmeye dahil olması sürpriz ve geri
alınamaz. `ProductsPage` sunucu tarafında sayfaladığı için bu, sayfa değişiminde seçimin
sıfırlanması anlamına gelir — kabul edilen davranış.

Bağımlılığı yok, saf React state. Ayrı test edilebilir.

### 2. `components/admin/BulkActionBar.tsx` (yeni)

Liste altına yapışan (`position: sticky; bottom: 0`) çubuk. Props:

```ts
{ count: number; onClear(): void; busy?: boolean; children: ReactNode }
```

`children` sayfaya özel işlem butonlarıdır — çubuk hangi işlemlerin var olduğunu bilmez.
`count === 0` iken render edilmez.

### 3. Seçim arayüzü

- **Masaüstü tablo:** en sola checkbox sütunu. `<thead>`'de "hepsini seç" checkbox'ı
  (`indeterminate` desteğiyle). Satır checkbox'ı `onClick`'te `stopPropagation()` yapar ki
  satıra tıklamak eskisi gibi detayı açmaya devam etsin.
- **Mobil kartlar:** araç çubuğunda **"Seç"** düğmesi seçim modunu açar. Mod kapalıyken
  karta dokunmak detayı açar (bugünkü davranış), açıkken seçer. Kartın sol üstünde
  checkbox görünür.
- Checkbox görünümü `globals.css` içinde `.admin-checkbox` olarak tanımlanır; mevcut
  `admin-*` sınıf isimlendirmesine uyar.

### 4. OrdersPage toplu işlemleri

| İşlem | Davranış |
|---|---|
| Hazırlanıyor / Tamamlandı / İptal | `bulkUpdateOrderStatus(ids, status)`, dönen siparişler listeye merge edilir |
| PDF indir | Tek dosya, her sipariş bir sayfa |
| Excel indir | Tek çalışma sayfası, başa `Sipariş Kodu` sütunu |
| Sil | `bulkDeleteOrders(ids)` |

Silme ve İptal `confirm()` ile onaylanır; metin adet ve ilk birkaç sipariş kodunu içerir.
İşlem sırasında çubuk `busy` olur, checkbox'lar kilitlenir. Hata olursa mevcut
`admin-alert-error` şeridinde gösterilir ve seçim korunur (kullanıcı tekrar deneyebilsin).

**Dışa aktarma:** `lib/order-export.ts` içindeki `buildOrderExportData` her sipariş için
yeniden kullanılır. Yeni fonksiyonlar:
- `lib/pdf-order.ts` → `downloadOrdersPDF(orders: Order[])`
- `lib/excel-order.ts` → `downloadOrdersExcel(orders: Order[])`

Tekil `downloadOrderPDF` / `downloadOrderExcel` çağrıları değişmez; çoklu sürümler aynı
satır oluşturma mantığını döngüde kullanır.

### 5. ProductsPage toplu işlemleri

Yalnızca **Sil**. `products.delete` izni olmayan çalışanda seçim arayüzü hiç render
edilmez. Anahtar `stockCode`.

Silme sonrası `load()` çağrılır; sayfadaki tüm kayıtlar silindiyse ve `page > 1` ise bir
önceki sayfaya düşülür (tekil silmedeki mevcut mantıkla aynı).

### 6. Backend

**Servis katmanı** — mevcut `*-pg` / `*-sqlite` ikili yapısı korunur (siparişler
`services/orders.ts`, ürünler `services/db.ts` üzerinden dağıtılır):

```ts
// services/orders.ts  (+ orders-pg.ts, orders-sqlite.ts)
deleteOrders(ids: number[]): Promise<number>              // silinen adet
updateOrdersStatus(ids: number[], status: OrderStatus): Promise<Order[]>
// services/db.ts  (+ db-pg.ts, db-sqlite.ts)
deleteProducts(stockCodes: string[]): Promise<number>
```

- PG: `DELETE FROM orders WHERE id = ANY($1)` — tek sorgu, atomik.
- SQLite: `better-sqlite3` transaction içinde döngü.
- Var olmayan id'ler sessizce atlanır; yanıt gerçek etkilenen adedi döner. Gerekçe: kısmi
  başarısızlıkta tüm isteği reddetmek, listesi bayatlamış kullanıcıyı kilitler.

**Rotalar** (`POST` olduğu için mevcut `/:id` rotalarıyla çakışmaz):

| Uç | Gövde | Yanıt |
|---|---|---|
| `POST /api/admin/orders/bulk-delete` | `{ ids: number[] }` | `{ deleted: number }` |
| `POST /api/admin/orders/bulk-status` | `{ ids: number[], status }` | `{ orders: Order[] }` |
| `POST /api/admin/products/bulk-delete` | `{ stockCodes: string[] }` | `{ deleted: number }` |

Doğrulama: dizi olmalı, boş olmamalı, **en fazla 500 eleman**; aşılırsa `400`.
`bulk-status` için `status` mevcut dört değerden biri olmalı.

Ürün toplu silme, tekil rotadaki gibi `deleteImagesForStockCode` çağrısını da yapar.

**Audit:** işlem başına **tek** kayıt — `order.bulk_delete`, `order.bulk_status_update`,
`product.bulk_delete`. Mesaj adedi içerir, `metadata` etkilenen kimlikleri taşır.

**Next proxy katmanı:** her uç için `/api/admin/...` (admin cookie doğrulaması) ve
`/api/yonetici/...` (`requireEmployeePermission`) sürümleri. İzinler mevcut tekil
rotalarla aynı: siparişlerde `orders.view`, ürün silmede `products.delete`.

## Hata yönetimi

- Ağ/sunucu hatası: liste değişmez, hata şeridi gösterilir, seçim korunur.
- Kısmi silme (bazı id'ler bulunamadı): işlem başarılı sayılır, liste yeniden yüklenir.
- 500 sınırı aşımı: istemci zaten seçimi sınırlar; sunucu yine de doğrular.

## Test

- `useBulkSelection`: toggle, toggleAll, görünen küme değişince budama.
- Backend servisleri: hem PG hem SQLite için toplu silme/durum güncelleme, boş dizi,
  var olmayan id, 500 sınırı.
- Rotalar: yetkisiz istek 401, geçersiz gövde 400, başarılı istekte tek audit kaydı.

## Sonraki faz (B) — İzinli günler takvimi

Karar alındı, bu spec'te uygulanmıyor:

`SettingsPage`'teki "İzinli günler (bayram / resmi tatil)" kartındaki tarih-input formu
yeni `components/admin/ClosedDaysCalendar.tsx` ile değişir. Ay bazlı takvim, mevcut
`attendance-cal` görsel diliyle uyumlu. Takvim üstünde **Tam gün / Yarım gün** kalem
seçici; bir güne dokunmak o günü seçili kalemle **anında** izinli yapar, izinli güne
tekrar dokunmak kaldırır. Backend'deki `addClosedDay` aynı tarihi zaten üzerine yazdığı
için yeni endpoint gerekmez. Haftalık otomatik izin günleri soluk ve tıklanamaz gösterilir.
Not girme, takvimin altında kalan mevcut liste üzerinden yapılır; bu liste Faz A'daki
çoklu seçimi kullanarak toplu kaldırmayı da destekler.
