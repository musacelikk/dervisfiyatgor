import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { ADMIN_COOKIE, isValidAdminToken } from "@/lib/admin-session";
import { adminBackendFetch } from "@/lib/admin-backend";

/** Admin oturumunu doğrulayıp isteği backend'e iletir, JSON yanıtı döner. */
export async function adminProxyJson(
  path: string,
  init?: { method?: string; body?: unknown },
  errorFallback = "İstek başarısız."
): Promise<NextResponse> {
  const session = (await cookies()).get(ADMIN_COOKIE)?.value;
  if (!(await isValidAdminToken(session))) {
    return NextResponse.json({ error: "Oturum gerekli." }, { status: 401 });
  }

  try {
    const data = await adminBackendFetch<Record<string, unknown>>(path, {
      method: init?.method ?? "GET",
      ...(init?.body !== undefined
        ? {
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(init.body),
          }
        : {}),
    });
    return NextResponse.json(data);
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : errorFallback },
      { status: 400 }
    );
  }
}
