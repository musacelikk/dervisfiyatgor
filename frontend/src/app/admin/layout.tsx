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
    <div className="flex h-[100dvh] flex-1 flex-col overflow-hidden">{children}</div>
  );
}
