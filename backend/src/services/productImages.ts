import { getPool, isPostgres } from "../lib/database";
import { db as getSqliteDb } from "./db-sqlite";
import {
  deleteObject,
  isPublicReadEnabled,
  isS3Configured,
  presignedReadUrl,
} from "../lib/tigris";
import type { ProductImage, ProductImageInput } from "../types/productImage";

type Row = Record<string, unknown>;

function mapRow(row: Row): ProductImage {
  return {
    id: Number(row.id),
    stockCode: String(row.stock_code),
    objectKey: String(row.object_key),
    url: String(row.url),
    sortOrder: Number(row.sort_order ?? 0),
    createdAt: String(row.created_at ?? ""),
  };
}

/** DB'de kalıcı public URL saklanır; bucket private ise görüntüleme için
 *  süreli presigned GET URL'i üretilir (S3_PUBLIC_READ=true sabit URL kullanır). */
async function withViewUrls(images: ProductImage[]): Promise<ProductImage[]> {
  if (images.length === 0 || !isS3Configured() || isPublicReadEnabled()) {
    return images;
  }
  return Promise.all(
    images.map(async (img) => {
      try {
        return { ...img, url: await presignedReadUrl(img.objectKey) };
      } catch {
        return img;
      }
    })
  );
}

export async function listImagesForStockCode(stockCode: string): Promise<ProductImage[]> {
  const code = stockCode.trim();
  if (!code) return [];
  if (isPostgres()) {
    const { rows } = await getPool().query(
      `SELECT * FROM product_images WHERE stock_code = $1 ORDER BY sort_order ASC, id ASC`,
      [code]
    );
    return withViewUrls(rows.map(mapRow));
  }
  const rows = getSqliteDb()
    .prepare(
      `SELECT * FROM product_images WHERE stock_code = ? ORDER BY sort_order ASC, id ASC`
    )
    .all(code) as Row[];
  return withViewUrls(rows.map(mapRow));
}

export async function listImagesForStockCodes(
  stockCodes: string[]
): Promise<Map<string, ProductImage[]>> {
  const map = new Map<string, ProductImage[]>();
  if (stockCodes.length === 0) return map;

  if (isPostgres()) {
    const { rows } = await getPool().query(
      `SELECT * FROM product_images
       WHERE stock_code = ANY($1::text[])
       ORDER BY sort_order ASC, id ASC`,
      [stockCodes]
    );
    const images = await withViewUrls(rows.map(mapRow));
    for (const img of images) {
      const list = map.get(img.stockCode) ?? [];
      list.push(img);
      map.set(img.stockCode, list);
    }
    return map;
  }

  const placeholders = stockCodes.map(() => "?").join(",");
  const rows = getSqliteDb()
    .prepare(
      `SELECT * FROM product_images
       WHERE stock_code IN (${placeholders})
       ORDER BY sort_order ASC, id ASC`
    )
    .all(...stockCodes) as Row[];
  const images = await withViewUrls(rows.map(mapRow));
  for (const img of images) {
    const list = map.get(img.stockCode) ?? [];
    list.push(img);
    map.set(img.stockCode, list);
  }
  return map;
}

export async function listAllProductImages(): Promise<ProductImage[]> {
  if (isPostgres()) {
    const { rows } = await getPool().query(
      `SELECT * FROM product_images ORDER BY stock_code ASC, sort_order ASC, id ASC`
    );
    return rows.map(mapRow);
  }
  const rows = getSqliteDb()
    .prepare(`SELECT * FROM product_images ORDER BY stock_code ASC, sort_order ASC, id ASC`)
    .all() as Row[];
  return rows.map(mapRow);
}

/** Excel "replace" akışı: cascade ile silinen resim kayıtlarını,
 *  yeni katalogda hâlâ var olan ürünlere geri bağlar. */
export async function restoreProductImages(images: ProductImage[]): Promise<void> {
  if (images.length === 0) return;
  if (isPostgres()) {
    const pool = getPool();
    for (const img of images) {
      await pool.query(
        `INSERT INTO product_images (stock_code, object_key, url, sort_order)
         VALUES ($1, $2, $3, $4)
         ON CONFLICT (object_key) DO NOTHING`,
        [img.stockCode, img.objectKey, img.url, img.sortOrder]
      );
    }
    return;
  }
  const stmt = getSqliteDb().prepare(
    `INSERT OR IGNORE INTO product_images (stock_code, object_key, url, sort_order)
     VALUES (?, ?, ?, ?)`
  );
  for (const img of images) {
    stmt.run(img.stockCode, img.objectKey, img.url, img.sortOrder);
  }
}

export async function createProductImage(input: ProductImageInput): Promise<ProductImage> {
  const stockCode = input.stockCode.trim();
  const objectKey = input.objectKey.trim();
  const url = input.url.trim();
  if (!stockCode) throw new Error("Stok kodu gerekli.");
  if (!objectKey) throw new Error("objectKey gerekli.");
  if (!url) throw new Error("url gerekli.");
  if (!objectKey.startsWith(`products/`)) {
    throw new Error("Geçersiz objectKey.");
  }

  if (isPostgres()) {
    const { rows } = await getPool().query(
      `INSERT INTO product_images (stock_code, object_key, url, sort_order)
       VALUES (
         $1, $2, $3,
         COALESCE((SELECT MAX(sort_order) + 1 FROM product_images WHERE stock_code = $1), 0)
       )
       RETURNING *`,
      [stockCode, objectKey, url]
    );
    const [image] = await withViewUrls([mapRow(rows[0])]);
    return image;
  }

  const db = getSqliteDb();
  const maxRow = db
    .prepare(`SELECT MAX(sort_order) AS m FROM product_images WHERE stock_code = ?`)
    .get(stockCode) as { m: number | null } | undefined;
  const sortOrder = (maxRow?.m ?? -1) + 1;
  const result = db
    .prepare(
      `INSERT INTO product_images (stock_code, object_key, url, sort_order)
       VALUES (?, ?, ?, ?)`
    )
    .run(stockCode, objectKey, url, sortOrder);
  const row = db
    .prepare(`SELECT * FROM product_images WHERE id = ?`)
    .get(result.lastInsertRowid) as Row;
  const [image] = await withViewUrls([mapRow(row)]);
  return image;
}

export async function deleteProductImage(id: number): Promise<void> {
  let objectKey: string | null = null;

  if (isPostgres()) {
    const { rows } = await getPool().query(
      `DELETE FROM product_images WHERE id = $1 RETURNING object_key`,
      [id]
    );
    objectKey = rows[0] ? String(rows[0].object_key) : null;
  } else {
    const row = getSqliteDb()
      .prepare(`SELECT object_key FROM product_images WHERE id = ?`)
      .get(id) as Row | undefined;
    if (!row) throw new Error("Resim bulunamadı.");
    objectKey = String(row.object_key);
    getSqliteDb().prepare(`DELETE FROM product_images WHERE id = ?`).run(id);
  }

  if (!objectKey) throw new Error("Resim bulunamadı.");
  try {
    await deleteObject(objectKey);
  } catch {
    /* DB kaydı silindi; depo temizliği başarısız olsa da devam */
  }
}

export async function deleteImagesForStockCode(stockCode: string): Promise<void> {
  const images = await listImagesForStockCode(stockCode);
  if (isPostgres()) {
    await getPool().query(`DELETE FROM product_images WHERE stock_code = $1`, [stockCode]);
  } else {
    getSqliteDb().prepare(`DELETE FROM product_images WHERE stock_code = ?`).run(stockCode);
  }
  await Promise.all(
    images.map(async (img) => {
      try {
        await deleteObject(img.objectKey);
      } catch {
        /* ignore */
      }
    })
  );
}
