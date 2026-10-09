import { forwardRef } from "react";
import type { ImgHTMLAttributes } from "react";

type DhmisMarkProps = ImgHTMLAttributes<HTMLImageElement> & { size?: number | string };

export const DhmisMark = forwardRef<HTMLImageElement, DhmisMarkProps>(
  ({ size = 24, alt = "DHMIS", ...props }, ref) => (
    <img ref={ref} src="/assets/dhmis-logo-v2/svg/dhmis-mark.svg" width={size} height={size} alt={alt} {...props} />
  ),
);

DhmisMark.displayName = "DhmisMark";

export function nameInitials(name: string) {
  const parts = name.split(" ");
  if (parts.length === 1) return parts[0].charAt(0).toUpperCase();
  return parts.map((p) => p[0])
    .filter(Boolean)
    .slice(-2)
    .join("")
    .toUpperCase();
}
