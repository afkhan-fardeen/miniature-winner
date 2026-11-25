import Link from "next/link";

/**
 * Klyroo mark: the two o's become two interlocking lenses, one ink and one acid.
 * Reads as "oo", as two eyes, and as a check pairing with a result.
 */
export function Lenses({ className = "", height = 14 }: { className?: string; height?: number }) {
  return (
    <svg
      viewBox="2.6 0 24.8 16" height={height} width={(height * 24.8) / 16}
      fill="none" aria-hidden="true" className={className}
    >
      <circle cx="19.5" cy="8" r="6.6" fill="#E4F222" stroke="#0C0A08" strokeWidth="2.2" />
      <circle cx="10.5" cy="8" r="6.6" stroke="#0C0A08" strokeWidth="2.2" />
    </svg>
  );
}

export function LogoMark({ size = 32 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" fill="none" aria-hidden="true">
      <rect width="32" height="32" rx="9" fill="#0C0A08" />
      <circle cx="19.6" cy="16" r="6.4" fill="#E4F222" />
      <circle cx="12.4" cy="16" r="6.4" stroke="#fff" strokeWidth="2.4" />
    </svg>
  );
}

export function Logo({ href = "/", className = "", size = 26 }: { href?: string; className?: string; size?: number }) {
  return (
    <Link href={href} aria-label="Klyroo home" className={`inline-flex items-baseline ${className}`}>
      <span className="tracking-[-0.055em]" style={{ fontSize: size, lineHeight: 1 }}>klyr</span>
      <Lenses className="ml-[1px]" height={Math.round(size * 0.52)} />
    </Link>
  );
}
