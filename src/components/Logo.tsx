import logoUrl from "../assets/logo.svg";

/**
 * Logo — the ONLY place the logo asset is referenced (PRD §7.1).
 * Never inline the SVG elsewhere. Color comes from `currentColor` in the asset,
 * so callers control the mark's color via a text-* token utility (e.g. text-accent).
 */
export function Logo({
  size = 40,
  className,
}: {
  size?: number;
  className?: string;
}) {
  return (
    <img
      src={logoUrl}
      width={size}
      height={size}
      alt="GLP-1 Companion"
      className={className}
    />
  );
}
