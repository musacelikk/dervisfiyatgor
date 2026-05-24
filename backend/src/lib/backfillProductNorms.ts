import { isPostgres, getPool } from "./database";
import { productNormValues } from "./searchNormalize";
import { db as getSqliteDb } from "../services/db-sqlite";

const BATCH_SIZE = 500;

type ProductNormRow = {
  stock_code: string;
  name: string;
  barcode: string | null;
  group_name: string | null;
};

function computeNormArrays(rows: ProductNormRow[]) {
  const stockCodes: string[] = [];
  const stockCodeNorms: string[] = [];
  const nameNorms: string[] = [];
  const barcodeNorms: (string | null)[] = [];
  const groupNameNorms: (string | null)[] = [];

  for (const row of rows) {
    const norms = productNormValues({
      stockCode: row.stock_code,
      name: row.name,
      barcode: row.barcode,
      group: row.group_name,
    });
    stockCodes.push(row.stock_code);
    stockCodeNorms.push(norms.stockCodeNorm);
    nameNorms.push(norms.nameNorm);
    barcodeNorms.push(norms.barcodeNorm);
    groupNameNorms.push(norms.groupNameNorm);
  }

  return { stockCodes, stockCodeNorms, nameNorms, barcodeNorms, groupNameNorms };
}

async function backfillPostgres(rows: ProductNormRow[]): Promise<void> {
  const pool = getPool();
  const total = rows.length;

  for (let offset = 0; offset < total; offset += BATCH_SIZE) {
    const batch = rows.slice(offset, offset + BATCH_SIZE);
    const { stockCodes, stockCodeNorms, nameNorms, barcodeNorms, groupNameNorms } =
      computeNormArrays(batch);

    await pool.query(
      `UPDATE products AS p SET
        stock_code_norm = v.stock_code_norm,
        name_norm = v.name_norm,
        barcode_norm = v.barcode_norm,
        group_name_norm = v.group_name_norm
      FROM (
        SELECT * FROM unnest(
          $1::text[], $2::text[], $3::text[], $4::text[], $5::text[]
        ) AS t(stock_code, stock_code_norm, name_norm, barcode_norm, group_name_norm)
      ) AS v
      WHERE p.stock_code = v.stock_code`,
      [stockCodes, stockCodeNorms, nameNorms, barcodeNorms, groupNameNorms]
    );

    const done = Math.min(offset + batch.length, total);
    if (total > BATCH_SIZE) {
      console.log(`  … ${done.toLocaleString("tr-TR")} / ${total.toLocaleString("tr-TR")} ürün`);
    }
  }
}

function backfillSqlite(rows: ProductNormRow[]): void {
  const database = getSqliteDb();
  const stmt = database.prepare(`
    UPDATE products SET
      stock_code_norm = @stock_code_norm,
      name_norm = @name_norm,
      barcode_norm = @barcode_norm,
      group_name_norm = @group_name_norm
    WHERE stock_code = @stock_code
  `);

  const tx = database.transaction((items: ProductNormRow[]) => {
    for (const row of items) {
      const norms = productNormValues({
        stockCode: row.stock_code,
        name: row.name,
        barcode: row.barcode,
        group: row.group_name,
      });
      stmt.run({
        stock_code: row.stock_code,
        stock_code_norm: norms.stockCodeNorm,
        name_norm: norms.nameNorm,
        barcode_norm: norms.barcodeNorm,
        group_name_norm: norms.groupNameNorm,
      });
    }
  });
  tx(rows);
}

export async function backfillProductSearchNorms(): Promise<number> {
  const selectSql = `SELECT stock_code, name, barcode, group_name FROM products`;

  if (isPostgres()) {
    const { rows } = await getPool().query<ProductNormRow>(selectSql);
    if (rows.length === 0) return 0;
    await backfillPostgres(rows);
    return rows.length;
  }

  const database = getSqliteDb();
  const rows = database.prepare(selectSql).all() as ProductNormRow[];
  if (rows.length === 0) return 0;
  backfillSqlite(rows);
  return rows.length;
}

/** Eksik norm alanı var mı (ilk çalıştırmada backfill tetiklemek için) */
export async function needsProductNormBackfill(): Promise<boolean> {
  if (isPostgres()) {
    const { rows } = await getPool().query(
      `SELECT 1 FROM products
       WHERE name_norm IS NULL OR stock_code_norm IS NULL
       LIMIT 1`
    );
    return rows.length > 0;
  }

  const database = getSqliteDb();
  const row = database
    .prepare(
      `SELECT 1 FROM products
       WHERE name_norm IS NULL OR stock_code_norm IS NULL
       LIMIT 1`
    )
    .get();
  return Boolean(row);
}

/** Sunucu ayağa kalktıktan sonra arka planda çalıştırın (başlangıcı bloklamaz). */
export function scheduleProductNormBackfill(): void {
  void (async () => {
    try {
      if (!(await needsProductNormBackfill())) return;

      console.log("Ürün arama normalizasyonu güncelleniyor (arka planda)…");
      const started = Date.now();
      const count = await backfillProductSearchNorms();
      const seconds = ((Date.now() - started) / 1000).toFixed(1);
      console.log(
        `Ürün arama normalizasyonu tamamlandı (${count.toLocaleString("tr-TR")} ürün, ${seconds} sn).`
      );
    } catch (err) {
      console.error("Ürün arama normalizasyonu başarısız:", err);
    }
  })();
}
