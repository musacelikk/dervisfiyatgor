import Image from "next/image";

const HEIGHT: Record<NonNullable<BrandLogoProps["size"]>, string> = {
  sm: "h-8",
  md: "h-10",
  lg: "h-12",
  xl: "h-14",
};

export type BrandLogoProps = {
  size?: "sm" | "md" | "lg" | "xl";
  className?: string;
  priority?: boolean;
};

export default function BrandLogo({ size = "md", className = "", priority = false }: BrandLogoProps) {
  return (
    <Image
      src="/dervismobil-logo.png"
      alt="DervişMobil"
      width={400}
      height={120}
      priority={priority}
      className={`w-auto shrink-0 object-contain ${HEIGHT[size]} ${className}`.trim()}
    />
  );
}
