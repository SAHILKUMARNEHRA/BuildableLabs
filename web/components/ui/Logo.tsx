/**
 * Brand logo: a document-with-pen glyph inside the gradient "liquid glass"
 * rounded square. Centralised here so the header, auth cards, and landing page
 * all stay in sync — change the mark once, it updates everywhere.
 */

interface LogoMarkProps {
  /** Tailwind size classes for the rounded-square container, e.g. "h-8 w-8". */
  className?: string;
  /** Tailwind size classes for the inner icon, e.g. "h-5 w-5". */
  iconClassName?: string;
  rounded?: string;
}

export function LogoMark({
  className = 'h-8 w-8',
  iconClassName = 'h-5 w-5',
  rounded = 'rounded-xl',
}: LogoMarkProps) {
  return (
    <span
      className={`flex items-center justify-center bg-gradient-to-br from-indigo-500 to-violet-600 text-white shadow-sm ${rounded} ${className}`}
    >
      <DocPenIcon className={iconClassName} />
    </span>
  );
}

export function DocPenIcon({ className = 'h-5 w-5' }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden>
      {/* document */}
      <path
        d="M13.5 4H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-6.5"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {/* text lines */}
      <path d="M8.75 11.5h3.5M8.75 14.75h5.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      {/* pen */}
      <path
        d="M16.7 3.3a1.85 1.85 0 0 1 2.6 2.6l-5.1 5.1-3.1.7.7-3.1 4.9-5.3z"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinejoin="round"
      />
    </svg>
  );
}
