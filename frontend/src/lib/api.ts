import type { HealthStatus, SearchBy, SearchResult } from "@/types/product";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";

function apiErrorMessage(err: unknown, status?: number): string {
  if (err instanceof TypeError && /fetch|network/i.test(String(err))) {
    return "Sunucuya ulaşılamıyor. API adresini ve internet bağlantısını kontrol edin.";
  }
  if (status === 502 || status === 503) {
    return "Sunucu geçici olarak kullanılamıyor.";
  }
  return err instanceof Error ? err.message : "Beklenmeyen bir hata oluştu.";
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  let res: Response;
  try {
    res = await fetch(`${API_URL}${path}`, init);
  } catch (err) {
    throw new Error(apiErrorMessage(err));
  }

  const body = await res.json().catch(() => ({}));

  if (!res.ok) {
    const message =
      typeof body.error === "string"
        ? body.error
        : apiErrorMessage(null, res.status);
    throw new Error(message);
  }

  return body as T;
}

export function getHealth(): Promise<HealthStatus> {
  return request<HealthStatus>("/api/health");
}

export async function searchProducts(by: SearchBy, q: string): Promise<SearchResult> {
  const params = new URLSearchParams({ by, q });
  let res: Response;
  try {
    res = await fetch(`${API_URL}/api/products/search?${params}`);
  } catch (err) {
    throw new Error(apiErrorMessage(err));
  }

  const body = await res.json().catch(() => ({}));

  if (res.status === 404) {
    return {
      by,
      query: q,
      products: [],
      count: 0,
    };
  }

  if (!res.ok) {
    const message =
      typeof body.error === "string"
        ? body.error
        : apiErrorMessage(null, res.status);
    throw new Error(message);
  }

  return body as SearchResult;
}
