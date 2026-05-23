"use client";

import { useEffect } from "react";

interface BottomSheetProps {
  open: boolean;
  onClose: () => void;
  onBack?: () => void;
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}

export default function BottomSheet({
  open,
  onClose,
  onBack,
  title,
  subtitle,
  children,
}: BottomSheetProps) {
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex flex-col justify-end">
      <button
        type="button"
        aria-label="Kapat"
        className="absolute inset-0 bg-zinc-900/50 backdrop-blur-[2px]"
        onClick={onClose}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="sheet-title"
        className="relative z-10 flex max-h-[min(88vh,680px)] flex-col rounded-t-2xl bg-white shadow-2xl ring-1 ring-zinc-200/80"
      >
        <div className="flex shrink-0 justify-center pt-3 pb-1">
          <span className="h-1 w-10 rounded-full bg-zinc-300" />
        </div>
        <div className="flex shrink-0 items-start gap-2 border-b border-zinc-100 px-5 pb-4 pt-1">
          {onBack && (
            <button
              type="button"
              onClick={onBack}
              className="-ml-1 rounded-full p-2 text-zinc-600 transition hover:bg-zinc-100"
              aria-label="Listeye dön"
            >
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M15 19l-7-7 7-7"
                />
              </svg>
            </button>
          )}
          <div className="min-w-0 flex-1">
            <h2 id="sheet-title" className="truncate text-lg font-semibold text-zinc-900">
              {title}
            </h2>
            {subtitle && (
              <p className="mt-0.5 text-sm text-zinc-500">{subtitle}</p>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="shrink-0 rounded-full p-2 text-zinc-500 transition hover:bg-zinc-100"
            aria-label="Paneli kapat"
          >
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto px-5 pb-[max(1.5rem,env(safe-area-inset-bottom))] pt-4">
          {children}
        </div>
      </div>
    </div>
  );
}
