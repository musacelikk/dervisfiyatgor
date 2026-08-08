import { getPool, isPostgres } from "../lib/database";
import { db as getSqliteDb } from "./db-sqlite";

export type ProductCategory = {
  id: number;
  name: string;
  sortOrder: number;
  /** Kategoriye bağlı ürün sayısı (listelemede doldurulur). */
  productCount?: number;
};

const NAME_MAX = 60;

function normalizeName(raw: unknown): string {
  const name = typeof raw === "string" ? raw.trim().replace(/\s+/g, " ") : "";
  if (name.length < 2) throw new Error("Kategori adı en az 2 karakter olmalı.");
  if (name.length > NAME_MAX) throw new Error(`Kategori adı en fazla ${NAME_MAX} karakter olabilir.`);
  return name;
}

function mapRow(row: Record<string, unknown>): ProductCategory {
  return {
    id: Number(row.id),
    name: String(row.name),
    sortOrder: Number(row.sort_order ?? 0),
    productCount: row.product_count == null ? undefined : Number(row.product_count),
  };
}

/** Ürün sayılarıyla birlikte tüm kategoriler. */
export async function listCategories(): Promise<ProductCategory[]> {
  const sql = `
    SELECT c.id, c.name, c.sort_order,
           COUNT(m.stock_code) AS product_count
    FROM product_categories c
    LEFT JOIN product_category_map m ON m.category_id = c.id
    GROUP BY c.id, c.name, c.sort_order
  `;
  const rows = isPostgres()
    ? (await getPool().query(sql)).rows
    : (getSqliteDb().prepare(sql).all() as Record<string, unknown>[]);
  return rows
    .map(mapRow)
    .sort((a, b) => a.sortOrder - b.sortOrder || a.name.localeCompare(b.name, "tr"));
}

/** SQLite'ın NOCASE'i yalnızca ASCII harfleri katlar ("Ürün" ≠ "ürün"). Karşılaştırma
 *  bu yüzden Türkçe kurallarıyla JS tarafında yapılır — iki veritabanında da aynı davranır. */
function foldName(name: string): string {
  return name.trim().replace(/\s+/g, " ").toLocaleLowerCase("tr");
}

async function findByName(name: string, excludeId?: number): Promise<ProductCategory | null> {
  const target = foldName(name);
  const all = await listCategories();
  return (
    all.find((c) => c.id !== excludeId && foldName(c.name) === target) ?? null
  );
}

export async function getCategory(id: number): Promise<ProductCategory | null> {
  if (isPostgres()) {
    const { rows } = await getPool().query(
      `SELECT id, name, sort_order FROM product_categories WHERE id = $1`,
      [id]
    );
    return rows[0] ? mapRow(rows[0]) : null;
  }
  const row = getSqliteDb()
    .prepare(`SELECT id, name, sort_order FROM product_categories WHERE id = ?`)
    .get(id) as Record<string, unknown> | undefined;
  return row ? mapRow(row) : null;
}

export async function createCategory(rawName: string): Promise<ProductCategory> {
  const name = normalizeName(rawName);
  if (await findByName(name)) throw new Error("Bu kategori zaten var.");

  if (isPostgres()) {
    const { rows } = await getPool().query(
      `INSERT INTO product_categories (name, sort_order)
       VALUES ($1, COALESCE((SELECT MAX(sort_order) + 1 FROM product_categories), 0))
       RETURNING id, name, sort_order`,
      [name]
    );
    return mapRow(rows[0]);
  }

  const next = getSqliteDb()
    .prepare(`SELECT COALESCE(MAX(sort_order) + 1, 0) AS next FROM product_categories`)
    .get() as { next: number };
  const result = getSqliteDb()
    .prepare(`INSERT INTO product_categories (name, sort_order) VALUES (?, ?)`)
    .run(name, next.next);
  const created = await getCategory(Number(result.lastInsertRowid));
  if (!created) throw new Error("Kategori oluşturulamadı.");
  return created;
}

export async function renameCategory(id: number, rawName: string): Promise<ProductCategory> {
  const name = normalizeName(rawName);
  const existing = await getCategory(id);
  if (!existing) throw new Error("Kategori bulunamadı.");
  if (await findByName(name, id)) throw new Error("Bu kategori zaten var.");

  if (isPostgres()) {
    await getPool().query(`UPDATE product_categories SET name = $1 WHERE id = $2`, [name, id]);
  } else {
    getSqliteDb().prepare(`UPDATE product_categories SET name = ? WHERE id = ?`).run(name, id);
  }
  return { ...existing, name };
}

/** Kategori silinir; ürünler silinmez, yalnızca bağlantıları kaldırılır. */
export async function deleteCategory(id: number): Promise<ProductCategory> {
  const existing = await getCategory(id);
  if (!existing) throw new Error("Kategori bulunamadı.");

  if (isPostgres()) {
    await getPool().query(`DELETE FROM product_category_map WHERE category_id = $1`, [id]);
    await getPool().query(`DELETE FROM product_categories WHERE id = $1`, [id]);
  } else {
    getSqliteDb().prepare(`DELETE FROM product_category_map WHERE category_id = ?`).run(id);
    getSqliteDb().prepare(`DELETE FROM product_categories WHERE id = ?`).run(id);
  }
  return existing;
}

/* ————————————————— Ürün ↔ kategori bağlantıları ————————————————— */

/** Verilen stok kodları için kategori listesi (bir ürün birden fazla kategoride olabilir). */
export async function listCategoriesForStockCodes(
  stockCodes: string[]
): Promise<Map<string, ProductCategory[]>> {
  const out = new Map<string, ProductCategory[]>();
  if (stockCodes.length === 0) return out;

  let rows: Record<string, unknown>[];
  if (isPostgres()) {
    const result = await getPool().query(
      `SELECT m.stock_code, c.id, c.name, c.sort_order
       FROM product_category_map m
       JOIN product_categories c ON c.id = m.category_id
       WHERE m.stock_code = ANY($1::text[])`,
      [stockCodes]
    );
    rows = result.rows;
  } else {
    const placeholders = stockCodes.map(() => "?").join(", ");
    rows = getSqliteDb()
      .prepare(
        `SELECT m.stock_code, c.id, c.name, c.sort_order
         FROM product_category_map m
         JOIN product_categories c ON c.id = m.category_id
         WHERE m.stock_code IN (${placeholders})`
      )
      .all(...stockCodes) as Record<string, unknown>[];
  }

  for (const row of rows) {
    const code = String(row.stock_code);
    const list = out.get(code) ?? [];
    list.push(mapRow(row));
    out.set(code, list);
  }
  for (const list of out.values()) {
    list.sort((a, b) => a.sortOrder - b.sortOrder || a.name.localeCompare(b.name, "tr"));
  }
  return out;
}

export async function getCategoryIdsForProduct(stockCode: string): Promise<number[]> {
  const map = await listCategoriesForStockCodes([stockCode]);
  return (map.get(stockCode) ?? []).map((c) => c.id);
}

/** Ürünün kategorilerini verilen listeyle değiştirir. */
export async function setProductCategories(
  stockCode: string,
  categoryIds: number[]
): Promise<number[]> {
  const valid = new Set((await listCategories()).map((c) => c.id));
  const unique = [...new Set(categoryIds.map(Number))].filter(
    (id) => Number.isInteger(id) && valid.has(id)
  );

  if (isPostgres()) {
    const client = await getPool().connect();
    try {
      await client.query("BEGIN");
      await client.query(`DELETE FROM product_category_map WHERE stock_code = $1`, [stockCode]);
      if (unique.length > 0) {
        await client.query(
          `INSERT INTO product_category_map (stock_code, category_id)
           SELECT $1, unnest($2::int[])
           ON CONFLICT DO NOTHING`,
          [stockCode, unique]
        );
      }
      await client.query("COMMIT");
    } catch (err) {
      await client.query("ROLLBACK");
      throw err;
    } finally {
      client.release();
    }
    return unique;
  }

  const db = getSqliteDb();
  const tx = db.transaction((codes: number[]) => {
    db.prepare(`DELETE FROM product_category_map WHERE stock_code = ?`).run(stockCode);
    const insert = db.prepare(
      `INSERT OR IGNORE INTO product_category_map (stock_code, category_id) VALUES (?, ?)`
    );
    for (const id of codes) insert.run(stockCode, id);
  });
  tx(unique);
  return unique;
}

/** Kategoriye bağlı stok kodları — katalog filtresinde kullanılır. */
export async function stockCodesInCategory(categoryId: number): Promise<string[]> {
  if (isPostgres()) {
    const { rows } = await getPool().query(
      `SELECT stock_code FROM product_category_map WHERE category_id = $1`,
      [categoryId]
    );
    return rows.map((r) => String(r.stock_code));
  }
  const rows = getSqliteDb()
    .prepare(`SELECT stock_code FROM product_category_map WHERE category_id = ?`)
    .all(categoryId) as { stock_code: string }[];
  return rows.map((r) => r.stock_code);
}
