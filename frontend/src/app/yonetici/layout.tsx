export const metadata = {
  title: "Yönetici | DervişMobil",
  robots: { index: false, follow: false },
};

export default function YoneticiLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <div className="flex min-h-full flex-1 flex-col bg-surface">{children}</div>;
}
