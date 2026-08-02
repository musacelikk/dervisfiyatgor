"use client";

import { useCallback, useEffect, useState } from "react";
import BrandLogo from "@/components/BrandLogo";
import {
  fetchShiftMe,
  shiftCheckIn,
  shiftLoginWithCode,
  shiftLoginWithPassword,
} from "@/lib/shift-api";
import {
  clearShiftSession,
  readCachedShiftEmployee,
  readShiftToken,
  writeCachedShiftEmployee,
  writeShiftToken,
} from "@/lib/shift-token";
import type { ShiftEmployee, ShiftEntry } from "@/types/shift";

type Screen = "loading" | "login" | "ready";
type LoginMode = "code" | "credentials";
type ActionStatus = "idle" | "locating" | "checking";

function formatHm(iso: string): string {
  try {
    return new Date(iso).toLocaleTimeString("tr-TR", {
      hour: "2-digit",
      minute: "2-digit",
      timeZone: "Europe/Istanbul",
    });
  } catch {
    return iso;
  }
}

function geolocationErrorMessage(err: GeolocationPositionError): string {
  switch (err.code) {
    case err.PERMISSION_DENIED:
      return "Konum izni verilmedi. Mesaiye başlamak için tarayıcı ayarlarından konum iznini açın.";
    case err.POSITION_UNAVAILABLE:
      return "Konum alınamadı. GPS/konum servislerinin açık olduğundan emin olun.";
    case err.TIMEOUT:
      return "Konum alma zaman aşımına uğradı. Tekrar deneyin.";
    default:
      return "Konum alınamadı.";
  }
}

function getPosition(): Promise<GeolocationPosition> {
  return new Promise((resolve, reject) => {
    if (!("geolocation" in navigator)) {
      reject(new Error("Bu cihaz konum bilgisini desteklemiyor."));
      return;
    }
    navigator.geolocation.getCurrentPosition(resolve, reject, {
      enableHighAccuracy: true,
      timeout: 15000,
      maximumAge: 0,
    });
  });
}

export default function ShiftScreen() {
  const [screen, setScreen] = useState<Screen>("loading");
  const [loginMode, setLoginMode] = useState<LoginMode>("code");
  const [employee, setEmployee] = useState<ShiftEmployee | null>(null);
  const [todayEntry, setTodayEntry] = useState<ShiftEntry | null>(null);

  const [code, setCode] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loginLoading, setLoginLoading] = useState(false);
  const [loginError, setLoginError] = useState<string | null>(null);

  const [actionStatus, setActionStatus] = useState<ActionStatus>("idle");
  const [actionError, setActionError] = useState<string | null>(null);
  const [actionMessage, setActionMessage] = useState<string | null>(null);

  useEffect(() => {
    const token = readShiftToken();
    const cached = readCachedShiftEmployee();
    if (!token) {
      setScreen("login");
      return;
    }
    // Önbellekteki personel varsa ekranı anında göster (tekrar giriş istemez),
    // ardından arka planda token'ı ve bugünkü kaydı doğrula.
    if (cached) {
      setEmployee(cached);
      setScreen("ready");
    }
    fetchShiftMe()
      .then((res) => {
        setEmployee(res.employee);
        writeCachedShiftEmployee(res.employee);
        setTodayEntry(res.todayEntry);
        setScreen("ready");
      })
      .catch((err) => {
        const status = (err as { status?: number }).status;
        if (status === 401) {
          clearShiftSession();
          setEmployee(null);
          setScreen("login");
          return;
        }
        // Bağlantı sorunu: önbellekteki ekranda kal, buton yine denenebilir.
        if (!cached) setScreen("login");
      });
  }, []);

  const handleCodeLogin = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginLoading(true);
    setLoginError(null);
    try {
      const res = await shiftLoginWithCode(code.trim());
      writeShiftToken(res.token);
      writeCachedShiftEmployee(res.employee);
      setEmployee(res.employee);
      setTodayEntry(null);
      setScreen("ready");
    } catch (err) {
      setLoginError(err instanceof Error ? err.message : "Giriş başarısız.");
    } finally {
      setLoginLoading(false);
    }
  }, [code]);

  const handleCredentialsLogin = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginLoading(true);
    setLoginError(null);
    try {
      const res = await shiftLoginWithPassword(username.trim(), password);
      writeShiftToken(res.token);
      writeCachedShiftEmployee(res.employee);
      setEmployee(res.employee);
      setTodayEntry(null);
      setScreen("ready");
    } catch (err) {
      setLoginError(err instanceof Error ? err.message : "Giriş başarısız.");
    } finally {
      setLoginLoading(false);
    }
  }, [username, password]);

  const handleStart = useCallback(async () => {
    setActionError(null);
    setActionMessage(null);
    setActionStatus("locating");
    try {
      const pos = await getPosition();
      setActionStatus("checking");
      const result = await shiftCheckIn(pos.coords.latitude, pos.coords.longitude);
      setTodayEntry(result.entry);
      setActionMessage(
        result.alreadyStarted
          ? `Bugün zaten mesaidesiniz (${formatHm(result.entry.checkInAt)}'den beri).`
          : "Mesai başladı, iyi çalışmalar! 🎉"
      );
    } catch (err) {
      const isGeoError =
        err !== null &&
        typeof err === "object" &&
        "code" in err &&
        typeof (err as { code: unknown }).code === "number" &&
        (err as { code: number }).code >= 1 &&
        (err as { code: number }).code <= 3 &&
        !(err instanceof Error);
      if (isGeoError) {
        setActionError(geolocationErrorMessage(err as GeolocationPositionError));
      } else {
        setActionError(err instanceof Error ? err.message : "Mesai başlatılamadı.");
      }
    } finally {
      setActionStatus("idle");
    }
  }, []);

  if (screen === "loading") {
    return (
      <div className="shift-shell">
        <div className="shift-loading">
          <BrandLogo size="lg" priority />
        </div>
      </div>
    );
  }

  if (screen === "login") {
    return (
      <div className="shift-shell">
        <div className="shift-wrap">
          <div className="shift-brand">
            <BrandLogo size="lg" priority />
            <p className="shift-brand-tag">Mesai girişi</p>
          </div>

          <div className="shift-card">
            {loginMode === "code" ? (
              <form onSubmit={handleCodeLogin} className="shift-form">
                <label className="shift-label">4 haneli mesai ID&apos;niz</label>
                <input
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  maxLength={4}
                  autoFocus
                  value={code}
                  onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 4))}
                  className="shift-code-input"
                  placeholder="••••"
                  autoComplete="off"
                />
                {loginError && <p className="shift-error">{loginError}</p>}
                <button
                  type="submit"
                  disabled={loginLoading || code.length !== 4}
                  className="shift-btn-primary"
                >
                  {loginLoading ? "Kontrol ediliyor…" : "Giriş yap"}
                </button>
                <button
                  type="button"
                  className="shift-link"
                  onClick={() => {
                    setLoginMode("credentials");
                    setLoginError(null);
                  }}
                >
                  Kullanıcı adı ve şifre ile giriş
                </button>
              </form>
            ) : (
              <form onSubmit={handleCredentialsLogin} className="shift-form">
                <label className="shift-label">Kullanıcı adı</label>
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="shift-text-input"
                  autoComplete="username"
                  autoFocus
                  required
                />
                <label className="shift-label">Şifre</label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="shift-text-input"
                  autoComplete="current-password"
                  required
                />
                {loginError && <p className="shift-error">{loginError}</p>}
                <button
                  type="submit"
                  disabled={loginLoading || !username || !password}
                  className="shift-btn-primary"
                >
                  {loginLoading ? "Kontrol ediliyor…" : "Giriş yap"}
                </button>
                <button
                  type="button"
                  className="shift-link"
                  onClick={() => {
                    setLoginMode("code");
                    setLoginError(null);
                  }}
                >
                  4 haneli ID ile giriş
                </button>
              </form>
            )}
          </div>
        </div>
      </div>
    );
  }

  const honorificSuffix = employee?.honorific ? ` ${employee.honorific}` : "";
  const checkedIn = Boolean(todayEntry?.checkInAt);
  const checkedOut = Boolean(todayEntry?.checkOutAt);
  const busy = actionStatus !== "idle";

  return (
    <div className="shift-shell">
      <div className="shift-wrap">
        <div className="shift-brand">
          <BrandLogo size="lg" priority />
        </div>

        <div className="shift-card shift-card-welcome">
          <p className="shift-welcome-eyebrow">Hoş geldin</p>
          <h1 className="shift-welcome-name">
            {employee?.name}
            {honorificSuffix}
          </h1>

          {checkedIn && (
            <div className={`shift-status ${checkedOut ? "shift-status-done" : "shift-status-active"}`}>
              {checkedOut
                ? `Bugünkü mesai tamamlandı · ${formatHm(todayEntry!.checkInAt)} – ${formatHm(todayEntry!.checkOutAt!)}`
                : `Mesaidesiniz · ${formatHm(todayEntry!.checkInAt)}'den beri`}
            </div>
          )}

          {actionMessage && <p className="shift-message">{actionMessage}</p>}
          {actionError && <p className="shift-error">{actionError}</p>}

          <button
            type="button"
            onClick={handleStart}
            disabled={busy || checkedIn}
            className="shift-btn-primary shift-btn-large"
          >
            {actionStatus === "locating"
              ? "Konum alınıyor…"
              : actionStatus === "checking"
                ? "Kontrol ediliyor…"
                : checkedIn
                  ? "Bugün mesaidesiniz"
                  : "Mesaiye Başla"}
          </button>

          {!checkedIn && (
            <p className="shift-hint">Konum izni istenecek — dükkanda olduğunuzu doğrular.</p>
          )}
        </div>
      </div>
    </div>
  );
}
