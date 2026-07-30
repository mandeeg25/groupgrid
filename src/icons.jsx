// GroupGrid brand mark, logo lockup, wordmark, and the single-line icon set.
import { P, fontDisplay } from "./theme";

// ── Official brand mark (from the GroupGrid logo kit): a navy rounded square with a
// 3×3 dot grid. The diagonal (top-left, center, bottom-right) is teal — the clean
// cross-check — and the other six dots are light blue-grey. One source of truth for
// every logo placement so the mark is identical everywhere.
const MARK_TEAL = "#00C9B1";
const MARK_DOT  = "#A9C2DC";
function markDots() {
  // diagonal = teal, others = light blue-grey, exactly per the official artwork
  const pos = [28, 50, 72];
  const out = [];
  pos.forEach((cy, r) => pos.forEach((cx, c) => {
    out.push(<circle key={`${r}-${c}`} cx={cx} cy={cy} r="9" fill={r === c ? MARK_TEAL : MARK_DOT} />);
  }));
  return out;
}
export function BrandMark({ size = 28, onDark = true }) {
  return (
    <svg width={size} height={size} viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg" style={{ flexShrink: 0, display: "block" }}>
      <rect width="100" height="100" rx="26" fill={onDark ? "#0A1A33" : "#0C1E3F"} />
      {markDots()}
    </svg>
  );
}
// Full official lockup: the mark + the two-tone GroupGrid wordmark (Poppins).
// viewBox 0 0 470 100, matching the kit's logo-onlight / logo-ondark SVGs.
export function BrandLogo({ height = 26, onDark = true }) {
  return (
    <svg width={height * 4.7} height={height} viewBox="0 0 470 100" xmlns="http://www.w3.org/2000/svg" style={{ display: "block", flexShrink: 0 }}>
      <rect width="100" height="100" rx="26" fill={onDark ? "#0A1A33" : "#0C1E3F"} />
      {markDots()}
      <text x="120" y="50" dominantBaseline="central" fontFamily="'Poppins', 'Helvetica Neue', Arial, sans-serif" fontWeight="600" fontSize="54" letterSpacing="-1">
        <tspan fill={onDark ? "#FFFFFF" : "#0C1E3F"}>Group</tspan><tspan fill={MARK_TEAL}>Grid</tspan>
      </text>
    </svg>
  );
}
// Two-tone wordmark: "Group" in the foreground color, "Grid" in teal.
export function BrandWordmark({ light = true, size = 16 }) {
  return (
    <span style={{ fontFamily: fontDisplay, fontWeight: 700, fontSize: `${size}px`, letterSpacing: "-0.01em", whiteSpace: "nowrap" }}>
      <span style={{ color: light ? P.white : P.navy }}>Group</span>
      <span style={{ color: P.accent }}>Grid</span>
    </span>
  );
}

// ── Signature icons: official Group Grid single-line set (from the brand kit),
// navy line + one teal accent on the matched/active part. 1.8 stroke, round cap/join.
const ICON_STROKE = 1.8;
export function GridIcon({ size = 20, line = P.navy, accent = P.accent }) {
  const r = 1.9, pos = [7, 12, 17];
  const dots = [];
  pos.forEach((cy, ri) => pos.forEach((cx, ci) => {
    dots.push(<circle key={`${ri}-${ci}`} cx={cx} cy={cy} r={r} fill={ri === ci ? accent : line} />);
  }));
  return <svg width={size} height={size} viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" style={{ flexShrink: 0 }}>{dots}</svg>;
}
function svgIcon(size, line, paths) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={line} strokeWidth={ICON_STROKE} strokeLinecap="round" strokeLinejoin="round" xmlns="http://www.w3.org/2000/svg" style={{ flexShrink: 0 }}>{paths}</svg>;
}
export function CrossCheckIcon({ size = 20, line = P.navy, accent = P.accent }) {
  return svgIcon(size, line, <><path d="M5 8.5a7 7 0 0 1 11.5-2.7L19 8" /><path d="M19 16a7 7 0 0 1-11.5 2.7L5 16" /><path d="M19 4v4h-4" stroke={accent} /><path d="M5 20v-4h4" stroke={accent} /></>);
}
export function FlagIcon({ size = 20, line = P.navy, accent = P.accent }) {
  return svgIcon(size, line, <><path d="M6 21V4" /><path d="M6 4.5h11l-2.2 4 2.2 4H6" stroke={accent} /></>);
}
export function ClearedIcon({ size = 20, line = P.navy, accent = P.accent }) {
  return svgIcon(size, line, <><circle cx="12" cy="12" r="9.5" /><path d="M7.5 12.3l3.1 3.1L16.5 9" stroke={accent} /></>);
}
export function SpreadsheetIcon({ size = 20, line = P.navy, accent = P.accent }) {
  return svgIcon(size, line, <><rect x="4" y="4" width="16" height="16" rx="2" /><path d="M4 10h16M10 10v10" stroke={accent} /></>);
}
export function MagnifierIcon({ size = 20, line = P.navy, accent = P.accent }) {
  return svgIcon(size, line, <><circle cx="11" cy="11" r="6.2" /><path d="M20 20l-4.6-4.6" /><path d="M8.4 11l2 2 3.4-3.4" stroke={accent} /></>);
}
export function UploadIcon({ size = 20, line = P.navy, accent = P.accent }) {
  return svgIcon(size, line, <><path d="M12 16V5" /><path d="M8 9l4-4 4 4" stroke={accent} /><path d="M5 20h14" /></>);
}
export function PlaneIcon({ size = 20, line = P.navy, accent = P.accent }) {
  return svgIcon(size, line, <path d="M17.8 19.2 16 11l3.5-3.5C21 6 21.5 4 21 3c-1-.5-3 0-4.5 1.5L13 8 4.8 6.2c-.5-.1-.9.1-1.1.5l-.3.5c-.2.5-.1 1 .3 1.3L9 12l-2 3H4l-1 1 3 2 2 3 1-1v-3l3-2 3.5 5.3c.3.4.8.5 1.3.3l.5-.2c.4-.3.6-.7.5-1.2z" />);
}
export function HotelIcon({ size = 20, line = P.navy, accent = P.accent }) {
  return svgIcon(size, line, <><path d="M3 19v-6.5l2-1V8a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v3.5l2 1V19" /><path d="M3 13h18" stroke={accent} /><path d="M7 11.5V10h4v1.5" /></>);
}
export function CarIcon({ size = 20, line = P.navy, accent = P.accent }) {
  return svgIcon(size, line, <><path d="M4 16l1.7-4.9A2 2 0 0 1 7.6 9.8h8.8a2 2 0 0 1 1.9 1.3L20 16" /><path d="M3 16h18v2.6h-2.3V16M5.3 18.6V16" /><circle cx="8" cy="16" r="1.3" /><circle cx="16" cy="16" r="1.3" /></>);
}
export function CalendarIcon({ size = 20, line = P.navy, accent = P.accent }) {
  return svgIcon(size, line, <><rect x="4" y="5" width="16" height="15" rx="2" /><path d="M4 9.5h16M8 3v4M16 3v4" /><path d="M8.5 13.5l2 2 3.5-3.5" stroke={accent} /></>);
}
export function PeopleIcon({ size = 20, line = P.navy, accent = P.accent }) {
  return svgIcon(size, line, <><circle cx="9" cy="8.5" r="3" /><path d="M3.5 19c0-3.1 2.4-4.9 5.5-4.9s5.5 1.8 5.5 4.9" /><path d="M16 6.4a2.8 2.8 0 0 1 0 5.5" stroke={accent} /><path d="M17 14.3c2.4.4 3.7 2.1 3.7 4.7" stroke={accent} /></>);
}
export function AlertIcon({ size = 20, line = P.navy, accent = P.amber }) {
  return svgIcon(size, line, <><path d="M12 4 2.5 20.5h19z" /><path d="M12 10v4.5" stroke={accent} /><path d="M12 17.6v.2" stroke={accent} /></>);
}
export function CityIcon({ size = 20, line = P.navy, accent = P.accent }) {
  return svgIcon(size, line, <><path d="M3 20V9.5l5-2.5V20" /><path d="M8 20V4l6 2.6V20" /><path d="M14 20v-7l5 2V20" /><path d="M2.5 20h19" /><path d="M10.5 10v0M10.5 13.5v0M5.3 12v0" stroke={accent} /></>);
}
export function GlobeIcon({ size = 20, line = P.navy, accent = P.accent }) {
  return svgIcon(size, line, <><circle cx="12" cy="12" r="8.2" /><path d="M3.8 12h16.4" stroke={accent} /><path d="M12 3.8c2.6 2.3 2.6 14.1 0 16.4M12 3.8c-2.6 2.3-2.6 14.1 0 16.4" /></>);
}
export function BadgeIcon({ size = 20, line = P.navy, accent = P.accent }) {
  return svgIcon(size, line, <><rect x="7" y="3" width="10" height="6" rx="1.5" /><rect x="5.5" y="9" width="13" height="11" rx="2" /><path d="M9.5 14h5" stroke={accent} /></>);
}
