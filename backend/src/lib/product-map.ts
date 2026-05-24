import type { Product, ProductRow } from "../types/product";

export function rowToProduct(row: ProductRow): Product {
  return {
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
}
