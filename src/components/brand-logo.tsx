import Image from "next/image";

type BrandLogoProps = {
  className?: string;
  priority?: boolean;
};

export function BrandLogo({ className, priority = false }: BrandLogoProps) {
  return (
    <Image
      src="/odp-digital.png"
      alt="ODP Digital"
      width={160}
      height={48}
      className={className}
      priority={priority}
    />
  );
}
