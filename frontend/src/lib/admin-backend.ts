import { cookies } from "next/headers";
import { ADMIN_COOKIE } from "@/lib/admin-session";
import { MANAGER_COOKIE, normalizeManagerToken } from "@/lib/manager-session";

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
  auth?: "admin" | "employee";
};

async function resolveSessionHeader(
  auth: "admin" | "employee"
): Promise<Record<string, string>> {
  const jar = await cookies();
  if (auth === "employee") {
    const token = normalizeManagerToken(jar.get(MANAGER_COOKIE)?.value);
    if (!token) {
      throw new Error("Oturum gerekli.");
    }
    return { "X-Employee-Session": token };
  }

  const token = jar.get(ADMIN_COOKIE)?.value;
  if (!token) {
    throw new Error("Oturum gerekli.");
  }
  return { "X-Admin-Session": token };
}

export async function adminBackendFetch<T>(
  path: string,
  init?: AdminBackendInit
): Promise<T> {
  const { actor, auth = "admin", ...fetchInit } = init ?? {};
  const sessionHeaders = await resolveSessionHeader(auth);

  let res: Response;
  try {
    res = await fetch(`${API_URL}${path}`, {
      ...fetchInit,
      headers: {
        ...sessionHeaders,
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
    const message =
      typeof body.error === "string" ? body.error : `İstek başarısız (${res.status})`;
    throw new Error(message);
  }

  return body as T;
}

export async function backendFetchWithSession(
  path: string,
  init: RequestInit & { auth: "admin" | "employee"; actor?: BackendActor }
): Promise<Response> {
  const { auth, actor, ...fetchInit } = init;
  const sessionHeaders = await resolveSessionHeader(auth);

  return fetch(`${API_URL}${path}`, {
    ...fetchInit,
    headers: {
      ...sessionHeaders,
      ...buildActorHeaders(actor),
      ...(fetchInit.headers ?? {}),
    },
  });
}
