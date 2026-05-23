interface ScannerFrameProps {
  children: React.ReactNode;
}

export default function ScannerFrame({ children }: ScannerFrameProps) {
  return (
    <section className="app-card shrink-0 overflow-hidden p-4">
      <div className="mb-3 flex items-center gap-2">
        <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-accent-soft text-accent">
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M3 9.75h1.5m16.5 0H21M4.5 6.75h15M6 3.75h12a1.5 1.5 0 0 1 1.5 1.5v13.5a1.5 1.5 0 0 1-1.5 1.5H6a1.5 1.5 0 0 1-1.5-1.5V5.25A1.5 1.5 0 0 1 6 3.75Z"
            />
          </svg>
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
