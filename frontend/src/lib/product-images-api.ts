import type { ProductImage } from "@/types/product";

async function jsonFetch<T>(
  url: string,
  fallbackError: string,
  init?: RequestInit
): Promise<T> {
  const res = await fetch(url, init);
  const body = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(typeof body.error === "string" ? body.error : fallbackError);
  }
  return body as T;
}

export async function fetchProductImages(stockCode: string): Promise<ProductImage[]> {
  const code = stockCode.trim();
  if (!code) return [];
  const body = await jsonFetch<{ images: ProductImage[] }>(
    `/api/admin/product-images/${encodeURIComponent(code)}`,
    "Resimler yüklenemedi."
  );
  return body.images ?? [];
}

export async function fetchManagerProductImages(
  stockCode: string
): Promise<ProductImage[]> {
  const code = stockCode.trim();
  if (!code) return [];
  const body = await jsonFetch<{ images: ProductImage[] }>(
    `/api/yonetici/product-images/${encodeURIComponent(code)}`,
    "Resimler yüklenemedi."
  );
  return body.images ?? [];
}

export async function uploadProductImage(input: {
  stockCode: string;
  file: File;
  mode?: "admin" | "employee";
}): Promise<ProductImage> {
  const stockCode = input.stockCode.trim();
  if (!stockCode) {
    throw new Error("Stok kodu zorunlu.");
  }

  const base =
    input.mode === "employee" ? "/api/yonetici/product-images" : "/api/admin/product-images";

  const signed = await jsonFetch<{
    uploadUrl: string;
    objectKey: string;
    publicUrl: string;
  }>(`${base}/presign`, "Yükleme adresi alınamadı.", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      stockCode,
      contentType: input.file.type || "image/jpeg",
    }),
  });

  const put = await fetch(signed.uploadUrl, {
    method: "PUT",
    headers: {
      "Content-Type": input.file.type || "image/jpeg",
    },
    body: input.file,
  });
  if (!put.ok) {
    throw new Error("Dosya depoya yüklenemedi.");
  }

  const confirmed = await jsonFetch<{ image: ProductImage }>(
    `${base}/confirm`,
    "Resim kaydedilemedi.",
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        stockCode,
        objectKey: signed.objectKey,
        url: signed.publicUrl,
      }),
    }
  );
  return confirmed.image;
}

export async function deleteProductImageApi(
  id: number,
  mode: "admin" | "employee" = "admin"
): Promise<void> {
  const base =
    mode === "employee" ? "/api/yonetici/product-images" : "/api/admin/product-images";
  await jsonFetch(`${base}/by-id/${id}`, "Resim silinemedi.", { method: "DELETE" });
}
