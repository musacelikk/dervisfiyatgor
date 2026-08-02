/**
 * Gün batımı (ve dolayısıyla akşam ezanı) yaklaşık hesaplayıcı.
 * Wikipedia "Sunrise equation" / NOAA güneş konumu formülleri kullanılır
 * (doğruluk ~1-2 dakika). Sonuca MAGHRIB_OFFSET_MIN eklenerek akşam ezanı
 * yaklaşıklanır — resmi Diyanet vakti değildir, birkaç dakika sapabilir.
 */

const RAD = Math.PI / 180;
const ISTANBUL_TZ = "Europe/Istanbul";

/** Türkiye 2016'dan beri tek dilimde (UTC+3, DST yok) — sabit env varsayılanları da bu bölgeye göre. */
const DEFAULT_SHOP_LAT = 37.1591; // Şanlıurfa merkez
const DEFAULT_SHOP_LNG = 38.7969;
const DEFAULT_RADIUS_M = 150;
const DEFAULT_MAGHRIB_OFFSET_MIN = 7;

export function getShopLocation(): { lat: number; lng: number } {
  const lat = Number(process.env.SHOP_LAT ?? DEFAULT_SHOP_LAT);
  const lng = Number(process.env.SHOP_LNG ?? DEFAULT_SHOP_LNG);
  return {
    lat: Number.isFinite(lat) ? lat : DEFAULT_SHOP_LAT,
    lng: Number.isFinite(lng) ? lng : DEFAULT_SHOP_LNG,
  };
}

export function getShopRadiusMeters(): number {
  const r = Number(process.env.SHOP_RADIUS_M ?? DEFAULT_RADIUS_M);
  return Number.isFinite(r) && r > 0 ? r : DEFAULT_RADIUS_M;
}

function maghribOffsetMin(): number {
  const v = Number(process.env.MAGHRIB_OFFSET_MIN ?? DEFAULT_MAGHRIB_OFFSET_MIN);
  return Number.isFinite(v) ? v : DEFAULT_MAGHRIB_OFFSET_MIN;
}

/** "YYYY-MM-DD" (İstanbul takvim günü). */
export function istanbulDateString(date: Date = new Date()): string {
  const fmt = new Intl.DateTimeFormat("en-CA", {
    timeZone: ISTANBUL_TZ,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  return fmt.format(date);
}

/** dateStr: "YYYY-MM-DD" için verilen konumda o günün UTC gün batımı. */
export function calculateSunsetUTC(dateStr: string, lat: number, lng: number): Date {
  const [y, m, d] = dateStr.split("-").map(Number);
  const noonUTC = Date.UTC(y, m - 1, d, 12, 0, 0);
  const J = noonUTC / 86400000 + 2440587.5;
  const n = J - 2451545.0 + 0.0008;
  const Jstar = n - lng / 360;
  const M = ((357.5291 + 0.98560028 * Jstar) % 360 + 360) % 360;
  const Mrad = M * RAD;
  const C =
    1.9148 * Math.sin(Mrad) + 0.02 * Math.sin(2 * Mrad) + 0.0003 * Math.sin(3 * Mrad);
  const lambda = ((M + C + 180 + 102.9372) % 360 + 360) % 360;
  const lambdaRad = lambda * RAD;
  const Jtransit =
    2451545.0 + Jstar + 0.0053 * Math.sin(Mrad) - 0.0069 * Math.sin(2 * lambdaRad);
  const sinDelta = Math.sin(lambdaRad) * Math.sin(23.4397 * RAD);
  const delta = Math.asin(sinDelta);
  const latRad = lat * RAD;
  const cosOmega =
    (Math.sin(-0.833 * RAD) - Math.sin(latRad) * Math.sin(delta)) /
    (Math.cos(latRad) * Math.cos(delta));
  const clamped = Math.min(1, Math.max(-1, cosOmega));
  const omega = Math.acos(clamped) / RAD;
  const Jset = Jtransit + omega / 360;
  return new Date((Jset - 2440587.5) * 86400000);
}

/** İlgili iş gününün akşam ezanı (yaklaşık) kesim saati, UTC Date olarak. */
export function maghribCutoffUTC(workDate: string): Date {
  const { lat, lng } = getShopLocation();
  const sunset = calculateSunsetUTC(workDate, lat, lng);
  return new Date(sunset.getTime() + maghribOffsetMin() * 60000);
}
