const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";

export type BackendActor = {
  type: "admin" | "employee";
  id?: string | number;
  name?: string;
};

function buildActorHeaders(actor?: BackendActor): Record<string, string> {
  const type = actor?.type ?? "admin";
  const headers: Record<string, string> = {
    "X-Actor-Type": type,
  };
  if (actor?.id != null) headers["X-Actor-Id"] = String(actor.id);
  if (actor?.name) {
    headers["X-Actor-Name"] = encodeURIComponent(actor.name);
  } else if (type === "admin") {
    headers["X-Actor-Name"] = encodeURIComponent("Yönetici");
  }
  return headers;
}

export type AdminBackendInit = RequestInit & {
  actor?: BackendActor;
};

export async function adminBackendFetch<T>(
  path: string,
  init?: AdminBackendInit
): Promise<T> {
  const secret = process.env.ADMIN_SECRET;
  if (!secret) {
    throw new Error("ADMIN_SECRET tanımlı değil.");
  }

  const { actor, ...fetchInit } = init ?? {};

  let res: Response;
  try {
    res = await fetch(`${API_URL}${path}`, {
      ...fetchInit,
      headers: {
        "X-Admin-Key": secret,
        ...buildActorHeaders(actor),
        ...(fetchInit.headers ?? {}),
      },
    });
  } catch {
    throw new Error(
      `Backend'e bağlanılamadı (${API_URL}). backend klasöründe "npm run dev" çalıştırın.`
    );
  }

  const body = await res.json().catch(() => ({}));
  if (!res.ok) {
    let message =
      typeof body.error === "string" ? body.error : `İstek başarısız (${res.status})`;
    if (res.status === 401 && message === "Yetkisiz erişim.") {
      message =
        "Yetkisiz erişim. frontend .env.local içindeki ADMIN_SECRET, backend .env ile aynı olmalı. Değiştirdikten sonra frontend'i yeniden başlatın.";
    }
    throw new Error(message);
  }

  return body as T;
}
