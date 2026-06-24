"use client";

import { useCallback, useEffect, useId, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Html5Qrcode, Html5QrcodeSupportedFormats } from "html5-qrcode";
import ScannerFrame from "@/components/ScannerFrame";
import { readScannerFlashPref, writeScannerFlashPref } from "@/lib/scanner-flash";

interface BarcodeScannerProps {
  onScan: (barcode: string) => void | Promise<void>;
  variant?: "store" | "default";
  /** full: standart buton; icon: araç çubuğu ikonu */
  mode?: "full" | "icon";
}

const BARCODE_FORMATS = [
  Html5QrcodeSupportedFormats.EAN_13,
  Html5QrcodeSupportedFormats.EAN_8,
  Html5QrcodeSupportedFormats.UPC_A,
  Html5QrcodeSupportedFormats.UPC_E,
  Html5QrcodeSupportedFormats.CODE_128,
  Html5QrcodeSupportedFormats.CODE_39,
  Html5QrcodeSupportedFormats.CODE_93,
  Html5QrcodeSupportedFormats.ITF,
  Html5QrcodeSupportedFormats.CODABAR,
];

export default function BarcodeScanner({
  onScan,
  variant = "default",
  mode = "full",
}: BarcodeScannerProps) {
  const reactId = useId();
  const containerId = `barcode-scanner-${reactId.replace(/:/g, "")}`;
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const onScanRef = useRef(onScan);
  const scanLockRef = useRef(false);

  const [scanning, setScanning] = useState(false);
  const [starting, setStarting] = useState(false);
  const [resolving, setResolving] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [flashOn, setFlashOn] = useState(false);
  const [flashSupported, setFlashSupported] = useState(false);
  const [flashBusy, setFlashBusy] = useState(false);
  const [portalReady, setPortalReady] = useState(false);

  useEffect(() => {
    onScanRef.current = onScan;
  }, [onScan]);

  useEffect(() => {
    setPortalReady(true);
  }, []);

  useEffect(() => {
    setFlashOn(readScannerFlashPref());
  }, []);

  const stopScanner = useCallback(async () => {
    const scanner = scannerRef.current;
    if (!scanner) return;
    scannerRef.current = null;
    try {
      if (scanner.isScanning) await scanner.stop();
    } catch {
      /* already stopped */
    }
    try {
      scanner.clear();
    } catch {
      /* ignore */
    }
  }, []);

  const exitScanMode = useCallback(async () => {
    await stopScanner();
    setScanning(false);
    setStarting(false);
    setFlashSupported(false);
    scanLockRef.current = false;
  }, [stopScanner]);

  const applyTorch = useCallback(async (scanner: Html5Qrcode, enabled: boolean) => {
    try {
      const torch = scanner.getRunningTrackCameraCapabilities().torchFeature();
      if (!torch.isSupported()) {
        setFlashSupported(false);
        return;
      }

      setFlashSupported(true);
      await torch.apply(enabled);
      const active = torch.value() ?? enabled;
      setFlashOn(active);
      writeScannerFlashPref(active);
    } catch {
      setFlashSupported(false);
    }
  }, []);

  const toggleFlash = useCallback(async () => {
    const scanner = scannerRef.current;
    if (!scanner || !flashSupported || flashBusy || resolving) return;

    setFlashBusy(true);
    try {
      const torch = scanner.getRunningTrackCameraCapabilities().torchFeature();
      const next = !flashOn;
      await torch.apply(next);
      const active = torch.value() ?? next;
      setFlashOn(active);
      writeScannerFlashPref(active);
    } catch {
      /* ignore unsupported or transient torch errors */
    } finally {
      setFlashBusy(false);
    }
  }, [flashBusy, flashOn, flashSupported, resolving]);

  const handleDecoded = useCallback(
    async (decoded: string) => {
      const code = decoded.trim();
      if (!code || scanLockRef.current) return;

      scanLockRef.current = true;
      setResolving(true);
      try {
        await onScanRef.current(code);
      } finally {
        setResolving(false);
        await exitScanMode();
      }
    },
    [exitScanMode]
  );

  const openScanner = useCallback(async () => {
    if (scanning || starting) return;

    setCameraError(null);
    scanLockRef.current = false;
    setScanning(true);
    setStarting(true);

    await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));

    try {
      const scanner = new Html5Qrcode(containerId, {
        formatsToSupport: BARCODE_FORMATS,
        verbose: false,
      });
      scannerRef.current = scanner;

      await scanner.start(
        { facingMode: "environment" },
        {
          fps: 12,
          qrbox: (viewfinderWidth, viewfinderHeight) => {
            const w = Math.min(viewfinderWidth * 0.88, 320);
            const h = Math.min(viewfinderHeight * 0.38, 140);
            return { width: w, height: h };
          },
          aspectRatio: 1.777,
        },
        (text) => {
          void handleDecoded(text);
        },
        () => {}
      );

      if (scannerRef.current) {
        await applyTorch(scannerRef.current, readScannerFlashPref());
      }
    } catch (err) {
      await stopScanner();
      setScanning(false);
      const message = err instanceof Error ? err.message : "";
      if (/notallowed|permission/i.test(message)) {
        setCameraError("Kamera izni gerekli. Tarayıcı ayarlarından izin verin.");
      } else {
        setCameraError("Kamera açılamadı. Tekrar deneyin.");
      }
    } finally {
      setStarting(false);
    }
  }, [applyTorch, containerId, handleDecoded, scanning, starting, stopScanner]);

  useEffect(() => {
    if (!scanning) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [scanning]);

  useEffect(() => {
    return () => {
      void stopScanner();
    };
  }, [stopScanner]);

  const scannerOverlay =
    scanning && portalReady ? (
      <div
        className="barcode-scanner-overlay fixed inset-0 flex flex-col bg-zinc-950"
        role="dialog"
        aria-modal="true"
        aria-label="Barkod tarama"
      >
        <div className="relative min-h-0 flex-1 overflow-hidden">
          <div
            id={containerId}
            className="barcode-scanner-view barcode-scanner-preview absolute inset-0 z-0"
          />

          {!starting && !resolving && (
            <div className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center p-6">
              <div className="relative h-[38vw] max-h-40 w-[88%] max-w-sm">
                <span className="absolute left-0 top-0 h-8 w-8 rounded-tl-md border-l-[3px] border-t-[3px] border-[var(--scanner-green)]" />
                <span className="absolute right-0 top-0 h-8 w-8 rounded-tr-md border-r-[3px] border-t-[3px] border-[var(--scanner-green)]" />
                <span className="absolute bottom-0 left-0 h-8 w-8 rounded-bl-md border-b-[3px] border-l-[3px] border-[var(--scanner-green)]" />
                <span className="absolute bottom-0 right-0 h-8 w-8 rounded-br-md border-b-[3px] border-r-[3px] border-[var(--scanner-green)]" />
                <span className="barcode-scan-line absolute left-2 right-2 top-1/2 h-0.5 -translate-y-1/2 bg-[var(--scanner-green)]" />
              </div>
            </div>
          )}
        </div>

        <div className="barcode-scanner-controls">
          <button
            type="button"
            disabled={resolving}
            onClick={() => void exitScanMode()}
            className="flex h-11 w-11 items-center justify-center rounded-full bg-black/45 text-white backdrop-blur-sm transition hover:bg-black/60 disabled:opacity-40"
            aria-label="Geri"
          >
            <svg
              className="h-6 w-6"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
              aria-hidden
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19 8 12l7-7" />
            </svg>
          </button>

          {flashSupported && (
            <button
              type="button"
              disabled={flashBusy || resolving}
              onClick={() => void toggleFlash()}
              className={`flex h-11 w-11 items-center justify-center rounded-full backdrop-blur-sm transition disabled:opacity-40 ${
                flashOn
                  ? "bg-amber-400/90 text-zinc-950 hover:bg-amber-300"
                  : "bg-black/45 text-white hover:bg-black/60"
              }`}
              aria-label={flashOn ? "Flaşı kapat" : "Flaşı aç"}
              aria-pressed={flashOn}
            >
              <svg
                className="h-5 w-5"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
                aria-hidden
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M13 10V3L4 14h7v7l9-11h-7Z"
                />
              </svg>
            </button>
          )}
        </div>

        <div className="relative z-20 shrink-0 border-t border-white/10 px-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-4 text-center text-white">
          <p className="text-base font-semibold">Barkod okut</p>
          <p className="mt-1 text-xs text-zinc-400">
            {resolving
              ? "Ürün aranıyor…"
              : starting
                ? "Kamera açılıyor…"
                : "Barkodu çerçeveye hizalayın"}
          </p>
        </div>
      </div>
    ) : null;

  return (
    <>
      {mode === "icon" ? (
        <>
          <button
            type="button"
            disabled={starting}
            onClick={() => void openScanner()}
            className="admin-barcode-scan-btn"
            aria-label="Barkod okut"
            title="Barkod okut"
          >
            <svg
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
              aria-hidden
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M6.827 6.175A2.31 2.31 0 0 1 8.5 5h7a2.31 2.31 0 0 1 1.673.827l1.44 1.44A2.31 2.31 0 0 0 19.5 8v8a2.31 2.31 0 0 1-.827 1.673l-1.44 1.44A2.31 2.31 0 0 1 15.5 20h-7a2.31 2.31 0 0 1-1.673-.827l-1.44-1.44A2.31 2.31 0 0 1 4.5 16V8c0-.626.24-1.227.673-1.673l1.44-1.44Z"
              />
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 16a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z" />
            </svg>
          </button>
          {cameraError && !scanning && (
            <p className="admin-barcode-scan-error">{cameraError}</p>
          )}
        </>
      ) : (
        <ScannerFrame variant={variant}>
          <button
            type="button"
            disabled={starting}
            onClick={() => void openScanner()}
            className={variant === "store" ? "store-scan-btn" : "btn-primary"}
            aria-label="Barkod taramayı başlat"
          >
            {variant === "store" ? (
              <>
                <svg
                  className="h-5 w-5 shrink-0"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2}
                  aria-hidden
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M6.827 6.175A2.31 2.31 0 0 1 8.5 5h7a2.31 2.31 0 0 1 1.673.827l1.44 1.44A2.31 2.31 0 0 0 19.5 8v8a2.31 2.31 0 0 1-.827 1.673l-1.44 1.44A2.31 2.31 0 0 1 15.5 20h-7a2.31 2.31 0 0 1-1.673-.827l-1.44-1.44A2.31 2.31 0 0 1 4.5 16V8c0-.626.24-1.227.673-1.673l1.44-1.44Z"
                  />
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 16a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z" />
                </svg>
                {starting ? "Kamera açılıyor…" : "Kamerayı aç"}
              </>
            ) : (
              <>
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 24 24"
                  fill="currentColor"
                  className="h-5 w-5"
                  aria-hidden
                >
                  <path d="M4.5 6.75A2.25 2.25 0 0 1 6.75 4.5h2.25A2.25 2.25 0 0 1 11.25 6.75v.75h1.5V6.75A2.25 2.25 0 0 1 15 4.5h2.25A2.25 2.25 0 0 1 19.5 6.75v10.5A2.25 2.25 0 0 1 17.25 19.5H15a2.25 2.25 0 0 1-2.25-2.25v-.75h-1.5v.75A2.25 2.25 0 0 1 9 19.5H6.75A2.25 2.25 0 0 1 4.5 17.25V6.75ZM6.75 6a.75.75 0 0 0-.75.75v10.5c0 .414.336.75.75.75H9a.75.75 0 0 0 .75-.75v-2.25a.75.75 0 0 1 .75-.75h3a.75.75 0 0 1 .75.75v2.25c0 .414.336.75.75.75h2.25a.75.75 0 0 0 .75-.75V6.75a.75.75 0 0 0-.75-.75H15a.75.75 0 0 0-.75.75v1.5a.75.75 0 0 1-.75.75h-6a.75.75 0 0 1-.75-.75V6.75A.75.75 0 0 0 9 6H6.75Z" />
                </svg>
                {starting ? "Kamera açılıyor…" : "Kamerayı aç"}
              </>
            )}
          </button>

          {cameraError && (
            <p
              className={`mt-3 text-center text-xs font-medium ${
                variant === "store" ? "text-red-100" : "text-red-600"
              }`}
            >
              {cameraError}
            </p>
          )}
        </ScannerFrame>
      )}

      {scannerOverlay && portalReady && createPortal(scannerOverlay, document.body)}
    </>
  );
}
