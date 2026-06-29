/**
 * A crisp SVG mock-up of the collaborative editor for the landing page —
 * shows a document with two live cursors and an avatar stack. Drawn as SVG
 * (not a loaded image) so it is razor-sharp and adds zero loading lag.
 */
export function DocPreview() {
  return (
    <svg
      viewBox="0 0 640 400"
      className="h-auto w-full max-w-2xl drop-shadow-2xl"
      role="img"
      aria-label="Preview of the collaborative document editor with live cursors"
    >
      <defs>
        <linearGradient id="docbg" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#ffffff" stopOpacity="0.95" />
          <stop offset="1" stopColor="#f5f3ff" stopOpacity="0.9" />
        </linearGradient>
        <linearGradient id="logo" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#6366f1" />
          <stop offset="1" stopColor="#7c3aed" />
        </linearGradient>
      </defs>

      {/* window */}
      <rect x="8" y="8" width="624" height="384" rx="22" fill="url(#docbg)" stroke="#ffffff" strokeWidth="2" />

      {/* top bar */}
      <rect x="8" y="8" width="624" height="48" rx="22" fill="#ffffff" opacity="0.7" />
      <rect x="24" y="26" width="22" height="22" rx="6" fill="url(#logo)" />
      <circle cx="35" cy="37" r="2.4" fill="#fff" />
      <rect x="56" y="30" width="74" height="14" rx="5" fill="#e2e8f0" />
      {/* avatar stack */}
      <circle cx="556" cy="32" r="13" fill="#ec4899" stroke="#fff" strokeWidth="2" />
      <circle cx="578" cy="32" r="13" fill="#10b981" stroke="#fff" strokeWidth="2" />
      <circle cx="600" cy="32" r="13" fill="#3b82f6" stroke="#fff" strokeWidth="2" />
      <text x="556" y="36" textAnchor="middle" fontSize="10" fontWeight="700" fill="#fff">A</text>
      <text x="578" y="36" textAnchor="middle" fontSize="10" fontWeight="700" fill="#fff">B</text>
      <text x="600" y="36" textAnchor="middle" fontSize="10" fontWeight="700" fill="#fff">C</text>

      {/* document body */}
      <rect x="40" y="84" width="260" height="20" rx="6" fill="#312e81" opacity="0.85" />
      <rect x="40" y="124" width="540" height="11" rx="5" fill="#cbd5e1" />
      <rect x="40" y="146" width="500" height="11" rx="5" fill="#cbd5e1" />

      {/* Alice cursor + selection */}
      <rect x="40" y="168" width="250" height="11" rx="5" fill="#fbcfe8" />
      <rect x="296" y="166" width="244" height="11" rx="5" fill="#cbd5e1" />
      <rect x="289" y="163" width="2.5" height="18" rx="1" fill="#ec4899" />
      <rect x="289" y="146" width="40" height="14" rx="4" fill="#ec4899" />
      <text x="309" y="156" textAnchor="middle" fontSize="9" fontWeight="700" fill="#fff">Alice</text>

      <rect x="40" y="190" width="540" height="11" rx="5" fill="#cbd5e1" />
      <rect x="40" y="212" width="430" height="11" rx="5" fill="#cbd5e1" />

      {/* Bob cursor */}
      <rect x="474" y="207" width="2.5" height="18" rx="1" fill="#10b981" />
      <rect x="474" y="190" width="34" height="14" rx="4" fill="#10b981" />
      <text x="491" y="200" textAnchor="middle" fontSize="9" fontWeight="700" fill="#fff">Bob</text>

      {/* a small heading + list */}
      <rect x="40" y="248" width="150" height="15" rx="5" fill="#475569" opacity="0.7" />
      <circle cx="46" cy="284" r="3" fill="#94a3b8" />
      <rect x="58" y="279" width="430" height="10" rx="5" fill="#dbeafe" />
      <circle cx="46" cy="306" r="3" fill="#94a3b8" />
      <rect x="58" y="301" width="380" height="10" rx="5" fill="#cbd5e1" />
      <rect x="40" y="334" width="300" height="11" rx="5" fill="#cbd5e1" />
    </svg>
  );
}
