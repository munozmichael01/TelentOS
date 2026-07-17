// Iconos SVG de línea del DS para la landing (portados del mockup V3).
// Sin emojis: viewBox 24, stroke currentColor, strokeWidth 2.

import type { ReactNode } from "react";

const PATHS: Record<string, ReactNode> = {
  search: (
    <>
      <circle cx="11" cy="11" r="7" stroke="currentColor" strokeWidth="2" />
      <path d="M20 20l-3-3" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </>
  ),
  idcard: (
    <>
      <rect x="3" y="4" width="18" height="16" rx="2" stroke="currentColor" strokeWidth="2" />
      <circle cx="9" cy="10" r="2" stroke="currentColor" strokeWidth="2" />
      <path d="M6 16c.5-1.8 1.7-2.5 3-2.5s2.5.7 3 2.5M15 9h4M15 13h3" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </>
  ),
  card: (
    <>
      <rect x="3" y="6" width="18" height="12" rx="2" stroke="currentColor" strokeWidth="2" />
      <circle cx="12" cy="12" r="2.4" stroke="currentColor" strokeWidth="2" />
      <path d="M7 12h.01M17 12h.01" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </>
  ),
  pencil: <path d="M5 19l1-4 9-9 3 3-9 9-4 1ZM14 6l3 3" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />,
  send: <path d="M3 11l18-7-7 18-2.5-7.5L3 11Z" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />,
  user: (
    <>
      <circle cx="12" cy="8" r="4" stroke="currentColor" strokeWidth="2" />
      <path d="M5 20c1-4 4.5-5 7-5s6 1 7 5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </>
  ),
  receipt: (
    <>
      <path d="M6 3h12v18l-3-2-3 2-3-2-3 2V3Z" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
      <path d="M9 8h6M9 12h6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </>
  ),
  doc: (
    <>
      <path d="M7 3h7l4 4v14H7z" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
      <path d="M14 3v4h4M10 13h5M10 17h5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </>
  ),
  chart: <path d="M4 20V6M10 20V10M16 20V4M22 20H2" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />,
  building: (
    <>
      <rect x="4" y="3" width="16" height="18" rx="1.5" stroke="currentColor" strokeWidth="2" />
      <path d="M8 7h2M14 7h2M8 11h2M14 11h2M8 15h8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </>
  ),
  grid: (
    <>
      <rect x="3" y="3" width="7" height="7" rx="1.5" stroke="currentColor" strokeWidth="2" />
      <rect x="14" y="3" width="7" height="7" rx="1.5" stroke="currentColor" strokeWidth="2" />
      <rect x="3" y="14" width="7" height="7" rx="1.5" stroke="currentColor" strokeWidth="2" />
      <rect x="14" y="14" width="7" height="7" rx="1.5" stroke="currentColor" strokeWidth="2" />
    </>
  ),
  brief: (
    <>
      <rect x="3" y="7" width="18" height="13" rx="2" stroke="currentColor" strokeWidth="2" />
      <path d="M8 7V5a2 2 0 012-2h4a2 2 0 012 2v2" stroke="currentColor" strokeWidth="2" />
    </>
  ),
  users2: (
    <>
      <circle cx="9" cy="8" r="3" stroke="currentColor" strokeWidth="2" />
      <path d="M3.5 19a5.5 5.5 0 0111 0M16 11a3 3 0 100-6M20.5 19a5 5 0 00-4-4.9" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </>
  ),
  globe: (
    <>
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="2" />
      <path d="M12 3a15 15 0 010 18M3 12h18M3.5 8h17M3.5 16h17" stroke="currentColor" strokeWidth="2" />
    </>
  ),
  org: (
    <>
      <rect x="9" y="3" width="6" height="5" rx="1.5" stroke="currentColor" strokeWidth="2" />
      <rect x="3" y="16" width="6" height="5" rx="1.5" stroke="currentColor" strokeWidth="2" />
      <rect x="15" y="16" width="6" height="5" rx="1.5" stroke="currentColor" strokeWidth="2" />
      <path d="M12 8v4M6 16v-2h12v2" stroke="currentColor" strokeWidth="2" />
    </>
  ),
  cal: (
    <>
      <rect x="3" y="4" width="18" height="18" rx="2" stroke="currentColor" strokeWidth="2" />
      <path d="M16 2v4M8 2v4M3 10h18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </>
  ),
  clock: (
    <>
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="2" />
      <path d="M12 7v5l3 2" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </>
  ),
  lock: (
    <>
      <rect x="4" y="10" width="16" height="11" rx="2" stroke="currentColor" strokeWidth="2" />
      <path d="M8 10V7a4 4 0 018 0v3" stroke="currentColor" strokeWidth="2" />
    </>
  ),
  gear: (
    <>
      <circle cx="12" cy="12" r="3.2" stroke="currentColor" strokeWidth="2" />
      <path d="M12 2v3M12 19v3M2 12h3M19 12h3M5 5l2 2M17 17l2 2M5 19l2-2M17 7l2-2" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </>
  ),
  slip: (
    <>
      <path d="M5 3h14v18l-2.3-1.5L14.3 21 12 19.5 9.7 21 7.3 19.5 5 21V3Z" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
      <path d="M9 8h6M9 12h4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </>
  ),
  bell: (
    <>
      <path d="M6 9a6 6 0 1112 0c0 5 2 6 2 6H4s2-1 2-6Z" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
      <path d="M10 19a2 2 0 004 0" stroke="currentColor" strokeWidth="2" />
    </>
  ),
  help: (
    <>
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="2" />
      <path d="M9.5 9.5a2.5 2.5 0 114 2c-1 .7-1.5 1.2-1.5 2.5M12 17.5h.01" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </>
  ),
  shield: <path d="M12 3l8 4v5c0 4.5-3 7.5-8 9-5-1.5-8-4.5-8-9V7l8-4Z" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />,
  check: <path d="M5 12l5 5 9-11" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />,
  chevron: <path d="M6 9l6 6 6-6" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />,
  sliders: <path d="M4 21v-7M4 10V3M12 21v-9M12 8V3M20 21v-5M20 12V3M1 14h6M9 8h6M17 16h6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />,
};

export type IconName = keyof typeof PATHS;

export function MIcon({ name, size = 15 }: { name: IconName; size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      {PATHS[name]}
    </svg>
  );
}

// Logo cubo de TalentOS — trazo lima sobre chip verde.
export function LogoMark({ size = 14 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M4 7l8 4 8-4M4 7l8-4 8 4M4 7v10l8 4 8-4V7M12 11v10" stroke="#C6F24E" strokeWidth="2" strokeLinejoin="round" />
    </svg>
  );
}
