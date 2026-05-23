export async function managerLogin(password: string): Promise<void> {
  const res = await fetch("/api/yonetici/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ password }),
  });

  const body = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(typeof body.error === "string" ? body.error : "Giriş başarısız.");
  }
}

export async function managerLogout(): Promise<void> {
  await fetch("/api/yonetici/logout", { method: "POST" });
}
