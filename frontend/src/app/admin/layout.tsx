export const metadata = {
  title: "Admin | DervişMobil Fiyat Gör",
  robots: { index: false, follow: false },
};

export default function AdminRootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-full flex-1 flex-col bg-surface">{children}</div>
  );
}
