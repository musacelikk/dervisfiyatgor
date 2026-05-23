import * as XLSX from "xlsx";
import {
  EXCEL_COLUMNS,
  EXCEL_COLUMN_ALIASES,
  OPTIONAL_EXCEL_COLUMNS,
  type ExcelColumnKey,
  type OptionalExcelColumnKey,
  type Product,
} from "../types/product";

type RequiredIndices = Record<ExcelColumnKey, number>;
type OptionalIndices = Partial<Record<OptionalExcelColumnKey, number>>;

function trimHeader(value: unknown): string {
  return String(value ?? "").trim();
}

function findColumnIndex(trimmed: string[], title: string): number {
  return trimmed.indexOf(title);
}

function findRequiredColumn(trimmed: string[], key: ExcelColumnKey): number {
  const aliases = EXCEL_COLUMN_ALIASES[key];
  const names = aliases ? [EXCEL_COLUMNS[key], ...aliases] : [EXCEL_COLUMNS[key]];
  for (const name of names) {
    const index = findColumnIndex(trimmed, name);
    if (index !== -1) return index;
  }
  return -1;
}

function buildColumnMaps(headers: unknown[]): {
  required: RequiredIndices;
  optional: OptionalIndices;
} | null {
  const trimmed = headers.map(trimHeader);
  const required = {} as Partial<RequiredIndices>;

  for (const key of Object.keys(EXCEL_COLUMNS) as ExcelColumnKey[]) {
    const index = findRequiredColumn(trimmed, key);
    if (index === -1) return null;
    required[key] = index;
  }

  const optional: OptionalIndices = {};
  for (const key of Object.keys(OPTIONAL_EXCEL_COLUMNS) as OptionalExcelColumnKey[]) {
    const index = findColumnIndex(trimmed, OPTIONAL_EXCEL_COLUMNS[key]);
    if (index !== -1) optional[key] = index;
  }

  return { required: required as RequiredIndices, optional };
}

function cellAt(row: unknown[], index: number | undefined): unknown {
  if (index === undefined) return undefined;
  return row[index];
}

function toStringOrNull(value: unknown): string | null {
  if (value === undefined || value === null || value === "") return null;
  const s = String(value).trim();
  return s || null;
}

function toBarcodeString(value: unknown): string | null {
  const s = toStringOrNull(value);
  if (!s) return null;
  if (/^\d+\.?\d*e\+?\d+$/i.test(s)) {
    return BigInt(Math.round(Number(s))).toString();
  }
  if (s.endsWith(".0") && /^\d+\.0$/.test(s)) {
    return s.slice(0, -2);
  }
  return s;
}

function toPriceOrNull(value: unknown): number | null {
  if (value === undefined || value === null || value === "") return null;
  if (typeof value === "number") {
    return Number.isFinite(value) ? value : null;
  }
  const cleaned = String(value).trim().replace(/\s/g, "").replace(",", ".");
  if (!cleaned) return null;
  const n = parseFloat(cleaned);
  return Number.isFinite(n) ? n : null;
}

function toQuantityOrNull(value: unknown): number | null {
  if (value === undefined || value === null || value === "") return null;
  if (typeof value === "number") {
    return Number.isFinite(value) ? value : null;
  }
  const cleaned = String(value).trim().replace(/\s/g, "").replace(",", ".");
  if (!cleaned) return null;
  const n = parseFloat(cleaned);
  return Number.isFinite(n) ? n : null;
}

function mapDataRow(
  row: unknown[],
  cols: { required: RequiredIndices; optional: OptionalIndices }
): Product | null {
  const stockCode = toStringOrNull(cellAt(row, cols.required.stockCode));
  if (!stockCode) return null;

  const name = toStringOrNull(cellAt(row, cols.required.name));
  if (!name) return null;

  const r = cols.required;
  const o = cols.optional;

  return {
    stockCode,
    name,
    unit: toStringOrNull(cellAt(row, r.unit)),
    barcode: toBarcodeString(cellAt(row, r.barcode)),
    salePrice1: toPriceOrNull(cellAt(row, r.salePrice1)),
    salePrice2: toPriceOrNull(cellAt(row, r.salePrice2)),
    purchasePrice1: toPriceOrNull(cellAt(row, o.purchasePrice1)),
    purchasePrice2: toPriceOrNull(cellAt(row, o.purchasePrice2)),
    remainingQty: toQuantityOrNull(cellAt(row, r.remainingQty)),
    description1: toStringOrNull(cellAt(row, r.description1)),
    description2: toStringOrNull(cellAt(row, r.description2)),
    group: toStringOrNull(cellAt(row, r.group)),
  };
}

export function parseExcelBuffer(buffer: Buffer): {
  products: Product[];
  skipped: number;
  totalRows: number;
} {
  const workbook = XLSX.read(buffer, { type: "buffer", cellDates: true });
  const sheetName = workbook.SheetNames[0];
  if (!sheetName) {
    throw new Error("Excel dosyasında sayfa bulunamadı.");
  }

  const sheet = workbook.Sheets[sheetName];
  const rows = XLSX.utils.sheet_to_json(sheet, {
    header: 1,
    defval: "",
    raw: false,
  }) as unknown[][];

  if (rows.length < 2) {
    return { products: [], skipped: 0, totalRows: 0 };
  }

  const cols = buildColumnMaps(rows[0]);
  if (!cols) {
    const expected = Object.values(EXCEL_COLUMNS).join(", ");
    throw new Error(
      `Excel başlıkları eşleşmedi. Beklenen kolonlar: ${expected} (Kalan Miktar veya Kalan Mikta)`
    );
  }

  const products: Product[] = [];
  let skipped = 0;

  for (let i = 1; i < rows.length; i++) {
    const row = rows[i];
    if (!row || row.every((c) => c === "" || c === null || c === undefined)) {
      continue;
    }

    const product = mapDataRow(row, cols);
    if (product) {
      products.push(product);
    } else {
      skipped += 1;
    }
  }

  return {
    products,
    skipped,
    totalRows: rows.length - 1,
  };
}

export function getExcelHeaders(buffer: Buffer): string[] {
  const workbook = XLSX.read(buffer, { type: "buffer" });
  const sheetName = workbook.SheetNames[0];
  if (!sheetName) return [];

  const sheet = workbook.Sheets[sheetName];
  const rows = XLSX.utils.sheet_to_json(sheet, {
    header: 1,
    defval: "",
  }) as unknown[][];

  const headerRow = rows[0];
  if (!headerRow) return [];

  return headerRow.map(trimHeader).filter(Boolean);
}
