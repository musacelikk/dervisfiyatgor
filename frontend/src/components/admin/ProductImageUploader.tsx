"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { ProductImage } from "@/types/product";
import {
  deleteProductImageApi,
  fetchManagerProductImages,
  fetchProductImages,
  uploadProductImage,
} from "@/lib/product-images-api";

const MAX_FILE_MB = 10;
const MAX_FILE_BYTES = MAX_FILE_MB * 1024 * 1024;

type Props = {
  stockCode: string;
  mode?: "admin" | "employee";
  /** create modunda ürün henüz kaydedilmediyse false */
  enabled?: boolean;
};

export default function ProductImageUploader({
  stockCode,
  mode = "admin",
  enabled = true,
}: Props) {
  const [images, setImages] = useState<ProductImage[]>([]);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const code = stockCode.trim();
  const canUpload = enabled && code.length > 0;

  const load = useCallback(async () => {
    if (!canUpload) {
      setImages([]);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const list =
        mode === "employee"
          ? await fetchManagerProductImages(code)
          : await fetchProductImages(code);
      setImages(list);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Resimler yüklenemedi.");
    } finally {
      setLoading(false);
    }
  }, [canUpload, code, mode]);

  useEffect(() => {
    void load();
  }, [load]);

  const handleFiles = async (files: FileList | null) => {
    if (!files?.length) return;
    if (!canUpload) {
      setError("Önce stok kodunu yazıp ürünü kaydedin.");
      return;
    }

    // Yüklemeye başlamadan önce hepsini doğrula: kısmi yükleme yaşanmasın
    const list = Array.from(files);
    for (const file of list) {
      if (!file.type.startsWith("image/")) {
        setError(`"${file.name}" resim dosyası değil.`);
        if (inputRef.current) inputRef.current.value = "";
        return;
      }
      if (file.size > MAX_FILE_BYTES) {
        setError(`"${file.name}" çok büyük (en fazla ${MAX_FILE_MB} MB olabilir).`);
        if (inputRef.current) inputRef.current.value = "";
        return;
      }
    }

    setUploading(true);
    setError(null);
    try {
      for (const file of list) {
        await uploadProductImage({ stockCode: code, file, mode });
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Yükleme başarısız.");
    } finally {
      // Kısmi başarıda da yüklenenler görünsün
      await load();
      setUploading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm("Bu resim silinsin mi?")) return;
    try {
      await deleteProductImageApi(id, mode);
      setImages((prev) => prev.filter((img) => img.id !== id));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Silinemedi.");
    }
  };

  return (
    <div className="product-image-uploader">
      <div className="flex items-center justify-between gap-2">
        <label className="admin-label mb-0">Ürün resimleri</label>
        <button
          type="button"
          className="admin-btn-secondary text-xs"
          disabled={!canUpload || uploading}
          onClick={() => inputRef.current?.click()}
        >
          {uploading ? "Yükleniyor…" : "+ Resim yükle"}
        </button>
        <input
          ref={inputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp,image/gif"
          multiple
          className="hidden"
          onChange={(e) => void handleFiles(e.target.files)}
        />
      </div>

      {!canUpload && (
        <p className="mt-2 text-xs text-zinc-500">
          Resim yüklemek için önce stok kodunu girip ürünü kaydedin, sonra düzenlemeden ekleyin.
        </p>
      )}

      {error && <p className="mt-2 text-sm text-red-600">{error}</p>}

      {loading ? (
        <p className="mt-3 text-xs text-zinc-500">Resimler yükleniyor…</p>
      ) : images.length > 0 ? (
        <div className="product-image-grid mt-3">
          {images.map((img) => (
            <div key={img.id} className="product-image-thumb">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={img.url} alt="" />
              <button
                type="button"
                className="product-image-remove"
                aria-label="Resmi sil"
                onClick={() => void handleDelete(img.id)}
              >
                ×
              </button>
            </div>
          ))}
        </div>
      ) : canUpload ? (
        <p className="mt-2 text-xs text-zinc-500">Henüz resim yok.</p>
      ) : null}
    </div>
  );
}
