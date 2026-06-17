import { getPool } from "../lib/database";
import {
  buildSearchLikePattern,
  normalizeSearchText,
  productNormValues,
} from "../lib/searchNormalize";
import type { Product, ProductRow } from "../types/product";

const selectFields = `
  stock_code, name, unit, barcode,
  sale_price_1, sale_price_2, purchase_price_1, purchase_price_2,
  remaining_qty, description_1, description_2, group_name
`;

const NAME_SEARCH_LIMIT = 30;

export type SearchBy = "barcode" | "stockCode" | "name" | "group";

const UPSERT_BATCH_SIZE = 500;

export async function upsertProducts(products: Product[]): Promise<number> {
  if (products.length === 0) return 0;

  const client = await getPool().connect();
  try {
    await client.query("BEGIN");

    const withBarcode = products.filter((p) => p.barcode?.trim());
    if (withBarcode.length > 0) {
      await client.query(
        `UPDATE products p
         SET barcode = NULL, updated_at = NOW()
         FROM (
           SELECT * FROM unnest($1::text[], $2::text[]) AS t(barcode, stock_code)
         ) AS incoming
         WHERE p.barcode IS NOT NULL
           AND p.barcode = incoming.barcode
           AND p.stock_code <> incoming.stock_code`,
        [
          withBarcode.map((p) => p.barcode!.trim()),
          withBarcode.map((p) => p.stockCode),
        ]
      );
    }

    for (let offset = 0; offset < products.length; offset += UPSERT_BATCH_SIZE) {
      const batch = products.slice(offset, offset + UPSERT_BATCH_SIZE);
      const norms = batch.map((p) =>
        productNormValues({
          stockCode: p.stockCode,
          name: p.name,
          barcode: p.barcode,
          group: p.group,
        })
      );
      await client.query(
        `INSERT INTO products (
          stock_code, name, unit, barcode,
          sale_price_1, sale_price_2, purchase_price_1, purchase_price_2,
          remaining_qty, description_1, description_2, group_name,
          stock_code_norm, name_norm, barcode_norm, group_name_norm,
          updated_at
        )
        SELECT
          stock_code, name, unit, barcode,
          sale_price_1, sale_price_2, purchase_price_1, purchase_price_2,
          remaining_qty, description_1, description_2, group_name,
          stock_code_norm, name_norm, barcode_norm, group_name_norm,
          NOW()
        FROM unnest(
          $1::text[], $2::text[], $3::text[], $4::text[],
          $5::float8[], $6::float8[], $7::float8[], $8::float8[],
          $9::float8[], $10::text[], $11::text[], $12::text[],
          $13::text[], $14::text[], $15::text[], $16::text[]
        ) AS t(
          stock_code, name, unit, barcode,
          sale_price_1, sale_price_2, purchase_price_1, purchase_price_2,
          remaining_qty, description_1, description_2, group_name,
          stock_code_norm, name_norm, barcode_norm, group_name_norm
        )
        ON CONFLICT (stock_code) DO UPDATE SET
          name = EXCLUDED.name,
          unit = EXCLUDED.unit,
          barcode = EXCLUDED.barcode,
          sale_price_1 = EXCLUDED.sale_price_1,
          sale_price_2 = EXCLUDED.sale_price_2,
          purchase_price_1 = EXCLUDED.purchase_price_1,
          purchase_price_2 = EXCLUDED.purchase_price_2,
          remaining_qty = EXCLUDED.remaining_qty,
          description_1 = EXCLUDED.description_1,
          description_2 = EXCLUDED.description_2,
          group_name = EXCLUDED.group_name,
          stock_code_norm = EXCLUDED.stock_code_norm,
          name_norm = EXCLUDED.name_norm,
          barcode_norm = EXCLUDED.barcode_norm,
          group_name_norm = EXCLUDED.group_name_norm,
          updated_at = NOW()`,
        [
          batch.map((p) => p.stockCode),
          batch.map((p) => p.name),
          batch.map((p) => p.unit),
          batch.map((p) => p.barcode?.trim() || null),
          batch.map((p) => p.salePrice1),
          batch.map((p) => p.salePrice2),
          batch.map((p) => p.purchasePrice1),
          batch.map((p) => p.purchasePrice2),
          batch.map((p) => p.remainingQty),
          batch.map((p) => p.description1),
          batch.map((p) => p.description2),
          batch.map((p) => p.group),
          norms.map((n) => n.stockCodeNorm),
          norms.map((n) => n.nameNorm),
          norms.map((n) => n.barcodeNorm),
          norms.map((n) => n.groupNameNorm),
        ]
      );
    }

    await client.query("COMMIT");
    return products.length;
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }
}

export async function searchProducts(by: SearchBy, query: string): Promise<ProductRow[]> {
  const q = query.trim();
  if (!q) return [];
  const normQ = normalizeSearchText(q);
  const pool = getPool();

  switch (by) {
    case "barcode": {
      const { rows } = await pool.query(
        `SELECT ${selectFields} FROM products WHERE barcode_norm IS NOT NULL AND barcode_norm = $1 LIMIT 1`,
        [normQ]
      );
      return rows as ProductRow[];
    }
    case "stockCode": {
      const { rows } = await pool.query(
        `SELECT ${selectFields} FROM products WHERE stock_code_norm = $1 LIMIT 1`,
        [normQ]
      );
      return rows as ProductRow[];
    }
    case "name": {
      const pattern = buildSearchLikePattern(q);
      const { rows } = await pool.query(
        `SELECT ${selectFields} FROM products WHERE name_norm LIKE $1 ESCAPE '\\' ORDER BY name LIMIT $2`,
        [pattern, NAME_SEARCH_LIMIT]
      );
      return rows as ProductRow[];
    }
    case "group": {
      const pattern = buildSearchLikePattern(q);
      const { rows } = await pool.query(
        `SELECT ${selectFields} FROM products WHERE group_name_norm LIKE $1 ESCAPE '\\' ORDER BY group_name, name LIMIT $2`,
        [pattern, NAME_SEARCH_LIMIT]
      );
      return rows as ProductRow[];
    }
    default:
      return [];
  }
}

export async function getProductCount(): Promise<number> {
  const { rows } = await getPool().query(`SELECT COUNT(*)::int AS count FROM products`);
  return rows[0].count as number;
}

export async function listAllProducts(): Promise<ProductRow[]> {
  const { rows } = await getPool().query(
    `SELECT ${selectFields} FROM products ORDER BY LOWER(name)`
  );
  return rows as ProductRow[];
}

export async function getProductByStockCode(stockCode: string): Promise<ProductRow | undefined> {
  const normCode = normalizeSearchText(stockCode);
  const { rows } = await getPool().query(
    `SELECT ${selectFields} FROM products WHERE stock_code_norm = $1 LIMIT 1`,
    [normCode]
  );
  return (rows[0] as ProductRow | undefined) ?? undefined;
}

export async function listProductsPaged(options: {
  q?: string;
  page: number;
  limit: number | "all";
}): Promise<{ rows: ProductRow[]; total: number }> {
  const pool = getPool();
  const page = Math.max(1, options.page);
  const unlimited = options.limit === "all";
  const limitNum =
    typeof options.limit === "number"
      ? Math.min(100_000, Math.max(1, options.limit))
      : 25;
  const q = options.q?.trim() ?? "";

  if (!q) {
    const total = await getProductCount();
    const limit = unlimited ? total || 1 : limitNum;
    const offset = unlimited ? 0 : (page - 1) * limit;
    const { rows } = unlimited
      ? await pool.query(`SELECT ${selectFields} FROM products ORDER BY LOWER(name)`)
      : await pool.query(
          `SELECT ${selectFields} FROM products ORDER BY LOWER(name) LIMIT $1 OFFSET $2`,
          [limit, offset]
        );
    return { rows: rows as ProductRow[], total };
  }

  const pattern = buildSearchLikePattern(q);
  const where = `
    name_norm LIKE $1 ESCAPE '\\'
    OR stock_code_norm LIKE $1 ESCAPE '\\'
    OR barcode_norm LIKE $1 ESCAPE '\\'
    OR group_name_norm LIKE $1 ESCAPE '\\'
  `;
  const countResult = await pool.query(
    `SELECT COUNT(*)::int AS count FROM products WHERE ${where}`,
    [pattern]
  );
  const total = countResult.rows[0].count as number;
  const limit = unlimited ? total || 1 : limitNum;
  const offset = unlimited ? 0 : (page - 1) * limit;
  const { rows } = unlimited
    ? await pool.query(
        `SELECT ${selectFields} FROM products WHERE ${where} ORDER BY LOWER(name)`,
        [pattern]
      )
    : await pool.query(
        `SELECT ${selectFields} FROM products WHERE ${where} ORDER BY LOWER(name) LIMIT $2 OFFSET $3`,
        [pattern, limit, offset]
      );
  return { rows: rows as ProductRow[], total };
}

export async function createProduct(product: Product): Promise<void> {
  const code = product.stockCode.trim();
  if (!code) throw new Error("Stok kodu gerekli.");
  if (!product.name?.trim()) throw new Error("Ürün adı gerekli.");

  if (await getProductByStockCode(code)) {
    throw new Error("Bu stok kodu zaten kayıtlı.");
  }

  if (product.barcode?.trim()) {
    const { rows } = await getPool().query(
      `SELECT ${selectFields} FROM products WHERE barcode = $1 LIMIT 1`,
      [product.barcode.trim()]
    );
    if (rows[0]) throw new Error("Bu barkod başka bir üründe kullanılıyor.");
  }

  await upsertProducts([{ ...product, stockCode: code, name: product.name.trim() }]);
}

export async function updateProduct(
  stockCode: string,
  updates: Partial<Product>
): Promise<Product> {
  const row = await getProductByStockCode(stockCode);
  if (!row) throw new Error("Ürün bulunamadı.");

  const current: Product = {
    stockCode: row.stock_code,
    name: row.name,
    unit: row.unit,
    barcode: row.barcode,
    salePrice1: row.sale_price_1,
    salePrice2: row.sale_price_2,
    purchasePrice1: row.purchase_price_1,
    purchasePrice2: row.purchase_price_2,
    remainingQty: row.remaining_qty,
    description1: row.description_1,
    description2: row.description_2,
    group: row.group_name,
  };

  const merged: Product = {
    ...current,
    ...updates,
    stockCode: current.stockCode,
    name: updates.name !== undefined ? updates.name.trim() : current.name,
  };

  if (!merged.name) throw new Error("Ürün adı gerekli.");

  if (merged.barcode?.trim()) {
    const { rows } = await getPool().query(
      `SELECT ${selectFields} FROM products WHERE barcode = $1 LIMIT 1`,
      [merged.barcode.trim()]
    );
    const other = rows[0] as ProductRow | undefined;
    if (other && other.stock_code !== merged.stockCode) {
      throw new Error("Bu barkod başka bir üründe kullanılıyor.");
    }
  }

  await upsertProducts([merged]);
  const updated = await getProductByStockCode(merged.stockCode);
  if (!updated) throw new Error("Güncelleme başarısız.");
  return {
    stockCode: updated.stock_code,
    name: updated.name,
    unit: updated.unit,
    barcode: updated.barcode,
    salePrice1: updated.sale_price_1,
    salePrice2: updated.sale_price_2,
    purchasePrice1: updated.purchase_price_1,
    purchasePrice2: updated.purchase_price_2,
    remainingQty: updated.remaining_qty,
    description1: updated.description_1,
    description2: updated.description_2,
    group: updated.group_name,
  };
}

export async function deleteProduct(stockCode: string): Promise<void> {
  const result = await getPool().query(`DELETE FROM products WHERE stock_code = $1`, [
    stockCode.trim(),
  ]);
  if (result.rowCount === 0) throw new Error("Ürün bulunamadı.");
}

export async function clearProducts(): Promise<void> {
  await getPool().query(`DELETE FROM products`);
}
