import type { ReactNode } from "react";

/* Hand-drawn 24px stroke icon set — single source for the whole app. */

const P: Record<string, ReactNode> = {
  bolt: <path d="M13 2.2 4.6 13.2h5.9l-1 8.6 9.9-12.6h-6.4l1-7z" fill="currentColor" stroke="none" />,
  zap: <path d="M13 2.5 5 13.5h5.5L9 21.5l10-12h-6l1.5-7z" />,
  search: (
    <>
      <circle cx="11" cy="11" r="6.5" />
      <path d="m20.5 20.5-4.9-4.9" />
    </>
  ),
  cart: (
    <>
      <path d="M3 4h2.2l2.3 11.6a1.6 1.6 0 0 0 1.6 1.3h8.3a1.6 1.6 0 0 0 1.6-1.3L21 8H6" />
      <circle cx="9.7" cy="20.3" r="1.2" />
      <circle cx="17.3" cy="20.3" r="1.2" />
    </>
  ),
  heart: <path d="M12 20.4s-7.4-4.5-9.2-9C1.5 8.1 3.5 5 6.7 5c2 0 3.5 1.1 4.3 2.6.4.7 1.6.7 2 0C13.8 6.1 15.3 5 17.3 5c3.2 0 5.2 3.1 3.9 6.4-1.8 4.5-9.2 9-9.2 9z" />,
  heartFill: <path d="M12 20.4s-7.4-4.5-9.2-9C1.5 8.1 3.5 5 6.7 5c2 0 3.5 1.1 4.3 2.6.4.7 1.6.7 2 0C13.8 6.1 15.3 5 17.3 5c3.2 0 5.2 3.1 3.9 6.4-1.8 4.5-9.2 9-9.2 9z" fill="currentColor" />,
  user: (
    <>
      <circle cx="12" cy="8" r="3.8" />
      <path d="M4.8 19.8c1.6-3.1 4.2-4.6 7.2-4.6s5.6 1.5 7.2 4.6" />
    </>
  ),
  menu: <path d="M4 6.5h16M4 12h16M4 17.5h16" />,
  x: <path d="m5.5 5.5 13 13m0-13-13 13" />,
  chevL: <path d="M14.5 5.5 8 12l6.5 6.5" />,
  chevR: <path d="m9.5 5.5 6.5 6.5-6.5 6.5" />,
  chevD: <path d="m5.5 9.5 6.5 6.5 6.5-6.5" />,
  star: <path d="m12 2.9 2.7 5.7 6.2.8-4.6 4.3 1.2 6.1L12 16.9l-5.5 2.9 1.2-6.1L3.1 9.4l6.2-.8z" fill="currentColor" stroke="none" />,
  plus: <path d="M12 5v14M5 12h14" />,
  minus: <path d="M5 12h14" />,
  trash: (
    <>
      <path d="M4.5 6.5h15M9.5 6V4.8A1.3 1.3 0 0 1 10.8 3.5h2.4a1.3 1.3 0 0 1 1.3 1.3V6" />
      <path d="m6.5 6.5.8 12.1a2 2 0 0 0 2 1.9h5.4a2 2 0 0 0 2-1.9l.8-12.1M10 11v5.5M14 11v5.5" />
    </>
  ),
  edit: (
    <>
      <path d="M4 20h4.2L19.6 8.6a2.1 2.1 0 0 0-3-3L5.2 17z" />
      <path d="m13.6 6.6 3 3" />
    </>
  ),
  box: (
    <>
      <path d="M3.5 7.5 12 3l8.5 4.5v9L12 21l-8.5-4.5z" />
      <path d="M3.5 7.5 12 12l8.5-4.5M12 12v9" />
    </>
  ),
  tag: (
    <>
      <path d="M3.5 11.7V5a1.5 1.5 0 0 1 1.5-1.5h6.7L21 12.8l-8.2 8.2z" />
      <circle cx="8" cy="8" r="1.3" />
    </>
  ),
  image: (
    <>
      <rect x="3.5" y="5" width="17" height="14" rx="2" />
      <circle cx="8.7" cy="9.6" r="1.5" />
      <path d="m4.5 17 4.6-4.2 3.3 2.8 2.8-2.3 4.3 3.7" />
    </>
  ),
  gear: (
    <>
      <circle cx="12" cy="12" r="3.2" />
      <path d="M12 2.8v2.6M12 18.6v2.6M4.1 7.5l2.2 1.3M17.7 15.2l2.2 1.3M4.1 16.5l2.2-1.3M17.7 8.8l2.2-1.3" />
    </>
  ),
  shield: (
    <>
      <path d="M12 3 19.5 5.8v5.4c0 4.8-3.2 8-7.5 9.8-4.3-1.8-7.5-5-7.5-9.8V5.8z" />
      <path d="m8.8 12 2.2 2.2 4.2-4.4" />
    </>
  ),
  users: (
    <>
      <circle cx="9" cy="8.5" r="3.2" />
      <path d="M3.2 19.5c1.3-2.8 3.4-4.2 5.8-4.2s4.5 1.4 5.8 4.2M15.5 5.7a3.2 3.2 0 0 1 0 5.6M17.8 15.6c1.5.6 2.6 1.9 3.3 3.9" />
    </>
  ),
  logout: (
    <>
      <path d="M9.5 4H6.8A2.3 2.3 0 0 0 4.5 6.3v11.4a2.3 2.3 0 0 0 2.3 2.3h2.7" />
      <path d="m15 8 4 4-4 4M19 12H9.5" />
    </>
  ),
  eye: (
    <>
      <path d="M2.8 12S6.5 5.8 12 5.8 21.2 12 21.2 12 17.5 18.2 12 18.2 2.8 12 2.8 12z" />
      <circle cx="12" cy="12" r="2.8" />
    </>
  ),
  filter: <path d="M4 5.5h16L13.7 13v6.2l-3.4 1.8V13z" />,
  arrowR: <path d="M4 12h15m-6-6 6 6-6 6" />,
  check: <path d="m4.5 12.5 5 5L19.5 7" />,
  alert: (
    <>
      <path d="M12 3.6 2.7 19.8h18.6z" />
      <path d="M12 9.8v4.4" />
      <circle cx="12" cy="17" r="0.4" fill="currentColor" />
    </>
  ),
  info: (
    <>
      <circle cx="12" cy="12" r="8.5" />
      <path d="M12 11v5" />
      <circle cx="12" cy="7.8" r="0.4" fill="currentColor" />
    </>
  ),
  truck: (
    <>
      <path d="M2.8 6.5h11.4V16H2.8zM14.2 9.5h3.9l2.6 3.2V16h-6.5" />
      <circle cx="7" cy="17.8" r="1.7" />
      <circle cx="16.8" cy="17.8" r="1.7" />
    </>
  ),
  rotate: (
    <>
      <path d="M4.2 4.5V9h4.5M19.8 19.5V15h-4.5" />
      <path d="M19.4 9a7.8 7.8 0 0 0-13.6-2.6L4.2 9M4.6 15a7.8 7.8 0 0 0 13.6 2.6l1.6-2.6" />
    </>
  ),
  refresh: (
    <>
      <path d="M4.2 4.5V9h4.5M19.8 19.5V15h-4.5" />
      <path d="M19.4 9a7.8 7.8 0 0 0-13.6-2.6L4.2 9M4.6 15a7.8 7.8 0 0 0 13.6 2.6l1.6-2.6" />
    </>
  ),
  lock: (
    <>
      <rect x="5.5" y="10.5" width="13" height="9.5" rx="2" />
      <path d="M8.5 10.5V8a3.5 3.5 0 0 1 7 0v2.5" />
      <circle cx="12" cy="15.2" r="0.5" fill="currentColor" />
    </>
  ),
  card: (
    <>
      <rect x="3" y="5.5" width="18" height="13" rx="2" />
      <path d="M3 10h18M7 14.8h4" />
    </>
  ),
  cash: (
    <>
      <rect x="2.5" y="6.5" width="19" height="11" rx="2" />
      <circle cx="12" cy="12" r="2.6" />
      <path d="M5.8 9.5h.01M18.2 14.5h.01" />
    </>
  ),
  phone: (
    <>
      <rect x="7.5" y="2.5" width="9" height="19" rx="2.4" />
      <path d="M10.5 18.4h3" />
    </>
  ),
  chart: (
    <>
      <path d="M4 20.5h16" />
      <path d="M6.5 20.5v-7M11.5 20.5V6.5M16.5 20.5v-10" />
    </>
  ),
  board: (
    <>
      <rect x="3.5" y="3.5" width="7.4" height="7.4" rx="1" />
      <rect x="13.6" y="3.5" width="6.9" height="4.6" rx="1" />
      <rect x="13.6" y="10.9" width="6.9" height="9.6" rx="1" />
      <rect x="3.5" y="13.7" width="7.4" height="6.8" rx="1" />
    </>
  ),
  db: (
    <>
      <ellipse cx="12" cy="5.5" rx="7.5" ry="2.8" />
      <path d="M4.5 5.5v13c0 1.6 3.4 2.8 7.5 2.8s7.5-1.2 7.5-2.8v-13" />
      <path d="M4.5 12c0 1.6 3.4 2.8 7.5 2.8s7.5-1.2 7.5-2.8" />
    </>
  ),
  home: (
    <>
      <path d="m4 10.8 8-7 8 7" />
      <path d="M6 9.5V20h12V9.5" />
      <path d="M10 20v-5.5h4V20" />
    </>
  ),
  clock: (
    <>
      <circle cx="12" cy="12" r="8.5" />
      <path d="M12 7v5.2l3.4 2" />
    </>
  ),
  key: (
    <>
      <circle cx="7.5" cy="15.5" r="3.8" />
      <path d="m10.6 12.4 8-8M16 6.5l2.5 2.5M13.2 9.3l2 2" />
    </>
  ),
  activity: <path d="M3 12.5h4l2.4-6.5 4.2 12.5 2.4-6h5" />,
  flag: (
    <>
      <path d="M5.5 21V3.8" />
      <path d="M5.5 4.5c4.2-2.1 7.3 2 12.8 0v8.8c-5.5 2.1-8.6-2-12.8 0" />
    </>
  ),
  scale: (
    <>
      <path d="M12 4.5V20M8.5 20h7M5 7.5h14" />
      <path d="M5 7.5 2.7 12.6a2.9 2.9 0 0 0 4.6 0zM19 7.5l-2.3 5.1a2.9 2.9 0 0 0 4.6 0z" />
    </>
  ),
  coin: (
    <>
      <circle cx="12" cy="12" r="8.5" />
      <circle cx="12" cy="12" r="4.6" />
      <path d="M12 5.2v2M12 16.8v2" />
    </>
  ),
  fold: (
    <>
      <rect x="5" y="3" width="14" height="18" rx="2.4" />
      <path d="M12 3v18" strokeDasharray="2.6 2.6" />
    </>
  ),
  gamepad: (
    <>
      <path d="M7 8h10a4.5 4.5 0 0 1 4.4 5.4l-.7 3.4a2.4 2.4 0 0 1-4.2 1L15 16H9l-1.5 1.8a2.4 2.4 0 0 1-4.2-1l-.7-3.4A4.5 4.5 0 0 1 7 8z" />
      <path d="M8 11v3M6.5 12.5h3" />
      <circle cx="15.8" cy="11.4" r="0.5" fill="currentColor" />
      <circle cx="17.9" cy="13.4" r="0.5" fill="currentColor" />
    </>
  ),
  wifi: (
    <>
      <path d="M3.5 9.5a12.5 12.5 0 0 1 17 0M6.3 12.7a8.5 8.5 0 0 1 11.4 0M9.2 15.8a4.2 4.2 0 0 1 5.6 0" />
      <circle cx="12" cy="18.6" r="0.6" fill="currentColor" />
    </>
  ),
  battery: (
    <>
      <rect x="2.5" y="8" width="17" height="8" rx="2" />
      <path d="M21.5 10.7v2.6M5.5 10.7v2.6M8.5 10.7v2.6M11.5 10.7v2.6" />
    </>
  ),
  cpu: (
    <>
      <rect x="7" y="7" width="10" height="10" rx="1.5" />
      <rect x="10.2" y="10.2" width="3.6" height="3.6" />
      <path d="M9.5 3.5V7M14.5 3.5V7M9.5 17v3.5M14.5 17v3.5M3.5 9.5H7M3.5 14.5H7M17 9.5h3.5M17 14.5h3.5" />
    </>
  ),
  lens: (
    <>
      <circle cx="12" cy="12" r="8.2" />
      <circle cx="12" cy="12" r="3.6" />
      <circle cx="14.8" cy="9.2" r="0.5" fill="currentColor" />
    </>
  ),
  store: (
    <>
      <path d="M3.5 7.5 5.2 3.5h13.6l1.7 4" />
      <path d="M4.5 7.5V20h15V7.5M3.5 7.5h17" />
      <path d="M9.5 20v-5.5h5V20" />
    </>
  ),
  external: (
    <>
      <path d="M14 4.5h5.5V10M19.5 4.5 11 13" />
      <path d="M9 5.5H6.2A1.7 1.7 0 0 0 4.5 7.2v10.6a1.7 1.7 0 0 0 1.7 1.7h10.6a1.7 1.7 0 0 0 1.7-1.7V15" />
    </>
  ),
  sort: (
    <>
      <path d="M7 4.5v13m0 0-3-3m3 3 3-3" />
      <path d="M12.5 6.5H20M12.5 11.5h5.5M12.5 16.5h3.5" />
    </>
  ),
  percent: (
    <>
      <path d="M19 5 5 19" />
      <circle cx="7" cy="7" r="2.4" />
      <circle cx="17" cy="17" r="2.4" />
    </>
  ),
  gauge: (
    <>
      <path d="M4.6 18.5a8.8 8.8 0 1 1 14.8 0" />
      <path d="m12 13.5 3.8-3.8" />
      <circle cx="12" cy="13.5" r="0.6" fill="currentColor" />
    </>
  ),
  send: (
    <>
      <path d="M21 3.5 3 10.6l6.9 2.5L12.4 20z" />
      <path d="M21 3.5 9.9 13.1" />
    </>
  ),
};

export type IconName = keyof typeof P;

export function Icon({
  name,
  size = 20,
  className,
  strokeWidth = 1.8,
}: {
  name: string;
  size?: number;
  className?: string;
  strokeWidth?: number;
}) {
  return (
    <svg
      viewBox="0 0 24 24"
      width={size}
      height={size}
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      {P[name] ?? P.box}
    </svg>
  );
}
