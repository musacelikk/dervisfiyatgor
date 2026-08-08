import type { Metadata, Viewport } from "next";
import { Archivo, Geist } from "next/font/google";
import "./globals.css";

// latin-ext: Türkçe karakterler (ş, ğ, İ…) sistem fontuna düşmesin
const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin", "latin-ext"],
});

/** Admin panelinin başlık/tabela yazısı. */
const archivo = Archivo({
  variable: "--font-archivo",
  subsets: ["latin", "latin-ext"],
});

export const metadata: Metadata = {
  title: "DervişMobil Fiyat Gör",
  description: "Barkod okutarak ürün fiyatı sorgulama",
  applicationName: "DervişMobil",
  icons: {
    icon: [{ url: "/favicon.ico", sizes: "any" }],
    shortcut: ["/favicon.ico"],
    apple: [{ url: "/logo.png", type: "image/png" }],
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "DervişMobil",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: "#f4f4f5",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="tr"
      className={`${geistSans.variable} ${archivo.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <body className="flex h-full flex-col overflow-hidden bg-surface text-zinc-900" suppressHydrationWarning>
        {children}
      </body>
    </html>
  );
}
