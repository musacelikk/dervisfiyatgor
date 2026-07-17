import type { ReactNode } from "react";

/** Gider kategorileri ve kişiler için renk paleti. */
export const EXPENSE_COLORS = [
  "#ef4444", // kırmızı
  "#f97316", // turuncu
  "#f59e0b", // amber
  "#eab308", // sarı
  "#84cc16", // fıstık yeşili
  "#22c55e", // yeşil
  "#10b981", // zümrüt
  "#14b8a6", // turkuaz
  "#06b6d4", // camgöbeği
  "#0ea5e9", // gök mavisi
  "#3b82f6", // mavi
  "#6366f1", // çivit
  "#8b5cf6", // menekşe
  "#a855f7", // mor
  "#d946ef", // fuşya
  "#ec4899", // pembe
  "#f43f5e", // gül
  "#64748b", // gri
] as const;

export const DEFAULT_EXPENSE_COLOR = "#64748b";

type IconDef = { id: string; label: string; node: ReactNode };

const p = (d: string, key?: string) => (
  <path key={key ?? d} strokeLinecap="round" strokeLinejoin="round" d={d} />
);
const c = (cx: number, cy: number, r: number) => (
  <circle key={`c${cx}-${cy}-${r}`} cx={cx} cy={cy} r={r} />
);

/** 50 kategori ikonu. */
export const EXPENSE_CATEGORY_ICONS: IconDef[] = [
  { id: "cash", label: "Nakit", node: <>{p("M3 8a1 1 0 011-1h16a1 1 0 011 1v8a1 1 0 01-1 1H4a1 1 0 01-1-1V8z")}{c(12, 12, 2.5)}</> },
  { id: "card", label: "Kart", node: <>{p("M3 7a2 2 0 012-2h14a2 2 0 012 2v10a2 2 0 01-2 2H5a2 2 0 01-2-2V7z")}{p("M3 10h18")}{p("M6 15h4")}</> },
  { id: "receipt", label: "Fatura", node: <>{p("M6 3h12v18l-2-1.5-2 1.5-2-1.5L10 21l-2-1.5L6 21V3z")}{p("M9 8h6M9 12h6")}</> },
  { id: "cart", label: "Market", node: p("M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z") },
  { id: "bag", label: "Alışveriş", node: <>{p("M6 8h12l-1 12H7L6 8z")}{p("M9 8V6a3 3 0 016 0v2")}</> },
  { id: "food", label: "Yemek", node: <>{p("M7 3v5a2 2 0 01-2 2m4-7v5a2 2 0 002 2m-2-7v18")}{p("M17 3c-2 3-2 8 0 10v8")}</> },
  { id: "coffee", label: "Kahve", node: <>{p("M4 8h12v6a4 4 0 01-4 4H8a4 4 0 01-4-4V8z")}{p("M16 9h2a2 2 0 010 4h-2")}{p("M8 4v2M12 4v2")}</> },
  { id: "cake", label: "Pastane", node: <>{p("M4 13h16v7H4v-7z")}{p("M4 16c1.5 0 1.5 1.5 3 1.5S8.5 16 10 16s1.5 1.5 3 1.5S14.5 16 16 16s1.5 1.5 3 1.5")}{p("M12 8v5M12 4v1")}</> },
  { id: "truck", label: "Nakliye", node: <>{p("M3 7h11v8H3V7z")}{p("M14 10h4l3 3v2h-7v-5z")}{c(7, 17.5, 1.5)}{c(17, 17.5, 1.5)}</> },
  { id: "car", label: "Araç", node: <>{p("M5 13l1.5-4.5A2 2 0 018.4 7h7.2a2 2 0 011.9 1.5L19 13")}{p("M4 13h16v4H4v-4z")}{c(7.5, 17, 1.5)}{c(16.5, 17, 1.5)}</> },
  { id: "fuel", label: "Yakıt", node: <>{p("M5 4h8v16H5V4z")}{p("M7 8h4")}{p("M13 10h2l2 2v5a1.5 1.5 0 01-3 0v-3")}{p("M4 20h10")}</> },
  { id: "wrench", label: "Bakım", node: p("M14.7 6.3a4 4 0 00-5.4 5.4L4 17v3h3l5.3-5.3a4 4 0 005.4-5.4l-2.4 2.4-2.4-.6-.6-2.4 2.4-2.4z") },
  { id: "hammer", label: "Tamirat", node: <>{p("M14 5l5 5-2 2-5-5 2-2z")}{p("M12 7L4 15l3 3 8-8")}</> },
  { id: "cog", label: "Makine", node: <>{p("M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z")}{p("M15 12a3 3 0 11-6 0 3 3 0 016 0z")}</> },
  { id: "bolt", label: "Elektrik", node: p("M13 3L5 13h5l-1 8 8-10h-5l1-8z") },
  { id: "drop", label: "Su", node: p("M12 3s6 6.5 6 11a6 6 0 01-12 0c0-4.5 6-11 6-11z") },
  { id: "flame", label: "Doğalgaz", node: p("M12 3c1 3-2 4.5-2 7a2 2 0 004 0c0-1 .5-1.5.5-1.5S17 10 17 14a5 5 0 01-10 0c0-5 5-7 5-11z") },
  { id: "wifi", label: "İnternet", node: <>{p("M5 12a10 10 0 0114 0")}{p("M8 15a6 6 0 018 0")}{c(12, 18, 1)}</> },
  { id: "phone", label: "Telefon", node: p("M3 5a2 2 0 012-2h2l2 5-2 1.5a11 11 0 005.5 5.5L14 13l5 2v2a2 2 0 01-2 2A16 16 0 013 5z") },
  { id: "mobile", label: "Mobil", node: <>{p("M8 3h8a1 1 0 011 1v16a1 1 0 01-1 1H8a1 1 0 01-1-1V4a1 1 0 011-1z")}{p("M11 18h2")}</> },
  { id: "laptop", label: "Bilgisayar", node: <>{p("M5 6h14v9H5V6z")}{p("M3 18h18")}</> },
  { id: "printer", label: "Yazıcı", node: <>{p("M7 8V4h10v4")}{p("M7 16H5a2 2 0 01-2-2v-4a2 2 0 012-2h14a2 2 0 012 2v4a2 2 0 01-2 2h-2")}{p("M7 13h10v7H7v-7z")}</> },
  { id: "box", label: "Malzeme", node: p("M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4") },
  { id: "archive", label: "Depo", node: <>{p("M4 5h16v4H4V5z")}{p("M6 9v10h12V9")}{p("M10 13h4")}</> },
  { id: "tag", label: "Etiket", node: <>{p("M4 4h6l10 10-6 6L4 10V4z")}{c(8, 8, 1)}</> },
  { id: "gift", label: "Hediye", node: <>{p("M4 9h16v4H4V9z")}{p("M6 13h12v8H6v-8z")}{p("M12 9v12")}{p("M12 9C9 9 7 7.5 8 6s3-1 4 3c1-4 3-4.5 4-3s-1 3-4 3z")}</> },
  { id: "heart", label: "Bağış", node: p("M12 20s-7-4.5-9-9a5 5 0 019-3 5 5 0 019 3c-2 4.5-9 9-9 9z") },
  { id: "health", label: "Sağlık", node: <>{c(12, 12, 8)}{p("M12 9v6M9 12h6")}</> },
  { id: "education", label: "Eğitim", node: <>{p("M12 4L2 9l10 5 10-5-10-5z")}{p("M6 11v5c0 1.5 3 3 6 3s6-1.5 6-3v-5")}</> },
  { id: "book", label: "Kitap", node: <>{p("M4 5a2 2 0 012-2h13v16H6a2 2 0 00-2 2V5z")}{p("M19 15H6a2 2 0 00-2 2")}</> },
  { id: "newspaper", label: "Abonelik", node: <>{p("M4 5h12v14H6a2 2 0 01-2-2V5z")}{p("M16 8h3a1 1 0 011 1v8a2 2 0 01-2 2")}{p("M7 9h6M7 13h6")}</> },
  { id: "scissors", label: "Berber", node: <>{c(6, 7, 2.5)}{c(6, 17, 2.5)}{p("M8 8.5L20 19M8 15.5L20 5")}</> },
  { id: "paint", label: "Boya", node: <>{p("M5 3h11v4H5V3z")}{p("M16 5h3v5h-7v3")}{p("M11 13h2v8h-2v-8z")}</> },
  { id: "trash", label: "Atık", node: p("M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16") },
  { id: "globe", label: "Yurtdışı", node: <>{c(12, 12, 9)}{p("M3 12h18")}{p("M12 3c3 3 3 15 0 18M12 3c-3 3-3 15 0 18")}</> },
  { id: "plane", label: "Seyahat", node: p("M21 12L3 20l4-8-4-8 18 8z") },
  { id: "mappin", label: "Konum", node: <>{p("M12 21s-6-5.5-6-10a6 6 0 1112 0c0 4.5-6 10-6 10z")}{c(12, 11, 2)}</> },
  { id: "calendar", label: "Kira", node: <>{p("M5 6a2 2 0 012-2h10a2 2 0 012 2v12a2 2 0 01-2 2H7a2 2 0 01-2-2V6z")}{p("M5 10h14")}{p("M8 3v4M16 3v4")}</> },
  { id: "clock", label: "Mesai", node: <>{c(12, 12, 9)}{p("M12 7v5l3 3")}</> },
  { id: "chart", label: "Reklam", node: <>{p("M4 20h16")}{p("M6 20v-6M11 20V8M16 20v-9")}</> },
  { id: "trend", label: "Yatırım", node: <>{p("M3 17l6-6 4 4 8-8")}{p("M17 7h4v4")}</> },
  { id: "scale", label: "Vergi", node: <>{p("M12 4v3M6 7h12")}{p("M6 7l-2 6a3 3 0 006 0L8 7")}{p("M18 7l-2 6a3 3 0 006 0l-2-6")}{p("M12 7v13M9 20h6")}</> },
  { id: "briefcase", label: "Ofis", node: <>{p("M4 8h16v11H4V8z")}{p("M9 8V6a2 2 0 012-2h2a2 2 0 012 2v2")}{p("M4 13h16")}</> },
  { id: "key", label: "Aidat", node: <>{c(8, 15, 4)}{p("M11 12l9-9M17 5l3 3")}</> },
  { id: "lock", label: "Sigorta", node: <>{p("M6 11h12v9H6v-9z")}{p("M9 11V8a3 3 0 016 0v3")}</> },
  { id: "shield", label: "Güvence", node: p("M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6l8-3z") },
  { id: "star", label: "Özel", node: p("M12 3l2.7 5.7 6.3.9-4.5 4.4 1 6.2-5.5-3-5.5 3 1-6.2L3 9.6l6.3-.9L12 3z") },
  { id: "users", label: "Personel", node: p("M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z") },
  { id: "home", label: "Ev", node: <>{p("M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2V9z")}{p("M9 22V12h6v10")}</> },
  { id: "building", label: "Bina", node: <>{p("M4 21V5a2 2 0 012-2h8a2 2 0 012 2v16")}{p("M16 9h3a1 1 0 011 1v11")}{p("M4 21h17")}{p("M8 7h2M8 11h2M8 15h2")}</> },
];

/** 10 kişi/rol ikonu. */
export const EXPENSE_PERSON_ICONS: IconDef[] = [
  { id: "worker", label: "Çalışan", node: <>{c(12, 8, 4)}{p("M5 21a7 7 0 0114 0")}</> },
  { id: "boss", label: "Patron", node: <>{p("M4 9l4 3 4-6 4 6 4-3-1.5 9h-13L4 9z")}{p("M6.5 21h11")}</> },
  { id: "chef", label: "Aşçı", node: <>{p("M6.5 11A3.5 3.5 0 018 4.5 4.5 4.5 0 0116 4.5 3.5 3.5 0 0117.5 11v3h-11v-3z")}{p("M6.5 14h11v4h-11v-4z")}{p("M10 14v4M14 14v4")}</> },
  { id: "warehouse", label: "Depocu", node: <>{p("M4 13h7v7H4v-7z")}{p("M13 13h7v7h-7v-7z")}{p("M8.5 4h7v7h-7V4z")}</> },
  { id: "shelf", label: "Rafçı", node: <>{p("M4 4h16M4 12h16M4 20h16")}{p("M6 7h4v5H6V7z")}{p("M13 15h5v5h-5v-5z")}</> },
  { id: "driver", label: "Şoför", node: <>{c(12, 12, 8)}{c(12, 12, 2.5)}{p("M4 12h5.5M14.5 12H20M12 14.5V20")}</> },
  { id: "cashier", label: "Kasiyer", node: <>{p("M6 3h12v18H6V3z")}{p("M9 7h6")}{p("M9 12h.01M12 12h.01M15 12h.01M9 16h.01M12 16h.01M15 16h.01")}</> },
  { id: "cleaner", label: "Temizlik", node: <>{p("M13 3l-3 8")}{p("M7 11h8l2 7c-4 2-8 2-12 0l2-7z")}</> },
  { id: "security", label: "Güvenlik", node: <>{p("M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6l8-3z")}{p("M9 12l2 2 4-4")}</> },
  { id: "accountant", label: "Muhasebe", node: <>{p("M12 3a9 9 0 109 9h-9V3z")}{p("M15 3.5A9 9 0 0120.5 9H15V3.5z")}</> },
];

const ALL_ICONS = new Map<string, IconDef>(
  [...EXPENSE_CATEGORY_ICONS, ...EXPENSE_PERSON_ICONS].map((icon) => [icon.id, icon])
);

export function ExpenseIcon({
  icon,
  className = "h-5 w-5",
}: {
  icon: string | null | undefined;
  className?: string;
}) {
  const def = (icon && ALL_ICONS.get(icon)) || null;
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.75}
      aria-hidden
    >
      {def ? def.node : <>{c(12, 12, 8)}{p("M9 12h6")}</>}
    </svg>
  );
}
