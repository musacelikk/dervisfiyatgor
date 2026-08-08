# Yoklama ekranı düzeltmeleri ve mazeret — tasarım

Tarih: 2026-08-08
Durum: Onaylandı

## Problem

`/admin/yoklama` ekranında dört ayrı sorun var:

1. **İstatistik kartları.** 7 kart, `lg`'de 5 sütunlu ızgaraya diziliyor
   ([globals.css:6828](../../../frontend/src/app/globals.css)) — son kart tek başına
   ikinci satıra düşüyor. "İzinli" kartı koşullu olduğu için kart sayısı 6 ile 7 arasında
   değişiyor, yani kırılma noktası da kayıyor.
2. **Filtreler.** "Tarih seç" seçilince ızgaraya iki alan sonradan ekleniyor
   (4 sütunlu grid → 6 eleman), diğer alanların yeri zıplıyor.
3. **Rapor bölümü.** Başlıkta uzun bir "cutoff" cümlesi, altında rozet yığını, altında
   serbest metin satırlar (`1 tam · 0 yarım · 0 gelmedi`). Okunması zor, karşılaştırma
   yapılamıyor, sayfada çok yer kaplıyor.
4. **Takvimde düzenleme yok.** Personel detay modalındaki takvimde bir güne tıklayınca
   salt okunur bir kart açılıyor. Geç gelme/gelmeme durumu düzeltilemiyor, mazeret
   ("hasta oldu") girilemiyor.

### Mazeret için veri modeli kısıtı

`shift_entries.check_in_at` **NOT NULL** ve tabloda kayıt yalnızca giriş yapıldığında (veya
admin elle açtığında) oluşuyor. Yani "gelmedi" günü için not tutulacak bir satır yok.
`shift_entries.note` alanı mazeret için kullanılamaz.

## Alınan kararlar

- **Mazeret yalnızca nottur.** Rapor sayıları değişmez: mazeretli gün yine "Gelmedi",
  mazeretli geç giriş yine "Geç giriş" sayılır. Mazeret sadece açıklama olarak görünür.
- **İstatistikler tek satır özet çubuğu olur** — kart ızgarası kaldırılır.
- **Rapor varsayılan olarak kapalı** açılır tablodur; başlıkta toplam özeti görünür.

## Tasarım

### 1. Özet çubuğu

`.attendance-stats` ızgarası yerine tek kutu: `.attendance-summary-bar`. İçinde
`flex-wrap` ile dizilen `.attendance-summary-item` öğeleri, aralarında ince ayraç.

- İlk öğe (`Bugün giriş yapan`) vurgulu: büyük sayı + `15 personelden` alt bilgisi.
- Diğerleri kompakt: küçük etiket + sayı.
- `İzinli` yalnızca `summary.off > 0` iken, `Konum dışı deneme` yalnızca
  `summary.deniedAttempts > 0` iken görünür — sıfır değerler gürültü.
- Tek kapsayıcı olduğu için öğe sayısı değişse de "yalnız kart" oluşamaz; taşan öğeler
  ayraçlarıyla alt satıra sarılır.

### 2. Filtreler

Izgara (`grid-template-columns: repeat(4, ...)`) yerine `flex-wrap`. Her alanın kendi
`min-width`'i olur; "Tarih seç" ile gelen iki alan araya girmek yerine doğal olarak
sarılır, diğer alanların yeri değişmez.

Ek olarak: varsayılan dışında bir filtre seçiliyse **"Filtreleri temizle"** düğmesi
görünür (preset `today`, personel `Tümü`, durum `Tümü` haline döner).

### 3. Rapor — açılır tablo

`.attendance-report` kontrollü bir açılır bölüme dönüşür (React state; native `<details>`
değil, mevcut admin görsel diliyle tutarlı olsun diye).

**Başlık (her zaman görünür):** chevron + `08.08.2026 raporu` + toplam özeti
(`12 tam · 0 yarım · 3 gelmedi · 4 geç`). Tıklanabilir, `aria-expanded` taşır.

**Gövde (açıkken):** `admin-table` sınıfını kullanan gerçek tablo —

| Personel | Tam | Yarım | Gelmedi | Geç giriş | Geç süre | İzinli |

- `<tfoot>` satırında toplamlar.
- Personel adı, mevcut davranışta olduğu gibi detay modalını açan düğme.
- Sayı hücreleri sağa hizalı, `tabular-nums`; sıfır değerler soluk.
- `perEmployee.length > 0` olduğu sürece render edilir (bugünkü `> 1` koşulu tek
  personel filtrelendiğinde tabloyu tamamen gizliyordu).
- Dar ekranda mevcut `admin-table-wrap` yatay kaydırması devreye girer.
- Cutoff/vardiya bilgisi başlıktan çıkar, tablonun altına küçük dipnot olur.

### 4. Takvimde gün düzenleme ve mazeret

`EmployeeAttendanceDetail` içindeki salt okunur `SelectedDayCard`, düzenlenebilir
`DayEditor` ile değişir. Mevcut bilgi satırları korunur, altına işlem alanı eklenir:

| Günün hali | Düzenleyicide ne var |
|---|---|
| İzinli (`day.off`) | Salt okunur — izin bilgisi gösterilir, düzenleme yok |
| Gelecek (`future`) | Salt okunur |
| Kayıt var (`entryId != null`) | Durum (Tam/Yarım), Giriş saati, Mazeret · Kaydet · Kaydı sil |
| Gelmedi (kayıt yok) | Mazeret · Kaydet · ayrıca "Kayıt oluştur" (Tam/Yarım + saat) |

Kaydetme sonrası detay yeniden yüklenir ve yeni `onChanged` prop'u ile `AttendancePage`
kendi listesini/raporunu tazeler.

Mevcut `updateAttendanceEntry` / `createAttendanceEntry` / `deleteAttendanceEntry`
fonksiyonları olduğu gibi kullanılır; yalnızca mazeret yeni bir uç ister.

### 5. Mazeret veri modeli

Yeni tablo — `shift_entries`'e dokunulmaz, böylece kayıt olsun olmasın her gün için
mazeret tutulabilir:

```sql
attendance_excuses (
  employee_id INTEGER NOT NULL,   -- employees(id) ON DELETE CASCADE
  work_date   TEXT/DATE NOT NULL, -- YYYY-MM-DD
  note        TEXT NOT NULL,
  created_by  TEXT,
  created_at  TEXT/TIMESTAMP,
  UNIQUE (employee_id, work_date)
)
```

- SQLite: `services/db-sqlite.ts` migration `case 16`, `SCHEMA_VERSION` 16 → 17.
- Postgres: `lib/database.ts` içinde `CREATE TABLE IF NOT EXISTS` (mevcut idempotent
  şema kurulumuyla aynı desen).
- Yeni servis `services/attendanceExcuses.ts` (+ `-pg` / `-sqlite` ikizleri):
  `getExcuses(employeeId?, from, to)`, `setExcuse(employeeId, workDate, note)` —
  `note` boş/null ise kaydı siler (upsert + delete tek fonksiyonda).

**Neden `entry.note`'a yazmıyoruz:** kayıt varsa `note`'a, yoksa yeni tabloya yazmak
"aynı alan iki yerde" dallanması yaratır ve test edilmesi zorlaşır. Tek yerde tutmak,
mevcut "Açıklama" sütununun anlamını da bozmaz.

**Yeni alan:** `AttendanceDay.excuse: string | null` ve `AttendanceRow.excuse: string | null`.
`listAttendance` ve `getEmployeeAttendanceDetail` aralık için mazeretleri tek sorguda
çekip günlere eşler.

**Rota:** `PUT /api/admin/shifts/excuse` — gövde `{ employeeId, workDate, note }`.
`note` boş string veya `null` ise mazeret silinir. Audit: `shift.excuse_update`.
Next proxy: `/api/admin/shifts/excuse/route.ts`.

**Görünürlük:** Yoklama listesindeki "Açıklama" hücresinde, `entry.note` altında küçük
`Mazeret` etiketiyle ikinci satır olarak gösterilir. Takvim hücresinde mazereti olan güne
küçük bir işaret konur; tooltip ve gün kartında "Mazeret" satırı görünür.

## Hata yönetimi

- Mazeret kaydedilemezse gün düzenleyicide satır içi hata gösterilir, alan temizlenmez.
- Kayıt oluşturma/güncelleme hataları mevcut `admin-alert-error` deseniyle aynı.
- Aynı (personel, gün) için ikinci mazeret yazımı `UNIQUE` üzerinden upsert olur; çakışma
  hatası kullanıcıya yansımaz.

## Test

- `attendanceExcuses` servisi: ekleme, güncelleme, boş not ile silme, aralık sorgusu —
  hem SQLite hem Postgres.
- `PUT /shifts/excuse`: yetkisiz 401, geçersiz tarih 400, başarılı yazımda tek audit kaydı.
- `listAttendance` / `getEmployeeAttendanceDetail`: mazeretin doğru güne eşlendiği,
  mazeretin rapor sayılarını **değiştirmediği**.
- Özet çubuğu: `off` ve `deniedAttempts` sıfırken öğelerin gizlendiği.
