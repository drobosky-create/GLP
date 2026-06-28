import logoUrl from "../assets/logo.svg";

/**
 * Logo — the ONLY place the logo asset is referenced (PRD §7.1).
 * Never inline the SVG elsewhere. The Tally mark ships in the brand's acid-green;
 * keep it matched to --color-accent if the brand token ever changes.
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
      alt="Tally"
      className={className}
    />
  );
}
