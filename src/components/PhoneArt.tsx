import { useId } from "react";
import type { ReactNode } from "react";
import type { Visual } from "../types";
import { cx } from "../lib/utils";

/*
 * PhoneArt — parametric vector handset. Every product gets a distinct
 * finish from three hex values, so the catalog needs zero photography.
 */

export function PhoneArt({
  visual,
  className,
  float,
  tilt = 0,
  showReflection = true,
}: {
  visual: Visual;
  className?: string;
  float?: boolean;
  tilt?: number;
  showReflection?: boolean;
}) {
  const gid = useId().replace(/[:]/g, "");
  return (
    <svg
      viewBox="0 0 220 420"
      className={cx(className, float && "floaty")}
      style={{ ["--tilt" as string]: `${tilt}deg`, transform: float ? undefined : `rotate(${tilt}deg)` }}
      aria-hidden="true"
    >
      <defs>
        <linearGradient id={`scr${gid}`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor={visual.screenA} />
          <stop offset="100%" stopColor={visual.screenB} />
        </linearGradient>
        <linearGradient id={`body${gid}`} x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor={visual.body} />
          <stop offset="50%" stopColor={visual.body} stopOpacity="0.82" />
          <stop offset="100%" stopColor={visual.body} />
        </linearGradient>
      </defs>

      {/* side buttons */}
      <rect x="33" y="120" width="4" height="34" rx="2" fill={visual.body} />
      <rect x="33" y="166" width="4" height="22" rx="2" fill={visual.body} />
      <rect x="183" y="140" width="4" height="44" rx="2" fill={visual.body} />

      {/* chassis */}
      <rect x="38" y="12" width="144" height="396" rx="30" fill={`url(#body${gid})`} stroke="rgba(255,255,255,0.22)" strokeWidth="1.5" />
      {/* screen */}
      <rect x="47" y="24" width="126" height="372" rx="22" fill={`url(#scr${gid})`} />
      {/* gloss */}
      <path d="M47 120 L173 40 L173 92 L47 190 Z" fill="rgba(255,255,255,0.09)" />
      <path d="M47 230 L173 150 L173 170 L47 258 Z" fill="rgba(255,255,255,0.05)" />
      {/* punch-hole camera */}
      <circle cx="110" cy="40" r="5.5" fill="rgba(0,0,0,0.55)" />
      <circle cx="110" cy="40" r="2.2" fill="rgba(120,160,180,0.8)" />
      {/* status bar hint */}
      <rect x="62" y="56" width="30" height="4" rx="2" fill="rgba(255,255,255,0.5)" />
      <rect x="62" y="66" width="52" height="4" rx="2" fill="rgba(255,255,255,0.28)" />
      {/* camera module */}
      <rect x="126" y="330" width="40" height="52" rx="14" fill="rgba(0,0,0,0.28)" />
      <circle cx="146" cy="346" r="8" fill="rgba(0,0,0,0.5)" stroke="rgba(255,255,255,0.25)" />
      <circle cx="146" cy="346" r="3" fill="rgba(140,190,210,0.85)" />
      <circle cx="146" cy="366" r="5" fill="rgba(0,0,0,0.5)" stroke="rgba(255,255,255,0.2)" />

      {showReflection && <ellipse cx="110" cy="414" rx="70" ry="5" fill="rgba(12,26,30,0.14)" />}
    </svg>
  );
}

/** Tile wrapper used across cards — tinted backdrop + floating handset. */
export function PhoneTile({
  visual,
  className,
  height = "h-48",
  tilt = -6,
  children,
}: {
  visual: Visual;
  className?: string;
  height?: string;
  tilt?: number;
  children?: ReactNode;
}) {
  return (
    <div className={cx("relative overflow-hidden grid place-items-center grid-light", height, className)} style={{ background: `linear-gradient(150deg, ${visual.screenA}18, ${visual.screenB}22), #e9ede9` }}>
      <div className="absolute inset-0 grid-dark opacity-[0.35]" style={{ maskImage: "radial-gradient(closest-side, black, transparent)" }} />
      <PhoneArt visual={visual} tilt={tilt} className="h-[88%] phone-tilt drop-shadow-xl" />
      {children}
    </div>
  );
}
