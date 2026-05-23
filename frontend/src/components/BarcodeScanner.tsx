"use client";

import { useCallback, useEffect, useId, useRef, useState } from "react";
import { Html5Qrcode, Html5QrcodeSupportedFormats } from "html5-qrcode";
import ScannerFrame from "@/components/ScannerFrame";

interface BarcodeScannerProps {
  onScan: (barcode: string) => void | Promise<void>;
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

export default function BarcodeScanner({ onScan }: BarcodeScannerProps) {
  const reactId = useId();
  const containerId = `barcode-scanner-${reactId.replace(/:/g, "")}`;
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const onScanRef = useRef(onScan);
  const scanLockRef = useRef(false);

  const [scanning, setScanning] = useState(false);
  const [starting, setStarting] = useState(false);
  const [resolving, setResolving] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);

  useEffect(() => {
    onScanRef.current = onScan;
  }, [onScan]);

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
    scanLockRef.current = false;
  }, [stopScanner]);

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
  }, [containerId, handleDecoded, scanning, starting, stopScanner]);

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

  return (
    <>
      <ScannerFrame>
        <button
          type="button"
          disabled={starting}
          onClick={() => void openScanner()}
          className="btn-primary"
          aria-label="Barkod taramayı başlat"
        >
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
        </button>

        {cameraError && (
          <p className="mt-2 text-center text-xs text-red-600">{cameraError}</p>
        )}
      </ScannerFrame>

      {scanning && (
        <div
          className="fixed inset-0 z-[60] flex flex-col bg-zinc-950"
          role="dialog"
          aria-modal="true"
          aria-label="Barkod tarama"
        >
          <div className="flex shrink-0 items-center justify-between border-b border-white/10 px-4 pb-3 pt-[max(0.75rem,env(safe-area-inset-top))] text-white">
            <div className="min-w-0 flex-1">
              <p className="text-base font-semibold">Barkod okut</p>
              <p className="mt-0.5 text-xs text-zinc-400">
                {resolving
                  ? "Ürün aranıyor…"
                  : starting
                    ? "Kamera açılıyor…"
                    : "Barkodu çerçeveye hizalayın"}
              </p>
            </div>
            <button
              type="button"
              disabled={resolving}
              onClick={() => void exitScanMode()}
              className="shrink-0 rounded-lg bg-white/10 px-3 py-2 text-sm font-medium transition hover:bg-white/20 disabled:opacity-40"
            >
              Kapat
            </button>
          </div>

          <div className="relative min-h-0 flex-1 overflow-hidden">
            <div
              id={containerId}
              className="barcode-scanner-view barcode-scanner-preview absolute inset-0"
            />

            {!starting && !resolving && (
              <div className="pointer-events-none absolute inset-0 flex items-center justify-center p-6">
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
        </div>
      )}
    </>
  );
}
