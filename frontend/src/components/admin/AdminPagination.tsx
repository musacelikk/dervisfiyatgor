"use client";

import {
  PAGE_SIZE_OPTIONS,
  type PageSizeOption,
} from "@/lib/permissions";

interface AdminPaginationProps {
  page: number;
  totalPages: number;
  total: number;
  pageSize: PageSizeOption;
  onPageChange: (page: number) => void;
  onPageSizeChange: (size: PageSizeOption) => void;
}

function pageSizeLabel(size: PageSizeOption): string {
  return size === "all" ? "Tümü" : String(size);
}

export default function AdminPagination({
  page,
  totalPages,
  total,
  pageSize,
  onPageChange,
  onPageSizeChange,
}: AdminPaginationProps) {
  const showPager = pageSize !== "all" && totalPages > 1;

  return (
    <nav className="admin-pagination" aria-label="Sayfalama">
      <div className="admin-pagination-size">
        <label htmlFor="page-size" className="text-sm text-zinc-600">
          Sayfa başına
        </label>
        <select
          id="page-size"
          value={pageSize}
          onChange={(e) => onPageSizeChange(e.target.value as PageSizeOption)}
          className="admin-select"
        >
          {PAGE_SIZE_OPTIONS.map((size) => (
            <option key={size} value={size}>
              {pageSizeLabel(size)}
            </option>
          ))}
        </select>
      </div>

      <div className="admin-pagination-info text-sm text-zinc-600">
        {pageSize === "all" ? (
          <>
            <strong>{total.toLocaleString("tr-TR")}</strong> kayıt gösteriliyor
          </>
        ) : showPager ? (
          <>
            Sayfa <strong>{page}</strong> / {totalPages}
            <span className="text-zinc-400"> · </span>
            <strong>{total.toLocaleString("tr-TR")}</strong> kayıt
          </>
        ) : (
          <>
            <strong>{total.toLocaleString("tr-TR")}</strong> kayıt
          </>
        )}
      </div>

      {showPager && (
        <div className="admin-pagination-nav">
          <button
            type="button"
            disabled={page <= 1}
            onClick={() => onPageChange(page - 1)}
            className="admin-pagination-btn"
          >
            Önceki
          </button>
          <button
            type="button"
            disabled={page >= totalPages}
            onClick={() => onPageChange(page + 1)}
            className="admin-pagination-btn"
          >
            Sonraki
          </button>
        </div>
      )}
    </nav>
  );
}
