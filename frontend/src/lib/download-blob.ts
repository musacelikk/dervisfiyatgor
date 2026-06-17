export type DownloadFileOptions = {
  /** iOS için tıklama anında açılmış önizleme penceresi */
  previewWindow?: Window | null;
};

function isIOS(): boolean {
  if (typeof navigator === "undefined") return false;
  return (
    /iPad|iPhone|iPod/.test(navigator.userAgent) ||
    (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1)
  );
}

/** Mobilde dosya indirmeden hemen önce, kullanıcı tıklaması içinde çağırın. */
export function beginMobileDownloadPreview(label = "Dosya"): Window | null {
  if (!isIOS()) return null;
  const win = window.open("about:blank", "_blank");
  if (!win) return null;
  win.document.write(
    `<!DOCTYPE html><html lang="tr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${label}</title></head><body style="margin:0;min-height:100vh;display:flex;align-items:center;justify-content:center;font-family:system-ui,sans-serif;color:#52525b;background:#fafafa"><p>${label} hazırlanıyor…</p></body></html>`
  );
  win.document.close();
  return win;
}

export function saveBlobFile(
  blob: Blob,
  fileName: string,
  mimeType: string,
  previewWindow?: Window | null
): void {
  const url = URL.createObjectURL(blob);
  const cleanup = () => {
    window.setTimeout(() => URL.revokeObjectURL(url), 60_000);
  };

  if (previewWindow && !previewWindow.closed) {
    previewWindow.location.replace(url);
    try {
      previewWindow.document.title = fileName;
    } catch {
      // blob navigation sonrası erişilemeyebilir
    }
    cleanup();
    return;
  }

  if (isIOS()) {
    const opened = window.open(url, "_blank");
    if (!opened) {
      window.location.assign(url);
    }
    cleanup();
    return;
  }

  const link = document.createElement("a");
  link.href = url;
  link.download = fileName;
  link.rel = "noopener";
  link.type = mimeType;
  link.style.display = "none";
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  cleanup();
}
