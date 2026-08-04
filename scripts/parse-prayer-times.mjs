#!/usr/bin/env node
/**
 * Diyanet "Yıllık Namaz Vakti" PDF'inden akşam ezanı saatlerini JSON'a çevirir.
 * Mesai bitişi (otomatik çıkış) bu tabloya göre hesaplanır.
 *
 * Kullanım:
 *   node scripts/parse-prayer-times.mjs "<PDF yolu>" [yıl]
 *
 * Örnek (2027 için):
 *   1. https://namazvakitleri.diyanet.gov.tr/tr-TR/9224/sanliurfa-icin-namaz-vakti
 *      sayfasından "Yıllık Namaz Vakti" listesini PDF olarak kaydedin.
 *   2. node scripts/parse-prayer-times.mjs ~/Downloads/urfa-2027.pdf 2027
 *   3. Oluşan backend/src/data/prayer-times-2027.json commit'lenir;
 *      backend bir sonraki deploy'da otomatik kullanır.
 *
 * Gereksinim: poppler'ın `pdftotext` komutu (macOS: brew install poppler).
 * PDF yerine düz metin (.txt) dosyası da verebilirsiniz.
 */

import { execFileSync } from "node:child_process";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT_DIR = resolve(__dirname, "../backend/src/data");

const TURKISH_MONTHS = {
  ocak: 1,
  şubat: 2,
  subat: 2,
  mart: 3,
  nisan: 4,
  mayıs: 5,
  mayis: 5,
  haziran: 6,
  temmuz: 7,
  ağustos: 8,
  agustos: 8,
  eylül: 9,
  eylul: 9,
  ekim: 10,
  kasım: 11,
  kasim: 11,
  aralık: 12,
  aralik: 12,
};

function extractText(filePath) {
  if (filePath.toLowerCase().endsWith(".txt")) {
    return readFileSync(filePath, "utf8");
  }
  try {
    return execFileSync("pdftotext", ["-layout", filePath, "-"], {
      encoding: "utf8",
      maxBuffer: 32 * 1024 * 1024,
    });
  } catch (err) {
    if (err.code === "ENOENT") {
      throw new Error(
        "pdftotext bulunamadı. Kurulum: brew install poppler\n" +
          "Alternatif: PDF'i metne çevirip .txt dosyası olarak verin."
      );
    }
    throw err;
  }
}

/**
 * Satır formatı (pdftotext -layout çıktısı):
 *   01 Ocak 2026 Perşembe  12 Recep 1447  06:05 07:32 12:33 15:04 17:25 18:46
 *                                         imsak güneş öğle  ikindi AKŞAM yatsı
 * Akşam = satırdaki son 6 saatin 5.'si.
 */
function parseLines(text) {
  const result = {};
  const dateRe = /^\s*(\d{1,2})\s+([A-Za-zÇĞİÖŞÜçğıöşü]+)\s+(\d{4})\b/;
  const timeRe = /\b([0-2]?\d:[0-5]\d)\b/g;

  for (const rawLine of text.split(/\r?\n/)) {
    const dateMatch = dateRe.exec(rawLine);
    if (!dateMatch) continue;

    const day = Number(dateMatch[1]);
    const month = TURKISH_MONTHS[dateMatch[2].toLowerCase()];
    const year = Number(dateMatch[3]);
    if (!month) continue;

    const times = [...rawLine.matchAll(timeRe)].map((m) => m[1]);
    if (times.length < 6) continue;

    // Hicri yıl gibi sayılar saat formatında olmaz; son 6 alan namaz vakitleridir.
    const [, , , , aksam] = times.slice(-6);
    const key = `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;

    if (result[key] && result[key] !== aksam) {
      console.warn(`UYARI: ${key} için çakışan değer (${result[key]} ≠ ${aksam})`);
    }
    result[key] = aksam.padStart(5, "0");
  }
  return result;
}

function validate(times, expectedYear) {
  const keys = Object.keys(times).sort();
  if (keys.length === 0) {
    throw new Error("Hiç vakit bulunamadı. PDF formatı beklenenden farklı olabilir.");
  }

  const year = expectedYear ?? Number(keys[0].slice(0, 4));
  const isLeap = (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0;
  const expectedDays = isLeap ? 366 : 365;

  const wrongYear = keys.filter((k) => !k.startsWith(`${year}-`));
  if (wrongYear.length > 0) {
    throw new Error(
      `${year} dışında ${wrongYear.length} kayıt var (ör. ${wrongYear[0]}). PDF tek yıl içermeli.`
    );
  }

  if (keys.length !== expectedDays) {
    const missing = [];
    const cursor = new Date(Date.UTC(year, 0, 1));
    while (cursor.getUTCFullYear() === year) {
      const key = cursor.toISOString().slice(0, 10);
      if (!times[key]) missing.push(key);
      cursor.setUTCDate(cursor.getUTCDate() + 1);
    }
    throw new Error(
      `${expectedDays} gün beklenirken ${keys.length} gün bulundu. Eksik: ${missing.slice(0, 10).join(", ")}${missing.length > 10 ? "…" : ""}`
    );
  }

  // Akşam ezanı Türkiye'de 16:00–21:30 aralığının dışına çıkmaz
  for (const [key, value] of Object.entries(times)) {
    const [h, m] = value.split(":").map(Number);
    const minutes = h * 60 + m;
    if (minutes < 16 * 60 || minutes > 21 * 60 + 30) {
      throw new Error(`${key} için mantıksız akşam vakti: ${value}`);
    }
  }

  return { year, count: keys.length };
}

function main() {
  const [, , inputPath, yearArg] = process.argv;
  if (!inputPath) {
    console.error(
      "Kullanım: node scripts/parse-prayer-times.mjs <PDF veya TXT yolu> [yıl]"
    );
    process.exit(1);
  }

  const text = extractText(resolve(inputPath));
  const times = parseLines(text);
  const { year, count } = validate(times, yearArg ? Number(yearArg) : undefined);

  const sorted = Object.fromEntries(Object.entries(times).sort(([a], [b]) => a.localeCompare(b)));

  mkdirSync(OUT_DIR, { recursive: true });
  const outPath = join(OUT_DIR, `prayer-times-${year}.json`);
  writeFileSync(outPath, `${JSON.stringify(sorted, null, 2)}\n`, "utf8");

  const keys = Object.keys(sorted);
  console.log(`✓ ${count} gün yazıldı → ${outPath}`);
  console.log(`  İlk: ${keys[0]} ${sorted[keys[0]]}`);
  console.log(`  Son: ${keys[keys.length - 1]} ${sorted[keys[keys.length - 1]]}`);
  console.log(
    `\nYeni yıl eklediyseniz backend/src/lib/prayerTimes.ts içindeki` +
      ` PRAYER_TABLES listesine import'u ekleyin.`
  );
}

main();
