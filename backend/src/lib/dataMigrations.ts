import { getPool, isPostgres } from "./database";
import { db as getSqliteDb } from "../services/db-sqlite";
import { isFlagSet, setFlag } from "../services/settings";
import { parsePermissions, serializePermissions } from "./permissions";

/** "Satış 2 görüntüleme" ayrı bir yetki oldu. Yetki eklenmeden önce herkes 2. satış
 *  fiyatını görüyordu; kimsenin görünürlüğü sessizce kaybolmasın diye mevcut
 *  personellere bir kez otomatik verilir. Sonrasında admin tek tek kapatabilir. */
const SALE2_FLAG = "prices_sale2_granted";

async function loadPermissionRows(): Promise<{ id: number; permissions: string }[]> {
  if (isPostgres()) {
    const { rows } = await getPool().query(`SELECT id, permissions FROM employees`);
    return rows.map((r) => ({ id: Number(r.id), permissions: String(r.permissions ?? "") }));
  }
  const rows = getSqliteDb().prepare(`SELECT id, permissions FROM employees`).all() as {
    id: number;
    permissions: string | null;
  }[];
  return rows.map((r) => ({ id: r.id, permissions: r.permissions ?? "" }));
}

async function savePermissions(id: number, permissions: string): Promise<void> {
  if (isPostgres()) {
    await getPool().query(`UPDATE employees SET permissions = $1 WHERE id = $2`, [
      permissions,
      id,
    ]);
    return;
  }
  getSqliteDb().prepare(`UPDATE employees SET permissions = ? WHERE id = ?`).run(permissions, id);
}

async function grantSale2ToExistingEmployees(): Promise<number> {
  if (await isFlagSet(SALE2_FLAG)) return 0;

  let updated = 0;
  for (const row of await loadPermissionRows()) {
    const current = parsePermissions(row.permissions);
    if (current.includes("prices.sale2")) continue;
    await savePermissions(row.id, serializePermissions([...current, "prices.sale2"]));
    updated++;
  }
  await setFlag(SALE2_FLAG);
  return updated;
}

/** Şema dışı, veri düzeyindeki tek seferlik taşımalar. Açılışta bir kez çalışır. */
export async function runDataMigrations(): Promise<void> {
  try {
    const granted = await grantSale2ToExistingEmployees();
    if (granted > 0) {
      console.log(`Veri taşıma: ${granted} personele "Satış 2 görüntüleme" yetkisi verildi.`);
    }
  } catch (err) {
    console.error("Veri taşıma hatası:", err);
  }
}
