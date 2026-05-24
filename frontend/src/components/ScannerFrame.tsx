import type { ReactNode } from "react";
import { IconCamera } from "@/components/store/StoreIcons";

interface ScannerFrameProps {
  children: ReactNode;
  variant?: "store" | "default";
}

export default function ScannerFrame({ children, variant = "default" }: ScannerFrameProps) {
  if (variant === "store") {
    return (
      <section className="store-scan-card shrink-0">
        <div className="store-scan-card-glow" aria-hidden />
        <div className="store-scan-card-head">
          <div className="store-scan-icon-wrap">
            <IconCamera className="h-6 w-6" />
          </div>
          <div className="min-w-0">
            <h2 className="text-sm font-bold text-white">Barkod ile fiyat gör</h2>
            <p className="mt-0.5 text-xs text-red-100/90">Kamerayı açıp barkodu okutun</p>
          </div>
        </div>
        <div className="store-scan-card-action">{children}</div>
      </section>
    );
  }

  return (
    <section className="app-card shrink-0 overflow-hidden p-4">
      <div className="mb-3 flex items-center gap-2">
        <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-accent-soft text-accent">
          <IconCamera className="h-4 w-4" />
        </span>
        <div>
          <h2 className="text-sm font-semibold text-zinc-900">Barkod okut</h2>
          <p className="text-xs text-zinc-500">Kamerayı açın, fiyat otomatik gelsin</p>
        </div>
      </div>
      {children}
    </section>
  );
}
