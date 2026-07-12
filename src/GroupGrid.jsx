// ─────────────────────────────────────────────────────────────────────────────
// GroupGrid — mobile-optimised build  (v3, June 2026)
// Architecture: 100% browser-local React SPA. No server, no PII storage.
//
// Mobile changes (v2):
//   [x] useIsMobile hook drives layout switching at 768px
//   [x] Sidebar becomes slide-in drawer on mobile (hamburger toggle)
//   [x] Upload grid: 4-col desktop → 2-col mobile
//   [x] Compact upload bar: wraps cleanly on small screens
//   [x] Guest table: horizontal scroll + touch-friendly row height on mobile
//   [x] Guest detail expand: single-column card stack on mobile
//   [x] Header: hides non-essential controls on mobile
//   [x] Modals: full-screen on mobile
//   [x] Landing/marketing pages: responsive text sizes and grid cols
//   [x] Bottom nav bar for key actions when results are loaded on mobile
//
// Auth + storage changes (v3):
//   [x] window.storage replaced with localStorage wrapper (works on Vercel)
//   [x] Mock login replaced with Supabase email/password auth
//   [x] Sign up with name, email, password (min 8 chars)
//   [x] Password reset via email link
//   [x] Session persists across page refreshes (Supabase session tokens)
//   [x] Anonymous → user session migration on sign-in
//   [x] Supabase JS loaded via CDN (no build step required)
//   [x] Graceful fallback if Supabase CDN fails (app still works)
//
// Registration source-of-truth (v4):
//   [x] Registration list upload added (optional 5th file)
//   [x] parseRegistrationSheet — detects company, job title, requested dates, flight/hotel requests
//   [x] crossMatch reworked: registration anchors the comparison when present
//   [x] New flag: "Registered but no flight booked"
//   [x] New flag: "Registered but no hotel booked"
//   [x] New flag: "Booked travel but not on registration list"
//   [x] New flag: hotel dates differ from what registration requested
//   [x] Unregistered filter + count added
//   [x] Falls back to travel-vs-travel checks when no registration uploaded
//
// Remaining next steps:
//   [ ] Sync saved sessions to Supabase DB (currently localStorage only)
//   [ ] Compare registration's dietary requests vs. dietary file
//   [ ] Change tracking: diff current run vs saved session
//   [ ] Custom report branding (logo upload)
// ─────────────────────────────────────────────────────────────────────────────

/*
 * GroupGrid — React app (marketing website + product).
 * Modules: ./theme.js (tokens), ./icons.jsx (brand marks + icons), ./format.js (helpers),
 * ./templates.js (email templates + routing). This file holds the engine, pages, and screens.
 * Section map (search the ── dividers to jump):
 *
 *   Global styles       GlobalStyles, MOBILE_CSS, keyframes + motion system
 *   Parsing & dates     parseDate, parseTimeStr, findCol, parseSheet + per-file parsers
 *   Cross-check engine   crossMatch (flags: missing, mismatch, early/late arrival, airport, window)
 *   Email templates     DEFAULT_TEMPLATES, VENDOR_BODY(_OVERRIDE), routing tables, fillTemplate
 *   UI primitives       StatusChip, Btn, modals, CommHub
 *   Website pages       Landing, Pricing, FAQ, Contact, Privacy, Terms
 *   Product             SetupScreen, ReportFieldDropdown, GroupGrid (grid / reporting / comms / summary)
 *
 * Conventions: colors come from P.*, never hardcoded hex. Body text 15px, captions 12.5–13px,
 * headings via fontDisplay (Poppins). Customer-facing copy avoids em dashes.
 */
import React, { useState, useEffect, useRef, Fragment } from "react";
import * as XLSX from "xlsx";
import { Plane, Hotel, Car, Salad, BarChart2, Mail, Lock, Calendar, Send, AlertTriangle, AlertCircle, Circle, Copy, Check, X, Plus, ShieldCheck, Ban, FileSpreadsheet, Users, Download, Save, Trash2, Pencil, ChevronRight, ChevronDown, CreditCard} from "lucide-react";


// ===== inlined: design tokens (theme) =====
// GroupGrid design tokens: color palette and type families. Single source of truth.
const P = {
  navy:"#0C1E3F", navyLight:"#1A2E52", periwinkle:"#6B7FD4", periwinkleL:"#9BAAE8",
  periwinkleD:"#4C62C4", white:"#FFFFFF", offWhite:"#F0F2F7", grey50:"#EEF1F8",
  grey100:"#DDE2EF", grey200:"#B8C0D8", grey400:"#7E8BA8", grey600:"#4A5568",
  green:"#0D9E6E", greenLight:"#E3F7F0", amber:"#C97A0A", amberLight:"#FEF2DC",
  red:"#C0392B", redLight:"#FDECEC", purple:"#6B3FA0", purpleLight:"#EEE5F9",
  teal:"#0A7B7A", tealLight:"#DCF2F2", blue:"#4F8EF7", blueLight:"#EAF2FE",
  accent:"#00C9B1", accentLight:"#E0FAF7", accentD:"#00A896",
};
const font = "'IBM Plex Sans', sans-serif";
const fontDisplay = "'Poppins', sans-serif";

// ===== inlined: pure helpers (format) =====
// GroupGrid pure helpers: date and time parsing/formatting, name and column normalization.
// No React or app state, safe to import anywhere.

// Times are stored canonically as 24h "HH:MM"; fmtTime renders them in the chosen format.
function parseTimeStr(val) {
  const p = n => String(n).padStart(2, "0");
  if (val === null || val === undefined || val === "") return "";
  if (typeof val === "number") {
    const frac = val - Math.floor(val);
    if (frac <= 0) return ""; // a pure date serial carries no time
    const total = Math.round(frac * 24 * 60);
    return p(Math.floor(total / 60) % 24) + ":" + p(total % 60);
  }
  if (val instanceof Date && !isNaN(val)) {
    const hh = val.getHours(), mm = val.getMinutes();
    if (hh === 0 && mm === 0) return ""; // midnight from a date-only cell is treated as "no time"
    return p(hh) + ":" + p(mm);
  }
  const s = String(val).trim();
  const m = s.match(/(\d{1,2}):(\d{2})\s*([ap]\.?m\.?)?/i); // 14:30, 2:30 PM, 9:05am, or embedded in a datetime
  if (m) {
    let hh = +m[1]; const mm = +m[2], ap = m[3] ? m[3].toLowerCase()[0] : null;
    if (ap === "p" && hh < 12) hh += 12;
    if (ap === "a" && hh === 12) hh = 0;
    if (hh > 23 || mm > 59) return "";
    return p(hh) + ":" + p(mm);
  }
  return "";
}
// Render a canonical "HH:MM" as 12h "2:30 PM" (default) or 24h "14:30".
function fmtTime(hhmm, fmt) {
  if (!hhmm) return "";
  const m = /^(\d{1,2}):(\d{2})$/.exec(hhmm);
  if (!m) return hhmm;
  let hh = +m[1]; const mm = m[2];
  if (fmt === "24hr") return String(hh).padStart(2, "0") + ":" + mm;
  const ap = hh >= 12 ? "PM" : "AM"; let h12 = hh % 12; if (h12 === 0) h12 = 12;
  return h12 + ":" + mm + " " + ap;
}

function parseDate(val) {
  if (val === null || val === undefined || val === "") return null;
  // Already a Date object
  if (val instanceof Date && !isNaN(val)) return atNoon(val.getFullYear(), val.getMonth(), val.getDate());
  // Excel serial number. Whole part = date; fractional part = time of day. We only want the calendar day.
  if (typeof val === "number") {
    const d = new Date(Math.round((Math.floor(val) - 25569) * 86400 * 1000)); // floor() drops the time fraction
    if (isNaN(d)) return null;
    // Excel serials are UTC-based; read UTC components so the day doesn't shift by timezone.
    return atNoon(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate());
  }
  const s = String(val).trim();
  if (!s) return null;
  // Pull the DATE part out of a combined "date + time" string so a late-night time can't roll the day over.
  // Handles: "2026-06-18", "2026-06-18 23:45", "2026-06-18T23:45:00Z", "6/18/2026 11:45 PM", "06/18/2026"
  let m = s.match(/^(\d{4})[-/](\d{1,2})[-/](\d{1,2})/);            // ISO-ish: YYYY-MM-DD (optionally followed by time)
  if (m) return atNoon(+m[1], +m[2] - 1, +m[3]);
  m = s.match(/^(\d{1,2})[-/](\d{1,2})[-/](\d{2,4})/);              // US-ish: M/D/YYYY (optionally followed by time)
  if (m) { let y = +m[3]; if (y < 100) y += 2000; return atNoon(y, +m[1] - 1, +m[2]); }
  // Fallback: let the browser try, then normalize to noon-local on the day it landed on.
  const d = new Date(s);
  if (isNaN(d)) return null;
  return atNoon(d.getFullYear(), d.getMonth(), d.getDate());
}
// Build a date at noon local time. Noon avoids any midnight/timezone edge from ever shifting the calendar day.
function atNoon(y, mo, day) { const d = new Date(y, mo, day, 12, 0, 0, 0); return isNaN(d) ? null : d; }
function fmt(date) { if (!date) return "—"; return date.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }); }
// When results are restored from localStorage (JSON), Date objects come back as strings.
// Rehydrate every date field back into a real Date so .toLocaleDateString()/.getTime() work.
function rehydrateDate(v) {
  if (!v) return v;
  if (v instanceof Date) return v;
  const d = new Date(v);
  return isNaN(d.getTime()) ? null : d;
}
function rehydrateResults(results) {
  if (!Array.isArray(results)) return results;
  return results.map(r => {
    const out = { ...r };
    if (out.flight) out.flight = { ...out.flight, flightArrival: rehydrateDate(out.flight.flightArrival), flightDeparture: rehydrateDate(out.flight.flightDeparture) };
    if (out.hotel)  out.hotel  = { ...out.hotel,  checkIn: rehydrateDate(out.hotel.checkIn), checkOut: rehydrateDate(out.hotel.checkOut) };
    if (out.car)    out.car    = { ...out.car,    pickupDate: rehydrateDate(out.car.pickupDate), dropoffDate: rehydrateDate(out.car.dropoffDate) };
    if (out.reg)    out.reg    = { ...out.reg,    regCheckIn: rehydrateDate(out.reg.regCheckIn), regCheckOut: rehydrateDate(out.reg.regCheckOut) };
    if (out.regCheckIn)  out.regCheckIn  = rehydrateDate(out.regCheckIn);
    if (out.regCheckOut) out.regCheckOut = rehydrateDate(out.regCheckOut);
    return out;
  });
}
function stripTime(d) { if (!d) return null; const x = new Date(d); x.setHours(0, 0, 0, 0); return x; }
function diffDays(a, b) { if (!a || !b) return null; return Math.round((stripTime(a) - stripTime(b)) / 86400000); }
function findCol(headers, candidates) {
  const h = headers.map(x => String(x || "").toLowerCase().trim());
  // Exact header match first (so "Arrival" the date isn't confused with "Arrival Airport").
  for (const c of candidates) { const i = h.indexOf(c); if (i !== -1) return i; }
  // Then substring match as a fallback.
  for (const c of candidates) { const i = h.findIndex(x => x.includes(c)); if (i !== -1) return i; }
  return -1;
}
function normName(n) { return String(n || "").toLowerCase().replace(/[^a-z]/g, ""); }
function normEmail(e) { return String(e || "").toLowerCase().trim(); }
function splitName(full) {
  const s = String(full || "").trim();
  if (!s) return { firstName: "", lastName: "" };
  // Handle "Last, First" format
  if (s.includes(",")) {
    const [last, ...rest] = s.split(",");
    return { firstName: rest.join(",").trim(), lastName: last.trim() };
  }
  const parts = s.split(/\s+/);
  if (parts.length === 1) return { firstName: parts[0], lastName: "" };
  const lastName = parts.pop();
  return { firstName: parts.join(" "), lastName };
}

// ===== inlined: brand marks + icons =====
// GroupGrid brand mark, logo lockup, wordmark, and the single-line icon set.

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
function BrandMark({ size = 28, onDark = true }) {
  return (
    <svg width={size} height={size} viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg" style={{ flexShrink: 0, display: "block" }}>
      <rect width="100" height="100" rx="26" fill={onDark ? "#0A1A33" : "#0C1E3F"} />
      {markDots()}
    </svg>
  );
}
// Full official lockup: the mark + the two-tone GroupGrid wordmark (Poppins).
// viewBox 0 0 470 100, matching the kit's logo-onlight / logo-ondark SVGs.
function BrandLogo({ height = 26, onDark = true }) {
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
function BrandWordmark({ light = true, size = 16 }) {
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
function GridIcon({ size = 20, line = P.navy, accent = P.accent }) {
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
function CrossCheckIcon({ size = 20, line = P.navy, accent = P.accent }) {
  return svgIcon(size, line, <><path d="M5 8.5a7 7 0 0 1 11.5-2.7L19 8" /><path d="M19 16a7 7 0 0 1-11.5 2.7L5 16" /><path d="M19 4v4h-4" stroke={accent} /><path d="M5 20v-4h4" stroke={accent} /></>);
}
function FlagIcon({ size = 20, line = P.navy, accent = P.accent }) {
  return svgIcon(size, line, <><path d="M6 21V4" /><path d="M6 4.5h11l-2.2 4 2.2 4H6" stroke={accent} /></>);
}
function ClearedIcon({ size = 20, line = P.navy, accent = P.accent }) {
  return svgIcon(size, line, <><circle cx="12" cy="12" r="9.5" /><path d="M7.5 12.3l3.1 3.1L16.5 9" stroke={accent} /></>);
}
function SpreadsheetIcon({ size = 20, line = P.navy, accent = P.accent }) {
  return svgIcon(size, line, <><rect x="4" y="4" width="16" height="16" rx="2" /><path d="M4 10h16M10 10v10" stroke={accent} /></>);
}
function MagnifierIcon({ size = 20, line = P.navy, accent = P.accent }) {
  return svgIcon(size, line, <><circle cx="11" cy="11" r="6.2" /><path d="M20 20l-4.6-4.6" /><path d="M8.4 11l2 2 3.4-3.4" stroke={accent} /></>);
}
function UploadIcon({ size = 20, line = P.navy, accent = P.accent }) {
  return svgIcon(size, line, <><path d="M12 16V5" /><path d="M8 9l4-4 4 4" stroke={accent} /><path d="M5 20h14" /></>);
}
function PlaneIcon({ size = 20, line = P.navy, accent = P.accent }) {
  return svgIcon(size, line, <path d="M17.8 19.2 16 11l3.5-3.5C21 6 21.5 4 21 3c-1-.5-3 0-4.5 1.5L13 8 4.8 6.2c-.5-.1-.9.1-1.1.5l-.3.5c-.2.5-.1 1 .3 1.3L9 12l-2 3H4l-1 1 3 2 2 3 1-1v-3l3-2 3.5 5.3c.3.4.8.5 1.3.3l.5-.2c.4-.3.6-.7.5-1.2z" />);
}
function HotelIcon({ size = 20, line = P.navy, accent = P.accent }) {
  return svgIcon(size, line, <><path d="M3 19v-6.5l2-1V8a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v3.5l2 1V19" /><path d="M3 13h18" stroke={accent} /><path d="M7 11.5V10h4v1.5" /></>);
}
function CarIcon({ size = 20, line = P.navy, accent = P.accent }) {
  return svgIcon(size, line, <><path d="M4 16l1.7-4.9A2 2 0 0 1 7.6 9.8h8.8a2 2 0 0 1 1.9 1.3L20 16" /><path d="M3 16h18v2.6h-2.3V16M5.3 18.6V16" /><circle cx="8" cy="16" r="1.3" /><circle cx="16" cy="16" r="1.3" /></>);
}
function CalendarIcon({ size = 20, line = P.navy, accent = P.accent }) {
  return svgIcon(size, line, <><rect x="4" y="5" width="16" height="15" rx="2" /><path d="M4 9.5h16M8 3v4M16 3v4" /><path d="M8.5 13.5l2 2 3.5-3.5" stroke={accent} /></>);
}
function PeopleIcon({ size = 20, line = P.navy, accent = P.accent }) {
  return svgIcon(size, line, <><circle cx="9" cy="8.5" r="3" /><path d="M3.5 19c0-3.1 2.4-4.9 5.5-4.9s5.5 1.8 5.5 4.9" /><path d="M16 6.4a2.8 2.8 0 0 1 0 5.5" stroke={accent} /><path d="M17 14.3c2.4.4 3.7 2.1 3.7 4.7" stroke={accent} /></>);
}
function AlertIcon({ size = 20, line = P.navy, accent = P.amber }) {
  return svgIcon(size, line, <><path d="M12 4 2.5 20.5h19z" /><path d="M12 10v4.5" stroke={accent} /><path d="M12 17.6v.2" stroke={accent} /></>);
}
function CityIcon({ size = 20, line = P.navy, accent = P.accent }) {
  return svgIcon(size, line, <><path d="M3 20V9.5l5-2.5V20" /><path d="M8 20V4l6 2.6V20" /><path d="M14 20v-7l5 2V20" /><path d="M2.5 20h19" /><path d="M10.5 10v0M10.5 13.5v0M5.3 12v0" stroke={accent} /></>);
}
function GlobeIcon({ size = 20, line = P.navy, accent = P.accent }) {
  return svgIcon(size, line, <><circle cx="12" cy="12" r="8.2" /><path d="M3.8 12h16.4" stroke={accent} /><path d="M12 3.8c2.6 2.3 2.6 14.1 0 16.4M12 3.8c-2.6 2.3-2.6 14.1 0 16.4" /></>);
}
function BadgeIcon({ size = 20, line = P.navy, accent = P.accent }) {
  return svgIcon(size, line, <><rect x="7" y="3" width="10" height="6" rx="1.5" /><rect x="5.5" y="9" width="13" height="11" rx="2" /><path d="M9.5 14h5" stroke={accent} /></>);
}

// ===== inlined: email templates + routing =====
// GroupGrid email templates: default library, vendor bodies, routing tables, and TemplateIcon.

// ── Default Email Templates ───────────────────────────────────────────────────
const DEFAULT_TEMPLATES = {
  arrives_early: {
    id: "arrives_early",
    label: "Arrives Before Check-In",
    icon: "✈",
    color: P.amber,
    description: "Guest flight arrives before hotel check-in date",
    subject: "{{eventName}} [Arrival]: Could you confirm your travel details?",
    body: `Hi {{guestName}},

We are reviewing travel for {{eventName}} and spotted a timing gap to confirm with you:

──────────────────────
Flight arrives: {{flightArrival}}{{arrivalTimeTail}} into {{arrivalAirport}} (Flight {{flightIn}})
Hotel check-in: {{checkIn}} at {{hotel}}

Your flight lands the day before your hotel check-in.
──────────────────────

What we need: reply to let us know one of these.

  My arrival night is covered, no change needed.
  Please add an extra night at {{hotel}} for me.

Happy to contact {{hotel}} for you if that is easier.

Warmly,
{{plannerName}}
{{eventName}} Planning Team`,
  },
  arrives_late: {
    id: "arrives_late",
    label: "Possible Late Arrival",
    icon: "🌙",
    color: P.amber,
    description: "Guest arrives after the late-arrival cutoff — hotel may release the room",
    subject: "{{eventName}} [Late Arrival]: Please hold the room for {{guestFullName}}",
    body: `Hi {{guestName}},

A quick heads-up about your arrival for {{eventName}}:

──────────────────────
Expected arrival: {{expectedArrival}}
Hotel check-in: {{checkIn}} at {{hotel}}
──────────────────────

Your arrival is later in the evening, so we are letting {{hotel}} know to hold your room. No action needed on your side — just reply if your plans change.

Warmly,
{{plannerName}}
{{eventName}} Planning Team`,
  },
  departs_late: {
    id: "departs_late",
    label: "Departs After Check-Out",
    icon: "🏨",
    color: P.amber,
    description: "Guest flight departs after hotel check-out date",
    subject: "{{eventName}} [Departure]: Could you confirm your travel details?",
    body: `Hi {{guestName}},

We are reviewing travel for {{eventName}} and spotted a timing gap to confirm:

──────────────────────
Hotel check-out: {{checkOut}} at {{hotel}}
Flight departs: {{flightDeparture}}{{departureTimeTail}} from {{departureAirport}} (Flight {{flightOut}})

Your hotel checks out before your flight departs.
──────────────────────

What we need: reply to let us know one of these.

  My departure night is covered, no change needed.
  Please extend my stay at {{hotel}} by one night.

Happy to contact {{hotel}} for you if that is easier.

Warmly,
{{plannerName}}
{{eventName}} Planning Team`,
  },
  missing_hotel: {
    id: "missing_hotel",
    label: "No Hotel Record Found",
    icon: "🏨",
    color: P.red,
    description: "Guest appears in flight list but no hotel booking on file",
    subject: "{{eventName}} [Hotel]: Could you confirm your travel details?",
    body: `Hi {{guestName}},

We are reviewing travel for {{eventName}} and we do not have a hotel booking on file for you:

──────────────────────
Flight arrives: {{flightArrival}}{{arrivalTimeTail}} into {{arrivalAirport}} (Flight {{flightIn}})
Hotel booking: Not on file
──────────────────────

We do not want you arriving without a room. What we need: reply with one of these.

  I booked my own hotel. Confirmation: ___________
  Please book a room for me.

Warmly,
{{plannerName}}
{{eventName}} Planning Team`,
  },
  missing_flight: {
    id: "missing_flight",
    label: "No Flight Record Found",
    icon: "✈",
    color: P.red,
    description: "Guest appears in hotel list but no flight on file",
    subject: "{{eventName}} [Flight]: Could you confirm your travel details?",
    body: `Hi {{guestName}},

Your room at {{hotel}} is confirmed for {{eventName}}, but we do not have your flight details yet:

──────────────────────
Flight: Not on file
Hotel check-in: {{checkIn}} at {{hotel}}
──────────────────────

What we need: reply with your inbound and outbound flight numbers, dates, and arrival airport. If you are not flying, just let us know and we will update your record.

Warmly,
{{plannerName}}
{{eventName}} Planning Team`,
  },
  missing_transfer: {
    id: "missing_transfer",
    label: "No Transfer on File",
    icon: "🚗",
    color: P.amber,
    description: "Guest has no car transfer record",
    subject: "{{eventName}} [Transfer]: Could you confirm your travel details?",
    body: `Hi {{guestName}},

We are arranging ground transfers for {{eventName}} and do not have one on file for you:

──────────────────────
Flight arrives: {{flightArrival}}{{arrivalTimeTail}} into {{arrivalAirport}} (Flight {{flightIn}})
Transfer: Not on file
──────────────────────

What we need: reply with your preference.

  Yes, please arrange a transfer from {{arrivalAirport}} to {{hotel}}.
  No thanks, I have my own transportation.

Warmly,
{{plannerName}}
{{eventName}} Planning Team`,
  },
  car_mismatch: {
    id: "car_mismatch",
    label: "Car Transfer Timing",
    icon: "🚗",
    color: P.red,
    description: "Car transfer time does not line up with the guest's flight",
    subject: "{{eventName}} [Car Transfer]: Could you confirm your travel details?",
    body: `Hi {{guestName}},

We are reviewing ground transfers for {{eventName}} and your transfer times do not line up with your flights:

──────────────────────
Flight arrives: {{flightArrival}}{{arrivalTimeTail}}
Car pickup: {{carPickup}}

Flight departs: {{flightDeparture}}{{departureTimeTail}}
Car dropoff: {{carDropoff}}
──────────────────────

What we need: reply to confirm these times are right, or tell us what to adjust.

Warmly,
{{plannerName}}
{{eventName}} Planning Team`,
  },
  needs_registration: {
    id: "needs_registration",
    label: "Needs to Register",
    icon: "📝",
    color: P.purple,
    description: "Guest has travel booked but is not on the registration list",
    subject: "{{eventName}} [Registration]: Could you confirm your travel details?",
    body: `Hi {{guestName}},

We can see travel arranged for you for {{eventName}}, but you are not yet on our registration list:

──────────────────────
We have booked for you:
{{bookedTravel}}

Registration: Not on file
──────────────────────

What we need: complete your registration for {{eventName}}. It takes a minute and confirms your spot. If you believe you already registered, just reply and we will check.

Warmly,
{{plannerName}}
{{eventName}} Planning Team`,
  },
  wrong_airport: {
    id: "wrong_airport",
    label: "Different Airport",
    icon: "✈",
    color: "#4F8EF7",
    description: "Guest is flying into an airport that isn't a preferred event airport",
    subject: "{{eventName}} [Airport]: Could you confirm your travel details?",
    body: `Hi {{guestName}},

We are reviewing travel for {{eventName}} and noticed your arrival airport:

──────────────────────
Flight arrives: {{arrivalAirport}} on {{flightArrival}}{{arrivalTimeTail}} (Flight {{flightIn}})

This is not an airport we are coordinating arrivals around.
──────────────────────

This may be intentional. What we need: reply to confirm your airport is correct, or let us know if you would like help adjusting it.

Warmly,
{{plannerName}}
{{eventName}} Planning Team`,
  },
  outside_window: {
    id: "outside_window",
    label: "Outside Approved Travel Window",
    icon: "🗓",
    color: P.purple,
    description: "Guest travel dates fall outside the approved event window",
    subject: "{{eventName}} [Travel Dates]: Could you confirm your travel details?",
    body: `Hi {{guestName}},

We are reviewing travel for {{eventName}} and your dates fall outside the event travel window:

──────────────────────
Flight arrives: {{flightArrival}}{{arrivalTimeTail}} into {{arrivalAirport}}
Flight departs: {{flightDeparture}}{{departureTimeTail}} from {{departureAirport}}
Event window: {{eventStart}} to {{eventEnd}}
──────────────────────

This may be intentional. What we need: reply to confirm your dates are correct, or tell us if they need a change.

Warmly,
{{plannerName}}
{{eventName}} Planning Team`,
  },
  abstract_reminder: {
    id: "abstract_reminder",
    label: "Submitted Abstract, Not Registered",
    icon: "📝",
    color: P.purple,
    description: "Submitted an abstract but has not completed registration",
    subject: "{{eventName}} [Registration]: Please complete your registration",
    body: `Hi {{guestName}},

Thank you for submitting an abstract for {{eventName}}. We do not yet see a completed registration for you:

──────────────────────
Abstract: on file
Registration: Not on file
──────────────────────

What we need: please complete your registration so we can confirm your spot and, if you are presenting, coordinate your travel. If you have already registered, just reply and we will check.

Warmly,
{{plannerName}}
{{eventName}} Planning Team`,
  },
  general_confirmation: {
    id: "general_confirmation",
    label: "General Travel Confirmation",
    icon: "✅",
    color: P.green,
    description: "Proactive confirmation request for all guests",
    subject: "{{eventName}} [Travel Review]: Could you confirm your travel details?",
    body: `Hi {{guestName}},

A quick travel check for {{eventName}}. Here is what we have on file:

──────────────────────
Arrival: {{flightArrival}}{{arrivalTimeTail}} into {{arrivalAirport}} (Flight {{flightIn}})
Hotel: {{checkIn}} to {{checkOut}} at {{hotel}}
Departure: {{flightDeparture}}{{departureTimeTail}} from {{departureAirport}} (Flight {{flightOut}})
──────────────────────

What we need: reply to confirm it is correct, or tell us what to change.

  Looks good, I am all set.
  Please update: ___________

Warmly,
{{plannerName}}
{{eventName}} Planning Team`,
  },
};
function fillTemplate(template, record, extra = {}) {
  const map = {
    "{{guestName}}": record.firstName || record.displayName || "",
    "{{guestFirstName}}": record.firstName || record.displayName.split(" ")[0] || "",
    "{{guestLastName}}": record.lastName || record.displayName.split(" ").slice(1).join(" ") || "",
    "{{guestFullName}}": record.displayName || "",
    "{{eventName}}": extra.eventName || "our event",
    "{{flightArrival}}": fmt(record.flight?.flightArrival) || "—",
    "{{flightDeparture}}": fmt(record.flight?.flightDeparture) || "—",
    "{{arrivalTime}}": fmtTime(record.flight?.arrivalTime, "ampm") || "—",
    "{{departureTime}}": fmtTime(record.flight?.departureTime, "ampm") || "—",
    "{{arrivalTimeTail}}": record.flight?.arrivalTime ? ` at ${fmtTime(record.flight.arrivalTime, "ampm")}` : "",
    "{{departureTimeTail}}": record.flight?.departureTime ? ` at ${fmtTime(record.flight.departureTime, "ampm")}` : "",
    "{{carPickupTime}}": fmtTime(record.car?.pickupTime, "ampm") || "—",
    "{{carDropoffTime}}": fmtTime(record.car?.dropoffTime, "ampm") || "—",
    "{{flightIn}}": record.flight?.flightIn || "—",
    "{{flightOut}}": record.flight?.flightOut || "—",
    "{{arrivalAirport}}": record.flight?.arrivalAirport || record.flight?.airport || "the airport",
    "{{departureAirport}}": record.flight?.departureAirport || record.flight?.airport || "the airport",
    "{{airport}}": record.flight?.airport || record.flight?.arrivalAirport || record.flight?.departureAirport || "the airport",
    "{{checkIn}}": fmt(record.hotel?.checkIn) || "—",
    "{{checkOut}}": fmt(record.hotel?.checkOut) || "—",
    "{{hotel}}": record.hotel?.hotel || "the hotel",
    "{{room}}": record.hotel?.room || "—",
    "{{expectedArrival}}": (() => {
      const f = record.flight, c = record.car;
      if (f?.flightArrival) return `${fmt(f.flightArrival)}${f.arrivalTime ? ` at ${fmtTime(f.arrivalTime, "ampm")}` : ""}${f.flightIn ? ` (Flight ${f.flightIn})` : ""}`;
      if (c?.pickupDate) return `${fmt(c.pickupDate)}${c.pickupTime ? ` at ${fmtTime(c.pickupTime, "ampm")}` : ""} (car transfer)`;
      return "—";
    })(),
    "{{bookedTravel}}": (() => {
      const lines = [];
      if (record.flight) {
        const arr = fmt(record.flight.flightArrival);
        const t = record.flight.arrivalTime ? ` at ${fmtTime(record.flight.arrivalTime, "ampm")}` : "";
        const tail = record.flight.flightIn ? ` (Flight ${record.flight.flightIn})` : "";
        lines.push(`Flight arrival: ${arr || "on file"}${t}${tail}`);
      }
      if (record.hotel) {
        lines.push(`Hotel: ${record.hotel.hotel || "booking on file"}`);
      }
      if (record.car) {
        const ct = record.car.pickupTime ? ` at ${fmtTime(record.car.pickupTime, "ampm")}` : "";
        lines.push(`Car transfer: ${fmt(record.car.pickupDate) || "on file"}${ct}`);
      }
      if (!lines.length) lines.push("Travel details on file");
      return lines.join("\n");
    })(),
    "{{hotelContact}}": extra.hotelName || "Hotel Team",
    "{{travelContact}}": extra.travelName || "Travel Team",
    "{{carContact}}": extra.carName || "Transfer Team",
    "{{guestEmailParen}}": record.email ? ` (${record.email})` : "",
    "{{flightInTail}}": record.flight?.flightIn ? ` — Flight ${record.flight.flightIn}` : "",
    "{{flightOutTail}}": record.flight?.flightOut ? ` — Flight ${record.flight.flightOut}` : "",
    "{{issueSummary}}": (record.issues || []).filter(x => !(record.resolved || []).includes(x.text)).map(x => x.text).join("; ") || "—",
    "{{carPickup}}": fmt(record.car?.pickupDate) || "—",
    "{{carDropoff}}": fmt(record.car?.dropoffDate) || "—",
    "{{plannerName}}": extra.plannerName || "The Planning Team",
    "{{arrivalEnd}}": extra.arrivalEnd ? fmt(parseDate(extra.arrivalEnd)) : "—",
    "{{departureEnd}}": extra.departureEnd ? fmt(parseDate(extra.departureEnd)) : "—",
    "{{eventStart}}": extra.arrivalStart ? fmt(parseDate(extra.arrivalStart)) : "—",
    "{{eventEnd}}": extra.departureEnd ? fmt(parseDate(extra.departureEnd)) : "—",
  };
  let s = template;
  Object.entries(map).forEach(([k, v]) => { s = s.split(k).join(v); });
  return s;
}

function getApplicableTemplates(record) {
  const applicable = [];
  const issues = record.issues || [];
  const has = (sub) => issues.some(x => x.text && x.text.includes(sub));
  // Hotel arrival-timing issues (flight vs check-in, or check-in differs from registration) → hotel
  if (has("check-in")) applicable.push("arrives_early");
  // Hotel departure-timing issues (flight vs check-out, or check-out differs from registration) → hotel
  else if (has("check-out")) applicable.push("departs_late");
  // Missing hotel — matches both the registration-anchored text and the travel-vs-travel fallback text
  if (has("no hotel booked") || has("Missing from hotel roster") || has("no hotel' but no reason")) applicable.push("missing_hotel");
  // Missing flight — same, across both engine paths
  if (has("no flight booked") || has("Missing from flight manifest") || has("no flight' but no reason")) applicable.push("missing_flight");
  if (has("Missing from car transfers")) applicable.push("missing_transfer");
  // Car transfer timing mismatch (pickup vs flight arrival, dropoff vs flight departure)
  if (has("Car pickup") || has("Car dropoff")) applicable.push("car_mismatch");
  if (has("not on registration list") || issues.some(x => x.type === "unregistered")) applicable.push("needs_registration");
  if (issues.some(x => x.type === "window")) applicable.push("outside_window");
  if (issues.some(x => x.type === "airport")) applicable.push("wrong_airport");
  if (issues.some(x => x.type === "earlyarrival") && !applicable.includes("arrives_early")) applicable.push("arrives_early");
  if (issues.some(x => x.type === "latearrival")) applicable.push("arrives_late");
  if (issues.some(x => x.type === "abstract_unreg")) applicable.push("abstract_reminder");
  return applicable;
}

// ── Email routing: who each template is addressed TO, by default ───────────────
// audience: "hotel" | "travel" | "car" | "guest". Vendor-routed templates carry a
// vendor-addressed body so the recipient never gets a "Hi {{guestName}}" email meant
// for the attendee. The original guest-addressed body stays on the template as a fallback.
const TEMPLATE_AUDIENCE = {
  arrives_early:      "hotel",
  arrives_late:       "hotel",
  departs_late:       "hotel",
  missing_hotel:      "hotel",
  missing_flight:     "travel",
  outside_window:     "guest",
  wrong_airport:      "guest",
  missing_transfer:   "car",
  car_mismatch:       "car",
  needs_registration: "guest",
  abstract_reminder: "guest",
  general_confirmation: "guest",
};
// Group the comms by what they are about, so hotel/flight/car messages sit together.
const TEMPLATE_CATEGORY = {
  arrives_early:      "Hotel",
  arrives_late:       "Hotel",
  departs_late:       "Hotel",
  missing_hotel:      "Hotel",
  missing_flight:     "Flight",
  wrong_airport:      "Flight",
  outside_window:     "Flight",
  missing_transfer:   "Car Transfer",
  car_mismatch:       "Car Transfer",
  needs_registration: "Registration & Confirmation",
  abstract_reminder: "Registration & Confirmation",
  general_confirmation: "Registration & Confirmation",
};
const CATEGORY_ORDER = ["Hotel", "Flight", "Car Transfer", "Registration & Confirmation", "Custom"];
// Brand icon for each template (single-line GroupGrid icon set).
const TEMPLATE_ICON_KEY = {
  arrives_early:      "hotel",
  arrives_late:       "hotel",
  departs_late:       "hotel",
  missing_hotel:      "hotel",
  missing_flight:     "plane",
  wrong_airport:      "flag",
  outside_window:     "calendar",
  missing_transfer:   "car",
  car_mismatch:       "car",
  needs_registration: "people",
  abstract_reminder: "people",
  general_confirmation: "cleared",
};
const TEMPLATE_ICONS = { hotel: HotelIcon, plane: PlaneIcon, car: CarIcon, flag: FlagIcon, calendar: CalendarIcon, people: PeopleIcon, cleared: ClearedIcon };
function TemplateIcon({ tmpl, size = 20 }) {
  const Comp = TEMPLATE_ICONS[TEMPLATE_ICON_KEY[tmpl.id]];
  if (Comp) return <Comp size={size} line={tmpl.color} accent={tmpl.color} />;
  return <span style={{ fontSize: size - 2 }}>{tmpl.icon}</span>; // custom templates keep their emoji
}
// Vendor-addressed bodies, keyed by audience. The planner is writing TO the vendor about a guest.
const VENDOR_BODY = {
  hotel: `Dear {{hotelContact}},

I am writing about {{guestFullName}}{{guestEmailParen}} for {{eventName}}. While reviewing guest records we found an issue to confirm:

──────────────────────
Guest: {{guestFullName}}
Flight arrival: {{flightArrival}}{{arrivalTimeTail}}{{flightInTail}}
Hotel check-in: {{checkIn}} at {{hotel}}
Hotel check-out: {{checkOut}}
Flight departure: {{flightDeparture}}{{departureTimeTail}}{{flightOutTail}}

Issue: {{issueSummary}}
──────────────────────

Could you confirm the correct booking details at your earliest convenience? Thank you.

Warm regards,
{{plannerName}}
{{eventName}} Planning Team`,
  travel: `Dear {{travelContact}},

I am writing about the itinerary for {{guestFullName}}{{guestEmailParen}} for {{eventName}}. While reviewing guest records we found something to confirm:

──────────────────────
Guest: {{guestFullName}}
Inbound: {{flightArrival}}{{arrivalTimeTail}} into {{arrivalAirport}}{{flightInTail}}
Hotel check-in: {{checkIn}} at {{hotel}}
Hotel check-out: {{checkOut}}
Outbound: {{flightDeparture}}{{departureTimeTail}} from {{departureAirport}}{{flightOutTail}}

Issue: {{issueSummary}}
──────────────────────

Please advise on the correct details and any changes needed. Thank you.

Warm regards,
{{plannerName}}
{{eventName}} Planning Team`,
  car: `Dear {{carContact}},

I am writing about the ground transfer for {{guestFullName}}{{guestEmailParen}} for {{eventName}}. While reviewing guest records we found something to confirm:

──────────────────────
Guest: {{guestFullName}}
Flight arrival: {{flightArrival}}{{arrivalTimeTail}}{{flightInTail}}
Car pickup: {{carPickup}}
Car dropoff: {{carDropoff}}
Flight departure: {{flightDeparture}}{{departureTimeTail}}{{flightOutTail}}

Issue: {{issueSummary}}
──────────────────────

Could you confirm the transfer times are correct, or let us know if they need adjusting? Thank you.

Warm regards,
{{plannerName}}
{{eventName}} Planning Team`,
};
// Per-template vendor bodies. When a built-in template needs a message tailored beyond the
// generic per-audience VENDOR_BODY, its id maps to a specific body here and takes precedence.
const VENDOR_BODY_OVERRIDE = {
  arrives_late: `Dear {{hotelContact}},

I am writing about a late arrival for {{guestFullName}}{{guestEmailParen}}, a confirmed guest for {{eventName}}. Their travel is scheduled to arrive later in the evening, potentially after your standard check-in cutoff:

──────────────────────
Guest: {{guestFullName}}
Room / confirmation: {{room}}
Hotel check-in: {{checkIn}} at {{hotel}}
Expected arrival: {{expectedArrival}}
──────────────────────

Please hold the room for a late arrival so it is not released if the guest has not checked in by your standard cutoff. Kindly confirm the room will be held.

Thank you very much.

Warm regards,
{{plannerName}}
{{eventName}} Planning Team`,
};

// Build version — bump this whenever code is deployed so you can confirm at a glance which build is live.
const APP_VERSION = "v9.5 · Jun 2026";
// Deep-linkable marketing/legal pages. Maps URL path <-> in-app page so groupgrid.io/privacy
// loads the policy directly (and refresh/share keeps you there). Landing and app both live at "/".
const PAGE_PATHS = { privacy:"/privacy", terms:"/terms", pricing:"/pricing", about:"/about", faq:"/faq", contact:"/contact" };
function pathToPage(pathname) {
  const p = (pathname || "/").replace(/\/+$/, "").toLowerCase() || "/";
  for (const k in PAGE_PATHS) { if (PAGE_PATHS[k] === p) return k; }
  return "landing";
}
// Feature flag: hide the Dietary/Access feature from the UI for now while focusing on
// registration, flights, hotels, and cars. The parsing/engine code stays intact —
// flip this to true to bring the dietary upload, column, and detail back everywhere.
const SHOW_DIETARY = false;


// ── Responsive hook ───────────────────────────────────────────────────────────
function useIsMobile(breakpoint = 768) {
  const [isMobile, setIsMobile] = useState(() => typeof window !== "undefined" ? window.innerWidth < breakpoint : false);
  useEffect(() => {
    const mq = window.matchMedia(`(max-width: ${breakpoint - 1}px)`);
    const handler = e => setIsMobile(e.matches);
    mq.addEventListener("change", handler);
    setIsMobile(mq.matches);
    return () => mq.removeEventListener("change", handler);
  }, [breakpoint]);
  return isMobile;
}

// ── Global mobile CSS (injected once) ────────────────────────────────────────
const MOBILE_CSS = `
  * { box-sizing: border-box; }
  html, body { margin: 0; padding: 0; max-width: 100%; overflow-x: clip; overscroll-behavior-y: none; }
  #root { overflow-x: clip; max-width: 100%; }
  @media (max-width: 767px) {
    .gg-landing-nav { padding: 0 16px !important; }
    .gg-landing-navlinks { display: none !important; }
    .gg-landing-logo svg { height: 30px !important; width: auto !important; }
    .gg-sidebar { transform: translateX(-100%); transition: transform 0.25s ease; position: fixed !important; z-index: 200; height: calc(100vh - 52px) !important; top: 52px !important; }
    .gg-sidebar.open { transform: translateX(0); }
    .gg-sidebar-overlay { display: block !important; }
    .gg-main { margin-left: 0 !important; }
    .gg-upload-grid { grid-template-columns: 1fr 1fr !important; }
    .gg-col-guide { grid-template-columns: 1fr 1fr !important; }
    .gg-timeline-grid { grid-template-columns: 1fr !important; gap: 28px !important; }
    .gg-timeline-arrow { top: auto !important; bottom: -22px !important; right: 50% !important; transform: translateX(50%) rotate(90deg) !important; }
    .gg-card-grid-3 { grid-template-columns: 1fr !important; }
    .gg-hero-card { width: 100% !important; }
    .gg-demo-body { flex-direction: column !important; }
    .gg-demo-sidebar { width: 100% !important; flex-direction: row !important; flex-wrap: wrap !important; gap: 8px !important; }
    .gg-demo-table-scroll { overflow-x: auto !important; }
    .gg-header-extras { display: none !important; }
    .gg-table-wrap { -webkit-overflow-scrolling: touch; }
    .gg-modal { max-width: 100% !important; max-height: 100vh !important; border-radius: 0 !important; height: 100%; }
    .gg-modal-sheet { border-radius: 20px 20px 0 0 !important; max-height: 90vh; }
    .gg-detail-grid { grid-template-columns: 1fr !important; }
    .gg-landing-hero h1 { font-size: 28px !important; }
    .gg-landing-stats { grid-template-columns: 1fr !important; }
    .gg-landing-usecases { grid-template-columns: 1fr !important; }
    .gg-setup-grid2 { grid-template-columns: 1fr !important; }
    .gg-setup-tiles3 { grid-template-columns: 1fr !important; }
    .gg-setup-tiles2 { grid-template-columns: 1fr !important; }
    .gg-step-line { display: none !important; }
    .gg-mktnav-tabs { display: none !important; }
    .gg-setup-cols { grid-template-columns: 1fr !important; }
    .gg-eventbar { flex-direction: column !important; align-items: stretch !important; }
    .gg-eventbar > div { width: 100% !important; }
    .gg-eventbar > div:last-child { display: flex !important; gap: 8px !important; }
    .gg-eventbar > div:last-child > * { flex: 1 !important; }
    .gg-eventbar > div:last-child button { width: 100% !important; justify-content: center !important; }
    .gg-cta-btns { flex-direction: column; align-items: stretch !important; }
    .gg-pricing-grid { grid-template-columns: 1fr !important; }
    .gg-contacts-grid { grid-template-columns: 1fr !important; }
    .gg-bottom-nav { display: flex !important; }
    .gg-table-row-height td { height: 52px !important; }
  }
  .gg-sidebar-overlay { display: none; }
  .gg-bottom-nav { display: none; }
  /* Motion system (GroupGrid brand): rise and settle, then rest. Entrances 400-600ms,
     micro 120-200ms, ease-out cubic-bezier(.2,.8,.2,1). Nothing bounces, spins, or loops behind text. */
  @keyframes pulse { 0%,100%{opacity:.4} 50%{opacity:1} }
  @keyframes ggIn { from { opacity:0; transform:translateY(10px); } to { opacity:1; transform:translateY(0); } }
  @keyframes ggPulse { 0%,100%{opacity:.45} 50%{opacity:1} }
  @keyframes ggSlideUp { from { opacity:0; transform:translateY(100%); } to { opacity:1; transform:translateY(0); } }
  /* Honor reduced-motion: settle instantly instead of moving. */
  @media (prefers-reduced-motion: reduce) {
    *, *::before, *::after { animation-duration: 0.001ms !important; animation-iteration-count: 1 !important; transition-duration: 0.001ms !important; scroll-behavior: auto !important; }
  }
`;

function GlobalStyles() {
  useEffect(() => {
    // Ensure a correct mobile viewport meta exists even if the host index.html is missing or has a wrong one.
    let vp = document.querySelector('meta[name="viewport"]');
    if (!vp) { vp = document.createElement("meta"); vp.setAttribute("name", "viewport"); document.head.appendChild(vp); }
    vp.setAttribute("content", "width=device-width, initial-scale=1, viewport-fit=cover");
    // Set the GroupGrid brand-mark favicon at runtime so it shows even if index.html has none.
    const faviconSvg = "<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><rect width='100' height='100' rx='26' fill='#0C1E3F'/><circle cx='28' cy='28' r='9' fill='#00C9B1'/><circle cx='50' cy='28' r='9' fill='#A9C2DC'/><circle cx='72' cy='28' r='9' fill='#A9C2DC'/><circle cx='28' cy='50' r='9' fill='#A9C2DC'/><circle cx='50' cy='50' r='9' fill='#00C9B1'/><circle cx='72' cy='50' r='9' fill='#A9C2DC'/><circle cx='28' cy='72' r='9' fill='#A9C2DC'/><circle cx='50' cy='72' r='9' fill='#A9C2DC'/><circle cx='72' cy='72' r='9' fill='#00C9B1'/></svg>";
    const faviconHref = "data:image/svg+xml," + encodeURIComponent(faviconSvg);
    let icon = document.querySelector('link[rel="icon"]');
    if (!icon) { icon = document.createElement("link"); icon.setAttribute("rel", "icon"); document.head.appendChild(icon); }
    icon.setAttribute("type", "image/svg+xml");
    icon.setAttribute("href", faviconHref);
    let apple = document.querySelector('link[rel="apple-touch-icon"]');
    if (!apple) { apple = document.createElement("link"); apple.setAttribute("rel", "apple-touch-icon"); document.head.appendChild(apple); }
    apple.setAttribute("href", faviconHref);
    const el = document.createElement("style");
    el.id = "gg-mobile-css";
    el.textContent = MOBILE_CSS;
    if (!document.getElementById("gg-mobile-css")) document.head.appendChild(el);
    return () => { const e = document.getElementById("gg-mobile-css"); if (e) e.remove(); };
  }, []);
  return null;
}
function isOutside(date, ws, we) {
  if (!date) return false;
  const d = stripTime(date);
  if (ws && d < stripTime(ws)) return true;
  if (we && d > stripTime(we)) return true;
  return false;
}
// Alias table for the most common business-event airports, so a planner can type a code
// like "JFK" and still match "Kennedy" in a flight file (and vice versa). Not exhaustive —
// for airports not listed here, exact code / direct string matching still applies.
const AIRPORT_ALIASES = {
  jfk:["kennedy","johnfkennedy","newyork"], lga:["laguardia","newyork"], ewr:["newark","newarkliberty","newyork"],
  lax:["losangeles"], sfo:["sanfrancisco"], ord:["ohare","chicago"], mdw:["midway","chicago"],
  atl:["atlanta","hartsfield","hartsfieldjackson"], dfw:["dallas","dallasfortworth","fortworth"], dal:["love","lovefield","dallas"],
  mia:["miami"], fll:["fortlauderdale","lauderdale","hollywood"], mco:["orlando"], tpa:["tampa"],
  bos:["boston","logan"], dca:["reagan","national","reagannational","washington"], iad:["dulles","washington"], bwi:["baltimore","baltimorewashington"],
  sea:["seattle","seatac","seattletacoma"], den:["denver"], las:["lasvegas","vegas","harryreid","mccarran"], phx:["phoenix","skyharbor"],
  iah:["houston","bush","intercontinental"], hou:["hobby","houston"], aus:["austin","bergstrom"], san:["sandiego"],
  slc:["saltlake","saltlakecity"], msp:["minneapolis","stpaul","minneapolisstpaul"], dtw:["detroit","metro"], phl:["philadelphia"],
  clt:["charlotte"], nash:["nashville"], bna:["nashville"], rdu:["raleigh","durham","raleighdurham"], pdx:["portland"],
  lhr:["heathrow","london"], lgw:["gatwick","london"], cdg:["charlesdegaulle","degaulle","paris"], yyz:["toronto","pearson"], yul:["montreal","trudeau"],
};
function normAirport(s){ return String(s||"").toLowerCase().replace(/[^a-z0-9]/g,""); }
// Build the full set of tokens (code + aliases) a single preferred entry should match against.
function expandAirport(token){
  const n = normAirport(token);
  const set = new Set([n]);
  if (AIRPORT_ALIASES[n]) AIRPORT_ALIASES[n].forEach(a => set.add(a));        // code → names
  Object.entries(AIRPORT_ALIASES).forEach(([code,names]) => {                  // name → code
    if (names.includes(n)) { set.add(code); names.forEach(a => set.add(a)); }
  });
  return [...set];
}
// True if the guest's airport value matches NONE of the preferred airports.
function isWrongAirport(guestAirport, preferredList){
  if (!guestAirport || !preferredList || preferredList.length === 0) return false;
  const g = normAirport(guestAirport);
  if (!g) return false;
  for (const pref of preferredList) {
    for (const tok of expandAirport(pref)) {
      if (!tok) continue;
      if (g === tok || g.includes(tok) || tok.includes(g)) return false; // matches a preferred airport
    }
  }
  return true; // matched nothing on the preferred list
}

function parseSheet(wb, fieldMap, timeFallback = {}) {
  const rows = XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]], { header: 1, defval: "" });
  if (rows.length < 2) return [];
  const h = rows[0];
  const cols = {};
  // Add first/last name column detection to every sheet
  const fullFieldMap = {
    ...fieldMap,
    firstName: ["first name","firstname","first","given name","given"],
    lastName:  ["last name","lastname","last","surname","family name","family"],
  };
  Object.entries(fullFieldMap).forEach(([key, candidates]) => { cols[key] = findCol(h, candidates); });
  const dateFields = new Set(["flightArrival","flightDeparture","checkIn","checkOut","pickupDate","dropoffDate","regCheckIn","regCheckOut"]);
  const timeFields = new Set(Object.keys(fullFieldMap).filter(k => /Time$/.test(k)));
  return rows.slice(1).filter(r => r.some(c => c !== "")).map((r, i) => {
    const obj = {};
    Object.entries(cols).forEach(([key, idx]) => {
      if (timeFields.has(key)) {
        let tIdx = idx;
        if (tIdx < 0 && timeFallback[key] != null) tIdx = cols[timeFallback[key]]; // pull time out of the date cell
        obj[key] = tIdx >= 0 ? parseTimeStr(r[tIdx]) : "";
      }
      else if (dateFields.has(key)) obj[key] = idx >= 0 ? parseDate(r[idx]) : null;
      else if (key === "email") obj[key] = idx >= 0 ? normEmail(r[idx]) : "";
      else if (key === "name") obj[key] = idx >= 0 ? String(r[idx] || "").trim() : `Row ${i + 2}`;
      else obj[key] = idx >= 0 ? String(r[idx] || "").trim() : "";
    });
    // If sheet has separate first/last columns, build name from them; else split the name field
    if (obj.firstName || obj.lastName) {
      obj.name = [obj.firstName, obj.lastName].filter(Boolean).join(" ") || obj.name || `Row ${i + 2}`;
    } else {
      const { firstName, lastName } = splitName(obj.name);
      obj.firstName = firstName;
      obj.lastName = lastName;
    }
    return obj;
  });
}

function parseFlightSheet(wb) {
  return parseSheet(wb, { name:["name","attendee","passenger","guest","traveler"], email:["email","e-mail","email address"], flightArrival:["arrival date","inbound date","arrival","arrive","land","flight in"], flightDeparture:["departure date","return date","outbound date","departure","depart","fly out"], arrivalTime:["arrival time","arr time","inbound time","landing time","time in"], departureTime:["departure time","dep time","outbound time","return time","time out"], flightIn:["inbound flight","arrival flight","flight in #","inbound #"], flightOut:["outbound flight","departure flight","flight out","return flight"], arrivalAirport:["arrival airport","arr airport","arriving airport","inbound airport","origin airport","origin"], departureAirport:["departure airport","dep airport","departing airport","outbound airport","destination airport","destination"], airport:["airport","hub"] }, { arrivalTime:"flightArrival", departureTime:"flightDeparture" });
}
function parseHotelSheet(wb) {
  return parseSheet(wb, { name:["name","attendee","guest","passenger"], email:["email","e-mail","email address"], checkIn:["check-in","checkin","arrival","hotel in"], checkOut:["check-out","checkout","departure","hotel out"], room:["room","confirmation","conf","booking","reservation"], hotel:["hotel","property","venue"] });
}
// Parse a hotel roster and tag every record with a property name.
// Priority: the row's own "Hotel" column (combined-file case) → the file-level property name (separate-file case).
function parseHotelSheetTagged(wb, fileProperty) {
  const rows = parseHotelSheet(wb);
  return rows.map(r => ({ ...r, hotel: (r.hotel && r.hotel.trim()) ? r.hotel.trim() : (fileProperty || "").trim() }));
}
function parseCarSheet(wb) {
  return parseSheet(wb, { name:["name","attendee","passenger","guest"], email:["email","e-mail","email address"], pickupDate:["pickup date","pickup","pick up","transfer in","arrival transfer","car arrival"], dropoffDate:["dropoff date","dropoff","drop off","transfer out","departure transfer"], pickupTime:["pickup time","pick up time","transfer in time","time in"], dropoffTime:["dropoff time","drop off time","transfer out time","time out"], pickupLoc:["pickup location","pick up location","from","origin"], dropoffLoc:["dropoff location","drop off location","to","destination"], confirmation:["confirmation","conf","booking","transfer #","vendor"] }, { pickupTime:"pickupDate", dropoffTime:"dropoffDate" });
}
function parseDietarySheet(wb) {
  return parseSheet(wb, { name:["name","attendee","guest","passenger"], email:["email","e-mail","email address"], dietary:["dietary","diet","food","restriction","allergy","allergies"], accessibility:["accessibility","access","mobility","accommodation","disability","special need"], specialNotes:["notes","special","request","other","additional"] });
}
function parseAbstractSheet(wb) {
  return parseSheet(wb, { name:["name","author","presenter","speaker","submitter","attendee"], email:["email","e-mail","email address"], title:["abstract title","title","abstract","paper","session","topic","presentation"], status:["status","decision","accepted","review status","outcome"] });
}
function parseRegistrationSheet(wb) {
  return parseSheet(wb, {
    name:["name","attendee","registrant","guest","participant"],
    email:["email","e-mail","email address"],
    company:["company","organization","org","employer","account"],
    jobTitle:["job title","title","position","role"],
    regCheckIn:["hotel check in","hotel check-in","check in","check-in","requested check in","hotel in","arrival"],
    regCheckOut:["hotel check out","hotel check-out","check out","check-out","requested check out","hotel out","departure"],
    flightRequest:["flight request","flight needed","flight required","needs flight","travel request","air travel"],
    hotelRequest:["hotel request","hotel needed","hotel required","needs hotel","room request","accommodation"],
    dietaryRequest:["dietary request","dietary","diet","food restriction","allergy","allergies"],
    departCity:["departing city","departure city","origin city","home city","city"],
    departState:["departing state","state","province","region"],
    departCountry:["departing country","country","nation"],
    regNotes:["notes","note","registration notes","reg notes","comments","comment","special requests","remark","remarks","exception","exceptions","approval","approvals","approved"],
    reason:["reason","justification","exception reason","no travel reason","opt out reason","explanation"],
    assignedHotel:["assigned hotel","hotel assignment","assigned property","designated hotel","hotel block","room block","expected hotel"],
    attendeeType:["attendee type","attendeetype","registrant type","segment","category","audience","type"],
  });
}

function crossMatch(flights, hotels, cars, dietary, aw, existingMeta, registration, abstracts) {
  registration = registration || [];
  abstracts = abstracts || [];
  const hasReg = registration.length > 0;
  const hasAbstracts = abstracts.length > 0;
  const hasFlights = flights.length > 0;
  const hasHotels = hotels.length > 0;
  const { arrivalStart, arrivalEnd, departureStart, departureEnd, preferredAirports, departureAirports, arrivalCutoff, departureCutoff, lateArrivalCutoff, typeRules } = aw || {};
  const mkMaps = (arr) => { const byE = new Map(), byN = new Map(); arr.forEach(x => { if (x.email) byE.set(x.email, x); const k = normName(x.name); if (k) byN.set(k, x); }); return [byE, byN]; };
  const [fByE, fByN] = mkMaps(flights), [hByE, hByN] = mkMaps(hotels), [cByE, cByN] = mkMaps(cars), [dByE, dByN] = mkMaps(dietary), [rByE, rByN] = mkMaps(registration), [abByE, abByN] = mkMaps(abstracts);
  const allLists = [...flights,...hotels,...cars,...dietary,...registration,...abstracts];
  const emailKeys = new Set(allLists.map(x => x.email).filter(Boolean));
  const nameKeys = new Set(allLists.map(x => normName(x.name)).filter(Boolean));
  const emailMatchedNames = new Set();
  emailKeys.forEach(ek => [fByE.get(ek),hByE.get(ek),cByE.get(ek),dByE.get(ek),rByE.get(ek),abByE.get(ek)].forEach(r => { if (r) emailMatchedNames.add(normName(r.name)); }));
  const dupSources = new Map();
  [flights,hotels,cars,dietary,registration,abstracts].forEach(list => {
    const seen = new Map();
    list.forEach(x => { const k = normName(x.name); if (!k) return; if (!seen.has(k)) seen.set(k, []); seen.get(k).push(x.source || ""); });
    seen.forEach((srcs, k) => { if (srcs.length > 1) { if (!dupSources.has(k)) dupSources.set(k, new Set()); srcs.forEach(sc => { if (sc) dupSources.get(k).add(sc); }); } });
  });
  const dupNames = new Set([...dupSources.keys()]);

  // Helper: does this registration row have a noted reason (in notes OR a dedicated reason column)?
  const hasReason = (reg) => {
    if (!reg) return false;
    const note = (reg.regNotes || "").trim();
    const reason = (reg.reason || "").trim();
    return note.length > 0 || reason.length > 0;
  };
  // Does a row request a flight/hotel? Blank → expected (flag if missing). Explicit "No" → only
  // suppress the missing flag if a reason is noted; "No" with no reason is an incomplete record → still flag.
  const NEGATIVE = ["no","n","none","not needed","not required","false","0"];
  const wantsFlight = (reg) => {
    if (!reg) return false;
    const v = (reg.flightRequest || "").toLowerCase().trim();
    if (v === "") return true;
    if (NEGATIVE.includes(v)) return !hasReason(reg); // No + reason → don't expect; No + no reason → still flag
    return true;
  };
  const wantsHotel = (reg) => {
    if (!reg) return false;
    const v = (reg.hotelRequest || "").toLowerCase().trim();
    if (v === "") return true;
    if (NEGATIVE.includes(v)) return !hasReason(reg);
    return true;
  };

  function build(flight, hotel, car, diet, key, matchedBy, reg, abstract) {
    const displayName = reg?.name || flight?.name || hotel?.name || car?.name || diet?.name || abstract?.name || key;
    const email = reg?.email || flight?.email || hotel?.email || car?.email || diet?.email || abstract?.email || "";
    const metaKey = email || key;
    const existing = existingMeta?.[metaKey] || {};
    const issues = [];

    // ── Registration-anchored checks (only when a registration list is uploaded) ──
    if (hasReg) {
      if (!reg) {
        // Travel record exists but person is NOT in registration → booked but not registered
        issues.push({ type:"unregistered", text:"Booked travel but not on registration list" });
      } else {
        // Person IS registered — check what they requested vs. what got booked
        if (wantsFlight(reg) && !flight) {
          const saidNo = NEGATIVE.includes((reg.flightRequest || "").toLowerCase().trim());
          issues.push({ type:"missing", text: saidNo ? "Marked 'no flight' but no reason given" : "Registered but no flight booked" });
        }
        if (wantsHotel(reg) && !hotel) {
          const saidNo = NEGATIVE.includes((reg.hotelRequest || "").toLowerCase().trim());
          issues.push({ type:"missing", text: saidNo ? "Marked 'no hotel' but no reason given" : "Registered but no hotel booked" });
        }
        // Registration's requested hotel dates vs. actual hotel roster dates
        if (hotel && reg.regCheckIn && hotel.checkIn) {
          const ci = diffDays(reg.regCheckIn, hotel.checkIn);
          if (ci !== null && ci !== 0) issues.push({ type:"mismatch", text:`Hotel check-in differs from registration by ${Math.abs(ci)} ${Math.abs(ci)===1?"day":"days"}` });
        }
        if (hotel && reg.regCheckOut && hotel.checkOut) {
          const co = diffDays(reg.regCheckOut, hotel.checkOut);
          if (co !== null && co !== 0) issues.push({ type:"mismatch", text:`Hotel check-out differs from registration by ${Math.abs(co)} ${Math.abs(co)===1?"day":"days"}` });
        }
        // Right-hotel check (only when registration provides an assigned hotel AND the booked record names a property)
        if (hotel && reg.assignedHotel && reg.assignedHotel.trim() && hotel.hotel && hotel.hotel.trim()) {
          const assigned = reg.assignedHotel.trim().toLowerCase();
          const booked = hotel.hotel.trim().toLowerCase();
          if (assigned !== booked) issues.push({ type:"mismatch", text:`Booked at ${hotel.hotel.trim()} but assigned to ${reg.assignedHotel.trim()}` });
        }
      }
    }

    // ── Existing travel-vs-travel checks (only flag files that were actually uploaded) ──
    if (!hasReg) {
      // Original behavior when no registration list: flag missing across travel files,
      // but only for file types the planner actually provided.
      if (hasFlights && !flight) issues.push({ type:"missing", text:"Missing from flight manifest" });
      if (hasHotels && !hotel)  issues.push({ type:"missing", text:"Missing from hotel roster" });
    }
    if (cars.length > 0 && !car && (reg || flight || hotel)) issues.push({ type:"missing", text:"Missing from car transfers" });

    const details = {};
    if (flight && hotel) {
      // An early arrival (before the cutoff) is expected to have the night prior booked,
      // so a check-in exactly one day before arrival is correct here, not a mismatch.
      const earlyArr = !!(arrivalCutoff && flight.arrivalTime && flight.flightArrival && flight.arrivalTime < arrivalCutoff);
      const ad = diffDays(flight.flightArrival, hotel.checkIn), dd = diffDays(flight.flightDeparture, hotel.checkOut);
      details.arrDiff = ad; details.depDiff = dd;
      if (ad !== null && ad !== 0 && !(earlyArr && ad === 1)) issues.push({ type:"mismatch", text: ad<0?`Arrives ${Math.abs(ad)} ${Math.abs(ad)===1?"day":"days"} before check-in`:`Arrives ${ad} ${ad===1?"day":"days"} after check-in` });
      if (dd !== null && dd !== 0) issues.push({ type:"mismatch", text: dd<0?`Departs ${Math.abs(dd)} ${Math.abs(dd)===1?"day":"days"} before check-out`:`Departs ${dd} ${dd===1?"day":"days"} after check-out` });
    }
    if (flight && car) {
      if (car.pickupDate && flight.flightArrival) { const pd = diffDays(car.pickupDate, flight.flightArrival); details.pickupDiff = pd; if (pd!==0) issues.push({ type:"mismatch", text:`Car pickup ${Math.abs(pd)} ${Math.abs(pd)===1?"day":"days"} ${pd<0?"before":"after"} flight arrival` }); }
      if (car.dropoffDate && flight.flightDeparture) { const dd2 = diffDays(car.dropoffDate, flight.flightDeparture); if (dd2!==0) issues.push({ type:"mismatch", text:`Car dropoff ${Math.abs(dd2)} ${Math.abs(dd2)===1?"day":"days"} ${dd2<0?"before":"after"} flight departure` }); }
    }
    // ── Early-arrival / night-prior hotel rule ──
    // If a flight lands before the planner's cutoff time, the traveler should already
    // have a room from the night before. Flag when no night-prior hotel night is on file.
    if (arrivalCutoff && flight && flight.arrivalTime && flight.flightArrival && flight.arrivalTime < arrivalCutoff && hotel && hotel.checkIn) {
      const gap = diffDays(flight.flightArrival, hotel.checkIn); // >= 1 means check-in is the night before (or earlier)
      if (gap === 0) {
        const prior = new Date(flight.flightArrival); prior.setDate(prior.getDate() - 1);
        issues.push({ type:"earlyarrival", text:`Arrives ${fmtTime(flight.arrivalTime,"ampm")} (before ${fmtTime(arrivalCutoff,"ampm")} cutoff) \u2014 book hotel for the night prior (${fmt(prior)})` });
      }
    }
    // ── Earliest-departure-time rule ──
    // If a flight leaves before the planner's earliest allowed departure time, flag it.
    if (departureCutoff && flight && flight.departureTime && flight.flightDeparture && flight.departureTime < departureCutoff) {
      issues.push({ type:"earlydeparture", text:`Departs ${fmtTime(flight.departureTime,"ampm")} (before ${fmtTime(departureCutoff,"ampm")} earliest departure)` });
    }
    // ── Late-arrival rule (after-cutoff hotel risk) ──
    // If a guest's flight lands (or their inbound car transfer picks up) after the late-arrival
    // cutoff AND they have a hotel room booked, flag it so the planner can warn the hotel to hold
    // the room. Many hotels release a room if the guest has not checked in by ~11 PM local time.
    if (lateArrivalCutoff && hotel && hotel.checkIn) {
      const flightLate = flight && flight.arrivalTime && flight.flightArrival && flight.arrivalTime > lateArrivalCutoff;
      const carLate = car && car.pickupTime && car.pickupDate && car.pickupTime > lateArrivalCutoff;
      const hotelName = hotel.hotel ? hotel.hotel.trim() : "the hotel";
      if (flightLate) {
        issues.push({ type:"latearrival", text:`Arrives ${fmtTime(flight.arrivalTime,"ampm")} (after ${fmtTime(lateArrivalCutoff,"ampm")} cutoff). Possible late arrival, notify ${hotelName} to hold the room` });
      } else if (carLate) {
        issues.push({ type:"latearrival", text:`Car pickup ${fmtTime(car.pickupTime,"ampm")} (after ${fmtTime(lateArrivalCutoff,"ampm")} cutoff). Possible late arrival, notify ${hotelName} to hold the room` });
      }
    }
    const arrDate = flight?.flightArrival || hotel?.checkIn || reg?.regCheckIn, depDate = flight?.flightDeparture || hotel?.checkOut || reg?.regCheckOut;
    if (arrDate && isOutside(arrDate, arrivalStart, arrivalEnd)) issues.push({ type:"window", text:`Arrival ${fmt(arrDate)} outside approved window` });
    if (depDate && isOutside(depDate, departureStart, departureEnd)) issues.push({ type:"window", text:`Departure ${fmt(depDate)} outside approved window` });
    const arrApt = flight?.arrivalAirport || flight?.airport, depApt = flight?.departureAirport || flight?.airport;
    const depAptList = (departureAirports && departureAirports.length) ? departureAirports : preferredAirports;
    if (arrApt && isWrongAirport(arrApt, preferredAirports)) issues.push({ type:"airport", text:`Arrives at ${arrApt.toUpperCase()} (not a preferred airport)` });
    if (depApt && depApt !== arrApt && isWrongAirport(depApt, depAptList)) issues.push({ type:"airport", text:`Departs from ${depApt.toUpperCase()} (not a preferred airport)` });
    // Attendee-type arrival-day rules (e.g., International arrives Sunday, Domestic Monday). VIP = no rule.
    if (typeRules && typeRules.length && reg && reg.attendeeType) {
      const gt = String(reg.attendeeType).trim().toLowerCase();
      const rule = typeRules.find(r => r.type && String(r.type).trim().toLowerCase() === gt && ((r.day !== "" && r.day !== "date" && r.day != null) || (r.day === "date" && r.date)));
      const arrD = flight?.flightArrival || hotel?.checkIn || reg?.regCheckIn;
      if (rule && arrD) {
        if (rule.day === "date") {
          const want = parseDate(rule.date);
          if (want && diffDays(arrD, want) !== 0) issues.push({ type:"typerule", text:`${reg.attendeeType} should arrive ${fmt(want)}, arrives ${fmt(arrD)}` });
        } else {
          const DN = ["Sunday","Monday","Tuesday","Wednesday","Thursday","Friday","Saturday"];
          const actual = arrD.getDay();
          if (actual !== +rule.day) issues.push({ type:"typerule", text:`${reg.attendeeType} should arrive ${DN[+rule.day]}, arrives ${DN[actual]} (${fmt(arrD)})` });
        }
      }
    }
    // Abstract submitters who never registered (association speaker/presenter follow-up).
    if (hasReg && hasAbstracts && abstract && !reg) {
      const accepted = /accept/i.test(abstract.status || "");
      issues.push({ type:"abstract_unreg", text: accepted ? "Accepted abstract but not registered" : "Submitted an abstract but not registered" });
    }
    if (dupNames.has(normName(displayName))) { const _srcs = [...(dupSources.get(normName(displayName)) || [])]; issues.push({ type:"duplicate", text: _srcs.length ? `Appears in multiple files (${_srcs.join(", ")})` : "Appears in more than one file" }); }
    const seen = new Set(); const uniqueIssues = issues.filter(x => { if (seen.has(x.text)) return false; seen.add(x.text); return true; });
    // Notes from the registration file are informational only. Flags are cleared in-app with Resolve.
    const fileNote = (reg?.regNotes && String(reg.regNotes).trim()) ? String(reg.regNotes).trim() : "";
    const resolved = existing.resolved || [];
    const active = uniqueIssues.filter(x => !resolved.includes(x.text));
    const status = active.length === 0 ? "ok" : active.length === 1 ? "warn" : "error";
    const { firstName, lastName } = splitName(displayName);
    const resolvedFirstName = reg?.firstName || flight?.firstName || hotel?.firstName || car?.firstName || diet?.firstName || abstract?.firstName || firstName;
    const resolvedLastName  = reg?.lastName  || flight?.lastName  || hotel?.lastName  || car?.lastName  || diet?.lastName  || abstract?.lastName  || lastName;
    return { key, displayName, firstName:resolvedFirstName, lastName:resolvedLastName, email, matchedBy, flight, hotel, car, diet, reg, abstract, registered: !!reg, issues:uniqueIssues, status, details, note: fileNote || existing.note || "", noteBy: existing.noteBy || "", noteAt: existing.noteAt || "", resolved };
  }

  const results = [];
  emailKeys.forEach(ek => results.push(build(fByE.get(ek)||null, hByE.get(ek)||null, cByE.get(ek)||null, dByE.get(ek)||null, ek, "email", rByE.get(ek)||null, abByE.get(ek)||null)));
  nameKeys.forEach(nk => { if (emailMatchedNames.has(nk)) return; results.push(build(fByN.get(nk)||null, hByN.get(nk)||null, cByN.get(nk)||null, dByN.get(nk)||null, nk, "name", rByN.get(nk)||null, abByN.get(nk)||null)); });
  return results;
}

// ── Change tracking diff ──────────────────────────────────────────────────────
function diffResults(prev, curr) {
  if (!prev || !curr) return { added:[], removed:[], changed:[], unchanged:[] };
  const prevMap = new Map((prev||[]).map(r => [r.email || r.key, r]));
  const currMap = new Map((curr||[]).map(r => [r.email || r.key, r]));
  const added = [], removed = [], changed = [], unchanged = [];
  currMap.forEach((r, k) => {
    if (!prevMap.has(k)) { added.push(r); return; }
    const p = prevMap.get(k);
    const prevIssues = (p.issues||[]).map(x=>x.text).sort().join("|");
    const currIssues = (r.issues||[]).map(x=>x.text).sort().join("|");
    if (prevIssues !== currIssues || p.status !== r.status) changed.push({ prev:p, curr:r });
    else unchanged.push(r);
  });
  prevMap.forEach((r, k) => { if (!currMap.has(k)) removed.push(r); });
  return { added, removed, changed, unchanged };
}


// ── UI ────────────────────────────────────────────────────────────────────────
function StatusChip({ status }) {
  const cfg = { ok:{label:"Aligned",bg:P.greenLight,color:P.green}, warn:{label:"1 Issue",bg:P.amberLight,color:P.amber}, error:{label:"Action Needed",bg:P.redLight,color:P.red} };
  const s = cfg[status] || cfg.ok;
  return <span style={{ display:"inline-flex", alignItems:"center", gap:"5px", background:s.bg, color:s.color, borderRadius:"20px", padding:"2px 9px 2px 7px", fontSize:"15px", fontWeight:600, fontFamily:font, whiteSpace:"nowrap" }}>{status==="ok" ? <ClearedIcon size={14} line={s.color} accent={s.color} /> : <span style={{ width:5, height:5, borderRadius:"50%", background:s.color, display:"inline-block" }} />}{s.label}</span>;
}

function Delta({ val }) {
  if (val === null || val === undefined) return <span style={{ color:P.grey600 }}>—</span>;
  if (val === 0) return <span style={{ color:P.green, fontWeight:700, fontFamily:font, fontSize:"15px" }}>On time</span>;
  const days = Math.abs(val);
  const word = days === 1 ? "day" : "days";
  const dir  = val > 0 ? "late" : "early";
  return <span style={{ color:days<=1?P.amber:P.red, fontWeight:700, fontFamily:font, fontSize:"15px", whiteSpace:"nowrap" }}>{days} {word} {dir}</span>;
}

function IssueTag({ issue, resolved, onResolve }) {
  const cfg = { missing:{bg:P.amberLight,color:P.amber,border:`1px solid ${P.amber}44`,icon:<Circle size={11} strokeWidth={1.8}/>}, mismatch:{bg:P.redLight,color:P.red,border:`1px solid ${P.red}44`,icon:<AlertTriangle size={11} strokeWidth={1.8}/>}, window:{bg:P.purpleLight,color:P.purple,border:`1px solid ${P.purple}44`,icon:<Calendar size={11} strokeWidth={1.8}/>}, duplicate:{bg:"#FEF2DC",color:"#C97A0A",border:"1px solid #C97A0A44",icon:<AlertCircle size={11} strokeWidth={1.8}/>}, unregistered:{bg:P.purpleLight,color:P.purple,border:`1px solid ${P.purple}44`,icon:<Ban size={11} strokeWidth={1.8}/>}, airport:{bg:"#EAF2FE",color:"#4F8EF7",border:"1px solid #4F8EF744",icon:<Plane size={11} strokeWidth={1.8}/>}, earlyarrival:{bg:"#EAF2FE",color:P.periwinkleD,border:`1px solid ${P.periwinkleD}44`,icon:<Calendar size={11} strokeWidth={1.8}/>}, earlydeparture:{bg:"#EAF2FE",color:P.periwinkleD,border:`1px solid ${P.periwinkleD}44`,icon:<Calendar size={11} strokeWidth={1.8}/>} };
  const s = cfg[issue.type] || cfg.mismatch;
  const isRes = (resolved || []).includes(issue.text);
  return (
    <div style={{ background:isRes?"#EEF1F8":s.bg, border:isRes?`1px solid ${P.grey100}`:s.border, borderRadius:"8px", padding:"7px 11px", fontSize:"15px", color:isRes?P.grey600:s.color, fontWeight:700, fontFamily:font, marginBottom:"6px", display:"flex", alignItems:"flex-start", gap:"6px", opacity:isRes?0.6:1 }}>
      <span style={{ flexShrink:0, display:"flex", alignItems:"center" }}>{isRes?<Check size={11} strokeWidth={2.5}/>:s.icon}</span>
      <span style={{ flex:1, textDecoration:isRes?"line-through":"none" }}>{issue.text}</span>
      <button onClick={e => { e.stopPropagation(); onResolve(issue.text); }} style={{ background:"transparent", border:`1px solid ${isRes?P.grey200:s.color}`, borderRadius:"6px", padding:"2px 8px", fontSize:"15px", color:isRes?P.grey600:s.color, fontWeight:700, fontFamily:font, cursor:"pointer", flexShrink:0 }}>{isRes?"Unresolve":"Resolve"}</button>
    </div>
  );
}

function Card({ title, color, children }) {
  return (
    <div style={{ background:P.white, borderRadius:"10px", padding:"14px 16px", border:`1px solid ${P.grey100}` }}>
      <div style={{ fontSize:"17px", color, fontWeight:800, letterSpacing:"0.1em", textTransform:"uppercase", fontFamily:font, marginBottom:"10px" }}>{title}</div>
      {children}
    </div>
  );
}

function DR({ label, val, accent, warn }) {
  return (
    <div style={{ display:"flex", justifyContent:"space-between", gap:"8px", fontSize:"15px", fontFamily:font, marginBottom:"4px" }}>
      <span style={{ color:P.navy, fontWeight:600, flexShrink:0 }}>{label}</span>
      <span style={{ color:warn?P.red:accent?P.periwinkleD:P.navy, fontWeight:accent||warn?700:500, textAlign:"right", wordBreak:"break-all" }}>{val||"—"}</span>
    </div>
  );
}

function Btn({ onClick, children, color, outline, small, disabled }) {
  return (
    <button onClick={onClick} disabled={disabled} style={{ background:disabled?P.grey100:outline?"transparent":(color||P.navy), color:disabled?P.grey600:outline?(color||P.navy):P.white, border:`1.5px solid ${disabled?P.grey200:(color||P.navy)}`, borderRadius:"7px", padding:small?"4px 11px":"8px 18px", fontSize:small?"11px":"12px", fontWeight:500, fontFamily:font, cursor:disabled?"not-allowed":"pointer", whiteSpace:"nowrap" }}>{children}</button>
  );
}

// ── Contacts Manager Modal ────────────────────────────────────────────────────
function SupportModal({ user, onClose }) {
  const [stEmail, setStEmail] = useState(user?.email || "");
  const [stCategory, setStCategory] = useState("Question");
  const [stSubject, setStSubject] = useState("");
  const [stBody, setStBody] = useState("");
  const ready = !!(stSubject.trim() && stBody.trim());
  const send = () => {
    if (!ready) return;
    const subjectLine = `SUPPORT TICKET: ${stSubject.trim()}`;
    const lines = [
      stBody.trim(),
      "",
      "----",
      `Category: ${stCategory}`,
      stEmail.trim() ? `Reply to: ${stEmail.trim()}` : "",
      "Sent from the GroupGrid in-app support form",
    ].filter(Boolean);
    const routeAddr = stCategory === "Account / billing" ? "billing@groupgrid.io" : "support@groupgrid.io";
    window.location.href = `mailto:${routeAddr}?subject=${encodeURIComponent(subjectLine)}&body=${encodeURIComponent(lines.join("\n"))}`;
  };
  const inputStyle = (filled) => ({ width:"100%", background:P.grey50, border:`1.5px solid ${filled?P.accent+"66":P.grey100}`, borderRadius:"10px", padding:"11px 13px", fontSize:"15px", color:P.navy, fontFamily:font, outline:"none", boxSizing:"border-box" });
  const labelStyle = { display:"block", fontSize:"16px", fontWeight:600, color:P.grey600, fontFamily:font, marginBottom:"6px" };
  return (
    <div style={{ position:"fixed", inset:0, background:"rgba(27,42,74,0.55)", zIndex:1000, display:"flex", alignItems:"center", justifyContent:"center", padding:"20px" }}>
      <div className="gg-modal" style={{ background:P.white, borderRadius:"22px", width:"100%", maxWidth:"560px", maxHeight:"90vh", overflow:"auto", boxShadow:"0 20px 60px rgba(27,42,74,0.3)" }}>
        <div style={{ padding:"20px 24px", borderBottom:`1px solid ${P.grey100}`, display:"flex", alignItems:"center", justifyContent:"space-between", gap:"14px" }}>
          <div>
            <div style={{ fontWeight:700, fontSize:"16px", color:P.navy, fontFamily:font }}>Contact support</div>
            <div style={{ fontSize:"16px", color:P.grey600, fontFamily:font, marginTop:"2px", lineHeight:1.5 }}>We reply within one business day. This opens a pre-filled email to {stCategory === "Account / billing" ? "billing@groupgrid.io" : "support@groupgrid.io"} in your mail app.</div>
          </div>
          <button onClick={onClose} style={{ background:P.grey100, border:"none", borderRadius:"10px", width:30, height:30, cursor:"pointer", color:P.navy, display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}><X size={15} strokeWidth={1.8}/></button>
        </div>
        <div style={{ padding:"20px 24px" }}>
          <div className="gg-contacts-grid" style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:"12px", marginBottom:"14px" }}>
            <div>
              <label style={labelStyle}>Your email <span style={{ color:P.grey600, fontWeight:400 }}>· so we can reply</span></label>
              <input type="email" value={stEmail} onChange={e=>setStEmail(e.target.value)} placeholder="you@company.com" style={inputStyle(stEmail.trim())} />
            </div>
            <div>
              <label style={labelStyle}>Category</label>
              <select value={stCategory} onChange={e=>setStCategory(e.target.value)} style={{ ...inputStyle(true), appearance:"none", cursor:"pointer", fontWeight:600 }}>
                {["Question","Bug report","Feature request","Account / billing","Urgent event-day issue","Other"].map(o => <option key={o} value={o}>{o}</option>)}
              </select>
            </div>
          </div>
          <div style={{ marginBottom:"14px" }}>
            <label style={labelStyle}>Subject <span style={{ color:P.red }}>required</span></label>
            <input type="text" value={stSubject} onChange={e=>setStSubject(e.target.value)} placeholder="Short summary of the issue" style={inputStyle(stSubject.trim())} />
          </div>
          <div style={{ marginBottom:"18px" }}>
            <label style={labelStyle}>Description <span style={{ color:P.red }}>required</span></label>
            <textarea value={stBody} onChange={e=>setStBody(e.target.value)} rows={5} placeholder="What happened, what you expected, and any steps to reproduce it. Include your event name if it helps." style={{ ...inputStyle(stBody.trim()), resize:"vertical", lineHeight:1.6 }} />
          </div>
          <div style={{ display:"flex", alignItems:"center", justifyContent:"flex-end", gap:"12px", flexWrap:"wrap" }}>
            <button onClick={onClose} style={{ background:"transparent", border:`1.5px solid ${P.grey200}`, borderRadius:"10px", padding:"10px 18px", fontSize:"17px", fontWeight:600, color:P.grey600, fontFamily:font, cursor:"pointer" }}>Cancel</button>
            <button onClick={send} disabled={!ready} style={{ background:ready?P.accent:P.grey100, color:ready?P.white:P.grey600, border:"none", borderRadius:"10px", padding:"11px 22px", fontSize:"15px", fontWeight:800, fontFamily:font, cursor:ready?"pointer":"not-allowed", boxShadow:ready?"0 2px 12px rgba(0,201,177,0.35)":"none", transition:"all 0.18s", whiteSpace:"nowrap" }}>Send support ticket →</button>
          </div>
        </div>
      </div>
    </div>
  );
}

function ContactsModal({ contacts, onSave, onClose }) {
  const [local, setLocal] = useState(JSON.parse(JSON.stringify(contacts)));
  function update(type, field, val) {
    setLocal(prev => ({ ...prev, [type]: { ...prev[type], [field]: val } }));
  }
  const fields = [
    { key:"hotel", label:"Hotel Contact", color:P.navy, fields:[{f:"name",ph:"Contact name"},{f:"email",ph:"hotel@property.com"},{f:"phone",ph:"+1 (212) 555-0100"},{f:"property",ph:"Property / hotel name"}] },
    { key:"travel", label:"Travel Agency Contact", color:P.periwinkleD, fields:[{f:"name",ph:"Contact name"},{f:"email",ph:"agent@travelco.com"},{f:"phone",ph:"+1 (212) 555-0200"},{f:"agency",ph:"Agency name"}] },
    { key:"car", label:"Car / Transfer Contact", color:P.accentD, fields:[{f:"name",ph:"Contact name"},{f:"email",ph:"transfers@vendor.com"},{f:"phone",ph:"+1 (212) 555-0300"},{f:"vendor",ph:"Transfer vendor name"}] },
  ];  return (
    <div style={{ position:"fixed", inset:0, background:"rgba(27,42,74,0.55)", zIndex:1000, display:"flex", alignItems:"center", justifyContent:"center", padding:"20px" }}>
      <div className="gg-modal" style={{ background:P.white, borderRadius:"22px", width:"100%", maxWidth:"620px", maxHeight:"90vh", overflow:"auto", boxShadow:"0 20px 60px rgba(27,42,74,0.3)" }}>
        <div style={{ padding:"20px 24px", borderBottom:`1px solid ${P.grey100}`, display:"flex", alignItems:"center", justifyContent:"space-between" }}>
          <div>
            <div style={{ fontWeight:600, fontSize:"15px", color:P.navy, fontFamily:font }}>Event Contacts</div>
            <div style={{ fontSize:"15px", color:P.navyLight, fontFamily:font, marginTop:"2px" }}>Pre-load contacts so emails auto-populate and reports can be shared directly</div>
          </div>
          <button onClick={onClose} style={{ background:P.grey100, border:"none", borderRadius:"10px", width:30, height:30, cursor:"pointer", fontSize:"15px", color:P.navy, display:"flex", alignItems:"center", justifyContent:"center" }}><X size={15} strokeWidth={1.8}/></button>
        </div>
        <div style={{ padding:"20px 24px" }}>
          {fields.map(({ key, label, color, fields: flds }) => (
            <div key={key} style={{ marginBottom:"24px" }}>
              <div style={{ fontSize:"15px", fontWeight:600, color, marginBottom:"12px", fontFamily:font, display:"flex", alignItems:"center", gap:"8px" }}>
                <div style={{ width:3, height:16, background:color, borderRadius:"2px" }} />{label}
              </div>
              <div className="gg-contacts-grid" style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:"10px" }}>
                {flds.map(({ f, ph }) => (
                  <div key={f}>
                    <div style={{ fontSize:"16px", fontWeight:700, color:P.navyLight, fontFamily:font, textTransform:"uppercase", letterSpacing:"0.06em", marginBottom:"4px" }}>{f}</div>
                    <input value={local[key]?.[f]||""} onChange={e => update(key, f, e.target.value)} placeholder={ph}
                      style={{ width:"100%", background:P.offWhite, border:`1.5px solid ${local[key]?.[f]?color+"44":P.grey100}`, borderRadius:"10px", padding:"9px 12px", fontSize:"15px", fontFamily:font, fontWeight:600, color:P.navy, outline:"none", boxSizing:"border-box" }} />
                  </div>
                ))}
              </div>
            </div>
          ))}
          {/* Per-property hotel contacts (multi-hotel) */}
          <div style={{ marginBottom:"24px" }}>
            <div style={{ fontSize:"15px", fontWeight:600, color:P.navy, marginBottom:"4px", fontFamily:font, display:"flex", alignItems:"center", gap:"8px" }}>
              <div style={{ width:3, height:16, background:"#C97A0A", borderRadius:"2px" }} />Additional hotel properties
            </div>
            <div style={{ fontSize:"15px", color:P.navyLight, fontFamily:font, marginBottom:"12px" }}>Running multiple hotels? Add a contact per property. Emails about each guest's room route to the matching property automatically.</div>
            {(local.hotels||[]).map((h, idx) => (
              <div key={idx} style={{ display:"flex", gap:"8px", marginBottom:"8px", alignItems:"center", flexWrap:"wrap" }}>
                <input value={h.property||""} onChange={e => setLocal(prev => ({ ...prev, hotels: prev.hotels.map((x,i)=>i===idx?{...x,property:e.target.value}:x) }))} placeholder="Property name"
                  style={{ flex:"1 1 140px", background:P.offWhite, border:`1.5px solid ${h.property?"#C97A0A44":P.grey100}`, borderRadius:"9px", padding:"9px 11px", fontSize:"15px", fontFamily:font, fontWeight:500, color:P.navy, outline:"none", minWidth:0 }} />
                <input value={h.name||""} onChange={e => setLocal(prev => ({ ...prev, hotels: prev.hotels.map((x,i)=>i===idx?{...x,name:e.target.value}:x) }))} placeholder="Contact name"
                  style={{ flex:"1 1 120px", background:P.offWhite, border:`1.5px solid ${P.grey100}`, borderRadius:"9px", padding:"9px 11px", fontSize:"15px", fontFamily:font, fontWeight:500, color:P.navy, outline:"none", minWidth:0 }} />
                <input value={h.email||""} onChange={e => setLocal(prev => ({ ...prev, hotels: prev.hotels.map((x,i)=>i===idx?{...x,email:e.target.value}:x) }))} placeholder="email@hotel.com"
                  style={{ flex:"2 1 160px", background:P.offWhite, border:`1.5px solid ${h.email?"#C97A0A44":P.grey100}`, borderRadius:"9px", padding:"9px 11px", fontSize:"15px", fontFamily:font, fontWeight:500, color:P.navy, outline:"none", minWidth:0 }} />
                <button onClick={() => setLocal(prev => ({ ...prev, hotels: prev.hotels.filter((_,i)=>i!==idx) }))} style={{ background:"transparent", border:"none", color:P.grey600, cursor:"pointer", flexShrink:0, padding:"4px" }} title="Remove"><X size={15} strokeWidth={1.8}/></button>
              </div>
            ))}
            <button onClick={() => setLocal(prev => ({ ...prev, hotels:[...(prev.hotels||[]), {property:"",name:"",email:""}] }))}
              style={{ background:"transparent", border:"none", color:P.accentD, fontSize:"15px", fontWeight:500, fontFamily:font, cursor:"pointer", marginTop:"4px", padding:"4px 0" }}>+ Add hotel property contact</button>
          </div>
          <div style={{ marginBottom:"24px" }}>
            <div style={{ fontSize:"15px", fontWeight:800, color:P.navy, marginBottom:"12px", fontFamily:font, display:"flex", alignItems:"center", gap:"8px" }}>
              <div style={{ width:3, height:16, background:P.grey600, borderRadius:"2px" }} />✍ Your Name (used in email signatures)
            </div>
            <input value={local.plannerName||""} onChange={e => setLocal(prev => ({...prev, plannerName:e.target.value}))} placeholder="e.g. Your name, Events Team"
              style={{ width:"100%", background:P.offWhite, border:`1.5px solid ${local.plannerName?P.grey600+"44":P.grey100}`, borderRadius:"10px", padding:"9px 12px", fontSize:"15px", fontFamily:font, fontWeight:600, color:P.navy, outline:"none", boxSizing:"border-box" }} />
          </div>
          <div style={{ display:"flex", gap:"10px", paddingTop:"8px", borderTop:`1px solid ${P.grey100}` }}>
            <Btn onClick={() => { onSave(local); onClose(); }} color={P.accent}>Save Contacts <Save size={13} strokeWidth={1.8} style={{verticalAlign:"-2px"}}/></Btn>
            <Btn onClick={onClose} outline>Cancel</Btn>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Email Modal ───────────────────────────────────────────────────────────────

function ShareModal({ html, filename, onClose }) {
  const [copied, setCopied] = useState(false);
  const [downloaded, setDownloaded] = useState(false);
  const [tab, setTab] = useState("options"); // "options" | "preview"

  function download() {
    const blob = new Blob([html], { type:"text/html;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = filename; a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    setDownloaded(true);
    setTimeout(() => setDownloaded(false), 2500);
  }

  function copyHtml() {
    navigator.clipboard?.writeText(html).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    }).catch(() => download());
  }

  // Build a safe srcdoc preview (no blob URLs, no window.open)
  const iframeSrc = html;

  return (
    <div style={{ position:"fixed", inset:0, background:"rgba(27,42,74,0.65)", zIndex:2000, display:"flex", alignItems:"center", justifyContent:"center", padding:"20px" }}>
      <div style={{ background:P.white, borderRadius:"20px", width:"100%", maxWidth: tab==="preview" ? "900px" : "480px", maxHeight:"90vh", display:"flex", flexDirection:"column", boxShadow:"0 24px 64px rgba(27,42,74,0.3)", overflow:"hidden", transition:"max-width 0.2s" }}>

        {/* Header */}
        <div style={{ background:P.navy, padding:"16px 20px", display:"flex", alignItems:"center", justifyContent:"space-between", flexShrink:0 }}>
          <div style={{ display:"flex", alignItems:"center", gap:"12px" }}>
            <div>
              <div style={{ fontWeight:800, fontSize:"15px", color:P.white, fontFamily:font }}>Share Report</div>
              <div style={{ fontSize:"15px", color:"rgba(255,255,255,0.45)", fontFamily:font, marginTop:"1px" }}>{filename}</div>
            </div>
          </div>
          <div style={{ display:"flex", alignItems:"center", gap:"8px" }}>
            {/* Tab toggle */}
            <div style={{ display:"flex", background:"rgba(255,255,255,0.08)", borderRadius:"8px", padding:"3px", gap:"3px" }}>
              {[["options","Options"],["preview","Preview"]].map(([t,label]) => (
                <button key={t} onClick={() => setTab(t)} style={{ padding:"4px 12px", borderRadius:"6px", border:"none", cursor:"pointer", fontFamily:font, fontSize:"15px", fontWeight:700, background:tab===t?"rgba(255,255,255,0.15)":"transparent", color:tab===t?P.white:"rgba(255,255,255,0.45)", transition:"all 0.15s" }}>{label}</button>
              ))}
            </div>
            <button onClick={onClose} style={{ background:"rgba(255,255,255,0.1)", border:"none", borderRadius:"8px", width:28, height:28, cursor:"pointer", color:"rgba(255,255,255,0.6)", display:"flex", alignItems:"center", justifyContent:"center" }}><X size={14} strokeWidth={1.8}/></button>
          </div>
        </div>

        {tab === "options" && (
          <div style={{ padding:"20px", display:"flex", flexDirection:"column", gap:"10px" }}>

            {/* Download */}
            <button onClick={download} style={{ display:"flex", alignItems:"center", gap:"14px", background:downloaded?P.greenLight:P.offWhite, border:`2px solid ${downloaded?P.green:P.grey200}`, borderRadius:"12px", padding:"14px 18px", cursor:"pointer", textAlign:"left", transition:"all 0.15s" }}>
              <div style={{ width:38, height:38, borderRadius:"10px", background:downloaded?P.green:P.navy, display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0, transition:"background 0.15s" }}>
                <Download size={17} strokeWidth={1.8} color="white"/>
              </div>
              <div>
                <div style={{ fontSize:"15px", fontWeight:700, color:downloaded?P.green:P.navy, fontFamily:font }}>{downloaded ? "✓ Downloaded!" : "Download HTML File"}</div>
                <div style={{ fontSize:"15px", color:P.grey600, fontFamily:font, marginTop:"2px" }}>Save to your device. Email it, or upload to Google Drive to share with your team.</div>
              </div>
            </button>

            {/* Copy HTML */}
            <button onClick={copyHtml} style={{ display:"flex", alignItems:"center", gap:"14px", background:copied?"#EAF2FE":P.offWhite, border:`2px solid ${copied?P.periwinkleD:P.grey200}`, borderRadius:"12px", padding:"14px 18px", cursor:"pointer", textAlign:"left", transition:"all 0.15s" }}>
              <div style={{ width:38, height:38, borderRadius:"10px", background:copied?P.periwinkleD:P.periwinkle, display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0, transition:"background 0.15s" }}>
                <Copy size={17} strokeWidth={1.8} color="white"/>
              </div>
              <div>
                <div style={{ fontSize:"15px", fontWeight:700, color:copied?P.periwinkleD:P.navy, fontFamily:font }}>{copied ? "✓ HTML copied!" : "Copy HTML Source"}</div>
                <div style={{ fontSize:"15px", color:P.grey600, fontFamily:font, marginTop:"2px" }}>Copy the full HTML to paste into an email, CMS, or any editor that accepts HTML.</div>
              </div>
            </button>

            <div style={{ background:P.offWhite, borderRadius:"8px", padding:"10px 14px", fontSize:"15px", color:P.grey600, fontFamily:font, lineHeight:1.6 }}>
              🔒 All guest data is embedded in the file only — nothing is uploaded anywhere.
            </div>
          </div>
        )}

        {tab === "preview" && (
          <div style={{ flex:1, display:"flex", flexDirection:"column", minHeight:0 }}>
            <div style={{ padding:"8px 16px", background:P.offWhite, borderBottom:`1px solid ${P.grey100}`, display:"flex", alignItems:"center", justifyContent:"space-between" }}>
              <span style={{ fontSize:"15px", color:P.grey600, fontFamily:font }}>Report preview</span>
              <button onClick={download} style={{ display:"flex", alignItems:"center", gap:"6px", background:P.navy, border:"none", borderRadius:"8px", padding:"6px 14px", cursor:"pointer", fontFamily:font, fontSize:"15px", fontWeight:700, color:P.white }}>
                <Download size={13} strokeWidth={1.8} color="white"/> Download
              </button>
            </div>
            <iframe
              srcDoc={iframeSrc}
              style={{ flex:1, border:"none", width:"100%", minHeight:"520px" }}
              sandbox="allow-same-origin"
              title="Report Preview"
            />
          </div>
        )}

      </div>
    </div>
  );
}

function EmailModal({ record, eventName, contacts, onClose }) {
  const [type, setType] = useState("hotel");
  const [copied, setCopied] = useState(false);
  const [toEmail, setToEmail] = useState("");
  const [editedSubject, setEditedSubject] = useState(null); // null = use draft default
  const [editedBody, setEditedBody] = useState(null);       // null = use draft default
  const [saved, setSaved] = useState(false);

  const issues = record.issues.filter(x => x.type !== "duplicate");

  const hotelName = contacts?.hotel?.property || record.hotel?.hotel || "the hotel";
  const hotelContact = contacts?.hotel?.name || "Hotel Team";
  const hotelEmail = contacts?.hotel?.email || "";
  const travelContact = contacts?.travel?.name || "Travel Team";
  const travelAgency = contacts?.travel?.agency || "Travel Agency";
  const travelEmail = contacts?.travel?.email || "";

  const evName = eventName && eventName.trim() ? eventName.trim() : null;
  const guestName = record.firstName && record.lastName ? `${record.firstName} ${record.lastName}` : record.displayName;
  const flightArrival = record.flight?.flightArrival ? record.flight.flightArrival.toLocaleDateString("en-US", { month:"long", day:"numeric", year:"numeric" }) : null;
  const flightDeparture = record.flight?.flightDeparture ? record.flight.flightDeparture.toLocaleDateString("en-US", { month:"long", day:"numeric", year:"numeric" }) : null;
  const flightIn = record.flight?.flightIn || null;
  const flightOut = record.flight?.flightOut || null;
  const arrivalTimeT = record.flight?.arrivalTime ? " at " + fmtTime(record.flight.arrivalTime, "ampm") : "";
  const departureTimeT = record.flight?.departureTime ? " at " + fmtTime(record.flight.departureTime, "ampm") : "";
  const arrAirport = record.flight?.arrivalAirport || record.flight?.airport || null;
  const depAirport = record.flight?.departureAirport || record.flight?.airport || null;
  const airport = arrAirport || depAirport || null;
  const checkIn = record.hotel?.checkIn ? record.hotel.checkIn.toLocaleDateString("en-US", { month:"long", day:"numeric", year:"numeric" }) : null;
  const checkOut = record.hotel?.checkOut ? record.hotel.checkOut.toLocaleDateString("en-US", { month:"long", day:"numeric", year:"numeric" }) : null;
  const hotel = record.hotel?.hotel || hotelName;

  // Build specific discrepancy lines for each issue — no emojis, clean plain text
  function buildGuestIssueLines() {
    return issues.map(issue => {
      // Flight arrives BEFORE hotel check-in (early arrival)
      if (issue.text?.includes("before check-in") && flightArrival && checkIn)
        return `  Your flight arrives:   ${flightArrival}${arrAirport ? " (" + arrAirport + ")" : ""}${flightIn ? " — Flight " + flightIn : ""}\n  Your hotel check-in:   ${checkIn}${hotel && hotel !== "the hotel" ? " at " + hotel : ""}\n\n  Your flight lands before your hotel check-in date. We want to make sure you have somewhere to stay that first night.\n  Do you need an extra night${hotel && hotel !== "the hotel" ? " at " + hotel : ""}, or do you have accommodations arranged?`;
      // Flight arrives AFTER hotel check-in (late arrival)
      if (issue.text?.includes("after check-in") && flightArrival && checkIn)
        return `  Your flight arrives:   ${flightArrival}${arrAirport ? " (" + arrAirport + ")" : ""}${flightIn ? " — Flight " + flightIn : ""}\n  Your hotel check-in:   ${checkIn}${hotel && hotel !== "the hotel" ? " at " + hotel : ""}\n\n  Your flight arrives after your hotel check-in date. Your room will be held, but we wanted to flag this in case the dates need updating.\n  Could you confirm these details are correct?`;
      // Flight departs BEFORE hotel check-out (early departure)
      if (issue.text?.includes("before check-out") && checkOut && flightDeparture)
        return `  Your hotel check-out:  ${checkOut}${hotel && hotel !== "the hotel" ? " at " + hotel : ""}\n  Your flight departs:   ${flightDeparture}${depAirport ? " (" + depAirport + ")" : ""}${flightOut ? " — Flight " + flightOut : ""}\n\n  Your flight departs before your hotel check-out date. You may be paying for a night you won't use.\n  Would you like us to adjust your check-out, or is this intentional?`;
      // Flight departs AFTER hotel check-out (late departure — the common case)
      if (issue.text?.includes("after check-out") && checkOut && flightDeparture)
        return `  Your hotel check-out:  ${checkOut}${hotel && hotel !== "the hotel" ? " at " + hotel : ""}\n  Your flight departs:   ${flightDeparture}${depAirport ? " (" + depAirport + ")" : ""}${flightOut ? " — Flight " + flightOut : ""}\n\n  Your hotel checks out on ${checkOut}, but your flight does not depart until ${flightDeparture}. You may not have somewhere to stay on your last night.\n  Would you like to extend your stay${hotel && hotel !== "the hotel" ? " at " + hotel : ""} by one night, or do you have other arrangements?`;
      if (issue.text === "Missing from hotel roster")
        return `  Your flight arrives:   ${flightArrival || "—"}${arrAirport ? " (" + arrAirport + ")" : ""}\n  Hotel booking:         Not currently on file\n\n  We do not have a hotel booking on file for you. We want to make sure you have somewhere to stay.\n  Have you arranged your own accommodations, or would you like us to help?`;
      if (issue.text === "Missing from flight manifest")
        return `  Flight details:        Not currently on file\n  Your hotel check-in:   ${checkIn || "—"}${hotel && hotel !== "the hotel" ? " at " + hotel : ""}\n\n  We do not have your flight details on file. Could you share your inbound and outbound flight numbers and dates?`;
      if (issue.text === "Missing from car transfers")
        return `  Your flight arrives:   ${flightArrival || "—"}${arrAirport ? " (" + arrAirport + ")" : ""}${flightIn ? " — Flight " + flightIn : ""}\n  Ground transfer:       Not currently on file${hotel && hotel !== "the hotel" ? "\n  Hotel:                 " + hotel : ""}\n\n  We do not have a ground transfer arranged for you. Would you like us to arrange transportation from ${arrAirport || "the airport"} to ${hotel && hotel !== "the hotel" ? hotel : "your hotel"}?`;
      if (issue.type === "window")
        return `  Your arrival:          ${flightArrival || "—"}\n  Your departure:        ${flightDeparture || "—"}\n\n  Your travel dates appear to fall outside the approved event travel window. Could you confirm these dates are correct, or let us know if any changes are needed?`;
      return `  ${issue.text}`;
    }).join("\n\n");
  }

  function buildHotelIssueLines() {
    return issues.map(issue => {
      if (issue.text?.includes("before check-in") && flightArrival && checkIn)
        return `  • Guest flight arrives ${flightArrival}${flightIn ? " (Flight " + flightIn + ")" : ""} — hotel check-in is ${checkIn}\n    The guest arrives before check-in. Could you accommodate an early check-in or add a night?`;
      if (issue.text?.includes("after check-in") && flightArrival && checkIn)
        return `  • Guest flight arrives ${flightArrival}${flightIn ? " (Flight " + flightIn + ")" : ""} — hotel check-in is ${checkIn}\n    The guest arrives after the check-in date. Please confirm the reservation is held correctly.`;
      if (issue.text?.includes("before check-out") && checkOut && flightDeparture)
        return `  • Hotel check-out is ${checkOut} — guest flight departs ${flightDeparture}${flightOut ? " (Flight " + flightOut + ")" : ""}\n    The guest departs before check-out. You may want to adjust the checkout date.`;
      if (issue.text?.includes("after check-out") && checkOut && flightDeparture)
        return `  • Hotel check-out is ${checkOut}${hotel && hotel !== "the hotel" ? " at " + hotel : ""} — guest flight departs ${flightDeparture}${flightOut ? " (Flight " + flightOut + ")" : ""}\n    The guest's flight departs the day after check-out. Could you extend the stay by one night or arrange a late check-out?`;
      if (issue.text === "Missing from hotel roster")
        return `  • No hotel booking found on file for this guest\n    Could you confirm whether a reservation exists, or assist with creating one?`;
      return `  • ${issue.text}`;
    }).join("\n");
  }

  function buildTravelIssueLines() {
    return issues.map(issue => {
      if (issue.text?.includes("before check-in") && flightArrival && checkIn)
        return `  • Inbound flight ${flightIn || ""} arrives ${flightArrival}${arrAirport ? " into " + arrAirport : ""} — hotel check-in is ${checkIn}\n    The guest arrives before check-in. Please confirm whether this itinerary is correct.`;
      if (issue.text?.includes("after check-in") && flightArrival && checkIn)
        return `  • Inbound flight ${flightIn || ""} arrives ${flightArrival}${arrAirport ? " into " + arrAirport : ""} — hotel check-in is ${checkIn}\n    The guest arrives after the hotel check-in date. Please confirm the booking is correctly held.`;
      if (issue.text?.includes("before check-out") && checkOut && flightDeparture)
        return `  • Hotel check-out is ${checkOut} — outbound flight ${flightOut || ""} departs ${flightDeparture}${depAirport ? " from " + depAirport : ""}\n    The guest departs before hotel check-out. Please confirm if the itinerary needs adjusting.`;
      if (issue.text?.includes("after check-out") && checkOut && flightDeparture)
        return `  • Hotel check-out is ${checkOut}${hotel && hotel !== "the hotel" ? " at " + hotel : ""} — outbound flight ${flightOut || ""} departs ${flightDeparture}${depAirport ? " from " + depAirport : ""}\n    The guest's flight departs after hotel check-out. Please confirm whether the stay should be extended or a late check-out arranged.`;
      if (issue.text === "Missing from flight manifest")
        return `  • No flight record found on file for this guest\n    Hotel check-in${hotel && hotel !== "the hotel" ? " at " + hotel : ""} is confirmed for ${checkIn || "—"}. Could you provide the inbound and outbound itinerary?`;
      return `  • ${issue.text}`;
    }).join("\n");
  }

  const drafts = {
    hotel: {
      contactName: hotelContact,
      toDisplay: hotelEmail ? `${hotelContact} <${hotelEmail}>` : hotelContact,
      toEmail: hotelEmail,
      subject: `${evName ? evName + " " : ""}[Hotel] — Guest Review: ${guestName}`,
      body: `Dear ${hotelContact},

I hope this message finds you well! I am reaching out regarding the reservation for ${guestName}${record.email ? " (" + record.email + ")" : ""} ${hotel && hotel !== "the hotel" ? "at " + hotel : ""}${evName ? " for " + evName : ""}.

While reviewing our guest travel records, we noticed the following that we would love your help to resolve:

${buildHotelIssueLines()}

Here is the full travel summary we have on file for this guest:

    Flight arrival:    ${flightArrival || "—"}${arrivalTimeT}${flightIn ? " — Flight " + flightIn : ""}
    Hotel check-in:   ${checkIn || "—"}${hotel && hotel !== "the hotel" ? " at " + hotel : ""}
    Hotel check-out:  ${checkOut || "—"}
    Flight departure:  ${flightDeparture || "—"}${departureTimeT}${flightOut ? " — Flight " + flightOut : ""}

Could you please review and confirm the correct booking details at your earliest convenience? We truly appreciate your help in making sure ${guestName}'s stay is perfectly arranged!

Thank you so much,
[Your Name]
${evName ? evName + " Planning Team" : "Planning Team"}`,
    },
    travel: {
      contactName: travelContact,
      toDisplay: travelEmail ? `${travelContact} <${travelEmail}>` : travelContact,
      toEmail: travelEmail,
      subject: `${evName ? evName + " " : ""}[Flight] — Guest Review: ${guestName}`,
      body: `Dear ${travelContact},

I hope you are doing well! I am reaching out regarding the travel itinerary for ${guestName}${record.email ? " (" + record.email + ")" : ""}${evName ? " for " + evName : ""}.

While reviewing our guest travel records, we noticed the following that we would love your help to confirm or correct:

${buildTravelIssueLines()}

Here is the full travel summary we have on file for this guest:

    Inbound:           ${flightArrival || "—"}${arrivalTimeT}${arrAirport ? " into " + arrAirport : ""}${flightIn ? " — Flight " + flightIn : ""}
    Hotel check-in:   ${checkIn || "—"}${hotel && hotel !== "the hotel" ? " at " + hotel : ""}
    Hotel check-out:  ${checkOut || "—"}
    Outbound:          ${flightDeparture || "—"}${departureTimeT}${depAirport ? " from " + depAirport : ""}${flightOut ? " — Flight " + flightOut : ""}

Kindly advise on the correct details and any changes needed. We really appreciate your support in making sure everything lines up perfectly for ${guestName}!

Thank you so much,
[Your Name]
${evName ? evName + " Planning Team" : "Planning Team"}`,
    },
    guest: {
      contactName: guestName,
      toDisplay: record.email || "Guest email",
      toEmail: record.email || "",
      subject: `${evName ? evName + " " : ""}[Travel]: Could you confirm your travel details?`,
      body: `Hi ${guestName},

We are so excited to have you joining us${evName ? " for " + evName : ""} and we truly cannot wait to see you there!

We are doing a careful review of all guest travel details to make sure everything is perfectly in place, and we wanted to flag the following for your attention:

ITEM REQUIRING YOUR REVIEW:

${buildGuestIssueLines()}

Could you take a quick look and let us know if anything needs to be updated? We are happy to help with any changes — please just reply to this email.

Your full travel summary on file:

  Arrival:          ${flightArrival || "—"}${arrAirport ? " (" + arrAirport + ")" : ""}${flightIn ? " — Flight " + flightIn : ""}
  Hotel check-in:   ${checkIn || "—"}${hotel && hotel !== "the hotel" ? " at " + hotel : ""}
  Hotel check-out:  ${checkOut || "—"}
  Departure:        ${flightDeparture || "—"}${depAirport ? " (" + depAirport + ")" : ""}${flightOut ? " — Flight " + flightOut : ""}

Thank you so much — we truly look forward to seeing you${evName ? " at " + evName : ""}!

Warmly,
[Your Name]
${evName ? evName + " Planning Team" : "Planning Team"}`,
    },
  };

  const draft = drafts[type];
  React.useEffect(() => { setToEmail(draft.toEmail); setEditedSubject(null); setEditedBody(null); setSaved(false); }, [type]);

  const currentSubject = editedSubject !== null ? editedSubject : draft.subject;
  const currentBody    = editedBody    !== null ? editedBody    : draft.body;
  const isDirtyEmail   = editedSubject !== null || editedBody !== null;

  function saveEdits() {
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  function resetEdits() {
    setEditedSubject(null);
    setEditedBody(null);
    setSaved(false);
  }

  function copy() {
    const text = `To: ${toEmail || draft.toDisplay}\nSubject: ${currentSubject}\n\n${currentBody}`;
    if (navigator.clipboard) {
      navigator.clipboard.writeText(text).then(() => { setCopied(true); setTimeout(() => setCopied(false), 2000); }).catch(() => { setCopied(true); setTimeout(() => setCopied(false), 1500); });
    } else { setCopied(true); setTimeout(() => setCopied(false), 1500); }
  }

  function openMailto() {
    const addr = toEmail || draft.toEmail;
    if (!addr) { copy(); return; }
    const subject = encodeURIComponent(currentSubject);
    const body = encodeURIComponent(currentBody);
    window.open(`mailto:${addr}?subject=${subject}&body=${body}`, "_blank");
  }

  const hasContact = type === "hotel" ? !!hotelEmail : type === "travel" ? !!travelEmail : !!record.email;
  const tabs = [
    { k:"hotel", l:"Hotel", hasContact: !!hotelEmail },
    { k:"travel", l:"✈ Travel Agency", hasContact: !!travelEmail },
    { k:"guest", l:"👤 Guest", hasContact: !!record.email },
  ];

  return (
    <div style={{ position:"fixed", inset:0, background:"rgba(27,42,74,0.55)", zIndex:1000, display:"flex", alignItems:"center", justifyContent:"center", padding:"20px" }}>
      <div style={{ background:P.white, borderRadius:"22px", width:"100%", maxWidth:"600px", maxHeight:"90vh", overflow:"auto", boxShadow:"0 20px 60px rgba(27,42,74,0.3)" }}>
        <div style={{ padding:"20px 24px", borderBottom:`1px solid ${P.grey100}`, display:"flex", alignItems:"center", justifyContent:"space-between" }}>
          <div>
            <div style={{ fontWeight:600, fontSize:"15px", color:P.navy, fontFamily:font }}>Draft Email</div>
            <div style={{ fontSize:"15px", color:P.navyLight, fontFamily:font, marginTop:"2px" }}>{record.displayName} · {issues.length} flag{issues.length !== 1 ? "s" : ""}</div>
          </div>
          <button onClick={onClose} style={{ background:P.grey100, border:"none", borderRadius:"10px", width:30, height:30, cursor:"pointer", fontSize:"15px", color:P.navy, display:"flex", alignItems:"center", justifyContent:"center" }}><X size={15} strokeWidth={1.8}/></button>
        </div>
        <div style={{ padding:"18px 24px" }}>
          {/* Tabs with contact indicator */}
          <div style={{ display:"flex", gap:"8px", marginBottom:"18px" }}>
            {tabs.map(({ k, l, hasContact: hc }) => (
              <button key={k} onClick={() => setType(k)} style={{ background:type===k?P.navy:P.offWhite, color:type===k?P.white:P.grey600, border:`1px solid ${type===k?P.navy:P.grey200}`, borderRadius:"7px", padding:"5px 12px", fontSize:"15px", fontWeight:500, fontFamily:font, cursor:"pointer", position:"relative", display:"flex", alignItems:"center", gap:"6px" }}>
                {l}
                {hc
                  ? <span style={{ width:7, height:7, borderRadius:"50%", background:type===k?"rgba(255,255,255,0.7)":P.green, display:"inline-block" }} title="Contact saved" />
                  : <span style={{ width:7, height:7, borderRadius:"50%", background:type===k?"rgba(255,255,255,0.3)":P.grey200, display:"inline-block" }} title="No contact saved" />}
              </button>
            ))}
          </div>

          {/* No contact warning */}
          {!hasContact && (
            <div style={{ background:P.amberLight, border:`1px solid ${P.amber}44`, borderRadius:"10px", padding:"10px 14px", marginBottom:"14px", fontSize:"15px", color:P.amber, fontWeight:700, fontFamily:font, display:"flex", alignItems:"center", gap:"8px" }}>
              <AlertTriangle size={13} strokeWidth={1.8}/>
              <span>No {type === "hotel" ? "hotel" : type === "travel" ? "travel agency" : "guest"} email on file.
                {type !== "guest" && <span style={{ fontWeight:400, color:P.amber }}> Close this and click <strong>📇 Contacts</strong> to add one.</span>}
              </span>
            </div>
          )}

          {/* To field — editable */}
          <div style={{ marginBottom:"10px" }}>
            <div style={{ fontSize:"16px", fontWeight:700, color:P.navyLight, fontFamily:font, marginBottom:"3px", textTransform:"uppercase", letterSpacing:"0.06em" }}>To</div>
            <input value={toEmail} onChange={e => setToEmail(e.target.value)} placeholder={draft.toDisplay || "Enter email address…"}
              style={{ width:"100%", background:toEmail?P.white:P.offWhite, border:`1.5px solid ${toEmail?P.periwinkle+"44":P.grey100}`, borderRadius:"9px", padding:"8px 12px", fontSize:"15px", fontFamily:font, fontWeight:600, color:P.navy, outline:"none", boxSizing:"border-box" }} />
          </div>

          {/* Subject — editable */}
          <div style={{ marginBottom:"10px" }}>
            <div style={{ fontSize:"16px", fontWeight:700, color:P.navyLight, fontFamily:font, marginBottom:"3px", textTransform:"uppercase", letterSpacing:"0.06em" }}>Subject</div>
            <input value={currentSubject} onChange={e => setEditedSubject(e.target.value)}
              style={{ width:"100%", background:editedSubject!==null?P.white:P.offWhite, border:`1.5px solid ${editedSubject!==null?P.periwinkle+"66":P.grey100}`, borderRadius:"9px", padding:"8px 12px", fontSize:"15px", fontFamily:font, fontWeight:600, color:P.navy, outline:"none", boxSizing:"border-box" }} />
          </div>

          {/* Body — editable */}
          <div style={{ marginBottom:"16px" }}>
            <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:"3px" }}>
              <div style={{ fontSize:"16px", fontWeight:700, color:P.navyLight, fontFamily:font, textTransform:"uppercase", letterSpacing:"0.06em" }}>Body</div>
              {isDirtyEmail && (
                <div style={{ display:"flex", gap:"6px" }}>
                  <button onClick={saveEdits} style={{ background:saved?P.greenLight:P.periwinkleD, color:saved?P.green:P.white, border:"none", borderRadius:"6px", padding:"3px 10px", fontSize:"15px", fontWeight:700, fontFamily:font, cursor:"pointer" }}>{saved ? <>Saved <Check size={12} strokeWidth={2.5} style={{verticalAlign:"-2px"}}/></> : <>Save <Save size={12} strokeWidth={1.8} style={{verticalAlign:"-2px"}}/></>}</button>
                  <button onClick={resetEdits} style={{ background:P.offWhite, color:P.grey600, border:`1px solid ${P.grey200}`, borderRadius:"6px", padding:"3px 10px", fontSize:"15px", fontWeight:700, fontFamily:font, cursor:"pointer" }}>Reset</button>
                </div>
              )}
            </div>
            <textarea value={currentBody} onChange={e => setEditedBody(e.target.value)}
              style={{ width:"100%", height:"220px", background:editedBody!==null?P.white:P.offWhite, border:`1.5px solid ${editedBody!==null?P.periwinkle+"66":P.grey100}`, borderRadius:"10px", padding:"12px", fontSize:"15px", fontFamily:font, color:P.navy, resize:"vertical", outline:"none", boxSizing:"border-box", lineHeight:1.6 }} />
          </div>

          {/* Actions */}
          <div style={{ display:"flex", gap:"8px", flexWrap:"wrap" }}>
            <Btn onClick={openMailto} color={hasContact || toEmail ? P.navy : P.grey600} disabled={!hasContact && !toEmail}>
              {hasContact || toEmail ? "Open in Mail App ↗" : "Open in Mail App ↗"}
            </Btn>
            <Btn onClick={copy} color={copied?P.green:P.periwinkleD} outline>{copied?"Copied!":"Copy to Clipboard"}</Btn>
            <Btn onClick={onClose} outline>Close</Btn>
          </div>
          {(!toEmail && !hasContact) && <div style={{ fontSize:"15px", color:P.navyLight, fontFamily:font, marginTop:"8px" }}>Enter an email address in the To field to open in your mail app.</div>}
        </div>
      </div>
    </div>
  );
}


// ── New Template Modal ────────────────────────────────────────────────────────
const ICON_OPTIONS = ["✉","📋","⭐","🔔","🎯","🚨","💬","📌","🏷","👋","🎉","⚡","📣","🤝","📝","🔁","❓","✅","🛎","💡"];
const TRIGGER_OPTIONS = [
  { value:"all_guests", label:"All guests with email" },
  { value:"missing_hotel", label:"Missing hotel booking" },
  { value:"missing_flight", label:"Missing flight record" },
  { value:"missing_transfer", label:"Missing transfer record" },
  { value:"car_mismatch", label:"Car transfer timing mismatch" },
  { value:"needs_registration", label:"Booked travel but not registered" },
  { value:"arrives_early", label:"Arrives before check-in" },
  { value:"arrives_late", label:"Possible late arrival" },
  { value:"departs_late", label:"Departs after check-out" },
  { value:"outside_window", label:"Outside travel window" },
  { value:"has_flags", label:"Any flag / issue" },
  { value:"manual_only", label:"Manual send only (no auto-match)" },
];

function NewTemplateModal({ onSave, onClose }) {
  const [label, setLabel] = useState("");
  const [icon, setIcon] = useState("✉");
  const [trigger, setTrigger] = useState("manual_only");
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [errors, setErrors] = useState({});

  function validate() {
    const e = {};
    if (!label.trim()) e.label = "Template name is required";
    if (!subject.trim()) e.subject = "Subject line is required";
    if (!body.trim()) e.body = "Email body is required";
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  function handleSave() {
    if (!validate()) return;
    const id = "custom_" + Date.now();
    onSave({
      id, label: label.trim(), icon, trigger, color: P.periwinkleD,
      description: TRIGGER_OPTIONS.find(t => t.value === trigger)?.label || "Custom template",
      subject: subject.trim(), body: body.trim(), isCustom: true,
    });
  }

  return (
    <div style={{ position:"fixed", inset:0, background:"rgba(27,42,74,0.55)", zIndex:1000, display:"flex", alignItems:"center", justifyContent:"center", padding:"20px" }}>
      <div style={{ background:P.white, borderRadius:"22px", width:"100%", maxWidth:"680px", maxHeight:"93vh", overflow:"auto", boxShadow:"0 20px 60px rgba(27,42,74,0.3)" }}>
        <div style={{ padding:"20px 26px", borderBottom:`1px solid ${P.grey100}`, display:"flex", alignItems:"center", justifyContent:"space-between" }}>
          <div>
            <div style={{ fontWeight:600, fontSize:"15px", color:P.navy, fontFamily:font }}>New Template</div>
            <div style={{ fontSize:"15px", color:P.navyLight, marginTop:"2px", fontFamily:font }}>Create a custom email template for your event</div>
          </div>
          <button onClick={onClose} style={{ background:P.grey100, border:"none", borderRadius:"10px", width:30, height:30, cursor:"pointer", fontSize:"15px", color:P.navy, display:"flex", alignItems:"center", justifyContent:"center" }}><X size={15} strokeWidth={1.8}/></button>
        </div>

        <div style={{ padding:"22px 26px", display:"flex", flexDirection:"column", gap:"18px" }}>

          {/* Name + Icon row */}
          <div style={{ display:"grid", gridTemplateColumns:"1fr auto", gap:"14px", alignItems:"start" }}>
            <div>
              <div style={{ fontSize:"16px", fontWeight:700, color:P.navyLight, textTransform:"uppercase", letterSpacing:"0.06em", marginBottom:"5px", fontFamily:font }}>Template Name *</div>
              <input value={label} onChange={e => setLabel(e.target.value)} placeholder="e.g. VIP Welcome Message"
                style={{ width:"100%", background:errors.label?P.redLight:P.offWhite, border:`1.5px solid ${errors.label?P.red:P.grey200}`, borderRadius:"10px", padding:"10px 14px", fontSize:"15px", fontFamily:font, fontWeight:600, color:P.navy, outline:"none", boxSizing:"border-box" }} />
              {errors.label && <div style={{ fontSize:"15px", color:P.red, fontFamily:font, marginTop:"4px" }}>{errors.label}</div>}
            </div>
            <div>
              <div style={{ fontSize:"16px", fontWeight:700, color:P.navyLight, textTransform:"uppercase", letterSpacing:"0.06em", marginBottom:"5px", fontFamily:font }}>Icon</div>
              <div style={{ display:"flex", flexWrap:"wrap", gap:"4px", maxWidth:"210px" }}>
                {ICON_OPTIONS.map(ic => (
                  <button key={ic} onClick={() => setIcon(ic)}
                    style={{ width:32, height:32, borderRadius:"8px", border:`1.5px solid ${icon===ic?P.periwinkleD:P.grey200}`, background:icon===ic?P.periwinkle+"22":P.offWhite, fontSize:"15px", cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center" }}>
                    {ic}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Trigger */}
          <div>
            <div style={{ fontSize:"16px", fontWeight:700, color:P.navyLight, textTransform:"uppercase", letterSpacing:"0.06em", marginBottom:"5px", fontFamily:font }}>Auto-Send Trigger</div>
            <div style={{ fontSize:"15px", color:P.navyLight, fontFamily:font, marginBottom:"8px" }}>When should this template be included in the send queue?</div>
            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:"6px" }}>
              {TRIGGER_OPTIONS.map(opt => (
                <button key={opt.value} onClick={() => setTrigger(opt.value)}
                  style={{ background:trigger===opt.value?P.navy:P.offWhite, color:trigger===opt.value?P.white:P.grey600, border:`1.5px solid ${trigger===opt.value?P.navy:P.grey100}`, borderRadius:"8px", padding:"7px 11px", fontSize:"15px", fontWeight:700, fontFamily:font, cursor:"pointer", textAlign:"left" }}>
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {/* Variables hint */}
          <div style={{ background:P.offWhite, borderRadius:"10px", padding:"10px 14px", fontSize:"15px", color:P.navy, fontFamily:font }}>
            <strong>Available variables:</strong>{" "}
            {["guestName","eventName","eventStart","eventEnd","flightArrival","flightDeparture","flightIn","flightOut","airport","checkIn","checkOut","hotel","plannerName"].map((v,i,arr) => (
              <span key={v}><span style={{ background:P.periwinkle+"22", color:P.periwinkleD, borderRadius:"4px", padding:"1px 5px", fontWeight:700 }}>{`{{${v}}}`}</span>{i < arr.length-1 ? " " : ""}</span>
            ))}
          </div>

          {/* Subject */}
          <div>
            <div style={{ fontSize:"16px", fontWeight:700, color:P.navyLight, textTransform:"uppercase", letterSpacing:"0.06em", marginBottom:"5px", fontFamily:font }}>Subject Line *</div>
            <input value={subject} onChange={e => setSubject(e.target.value)} placeholder="e.g. Welcome to {{eventName}}, {{guestName}}!"
              style={{ width:"100%", background:errors.subject?P.redLight:P.offWhite, border:`1.5px solid ${errors.subject?P.red:P.grey200}`, borderRadius:"10px", padding:"10px 14px", fontSize:"15px", fontFamily:font, fontWeight:600, color:P.navy, outline:"none", boxSizing:"border-box" }} />
            {errors.subject && <div style={{ fontSize:"15px", color:P.red, fontFamily:font, marginTop:"4px" }}>{errors.subject}</div>}
          </div>

          {/* Body */}
          <div>
            <div style={{ fontSize:"16px", fontWeight:700, color:P.navyLight, textTransform:"uppercase", letterSpacing:"0.06em", marginBottom:"5px", fontFamily:font }}>Email Body *</div>
            <textarea value={body} onChange={e => setBody(e.target.value)} placeholder={`Hi {{guestName}},\n\nWe're looking forward to seeing you at {{eventName}}!\n\n{{plannerName}}\n{{eventName}} Planning Team`}
              style={{ width:"100%", height:"240px", background:errors.body?P.redLight:P.offWhite, border:`1.5px solid ${errors.body?P.red:P.grey200}`, borderRadius:"10px", padding:"14px", fontSize:"15px", fontFamily:font, color:P.navy, resize:"vertical", outline:"none", boxSizing:"border-box", lineHeight:1.7 }} />
            {errors.body && <div style={{ fontSize:"15px", color:P.red, fontFamily:font, marginTop:"4px" }}>{errors.body}</div>}
          </div>

          {/* Actions */}
          <div style={{ display:"flex", gap:"10px", paddingTop:"4px" }}>
            <Btn onClick={handleSave} color={P.accent}>Save Template <Save size={13} strokeWidth={1.8} style={{verticalAlign:"-2px"}}/></Btn>
            <Btn onClick={onClose} outline>Cancel</Btn>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Communications Hub ────────────────────────────────────────────────────────
function CommHub({ results, eventName, contacts, arrivalStart, arrivalEnd, departureStart, departureEnd }) {
  const [templates, setTemplates] = useState(DEFAULT_TEMPLATES);
  const [editingTemplate, setEditingTemplate] = useState(null);
  const [editSubject, setEditSubject] = useState("");
  const [editBody, setEditBody] = useState("");
  const [sendMode, setSendMode] = useState("manual"); // manual | review | auto
  const [queue, setQueue] = useState(null); // null = not built yet
  const [reviewIdx, setReviewIdx] = useState(0);
  const [sentIds, setSentIds] = useState(new Set());
  const [sendMsg, setSendMsg] = useState("");
  const [activeView, setActiveView] = useState("templates"); // templates | queue
  const [newTemplateOpen, setNewTemplateOpen] = useState(false);
  const [checkedIds, setCheckedIds] = useState(new Set());
  const [bulkRecipient, setBulkRecipient] = useState("smart"); // smart | guest | hotel | travel | car | all
  const [editedIds, setEditedIds] = useState(new Set()); // tracks which queue items have been manually edited
  const [localEdits, setLocalEdits] = useState({}); // {id: {to, subject, body}} — staged edits before save
  const [showTemplateConfig, setShowTemplateConfig] = useState(false); // collapse template/config UI by default

  const plannerName = contacts?.plannerName || "The Planning Team";
  const extra = { eventName, plannerName, arrivalStart, arrivalEnd, departureStart, departureEnd, hotelName: contacts?.hotel?.name, travelName: contacts?.travel?.name, carName: contacts?.car?.name };

  function saveNewTemplate(tmpl) {
    setTemplates(prev => ({ ...prev, [tmpl.id]: tmpl }));
    setNewTemplateOpen(false);
  }

  function deleteTemplate(id) {
    setTemplates(prev => { const n = { ...prev }; delete n[id]; return n; });
    if (queue) setQueue(prev => prev ? prev.filter(item => item.templateId !== id) : prev);
  }

  function getCustomApplicable(record, tmpl) {
    if (!tmpl.isCustom) return false;
    const issues = record.issues || [];
    switch (tmpl.trigger) {
      case "all_guests": return !!record.email;
      case "has_flags": return issues.length > 0;
      case "missing_hotel": return issues.some(x => x.text === "Missing from hotel roster");
      case "missing_flight": return issues.some(x => x.text === "Missing from flight manifest");
      case "missing_transfer": return issues.some(x => x.text === "Missing from car transfers");
      case "arrives_early": return issues.some(x => x.text?.includes("before check-in"));
      case "arrives_late": return issues.some(x => x.type === "latearrival");
      case "departs_late": return issues.some(x => x.text?.includes("before check-out"));
      case "outside_window": return issues.some(x => x.type === "window");
      case "manual_only": return false;
      default: return false;
    }
  }

  // Resolve the default recipient + body for a built-in template, based on its audience.
  // Vendor-routed templates use the vendor-addressed body and the vendor's email.
  // If the matching vendor contact has no email on file, fall back to the guest so the
  // email is never silently dropped (and the planner can fix the address).
  function resolveRouting(templateId, tmpl, record) {
    const audience = TEMPLATE_AUDIENCE[templateId] || "guest";
    const vendorEmail = audience === "hotel" ? contacts?.hotel?.email
                      : audience === "travel" ? contacts?.travel?.email
                      : audience === "car" ? contacts?.car?.email
                      : "";
    const vendorBody = VENDOR_BODY_OVERRIDE[templateId] || VENDOR_BODY[audience];
    if (audience !== "guest" && vendorEmail && vendorBody) {
      const tag = audience === "hotel" ? "Hotel" : audience === "travel" ? "Flight" : "Transfer";
      const subject = templateId === "arrives_late"
        ? `${(extra.eventName && extra.eventName !== "our event") ? extra.eventName + " " : ""}[Late Arrival] Please hold the room for ${record.displayName || record.firstName || ""}`
        : `${(extra.eventName && extra.eventName !== "our event") ? extra.eventName + " " : ""}[${tag}] — Guest Review: ${record.displayName || record.firstName || ""}`;
      return {
        to: vendorEmail,
        audience,
        subject,
        body: fillTemplate(vendorBody, record, extra),
      };
    }
    // guest audience, or vendor contact missing → guest-addressed body to the guest
    return {
      to: record.email,
      audience: "guest",
      subject: fillTemplate(tmpl.subject, record, extra),
      body: fillTemplate(tmpl.body, record, extra),
    };
  }

  // Build the send queue from all flagged guests who have emails
  function buildQueue() {
    const q = [];
    (results || []).forEach(record => {
      const unresolved = (record.issues || []).filter(x => !(record.resolved || []).includes(x.text));
      if (unresolved.length === 0) return; // only message guests who actually have an open issue
      let matched = false;
      // Default templates: use first applicable match, routed to the right recipient
      const applicable = getApplicableTemplates(record);
      if (applicable.length > 0) {
        const templateId = applicable[0];
        const tmpl = templates[templateId];
        if (tmpl) {
          const r = resolveRouting(templateId, tmpl, record);
          // Skip only if there's no recipient at all (no vendor email AND no guest email)
          if (r.to) { q.push({ id: `${record.key}-${templateId}`, record, templateId, audience: r.audience, subject: r.subject, body: r.body, to: r.to, status: "pending" }); matched = true; }
        }
      }
      // Custom templates: add a separate queue item for each that matches (still to guest)
      Object.values(templates).filter(t => t.isCustom).forEach(tmpl => {
        if (getCustomApplicable(record, tmpl) && record.email) {
          q.push({ id: `${record.key}-${tmpl.id}`, record, templateId: tmpl.id, audience: "guest", subject: fillTemplate(tmpl.subject, record, extra), body: fillTemplate(tmpl.body, record, extra), to: record.email, status: "pending" });
          matched = true;
        }
      });
      // Fallback: flagged guest with no matching template — generic note to the guest
      if (!matched && record.email) {
        const issueList = unresolved.map(x => "• " + x.text).join("\n");
        const subject = `${eventName || "Event"} [Travel]: Could you confirm your travel details?`;
        const body = `Hi ${record.firstName || record.displayName || "there"},\n\nWhile reviewing arrangements for ${eventName || "our event"}, we found something on your record that needs attention:\n\n${issueList}\n\nCould you take a look and let us know? Thank you.\n\n${contacts?.plannerName || "[Your Name]"}`;
        q.push({ id: `${record.key}-generic`, record, templateId: null, audience: "guest", subject, body, to: record.email, status: "pending" });
      }
    });
    setQueue(q);
    setReviewIdx(0);
    setActiveView("queue");
  }

  function updateQueueItem(id, patch) {
    setQueue(prev => prev.map(item => item.id === id ? { ...item, ...patch } : item));
  }

  function markSent(id) {
    setSentIds(prev => new Set([...prev, id]));
    updateQueueItem(id, { status: "sent" });
  }

  function markSkipped(id) {
    updateQueueItem(id, { status: "skipped" });
  }

  function openMailto(item) {
    const subject = encodeURIComponent(item.subject);
    const body = encodeURIComponent(item.body);
    window.open(`mailto:${item.to}?subject=${subject}&body=${body}`, "_blank");
    markSent(item.id);
  }

  function getRecipientAddresses(item) {
    // Returns array of {to, toLabel} based on bulkRecipient setting.
    // "smart" (default) uses each email's own auto-routed recipient (vendor or guest).
    const addrs = [];
    if (bulkRecipient === "smart") {
      if (item.to) {
        const label = item.audience === "hotel" ? (contacts?.hotel?.name || "Hotel Contact")
                    : item.audience === "travel" ? (contacts?.travel?.name || "Travel Contact")
                    : item.audience === "car" ? (contacts?.car?.name || "Transfer Contact")
                    : item.record.displayName;
        addrs.push({ to: item.to, label });
      }
      return addrs;
    }
    if (bulkRecipient === "guest" || bulkRecipient === "all") {
      if (item.record?.email) addrs.push({ to: item.record.email, label: item.record.displayName });
    }
    if (bulkRecipient === "hotel" || bulkRecipient === "all") {
      const email = contacts?.hotel?.email;
      if (email) addrs.push({ to: email, label: contacts?.hotel?.name || "Hotel Contact" });
    }
    if (bulkRecipient === "travel" || bulkRecipient === "all") {
      const email = contacts?.travel?.email;
      if (email) addrs.push({ to: email, label: contacts?.travel?.name || "Travel Contact" });
    }
    if (bulkRecipient === "car" || bulkRecipient === "all") {
      const email = contacts?.car?.email;
      if (email) addrs.push({ to: email, label: contacts?.car?.name || "Transfer Contact" });
    }
    return addrs;
  }

  function bulkSendChecked() {
    // Auto-save any staged edits before sending
    const items = (queue || []).filter(x => checkedIds.has(x.id) && x.status === "pending");
    items.forEach(item => { if (hasUnsavedEdits(item.id)) saveEdits(item.id); });

    // Re-read queue after saves
    const latestQueue = queue.map(item => {
      if (!checkedIds.has(item.id) || item.status !== "pending") return item;
      const edits = localEdits[item.id];
      return edits ? { ...item, ...edits } : item;
    });

    let delay = 0;
    items.forEach(item => {
      // Use the latest version (with staged edits applied)
      const latest = latestQueue.find(q => q.id === item.id) || item;
      const sendTo = getStagedField(latest, "to") || latest.to;
      const sendSubject = getStagedField(latest, "subject") || latest.subject;
      const sendBody = getStagedField(latest, "body") || latest.body;
      const addrs = getRecipientAddresses({ ...latest, to: sendTo });
      addrs.forEach(({ to }) => {
        setTimeout(() => {
          window.open(`mailto:${to}?subject=${encodeURIComponent(sendSubject)}&body=${encodeURIComponent(sendBody)}`, "_blank");
        }, delay);
        delay += 350;
      });
      markSent(item.id);
    });
    setCheckedIds(new Set());
    setSendMsg(`Opening ${items.length} email${items.length !== 1 ? "s" : ""}…`);
    setTimeout(() => setSendMsg(""), 3000);
  }

  function saveAllEdits() {
    // Save all staged edits at once
    Object.keys(localEdits).forEach(id => saveEdits(id));
  }

  const unsavedCount = Object.keys(localEdits).length;

  function toggleCheck(id) {
    setCheckedIds(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });
  }

  function toggleCheckAll() {
    const pending = (queue || []).filter(x => x.status === "pending").map(x => x.id);
    const allChecked = pending.every(id => checkedIds.has(id));
    setCheckedIds(allChecked ? new Set() : new Set(pending));
  }

  function stageEdit(id, field, value) {
    setLocalEdits(prev => ({ ...prev, [id]: { ...(prev[id] || {}), [field]: value } }));
  }

  function getStagedField(item, field) {
    return localEdits[item.id]?.[field] ?? item[field];
  }

  function saveEdits(id) {
    const edits = localEdits[id];
    if (!edits) return;
    updateQueueItem(id, edits);
    setEditedIds(prev => new Set([...prev, id]));
    setLocalEdits(prev => { const n = { ...prev }; delete n[id]; return n; });
  }

  function hasUnsavedEdits(id) {
    return !!localEdits[id] && Object.keys(localEdits[id]).length > 0;
  }

  function resetToOriginal(item) {
    const tmpl = templates[item.templateId];
    if (!tmpl) return;
    const orig = { to: item.record.email || "", subject: fillTemplate(tmpl.subject, item.record, extra), body: fillTemplate(tmpl.body, item.record, extra) };
    updateQueueItem(item.id, orig);
    setEditedIds(prev => { const n = new Set(prev); n.delete(item.id); return n; });
    setLocalEdits(prev => { const n = { ...prev }; delete n[item.id]; return n; });
  }

  function sendAll() {
    const pending = (queue || []).filter(x => x.status === "pending");
    pending.forEach((item, i) => {
      setTimeout(() => {
        const subject = encodeURIComponent(item.subject);
        const body = encodeURIComponent(item.body);
        window.open(`mailto:${item.to}?subject=${subject}&body=${body}`, "_blank");
        markSent(item.id);
      }, i * 400);
    });
    setSendMsg(`Opening ${pending.length} email${pending.length !== 1 ? "s" : ""}…`);
    setTimeout(() => setSendMsg(""), 3000);
  }

  function startEdit(templateId) {
    const t = templates[templateId];
    setEditingTemplate(templateId);
    setEditSubject(t.subject);
    setEditBody(t.body);
  }

  function saveEdit() {
    setTemplates(prev => ({ ...prev, [editingTemplate]: { ...prev[editingTemplate], subject: editSubject, body: editBody } }));
    setEditingTemplate(null);
    // Rebuild queue if active so edits reflect
    if (queue) {
      setQueue(prev => prev ? prev.map(item => {
        if (item.templateId !== editingTemplate || item.status !== "pending") return item;
        const tmpl = { ...templates[editingTemplate], subject: editSubject, body: editBody };
        return { ...item, subject: fillTemplate(tmpl.subject, item.record, extra), body: fillTemplate(tmpl.body, item.record, extra) };
      }) : prev);
    }
  }

  const guestsWithEmail = (results || []).filter(r => r.email);
  const customTemplates = Object.values(templates).filter(t => t.isCustom);
  // A guest "needs a message" if they have an email AND any unresolved issue —
  // whether or not a prebuilt template matches (date mismatches, wrong-hotel, etc. still count).
  const flaggedWithEmail = guestsWithEmail.filter(r =>
    (r.issues || []).filter(x => !(r.resolved || []).includes(x.text)).length > 0
  );
  const pendingCount = (queue || []).filter(x => x.status === "pending").length;
  const sentCount = (queue || []).filter(x => x.status === "sent").length;
  const skippedCount = (queue || []).filter(x => x.status === "skipped").length;

  return (
    <div style={{ fontFamily: font }}>

      {/* New template modal */}
      {newTemplateOpen && <NewTemplateModal onSave={saveNewTemplate} onClose={() => setNewTemplateOpen(false)} />}

      {/* Template editor modal */}
      {editingTemplate && (
        <div style={{ position:"fixed", inset:0, background:"rgba(27,42,74,0.55)", zIndex:1000, display:"flex", alignItems:"center", justifyContent:"center", padding:"20px" }}>
          <div style={{ background:P.white, borderRadius:"22px", width:"100%", maxWidth:"660px", maxHeight:"92vh", overflow:"auto", boxShadow:"0 20px 60px rgba(27,42,74,0.3)" }}>
            <div style={{ padding:"20px 26px", borderBottom:`1px solid ${P.grey100}`, display:"flex", alignItems:"center", justifyContent:"space-between" }}>
              <div>
                <div style={{ fontWeight:600, fontSize:"15px", color:P.navy }}>Edit Template</div>
                <div style={{ fontSize:"15px", color:P.navyLight, marginTop:"2px" }}>{templates[editingTemplate]?.label}</div>
              </div>
              <button onClick={() => setEditingTemplate(null)} style={{ background:P.grey100, border:"none", borderRadius:"10px", width:30, height:30, cursor:"pointer", fontSize:"15px", color:P.navy, display:"flex", alignItems:"center", justifyContent:"center" }}><X size={15} strokeWidth={1.8}/></button>
            </div>
            <div style={{ padding:"20px 26px" }}>
              <div style={{ background:P.offWhite, borderRadius:"10px", padding:"10px 14px", marginBottom:"16px", fontSize:"15px", color:P.navy }}>
                <strong>Available variables:</strong> {"{{"}<span>guestName</span>{"}}"}, {"{{"}<span>eventName</span>{"}}"}, {"{{"}<span>eventStart</span>{"}}"}, {"{{"}<span>eventEnd</span>{"}}"}, {"{{"}<span>flightArrival</span>{"}}"}, {"{{"}<span>flightDeparture</span>{"}}"}, {"{{"}<span>flightIn</span>{"}}"}, {"{{"}<span>flightOut</span>{"}}"}, {"{{"}<span>airport</span>{"}}"}, {"{{"}<span>checkIn</span>{"}}"}, {"{{"}<span>checkOut</span>{"}}"}, {"{{"}<span>hotel</span>{"}}"}, {"{{"}<span>plannerName</span>{"}}"}
              </div>
              <div style={{ marginBottom:"14px" }}>
                <div style={{ fontSize:"16px", fontWeight:700, color:P.navyLight, textTransform:"uppercase", letterSpacing:"0.06em", marginBottom:"5px" }}>Subject Line</div>
                <input value={editSubject} onChange={e => setEditSubject(e.target.value)}
                  style={{ width:"100%", background:P.offWhite, border:`1.5px solid ${P.grey200}`, borderRadius:"10px", padding:"10px 14px", fontSize:"15px", fontFamily:font, fontWeight:600, color:P.navy, outline:"none", boxSizing:"border-box" }} />
              </div>
              <div style={{ marginBottom:"16px" }}>
                <div style={{ fontSize:"16px", fontWeight:700, color:P.navyLight, textTransform:"uppercase", letterSpacing:"0.06em", marginBottom:"5px" }}>Email Body</div>
                <textarea value={editBody} onChange={e => setEditBody(e.target.value)}
                  style={{ width:"100%", height:"300px", background:P.offWhite, border:`1.5px solid ${P.grey200}`, borderRadius:"10px", padding:"14px", fontSize:"15px", fontFamily:font, color:P.navy, resize:"vertical", outline:"none", boxSizing:"border-box", lineHeight:1.7 }} />
              </div>
              <div style={{ display:"flex", gap:"10px" }}>
                <Btn onClick={saveEdit} color={P.accent}>Save Template <Save size={13} strokeWidth={1.8} style={{verticalAlign:"-2px"}}/></Btn>
                <Btn onClick={() => { setTemplates(prev => ({...prev, [editingTemplate]: DEFAULT_TEMPLATES[editingTemplate]})); setEditSubject(DEFAULT_TEMPLATES[editingTemplate].subject); setEditBody(DEFAULT_TEMPLATES[editingTemplate].body); }} outline color={P.grey600}>↺ Reset to Default</Btn>
                <Btn onClick={() => setEditingTemplate(null)} outline>Cancel</Btn>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Streamlined start: one clear next step ── */}
      {activeView === "templates" && (
        <>
          <div style={{ background:P.white, border:`1px solid ${P.grey100}`, borderRadius:"16px", padding:"24px 26px", marginBottom:"14px" }}>
            <div style={{ fontSize:"15px", fontWeight:600, color:P.navy, fontFamily:font, marginBottom:"4px" }}>
              {flaggedWithEmail.length > 0 ? `${flaggedWithEmail.length} guest${flaggedWithEmail.length!==1?"s":""} need a message` : "No messages needed right now"}
            </div>
            <div style={{ fontSize:"16px", color:P.grey600, fontFamily:font, lineHeight:1.6, marginBottom:"16px" }}>
              {flaggedWithEmail.length > 0
                ? "GroupGrid drafted a personalized email for each flagged guest, explaining exactly what's missing or mismatched. Review them, then send."
                : "When a cross-check turns up flagged guests with an email on file, you'll be able to review and send personalized messages here."}
            </div>
            <div style={{ display:"flex", gap:"10px", marginBottom:"18px", flexWrap:"wrap" }}>
              {[
                { n: flaggedWithEmail.length, l:"flagged, with email", c:P.amber },
                { n: (results||[]).filter(r=>!r.email&&r.issues.length>0).length, l:"flagged, no email", c:P.grey600 },
                { n: (results||[]).length, l:"total guests", c:P.periwinkleD },
              ].map(({n,l,c}) => (
                <div key={l} style={{ display:"flex", alignItems:"center", gap:"8px", background:P.grey50, border:`1px solid ${P.grey100}`, borderRadius:"10px", padding:"8px 13px" }}>
                  <span style={{ fontSize:"17px", fontWeight:600, color:c, fontFamily:font }}>{n}</span>
                  <span style={{ fontSize:"15px", color:P.grey600, fontFamily:font }}>{l}</span>
                </div>
              ))}
            </div>
            <div style={{ display:"flex", alignItems:"center", gap:"16px", flexWrap:"wrap" }}>
              {flaggedWithEmail.length > 0
                ? <button onClick={buildQueue} style={{ background:P.accent, color:P.white, border:"none", borderRadius:"11px", padding:"12px 24px", fontSize:"15px", fontWeight:600, fontFamily:font, cursor:"pointer" }}>Review &amp; send {flaggedWithEmail.length} message{flaggedWithEmail.length!==1?"s":""} <Mail size={14} strokeWidth={1.8} style={{verticalAlign:"-2px",marginLeft:"2px"}}/></button>
                : <span style={{ fontSize:"16px", color:P.grey600, fontFamily:font }}>Run a cross-check to generate messages.</span>}
              <button onClick={() => setShowTemplateConfig(v=>!v)} style={{ background:"transparent", border:"none", color:P.periwinkleD, fontSize:"15px", fontWeight:500, fontFamily:font, cursor:"pointer" }}>{showTemplateConfig ? "Hide send settings" : "Send settings"}</button>
            </div>
          </div>
          {queue && <button onClick={() => setActiveView("queue")} style={{ background:"transparent", border:"none", color:P.periwinkleD, fontSize:"15px", fontWeight:500, fontFamily:font, cursor:"pointer", marginBottom:"14px" }}>← Back to your send queue ({pendingCount} pending)</button>}
        </>
      )}

      {/* Queue-view actions bar */}
      {activeView === "queue" && queue && (
        <div style={{ display:"flex", alignItems:"center", gap:"10px", marginBottom:"16px", flexWrap:"wrap" }}>
          <button onClick={() => setActiveView("templates")} style={{ background:P.white, color:P.grey600, border:`1px solid ${P.grey100}`, borderRadius:"8px", padding:"7px 14px", fontSize:"16px", fontWeight:500, fontFamily:font, cursor:"pointer" }}>← Back</button>
          <div style={{ fontSize:"16px", color:P.grey600, fontFamily:font }}>{sentCount} sent · {skippedCount} skipped · {pendingCount} pending</div>
          {sendMsg && <span style={{ fontSize:"15px", color:P.green, fontWeight:600, fontFamily:font }}>{sendMsg}</span>}
          {pendingCount > 0 && <div style={{ marginLeft:"auto", display:"flex", gap:"8px" }}>
            <button onClick={() => {
              const text = (queue||[]).filter(x=>x.status==="pending").map(item =>
                `TO: ${item.to}\nSUBJECT: ${item.subject}\n\n${item.body}\n\n${"─".repeat(60)}`
              ).join("\n\n");
              navigator.clipboard?.writeText(text).then(() => {});
              const blob = new Blob([text], {type:"text/plain"});
              const a = document.createElement("a"); a.href = URL.createObjectURL(blob);
              a.download = `groupgrid-email-queue-${new Date().toISOString().slice(0,10)}.txt`; a.click();
            }} style={{ background:P.white, color:P.periwinkleD, border:`1px solid ${P.grey200}`, borderRadius:"8px", padding:"7px 14px", fontSize:"15px", fontWeight:500, fontFamily:font, cursor:"pointer" }}>Download .txt <Download size={13} strokeWidth={1.8} style={{verticalAlign:"-2px"}}/></button>
            <button onClick={sendAll} style={{ background:P.accent, color:P.white, border:"none", borderRadius:"8px", padding:"7px 16px", fontSize:"15px", fontWeight:600, fontFamily:font, cursor:"pointer" }}>Open all {pendingCount} in mail app <Mail size={13} strokeWidth={1.8} style={{verticalAlign:"-2px"}}/></button>
          </div>}
        </div>
      )}

      {/* TEMPLATES VIEW */}
      {activeView === "templates" && showTemplateConfig && (
        <>
          {/* Send mode selector */}
          <div style={{ background:P.white, borderRadius:"10px", padding:"16px 20px", border:`1px solid ${P.grey100}`, marginBottom:"20px", display:"flex", alignItems:"center", gap:"20px" }}>
            <div>
              <div style={{ fontSize:"15px", fontWeight:600, color:P.navy }}>Send Mode</div>
              <div style={{ fontSize:"15px", color:P.navyLight, marginTop:"2px" }}>Controls how emails are handled when the queue is built</div>
            </div>
            <div style={{ display:"flex", gap:"8px", marginLeft:"auto" }}>
              {[
                { k:"manual", l:"✋ Manual", sub:"You open each email individually" },
                { k:"review", l:"👁 Review First", sub:"Preview every email before sending" },
                { k:"auto", l:"⚡ Build & Send", sub:"Open all in mail app at once" },
              ].map(({k,l,sub}) => (
                <button key={k} onClick={() => setSendMode(k)} style={{ background:sendMode===k?P.navy:P.offWhite, color:sendMode===k?P.white:P.grey600, border:`1px solid ${sendMode===k?P.navy:P.grey100}`, borderRadius:"8px", padding:"9px 14px", cursor:"pointer", textAlign:"left", fontFamily:font }}>
                  <div style={{ fontSize:"15px", fontWeight:500, color:sendMode===k?P.white:P.navy }}>{l}</div>
                  <div style={{ fontSize:"15px", color:sendMode===k?"rgba(255,255,255,0.6)":P.grey600, marginTop:"2px", maxWidth:"140px" }}>{sub}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Stats */}
          <div style={{ display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:"10px", marginBottom:"20px" }}>
            {[
              { label:"Guests with Email", val: guestsWithEmail.length, sub:`of ${(results||[]).length} total guests`, color:P.periwinkleD },
              { label:"Need a Message", val: flaggedWithEmail.length, sub:"flagged guests with email on file", color:P.amber },
              { label:"No Email on File", val: (results||[]).filter(r=>!r.email&&r.issues.length>0).length, sub:"flagged guests — manual follow-up needed", color:P.navyLight },
            ].map(({label,val,sub,color}) => (
              <div key={label} style={{ background:P.white, borderRadius:"8px", padding:"12px 16px", border:`1px solid ${P.grey100}` }}>
                <div style={{ fontSize:"22px", fontWeight:600, color, fontFamily:font }}>{val}</div>
                <div style={{ fontSize:"15px", fontWeight:600, color:P.navy, marginTop:"3px" }}>{label}</div>
                <div style={{ fontSize:"15px", color:P.navyLight, marginTop:"2px" }}>{sub}</div>
              </div>
            ))}
          </div>
        </>
      )}

      {/* Templates grid — always visible (templates list is core, not a setting) */}
      {activeView === "templates" && (
        <>
          {/* Templates grid */}
          <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:"12px" }}>
            <div style={{ fontSize:"15px", fontWeight:600, color:P.navy }}>Email Templates</div>
            <Btn onClick={() => setNewTemplateOpen(true)} outline color={P.periwinkleD} small>New Template <Plus size={12} strokeWidth={1.8} style={{verticalAlign:"-2px"}}/></Btn>
          </div>
          {(() => {
            const byCat = {};
            Object.values(templates).forEach(t => { const c = TEMPLATE_CATEGORY[t.id] || "Custom"; (byCat[c] = byCat[c] || []).push(t); });
            const cats = CATEGORY_ORDER.filter(c => byCat[c]?.length).concat(Object.keys(byCat).filter(c => !CATEGORY_ORDER.includes(c)));
            return cats.map(cat => (
            <div key={cat} style={{ marginBottom:"22px" }}>
              <div style={{ fontSize:"15px", fontWeight:800, color:P.navyLight, textTransform:"uppercase", letterSpacing:"0.08em", margin:"0 0 10px" }}>{cat}</div>
              <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:"12px" }}>
                {byCat[cat].map(tmpl => {
              const applicable = (results||[]).filter(r => r.email && (getApplicableTemplates(r).includes(tmpl.id) || getCustomApplicable(r, tmpl)));
              const isCustomized = !tmpl.isCustom && JSON.stringify(tmpl) !== JSON.stringify(DEFAULT_TEMPLATES[tmpl.id]);
              return (
                <div key={tmpl.id} style={{ background:P.white, borderRadius:"10px", border:`1px solid ${P.grey100}`, padding:"16px 20px" }}>
                  <div style={{ display:"flex", alignItems:"flex-start", justifyContent:"space-between", marginBottom:"10px" }}>
                    <div style={{ display:"flex", alignItems:"center", gap:"10px" }}>
                      <div style={{ width:36, height:36, borderRadius:"10px", background:tmpl.color+"18", display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}><TemplateIcon tmpl={tmpl} size={20} /></div>
                      <div>
                        <div style={{ fontSize:"15px", fontWeight:600, color:P.navy }}>{tmpl.label}</div>
                        <div style={{ fontSize:"15px", color:P.navyLight, marginTop:"2px" }}>{tmpl.description}</div>
                      </div>
                    </div>
                    {isCustomized && <span style={{ background:P.periwinkle+"22", color:P.periwinkleD, fontSize:"15px", fontWeight:500, padding:"2px 8px", borderRadius:"20px", flexShrink:0, marginLeft:"8px" }}>Edited</span>}
                    {tmpl.isCustom && <span style={{ background:P.periwinkleD+"18", color:P.periwinkleD, fontSize:"15px", fontWeight:500, padding:"2px 8px", borderRadius:"20px", flexShrink:0, marginLeft:"4px" }}>Custom</span>}
                  </div>
                  <div style={{ background:P.offWhite, borderRadius:"8px", padding:"10px 12px", marginBottom:"12px" }}>
                    <div style={{ fontSize:"15px", fontWeight:500, color:P.grey600, textTransform:"uppercase", letterSpacing:"0.05em", marginBottom:"4px" }}>Subject preview</div>
                    <div style={{ fontSize:"15px", color:P.navy, fontWeight:600 }}>{tmpl.subject.replace(/\{\{[^}]+\}\}/g, "…")}</div>
                  </div>
                  <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between" }}>
                    <div style={{ display:"flex", alignItems:"center", gap:"6px" }}>
                      {applicable.length > 0
                        ? <span style={{ background:tmpl.color+"18", color:tmpl.color, fontSize:"15px", fontWeight:500, padding:"3px 10px", borderRadius:"20px" }}>Applies to {applicable.length} guest{applicable.length!==1?"s":""}</span>
                        : <span style={{ background:P.grey50, color:P.navyLight, fontSize:"15px", fontWeight:500, padding:"3px 10px", borderRadius:"20px" }}>No guests currently</span>}
                    </div>
                    <div style={{ display:"flex", gap:"6px" }}>
                      {tmpl.isCustom && (
                        <Btn onClick={() => { if (window.confirm(`Delete "${tmpl.label}"?`)) deleteTemplate(tmpl.id); }} outline small color={P.red}>Delete <Trash2 size={12} strokeWidth={1.8} style={{verticalAlign:"-2px"}}/></Btn>
                      )}
                      <Btn onClick={() => startEdit(tmpl.id)} outline small color={P.periwinkleD}>Edit <Pencil size={12} strokeWidth={1.8} style={{verticalAlign:"-2px"}}/></Btn>
                    </div>
                  </div>
                </div>
              );
                })}
              </div>
            </div>
            ));
          })()}
        </>
      )}

      {/* QUEUE VIEW */}
      {activeView === "queue" && (
        <>
          {!queue && (
            <div style={{ background:P.white, borderRadius:"10px", padding:"40px", textAlign:"center", border:`1px solid ${P.grey100}` }}>
              <div style={{ fontSize:"32px", marginBottom:"12px" }}>📤</div>
              <div style={{ fontSize:"15px", fontWeight:800, color:P.navy, marginBottom:"6px" }}>No queue yet</div>
              <div style={{ fontSize:"15px", color:P.navyLight, marginBottom:"20px" }}>Go to Templates and click "Build Send Queue" to generate personalized emails for all flagged guests.</div>
              <Btn onClick={() => setActiveView("templates")}>Go to Templates</Btn>
            </div>
          )}

          {queue && queue.length === 0 && (
            <div style={{ background:P.white, borderRadius:"10px", padding:"40px", textAlign:"center", border:`1px solid ${P.grey100}` }}>
              <div style={{ fontSize:"32px", marginBottom:"12px" }}>✅</div>
              <div style={{ fontSize:"15px", fontWeight:800, color:P.green, marginBottom:"6px" }}>No emails to send</div>
              <div style={{ fontSize:"15px", color:P.navyLight }}>Either no guests have flags, or no flagged guests have email addresses on file.</div>
            </div>
          )}

          {queue && queue.length > 0 && (() => {
            const pendingItems = queue.filter(x => x.status === "pending");
            const allChecked = pendingItems.length > 0 && pendingItems.every(x => checkedIds.has(x.id));
            const someChecked = pendingItems.some(x => checkedIds.has(x.id));
            const checkedPending = pendingItems.filter(x => checkedIds.has(x.id));
            const hasHotelContact = !!contacts?.hotel?.email;
            const hasTravelContact = !!contacts?.travel?.email;
            const hasCarContact = !!contacts?.car?.email;

            return (
            <div style={{ display:"flex", flexDirection:"column", gap:"10px" }}>

              {/* ── Bulk Send Toolbar ── */}
              <div style={{ background:P.white, border:`1px solid ${someChecked ? P.periwinkle+"66" : P.grey100}`, borderRadius:"10px", padding:"12px 16px", display:"flex", alignItems:"center", gap:"14px", flexWrap:"wrap", transition:"border-color 0.2s" }}>
                {/* Select all checkbox */}
                <label style={{ display:"flex", alignItems:"center", gap:"8px", cursor:"pointer", flexShrink:0 }}>
                  <div onClick={toggleCheckAll} style={{ width:20, height:20, borderRadius:"6px", border:`2px solid ${allChecked ? P.periwinkleD : someChecked ? P.periwinkle : P.grey200}`, background:allChecked ? P.periwinkleD : someChecked ? P.periwinkle+"33" : P.white, display:"flex", alignItems:"center", justifyContent:"center", cursor:"pointer", transition:"all 0.15s", flexShrink:0 }}>
                    {allChecked && <span style={{ color:P.white, fontSize:"15px", lineHeight:1, fontWeight:900 }}>✓</span>}
                    {!allChecked && someChecked && <span style={{ color:P.periwinkleD, fontSize:"15px", lineHeight:1, fontWeight:900 }}>—</span>}
                  </div>
                  <span style={{ fontSize:"15px", fontWeight:700, color:P.navy, fontFamily:font }}>
                    {someChecked ? `${checkedPending.length} selected` : `Select all (${pendingItems.length} pending)`}
                  </span>
                </label>

                <div style={{ width:1, height:28, background:P.grey100, flexShrink:0 }} />

                {/* Send to selector */}
                <div style={{ display:"flex", alignItems:"center", gap:"6px", flexWrap:"wrap" }}>
                  <span style={{ fontSize:"15px", fontWeight:700, color:P.navyLight, fontFamily:font, flexShrink:0 }}>Send to:</span>
                  {[
                    { k:"smart",   l:"Smart (auto-route)", available: true },
                    { k:"guest",   l:"Guest",          available: true },
                    { k:"hotel",   l: hasHotelContact ? (contacts.hotel.name || "Hotel Contact") : "Hotel Contact",   available: hasHotelContact },
                    { k:"travel",  l: hasTravelContact ? (contacts.travel.name || "Travel Contact") : "Travel Contact", available: hasTravelContact },
                    { k:"car",     l: hasCarContact ? (contacts.car.name || "Transfer Contact") : "Transfer Contact", available: hasCarContact },
                  ].map(({ k, l, available }) => (
                    <button key={k} onClick={() => available && setBulkRecipient(k)}
                      title={!available ? "Add this contact first" : ""}
                      style={{ background:bulkRecipient===k ? P.navy : available ? P.offWhite : P.grey50, color:bulkRecipient===k ? P.white : available ? P.navy : P.grey300, border:`1.5px solid ${bulkRecipient===k ? P.navy : available ? P.grey200 : P.grey100}`, borderRadius:"8px", padding:"5px 12px", fontSize:"15px", fontWeight:800, fontFamily:font, cursor:available?"pointer":"not-allowed", transition:"all 0.15s", opacity: available ? 1 : 0.5 }}>
                      {l}
                      {!available && <span style={{ fontSize:"15px", marginLeft:"4px" }}>⚠</span>}
                    </button>
                  ))}
                </div>

                <div style={{ marginLeft:"auto", display:"flex", alignItems:"center", gap:"8px", flexWrap:"wrap" }}>
                  {sendMsg && <span style={{ fontSize:"15px", color:P.green, fontWeight:700 }}>{sendMsg}</span>}
                  {unsavedCount > 0 && (
                    <button onClick={saveAllEdits}
                      style={{ background:P.amber+"18", border:`1.5px solid ${P.amber}66`, borderRadius:"9px", padding:"7px 14px", fontSize:"15px", fontWeight:800, fontFamily:font, color:P.amber, cursor:"pointer", display:"flex", alignItems:"center", gap:"6px" }}>
                      💾 Save All Edits ({unsavedCount})
                    </button>
                  )}
                  {checkedPending.length > 0 ? (
                    <button onClick={bulkSendChecked}
                      style={{ background:`linear-gradient(135deg, ${P.periwinkleD}, ${P.periwinkle})`, border:"none", borderRadius:"10px", padding:"9px 20px", fontSize:"15px", fontWeight:800, fontFamily:font, color:P.white, cursor:"pointer", boxShadow:"0 3px 12px rgba(91,109,184,0.4)", display:"flex", alignItems:"center", gap:"8px" }}>
                      Send {checkedPending.length} Email{checkedPending.length !== 1 ? "s" : ""}
                      <span style={{ background:"rgba(255,255,255,0.25)", borderRadius:"6px", padding:"1px 7px", fontSize:"15px" }}>
                        {bulkRecipient === "smart" ? "auto-routed" : bulkRecipient === "all" ? "× recipients" : `to ${bulkRecipient === "guest" ? "Guests" : bulkRecipient === "hotel" ? (contacts?.hotel?.name || "Hotel") : bulkRecipient === "car" ? (contacts?.car?.name || "Transfer") : (contacts?.travel?.name || "Travel")}`}
                      </span>
                    </button>
                  ) : (
                    <span style={{ fontSize:"15px", color:P.navyLight, fontFamily:font }}>Select emails above to bulk send</span>
                  )}
                </div>
              </div>

              {/* ── Queue Items ── */}
              {queue.map((item, idx) => {
                const tmpl = templates[item.templateId] || { color: P.periwinkleD, icon: "✉", label: "Action needed" };
                const isActive = reviewIdx === idx;
                const isChecked = checkedIds.has(item.id);
                return (
                  <div key={item.id} style={{ background:P.white, borderRadius:"16px", border:`1.5px solid ${item.status==="sent"?P.green+"44":item.status==="skipped"?P.grey200:isChecked?P.periwinkle+"88":isActive?P.periwinkle+"55":P.grey100}`, overflow:"hidden", opacity:item.status==="skipped"?0.55:1, transition:"border-color 0.15s" }}>
                    {/* Queue item header */}
                    <div style={{ display:"flex", alignItems:"center", gap:"12px", padding:"14px 18px" }}>
                      {/* Checkbox — only for pending items */}
                      {item.status === "pending" ? (
                        <div onClick={() => toggleCheck(item.id)} style={{ width:20, height:20, borderRadius:"6px", border:`2px solid ${isChecked ? P.periwinkleD : P.grey200}`, background:isChecked ? P.periwinkleD : P.white, display:"flex", alignItems:"center", justifyContent:"center", cursor:"pointer", transition:"all 0.15s", flexShrink:0 }}>
                          {isChecked && <span style={{ color:P.white, fontSize:"15px", lineHeight:1, fontWeight:900 }}>✓</span>}
                        </div>
                      ) : (
                        <div style={{ width:20, height:20, flexShrink:0 }} />
                      )}
                      <div onClick={() => setReviewIdx(isActive ? -1 : idx)} style={{ display:"flex", alignItems:"center", gap:"12px", flex:1, minWidth:0, cursor:"pointer" }}>
                        <div style={{ width:34, height:34, borderRadius:"9px", background:item.status==="sent"?P.greenLight:item.status==="skipped"?P.grey50:tmpl.color+"18", display:"flex", alignItems:"center", justifyContent:"center", fontSize:"16px", flexShrink:0 }}>
                          {item.status==="sent"?"✓":item.status==="skipped"?"—":<TemplateIcon tmpl={tmpl} size={18} />}
                        </div>
                        <div style={{ flex:1, minWidth:0 }}>
                          <div style={{ display:"flex", alignItems:"center", gap:"8px", flexWrap:"wrap" }}>
                            <span style={{ fontWeight:800, fontSize:"15px", color:P.navy }}>{item.record.displayName}</span>
                            <span style={{ fontSize:"15px", color:P.navyLight }}>{item.to}</span>
                            <span style={{ background:tmpl.color+"18", color:tmpl.color, fontSize:"15px", fontWeight:700, padding:"1px 8px", borderRadius:"20px" }}>{tmpl.label}</span>
                            {item.status==="sent" && <span style={{ background:P.greenLight, color:P.green, fontSize:"15px", fontWeight:800, padding:"1px 8px", borderRadius:"20px" }}>✓ Sent</span>}
                            {item.status==="skipped" && <span style={{ background:P.grey50, color:P.navyLight, fontSize:"15px", fontWeight:800, padding:"1px 8px", borderRadius:"20px" }}>Skipped</span>}
                            {editedIds.has(item.id) && item.status==="pending" && <span style={{ background:P.amber+"22", color:P.amber, fontSize:"15px", fontWeight:800, padding:"1px 8px", borderRadius:"20px" }}>Edited</span>}
                            {hasUnsavedEdits(item.id) && <span style={{ background:P.amber+"22", color:P.amber, fontSize:"15px", fontWeight:800, padding:"1px 8px", borderRadius:"20px" }}>⚠ Unsaved</span>}
                          </div>
                          <div style={{ fontSize:"15px", color:P.navy, marginTop:"2px", fontWeight:600 }}>{item.subject}</div>
                        </div>
                      </div>
                      {item.status === "pending" && (
                        <div style={{ display:"flex", gap:"6px", flexShrink:0 }}>
                          <Btn onClick={e => { e.stopPropagation(); openMailto(item); }} small color={P.navy}>Open in Mail ↗</Btn>
                          <Btn onClick={e => { e.stopPropagation(); markSkipped(item.id); }} small outline color={P.grey600}>Skip</Btn>
                        </div>
                      )}
                      {item.status === "sent" && (
                        <Btn onClick={e => { e.stopPropagation(); updateQueueItem(item.id, {status:"pending"}); setSentIds(prev => { const n = new Set(prev); n.delete(item.id); return n; }); }} small outline color={P.grey600}>Undo</Btn>
                      )}
                    </div>

                    {/* Expanded edit panel */}
                    {isActive && item.status === "pending" && (
                      <div style={{ borderTop:`1px solid ${P.grey100}`, padding:"18px 20px", background:P.grey50 }} onClick={e => e.stopPropagation()}>
                        <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:"14px" }}>
                          <div style={{ fontSize:"15px", fontWeight:800, color:P.navy }}>
                            Edit Email
                            {editedIds.has(item.id) && <span style={{ marginLeft:"8px", background:P.amber+"22", color:P.amber, fontSize:"15px", fontWeight:800, padding:"2px 8px", borderRadius:"20px" }}>Edited — will use your version on bulk send</span>}
                          </div>
                          {editedIds.has(item.id) && (
                            <button onClick={() => resetToOriginal(item)} style={{ background:"transparent", border:`1px solid ${P.grey200}`, borderRadius:"7px", padding:"4px 10px", fontSize:"15px", fontWeight:700, color:P.grey500||P.grey600, fontFamily:font, cursor:"pointer" }}>
                              Reset to original
                            </button>
                          )}
                        </div>

                        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:"12px", marginBottom:"12px" }}>
                          <div>
                            <div style={{ fontSize:"16px", fontWeight:700, color:P.navy, textTransform:"uppercase", letterSpacing:"0.06em", marginBottom:"5px" }}>To</div>
                            <input value={getStagedField(item, "to")} onChange={e => stageEdit(item.id, "to", e.target.value)}
                              style={{ width:"100%", background:P.white, border:`1.5px solid ${localEdits[item.id]?.to !== undefined ? P.amber+"88" : P.grey200}`, borderRadius:"9px", padding:"8px 12px", fontSize:"15px", fontFamily:font, fontWeight:600, color:P.navy, outline:"none", boxSizing:"border-box" }} />
                          </div>
                          <div>
                            <div style={{ fontSize:"16px", fontWeight:700, color:P.navy, textTransform:"uppercase", letterSpacing:"0.06em", marginBottom:"5px" }}>Subject</div>
                            <input value={getStagedField(item, "subject")} onChange={e => stageEdit(item.id, "subject", e.target.value)}
                              style={{ width:"100%", background:P.white, border:`1.5px solid ${localEdits[item.id]?.subject !== undefined ? P.amber+"88" : P.grey200}`, borderRadius:"9px", padding:"8px 12px", fontSize:"15px", fontFamily:font, fontWeight:600, color:P.navy, outline:"none", boxSizing:"border-box" }} />
                          </div>
                        </div>

                        <div style={{ marginBottom:"12px" }}>
                          <div style={{ fontSize:"16px", fontWeight:700, color:P.navy, textTransform:"uppercase", letterSpacing:"0.06em", marginBottom:"5px" }}>Email Body</div>
                          <textarea value={getStagedField(item, "body")} onChange={e => stageEdit(item.id, "body", e.target.value)}
                            style={{ width:"100%", height:"240px", background:P.white, border:`1.5px solid ${localEdits[item.id]?.body !== undefined ? P.amber+"88" : P.grey200}`, borderRadius:"10px", padding:"12px 14px", fontSize:"15px", fontFamily:font, color:P.navy, resize:"vertical", outline:"none", boxSizing:"border-box", lineHeight:1.7 }} />
                        </div>

                        <div style={{ display:"flex", gap:"8px", alignItems:"center" }}>
                          {hasUnsavedEdits(item.id) ? (
                            <button onClick={() => { saveEdits(item.id); setReviewIdx(-1); }}
                              style={{ background:P.green, border:"none", borderRadius:"10px", padding:"9px 20px", fontSize:"15px", fontWeight:800, fontFamily:font, color:P.white, cursor:"pointer", boxShadow:"0 2px 8px rgba(34,197,94,0.3)", display:"flex", alignItems:"center", gap:"7px" }}>
                              ✓ Save Changes
                            </button>
                          ) : (
                            <button onClick={() => openMailto({ ...item, to: getStagedField(item,"to"), subject: getStagedField(item,"subject"), body: getStagedField(item,"body") })}
                              style={{ background:P.navy, border:"none", borderRadius:"10px", padding:"9px 20px", fontSize:"15px", fontWeight:800, fontFamily:font, color:P.white, cursor:"pointer" }}>
                              Open in Mail App ↗
                            </button>
                          )}
                          {hasUnsavedEdits(item.id) && (
                            <button onClick={() => openMailto({ ...item, to: getStagedField(item,"to"), subject: getStagedField(item,"subject"), body: getStagedField(item,"body") })}
                              style={{ background:"transparent", border:`1.5px solid ${P.navy}`, borderRadius:"10px", padding:"9px 20px", fontSize:"15px", fontWeight:800, fontFamily:font, color:P.navy, cursor:"pointer" }}>
                              Send without saving ↗
                            </button>
                          )}
                          <Btn onClick={() => markSkipped(item.id)} outline color={P.grey600}>Skip</Btn>
                          {hasUnsavedEdits(item.id) && <span style={{ fontSize:"15px", color:P.amber, fontFamily:font, fontWeight:700 }}>⚠ Save to include in bulk send — or use "Save All Edits" above</span>}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          );
          })()}
        </>
      )}
    </div>
  );
}

class ErrorBoundary extends React.Component {
  constructor(props) { super(props); this.state = { error: null }; }
  static getDerivedStateFromError(e) { return { error: e }; }
  render() {
    if (this.state.error) {
      return (
        <div style={{ padding:"40px", fontFamily:"'IBM Plex Sans',sans-serif", maxWidth:"600px", margin:"40px auto" }}>
          <div style={{ background:"#FDECEC", border:"1.5px solid #C0392B44", borderRadius:"16px", padding:"24px" }}>
            <div style={{ fontSize:"16px", fontWeight:900, color:"#C0392B", marginBottom:"8px" }}><AlertTriangle size={16} style={{display:"inline",marginRight:6,verticalAlign:"middle"}}/>Something went wrong</div>
            <div style={{ fontSize:"15px", color:"#1A2E52", fontWeight:600, marginBottom:"12px" }}>Error details (copy these to report the issue):</div>
            <pre style={{ background:"white", borderRadius:"10px", padding:"12px", fontSize:"15px", color:"#C0392B", overflowX:"auto", whiteSpace:"pre-wrap", wordBreak:"break-all" }}>
              {this.state.error?.message}{"\n\n"}{this.state.error?.stack}
            </pre>
            <button onClick={() => this.setState({error:null})} style={{ marginTop:"14px", background:"#1A2E52", color:"white", border:"none", borderRadius:"10px", padding:"8px 20px", fontSize:"15px", fontWeight:800, fontFamily:"'IBM Plex Sans',sans-serif", cursor:"pointer" }}>Try Again</button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

// ── Login Panel (slide-in drawer) ────────────────────────────────────────────
function LoginPanel({ onLogin, onClose }) {
  const [mode, setMode]         = useState("signin"); // "signin" | "signup" | "reset"
  const [email, setEmail]       = useState("");
  const [password, setPassword] = useState("");
  const [name, setName]         = useState("");
  const [showPw, setShowPw]     = useState(false);
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState("");
  const [success, setSuccess]   = useState("");
  const [focused, setFocused]   = useState("");

  function clearForm() { setError(""); setSuccess(""); }

  async function handleSignIn(e) {
    e.preventDefault();
    if (!email.trim() || !password.trim()) { setError("Please enter your email and password."); return; }
    clearForm(); setLoading(true);
    try {
      const sb = getSupabase();
      if (!sb) throw new Error("Auth not available. Please refresh and try again.");
      const { data, error: sbErr } = await sb.auth.signInWithPassword({ email: email.trim(), password });
      if (sbErr) throw sbErr;
      onLogin({ email: data.user.email, name: data.user.user_metadata?.name || data.user.email.split("@")[0], id: data.user.id });
    } catch (err) {
      setError(err.message === "Invalid login credentials" ? "Incorrect email or password. Please try again." : err.message);
    } finally { setLoading(false); }
  }

  async function handleSignUp(e) {
    e.preventDefault();
    if (!name.trim()) { setError("Please enter your name."); return; }
    if (!email.trim()) { setError("Please enter your email."); return; }
    if (password.length < 8) { setError("Password must be at least 8 characters."); return; }
    clearForm(); setLoading(true);
    try {
      const sb = getSupabase();
      if (!sb) throw new Error("Auth not available. Please refresh and try again.");
      const { data, error: sbErr } = await sb.auth.signUp({
        email: email.trim(), password,
        options: { data: { name: name.trim() } }
      });
      if (sbErr) throw sbErr;
      // Sync the new signup to HubSpot via our serverless endpoint (token stays
      // server-side). Fire-and-forget: never blocks or fails the signup.
      fetch("/api/hubspot-upsert", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim(), name: name.trim() }),
      }).catch(() => {});
      if (data.user && !data.session) {
        // Email confirmation required
        setSuccess("Check your inbox! We sent a confirmation link to " + email.trim() + ". Click it to activate your account.");
      } else if (data.session) {
        // Auto-confirmed (email confirm disabled in Supabase)
        onLogin({ email: data.user.email, name: name.trim(), id: data.user.id });
      }
    } catch (err) {
      setError(err.message.includes("already registered") ? "An account with this email already exists. Try signing in." : err.message);
    } finally { setLoading(false); }
  }

  async function handleReset(e) {
    e.preventDefault();
    if (!email.trim()) { setError("Please enter your email address."); return; }
    clearForm(); setLoading(true);
    try {
      const sb = getSupabase();
      if (!sb) throw new Error("Auth not available. Please refresh and try again.");
      const { error: sbErr } = await sb.auth.resetPasswordForEmail(email.trim(), {
        redirectTo: window.location.origin
      });
      if (sbErr) throw sbErr;
      setSuccess("Password reset link sent to " + email.trim() + ". Check your inbox.");
    } catch (err) {
      setError(err.message);
    } finally { setLoading(false); }
  }

  const inputStyle = (field) => ({
    width:"100%", background:"rgba(255,255,255,0.07)", border:`1.5px solid ${focused===field ? P.periwinkle : "rgba(255,255,255,0.12)"}`,
    borderRadius:"12px", padding:"12px 14px", fontSize:"15px", fontFamily:font, fontWeight:600,
    color:P.white, outline:"none", boxSizing:"border-box", transition:"border-color 0.2s", caretColor:P.periwinkleL
  });

  return (
    <div style={{ display:"flex", flexDirection:"column", height:"100%", fontFamily:font }}>

      {/* Header */}
      <div style={{ padding:"24px 28px 20px", borderBottom:"1px solid rgba(255,255,255,0.08)", display:"flex", alignItems:"center", justifyContent:"space-between", flexShrink:0 }}>
        <div style={{ display:"flex", alignItems:"center" }}>
          <BrandLogo height={24} onDark={true} />
        </div>
        <button onClick={onClose} style={{ background:"rgba(255,255,255,0.08)", border:"none", borderRadius:"10px", width:32, height:32, cursor:"pointer", color:"rgba(255,255,255,0.5)", display:"flex", alignItems:"center", justifyContent:"center" }}><X size={15} strokeWidth={1.8}/></button>
      </div>

      {/* Body */}
      <div style={{ flex:1, overflowY:"auto", padding:"32px 28px" }}>

        {/* Mode tabs */}
        {mode !== "reset" && (
          <div style={{ display:"flex", background:"rgba(255,255,255,0.06)", borderRadius:"10px", padding:"3px", gap:"2px", marginBottom:"28px" }}>
            {[["signin","Sign In"],["signup","Create Account"]].map(([k,l]) => (
              <button key={k} onClick={() => { setMode(k); clearForm(); }}
                style={{ flex:1, padding:"8px", borderRadius:"8px", border:"none", cursor:"pointer", fontFamily:font, fontSize:"15px", fontWeight:700, transition:"all 0.15s", background:mode===k?"rgba(255,255,255,0.12)":"transparent", color:mode===k?P.white:"rgba(255,255,255,0.4)" }}>
                {l}
              </button>
            ))}
          </div>
        )}

        {/* Heading */}
        <div style={{ marginBottom:"24px" }}>
          <div style={{ fontSize:"22px", fontWeight:900, color:P.white, marginBottom:"6px" }}>
            {mode==="signin" ? "Welcome back" : mode==="signup" ? "Create your account" : "Reset your password"}
          </div>
          <div style={{ fontSize:"15px", color:"rgba(255,255,255,0.4)", lineHeight:1.5 }}>
            {mode==="signin" ? "Sign in to access your saved projects and event history." :
             mode==="signup" ? "Save projects, sync across devices, and access your event history." :
             "Enter your email and we'll send you a reset link."}
          </div>
        </div>

        {/* Success message */}
        {success && (
          <div style={{ background:"rgba(0,201,177,0.12)", border:"1px solid rgba(0,201,177,0.3)", borderRadius:"10px", padding:"12px 14px", fontSize:"15px", color:P.accent, fontWeight:600, marginBottom:"20px", lineHeight:1.5 }}>
            ✓ {success}
          </div>
        )}

        {/* Error message */}
        {error && (
          <div style={{ background:"rgba(192,57,43,0.15)", border:"1px solid rgba(192,57,43,0.35)", borderRadius:"10px", padding:"10px 14px", fontSize:"15px", color:"#C0392B", fontWeight:700, marginBottom:"20px" }}>
            ⚠ {error}
          </div>
        )}

        {/* Sign In form */}
        {mode === "signin" && !success && (
          <form onSubmit={handleSignIn} style={{ display:"flex", flexDirection:"column", gap:"16px" }}>
            <div>
              <label style={{ display:"block", fontSize:"15px", fontWeight:700, color:"rgba(255,255,255,0.4)", textTransform:"uppercase", letterSpacing:"0.07em", marginBottom:"7px" }}>Email</label>
              <input type="email" value={email} onChange={e => { setEmail(e.target.value); setError(""); }} onFocus={() => setFocused("email")} onBlur={() => setFocused("")} placeholder="you@company.com" style={inputStyle("email")} />
            </div>
            <div>
              <div style={{ display:"flex", justifyContent:"space-between", marginBottom:"7px" }}>
                <label style={{ fontSize:"15px", fontWeight:700, color:"rgba(255,255,255,0.4)", textTransform:"uppercase", letterSpacing:"0.07em" }}>Password</label>
                <button type="button" onClick={() => { setMode("reset"); clearForm(); }} style={{ background:"transparent", border:"none", color:P.periwinkleL, fontSize:"15px", fontWeight:700, cursor:"pointer", padding:0 }}>Forgot password?</button>
              </div>
              <div style={{ position:"relative" }}>
                <input type={showPw?"text":"password"} value={password} onChange={e => { setPassword(e.target.value); setError(""); }} onFocus={() => setFocused("password")} onBlur={() => setFocused("")} placeholder="••••••••" style={{ ...inputStyle("password"), paddingRight:"42px" }} />
                <button type="button" onClick={() => setShowPw(s => !s)} style={{ position:"absolute", right:13, top:"50%", transform:"translateY(-50%)", background:"transparent", border:"none", color:"rgba(255,255,255,0.3)", cursor:"pointer", fontSize:"15px", padding:0 }}>{showPw?"🙈":"👁"}</button>
              </div>
            </div>
            <button type="submit" disabled={loading}
              style={{ width:"100%", background:loading?"rgba(91,109,184,0.5)":`linear-gradient(135deg, ${P.periwinkleD}, ${P.periwinkle})`, border:"none", borderRadius:"10px", padding:"13px", fontSize:"15px", fontWeight:700, fontFamily:font, color:P.white, cursor:loading?"wait":"pointer", marginTop:"4px", boxShadow:loading?"none":"0 2px 12px rgba(69,87,176,0.28)", transition:"all 0.2s" }}>
              {loading ? "Signing in…" : "Sign In →"}
            </button>
          </form>
        )}

        {/* Sign Up form */}
        {mode === "signup" && !success && (
          <form onSubmit={handleSignUp} style={{ display:"flex", flexDirection:"column", gap:"16px" }}>
            <div>
              <label style={{ display:"block", fontSize:"15px", fontWeight:700, color:"rgba(255,255,255,0.4)", textTransform:"uppercase", letterSpacing:"0.07em", marginBottom:"7px" }}>Your Name</label>
              <input type="text" value={name} onChange={e => { setName(e.target.value); setError(""); }} onFocus={() => setFocused("name")} onBlur={() => setFocused("")} placeholder="First Name Last Name" style={inputStyle("name")} />
            </div>
            <div>
              <label style={{ display:"block", fontSize:"15px", fontWeight:700, color:"rgba(255,255,255,0.4)", textTransform:"uppercase", letterSpacing:"0.07em", marginBottom:"7px" }}>Email</label>
              <input type="email" value={email} onChange={e => { setEmail(e.target.value); setError(""); }} onFocus={() => setFocused("email")} onBlur={() => setFocused("")} placeholder="you@company.com" style={inputStyle("email")} />
            </div>
            <div>
              <label style={{ display:"block", fontSize:"15px", fontWeight:700, color:"rgba(255,255,255,0.4)", textTransform:"uppercase", letterSpacing:"0.07em", marginBottom:"7px" }}>Password <span style={{ fontWeight:400, textTransform:"none", letterSpacing:0 }}>(min. 8 characters)</span></label>
              <div style={{ position:"relative" }}>
                <input type={showPw?"text":"password"} value={password} onChange={e => { setPassword(e.target.value); setError(""); }} onFocus={() => setFocused("password")} onBlur={() => setFocused("")} placeholder="Create a strong password" style={{ ...inputStyle("password"), paddingRight:"42px" }} />
                <button type="button" onClick={() => setShowPw(s => !s)} style={{ position:"absolute", right:13, top:"50%", transform:"translateY(-50%)", background:"transparent", border:"none", color:"rgba(255,255,255,0.3)", cursor:"pointer", fontSize:"15px", padding:0 }}>{showPw?"🙈":"👁"}</button>
              </div>
              {password.length > 0 && password.length < 8 && (
                <div style={{ fontSize:"15px", color:"rgba(192,57,43,0.8)", marginTop:"5px" }}>Password too short ({password.length}/8)</div>
              )}
            </div>
            <button type="submit" disabled={loading}
              style={{ width:"100%", background:loading?"rgba(0,201,177,0.3)":P.accent, border:"none", borderRadius:"10px", padding:"13px", fontSize:"15px", fontWeight:700, fontFamily:font, color:P.white, cursor:loading?"wait":"pointer", marginTop:"4px", boxShadow:loading?"none":"0 2px 12px rgba(0,201,177,0.3)", transition:"all 0.2s" }}>
              {loading ? "Creating account…" : "Create Account →"}
            </button>
          </form>
        )}

        {/* Password Reset form */}
        {mode === "reset" && !success && (
          <form onSubmit={handleReset} style={{ display:"flex", flexDirection:"column", gap:"16px" }}>
            <div>
              <label style={{ display:"block", fontSize:"15px", fontWeight:700, color:"rgba(255,255,255,0.4)", textTransform:"uppercase", letterSpacing:"0.07em", marginBottom:"7px" }}>Email Address</label>
              <input type="email" value={email} onChange={e => { setEmail(e.target.value); setError(""); }} onFocus={() => setFocused("email")} onBlur={() => setFocused("")} placeholder="you@company.com" style={inputStyle("email")} />
            </div>
            <button type="submit" disabled={loading}
              style={{ width:"100%", background:loading?"rgba(91,109,184,0.5)":`linear-gradient(135deg, ${P.periwinkleD}, ${P.periwinkle})`, border:"none", borderRadius:"10px", padding:"13px", fontSize:"15px", fontWeight:700, fontFamily:font, color:P.white, cursor:loading?"wait":"pointer", boxShadow:loading?"none":"0 2px 12px rgba(69,87,176,0.28)", transition:"all 0.2s" }}>
              {loading ? "Sending…" : "Send Reset Link →"}
            </button>
            <button type="button" onClick={() => { setMode("signin"); clearForm(); }}
              style={{ background:"transparent", border:"none", color:"rgba(255,255,255,0.35)", fontSize:"15px", fontWeight:600, cursor:"pointer", fontFamily:font, padding:"4px" }}>
              ← Back to Sign In
            </button>
          </form>
        )}

        {/* What you get when signed in */}
        {mode !== "reset" && !success && (
          <div style={{ marginTop:"32px" }}>
            <div style={{ fontSize:"15px", fontWeight:800, color:"rgba(255,255,255,0.25)", textTransform:"uppercase", letterSpacing:"0.08em", marginBottom:"14px" }}>When signed in you get</div>
            {[
              { icon:<FileSpreadsheet size={14} strokeWidth={1.8}/>, label:"Save & restore projects across sessions" },
              { icon:<Mail size={14} strokeWidth={1.8}/>, label:"Custom email templates saved to your account" },
              { icon:<Users size={14} strokeWidth={1.8}/>, label:"Contacts & planner preferences synced" },
              { icon:<BarChart2 size={14} strokeWidth={1.8}/>, label:"Event history and past cross-checks" },
            ].map(({ icon, label }) => (
              <div key={label} style={{ display:"flex", alignItems:"center", gap:"12px", marginBottom:"12px" }}>
                <div style={{ width:30, height:30, borderRadius:"9px", background:"rgba(123,143,212,0.15)", border:"1px solid rgba(123,143,212,0.25)", display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}>{icon}</div>
                <span style={{ fontSize:"15px", color:"rgba(255,255,255,0.45)", fontWeight:600, lineHeight:1.4 }}>{label}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Footer */}
      <div style={{ padding:"16px 28px", borderTop:"1px solid rgba(255,255,255,0.07)", flexShrink:0 }}>
        <div style={{ fontSize:"15px", color:"rgba(255,255,255,0.18)", textAlign:"center" }}>© 2026 GroupGrid · Built for event professionals · {APP_VERSION}</div>
      </div>
    </div>
  );
}



// ── Static Pages ─────────────────────────────────────────────────────────────
function PageShell({ title, onBack, nav, children }) {
  return (
    <div style={{ minHeight:"100vh", background:P.offWhite, fontFamily:font }}>
      {nav ? <MarketingNav nav={nav} /> : (
      <div style={{ background:P.navy, padding:"0 32px", height:"52px", display:"flex", alignItems:"center", gap:"16px", boxShadow:"0 1px 0 rgba(255,255,255,0.06)" }}>
        <button onClick={onBack} style={{ background:"rgba(255,255,255,0.08)", border:"none", borderRadius:"8px", padding:"5px 12px", color:"rgba(255,255,255,0.7)", fontSize:"15px", fontFamily:font, fontWeight:600, cursor:"pointer", display:"flex", alignItems:"center", gap:"6px" }}>← Back</button>
        <span style={{ color:P.white, fontSize:"15px", fontWeight:700, fontFamily:font }}>{title}</span>
      </div>
      )}
      <div style={{ maxWidth:"760px", margin:"0 auto", padding:"48px 28px" }}>
        {children}
      </div>
    </div>
  );
}

function Section({ title, children }) {
  return (
    <div style={{ marginBottom:"36px" }}>
      <h2 style={{ fontSize:"18px", fontWeight:800, color:P.navy, fontFamily:font, margin:"0 0 12px", letterSpacing:"-0.02em" }}>{title}</h2>
      <div style={{ fontSize:"16px", color:P.grey600, fontFamily:font, lineHeight:1.8 }}>{children}</div>
    </div>
  );
}

function MarketingNav({ nav }) {
  // Persistent marketing header: logo returns home, tabs navigate, current tab highlighted, Open App on the right.
  const tabs = [
    { key:"landing", label:"Home",    go: nav?.onHome },
    { key:"pricing", label:"Pricing", go: nav?.onPricing },
    { key:"about",   label:"About",   go: nav?.onAbout },
    { key:"faq",     label:"FAQ",     go: nav?.onFaq },
    { key:"contact", label:"Contact", go: nav?.onContact },
  ];
  return (
    <div style={{ position:"sticky", top:0, zIndex:50, background:P.navy, padding:"0 16px", minHeight:"56px", display:"flex", alignItems:"center", justifyContent:"space-between", gap:"8px", boxShadow:"0 1px 0 rgba(255,255,255,0.06)", flexWrap:"nowrap" }}>
      <button onClick={nav?.onHome} style={{ display:"flex", alignItems:"center", gap:"9px", background:"none", border:"none", cursor:"pointer", padding:0, flexShrink:0 }}>
        <BrandMark size={26} onDark={true} />
        <BrandWordmark light={true} size={17} />
      </button>
      <div style={{ display:"flex", alignItems:"center", gap:"4px", flexShrink:0 }}>
        <div className="gg-mktnav-tabs" style={{ display:"flex", alignItems:"center", gap:"4px" }}>
        {tabs.map(t => {
          const active = nav?.current === t.key;
          return (
            <button key={t.key} onClick={t.go} style={{ background: active ? "rgba(0,201,177,0.15)" : "transparent", border:"none", borderRadius:"7px", padding:"6px 12px", color: active ? P.accent : "rgba(255,255,255,0.7)", fontSize:"15px", fontWeight: active ? 700 : 500, fontFamily:font, cursor:"pointer", whiteSpace:"nowrap" }}>{t.label}</button>
          );
        })}
        </div>
        <button onClick={nav?.onApp} style={{ marginLeft:"4px", background:P.accent, border:"none", borderRadius:"8px", padding:"8px 14px", fontSize:"15px", fontWeight:700, color:P.white, fontFamily:font, cursor:"pointer", whiteSpace:"nowrap", flexShrink:0 }}>Open App →</button>
      </div>
    </div>
  );
}

function TermsPage({ onBack, nav }) {
  return (
    <PageShell title="Terms of Service" onBack={onBack} nav={nav}>
      <div style={{ marginBottom:"40px" }}>
        <h1 style={{ fontSize:"32px", fontWeight:700, color:P.navy, fontFamily:fontDisplay, margin:"0 0 8px", letterSpacing:"-0.03em" }}>Terms of Service</h1>
        <p style={{ fontSize:"17px", color:P.grey600, fontFamily:font, margin:"0 0 16px" }}>Last updated: February 2026</p>
        <p style={{ fontSize:"17px", color:P.grey600, fontFamily:font, lineHeight:1.7, margin:0 }}>By using GroupGrid, you agree to these terms. Please read them carefully.</p>
      </div>
      <Section title="1. Acceptance of Terms">
        By accessing or using GroupGrid ("the Service"), you agree to be bound by these Terms of Service. If you do not agree to these terms, do not use the Service. We reserve the right to update these terms at any time with notice provided via the Service.
      </Section>
      <Section title="2. Description of Service">
        GroupGrid is a browser-based event logistics tool that cross-references guest travel data (flight manifests, hotel rosters, car transfers, and dietary records) to identify discrepancies. All data processing occurs locally in your browser. No guest data is transmitted to or stored on GroupGrid servers.
      </Section>
      <Section title="3. Acceptable Use">
        You may use GroupGrid only for lawful purposes and in accordance with these Terms. You agree not to: (a) use the Service to process data you do not have authorization to access; (b) attempt to reverse-engineer or compromise the Service; (c) use the Service in any manner that violates applicable laws or regulations, including data protection laws.
      </Section>
      <Section title="4. Your Data & Privacy">
        We do not have access to your guest data. You are solely responsible for ensuring you have appropriate authorization to process any personal data you upload into the Service, and for complying with applicable data protection regulations including GDPR and CCPA. See our Privacy Policy for details on how data is handled.
      </Section>
      <Section title="5. Intellectual Property">
        GroupGrid and its original content, features, and functionality are owned by GroupGrid and are protected by international copyright, trademark, and other intellectual property laws. You may not copy, modify, distribute, or create derivative works of the Service without our prior written consent.
      </Section>
      <Section title="6. Disclaimers">
        THE SERVICE IS PROVIDED "AS IS" WITHOUT WARRANTIES OF ANY KIND, EITHER EXPRESS OR IMPLIED. GROUPGRID DOES NOT WARRANT THAT THE SERVICE WILL BE UNINTERRUPTED, ERROR-FREE, OR FREE OF VIRUSES OR OTHER HARMFUL COMPONENTS. YOU USE THE SERVICE AT YOUR OWN RISK.
      </Section>
      <Section title="7. Limitation of Liability">
        TO THE FULLEST EXTENT PERMITTED BY LAW, GROUPGRID SHALL NOT BE LIABLE FOR ANY INDIRECT, INCIDENTAL, SPECIAL, CONSEQUENTIAL, OR PUNITIVE DAMAGES, INCLUDING LOST PROFITS, ARISING FROM YOUR USE OF OR INABILITY TO USE THE SERVICE, EVEN IF GROUPGRID HAS BEEN ADVISED OF THE POSSIBILITY OF SUCH DAMAGES.
      </Section>
      <Section title="8. Indemnification">
        You agree to defend, indemnify, and hold harmless GroupGrid from any claims, damages, obligations, losses, or expenses arising from your use of the Service, your violation of these Terms, or your violation of any third-party rights.
      </Section>
      <Section title="9. Termination">
        We reserve the right to terminate or suspend access to the Service at our sole discretion, without notice, for conduct that we believe violates these Terms or is harmful to other users, us, third parties, or for any other reason.
      </Section>
      <Section title="10. Governing Law">
        These Terms shall be governed by the laws of the State of Delaware, United States, without regard to its conflict of law provisions. Any disputes arising under these Terms shall be resolved in the courts of Delaware.
      </Section>
      <Section title="11. Contact">
        Questions about these Terms, billing, or pricing? Email us at <a href="mailto:billing@groupgrid.io" style={{ color:P.periwinkleD, fontWeight:600 }}>billing@groupgrid.io</a>.
      </Section>
    </PageShell>
  );
}

function AboutPage({ onBack, nav }) {
  const useCases = [
    { Icon:FlagIcon,   label:"Sales Kickoffs" },
    { Icon:CityIcon,   label:"Corporate Events" },
    { Icon:PeopleIcon, label:"Board Retreats" },
    { Icon:PeopleIcon, label:"Advisory Boards" },
    { Icon:PeopleIcon, label:"Executive Roundtables" },
    { Icon:BadgeIcon,  label:"Tradeshows" },
    { Icon:CityIcon,   label:"Healthcare Meetings" },
    { Icon:GridIcon,   label:"Event Agencies" },
    { Icon:CityIcon,   label:"Conferences" },
    { Icon:PeopleIcon, label:"Association Meetings" },
    { Icon:GlobeIcon,  label:"Global Summits" },
    { Icon:FlagIcon,   label:"Field Marketing Events" },
  ];

  return (
    <div style={{ minHeight:"100vh", background:P.offWhite, fontFamily:font }}>
      {nav ? <MarketingNav nav={nav} /> : (
      <div style={{ background:P.navy, padding:"0 32px", height:"52px", display:"flex", alignItems:"center", gap:"16px", boxShadow:"0 1px 0 rgba(255,255,255,0.06)" }}>
        <button onClick={onBack} style={{ background:"rgba(255,255,255,0.08)", border:"none", borderRadius:"8px", padding:"5px 12px", color:"rgba(255,255,255,0.7)", fontSize:"15px", fontFamily:font, fontWeight:600, cursor:"pointer" }}>← Back</button>
        <span style={{ color:P.white, fontSize:"15px", fontWeight:700, fontFamily:font }}>About GroupGrid</span>
      </div>
      )}

      {/* Hero */}
      <div style={{ background:`linear-gradient(160deg, ${P.navy} 0%, ${P.navyLight} 100%)`, padding:"64px 28px 56px", textAlign:"center" }}>
        <div style={{ display:"inline-flex", alignItems:"center", gap:"8px", background:"rgba(0,201,177,0.12)", border:"1px solid rgba(0,201,177,0.3)", borderRadius:"20px", padding:"5px 16px", marginBottom:"20px" }}>
          <span style={{ fontSize:"15px", fontWeight:700, color:P.accent, fontFamily:font, letterSpacing:"0.05em" }}>BUILT BY A PLANNER, FOR PLANNERS</span>
        </div>
        <h1 style={{ fontSize:"42px", fontWeight:700, color:P.white, fontFamily:fontDisplay, margin:"0 0 16px", letterSpacing:"-0.04em", lineHeight:1.1, maxWidth:"680px", marginLeft:"auto", marginRight:"auto" }}>
          The tool I wish I had<br/><span style={{ color:P.accent }}>for every event I've ever run.</span>
        </h1>
        <p style={{ fontSize:"18px", color:"rgba(255,255,255,0.6)", fontFamily:font, margin:"0 auto", lineHeight:1.7, maxWidth:"560px" }}>
          Created to solve a problem I lived with for over 15 years: making sure everyone who registers for an event actually has the travel they were promised.
        </p>
      </div>

      <div style={{ maxWidth:"820px", margin:"0 auto", padding:"56px 28px 80px" }}>

        {/* Founder story */}
        <div style={{ background:P.white, borderRadius:"20px", border:`1.5px solid ${P.grey100}`, padding:"36px 40px", marginBottom:"32px", position:"relative", overflow:"hidden" }}>
          <div style={{ position:"absolute", top:0, left:0, width:"4px", height:"100%", background:`linear-gradient(180deg, ${P.accent}, ${P.navy})` }} />
          <div style={{ fontSize:"16px", fontWeight:800, color:P.accent, fontFamily:font, letterSpacing:"0.1em", textTransform:"uppercase", marginBottom:"16px" }}>Why GroupGrid Exists</div>
          <p style={{ fontSize:"17px", color:P.grey600, fontFamily:font, lineHeight:1.85, margin:"0 0 20px" }}>
            GroupGrid was created to solve a challenge I lived with for more than 15 years as an event professional: <strong style={{ color:P.navy }}>reconciling who registered for an event against what was actually booked for their travel.</strong> Registration lists, flight manifests, and hotel rosters never quite agree, and finding the gaps before they become day-of problems is slow, manual, and error-prone.
          </p>
          <p style={{ fontSize:"17px", color:P.grey600, fontFamily:font, lineHeight:1.85, margin:"0 0 20px" }}>
            For years, the only way to manage it reliably was to spend thousands of dollars outsourcing the cross-checking — paying others to do the painstaking work of comparing spreadsheets row by row. It was expensive, it was repetitive, and it was a problem the market had never properly solved.
          </p>
          <p style={{ fontSize:"17px", color:P.grey600, fontFamily:font, lineHeight:1.85, margin:0 }}>
            GroupGrid brings that work in-house and makes it fast. Upload your registration list and your travel files, run the check, and see exactly who registered but isn't booked, who's booked but never registered, and whose dates don't match — with enough time to fix it.
          </p>
        </div>

        {/* Value strip */}
        <div style={{ background:P.navy, borderRadius:"16px", padding:"28px 32px", marginBottom:"32px" }}>
          <div style={{ fontSize:"16px", fontWeight:800, color:"rgba(255,255,255,0.5)", fontFamily:font, letterSpacing:"0.1em", textTransform:"uppercase", marginBottom:"22px" }}>What GroupGrid Does For You</div>
          <div className="gg-landing-stats" style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:"22px 28px" }}>
            {[
              { Icon:CrossCheckIcon, title:"No manual cross-checking", body:"Check an entire event without comparing spreadsheets row by row." },
              { Icon:PeopleIcon, title:"Everyone matched to their travel", body:"Each registered guest is lined up against their flight, hotel, and car." },
              { Icon:ShieldCheck, title:"Your guest files stay private", body:"Files are read in your browser and never uploaded to a server.", lucide:true },
              { Icon:FlagIcon, title:"Gaps caught before the event", body:"Missing bookings, mismatched dates, and duplicates, surfaced with time to fix them." },
            ].map(({ Icon, title, body, lucide }, i) => {
              const box = i % 2 === 0 ? P.accentD : P.navyLight;
              const iconAccent = box === P.accentD ? P.white : P.accent;
              return (
              <div key={title} style={{ display:"flex", alignItems:"flex-start", gap:"14px" }}>
                <div style={{ width:38, height:38, borderRadius:"10px", background:box, display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0, marginTop:"2px" }}>
                  {lucide ? <Icon size={19} strokeWidth={1.8} color="rgba(255,255,255,0.95)"/> : <Icon size={20} line="rgba(255,255,255,0.95)" accent={iconAccent} />}
                </div>
                <div>
                  <div style={{ fontSize:"15px", fontWeight:700, color:P.white, fontFamily:font, marginBottom:"3px", letterSpacing:"-0.01em" }}>{title}</div>
                  <div style={{ fontSize:"15px", color:"rgba(255,255,255,0.55)", fontFamily:font, lineHeight:1.55 }}>{body}</div>
                </div>
              </div>
              );
            })}
          </div>
        </div>

        {/* Who it's for */}
        <div style={{ marginBottom:"32px" }}>
          <div style={{ fontSize:"16px", fontWeight:800, color:P.navy, fontFamily:font, letterSpacing:"0.08em", textTransform:"uppercase", marginBottom:"8px" }}>Built for Event Planners Running Events of Any Size</div>
          <p style={{ fontSize:"17px", color:P.grey600, fontFamily:font, lineHeight:1.7, margin:"0 0 20px" }}>
            Wherever you need to make sure attendees arrive on time, have a confirmed hotel room, and won't show up at the wrong airport — GroupGrid has you covered.
          </p>
          <div className="gg-landing-usecases" style={{ display:"grid", gridTemplateColumns:"repeat(3, 1fr)", gap:"10px" }}>
            {useCases.map(({ Icon, label }, i) => {
              const box = i % 2 === 0 ? P.navy : P.accentD;
              const iconAccent = box === P.accentD ? P.white : P.accent;
              return (
              <div key={label} style={{ display:"flex", alignItems:"center", gap:"12px", background:P.white, border:`1.5px solid ${P.grey100}`, borderRadius:"12px", padding:"12px 14px" }}>
                <div style={{ width:36, height:36, borderRadius:"10px", background:box, display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}><Icon size={19} line="rgba(255,255,255,0.95)" accent={iconAccent} /></div>
                <span style={{ fontSize:"15px", fontWeight:600, color:P.navy, fontFamily:font }}>{label}</span>
              </div>
              );
            })}
          </div>
        </div>

        {/* How it works */}
        <div style={{ background:P.white, borderRadius:"16px", border:`1.5px solid ${P.grey100}`, padding:"32px 36px", marginBottom:"32px" }}>
          <div style={{ fontSize:"16px", fontWeight:800, color:P.navy, fontFamily:font, letterSpacing:"0.08em", textTransform:"uppercase", marginBottom:"20px" }}>How It Works</div>
          <div style={{ display:"flex", flexDirection:"column", gap:"18px" }}>
            {[
              { n:"1", title:"Upload your spreadsheets", body:"Drag in your flight manifest, hotel roster, and car transfers — Excel or CSV (.xlsx, .xls, .csv), any column names. GroupGrid auto-detects them." },
              { n:"2", title:"Run the cross-check", body:"GroupGrid matches every guest across all files by name and email, identifying mismatches, missing records, date gaps, and duplicates." },
              { n:"3", title:"See exactly what needs fixing", body:"Every flag is surfaced with context — who's affected, what the mismatch is, and how many days off. Resolve issues, add notes, and export a clean report." },
              { n:"4", title:"Share with your team or hotel", body:"Download an Excel file, generate a shareable HTML report, or draft emails directly to your hotel and travel agency contacts — all from the same screen." },
            ].map(({ n, title, body }) => (
              <div key={n} style={{ display:"flex", gap:"16px", alignItems:"flex-start" }}>
                <div style={{ width:32, height:32, borderRadius:"50%", background:P.navy, display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0, marginTop:"1px" }}>
                  <span style={{ fontSize:"15px", fontWeight:800, color:P.accent, fontFamily:font }}>{n}</span>
                </div>
                <div>
                  <div style={{ fontSize:"15px", fontWeight:700, color:P.navy, fontFamily:font, marginBottom:"4px" }}>{title}</div>
                  <div style={{ fontSize:"17px", color:P.grey600, fontFamily:font, lineHeight:1.7 }}>{body}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Privacy */}
        <div style={{ background:P.accentLight, border:`1.5px solid ${P.accent}44`, borderRadius:"14px", padding:"24px 28px", marginBottom:"32px" }}>
          <div style={{ display:"flex", alignItems:"center", gap:"10px", marginBottom:"8px" }}>
            <ShieldCheck size={18} strokeWidth={1.8} color={P.teal}/>
            <div style={{ fontSize:"15px", fontWeight:800, color:P.teal, fontFamily:font }}>Your guest files never leave your browser</div>
          </div>
          <div style={{ fontSize:"16px", color:P.grey600, fontFamily:font, lineHeight:1.7 }}>
            Your guest files — names, emails, flight details, hotel records — are read and processed entirely in your browser and are never uploaded to our servers. Account sign-in is handled securely through Supabase, a trusted third-party provider, and your saved projects are stored locally in your browser. The sensitive guest spreadsheet data itself stays in your browser.
          </div>
        </div>

        {/* Community */}
        <div style={{ background:P.white, border:`1.5px solid ${P.grey100}`, borderRadius:"14px", padding:"24px 28px", textAlign:"center" }}>
          <div style={{ fontSize:"15px", fontWeight:800, color:P.navy, fontFamily:font, marginBottom:"8px" }}>Part of the events community</div>
          <div style={{ fontSize:"16px", color:P.grey600, fontFamily:font, lineHeight:1.7, marginBottom:"16px" }}>
            GroupGrid is built by an active member of the event marketing community, including CEMA and PCMA. Have a question or want to connect? Reach out anytime.
          </div>
          <a href="mailto:hello@groupgrid.io" style={{ display:"inline-flex", alignItems:"center", gap:"8px", background:P.navy, borderRadius:"10px", padding:"10px 22px", fontSize:"15px", fontWeight:700, color:P.white, fontFamily:font, textDecoration:"none" }}>
            Get in touch →
          </a>
        </div>

      </div>
    </div>
  );
}

function ContactPage({ onBack, nav }) {
  return (
    <PageShell title="Contact Us" onBack={onBack} nav={nav}>
      <div style={{ marginBottom:"40px" }}>
        <h1 style={{ fontSize:"32px", fontWeight:700, color:P.navy, fontFamily:fontDisplay, margin:"0 0 12px", letterSpacing:"-0.03em" }}>Get in touch.</h1>
        <p style={{ fontSize:"17px", color:P.grey600, fontFamily:font, lineHeight:1.7, margin:0 }}>Have a question, found a bug, or want to share feedback? We'd love to hear from you.</p>
      </div>
      <div className="gg-card-grid-3" style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:"16px", marginBottom:"36px" }}>
        {[
          { Icon:Mail, label:"General Inquiries", value:"hello@groupgrid.io", href:"mailto:hello@groupgrid.io", color:P.periwinkleD, bg:P.grey50 },
          { Icon:CreditCard, label:"Billing & Pricing", value:"billing@groupgrid.io", href:"mailto:billing@groupgrid.io", color:P.teal, bg:P.tealLight },
          { Icon:AlertTriangle, label:"Bug Reports", value:"support@groupgrid.io", href:"mailto:support@groupgrid.io", color:P.red, bg:P.redLight },
          { Icon:Plus, label:"Feature Requests", value:"support@groupgrid.io", href:"mailto:support@groupgrid.io", color:P.accentD, bg:P.accentLight },
          { Icon:Users, label:"Partnerships", value:"hello@groupgrid.io", href:"mailto:hello@groupgrid.io", color:P.amber, bg:P.amberLight },
        ].map(({ Icon, label, value, href, color, bg }) => (
          <a key={label} href={href} style={{ display:"flex", alignItems:"center", gap:"14px", background:bg, border:`1.5px solid ${color}22`, borderRadius:"12px", padding:"18px 20px", textDecoration:"none" }}>
            <span style={{ display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}><Icon size={22} strokeWidth={1.8} color={color} /></span>
            <div>
              <div style={{ fontSize:"16px", fontWeight:700, color:P.grey600, fontFamily:font, textTransform:"uppercase", letterSpacing:"0.06em", marginBottom:"3px" }}>{label}</div>
              <div style={{ fontSize:"15px", fontWeight:600, color, fontFamily:font }}>{value}</div>
            </div>
          </a>
        ))}
      </div>
      <Section title="Response times">
        We aim to respond to all inquiries within 1–2 business days. For urgent event-day issues, include "URGENT" in your subject line and we'll prioritize your message.
      </Section>
      <Section title="About GroupGrid">
        GroupGrid is built for event and meeting planners who need to make sure everyone who registered for their event actually has the travel they need. It's a simple, fast tool: upload your registration list and travel files, and see every gap in minutes.
      </Section>
    </PageShell>
  );
}

function FAQPage({ onBack, nav }) {
  const faqs = [
    { q:"What does GroupGrid actually do?", a:"GroupGrid takes your event registration list and checks it against your travel files — flights, hotels, and car transfers. It tells you instantly who registered but isn't booked, who's booked but never registered, and whose dates don't match. What used to take days of manual spreadsheet cross-checking takes about a minute." },
    { q:"What files do I need?", a:"You need any two or more files to run a check — for example a registration list plus a hotel roster, or a flight manifest plus a hotel roster. Your registration list is recommended: when you add it, GroupGrid uses it as the source of truth and checks everything against it. You can also add car transfer and dietary files. Everything is standard Excel (.xlsx, .xls) or CSV format." },
    { q:"What if my spreadsheet columns are named differently?", a:"GroupGrid auto-detects common column names. Your \"Arrival Date\" and someone else's \"Arr. Date\" or \"Flight In\" all get recognized automatically. There's no manual mapping or setup required." },
    { q:"What if I don't have email addresses?", a:"GroupGrid matches people by email first for the most accurate results, then falls back to matching by name. Including an email column is best, but it's not required." },
    { q:"Is my data secure?", a:"Your guest files are read and processed entirely in your browser and are never uploaded to our servers. Account sign-in is handled securely through Supabase, a trusted third-party provider, and your saved projects are stored locally in your browser. The sensitive guest spreadsheet data itself stays in your browser." },
    { q:"Who is GroupGrid for?", a:"Any event or meeting planner who manages attendee travel, from a small board retreat to a large multi-day conference. If people are registering and you're booking their flights and hotels, GroupGrid makes sure the two lists match." },
    { q:"How much does it cost?", a:"$250/month for full access — unlimited events, unlimited guests, every feature. Create an account to get started." },
    { q:"Do I need to install anything?", a:"No. GroupGrid runs in your web browser. There's nothing to download or install." },
  ];
  return (
    <PageShell title="FAQ" onBack={onBack} nav={nav}>
      <div style={{ marginBottom:"32px" }}>
        <h1 style={{ fontSize:"32px", fontWeight:700, color:P.navy, fontFamily:fontDisplay, margin:"0 0 8px", letterSpacing:"-0.03em" }}>Frequently asked questions</h1>
        <p style={{ fontSize:"17px", color:P.grey600, fontFamily:font, lineHeight:1.7, margin:0 }}>Everything you need to know about how GroupGrid works.</p>
      </div>
      {faqs.map(({ q, a }) => (
        <div key={q} style={{ background:P.white, border:`1.5px solid ${P.grey100}`, borderRadius:"14px", padding:"22px 26px", marginBottom:"14px" }}>
          <div style={{ fontSize:"17px", fontWeight:800, color:P.navy, fontFamily:font, marginBottom:"8px", letterSpacing:"-0.01em" }}>{q}</div>
          <div style={{ fontSize:"16px", color:P.grey600, fontFamily:font, lineHeight:1.75 }}>{a}</div>
        </div>
      ))}
      <div style={{ marginTop:"24px", background:P.accentLight, border:`1.5px solid ${P.accent}44`, borderRadius:"14px", padding:"22px 26px", textAlign:"center" }}>
        <div style={{ fontSize:"15px", fontWeight:800, color:P.teal, fontFamily:font, marginBottom:"6px" }}>Still have a question?</div>
        <div style={{ fontSize:"17px", color:P.grey600, fontFamily:font }}>Email us at <a href="mailto:support@groupgrid.io" style={{ color:P.periwinkleD, fontWeight:700, textDecoration:"none" }}>support@groupgrid.io</a> and we'll get back to you within one business day.</div>
      </div>
    </PageShell>
  );
}

function PrivacyPage({ onBack, nav }) {
  return (
    <PageShell title="Privacy Policy" onBack={onBack} nav={nav}>
      <div style={{ marginBottom:"40px" }}>
        <h1 style={{ fontSize:"32px", fontWeight:700, color:P.navy, fontFamily:fontDisplay, margin:"0 0 8px", letterSpacing:"-0.03em" }}>Privacy Policy</h1>
        <p style={{ fontSize:"17px", color:P.grey600, fontFamily:font, margin:"0 0 16px" }}>Last updated: June 2026</p>
        <p style={{ fontSize:"17px", color:P.grey600, fontFamily:font, lineHeight:1.7, margin:0 }}>GroupGrid is built with privacy as a core design principle — not an afterthought. Here's exactly what we do and don't do with your data.</p>
      </div>
      <Section title="Data we collect">
        <strong>We never collect your guest data.</strong> GroupGrid processes all spreadsheet data entirely within your browser. Your guest names, emails, flight details, hotel records, and any other information in your uploaded files are never transmitted to our servers — we have no access to this data, ever. The limited personal data we do handle is: your account email address, for sign-in (via Supabase); the projects you choose to save, which are stored locally on your own device and not on our servers; and, if you join our early-access list, the email address you submit (via HubSpot, our email and CRM provider).
      </Section>
      <Section title="Saved projects & storage">
        Your saved projects — event names, notes, and resolved flags — are stored in your browser's local storage, on the device you are using. They are not uploaded to our servers and are not synced across devices or browsers: projects saved on one device will not appear on another, and clearing your browser storage will remove them. In all cases, your guest spreadsheet files are read and processed in your browser and are never uploaded to our servers. You can clear local data at any time by clearing your browser storage or using the app's built-in reset.
      </Section>
      <Section title="Cookies">
        GroupGrid does not use tracking cookies, advertising cookies, or any third-party analytics. We do not use Google Analytics, Meta Pixel, or similar tools.
      </Section>
      <Section title="Account data">
        To sign in, we collect your email address and a password, which are handled securely through Supabase, our third-party authentication and infrastructure provider. Passwords are stored in encrypted form by Supabase; we do not store them ourselves. Your saved projects are kept in your browser's local storage on your own device, not in your account. We never sell, rent, or share your personal information with third parties.
      </Section>
      <Section title="GDPR & CCPA">
        The personal data we hold is limited to your account email (via Supabase) and, if you have joined our early-access list, the email you submitted (via HubSpot). Your saved projects are stored locally on your own device, not on our servers. You have the right to access, export, and permanently delete your account-associated data upon request.
      </Section>
      <Section title="Third-party services">
        GroupGrid uses Supabase, a trusted third-party provider, for account authentication. Your saved projects are stored locally in your browser, not on Supabase. If you join our early-access list, the email address you submit is sent to HubSpot, our email and CRM provider, so we can contact you about early access; our signup form posts directly to HubSpot's API and does not load HubSpot's tracking script, so no HubSpot tracking cookie is set. Your guest spreadsheet files are never sent to Supabase, HubSpot, or any other service — they are processed only in your browser. External fonts (IBM Plex Sans and Poppins via Google Fonts) are loaded from Google's CDN, which is subject to Google's standard font API privacy policy. We use no advertising or analytics services.
      </Section>
      <Section title="Changes to this policy">
        We will notify users of any material changes to this policy via in-app notification and email. Continued use after notification constitutes acceptance of the updated policy.
      </Section>
      <Section title="Contact">
        Questions about privacy? Email us at <a href="mailto:privacy@groupgrid.io" style={{ color:P.periwinkleD, fontWeight:600 }}>privacy@groupgrid.io</a>.
      </Section>
    </PageShell>
  );
}

// ── Early-access capture ──────────────────────────────────────────────────────
// Renders our own branded UI and posts to the published HubSpot form, so none of
// HubSpot's styling or free-tier branding appears. IDs come from the form's
// submissions URL. To collect company + events-per-year, add matching fields in
// the HubSpot form editor, then set HS_ENABLE_QUALIFIERS true.
const HS_PORTAL_ID = "246592315";
const HS_FORM_GUID = "640bb175-27b8-4971-80ad-c5639a63dd6a";
const HS_SUBMIT_URL = `https://api.hsforms.com/submissions/v3/integration/submit/${HS_PORTAL_ID}/${HS_FORM_GUID}`;
const HS_ENABLE_QUALIFIERS = false;
const HS_PRIVACY_URL = "https://groupgrid.io/privacy";

function getCookie(name) {
  if (typeof document === "undefined") return undefined;
  const m = document.cookie.match("(^|;)\\s*" + name + "\\s*=\\s*([^;]+)");
  return m ? m.pop() : undefined;
}

function EarlyAccessForm() {
  const [email, setEmail] = useState("");
  const [company, setCompany] = useState("");
  const [eventsPerYear, setEventsPerYear] = useState("");
  const [status, setStatus] = useState("idle"); // idle | submitting | success | error
  const [errorMsg, setErrorMsg] = useState("");
  const [focused, setFocused] = useState(false);
  const [hovered, setHovered] = useState(false);

  const validEmail = v => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.trim());

  async function submit() {
    if (!validEmail(email)) { setStatus("error"); setErrorMsg("Enter a valid email so we can reach you."); return; }
    setStatus("submitting"); setErrorMsg("");
    const fields = [{ objectTypeId:"0-1", name:"email", value:email.trim() }];
    if (HS_ENABLE_QUALIFIERS) {
      if (company.trim()) fields.push({ objectTypeId:"0-1", name:"company", value:company.trim() });
      if (eventsPerYear) fields.push({ objectTypeId:"0-1", name:"events_per_year", value:eventsPerYear });
    }
    const ctx = { pageUri: typeof window!=="undefined"?window.location.href:"", pageName: typeof document!=="undefined"?document.title:"" };
    const hutk = getCookie("hubspotutk"); if (hutk) ctx.hutk = hutk;
    try {
      const res = await fetch(HS_SUBMIT_URL, { method:"POST", headers:{ "Content-Type":"application/json" }, body:JSON.stringify({ fields, context:ctx }) });
      if (res.ok) { setStatus("success"); return; }
      let detail = ""; try { const d = await res.json(); detail = (d.errors&&d.errors[0]&&d.errors[0].message)||d.message||""; } catch(_){}
      setStatus("error"); setErrorMsg(/email/i.test(detail) ? "That email looks invalid — mind double-checking it?" : "Something went wrong on our end. Please try again in a moment.");
    } catch(_) { setStatus("error"); setErrorMsg("We couldn't reach the server. Check your connection and try again."); }
  }
  const onKey = e => { if (e.key === "Enter") submit(); };

  const card = { boxSizing:"border-box", width:"100%", maxWidth:"440px", background:P.white, border:`1px solid ${P.grey100}`, borderRadius:"20px", padding:"32px 30px", fontFamily:font, boxShadow:"0 14px 40px rgba(12,30,63,0.10)" };
  const inputBase = { boxSizing:"border-box", width:"100%", padding:"12px 14px", fontSize:"15px", fontFamily:font, color:P.navy, background:P.white, borderRadius:"11px", outline:"none" };

  if (status === "success") {
    return (
      <div style={card}>
        <div style={{ width:44, height:44, borderRadius:12, background:P.accent, display:"flex", alignItems:"center", justifyContent:"center", marginBottom:16 }}>
          <span style={{ color:P.white, fontSize:22, fontWeight:800, lineHeight:1 }}>✓</span>
        </div>
        <h3 style={{ margin:"0 0 8px", fontFamily:fontDisplay, fontWeight:700, fontSize:22, color:P.navy }}>You're on the list</h3>
        <p style={{ margin:0, fontSize:15, lineHeight:1.55, color:P.grey600 }}>Thanks for signing up for early access to GroupGrid. We'll reach out as soon as your access is ready, with a quick guide to load your first event.</p>
      </div>
    );
  }
  return (
    <div style={card}>
      <div aria-hidden="true" style={{ display:"grid", gridTemplateColumns:"repeat(3, 7px)", gap:"5px", marginBottom:"18px" }}>
        {[0,1,2,3,4,5,6,7,8].map(i => <span key={i} style={{ width:7, height:7, borderRadius:2, background:i===4?P.accent:P.periwinkle, opacity:i===4?1:0.55 }} />)}
      </div>
      <h3 style={{ margin:"0 0 8px", fontFamily:fontDisplay, fontWeight:700, fontSize:24, lineHeight:1.2, color:P.navy }}>Get early access to GroupGrid</h3>
      <p style={{ margin:"0 0 22px", fontSize:15, lineHeight:1.55, color:P.grey600 }}>Catch travel and logistics issues before they reach your attendees. Join the list and we'll be in touch when your spot opens.</p>
      <label htmlFor="gg-ea-email" style={{ display:"block", fontSize:13, fontWeight:700, color:P.navyLight, marginBottom:6 }}>Work email</label>
      <input id="gg-ea-email" type="email" autoComplete="email" value={email} onKeyDown={onKey}
        onChange={e => { setEmail(e.target.value); if (status==="error") { setStatus("idle"); setErrorMsg(""); } }}
        onFocus={() => setFocused(true)} onBlur={() => setFocused(false)} placeholder="you@company.com"
        style={{ ...inputBase, border:`1.5px solid ${status==="error"?P.red:focused?P.accent:P.grey200}`, transition:"border-color 0.15s" }} />
      {HS_ENABLE_QUALIFIERS && (
        <div style={{ marginTop:14 }}>
          <label htmlFor="gg-ea-company" style={{ display:"block", fontSize:13, fontWeight:700, color:P.navyLight, marginBottom:6 }}>Company</label>
          <input id="gg-ea-company" type="text" value={company} onChange={e => setCompany(e.target.value)} onKeyDown={onKey} placeholder="Where you run events" style={{ ...inputBase, border:`1.5px solid ${P.grey200}` }} />
          <label htmlFor="gg-ea-events" style={{ display:"block", fontSize:13, fontWeight:700, color:P.navyLight, margin:"14px 0 6px" }}>Events per year</label>
          <select id="gg-ea-events" value={eventsPerYear} onChange={e => setEventsPerYear(e.target.value)} style={{ ...inputBase, color:eventsPerYear?P.navy:P.grey600, border:`1.5px solid ${P.grey200}` }}>
            <option value="">Select a range</option>
            <option value="1-5">1 to 5</option>
            <option value="6-15">6 to 15</option>
            <option value="16-50">16 to 50</option>
            <option value="50+">50+</option>
          </select>
        </div>
      )}
      {status === "error" && <p role="alert" style={{ margin:"10px 0 0", fontSize:13, fontWeight:600, color:P.red }}>{errorMsg}</p>}
      <button type="button" onClick={submit} disabled={status==="submitting"}
        onMouseEnter={() => setHovered(true)} onMouseLeave={() => setHovered(false)}
        style={{ width:"100%", marginTop:18, padding:"13px 16px", fontSize:15, fontWeight:700, fontFamily:font, color:P.white, background:status==="submitting"?P.navyLight:hovered?P.accentD:P.accent, border:"none", borderRadius:11, cursor:status==="submitting"?"default":"pointer", transition:"background 0.15s" }}>
        {status === "submitting" ? "Joining…" : "Get early access"}
      </button>
      <p style={{ margin:"14px 0 0", fontSize:12, lineHeight:1.5, color:P.grey600, textAlign:"center" }}>We respect your privacy. <a href={HS_PRIVACY_URL} style={{ color:P.navyLight, textDecoration:"underline" }}>Privacy</a></p>
    </div>
  );
}

// ── Landing Page ──────────────────────────────────────────────────────────────
function LandingPage({ onEnter, onPricing, onAbout, onContact, onPrivacy, onTerms, onFaq }) {

  const problems = [
    { time:"Day 1", label:"You export your registration list", sub:"Everyone who signed up, names, dates, requests", color:P.navy, Icon:SpreadsheetIcon },
    { time:"Day 3", label:"Flight manifest arrives", sub:"280 names — different format, different spelling", color:P.accentD, Icon:PlaneIcon },
    { time:"Day 7", label:"Hotel roster comes in separately", sub:"294 rooms — do they all match who registered?", color:P.navy, Icon:HotelIcon },
    { time:"Day 14", label:"You're still cross-checking", sub:"VLOOKUPs, filters, manual row-by-row scanning…", color:P.accentD, Icon:MagnifierIcon },
  ];

  const eventTypes = [
    "Sales Kickoffs","Board Retreats","Tradeshows","Healthcare Meetings",
    "Conferences","Advisory Boards","Executive Roundtables","Field Marketing",
    "Corporate Events","Association Meetings","Event Agencies","Global Programs",
  ];

  const steps = [
    { n:"01", icon:"upload", box:P.accentD, title:"Upload your registration list", body:"Start with your master list of who registered — the source of truth. Then add your travel files: flight manifest, hotel roster, car transfers. Excel or CSV (.xlsx, .xls, .csv), any column names — GroupGrid figures it out." },
    { n:"02", icon:"crosscheck", box:P.navyLight, title:"Run the check", body:"In seconds, GroupGrid matches every registered person against the travel files by email, then name. It finds who registered but isn't booked, who's booked but never registered, and whose dates don't match." },
    { n:"03", icon:"magnifier", box:P.accentD, title:"See exactly what needs fixing", body:"Each flag shows who's affected and what's wrong — registered with no flight, hotel booked for someone not on the list, check-in dates that don't match what they requested. Resolve, add notes, mark done." },
    { n:"04", icon:"spreadsheet", box:P.navyLight, title:"Communicate & export", body:"Draft emails to your hotel or travel agency, download a clean Excel report, or generate a shareable HTML report — all without leaving GroupGrid." },
  ];

  // Testimonials removed — placeholder quotes taken down. Add real, attributed quotes here when available.

  return (
    <div style={{ minHeight:"100vh", fontFamily:font, background:P.white, WebkitFontSmoothing:"antialiased" }}>
      <link href="https://fonts.googleapis.com/css2?family=IBM+Plex+Sans:wght@400;500;600;700&family=Poppins:wght@500;600;700&display=swap" rel="stylesheet" />

      {/* ── Nav ── */}
      <nav className="gg-landing-nav" style={{ background:P.navy, height:"64px", padding:"0 40px", display:"flex", alignItems:"center", justifyContent:"space-between", position:"sticky", top:0, zIndex:100, boxShadow:"0 1px 0 rgba(255,255,255,0.06)" }}>
        <div className="gg-landing-logo" style={{ display:"flex", alignItems:"center", gap:"10px" }}>
          <BrandLogo height={40} onDark={true} />
        </div>
        <div style={{ display:"flex", alignItems:"center", gap:"28px" }}>
          <div className="gg-landing-navlinks" style={{ display:"flex", alignItems:"center", gap:"28px" }}>
            <button onClick={onAbout} style={{ background:"none", border:"none", fontSize:"15px", fontWeight:600, color:"rgba(255,255,255,0.6)", fontFamily:font, cursor:"pointer" }}>About</button>
            <button onClick={onFaq} style={{ background:"none", border:"none", fontSize:"15px", fontWeight:600, color:"rgba(255,255,255,0.6)", fontFamily:font, cursor:"pointer" }}>FAQ</button>
            <button onClick={onPricing} style={{ background:"none", border:"none", fontSize:"15px", fontWeight:600, color:"rgba(255,255,255,0.6)", fontFamily:font, cursor:"pointer" }}>Pricing</button>
          </div>
          <button onClick={onEnter} style={{ background:P.accent, border:"none", borderRadius:"8px", padding:"8px 18px", fontSize:"15px", fontWeight:700, color:P.white, fontFamily:font, cursor:"pointer", boxShadow:"0 2px 12px rgba(0,201,177,0.35)", whiteSpace:"nowrap", flexShrink:0 }}>Open App →</button>
        </div>
      </nav>

      {/* ── Hero ── */}
      <div style={{ background:`linear-gradient(170deg, ${P.navy} 0%, #0D1E40 60%, #0A1628 100%)`, padding:"96px 40px 80px", position:"relative", overflow:"hidden" }}>
        {/* bg glow orbs */}
        <div style={{ position:"absolute", top:-100, right:-100, width:500, height:500, borderRadius:"50%", background:`radial-gradient(circle, ${P.accent}12, transparent 65%)`, pointerEvents:"none" }} />
        <div style={{ position:"absolute", bottom:-80, left:-60, width:400, height:400, borderRadius:"50%", background:`radial-gradient(circle, ${P.periwinkleD}15, transparent 65%)`, pointerEvents:"none" }} />
        {/* dot grid — all teal dots, fading to grey toward upper-right */}
        <svg style={{ position:"absolute", bottom:"40px", right:"0", pointerEvents:"none", width:"65%", height:"100%", minWidth:"500px" }} viewBox="0 0 1000 600" preserveAspectRatio="xMaxYMax meet" xmlns="http://www.w3.org/2000/svg">
          <defs>
            {/* Fade: bottom-left = full teal, top-right = dim grey */}
            <linearGradient id="heroDotFade" x1="100%" y1="100%" x2="0%" y2="0%">
              <stop offset="0%"   stopColor="white" stopOpacity="1"/>
              <stop offset="60%"  stopColor="white" stopOpacity="0.5"/>
              <stop offset="100%" stopColor="white" stopOpacity="0.08"/>
            </linearGradient>
            <mask id="heroDotMask">
              <rect width="1000" height="600" fill="url(#heroDotFade)"/>
            </mask>
          </defs>
          <g mask="url(#heroDotMask)">
            {/* 4 rows × 4 cols — all teal, evenly spaced, bottom-right anchor */}
            {/* Cols: 280, 520, 760, 1000 — Rows: 20, 207, 393, 580 */}
            {[20, 207, 393, 580].map((cy, row) =>
              [280, 520, 760, 1000].map((cx, col) => (
                <circle key={`${row}-${col}`} cx={cx} cy={cy} r="18" fill="#00C9B1"/>
              ))
            )}
          </g>
        </svg>

        <div style={{ maxWidth:"1100px", margin:"0 auto", display:"flex", alignItems:"flex-start", gap:"64px", flexWrap:"wrap" }}>
          {/* Left copy */}
          <div style={{ flex:1, minWidth:"320px" }}>

            <div style={{ margin:"0 0 24px" }}>
              <div style={{ display:"flex", flexDirection:"column", gap:"10px" }}>
                {[
                  { label:"Registered",     status:"check" },
                  { label:"Flight booked",   status:"check" },
                  { label:"Hotel booked",    status:"check" },
                  { label:"Dates match",     status:"error" },
                ].map(({ label, status }) => (
                  <div key={label} style={{ display:"flex", alignItems:"center", gap:"14px" }}>
                    <div style={{
                      width: 32, height: 32, borderRadius:"8px", flexShrink:0,
                      background: status === "check" ? "rgba(0,201,177,0.15)" : "rgba(220,50,50,0.2)",
                      border: `1.5px solid ${status === "check" ? "rgba(0,201,177,0.4)" : "rgba(220,50,50,0.5)"}`,
                      display:"flex", alignItems:"center", justifyContent:"center",
                      fontSize:"16px", fontWeight:900,
                    }}>
                      {status === "check"
                        ? <Check size={16} strokeWidth={3} color="#00C9B1"/>
                        : <X size={16} strokeWidth={3} color="#FF5252"/>}
                    </div>
                    <span style={{
                      fontSize:"clamp(22px, 3.5vw, 36px)",
                      fontWeight: 900,
                      fontFamily: font,
                      letterSpacing:"-0.04em",
                      lineHeight: 1,
                      color: status === "check" ? "rgba(255,255,255,0.85)" : "#FF5252",
                      textDecoration: status === "error" ? "none" : "none",
                    }}>{label}{status === "error" ? " ✗" : ""}</span>
                  </div>
                ))}
              </div>
            </div>
            <h1 style={{ fontSize:"clamp(28px, 4.5vw, 44px)", fontWeight:700, color:P.white, fontFamily:fontDisplay, lineHeight:1.1, margin:"0 0 18px", maxWidth:"540px", letterSpacing:"-0.035em" }}>
              Your attendees registered.<br/><span style={{ color:P.accent }}>But did they book their travel?</span>
            </h1>
            <p style={{ fontSize:"18px", color:"rgba(255,255,255,0.6)", fontFamily:font, lineHeight:1.75, margin:"0 0 12px", maxWidth:"520px" }}>
              When you're managing group travel for attendees who need flights, hotels, and car transfers, the mistakes are easy to miss.
            </p>
            <p style={{ fontSize:"18px", color:"rgba(255,255,255,0.85)", fontFamily:font, lineHeight:1.75, margin:"0 0 36px", maxWidth:"520px", fontWeight:600 }}>
              GroupGrid catches them early, saving you thousands of dollars and hours, and saving you and your attendees from mismatched travel dates and <span style={{ color:P.red }}>red flags.</span>
            </p>
            <div style={{ display:"flex", gap:"12px", flexWrap:"wrap", alignItems:"center" }}>
              <button onClick={onEnter} style={{ background:`linear-gradient(135deg, ${P.accent}, ${P.accentD})`, border:"none", borderRadius:"12px", padding:"14px 32px", fontSize:"16px", fontWeight:800, color:P.white, fontFamily:font, cursor:"pointer", boxShadow:"0 4px 20px rgba(0,201,177,0.4)", letterSpacing:"-0.02em" }}>
                Open GroupGrid →
              </button>
              <button onClick={onPricing} style={{ background:"rgba(255,255,255,0.07)", border:"1px solid rgba(255,255,255,0.15)", borderRadius:"12px", padding:"14px 24px", fontSize:"15px", fontWeight:600, color:"rgba(255,255,255,0.75)", fontFamily:font, cursor:"pointer" }}>
                See pricing
              </button>
            </div>
          </div>

          {/* Right — live mismatch demo card */}
          <div className="gg-hero-card" style={{ flexShrink:0, width:"340px", background:"rgba(255,255,255,0.04)", border:"1px solid rgba(255,255,255,0.1)", borderRadius:"20px", overflow:"hidden", backdropFilter:"blur(10px)" }}>
            <div style={{ background:"rgba(0,0,0,0.2)", padding:"12px 16px", display:"flex", alignItems:"center", gap:"8px", borderBottom:"1px solid rgba(255,255,255,0.07)" }}>
              <div style={{ display:"flex", gap:"5px" }}>
                {["#FF5F57","#FFBD2E","#28C840"].map(c => <div key={c} style={{ width:10, height:10, borderRadius:"50%", background:c }} />)}
              </div>
              <span style={{ fontSize:"15px", color:"rgba(255,255,255,0.35)", fontFamily:font, fontWeight:600 }}>GroupGrid — Annual Sales Summit 2025</span>
            </div>
            <div style={{ padding:"16px" }}>
              <div style={{ fontSize:"15px", fontWeight:700, color:"rgba(255,255,255,0.35)", fontFamily:font, letterSpacing:"0.08em", textTransform:"uppercase", marginBottom:"10px" }}>Cross-check complete · 300 reviewed · <span style={{ color:"#FF8A80" }}>4 need action</span></div>
              {[
                { name:"Sarah Solomon", issue:"Registered but no flight booked", type:"error", badge:"No Flight" },
                { name:"Marcus Williams", issue:"Has a hotel room but never registered", type:"error", badge:"Not Registered" },
                { name:"Jennifer Park", issue:"Requested check-in Dec 4 · hotel booked Dec 5", type:"warn", badge:"Date Mismatch" },
                { name:"David Chen", issue:"Registered but no hotel booked", type:"error", badge:"No Hotel" },
              ].map(({ name, issue, type, badge }) => (
                <div key={name} style={{ background: type==="error" ? "rgba(192,57,43,0.15)" : "rgba(201,122,10,0.15)", border:`1px solid ${type==="error" ? "rgba(192,57,43,0.3)" : "rgba(201,122,10,0.3)"}`, borderRadius:"10px", padding:"12px 14px", marginBottom:"8px" }}>
                  <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:"4px" }}>
                    <span style={{ fontSize:"15px", fontWeight:700, color:P.white, fontFamily:font }}>{name}</span>
                    <span style={{ fontSize:"15px", fontWeight:800, color: type==="error" ? "#FF8A80" : "#FFD54F", background: type==="error" ? "rgba(192,57,43,0.3)" : "rgba(201,122,10,0.3)", padding:"2px 8px", borderRadius:"20px", fontFamily:font }}>{badge}</span>
                  </div>
                  <div style={{ fontSize:"15px", color:"rgba(255,255,255,0.5)", fontFamily:font, lineHeight:1.5 }}>{issue}</div>
                </div>
              ))}
              <div style={{ marginTop:"12px", background:"rgba(0,201,177,0.1)", border:"1px solid rgba(0,201,177,0.2)", borderRadius:"8px", padding:"10px 12px", display:"flex", alignItems:"center", gap:"8px" }}>
                <Check size={14} strokeWidth={2.5} color={P.accent} style={{flexShrink:0}}/>
                <span style={{ fontSize:"15px", color:"rgba(255,255,255,0.6)", fontFamily:font }}>296 registered guests fully booked · <span style={{ color:P.accent, fontWeight:700 }}>✓ No action needed</span></span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── Problem section ── */}
      <div style={{ background:"#F0F2F7", padding:"80px 40px", borderBottom:`1px solid ${P.grey100}` }}>
        <div style={{ maxWidth:"1000px", margin:"0 auto" }}>
          <div style={{ textAlign:"center", marginBottom:"56px" }}>
            <div style={{ fontSize:"15px", fontWeight:800, color:P.periwinkleD, fontFamily:font, letterSpacing:"0.1em", textTransform:"uppercase", marginBottom:"12px" }}>SOUND FAMILIAR?</div>
            <h2 style={{ fontSize:"clamp(30px, 5vw, 44px)", fontWeight:700, color:P.navy, fontFamily:fontDisplay, margin:"0 0 16px", letterSpacing:"-0.035em", lineHeight:1.1 }}>
              Event Data Shouldn&rsquo;t<br/>Need a Detective.
            </h2>
            <p style={{ fontSize:"17px", color:P.grey600, fontFamily:font, lineHeight:1.7, maxWidth:"560px", margin:"0 auto" }}>
              When attendee information lives in separate spreadsheets, mistakes are inevitable. Keep registrations, travel, and accommodations connected in one place.
            </p>
          </div>
          <div className="gg-timeline-grid" style={{ display:"grid", gridTemplateColumns:"repeat(4,1fr)", gap:"16px", marginBottom:"40px" }}>
            {problems.map(({ time, label, sub, color, bg, Icon }, i) => (
              <div key={time} className="gg-timeline-card" style={{ background:P.white, border:`1.5px solid ${P.grey100}`, borderRadius:"16px", padding:"24px", position:"relative", overflow:"visible", boxShadow:"0 1px 3px rgba(12,30,63,0.04)" }}>
                <div style={{ width:"44px", height:"44px", borderRadius:"12px", background:color, display:"flex", alignItems:"center", justifyContent:"center", marginBottom:"16px" }}>{Icon && <Icon size={22} line="rgba(255,255,255,0.95)" accent={P.white} />}</div>
                <div style={{ fontSize:"15px", fontWeight:800, color, fontFamily:font, letterSpacing:"0.08em", textTransform:"uppercase", marginBottom:"8px" }}>{time}</div>
                <div style={{ fontSize:"16px", fontWeight:700, color:P.navy, fontFamily:fontDisplay, marginBottom:"8px", lineHeight:1.3, letterSpacing:"-0.01em" }}>{label}</div>
                <div style={{ fontSize:"16px", color:P.grey600, fontFamily:font, lineHeight:1.6 }}>{sub}</div>
                {i < 3 && <div className="gg-timeline-arrow" style={{ position:"absolute", top:"50%", right:"-12px", transform:"translateY(-50%)", fontSize:"16px", color:P.grey200, zIndex:2 }}>→</div>}
              </div>
            ))}
          </div>
          <div style={{ background:P.navy, borderRadius:"16px", padding:"22px 28px", display:"flex", alignItems:"center", gap:"18px" }}>
            <div style={{ width:46, height:46, borderRadius:"12px", background:P.navyLight, display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}><AlertIcon size={24} line="rgba(255,255,255,0.95)" accent={P.amber} /></div>
            <div>
              <div style={{ fontSize:"15px", fontWeight:700, color:P.white, fontFamily:fontDisplay, marginBottom:"5px", letterSpacing:"-0.01em" }}>Meanwhile, your event is in <span style={{ color:P.amber }}>3 days</span></div>
              <div style={{ fontSize:"15px", color:"rgba(255,255,255,0.62)", fontFamily:font, lineHeight:1.65 }}>You've checked the lists more than once, and they look right. But the person who registered late and never booked a flight, the hotel room held for someone who isn't on your list, the name spelled two different ways: those are the ones that surface at check-in.</div>
            </div>
          </div>
        </div>
      </div>

      {/* ── Solution ── */}
      <div style={{ background:P.white, padding:"80px 40px", borderBottom:`1px solid ${P.grey100}` }}>
        <div style={{ maxWidth:"1000px", margin:"0 auto" }}>
          <div style={{ textAlign:"center", marginBottom:"56px" }}>
            <div style={{ fontSize:"15px", fontWeight:800, color:P.accent, fontFamily:font, letterSpacing:"0.1em", textTransform:"uppercase", marginBottom:"12px" }}>THE GROUPGRID WAY</div>
            <h2 style={{ fontSize:"clamp(30px, 5vw, 44px)", fontWeight:700, color:P.navy, fontFamily:fontDisplay, margin:"0 0 16px", letterSpacing:"-0.035em", lineHeight:1.1 }}>
              Days of work.<br/><span style={{ color:P.accent }}>Done in minutes.</span>
            </h2>
            <p style={{ fontSize:"17px", color:P.grey600, fontFamily:font, lineHeight:1.7, maxWidth:"520px", margin:"0 auto" }}>
              Upload your registration list and your travel files, run the check, see every gap instantly — then communicate fixes directly to your hotel and travel agency without switching tabs.
            </p>
          </div>
          <div className="gg-card-grid-3" style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:"20px" }}>
            {steps.map(({ n, icon, box, title, body }) => {
              const StepIcon = { upload:UploadIcon, crosscheck:CrossCheckIcon, magnifier:MagnifierIcon, spreadsheet:SpreadsheetIcon }[icon];
              const iconAccent = box === P.accentD ? P.white : P.accent; // teal accent vanishes on a teal box, so go white there
              return (
              <div key={n} style={{ background:P.navy, borderRadius:"16px", padding:"28px 28px" }}>
                <div style={{ display:"flex", alignItems:"center", gap:"12px", marginBottom:"14px" }}>
                  <div style={{ width:44, height:44, borderRadius:"12px", background:box, display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}>{StepIcon && <StepIcon size={22} line="rgba(255,255,255,0.95)" accent={iconAccent} />}</div>
                  <div>
                    <div style={{ fontSize:"16px", fontWeight:700, color:P.white, fontFamily:fontDisplay, letterSpacing:"-0.015em" }}>{title}</div>
                  </div>
                </div>
                <div style={{ fontSize:"15px", color:"rgba(255,255,255,0.62)", fontFamily:font, lineHeight:1.75 }}>{body}</div>
              </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* ── What it catches ── */}
      <div style={{ background:"#F0F2F7", padding:"80px 40px", borderBottom:`1px solid ${P.grey100}` }}>
        <div style={{ maxWidth:"1000px", margin:"0 auto" }}>
          <div style={{ textAlign:"center", marginBottom:"48px" }}>
            <div style={{ fontSize:"15px", fontWeight:800, color:P.accent, fontFamily:font, letterSpacing:"0.1em", textTransform:"uppercase", marginBottom:"12px" }}>WHAT GROUPGRID CATCHES</div>
            <h2 style={{ fontSize:"clamp(28px, 4.5vw, 42px)", fontWeight:700, color:P.navy, fontFamily:fontDisplay, margin:"0 0 14px", letterSpacing:"-0.035em", lineHeight:1.1 }}>
              The gaps that cause<br/><span style={{ color:P.accent }}>day-of disasters.</span>
            </h2>
            <p style={{ fontSize:"17px", color:P.grey600, fontFamily:font, lineHeight:1.7, maxWidth:"520px", margin:"0 auto" }}>
              Add your registration list and GroupGrid checks it against every travel file, person by person.
            </p>
          </div>
          <div className="gg-card-grid-3" style={{ display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:"16px" }}>
            {[
              { Icon:PlaneIcon, box:P.navy, title:"Registered, but no flight", body:"See everyone who signed up for your event but doesn't have a flight booked yet." },
              { Icon:HotelIcon, box:P.accentD, title:"Registered, but no hotel", body:"Spot registered attendees who have travel but no hotel room reserved." },
              { Icon:FlagIcon, box:P.navy, title:"Booked, but not registered", body:"Find flights or hotel rooms booked for people who never registered — often the costliest gap to miss." },
              { Icon:CalendarIcon, box:P.accentD, title:"Dates that don't match", body:"Catch when a hotel check-in or flight date doesn't match what the person requested at registration." },
              { Icon:CarIcon, box:P.navy, title:"Missing transfers", body:"Flag car bookings that don't line up with anyone's flight or registration." },
              { Icon:PeopleIcon, box:P.accentD, title:"Duplicates", body:"The same person registered or booked twice across your files, before it becomes a double charge." },
            ].map(({ Icon, box, title, body }) => {
              const iconAccent = box === P.accentD ? P.white : P.accent;
              return (
              <div key={title} style={{ background:P.white, border:`1.5px solid ${P.grey100}`, borderRadius:"14px", padding:"24px 22px" }}>
                <div style={{ width:46, height:46, borderRadius:"12px", background:box, display:"flex", alignItems:"center", justifyContent:"center", marginBottom:"14px" }}><Icon size={24} line="rgba(255,255,255,0.95)" accent={iconAccent} /></div>
                <div style={{ fontSize:"16px", fontWeight:800, color:P.navy, fontFamily:font, marginBottom:"6px", letterSpacing:"-0.02em" }}>{title}</div>
                <div style={{ fontSize:"17px", color:P.grey600, fontFamily:font, lineHeight:1.65 }}>{body}</div>
              </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* ── Use cases ── */}
      <div style={{ background:P.white, padding:"80px 40px", borderBottom:`1px solid ${P.grey100}` }}>
        <div style={{ maxWidth:"1000px", margin:"0 auto", textAlign:"center" }}>
          <div style={{ fontSize:"15px", fontWeight:800, color:P.navy, fontFamily:font, letterSpacing:"0.1em", textTransform:"uppercase", marginBottom:"12px" }}>WHO IT'S FOR</div>
          <h2 style={{ fontSize:"clamp(28px, 4.5vw, 42px)", fontWeight:700, color:P.navy, fontFamily:fontDisplay, margin:"0 0 12px", letterSpacing:"-0.035em", lineHeight:1.1 }}>
            Built for event planners<br/><span style={{ color:P.accent }}>running events of any size</span>
          </h2>
          <p style={{ fontSize:"17px", color:P.grey600, fontFamily:font, lineHeight:1.7, maxWidth:"520px", margin:"0 auto 40px" }}>
            Anywhere you need to make sure attendees arrive on time, have a confirmed room, and won't be stranded at the wrong airport.
          </p>
          <div style={{ display:"flex", flexWrap:"wrap", gap:"10px", justifyContent:"center", marginBottom:"48px" }}>
            {eventTypes.map(tag => (
              <span key={tag} style={{ background:P.white, border:`1.5px solid ${P.grey100}`, borderRadius:"20px", padding:"8px 18px", fontSize:"15px", fontWeight:600, color:P.navy, fontFamily:font, boxShadow:"0 1px 4px rgba(15,29,53,0.06)" }}>{tag}</span>
            ))}
          </div>
        </div>
      </div>

      {/* ── Value band (testimonials to be added once real) ── */}
      <div style={{ background:`linear-gradient(160deg, ${P.navy} 0%, ${P.navyLight} 100%)`, padding:"80px 40px", borderBottom:`1px solid ${P.grey100}` }}>
        <div style={{ maxWidth:"880px", margin:"0 auto", textAlign:"center" }}>
          <div style={{ fontSize:"15px", fontWeight:800, color:P.accent, fontFamily:font, letterSpacing:"0.1em", textTransform:"uppercase", marginBottom:"16px" }}>WHY PLANNERS USE IT</div>
          <h2 style={{ fontSize:"clamp(26px, 4vw, 38px)", fontWeight:700, color:P.white, fontFamily:fontDisplay, margin:"0 0 20px", letterSpacing:"-0.035em", lineHeight:1.15 }}>
            The check that used to take days,<br/>done before your coffee gets cold.
          </h2>
          <p style={{ fontSize:"17px", color:"rgba(255,255,255,0.65)", fontFamily:font, lineHeight:1.7, maxWidth:"600px", margin:"0 auto" }}>
            The late registrant with no flight, the room booked for a no-show, the date that's one day off — surfaced automatically, so you can fix them before they become day-of surprises.
          </p>
        </div>
      </div>

      {/* ── Animated Demo ── */}
      {(() => {
        const [demoPhase, setDemoPhase] = React.useState("idle"); // idle | loading | checking | results
        const [filesLoaded, setFilesLoaded] = React.useState([false,false,false,false,false]);
        const [checkPct, setCheckPct]   = React.useState(0);
        const [rowsVisible, setRowsVisible] = React.useState(0);
        const [expandedRow, setExpandedRow] = React.useState(null);

        const demoGuests = [
          { key:"sc",  first:"Sarah",   last:"Solomon",   email:"s.solomon@corp.com", status:"error", arrDiff:"—",   depDiff:"—",   issues:["Registered but no flight booked"],
            reg:{ checkIn:"Dec 4", checkOut:"Dec 7" }, flight:null, hotel:{ in:"Dec 4", out:"Dec 7", name:"Marriott Marquis" }, car:null },
          { key:"mw",  first:"Marcus",  last:"Williams",  email:"m.williams@corp.com", status:"error", arrDiff:"—",   depDiff:"—",   issues:["Has a hotel room but never registered"],
            reg:null, flight:{ arr:"Dec 5", dep:"Dec 8", num:"DL 441" },  hotel:{ in:"Dec 5", out:"Dec 8", name:"Westin St. Francis" }, car:{ pickup:"Dec 5", loc:"LAX" } },
          { key:"jp",  first:"Jennifer",last:"Park",      email:"j.park@corp.com",     status:"warn",  arrDiff:"+1d", depDiff:"0",   issues:["Requested check-in Dec 4 · hotel booked Dec 5"],
            reg:{ checkIn:"Dec 4", checkOut:"Dec 8" }, flight:{ arr:"Dec 5", dep:"Dec 8", num:"AA 109" },  hotel:{ in:"Dec 5", out:"Dec 8", name:"Hilton Union Sq" }, car:{ pickup:"Dec 5", loc:"SFO" } },
          { key:"dc",  first:"David",   last:"Chen",      email:"d.chen@corp.com",     status:"error", arrDiff:"—",   depDiff:"—",   issues:["Registered but no hotel booked"],
            reg:{ checkIn:"Dec 5", checkOut:"Dec 8" }, flight:{ arr:"Dec 5", dep:"Dec 8", num:"SW 884" },  hotel:null, car:null },
          { key:"ps",  first:"Priya",   last:"Sharma",    email:"p.sharma@corp.com",   status:"ok",    arrDiff:"0",   depDiff:"0",   issues:[],
            reg:{ checkIn:"Dec 4", checkOut:"Dec 7" }, flight:{ arr:"Dec 4", dep:"Dec 7", num:"UA 332" },  hotel:{ in:"Dec 4", out:"Dec 7", name:"Hilton Union Sq" }, car:{ pickup:"Dec 4", loc:"SFO" } },
          { key:"jm",  first:"James",   last:"Mitchell",  email:"j.mitchell@corp.com", status:"ok",    arrDiff:"0",   depDiff:"0",   issues:[],
            reg:{ checkIn:"Dec 5", checkOut:"Dec 8" }, flight:{ arr:"Dec 5", dep:"Dec 8", num:"AA 771" },  hotel:{ in:"Dec 5", out:"Dec 8", name:"Grand Hyatt" }, car:{ pickup:"Dec 5", loc:"OAK" } },
        ];

        const statusColor = s => s==="error" ? P.red : s==="warn" ? P.amber : P.green;
        const statusBg    = s => s==="error" ? P.redLight : s==="warn" ? P.amberLight : P.greenLight;
        const statusLabel = s => s==="error" ? "Flag" : s==="warn" ? "Review" : "OK";
        // Shared column layout + per-column alignment so the header and every row line up cleanly.
        const demoCols = "minmax(60px,0.8fr) minmax(74px,0.9fr) minmax(150px,1.7fr) 100px 78px 78px 66px";
        const demoJustify = ["start","start","stretch","center","center","center","end"];

        const fileInfo = [
          { label:"Registration List", color:"#00A896", Icon:PeopleIcon, sub:"event_registration.xlsx" },
          { label:"Flight Manifest", color:"#4F8EF7", Icon:PlaneIcon, sub:"flight_manifest_dec.xlsx" },
          { label:"Hotel Roster",    color:"#C97A0A", Icon:HotelIcon, sub:"hotel_roster_marriott.xlsx" },
          { label:"Car Transfers",   color:"#6B3FA0", Icon:CarIcon, sub:"car_transfers_sfo.xlsx" },
          ...(SHOW_DIETARY?[{ label:"Dietary & Access",color:P.teal, Icon:Salad, sub:"dietary_requirements.xlsx" }]:[]),
        ];

        const runDemo = () => {
          if (demoPhase !== "idle" && demoPhase !== "results") return;
          setDemoPhase("loading"); setFilesLoaded([false,false,false,false,false]);
          setCheckPct(0); setRowsVisible(0); setExpandedRow(null);

          [350,700,1050,1400,1750].forEach((t,i) =>
            setTimeout(() => setFilesLoaded(p => { const n=[...p]; n[i]=true; return n; }), t)
          );
          setTimeout(() => setDemoPhase("checking"), 2200);
          [8,22,37,51,65,78,90,100].forEach((v,i) =>
            setTimeout(() => setCheckPct(v), 2100 + i*200)
          );
          for (let i=0; i<demoGuests.length; i++)
            setTimeout(() => setRowsVisible(i+1), 3900 + i*260);
          setTimeout(() => setDemoPhase("results"), 3900 + demoGuests.length*260);
        };

        return (
          <div style={{ background:"#F0F2F7", padding:"80px 40px", borderBottom:`1px solid ${P.grey100}` }}>
            <style>{`
              @keyframes ggIn { from { opacity:0; transform:translateY(8px); } to { opacity:1; transform:translateY(0); } }
              @keyframes ggPulse { 0%,100%{opacity:.45} 50%{opacity:1} }
            `}</style>

            <div style={{ maxWidth:"1000px", margin:"0 auto" }}>
              {/* Header */}
              <div style={{ textAlign:"center", marginBottom:"48px" }}>
                <div style={{ fontSize:"15px", fontWeight:800, color:P.accent, fontFamily:font, letterSpacing:"0.1em", textTransform:"uppercase", marginBottom:"12px" }}>SEE IT IN ACTION</div>
                <h2 style={{ fontSize:"clamp(28px, 4.5vw, 42px)", fontWeight:700, color:P.navy, fontFamily:fontDisplay, margin:"0 0 14px", letterSpacing:"-0.035em", lineHeight:1.1 }}>
                  From files to flags<br/><span style={{ color:P.accent }}>in minutes, not days.</span>
                </h2>
                <p style={{ fontSize:"17px", color:P.grey600, fontFamily:font, lineHeight:1.7, maxWidth:"460px", margin:"0 auto" }}>
                  Watch GroupGrid check your full registration list against the travel files and surface every gap instantly.
                </p>
              </div>

              {/* Browser window */}
              <div style={{ background:P.white, borderRadius:"20px", boxShadow:"0 8px 48px rgba(15,29,53,0.13)", overflow:"hidden", border:`1px solid ${P.grey100}` }}>

                {/* Chrome bar */}
                <div style={{ background:P.navy, padding:"11px 18px", display:"flex", alignItems:"center", gap:"10px" }}>
                  <div style={{ display:"flex", gap:"6px" }}>
                    {["#FF5F57","#FFBD2E","#28C840"].map(c => <div key={c} style={{ width:11, height:11, borderRadius:"50%", background:c }}/>)}
                  </div>
                  <div style={{ flex:1, display:"flex", justifyContent:"center" }}>
                    <div style={{ background:"rgba(255,255,255,0.08)", borderRadius:"6px", padding:"4px 20px", fontSize:"15px", color:"rgba(255,255,255,0.45)", fontFamily:font }}>groupgrid.io — Annual Sales Summit · Dec 2026</div>
                  </div>
                </div>

                <div className="gg-demo-body" style={{ display:"flex", minHeight:"480px" }}>

                  {/* Mini sidebar */}
                  <div className="gg-demo-sidebar" style={{ width:"160px", flexShrink:0, background:P.navy, padding:"16px 12px", display:"flex", flexDirection:"column", gap:"4px" }}>
                    {[
                      { Icon:PeopleIcon, label:"Registered",    count:demoPhase==="results"||demoPhase==="checking"?"300":"—",   active:true },
                      { Icon:FlagIcon, label:"Action Needed", count:demoPhase==="results"?"4":"—",   color:P.red },
                      { Icon:ClearedIcon, label:"Fully Booked",  count:demoPhase==="results"?"296":"—", color:P.accent },
                      { Icon:AlertIcon, label:"Not Registered",count:demoPhase==="results"?"1":"—",   color:P.purple },
                    ].map(({ Icon, label, count, active, color }) => (
                      <div key={label} style={{ display:"flex", alignItems:"center", gap:"6px", padding:"5px 8px", borderRadius:"6px", background:active?"rgba(0,201,177,0.15)":"transparent" }}>
                        <span style={{ width:12, display:"inline-flex", alignItems:"center", justifyContent:"center" }}><Icon size={12} line={active?P.accent:(color||"rgba(255,255,255,0.4)")} accent={active?P.accent:(color||"rgba(255,255,255,0.4)")} /></span>
                        <span style={{ flex:1, fontSize:"15px", color:active?P.accent:"rgba(255,255,255,0.55)", fontFamily:font, fontWeight:active?700:400 }}>{label}</span>
                        <span style={{ fontSize:"15px", fontWeight:700, color:color||"rgba(255,255,255,0.4)", fontFamily:font }}>{count}</span>
                      </div>
                    ))}
                    <div style={{ height:1, background:"rgba(255,255,255,0.08)", margin:"8px 0" }}/>
                    <div style={{ fontSize:"15px", fontWeight:800, color:"rgba(255,255,255,0.3)", fontFamily:font, letterSpacing:"0.08em", textTransform:"uppercase", marginBottom:"4px" }}>Files</div>
                    {fileInfo.map(({ label, color, Icon }, i) => (
                      <div key={label} style={{ display:"flex", alignItems:"center", gap:"6px", padding:"4px 8px" }}>
                        <span style={{ width:12, display:"inline-flex", alignItems:"center", justifyContent:"center" }}>{filesLoaded[i] ? <ClearedIcon size={12} line={P.accent} accent={P.accent}/> : <Icon size={12} line="rgba(255,255,255,0.35)" accent="rgba(255,255,255,0.35)"/>}</span>
                        <span style={{ fontSize:"15px", color:filesLoaded[i]?color:"rgba(255,255,255,0.25)", fontFamily:font, fontWeight:filesLoaded[i]?600:400, lineHeight:1.3 }}>{label}</span>
                      </div>
                    ))}
                  </div>

                  {/* Main panel */}
                  <div className="gg-demo-panel" style={{ flex:1, minWidth:0, padding:"20px 24px", overflowX:"hidden" }}>

                    {/* Idle state */}
                    {demoPhase === "idle" && (
                      <div style={{ display:"flex", alignItems:"center", justifyContent:"center", height:"100%", flexDirection:"column", gap:"20px" }}>
                        <button onClick={runDemo} style={{ display:"flex", alignItems:"center", gap:"14px", background:`linear-gradient(135deg, ${P.navy}, ${P.navyLight})`, border:"none", borderRadius:"16px", padding:"18px 32px", cursor:"pointer", boxShadow:"0 4px 24px rgba(15,29,53,0.2)" }}>
                          <div style={{ width:44, height:44, borderRadius:"50%", background:P.accent, display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}>
                            <span style={{ marginLeft:"3px", display:"inline-flex" }}><svg width="16" height="16" viewBox="0 0 16 16"><path d="M4 3l9 5-9 5z" fill={P.navy}/></svg></span>
                          </div>
                          <div style={{ textAlign:"left" }}>
                            <div style={{ fontSize:"16px", fontWeight:800, color:P.white, fontFamily:font }}>Watch the demo</div>
                          </div>
                        </button>
                      </div>
                    )}

                    {/* Loading files */}
                    {(demoPhase === "loading" || demoPhase === "checking" || demoPhase === "results") && (
                      <>
                        {/* File upload strip */}
                        <div style={{ display:"grid", gridTemplateColumns:"repeat(5,1fr)", gap:"8px", marginBottom:"16px" }}>
                          {fileInfo.map(({ label, color, Icon }, i) => (
                            <div key={label} style={{ border:`1.5px ${filesLoaded[i]?"solid":"dashed"} ${filesLoaded[i]?color:P.grey200}`, borderRadius:"10px", padding:"10px 8px", textAlign:"center", background:filesLoaded[i]?color+"0D":P.offWhite, transition:"all 0.3s" }}>
                              <div style={{ marginBottom:"4px", display:"flex", justifyContent:"center" }}>{filesLoaded[i] ? <ClearedIcon size={20} line={color} accent={color}/> : <Icon size={20} line={P.navy} accent={color}/>}</div>
                              <div style={{ fontSize:"15px", fontWeight:700, color:filesLoaded[i]?color:P.grey600, fontFamily:font, lineHeight:1.3 }}>{label}</div>
                            </div>
                          ))}
                        </div>

                        {/* Progress bar */}
                        {(demoPhase === "checking" || demoPhase === "results") && (
                          <div style={{ marginBottom:"16px", animation:"ggIn 0.5s cubic-bezier(.2,.8,.2,1)" }}>
                            <div style={{ display:"flex", justifyContent:"space-between", marginBottom:"5px" }}>
                              <span style={{ fontSize:"15px", fontWeight:700, color:P.navy, fontFamily:font }}>
                                {checkPct < 100 ? "Checking your registrations against travel…" : "Check complete, 4 issues found"}
                              </span>
                              <span style={{ fontSize:"15px", fontWeight:800, color:P.accent, fontFamily:font }}>{checkPct}%</span>
                            </div>
                            <div style={{ height:"6px", background:P.grey100, borderRadius:"20px", overflow:"hidden" }}>
                              <div style={{ height:"100%", width:`${checkPct}%`, background:`linear-gradient(90deg,${P.periwinkleD},${P.accent})`, borderRadius:"20px", transition:"width 0.2s ease" }}/>
                            </div>
                            {checkPct < 100 && <div style={{ fontSize:"15px", color:P.grey600, fontFamily:font, marginTop:"4px", animation:"ggPulse 1s infinite" }}>Matching names · comparing dates · scanning gaps…</div>}
                          </div>
                        )}

                        {/* Results table */}
                        {rowsVisible > 0 && (
                          <div className="gg-demo-table-scroll" style={{ overflowX:"auto", WebkitOverflowScrolling:"touch" }}>
                          <div style={{ border:`1px solid ${P.grey100}`, borderRadius:"12px", overflow:"hidden", animation:"ggIn 0.5s cubic-bezier(.2,.8,.2,1)", minWidth:"620px" }}>
                            {/* Table header */}
                            <div style={{ display:"grid", gridTemplateColumns:demoCols, background:P.grey50, padding:"10px 16px", gap:"12px" }}>
                              {["First","Last","Email","Status","Arr.","Dep.","Δ Arr"].map((h,ci) => (
                                <div key={h} style={{ fontSize:"13px", fontWeight:700, color:P.grey600, fontFamily:font, textTransform:"uppercase", letterSpacing:"0.05em", justifySelf:demoJustify[ci], whiteSpace:"nowrap" }}>{h}</div>
                              ))}
                            </div>
                            {/* Rows */}
                            {demoGuests.slice(0, rowsVisible).map((g, i) => {
                              const isExp = expandedRow === g.key;
                              return (
                                <React.Fragment key={g.key}>
                                  <div onClick={() => setExpandedRow(isExp ? null : g.key)}
                                    style={{ display:"grid", gridTemplateColumns:demoCols, padding:"11px 16px", gap:"12px", alignItems:"center", background:isExp?P.grey50:i%2===0?P.white:P.offWhite, borderTop:`1px solid ${P.grey100}`, cursor:"pointer", animation:"ggIn 0.5s cubic-bezier(.2,.8,.2,1)", transition:"background 0.15s" }}>
                                    <span style={{ fontSize:"15px", fontWeight:600, color:P.navy, fontFamily:font, justifySelf:"start" }}>{g.first}</span>
                                    <span style={{ fontSize:"15px", fontWeight:700, color:P.navy, fontFamily:font, justifySelf:"start" }}>{g.last}</span>
                                    <span style={{ fontSize:"15px", color:P.grey600, fontFamily:font, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap", minWidth:0, maxWidth:"100%", justifySelf:"stretch" }}>{g.email}</span>
                                    <span style={{ fontSize:"14px", fontWeight:800, color:statusColor(g.status), background:statusBg(g.status), padding:"2px 10px 2px 8px", borderRadius:"20px", fontFamily:font, whiteSpace:"nowrap", display:"inline-flex", alignItems:"center", gap:"4px", justifySelf:"center" }}>{g.status==="error" ? <FlagIcon size={11} line={statusColor(g.status)} accent={statusColor(g.status)}/> : g.status==="warn" ? <AlertIcon size={11} line={statusColor(g.status)} accent={statusColor(g.status)}/> : <ClearedIcon size={11} line={statusColor(g.status)} accent={statusColor(g.status)}/>}{statusLabel(g.status)}</span>
                                    <span style={{ fontSize:"15px", color:P.grey600, fontFamily:font, display:"inline-flex", alignItems:"center", justifySelf:"center" }}>{g.flight?.arr || <AlertIcon size={12} line={P.amber} accent={P.amber}/>}</span>
                                    <span style={{ fontSize:"15px", color:P.grey600, fontFamily:font, display:"inline-flex", alignItems:"center", justifySelf:"center" }}>{g.flight?.dep || <AlertIcon size={12} line={P.amber} accent={P.amber}/>}</span>
                                    <span style={{ fontSize:"15px", fontWeight:700, fontFamily:font, color:g.arrDiff==="0"?P.green:g.arrDiff==="—"?P.grey400:P.red, justifySelf:"end" }}>{g.arrDiff}</span>
                                  </div>
                                  {/* Expanded detail */}
                                  {isExp && (
                                    <div style={{ background:P.grey50, borderTop:`1px solid ${P.grey100}`, padding:"16px 18px", animation:"ggIn 0.45s cubic-bezier(.2,.8,.2,1)" }}>
                                      {g.issues.length > 0 && (
                                        <div style={{ display:"flex", gap:"8px", marginBottom:"14px", flexWrap:"wrap" }}>
                                          {g.issues.map(iss => (
                                            <div key={iss} style={{ display:"flex", alignItems:"center", gap:"6px", background:P.redLight, border:`1px solid ${P.red}33`, borderRadius:"8px", padding:"5px 10px" }}>
                                              <FlagIcon size={12} line={P.red} accent={P.red}/>
                                              <span style={{ fontSize:"15px", fontWeight:700, color:P.red, fontFamily:font }}>{iss}</span>
                                            </div>
                                          ))}
                                        </div>
                                      )}
                                      <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit, minmax(158px, 1fr))", gap:"10px" }}>
                                        {/* Registration card — the source of truth */}
                                        <div style={{ background:P.white, border:`1.5px solid ${g.reg?"#00A89633":"#FDECEC"}`, borderRadius:"10px", padding:"12px 14px" }}>
                                          <div style={{ fontSize:"15px", fontWeight:800, color:"#00A896", fontFamily:font, marginBottom:"8px", textTransform:"uppercase", letterSpacing:"0.06em", display:"inline-flex", alignItems:"center", gap:"5px" }}><PeopleIcon size={12} line="#00A896" accent="#00A896"/>Registration</div>
                                          {g.reg ? <>
                                            <div style={{ fontSize:"15px", color:P.grey600, fontFamily:font, marginBottom:"3px" }}>Requested in: <strong style={{ color:P.navy }}>{g.reg.checkIn}</strong></div>
                                            <div style={{ fontSize:"15px", color:P.grey600, fontFamily:font, marginBottom:"3px" }}>Requested out: <strong style={{ color:P.navy }}>{g.reg.checkOut}</strong></div>
                                            <div style={{ fontSize:"15px", color:P.accentD, fontFamily:font, fontWeight:700, display:"inline-flex", alignItems:"center", gap:"4px" }}><ClearedIcon size={12} line={P.accentD} accent={P.accentD}/>Registered</div>
                                          </> : <div style={{ fontSize:"15px", fontWeight:700, color:P.red, fontFamily:font, display:"inline-flex", alignItems:"center", gap:"4px" }}><FlagIcon size={12} line={P.red} accent={P.red}/>Not on registration list</div>}
                                        </div>
                                        {/* Flight card */}
                                        <div style={{ background:P.white, border:`1.5px solid #4F8EF722`, borderRadius:"10px", padding:"12px 14px" }}>
                                          <div style={{ fontSize:"15px", fontWeight:800, color:"#4F8EF7", fontFamily:font, marginBottom:"8px", textTransform:"uppercase", letterSpacing:"0.06em", display:"inline-flex", alignItems:"center", gap:"5px" }}><PlaneIcon size={12} line="#4F8EF7" accent="#4F8EF7"/>Flight</div>
                                          {g.flight ? <>
                                            <div style={{ fontSize:"15px", color:P.grey600, fontFamily:font, marginBottom:"3px" }}>Arrival: <strong style={{ color:P.navy }}>{g.flight.arr}</strong></div>
                                            <div style={{ fontSize:"15px", color:P.grey600, fontFamily:font, marginBottom:"3px" }}>Departure: <strong style={{ color:P.navy }}>{g.flight.dep}</strong></div>
                                            <div style={{ fontSize:"15px", color:P.grey600, fontFamily:font }}>Flight: {g.flight.num}</div>
                                          </> : <div style={{ fontSize:"15px", fontWeight:700, color:P.red, fontFamily:font, display:"inline-flex", alignItems:"center", gap:"4px" }}><FlagIcon size={12} line={P.red} accent={P.red}/>No flight booked</div>}
                                        </div>
                                        {/* Hotel card */}
                                        <div style={{ background:P.white, border:`1.5px solid ${g.hotel?"#C97A0A22":"#FDECEC"}`, borderRadius:"10px", padding:"12px 14px" }}>
                                          <div style={{ fontSize:"15px", fontWeight:800, color:"#C97A0A", fontFamily:font, marginBottom:"8px", textTransform:"uppercase", letterSpacing:"0.06em", display:"inline-flex", alignItems:"center", gap:"5px" }}><HotelIcon size={12} line="#C97A0A" accent="#C97A0A"/>Hotel</div>
                                          {g.hotel ? <>
                                            <div style={{ fontSize:"15px", color:P.grey600, fontFamily:font, marginBottom:"3px" }}>Check-in: <strong style={{ color: g.status!=="ok"&&g.issues[0]?.includes("check-in")?P.red:P.navy }}>{g.hotel.in}</strong></div>
                                            <div style={{ fontSize:"15px", color:P.grey600, fontFamily:font, marginBottom:"3px" }}>Check-out: <strong style={{ color:P.navy }}>{g.hotel.out}</strong></div>
                                            <div style={{ fontSize:"15px", color:P.grey600, fontFamily:font }}>{g.hotel.name}</div>
                                          </> : <div style={{ fontSize:"15px", fontWeight:700, color:P.red, fontFamily:font, display:"inline-flex", alignItems:"center", gap:"4px" }}><FlagIcon size={12} line={P.red} accent={P.red}/>No hotel booked</div>}
                                        </div>
                                        {/* Car card */}
                                        <div style={{ background:P.white, border:`1.5px solid #6B3FA022`, borderRadius:"10px", padding:"12px 14px" }}>
                                          <div style={{ fontSize:"15px", fontWeight:800, color:"#6B3FA0", fontFamily:font, marginBottom:"8px", textTransform:"uppercase", letterSpacing:"0.06em", display:"inline-flex", alignItems:"center", gap:"5px" }}><CarIcon size={12} line="#6B3FA0" accent="#6B3FA0"/>Car Transfer</div>
                                          {g.car ? <>
                                            <div style={{ fontSize:"15px", color:P.grey600, fontFamily:font, marginBottom:"3px" }}>Pickup: <strong style={{ color:P.navy }}>{g.car.pickup}</strong></div>
                                            <div style={{ fontSize:"15px", color:P.grey600, fontFamily:font }}>Location: {g.car.loc}</div>
                                          </> : <div style={{ fontSize:"15px", color:P.grey600, fontFamily:font }}>No transfer booked</div>}
                                        </div>
                                      </div>
                                    </div>
                                  )}
                                </React.Fragment>
                              );
                            })}
                          </div>
                          </div>
                        )}

                        {/* Replay */}
                        {demoPhase === "results" && (
                          <div style={{ display:"flex", justifyContent:"center", gap:"12px", marginTop:"20px", animation:"ggIn 0.55s cubic-bezier(.2,.8,.2,1)" }}>
                            <button onClick={runDemo} style={{ background:"none", border:`1.5px solid ${P.grey100}`, borderRadius:"10px", padding:"8px 18px", fontSize:"16px", fontWeight:700, color:P.grey600, fontFamily:font, cursor:"pointer" }}>↺ Replay</button>
                            <button onClick={onEnter} style={{ background:P.accent, border:"none", borderRadius:"10px", padding:"8px 20px", fontSize:"15px", fontWeight:700, color:P.white, fontFamily:font, cursor:"pointer", boxShadow:"0 2px 10px rgba(0,201,177,0.3)" }}>Try with your files →</button>
                          </div>
                        )}
                      </>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        );
      })()}
      {/* ── Early access ── */}
      <div style={{ background:P.offWhite, padding:"72px 40px", display:"flex", justifyContent:"center" }}>
        <div style={{ width:"100%", maxWidth:"960px", display:"flex", gap:"48px", alignItems:"center", flexWrap:"wrap", justifyContent:"center" }}>
          <div style={{ flex:"1 1 320px", minWidth:"280px" }}>
            <div style={{ fontSize:"16px", fontWeight:700, letterSpacing:"0.08em", textTransform:"uppercase", color:P.accentD, fontFamily:font, marginBottom:"12px" }}>Early access</div>
            <h2 style={{ fontSize:"clamp(28px,4vw,40px)", fontWeight:700, color:P.navy, fontFamily:fontDisplay, margin:"0 0 14px", letterSpacing:"-0.03em", lineHeight:1.15 }}>Be first to run a cleaner event</h2>
            <p style={{ fontSize:"17px", color:P.grey600, fontFamily:font, lineHeight:1.6, margin:0, maxWidth:"420px" }}>Not ready to upload your files yet? Join the early access list and we'll reach out when your spot opens, with a quick guide to load your first event.</p>
          </div>
          <div style={{ flex:"0 1 440px", minWidth:"300px", width:"100%", display:"flex", justifyContent:"center" }}>
            <EarlyAccessForm />
          </div>
        </div>
      </div>

      <div style={{ background:`linear-gradient(135deg, ${P.navy}, #0D1E40)`, padding:"96px 40px", textAlign:"center", position:"relative", overflow:"hidden" }}>
        <div style={{ position:"absolute", top:-120, left:"50%", transform:"translateX(-50%)", width:600, height:600, borderRadius:"50%", background:`radial-gradient(circle, ${P.accent}10, transparent 65%)`, pointerEvents:"none" }} />
        <div style={{ position:"relative" }}>
          <h2 style={{ fontSize:"clamp(32px,5vw,52px)", fontWeight:700, color:P.white, fontFamily:fontDisplay, margin:"0 0 16px", letterSpacing:"-0.04em", lineHeight:1.1 }}>
            Stop cross-checking.<br/>Start <span style={{ color:P.accent }}>running great events.</span>
          </h2>
          <p style={{ fontSize:"18px", color:"rgba(255,255,255,0.5)", fontFamily:font, margin:"0 auto 28px", lineHeight:1.7, maxWidth:"480px" }}>
            Join event professionals who've turned days of logistics work into a few minutes.
          </p>
          <div style={{ display:"inline-flex", alignItems:"center", gap:"8px", background:"rgba(0,201,177,0.1)", border:"1px solid rgba(0,201,177,0.25)", borderRadius:"20px", padding:"6px 16px", marginBottom:"32px" }}>
            <ShieldCheck size={14} strokeWidth={1.8} color={P.accent}/>
            <span style={{ fontSize:"15px", fontWeight:600, color:"rgba(255,255,255,0.7)", fontFamily:font }}>Built by an event planner who spent 15+ years reconciling attendee lists by hand</span>
          </div>
          <div className="gg-cta-btns" style={{ display:"flex", gap:"12px", justifyContent:"center", flexWrap:"wrap" }}>
            <button onClick={onEnter} style={{ background:`linear-gradient(135deg, ${P.accent}, ${P.accentD})`, border:"none", borderRadius:"12px", padding:"16px 40px", fontSize:"17px", fontWeight:800, color:P.white, fontFamily:font, cursor:"pointer", boxShadow:"0 4px 24px rgba(0,201,177,0.4)", letterSpacing:"-0.02em" }}>
              Open GroupGrid →
            </button>
            <button onClick={onPricing} style={{ background:"rgba(255,255,255,0.07)", border:"1px solid rgba(255,255,255,0.15)", borderRadius:"12px", padding:"16px 28px", fontSize:"16px", fontWeight:600, color:"rgba(255,255,255,0.75)", fontFamily:font, cursor:"pointer" }}>
              View pricing
            </button>
          </div>
          <p style={{ fontSize:"15px", color:"rgba(255,255,255,0.25)", fontFamily:font, marginTop:"20px" }}>Full access · $250/mo · Cancel any time</p>
        </div>
      </div>

      {/* ── Footer ── */}
      <div style={{ background:P.navy, padding:"28px 40px", display:"flex", alignItems:"center", justifyContent:"space-between", flexWrap:"wrap", gap:"16px" }}>
        <div style={{ display:"flex", alignItems:"center", gap:"12px" }}>
          <span style={{ fontSize:"15px", color:"rgba(255,255,255,0.3)", fontFamily:font }}>Built for event professionals · © 2026 · <span style={{ color:"rgba(255,255,255,0.5)" }}>{APP_VERSION}</span></span>
        </div>
        <div style={{ display:"flex", gap:"20px" }}>
          {[
            ["Home", onEnter],
            ["Pricing", onPricing],
            ["About", onAbout],
            ["FAQ", onFaq],
            ["Contact", onContact],
            ["Privacy Policy", onPrivacy],
            ["Terms of Service", onTerms],
          ].map(([label, fn]) => (
            <button key={label} onClick={fn} style={{ background:"none", border:"none", fontSize:"15px", color:"rgba(255,255,255,0.35)", fontFamily:font, cursor:"pointer", textDecoration:"underline", textDecorationColor:"rgba(255,255,255,0.15)" }}>{label}</button>
          ))}
        </div>
      </div>
    </div>
  );
}

// ── Pricing Page ──────────────────────────────────────────────────────────────
function PricingPage({ onBack, nav }) {
  const [billing, setBilling] = useState("monthly");
  const annual = billing === "annual";

  // Replace these href values with your actual Stripe payment links
  const STRIPE_MONTHLY = "https://buy.stripe.com/monthly_link_placeholder";
  const STRIPE_ANNUAL  = "https://buy.stripe.com/annual_link_placeholder";

  return (
    <div style={{ minHeight:"100vh", background:P.offWhite, fontFamily:font }}>
      {nav ? <MarketingNav nav={nav} /> : (
      <div style={{ background:P.navy, padding:"0 32px", height:"52px", display:"flex", alignItems:"center", justifyContent:"space-between", boxShadow:"0 1px 0 rgba(255,255,255,0.06)" }}>
        <button onClick={onBack} style={{ background:"rgba(255,255,255,0.08)", border:"none", borderRadius:"8px", padding:"5px 14px", color:"rgba(255,255,255,0.75)", fontSize:"15px", fontFamily:font, fontWeight:600, cursor:"pointer" }}>← Back to app</button>
        <span style={{ color:P.accent, fontSize:"15px", fontWeight:700, fontFamily:font, letterSpacing:"0.05em" }}>PRICING</span>
      </div>
      )}

      {/* Hero */}
      <div style={{ background:`linear-gradient(160deg, ${P.navy} 0%, ${P.navyLight} 100%)`, padding:"64px 28px 56px", textAlign:"center" }}>
        <h1 style={{ fontSize:"44px", fontWeight:700, color:P.white, fontFamily:fontDisplay, margin:"0 0 14px", letterSpacing:"-0.04em", lineHeight:1.1 }}>
          Simple pricing.<br/><span style={{ color:P.accent }}>No surprises.</span>
        </h1>
        <p style={{ fontSize:"17px", color:"rgba(255,255,255,0.55)", fontFamily:font, margin:"0 0 32px", lineHeight:1.6 }}>
          One plan. All features. One simple price.
        </p>
        {/* Billing toggle */}
        <div style={{ display:"inline-flex", background:"rgba(255,255,255,0.08)", borderRadius:"12px", padding:"4px", gap:"4px" }}>
          {[["monthly","Monthly"],["annual","Annual · Save 17%"]].map(([k,l]) => (
            <button key={k} onClick={() => setBilling(k)} style={{ padding:"8px 22px", borderRadius:"9px", border:"none", cursor:"pointer", fontFamily:font, fontSize:"15px", fontWeight:700, transition:"all 0.18s", background:billing===k?P.white:"transparent", color:billing===k?P.navy:"rgba(255,255,255,0.55)", boxShadow:billing===k?"0 1px 4px rgba(0,0,0,0.15)":"none" }}>{l}</button>
          ))}
        </div>
      </div>

      {/* Single plan card */}
      <div style={{ maxWidth:"460px", margin:"-32px auto 0", padding:"0 24px 72px" }}>
        <div style={{ background:P.white, borderRadius:"20px", overflow:"hidden", boxShadow:"0 8px 40px rgba(0,201,177,0.18), 0 2px 12px rgba(0,0,0,0.06)", border:`2px solid ${P.accent}`, position:"relative" }}>

          {/* Best Value badge for annual */}
          {annual && (
            <div style={{ position:"absolute", top:0, left:"50%", transform:"translateX(-50%)", background:P.accent, color:P.white, fontSize:"15px", fontWeight:800, fontFamily:font, letterSpacing:"0.07em", padding:"4px 18px", borderRadius:"0 0 10px 10px", textTransform:"uppercase", whiteSpace:"nowrap" }}>
              Best Value — Save $988/yr
            </div>
          )}

          <div style={{ padding: annual ? "40px 32px 28px" : "32px 32px 28px" }}>
            <div style={{ fontSize:"15px", fontWeight:800, color:P.accent, fontFamily:font, letterSpacing:"0.1em", textTransform:"uppercase", marginBottom:"10px" }}>GroupGrid</div>

            {/* Price */}
            <div style={{ display:"flex", alignItems:"flex-end", gap:"6px", marginBottom:"6px" }}>
              <span style={{ fontSize:"52px", fontWeight:700, color:P.navy, fontFamily:fontDisplay, letterSpacing:"-0.04em", lineHeight:1 }}>
                {annual ? "$2,000" : "$250"}
              </span>
              <span style={{ fontSize:"17px", color:P.grey600, fontFamily:font, marginBottom:"8px" }}>
                {annual ? "/year" : "/month"}
              </span>
            </div>
            {annual && (
              <div style={{ fontSize:"15px", color:P.green, fontWeight:700, fontFamily:font, marginBottom:"4px" }}>
                Equivalent to $167/mo · billed annually
              </div>
            )}
            <div style={{ fontSize:"17px", color:P.grey600, fontFamily:font, marginBottom:"16px" }}>1 user · unlimited events · all features</div>

            {/* Access callout */}
            <div style={{ background:P.accentLight, border:`1.5px solid ${P.accent}44`, borderRadius:"10px", padding:"12px 16px", marginBottom:"16px", display:"flex", alignItems:"center", gap:"10px" }}>
              <span style={{ fontSize:"18px", flexShrink:0 }}>🎯</span>
              <div>
                <div style={{ fontSize:"15px", fontWeight:800, color:P.teal, fontFamily:font }}>One plan, everything included</div>
                <div style={{ fontSize:"16px", color:P.grey600, fontFamily:font, lineHeight:1.5 }}>Create an account to get started. Unlimited events, unlimited guests, and every feature — one simple monthly price.</div>
              </div>
            </div>

            <button onClick={nav?.onApp}
              style={{ display:"block", width:"100%", background:P.accent, border:"none", borderRadius:"12px", padding:"15px", fontSize:"16px", fontWeight:800, fontFamily:font, color:P.white, cursor:"pointer", textAlign:"center", textDecoration:"none", boxShadow:"0 4px 16px rgba(0,201,177,0.35)", letterSpacing:"-0.01em", boxSizing:"border-box" }}>
              Get started →
            </button>
          </div>

          {/* Feature list */}
          <div style={{ borderTop:`1px solid ${P.grey100}`, padding:"24px 32px 32px" }}>
            <div style={{ fontSize:"15px", fontWeight:700, color:P.grey600, fontFamily:font, letterSpacing:"0.06em", textTransform:"uppercase", marginBottom:"16px" }}>Everything included</div>
            {[
              "Flight, hotel, car & dietary cross-referencing",
              "Unlimited guests per event",
              "Date mismatch & flag detection",
              "Bulk email drafting (guest, hotel, travel)",
              "Shareable HTML reports",
              "Export to Excel",
              "Notes & issue resolution workflow",
              "Browser-local · zero PII uploaded",
            ].map((f,i) => (
              <div key={i} style={{ display:"flex", alignItems:"flex-start", gap:"10px", marginBottom:"12px" }}>
                <div style={{ width:18, height:18, borderRadius:"50%", background:P.accentLight, display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0, marginTop:"1px" }}>
                  <Check size={11} strokeWidth={3} color={P.accentD} />
                </div>
                <span style={{ fontSize:"17px", color:P.grey600, fontFamily:font, lineHeight:1.5 }}>{f}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Trust / reassurance */}
        <div style={{ marginTop:"28px", display:"flex", flexDirection:"column", gap:"10px" }}>
          {[
            { icon:<Check size={13} strokeWidth={2.5}/>, text:"One flat monthly price — no per-event fees" },
            { icon:<Lock size={13} strokeWidth={1.8}/>, text:"Payments processed securely by Stripe" },
            { icon:<X size={13} strokeWidth={2.5}/>, text:"Cancel any time — no long-term commitment" },
            { icon:<ShieldCheck size={13} strokeWidth={1.8}/>, text:"Your guest files never leave your browser" },
          ].map(({ icon, text }) => (
            <div key={text} style={{ display:"flex", alignItems:"center", gap:"10px" }}>
              <span style={{ color:P.grey600, display:"flex" }}>{icon}</span>
              <span style={{ fontSize:"16px", color:P.grey600, fontFamily:font }}>{text}</span>
            </div>
          ))}
        </div>

        {/* Questions */}
        <div style={{ marginTop:"36px", background:P.white, borderRadius:"14px", border:`1px solid ${P.grey100}`, padding:"20px 24px", textAlign:"center" }}>
          <div style={{ fontSize:"15px", fontWeight:700, color:P.navy, fontFamily:font, marginBottom:"6px" }}>Questions?</div>
          <div style={{ fontSize:"17px", color:P.grey600, fontFamily:font }}>Email us at <a href="mailto:billing@groupgrid.io" style={{ color:P.periwinkleD, fontWeight:600, textDecoration:"none" }}>billing@groupgrid.io</a> and we'll get back to you within one business day.</div>
        </div>
      </div>
    </div>
  );
}

// ── Supabase client ───────────────────────────────────────────────────────────
// Loaded via CDN — no build step required.
// Keys are safe to be public (publishable key + RLS enforces data isolation).
const SUPABASE_URL = "https://ajabrqcbultkaszsycwh.supabase.co";
const SUPABASE_KEY = "sb_publishable_yn6mJb93k85y5nrJJReQSA_M6iliVoD";

let _supabase = null;
function getSupabase() {
  if (_supabase) return _supabase;
  if (window.supabase?.createClient) {
    _supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY, {
      auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true }
    });
  }
  return _supabase;
}

export default function GroupGridApp() {
  const [user, setUser]           = useState(null);
  const [authReady, setAuthReady] = useState(false);

  // Load Supabase from CDN once, then check existing session
  useEffect(() => {
    const script = document.createElement("script");
    script.src = "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2";
    script.onload = async () => {
      const sb = getSupabase();
      if (!sb) { setAuthReady(true); return; }
      // Restore existing session (e.g. user refreshes the page)
      const { data: { session } } = await sb.auth.getSession();
      if (session?.user) {
        setUser({ email: session.user.email, name: session.user.user_metadata?.name || session.user.email.split("@")[0], id: session.user.id });
      }
      // Listen for auth state changes (sign in, sign out, token refresh)
      sb.auth.onAuthStateChange((_event, session) => {
        if (session?.user) {
          setUser({ email: session.user.email, name: session.user.user_metadata?.name || session.user.email.split("@")[0], id: session.user.id });
        } else {
          setUser(null);
        }
      });
      setAuthReady(true);
    };
    script.onerror = () => setAuthReady(true); // Fail gracefully — app still works without auth
    document.head.appendChild(script);
    return () => { if (document.head.contains(script)) document.head.removeChild(script); };
  }, []);

  const handleLogout = async () => {
    const sb = getSupabase();
    if (sb) await sb.auth.signOut();
    setUser(null);
  };

  if (!authReady) {
    return (
      <div style={{ minHeight:"100vh", background:P.navy, display:"flex", alignItems:"center", justifyContent:"center", fontFamily:font }}>
        <div style={{ textAlign:"center" }}>
          <div style={{ width:40, height:40, border:`3px solid rgba(255,255,255,0.1)`, borderTop:`3px solid ${P.accent}`, borderRadius:"50%", animation:"spin 0.8s linear infinite", margin:"0 auto 16px" }} />
          <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
          <div style={{ color:"rgba(255,255,255,0.4)", fontSize:"15px" }}>Loading GroupGrid…</div>
        </div>
      </div>
    );
  }

  return <ErrorBoundary><GroupGrid user={user} onLogin={setUser} onLogout={handleLogout} /></ErrorBoundary>;
}

// ── Upload Square component (hooks must be at component top level) ──────────
function UploadSquare({ label, icon, accent, file, setter, required, sub, compact }) {
  const [drag, setDrag] = useState(false);
  const onDrop = e => { e.preventDefault(); setDrag(false); const f = e.dataTransfer.files[0]; if (f) setter(f); };

  if (compact) {
    // Horizontal pill style for the sub-header bar
    return (
      <label
        onDragOver={e => { e.preventDefault(); setDrag(true); }}
        onDragLeave={() => setDrag(false)}
        onDrop={onDrop}
        style={{ display:"flex", alignItems:"center", gap:"8px", border:`1.5px dashed ${drag ? accent : file ? accent : P.grey200}`, borderRadius:"10px", padding:"7px 12px", cursor:"pointer", background:file ? accent+"0D" : drag ? accent+"07" : P.offWhite, transition:"all 0.15s", position:"relative", flexShrink:0, minWidth:"140px" }}>
        <input type="file" accept=".xlsx,.xls,.csv" style={{ display:"none" }} onChange={e => e.target.files[0] && setter(e.target.files[0])} />
        <span style={{ display:"flex", alignItems:"center", color:file?P.accent:accent }}>{file ? <Check size={14} strokeWidth={2.5}/> : icon}</span>
        <div style={{ minWidth:0 }}>
          {file ? (
            <>
              <div style={{ fontSize:"15px", fontWeight:800, color:accent, fontFamily:font, whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis", maxWidth:"110px" }}>{file.name}</div>
              <div style={{ fontSize:"15px", color:P.green, fontWeight:700, fontFamily:font }}><Check size={10} strokeWidth={2.5} style={{display:"inline",marginRight:3}}/>Ready</div>
            </>
          ) : (
            <>
              <div style={{ fontSize:"15px", fontWeight:800, color:P.navy, fontFamily:font, whiteSpace:"nowrap" }}>{label}</div>
              <div style={{ fontSize:"15px", color:P.navyLight, fontFamily:font }}>{sub}{!required ? " · Optional" : ""}</div>
            </>
          )}
        </div>
        {file && <button onClick={e => { e.preventDefault(); setter(null); }} style={{ marginLeft:"auto", background:"transparent", border:"none", color:P.navyLight, fontSize:"15px", cursor:"pointer", lineHeight:1, flexShrink:0 }} title="Remove">✕</button>}
      </label>
    );
  }

  // Original full square layout (used in format guide preview / elsewhere if needed)
  return (
    <label
      onDragOver={e => { e.preventDefault(); setDrag(true); }}
      onDragLeave={() => setDrag(false)}
      onDrop={onDrop}
      style={{ display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", minHeight:"120px", border:`1.5px dashed ${drag ? accent : file ? accent : P.grey200}`, borderRadius:"12px", padding:"20px 12px 16px", cursor:"pointer", background:file ? accent+"08" : drag ? accent+"05" : P.white, transition:"all 0.18s", position:"relative", textAlign:"center" }}>
      <input type="file" accept=".xlsx,.xls,.csv" style={{ display:"none" }} onChange={e => e.target.files[0] && setter(e.target.files[0])} />
      {!required && !file && (
        <span style={{ position:"absolute", top:7, right:10, fontSize:"15px", color:P.grey600, fontFamily:font, fontWeight:500, textTransform:"uppercase", letterSpacing:"0.06em" }}>Optional</span>
      )}
      <div style={{ width:32, height:32, display:"flex", alignItems:"center", justifyContent:"center", marginBottom:"8px", color:file?P.accent:accent, flexShrink:0 }}>{file ? <Check size={24} strokeWidth={1.8} color={P.green}/> : icon}</div>
      {file ? (
        <>
          <div style={{ color:accent, fontSize:"15px", fontWeight:600, fontFamily:font, maxWidth:"120px", wordBreak:"break-word", lineHeight:1.3, textAlign:"center" }}>{file.name}</div>
          <div style={{ marginTop:"6px", background:P.greenLight, color:P.green, fontSize:"15px", fontWeight:600, padding:"2px 10px", borderRadius:"20px", fontFamily:font, display:"flex", alignItems:"center", gap:3 }}><Check size={10} strokeWidth={2.5}/>Ready</div>
          <button onClick={e => { e.preventDefault(); setter(null); }} style={{ position:"absolute", top:9, right:12, background:"transparent", border:"none", color:P.navyLight, fontSize:"15px", cursor:"pointer", lineHeight:1, display:"flex", alignItems:"center" }} title="Remove"><X size={13} strokeWidth={1.8}/></button>
        </>
      ) : (
        <>
          <div style={{ color:P.navy, fontWeight:600, fontSize:"15px", marginBottom:"3px", fontFamily:font, textAlign:"center", lineHeight:1.3 }}>{label}</div>
          <div style={{ color:P.navyLight, fontSize:"15px", fontFamily:font, textAlign:"center" }}>{sub}</div>
        </>
      )}
    </label>
  );
}

// ── Downloadable upload templates ─────────────────────────────────────────────
// Builds a correctly formatted .xlsx (header row + one example row) entirely in the
// browser, using the exact column names the parsers recognize.
const TEMPLATE_DEFS = {
  registration: { file:"GroupGrid_Registration_Template.xlsx", sheet:"Registration", rows:[
    ["First Name","Last Name","Email","Notes"],
    ["Jane","Doe","jane.doe@example.com","VIP, seat near front. Approved to book own hotel."],
  ]},
  flight: { file:"GroupGrid_Flight_Template.xlsx", sheet:"Flights", rows:[
    ["Name","Email","Arrival Date","Arrival Time","Arrival Airport","Inbound Flight","Departure Date","Departure Time","Departure Airport","Outbound Flight"],
    ["Jane Doe","jane.doe@example.com","2026-09-14","6:15 AM","JFK","DL1234","2026-09-17","5:40 PM","JFK","DL5678"],
  ]},
  hotel: { file:"GroupGrid_Hotel_Template.xlsx", sheet:"Hotel", rows:[
    ["Name","Email","Hotel","Check-In","Check-Out","Confirmation"],
    ["Jane Doe","jane.doe@example.com","Grand Plaza Hotel","2026-09-14","2026-09-17","ABC12345"],
  ]},
  car: { file:"GroupGrid_Car_Template.xlsx", sheet:"Car Transfers", rows:[
    ["Name","Email","Pickup Date","Pickup Time","Dropoff Date","Dropoff Time"],
    ["Jane Doe","jane.doe@example.com","2026-09-14","7:00 AM","2026-09-17","6:30 PM"],
  ]},
  dietary: { file:"GroupGrid_Dietary_Template.xlsx", sheet:"Dietary", rows:[
    ["Name","Email","Dietary Restriction","Notes"],
    ["Jane Doe","jane.doe@example.com","Vegetarian","No nuts"],
  ]},
  abstract: { file:"GroupGrid_Abstract_Template.xlsx", sheet:"Abstracts", rows:[
    ["Name","Email","Abstract Title","Status"],
    ["Jane Doe","jane.doe@example.com","Trends in Cyber Resilience","Accepted"],
  ]},
};
function buildTemplateXlsx(def) {
  const ws = XLSX.utils.aoa_to_sheet(def.rows);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, def.sheet);
  return wb;
}
function downloadTemplate(type) {
  const def = TEMPLATE_DEFS[type]; if (!def) return;
  XLSX.writeFile(buildTemplateXlsx(def), def.file);
}
// Minimal in-browser ZIP writer (store method, no external dependency) so every upload
// template can be downloaded together in a single .zip.
function gg_crc32(bytes) {
  let crc = 0xFFFFFFFF;
  for (let i = 0; i < bytes.length; i++) {
    crc ^= bytes[i];
    for (let k = 0; k < 8; k++) crc = (crc & 1) ? (crc >>> 1) ^ 0xEDB88320 : crc >>> 1;
  }
  return (crc ^ 0xFFFFFFFF) >>> 0;
}
function gg_makeZip(files) {
  const enc = new TextEncoder();
  const u16 = n => [n & 0xFF, (n >>> 8) & 0xFF];
  const u32 = n => [n & 0xFF, (n >>> 8) & 0xFF, (n >>> 16) & 0xFF, (n >>> 24) & 0xFF];
  const parts = [], central = []; let offset = 0;
  files.forEach(f => {
    const name = enc.encode(f.name), crc = gg_crc32(f.data), size = f.data.length;
    const local = Uint8Array.from([].concat(u32(0x04034b50), u16(20), u16(0), u16(0), u16(0), u16(0), u32(crc), u32(size), u32(size), u16(name.length), u16(0)));
    parts.push(local, name, f.data);
    central.push(Uint8Array.from([].concat(u32(0x02014b50), u16(20), u16(20), u16(0), u16(0), u16(0), u16(0), u32(crc), u32(size), u32(size), u16(name.length), u16(0), u16(0), u16(0), u16(0), u32(0), u32(offset))), name);
    offset += local.length + name.length + size;
  });
  const cdStart = offset; let cdSize = 0;
  central.forEach(c => { parts.push(c); cdSize += c.length; });
  parts.push(Uint8Array.from([].concat(u32(0x06054b50), u16(0), u16(0), u16(files.length), u16(files.length), u32(cdSize), u32(cdStart), u16(0))));
  let total = 0; parts.forEach(p => total += p.length);
  const out = new Uint8Array(total); let pos = 0;
  parts.forEach(p => { out.set(p, pos); pos += p.length; });
  return out;
}
function downloadAllTemplates() {
  const types = ["registration", "flight", "hotel", "car", "abstract"].concat(SHOW_DIETARY ? ["dietary"] : []);
  const files = types.map(t => {
    const def = TEMPLATE_DEFS[t];
    const data = new Uint8Array(XLSX.write(buildTemplateXlsx(def), { type: "array", bookType: "xlsx" }));
    return { name: def.file, data };
  });
  const blob = new Blob([gg_makeZip(files)], { type: "application/zip" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = "GroupGrid_Upload_Templates.zip";
  document.body.appendChild(a); a.click(); document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1500);
}

// ── PDF table extraction (beta) ───────────────────────────────────────────────
// Loads pdf.js on demand (only when a PDF is uploaded), extracts text with its
// position, reconstructs rows by line, and assigns each value to the nearest
// header column. Runs entirely in the browser, so files never leave the device.
// Best for clean, digital, table-style PDFs (e.g. hotel rooming lists); scanned
// or irregular PDFs may extract imperfectly, which is why results are shown for
// review before anything is sent.
const PDFJS_VERSION = "3.11.174";
let _pdfjsPromise = null;
function loadPdfJs() {
  if (typeof window !== "undefined" && window.pdfjsLib) return Promise.resolve(window.pdfjsLib);
  if (_pdfjsPromise) return _pdfjsPromise;
  _pdfjsPromise = new Promise((resolve, reject) => {
    const s = document.createElement("script");
    s.src = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${PDFJS_VERSION}/pdf.min.js`;
    s.onload = () => {
      try {
        const lib = window.pdfjsLib;
        lib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${PDFJS_VERSION}/pdf.worker.min.js`;
        resolve(lib);
      } catch (e) { reject(e); }
    };
    s.onerror = () => { _pdfjsPromise = null; reject(new Error("Could not load the PDF reader. Check your connection and try again, or upload an Excel or CSV file.")); };
    document.head.appendChild(s);
  });
  return _pdfjsPromise;
}
function buildAoaFromPdfLines(lines) {
  const KW = ["name","email","check","hotel","room","arrival","depart","date","time","flight","airport","pickup","dropoff","drop off","confirmation","guest","attendee","transfer","first","last"];
  let headerIdx = -1, best = 0;
  for (let i = 0; i < lines.length; i++) {
    const txt = lines[i].items.map(x => x.str).join(" ").toLowerCase();
    const hits = KW.reduce((a, k) => a + (txt.includes(k) ? 1 : 0), 0);
    if (lines[i].items.length >= 2 && hits > best) { best = hits; headerIdx = i; }
  }
  if (headerIdx < 0 || best < 2) return null;
  const header = lines[headerIdx].items;
  const anchors = header.map(h => h.x);
  const headerRow = header.map(h => h.str);
  const headerSig = headerRow.join(" ").toLowerCase();
  const nearest = x => { let bi = 0, bd = Infinity; for (let i = 0; i < anchors.length; i++) { const d = Math.abs(anchors[i] - x); if (d < bd) { bd = d; bi = i; } } return bi; };
  const out = [headerRow];
  for (let i = headerIdx + 1; i < lines.length; i++) {
    const sig = lines[i].items.map(x => x.str).join(" ").toLowerCase();
    if (sig === headerSig) continue; // skip repeated headers on later pages
    const cells = new Array(anchors.length).fill("");
    for (const it of lines[i].items) { const c = nearest(it.x); cells[c] = cells[c] ? cells[c] + " " + it.str : it.str; }
    if (cells.some(c => c && c.trim() !== "")) out.push(cells);
  }
  return out;
}
async function extractPdfToWorkbook(file) {
  const pdfjsLib = await loadPdfJs();
  const buf = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: buf }).promise;
  let lines = [];
  for (let p = 1; p <= pdf.numPages; p++) {
    const page = await pdf.getPage(p);
    const tc = await page.getTextContent();
    const items = tc.items
      .filter(it => it.str && it.str.trim() !== "")
      .map(it => ({ x: it.transform[4], y: Math.round(it.transform[5]), str: it.str.trim() }))
      .sort((a, b) => b.y - a.y || a.x - b.x);
    let cur = null;
    for (const it of items) {
      if (!cur || Math.abs(cur.y - it.y) > 3) { cur = { y: it.y, items: [it] }; lines.push(cur); }
      else cur.items.push(it);
    }
  }
  for (const ln of lines) ln.items.sort((a, b) => a.x - b.x);
  const aoa = buildAoaFromPdfLines(lines);
  if (!aoa || aoa.length < 2) throw new Error("Couldn't find a readable table in this PDF. Try the Excel or CSV version, or download a template for the right format.");
  const ws = XLSX.utils.aoa_to_sheet(aoa);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "PDF");
  return wb;
}

// ── Two-step Setup screen (Option 1). Step 1 = project details (event name required),
// Step 2 = file uploads (required on top, optional below). Accepts .xlsx/.xls/.csv/.pdf.
function tagSrc(arr, src){ return (arr||[]).map(r => ({ ...r, source: (src||"").toString().trim() })); }

function ExtraUploads({ show, items, setItems, Icon, color }) {
  if (!show) return null;
  return (
    <div style={{ marginBottom:"14px" }}>
      {items.map((it) => (
        <div key={it.id} style={{ display:"flex", alignItems:"center", gap:"10px", marginBottom:"8px", background:P.grey50, border:`1px solid ${P.grey100}`, borderRadius:"9px", padding:"8px 12px" }}>
          <Icon size={16} strokeWidth={1.8} color={color} style={{ flexShrink:0 }}/>
          <label style={{ flex:"0 0 130px", overflow:"hidden" }}>
            <input type="file" accept=".xlsx,.xls,.csv,.pdf" style={{ display:"none" }} onChange={e => { const fl = e.target.files[0]; if (fl) setItems(prev => prev.map(x => x.id===it.id ? { ...x, file:fl } : x)); }} />
            <span style={{ display:"inline-block", fontSize:"15px", color:it.file?P.navy:P.periwinkleD, fontFamily:font, cursor:"pointer", overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap", maxWidth:"130px", fontWeight:500 }}>{it.file ? it.file.name : "+ choose file"}</span>
          </label>
          <input value={it.source} onChange={e => setItems(prev => prev.map(x => x.id===it.id ? { ...x, source:e.target.value } : x))} placeholder="Source (e.g. Concur)"
            style={{ flex:1, background:P.white, border:`1.5px solid ${P.grey100}`, borderRadius:"8px", padding:"7px 11px", fontSize:"15px", color:P.navy, fontFamily:font, outline:"none", minWidth:0 }} />
          <button onClick={() => setItems(prev => prev.filter(x => x.id !== it.id))} style={{ background:"transparent", border:"none", color:P.grey600, cursor:"pointer", flexShrink:0 }} title="Remove"><X size={15} strokeWidth={1.8}/></button>
        </div>
      ))}
      <button onClick={() => setItems(prev => [...prev, { id:Date.now(), file:null, source:"" }])}
        style={{ background:"transparent", border:"none", color:P.accentD, fontSize:"15px", fontWeight:500, fontFamily:font, cursor:"pointer", padding:"2px 0" }}>+ Add another file</button>
    </div>
  );
}

function SetupTile({ label, sub, icon, accent, file, setter, required, recommended, columns, templateType }) {
  const [drag, setDrag] = useState(false);
  const [hover, setHover] = useState(false);
  const onDrop = e => { e.preventDefault(); setDrag(false); const f = e.dataTransfer.files[0]; if (f) setter(f); };
  return (
    <label
      onMouseEnter={() => setHover(true)} onMouseLeave={() => setHover(false)}
      onDragOver={e => { e.preventDefault(); setDrag(true); }} onDragLeave={() => setDrag(false)} onDrop={onDrop}
      style={{ position:"relative", display:"flex", flexDirection:"column", alignItems:"center", textAlign:"center", justifyContent:"center", minHeight:"108px", border:`1.5px ${file?"solid":"dashed"} ${file?accent:drag?accent:P.grey200}`, borderRadius:"11px", padding:"12px 10px", cursor:"pointer", background:file?accent+"0D":drag?accent+"08":P.grey50, transition:"all 0.15s" }}>
      <input type="file" accept=".xlsx,.xls,.csv,.pdf" style={{ display:"none" }} onChange={e => e.target.files[0] && setter(e.target.files[0])} />
      <span style={{ position:"absolute", top:7, left:0, right:0, display:"flex", justifyContent:"center" }}>
        {recommended
          ? <span style={{ fontSize:"15px", fontWeight:600, padding:"1px 7px", borderRadius:"20px", background:"#DCF2F2", color:"#0A7B7A", fontFamily:font }}>Source of truth</span>
          : required
            ? <span style={{ fontSize:"15px", fontWeight:600, padding:"1px 7px", borderRadius:"20px", background:P.redLight, color:P.red, fontFamily:font }}>Required</span>
            : <span style={{ fontSize:"15px", fontWeight:500, padding:"1px 7px", borderRadius:"20px", background:P.grey100, color:P.grey600, fontFamily:font }}>Optional</span>}
      </span>
      <div style={{ marginTop:"12px", marginBottom:"5px", color:file?P.green:accent }}>{file ? <Check size={20} strokeWidth={1.8} color={P.green}/> : icon}</div>
      <div style={{ fontSize:"15px", fontWeight:500, color:P.navy, fontFamily:font, marginBottom:"2px", wordBreak:"break-word", maxWidth:"130px", lineHeight:1.25 }}>{file ? file.name : label}</div>
      <div style={{ fontSize:"15px", color:file?P.green:P.grey600, fontFamily:font, fontWeight:file?500:400 }}>{file ? "Ready" : sub}</div>
      {!file && templateType && (
        <button onClick={e => { e.preventDefault(); e.stopPropagation(); downloadTemplate(templateType); }}
          title="Download a correctly formatted Excel template"
          style={{ position:"absolute", bottom:7, left:0, right:0, margin:"0 auto", width:"fit-content", background:"transparent", border:"none", color:P.periwinkleD, fontSize:"15px", fontWeight:600, fontFamily:font, cursor:"pointer", textDecoration:"underline" }}>
          Download template
        </button>
      )}
      {file && <button onClick={e => { e.preventDefault(); setter(null); }} style={{ position:"absolute", top:8, right:10, background:"transparent", border:"none", color:P.grey600, cursor:"pointer", lineHeight:1 }} title="Remove"><X size={13} strokeWidth={1.8}/></button>}
      {hover && !file && columns && (
        <div style={{ position:"absolute", bottom:"calc(100% + 8px)", left:"50%", transform:"translateX(-50%)", width:"210px", background:P.navy, borderRadius:"10px", padding:"12px 14px", boxShadow:"0 8px 24px rgba(0,0,0,0.3)", zIndex:30, textAlign:"left", pointerEvents:"none" }}>
          <div style={{ fontSize:"15px", fontWeight:600, color:P.accent, fontFamily:font, marginBottom:"7px", textTransform:"uppercase", letterSpacing:"0.05em" }}>Expected columns</div>
          {columns.map(c => <div key={c} style={{ fontSize:"15px", color:"rgba(255,255,255,0.75)", fontFamily:font, lineHeight:1.7 }}>{c}</div>)}
        </div>
      )}
    </label>
  );
}

function SetupScreen({
  projectName, setProjectName, eventName, setEventName, arrivalStart, setArrivalStart, arrivalEnd, setArrivalEnd,
  departureStart, setDepartureStart, departureEnd, setDepartureEnd,
  preferredAirports, setPreferredAirports,
  departureAirports, setDepartureAirports,
  arrivalCutoff, setArrivalCutoff,
  departureCutoff, setDepartureCutoff,
  lateArrivalCutoff, setLateArrivalCutoff,
  typeRules, setTypeRules,
  contacts, setContacts, setContactsOpen,
  registrationFile, setRegistrationFile, flightFile, setFlightFile, hotelFile, setHotelFile,
  hotelProperty, setHotelProperty, extraHotels, setExtraHotels,
  extraFlights, setExtraFlights, extraCars, setExtraCars, extraReg, setExtraReg, extraDietary, setExtraDietary,
  carFile, setCarFile, dietaryFile, setDietaryFile, abstractFile, setAbstractFile,
  ready, loading, error, runCheck, isMobile, isReRun
}) {
  const hasName = !!(projectName && projectName.trim());
  const canRun = hasName && ready && !loading;
  const hasContacts = contacts && (contacts.hotel?.email || contacts.travel?.email || contacts.car?.email);
  const anyTravel = !!(arrivalStart || arrivalEnd || departureStart || departureEnd || arrivalCutoff || departureCutoff || lateArrivalCutoff || (typeRules && typeRules.length) || preferredAirports || departureAirports);
  const updateContact = (group, field, val) => setContacts(prev => ({ ...prev, [group]: { ...prev[group], [field]: val } }));
  const [optionalOpen, setOptionalOpen] = useState(false);
  const optionalCount = (anyTravel ? 1 : 0) + (hasContacts ? 1 : 0);
  return (
    <div style={{ maxWidth:"760px", margin:"0 auto", width:"100%" }}>
      <h1 style={{ fontSize:"clamp(20px,3vw,24px)", fontWeight:600, color:P.navy, fontFamily:font, letterSpacing:"-0.02em", margin:"0 0 4px" }}>New project</h1>
      <p style={{ fontSize:"13.5px", color:P.grey600, fontFamily:font, margin:"0 0 18px", lineHeight:1.55 }}>Name your project, upload your files, then run the cross-check. Travel parameters and contacts are optional.</p>

      <div style={{ display:"flex", alignItems:"center", marginBottom:"18px", flexWrap:"wrap", gap:"8px" }}>
        {[
          { n:"1", label:"Project", state: hasName ? "done" : "active" },
          { n:"2", label:"Upload", state: hasName ? (ready ? "done" : "active") : "todo" },
          { n:"3", label:"Details", state: optionalCount ? "done" : "todo" },
          { n:"4", label:"Review", state:"todo" },
        ].map(({ n, label, state }, i) => (
          <React.Fragment key={label}>
            {i > 0 && <div className="gg-step-line" style={{ flex:1, height:"1.5px", background:P.grey100, margin:"0 12px", minWidth:"20px" }} />}
            <div style={{ display:"flex", alignItems:"center", gap:"9px" }}>
              <span style={{ width:26, height:26, borderRadius:"50%", display:"flex", alignItems:"center", justifyContent:"center", fontSize:"17px", fontWeight:600, flexShrink:0, fontFamily:font, background: state==="done"?P.accent:state==="active"?P.navy:P.grey100, color: state==="todo"?P.grey600:P.white }}>{state==="done"?<Check size={14} strokeWidth={2.5}/>:n}</span>
              <span style={{ fontSize:"18px", fontWeight: state==="todo"?400:500, color: state==="todo"?P.grey600:P.navy, fontFamily:font }}>{label}</span>
            </div>
          </React.Fragment>
        ))}
      </div>

      <div className="gg-setup-cols" style={{ display:"flex", flexDirection:"column", gap:"0px", alignItems:"stretch" }}>
      <div style={{ order:1, background:P.white, border:`1px solid ${P.grey100}`, borderRadius:"14px", padding:"18px 20px", marginBottom:"14px", boxShadow:"0 1px 2px rgba(12,30,63,0.04), 0 14px 30px -20px rgba(12,30,63,0.22)" }}>
        <div style={{ fontSize:"15px", fontWeight:600, color:P.navy, fontFamily:font, marginBottom:"3px" }}>Step 1 · Project info</div>
        <div style={{ fontSize:"12.5px", color:P.grey600, fontFamily:font, marginBottom:"14px", lineHeight:1.5 }}>Name your project and set the event name guests see in their emails.</div>
        <div style={{ marginBottom:"14px" }}>
          <label style={{ display:"block", fontSize:"16px", fontWeight:500, color:P.grey600, fontFamily:font, marginBottom:"6px" }}>Project name <span style={{ color:P.red }}>required</span></label>
          <input value={projectName} onChange={e => setProjectName(e.target.value)} placeholder="e.g. Sales Summit - working file"
            style={{ width:"100%", background:P.grey50, border:`1.5px solid ${hasName?P.accent+"88":P.grey100}`, borderRadius:"10px", padding:"11px 13px", fontSize:"15px", color:P.navy, fontFamily:font, outline:"none", boxSizing:"border-box" }} />
          <div style={{ fontSize:"13px", color:P.grey600, fontFamily:font, marginTop:"5px" }}>What this saved project is called in your list. Only you see it.</div>
        </div>
        <div style={{ marginBottom:"14px" }}>
          <label style={{ display:"block", fontSize:"16px", fontWeight:500, color:P.grey600, fontFamily:font, marginBottom:"6px" }}>Event name <span style={{ color:P.grey600, fontWeight:400 }}>· used in attendee emails</span></label>
          <input value={eventName} onChange={e => setEventName(e.target.value)} placeholder="e.g. Sales Summit 2026"
            style={{ width:"100%", background:P.grey50, border:`1.5px solid ${eventName&&eventName.trim()?P.accent+"88":P.grey100}`, borderRadius:"10px", padding:"11px 13px", fontSize:"15px", color:P.navy, fontFamily:font, outline:"none", boxSizing:"border-box" }} />
          <div style={{ fontSize:"13px", color:P.grey600, fontFamily:font, marginTop:"5px" }}>The name guests see in emails and on the report. Left blank, emails fall back to a generic phrase.</div>
        </div>
      </div>

      {/* ── Optional details drawer: collapses Travel + Contacts (Option F) ── */}
      <button onClick={() => setOptionalOpen(o => !o)} type="button"
        style={{ order:3, display:"flex", alignItems:"center", justifyContent:"space-between", width:"100%", background:P.white, border:`1px solid ${P.grey100}`, borderRadius:"14px", padding:"15px 20px", marginBottom:"14px", cursor:"pointer", boxShadow:"0 1px 2px rgba(12,30,63,0.04), 0 14px 30px -20px rgba(12,30,63,0.22)", boxSizing:"border-box" }}>
        <span style={{ display:"flex", alignItems:"center", gap:"10px" }}>
          <span style={{ display:"inline-flex", transform: optionalOpen ? "rotate(90deg)" : "none", transition:"transform 0.18s", color:P.grey600 }}><ChevronRight size={18} strokeWidth={2} /></span>
          <span style={{ fontSize:"16px", fontWeight:600, color:P.navy, fontFamily:font }}>Step 3 · Optional details</span>
          <span style={{ fontSize:"13px", fontWeight:400, color:P.grey600, fontFamily:font }}>· travel parameters and contacts</span>
        </span>
        <span style={{ fontSize:"13px", fontWeight:500, color: optionalCount ? P.accentD : P.grey600, fontFamily:font }}>{optionalCount ? `${optionalCount} added · ${optionalOpen ? "hide" : "edit"}` : (optionalOpen ? "hide" : "add — optional")}</span>
      </button>

      {/* Collapse wrapper holds Box 2 (Travel) + Box 3 (Contacts) */}
      <div style={{ order:3, display: optionalOpen ? "block" : "none" }}>

      {/* ── Box 2 · Travel parameters ── */}
      <div style={{ background:P.white, border:`1px solid ${P.grey100}`, borderRadius:"14px", padding:"18px 20px", marginBottom:"14px", boxShadow:"0 1px 2px rgba(12,30,63,0.04), 0 14px 30px -20px rgba(12,30,63,0.22)" }}>
        <div style={{ fontSize:"16px", fontWeight:600, color:P.navy, fontFamily:font, marginBottom:"3px" }}>Travel parameters <span style={{ fontSize:"13px", fontWeight:400, color:P.grey600 }}>· optional</span></div>
        <div style={{ fontSize:"12.5px", color:P.grey600, fontFamily:font, marginBottom:"16px", lineHeight:1.5 }}>Set your approved travel window, cutoffs, and airports. GroupGrid flags anyone who falls outside them. Skip this to run without travel flags.</div>

        {/* Arrival */}
        <div style={{ display:"flex", alignItems:"center", gap:"9px", marginBottom:"12px" }}>
          <PlaneIcon size={18} line={P.periwinkleD} accent={P.accent} />
          <span style={{ fontSize:"15px", fontWeight:600, color:P.navy, fontFamily:font }}>Arrival</span>
        </div>
        <div className="gg-setup-grid2" style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:"14px", marginBottom:"12px" }}>
          {[
            { label:"Earliest arrival", val:arrivalStart, set:setArrivalStart },
            { label:"Latest arrival", val:arrivalEnd, set:setArrivalEnd },
          ].map(({ label, val, set }) => (
            <div key={label}>
              <label style={{ display:"block", fontSize:"12.5px", fontWeight:500, color:P.grey600, fontFamily:font, marginBottom:"6px" }}>{label}</label>
              <input type="date" value={val} onChange={e => set(e.target.value)}
                style={{ width:"100%", background:P.grey50, border:`1.5px solid ${val?P.accent+"66":P.grey100}`, borderRadius:"10px", padding:"10px 13px", fontSize:"18px", color:val?P.navy:P.grey600, fontFamily:font, outline:"none", boxSizing:"border-box" }} />
            </div>
          ))}
        </div>
        <div className="gg-setup-grid2" style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:"14px", marginBottom:"10px" }}>
          <div>
            <label style={{ display:"block", fontSize:"12.5px", fontWeight:500, color:P.grey600, fontFamily:font, marginBottom:"6px" }}>Early-arrival cutoff</label>
            <input type="time" value={arrivalCutoff} onChange={e => setArrivalCutoff(e.target.value)}
              style={{ width:"100%", background:P.grey50, border:`1.5px solid ${arrivalCutoff?P.accent+"66":P.grey100}`, borderRadius:"10px", padding:"10px 13px", fontSize:"18px", color:arrivalCutoff?P.navy:P.grey600, fontFamily:font, fontWeight:600, outline:"none", boxSizing:"border-box" }} />
            <div style={{ fontSize:"11.5px", color:P.grey600, fontFamily:font, marginTop:"5px", lineHeight:1.4 }}>Lands before this, needs the night before.</div>
          </div>
          <div>
            <label style={{ display:"block", fontSize:"12.5px", fontWeight:500, color:P.grey600, fontFamily:font, marginBottom:"6px" }}>Arrival airport(s)</label>
            <input type="text" value={preferredAirports} onChange={e => setPreferredAirports(e.target.value)} placeholder="e.g. JFK, LGA"
              style={{ width:"100%", background:P.grey50, border:`1.5px solid ${preferredAirports?P.accent+"66":P.grey100}`, borderRadius:"10px", padding:"10px 13px", fontSize:"18px", color:preferredAirports?P.navy:P.grey600, fontFamily:font, fontWeight:600, outline:"none", boxSizing:"border-box" }} />
            <div style={{ fontSize:"11.5px", color:P.grey600, fontFamily:font, marginTop:"5px", lineHeight:1.4 }}>Codes for your arrival city.</div>
          </div>
        </div>
        <div className="gg-setup-grid2" style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:"14px", marginBottom:"10px" }}>
          <div>
            <label style={{ display:"block", fontSize:"12.5px", fontWeight:500, color:P.grey600, fontFamily:font, marginBottom:"6px" }}>Late-arrival cutoff</label>
            <input type="time" value={lateArrivalCutoff} onChange={e => setLateArrivalCutoff(e.target.value)}
              style={{ width:"100%", background:P.grey50, border:`1.5px solid ${lateArrivalCutoff?P.amber+"88":P.grey100}`, borderRadius:"10px", padding:"10px 13px", fontSize:"18px", color:lateArrivalCutoff?P.navy:P.grey600, fontFamily:font, fontWeight:600, outline:"none", boxSizing:"border-box" }} />
            <div style={{ fontSize:"11.5px", color:P.grey600, fontFamily:font, marginTop:"5px", lineHeight:1.4 }}>Lands after this with a room booked, flags a possible late arrival so you can tell the hotel to hold it. Default 10:30 PM. Clear to turn off.</div>
          </div>
          <div style={{ display:"flex", alignItems:"flex-end" }}>
            <button type="button" onClick={() => setLateArrivalCutoff(lateArrivalCutoff ? "" : "22:30")}
              style={{ background:"transparent", border:"none", color:P.periwinkleD, fontSize:"12.5px", fontWeight:600, fontFamily:font, cursor:"pointer", padding:"0 0 8px" }}>{lateArrivalCutoff ? "Turn off late-arrival flag" : "Turn on (10:30 PM)"}</button>
          </div>
        </div>
        <div style={{ display:"flex", gap:"8px", alignItems:"flex-start", fontSize:"13px", color:P.grey600, fontFamily:font, lineHeight:1.5, background:P.amber+"12", borderRadius:"9px", padding:"9px 12px", marginBottom:"16px" }}>
          <span style={{ flexShrink:0, marginTop:"1px" }}><FlagIcon size={14} line={P.amber} accent={P.amber} /></span>
          <span><strong style={{ color:P.navyLight, fontWeight:600 }}>Flags</strong> arrivals outside the window, early landings with no prior-night room, late arrivals after your cutoff, or landings at other airports.</span>
        </div>

        {/* Departure */}
        <div style={{ display:"flex", alignItems:"center", gap:"9px", marginBottom:"12px" }}>
          <span style={{ display:"inline-flex", transform:"scaleX(-1)" }}><PlaneIcon size={18} line={P.periwinkleD} accent={P.accent} /></span>
          <span style={{ fontSize:"15px", fontWeight:600, color:P.navy, fontFamily:font }}>Departure</span>
        </div>
        <div className="gg-setup-grid2" style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:"14px", marginBottom:"12px" }}>
          {[
            { label:"Earliest departure", val:departureStart, set:setDepartureStart },
            { label:"Latest departure", val:departureEnd, set:setDepartureEnd },
          ].map(({ label, val, set }) => (
            <div key={label}>
              <label style={{ display:"block", fontSize:"12.5px", fontWeight:500, color:P.grey600, fontFamily:font, marginBottom:"6px" }}>{label}</label>
              <input type="date" value={val} onChange={e => set(e.target.value)}
                style={{ width:"100%", background:P.grey50, border:`1.5px solid ${val?P.accent+"66":P.grey100}`, borderRadius:"10px", padding:"10px 13px", fontSize:"18px", color:val?P.navy:P.grey600, fontFamily:font, outline:"none", boxSizing:"border-box" }} />
            </div>
          ))}
        </div>
        <div className="gg-setup-grid2" style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:"14px", marginBottom:"10px" }}>
          <div>
            <label style={{ display:"block", fontSize:"12.5px", fontWeight:500, color:P.grey600, fontFamily:font, marginBottom:"6px" }}>Earliest departure time</label>
            <input type="time" value={departureCutoff} onChange={e => setDepartureCutoff(e.target.value)}
              style={{ width:"100%", background:P.grey50, border:`1.5px solid ${departureCutoff?P.accent+"66":P.grey100}`, borderRadius:"10px", padding:"10px 13px", fontSize:"18px", color:departureCutoff?P.navy:P.grey600, fontFamily:font, fontWeight:600, outline:"none", boxSizing:"border-box" }} />
            <div style={{ fontSize:"11.5px", color:P.grey600, fontFamily:font, marginTop:"5px", lineHeight:1.4 }}>Earliest a flight may leave that day.</div>
          </div>
          <div>
            <label style={{ display:"block", fontSize:"12.5px", fontWeight:500, color:P.grey600, fontFamily:font, marginBottom:"6px" }}>Departure airport(s)</label>
            <input type="text" value={departureAirports} onChange={e => setDepartureAirports(e.target.value)} placeholder="e.g. JFK, LGA"
              style={{ width:"100%", background:P.grey50, border:`1.5px solid ${departureAirports?P.accent+"66":P.grey100}`, borderRadius:"10px", padding:"10px 13px", fontSize:"18px", color:departureAirports?P.navy:P.grey600, fontFamily:font, fontWeight:600, outline:"none", boxSizing:"border-box" }} />
            <div style={{ fontSize:"11.5px", color:P.grey600, fontFamily:font, marginTop:"5px", lineHeight:1.4 }}>Codes for your departure city.</div>
          </div>
        </div>
        <div style={{ display:"flex", gap:"8px", alignItems:"flex-start", fontSize:"13px", color:P.grey600, fontFamily:font, lineHeight:1.5, background:P.amber+"12", borderRadius:"9px", padding:"9px 12px", marginBottom:"4px" }}>
          <span style={{ flexShrink:0, marginTop:"1px" }}><FlagIcon size={14} line={P.amber} accent={P.amber} /></span>
          <span><strong style={{ color:P.navyLight, fontWeight:600 }}>Flags</strong> departures outside the window, before your earliest time, or from other airports.</span>
        </div>

        {/* Arrival rules by attendee type */}
        <div style={{ marginTop:"18px", paddingTop:"14px", borderTop:`1px solid ${P.grey100}` }}>
          <div style={{ display:"flex", alignItems:"center", gap:"9px", marginBottom:"6px" }}>
            <PeopleIcon size={18} line={P.periwinkleD} accent={P.accent} />
            <span style={{ fontSize:"15px", fontWeight:600, color:P.navy, fontFamily:font }}>Arrival rules by attendee type</span>
          </div>
          <div style={{ fontSize:"12.5px", color:P.grey600, fontFamily:font, marginBottom:"12px", lineHeight:1.5 }}>Set an expected arrival day per attendee type, for example International and Speakers arrive Sunday, Domestic arrives Monday. Leave a type off the list, or set it to Any day, for no rule (like VIPs). The type must be a column in your registration list.</div>
          {typeRules.map(r => (
            <div key={r.id} style={{ display:"flex", alignItems:"center", gap:"8px", marginBottom:"8px", flexWrap:"wrap" }}>
              <input value={r.type} onChange={e => setTypeRules(prev => prev.map(x => x.id===r.id ? { ...x, type:e.target.value } : x))} placeholder="Attendee type (e.g. International)"
                style={{ flex:"1 1 180px", minWidth:0, background:P.grey50, border:`1.5px solid ${r.type?P.accent+"66":P.grey100}`, borderRadius:"9px", padding:"9px 12px", fontSize:"14px", color:P.navy, fontFamily:font, outline:"none", boxSizing:"border-box" }} />
              <select value={r.day} onChange={e => setTypeRules(prev => prev.map(x => x.id===r.id ? { ...x, day:e.target.value } : x))}
                style={{ flex:"0 0 160px", background:P.white, border:`1.5px solid ${P.grey200}`, borderRadius:"9px", padding:"9px 10px", fontSize:"14px", fontWeight:600, color:P.navy, fontFamily:font, cursor:"pointer", outline:"none" }}>
                <option value="">Any day (no rule)</option>
                <option value="0">Arrives Sunday</option>
                <option value="1">Arrives Monday</option>
                <option value="2">Arrives Tuesday</option>
                <option value="3">Arrives Wednesday</option>
                <option value="4">Arrives Thursday</option>
                <option value="5">Arrives Friday</option>
                <option value="6">Arrives Saturday</option>
                <option value="date">Arrives on exact date…</option>
              </select>
              {r.day === "date" && (
                <input type="date" value={r.date || ""} onChange={e => setTypeRules(prev => prev.map(x => x.id===r.id ? { ...x, date:e.target.value } : x))}
                  style={{ flex:"0 0 150px", background:P.grey50, border:`1.5px solid ${r.date?P.accent+"66":P.grey100}`, borderRadius:"9px", padding:"9px 10px", fontSize:"14px", color:P.navy, fontFamily:font, outline:"none", boxSizing:"border-box" }} />
              )}
              <button type="button" onClick={() => setTypeRules(prev => prev.filter(x => x.id!==r.id))} title="Remove rule"
                style={{ background:"transparent", border:"none", color:P.grey600, cursor:"pointer", flexShrink:0, padding:"4px" }}><X size={16} strokeWidth={1.8}/></button>
            </div>
          ))}
          <button type="button" onClick={() => setTypeRules(prev => [...prev, { id:Date.now(), type:"", day:"" }])}
            style={{ display:"inline-flex", alignItems:"center", gap:"6px", background:"transparent", border:"none", color:P.accentD, fontSize:"13px", fontWeight:600, fontFamily:font, cursor:"pointer", padding:"4px 0", marginTop:"2px" }}>
            <Plus size={14} strokeWidth={2}/> Add an attendee-type rule
          </button>
          <div style={{ display:"flex", gap:"8px", alignItems:"flex-start", fontSize:"13px", color:P.grey600, fontFamily:font, lineHeight:1.5, background:P.amber+"12", borderRadius:"9px", padding:"9px 12px", marginTop:"12px" }}>
            <span style={{ flexShrink:0, marginTop:"1px" }}><FlagIcon size={14} line={P.amber} accent={P.amber} /></span>
            <span><strong style={{ color:P.navyLight, fontWeight:600 }}>Flags</strong> anyone whose arrival day does not match the rule for their attendee type.</span>
          </div>
        </div>
      </div>

      {/* ── Box 3 · Contact details (expanded inline) ── */}
      <div style={{ background:P.white, border:`1px solid ${P.grey100}`, borderRadius:"14px", padding:"18px 20px", marginBottom:"14px", boxShadow:"0 1px 2px rgba(12,30,63,0.04), 0 14px 30px -20px rgba(12,30,63,0.22)" }}>
        <div style={{ fontSize:"16px", fontWeight:600, color:P.navy, fontFamily:font, marginBottom:"3px" }}>Contacts <span style={{ fontSize:"13px", fontWeight:400, color:P.grey600 }}>· optional</span></div>
        <div style={{ fontSize:"12.5px", color:P.grey600, fontFamily:font, marginBottom:"16px", lineHeight:1.5 }}>Add your hotel, travel agency, and transfer contacts so you can email them directly from your results.</div>
        {[
          { key:"hotel", label:"Hotel", color:P.navy },
          { key:"travel", label:"Travel agency", color:P.periwinkleD },
          { key:"car", label:"Car / transfer", color:P.accentD },
        ].map(({ key, label, color }) => (
          <div key={key} style={{ marginBottom:"14px" }}>
            <div style={{ display:"flex", alignItems:"center", gap:"8px", marginBottom:"8px" }}>
              <span style={{ width:3, height:14, background:color, borderRadius:"2px" }} />
              <span style={{ fontSize:"15px", fontWeight:600, color:P.navy, fontFamily:font }}>{label}</span>
            </div>
            <div className="gg-setup-grid2" style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:"12px" }}>
              <input value={contacts[key]?.name || ""} onChange={e => updateContact(key, "name", e.target.value)} placeholder="Contact name"
                style={{ width:"100%", background:P.grey50, border:`1.5px solid ${contacts[key]?.name?color+"55":P.grey100}`, borderRadius:"10px", padding:"10px 13px", fontSize:"15px", color:P.navy, fontFamily:font, outline:"none", boxSizing:"border-box" }} />
              <input type="email" value={contacts[key]?.email || ""} onChange={e => updateContact(key, "email", e.target.value)} placeholder="email@company.com"
                style={{ width:"100%", background:P.grey50, border:`1.5px solid ${contacts[key]?.email?color+"55":P.grey100}`, borderRadius:"10px", padding:"10px 13px", fontSize:"15px", color:P.navy, fontFamily:font, outline:"none", boxSizing:"border-box" }} />
            </div>
          </div>
        ))}
        <button onClick={() => setContactsOpen(true)}
          style={{ display:"inline-flex", alignItems:"center", gap:"7px", background:"transparent", border:"none", color:P.periwinkleD, fontSize:"15px", fontWeight:600, fontFamily:font, cursor:"pointer", padding:"4px 0", marginTop:"2px" }}>
          <PeopleIcon size={15} line={P.periwinkleD} accent={P.accent}/>
          More contact options (multiple hotels, phone, email signature)
        </button>
      </div>

      </div>
      {/* end optional details drawer */}

      <div style={{ order:2, background:P.white, border:`1px solid ${P.grey100}`, borderRadius:"14px", padding:"18px 20px", marginBottom:"14px", boxShadow:"0 1px 2px rgba(12,30,63,0.04), 0 14px 30px -20px rgba(12,30,63,0.22)", opacity: hasName ? 1 : 0.55, pointerEvents: hasName ? "auto" : "none", transition:"opacity 0.2s" }}>
        <div style={{ fontSize:"16px", fontWeight:600, color:P.navy, fontFamily:font, marginBottom:"3px" }}>Step 2 · Upload files {!hasName && <span style={{ fontSize:"13px", fontWeight:400, color:P.grey600 }}>· name your project first</span>}</div>
        <div style={{ fontSize:"13px", color:P.grey600, fontFamily:font, marginBottom:"14px" }}>Upload whatever you have — registration, flights, hotels, cars. GroupGrid cross-checks any 2 or more. Excel or CSV. Hover a tile for expected columns.</div>
        <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", gap:"10px", flexWrap:"wrap", marginBottom:"12px" }}>
          <span style={{ fontSize:"13px", fontWeight:500, color:P.grey600, fontFamily:font, textTransform:"uppercase", letterSpacing:"0.05em" }}>Upload any 2 or more</span>
          <button type="button" onClick={downloadAllTemplates}
            style={{ display:"inline-flex", alignItems:"center", gap:"6px", background:P.accent+"14", border:`1px solid ${P.accent}55`, borderRadius:"8px", padding:"6px 12px", fontSize:"13px", fontWeight:600, color:P.accentD, fontFamily:font, cursor:"pointer" }}>
            <Download size={14} strokeWidth={1.8}/> Download all templates (.zip)
          </button>
        </div>
        <div className="gg-setup-tiles3" style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:"10px", marginBottom:"14px" }}>
          <SetupTile label="Registration List" sub="Best anchor" icon={<PeopleIcon size={20} />} accent={P.accentD} file={registrationFile} setter={setRegistrationFile} templateType="registration" recommended columns={["First/Last Name (or Name)","Email","Company / Job Title (opt)","Requested Check-In / Out (opt)","Flight / Hotel Request (opt)"]} />
          <SetupTile label="Flight Manifest" sub=".xlsx, .csv, .pdf" icon={<PlaneIcon size={20} />} accent={P.periwinkleD} file={flightFile} setter={setFlightFile} templateType="flight" columns={["First/Last Name (or Name)","Email (opt)","Arrival Date","Departure Date","Flight # (opt)"]} />
          <SetupTile label="Hotel Roster" sub=".xlsx, .csv, .pdf" icon={<HotelIcon size={20} />} accent={P.navy} file={hotelFile} setter={setHotelFile} templateType="hotel" columns={["First/Last Name (or Name)","Email (opt)","Check-In Date","Check-Out Date","Hotel / Room (opt)"]} />
        </div>

        <ExtraUploads show={!!registrationFile} items={extraReg} setItems={setExtraReg} Icon={Users} color={P.accentD} />
        <ExtraUploads show={!!flightFile} items={extraFlights} setItems={setExtraFlights} Icon={Plane} color={P.periwinkleD} />
        {/* Multi-hotel: name the property and add more rooming lists */}
        {hotelFile && (
          <div style={{ background:P.grey50, border:`1px solid ${P.grey100}`, borderRadius:"12px", padding:"14px 16px", marginBottom:"14px" }}>
            <div style={{ fontSize:"15px", fontWeight:600, color:P.navy, fontFamily:font, marginBottom:"3px" }}>Hotel properties</div>
            <div style={{ fontSize:"13px", color:P.grey600, fontFamily:font, marginBottom:"12px", lineHeight:1.5 }}>Running more than one hotel? Name each property and add its rooming list. If a file already has a "Hotel" column, GroupGrid uses that automatically.</div>

            <div style={{ display:"flex", alignItems:"center", gap:"10px", marginBottom:"8px" }}>
              <Hotel size={16} strokeWidth={1.8} color="#C97A0A" style={{ flexShrink:0 }}/>
              <span style={{ fontSize:"16px", color:P.grey600, fontFamily:font, flex:"0 0 130px", overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{hotelFile.name}</span>
              <input value={hotelProperty} onChange={e => setHotelProperty(e.target.value)} placeholder="Property name (optional)"
                style={{ flex:1, background:P.white, border:`1.5px solid ${P.grey100}`, borderRadius:"8px", padding:"7px 11px", fontSize:"15px", color:P.navy, fontFamily:font, outline:"none", minWidth:0 }} />
            </div>

            {extraHotels.map((eh, idx) => (
              <div key={eh.id} style={{ display:"flex", alignItems:"center", gap:"10px", marginBottom:"8px" }}>
                <Hotel size={16} strokeWidth={1.8} color="#C97A0A" style={{ flexShrink:0 }}/>
                <label style={{ flex:"0 0 130px", overflow:"hidden" }}>
                  <input type="file" accept=".xlsx,.xls,.csv" style={{ display:"none" }} onChange={e => { const f = e.target.files[0]; if (f) setExtraHotels(prev => prev.map(x => x.id===eh.id ? { ...x, file:f } : x)); }} />
                  <span style={{ display:"inline-block", fontSize:"15px", color:eh.file?P.navy:P.periwinkleD, fontFamily:font, cursor:"pointer", overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap", maxWidth:"130px", fontWeight:500 }}>{eh.file ? eh.file.name : "+ choose file"}</span>
                </label>
                <input value={eh.property} onChange={e => setExtraHotels(prev => prev.map(x => x.id===eh.id ? { ...x, property:e.target.value } : x))} placeholder="Property name (optional)"
                  style={{ flex:1, background:P.white, border:`1.5px solid ${P.grey100}`, borderRadius:"8px", padding:"7px 11px", fontSize:"15px", color:P.navy, fontFamily:font, outline:"none", minWidth:0 }} />
                <button onClick={() => setExtraHotels(prev => prev.filter(x => x.id !== eh.id))} style={{ background:"transparent", border:"none", color:P.grey600, cursor:"pointer", flexShrink:0 }} title="Remove"><X size={15} strokeWidth={1.8}/></button>
              </div>
            ))}

            <button onClick={() => setExtraHotels(prev => [...prev, { id:Date.now(), file:null, property:"" }])}
              style={{ background:"transparent", border:"none", color:P.accentD, fontSize:"15px", fontWeight:500, fontFamily:font, cursor:"pointer", marginTop:"4px", padding:"4px 0" }}>+ Add another hotel property</button>
          </div>
        )}

        <div style={{ fontSize:"13px", fontWeight:500, color:P.grey600, fontFamily:font, textTransform:"uppercase", letterSpacing:"0.05em", marginBottom:"12px" }}>More files</div>
        <div className="gg-setup-tiles2" style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:"10px" }}>
          <SetupTile label="Car Transfers" sub=".xlsx, .csv, .pdf" icon={<CarIcon size={20} />} accent={P.grey600} file={carFile} setter={setCarFile} templateType="car" columns={["First/Last Name (or Name)","Email (opt)","Pickup Date","Dropoff Date","Pickup Location (opt)"]} />
          <SetupTile label="Abstract Submissions" sub=".xlsx, .csv, .pdf" icon={<SpreadsheetIcon size={20} />} accent={P.purple} file={abstractFile} setter={setAbstractFile} templateType="abstract" columns={["First/Last Name (or Name)","Email","Abstract Title (opt)","Status (opt)"]} />
          {SHOW_DIETARY && <SetupTile label="Dietary & Access" sub=".xlsx, .csv, .pdf" icon={<Salad size={20} strokeWidth={1.8} color="#0D9E6E"/>} accent={P.teal} file={dietaryFile} setter={setDietaryFile} templateType="dietary" columns={["First/Last Name (or Name)","Email (opt)","Dietary Restrictions","Accessibility Needs","Special Notes (opt)"]} />}
        </div>
        <ExtraUploads show={!!carFile} items={extraCars} setItems={setExtraCars} Icon={Car} color={P.grey600} />
        {SHOW_DIETARY && <ExtraUploads show={!!dietaryFile} items={extraDietary} setItems={setExtraDietary} Icon={Salad} color="#0D9E6E" />}
        <div style={{ fontSize:"15px", color:P.navyLight, fontFamily:font, marginTop:"16px", padding:"10px 13px", background:P.periwinkle+"0D", borderRadius:"9px", border:`1px solid ${P.periwinkle}22`, lineHeight:1.5 }}>
          <span style={{ background:P.periwinkle+"22", color:P.periwinkleD, borderRadius:"5px", padding:"1px 7px", fontSize:"15px", fontWeight:600, marginRight:"7px" }}>TIP</span>
          Include an <strong style={{ fontWeight:600 }}>Email Address</strong> column for the most accurate matching. GroupGrid matches by email first, then name.
        </div>
      </div>
      </div>

      <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", gap:"14px", background:P.navy, borderRadius:"12px", padding:"13px 18px", flexWrap:"wrap" }}>
        <div style={{ fontSize:"15px", color:"rgba(255,255,255,0.6)", fontFamily:font }}>
          {!hasName ? "Name your event to begin." : !ready ? "Upload at least 2 files to cross-check." : "Ready to run."}
        </div>
        <div style={{ display:"flex", alignItems:"center", gap:"12px" }}>
          {error && <span style={{ fontSize:"15px", color:"#FFB3AB", fontFamily:font }}>{error}</span>}
          <button onClick={runCheck} disabled={!canRun}
            style={{ background:canRun?P.accent:"rgba(255,255,255,0.15)", color:canRun?P.white:"rgba(255,255,255,0.4)", border:"none", borderRadius:"10px", padding:"11px 24px", fontSize:"15px", fontWeight:600, fontFamily:font, cursor:canRun?"pointer":"not-allowed", transition:"all 0.18s", whiteSpace:"nowrap", display:"inline-flex", alignItems:"center", gap:"8px" }}>
            <span>{loading ? "Checking…" : isReRun ? "Re-run Cross-Check" : "Run Cross-Check"}</span>
            {!loading && <CrossCheckIcon size={17} line={canRun?"rgba(255,255,255,0.92)":"rgba(255,255,255,0.4)"} accent={canRun?P.white:"rgba(255,255,255,0.4)"} />}
          </button>
        </div>
      </div>
    </div>
  );
}

// Multi-select dropdown for a group of report columns. Checkmarks + live count.
function ReportFieldDropdown({ group, fields, selected, onToggle, onSetGroup }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  useEffect(() => {
    if (!open) return;
    const onDoc = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [open]);
  const count = fields.filter(f => selected.has(f.key)).length;
  const allOn = count === fields.length && count > 0;
  return (
    <div ref={ref} style={{ position:"relative" }}>
      <button type="button" onClick={() => setOpen(o => !o)}
        style={{ display:"inline-flex", alignItems:"center", gap:"8px", background:P.white, border:`1.5px solid ${count?P.accent+"66":P.grey200}`, borderRadius:"9px", padding:"8px 13px", fontSize:"16px", fontWeight:600, color:P.navy, fontFamily:font, cursor:"pointer" }}>
        {group}
        <span style={{ background:count?P.accent+"1F":P.grey100, color:count?P.accentD:P.grey600, borderRadius:"20px", fontSize:"13px", fontWeight:700, padding:"1px 8px", minWidth:"20px", textAlign:"center" }}>{count}</span>
        <ChevronDown size={15} strokeWidth={2} style={{ color:P.grey400, transform: open?"rotate(180deg)":"none", transition:"transform 0.15s" }} />
      </button>
      {open && (
        <div style={{ position:"absolute", zIndex:40, top:"calc(100% + 6px)", left:0, minWidth:"216px", background:P.white, border:`1px solid ${P.grey200}`, borderRadius:"11px", boxShadow:"0 10px 30px rgba(12,30,63,0.18)", padding:"6px" }}>
          <div onClick={() => onSetGroup(fields.map(f => f.key), !allOn)}
            style={{ display:"flex", alignItems:"center", justifyContent:"space-between", padding:"6px 9px 8px", margin:"0 0 4px", borderBottom:`1px solid ${P.grey100}`, cursor:"pointer", fontSize:"14px", fontWeight:600, color:P.periwinkleD, fontFamily:font }}>
            <span>{allOn ? "Clear all" : "Select all"}</span>
            <span style={{ fontSize:"13px", color:P.grey600, fontWeight:500 }}>{count}/{fields.length}</span>
          </div>
          {fields.map(fl => {
            const on = selected.has(fl.key);
            return (
              <div key={fl.key} onClick={() => onToggle(fl.key)}
                style={{ display:"flex", alignItems:"center", gap:"9px", padding:"8px 9px", borderRadius:"7px", fontSize:"16px", color:P.navy, fontFamily:font, cursor:"pointer" }}
                onMouseEnter={e => e.currentTarget.style.background = P.grey50}
                onMouseLeave={e => e.currentTarget.style.background = "transparent"}>
                <span style={{ width:16, height:16, borderRadius:"5px", background:on?P.accent:P.white, border:`1.5px solid ${on?P.accent:P.grey200}`, display:"inline-flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}>{on && <Check size={11} strokeWidth={3} color={P.white} />}</span>
                {fl.label}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

const REPORT_PRESETS = {
  general: ["lastName","firstName","email","company","note","status","issues","flightArrival","arrivalTime","arrivalAirport","flightIn","flightDeparture","departureTime","departureAirport","flightOut","hotel","checkIn","checkOut","room","carPickup","carPickupTime","carDropoff"],
  hotel: ["lastName","firstName","email","note","hotel","checkIn","checkOut","room","status","issues"],
  car: ["lastName","firstName","email","note","carPickup","carPickupTime","carDropoff","status","issues"],
  travel: ["lastName","firstName","email","note","flightArrival","arrivalTime","arrivalAirport","flightIn","flightDeparture","departureTime","departureAirport","flightOut","status","issues"],
};

function GroupGrid({ user, onLogin, onLogout }) {
  const isMobile = useIsMobile();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [flightFile, setFlightFile] = useState(null);
  const [hotelFile, setHotelFile] = useState(null);
  const [hotelProperty, setHotelProperty] = useState(""); // optional property name for the primary hotel file
  const [extraHotels, setExtraHotels] = useState([]); // [{ id, file, property }] additional hotel properties
  const [extraFlights, setExtraFlights] = useState([]); // [{ id, file, source }]
  const [extraCars, setExtraCars] = useState([]);
  const [extraReg, setExtraReg] = useState([]);
  const [extraDietary, setExtraDietary] = useState([]);
  const [carFile, setCarFile] = useState(null);
  const [dietaryFile, setDietaryFile] = useState(null);
  const [abstractFile, setAbstractFile] = useState(null);
  const [registrationFile, setRegistrationFile] = useState(null);
  const [results, setResults] = useState(null);
  const [timeFormat, setTimeFormat] = useState("ampm"); // "ampm" | "24hr"
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [filter, setFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [expanded, setExpanded] = useState(null);
  const [windowOpen, setWindowOpen] = useState(false);
  const [arrivalStart, setArrivalStart] = useState("");
  const [arrivalEnd, setArrivalEnd] = useState("");
  const [departureStart, setDepartureStart] = useState("");
  const [departureEnd, setDepartureEnd] = useState("");
  const [preferredAirports, setPreferredAirports] = useState(""); // arrival-side airports (key kept for saved-project compatibility)
  const [departureAirports, setDepartureAirports] = useState(""); // departure-side airports; empty = falls back to arrival list
  const [arrivalCutoff, setArrivalCutoff] = useState(""); // "HH:MM" — early-arrival cutoff; empty = off
  const [departureCutoff, setDepartureCutoff] = useState(""); // "HH:MM" — earliest allowed departure time; empty = off
  const [lateArrivalCutoff, setLateArrivalCutoff] = useState("22:30"); // "HH:MM" — flag arrivals after this as possible late arrivals; empty = off
  const [typeRules, setTypeRules] = useState([]); // [{ id, type, day }] — day is "0".."6" (Sun..Sat) or "" for no rule
  const [lastRunSig, setLastRunSig] = useState(""); // snapshot of params at last run, to detect post-run edits
  const [eventName, setEventName] = useState("");
  const [projectName, setProjectName] = useState(""); // internal save label, distinct from eventName (used in comms)
  const [emailModal, setEmailModal] = useState(null);
  const [meta, setMeta] = useState({});
  const [activeTab, setActiveTab] = useState("grid");
  const [reportTarget, setReportTarget] = useState("general");
  const [reportFields, setReportFields] = useState(() => new Set(REPORT_PRESETS.general));
  const [showSetup, setShowSetup] = useState(false); // edit setup while keeping results
  const [page, setPage] = useState(() => (typeof window !== "undefined" ? pathToPage(window.location.pathname) : "landing")); // "landing" | "app" | "pricing" | "contact" | "about" | "privacy" | "terms"
  const [compareSession, setCompareSession] = useState(null); // session to diff against
  const [showDiff, setShowDiff] = useState(false);
  const [saveMsg, setSaveMsg] = useState("");
  const [autoSaveStatus, setAutoSaveStatus] = useState("idle"); // "idle" | "saving" | "saved"
  const [shareModal, setShareModal] = useState(null); // null | { html, filename }
  const isDirty = useRef(false); // tracks unsaved changes since last autosave
  const tableScrollRef = useRef(null);
  const [tableScrollTop, setTableScrollTop] = useState(0);
  const TABLE_ROW_HEIGHT = 44;
  const TABLE_EXPANDED_HEIGHT = 320;
  const TABLE_VISIBLE_ROWS = 16; // rows visible at once (~600px container)
  const [savedSessions, setSavedSessions] = useState([]);
  const [contacts, setContacts] = useState({ hotel:{name:"",email:"",phone:"",property:""}, travel:{name:"",email:"",phone:"",agency:""}, car:{name:"",email:"",phone:"",vendor:""}, hotels:[], plannerName:"" });
  const [contactsOpen, setContactsOpen] = useState(false);
  const [supportOpen, setSupportOpen] = useState(false);
  const [loginOpen, setLoginOpen] = useState(false);
  // Auth gate: the app (cross-check tool) requires login. Marketing pages stay public.
  // If logged in, enter the app; otherwise open the login modal and stay on the current marketing page.
  function enterApp() {
    if (user) { setPage("app"); }
    else { setLoginOpen(true); }
  }
  // Safety guard: if a logged-out user ends up on the app view (e.g. after logout, or a stale state),
  // bounce them back to the public landing page and prompt login. The app requires authentication.
  useEffect(() => {
    if (!user && page === "app") { setPage("landing"); setLoginOpen(true); }
  }, [user, page]);
  // Keep the URL in sync with the current page so deep links, refresh, and back/forward work.
  useEffect(() => {
    if (typeof window === "undefined") return;
    const target = PAGE_PATHS[page] || "/";
    if (window.location.pathname !== target) window.history.pushState({ page }, "", target);
  }, [page]);
  useEffect(() => {
    if (typeof window === "undefined") return;
    const onPop = () => setPage(pathToPage(window.location.pathname));
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, []);
  const [sortBy, setSortBy] = useState(null);       // null | "name" | "status" | "arrival" | "checkin" | "departure" | "checkout"
  const [sortDir, setSortDir] = useState("asc");    // "asc" | "desc"
  const [selectedRows, setSelectedRows] = useState(new Set()); // set of record keys

  const hasWindow = arrivalStart || arrivalEnd || departureStart || departureEnd;

  // ── Persistent storage via localStorage ──────────────────────────────────────
  // Replaces window.storage (Claude artifact API) with standard browser localStorage.
  // Same interface throughout: storage.get(key) → { value } | null, storage.set(key, val), storage.delete(key)
  const storage = {
    get: (key) => {
      try {
        const val = localStorage.getItem(key);
        return val !== null ? { value: val } : null;
      } catch(e) { return null; }
    },
    set: (key, val) => {
      try { localStorage.setItem(key, val); return true; } catch(e) { return null; }
    },
    delete: (key) => {
      try { localStorage.removeItem(key); return true; } catch(e) { return null; }
    },
  };

  const storageKey = `groupgrid-sessions-${user?.email || "anonymous"}`;
  const metaKey    = `groupgrid-activemeta-${user?.email || "anonymous"}`;

  // Load saved sessions + meta on mount / when user changes
  useEffect(() => {
    function load() {
      try {
        const raw = storage.get(storageKey);
        if (raw) setSavedSessions(JSON.parse(raw.value));
        else setSavedSessions([]);
      } catch(e) { setSavedSessions([]); }
      try {
        const rawMeta = storage.get(metaKey);
        if (rawMeta) setMeta(JSON.parse(rawMeta.value));
        else setMeta({});
      } catch(e) { setMeta({}); }
    }
    load();
  }, [storageKey]);

  // Persist meta continuously (debounced 600ms)
  useEffect(() => {
    const t = setTimeout(() => {
      try { storage.set(metaKey, JSON.stringify(meta)); } catch(e) {}
    }, 600);
    return () => clearTimeout(t);
  }, [meta, metaKey]);

  // Mark dirty whenever meaningful state changes
  useEffect(() => { if (results) isDirty.current = true; }, [results, meta, eventName, arrivalStart, arrivalEnd, departureStart, departureEnd]);

  // Autosave every 30 seconds when there are results and something changed.
  // We keep the latest state in a ref so the interval can read current values
  // WITHOUT the effect tearing down and restarting the timer on every edit
  // (the old bug: every note/date change reset the 60s countdown, so it rarely fired).
  const autosaveData = useRef({});
  useEffect(() => {
    autosaveData.current = { results, meta, projectName, eventName, arrivalStart, arrivalEnd, departureStart, departureEnd, preferredAirports, departureAirports, arrivalCutoff, departureCutoff, lateArrivalCutoff, typeRules, storageKey };
  }, [results, meta, eventName, arrivalStart, arrivalEnd, departureStart, departureEnd, storageKey]);

  useEffect(() => {
    const interval = setInterval(() => {
      if (!isDirty.current) return;
      const d = autosaveData.current;
      if (!d.results) return;
      setAutoSaveStatus("saving");
      setTimeout(() => {
        const session = {
          id: Date.now(),
          name: d.projectName || d.eventName || `Session ${new Date().toLocaleDateString()}`,
          date: new Date().toISOString(),
          meta: d.meta, projectName: d.projectName, eventName: d.eventName, arrivalStart: d.arrivalStart, arrivalEnd: d.arrivalEnd, departureStart: d.departureStart, departureEnd: d.departureEnd,
          preferredAirports: d.preferredAirports, departureAirports: d.departureAirports, arrivalCutoff: d.arrivalCutoff, departureCutoff: d.departureCutoff, lateArrivalCutoff: d.lateArrivalCutoff, typeRules: d.typeRules,
          guestCount: d.results.length,
          issueCount: d.results.filter(r => r.status !== "ok").length,
          autoSaved: true,
          results: d.results,
        };
        setSavedSessions(prev => {
          const next = [session, ...prev.filter(s => s.name !== session.name)].slice(0, 50);
          try {
            storage.set(d.storageKey, JSON.stringify(next));
          } catch(e) {
            try {
              const trimmed = next.map((s, i) => i === 0 ? s : { ...s, results: undefined });
              storage.set(d.storageKey, JSON.stringify(trimmed));
            } catch(e2) {}
          }
          return next;
        });
        isDirty.current = false;
        setAutoSaveStatus("saved");
        setTimeout(() => setAutoSaveStatus("idle"), 3000);
      }, 300);
    }, 30000);
    return () => clearInterval(interval);
  }, []); // run once; reads live state via the ref so the timer never resets

  async function readXlsx(file) {
    const isPdf = (file.type && file.type.indexOf("pdf") >= 0) || /\.pdf$/i.test(file.name || "");
    if (isPdf) return extractPdfToWorkbook(file);
    return new Promise((res, rej) => {
      const r = new FileReader();
      r.onload = e => { try { res(XLSX.read(e.target.result, { type:"array", cellDates:true })); } catch (err) { rej(err); } };
      r.onerror = rej;
      r.readAsArrayBuffer(file);
    });
  }

  async function runCheck() {
    if (uploadedCount < 2) return;
    setLoading(true); setError(null); setExpanded(null);
    try {
      let flights = [], hotels = [], cars = [], dietary = [], registration = [], abstracts = [];
      if (flightFile)       { const w = await readXlsx(flightFile);       flights = tagSrc(parseFlightSheet(w), flightFile.name); }
      for (const ex of extraFlights) { if (ex.file) { const w = await readXlsx(ex.file); flights = flights.concat(tagSrc(parseFlightSheet(w), ex.source || ex.file.name)); } }
      if (hotelFile)        { const w = await readXlsx(hotelFile);        hotels = tagSrc(parseHotelSheetTagged(w, hotelProperty), hotelProperty || hotelFile.name); }
      for (const eh of extraHotels) { if (eh.file) { const w = await readXlsx(eh.file); hotels = hotels.concat(tagSrc(parseHotelSheetTagged(w, eh.property), eh.property || eh.file.name)); } }
      if (carFile)          { const w = await readXlsx(carFile);          cars = tagSrc(parseCarSheet(w), carFile.name); }
      for (const ex of extraCars) { if (ex.file) { const w = await readXlsx(ex.file); cars = cars.concat(tagSrc(parseCarSheet(w), ex.source || ex.file.name)); } }
      if (dietaryFile)      { const w = await readXlsx(dietaryFile);      dietary = tagSrc(parseDietarySheet(w), dietaryFile.name); }
      for (const ex of extraDietary) { if (ex.file) { const w = await readXlsx(ex.file); dietary = dietary.concat(tagSrc(parseDietarySheet(w), ex.source || ex.file.name)); } }
      if (registrationFile) { const w = await readXlsx(registrationFile); registration = tagSrc(parseRegistrationSheet(w), registrationFile.name); }
      for (const ex of extraReg) { if (ex.file) { const w = await readXlsx(ex.file); registration = registration.concat(tagSrc(parseRegistrationSheet(w), ex.source || ex.file.name)); } }
      if (abstractFile)     { const w = await readXlsx(abstractFile);     abstracts = tagSrc(parseAbstractSheet(w), abstractFile.name); }
      const aw = { arrivalStart:parseDate(arrivalStart), arrivalEnd:parseDate(arrivalEnd), departureStart:parseDate(departureStart), departureEnd:parseDate(departureEnd), preferredAirports: preferredAirports.split(",").map(s=>s.trim()).filter(Boolean), departureAirports: departureAirports.split(",").map(s=>s.trim()).filter(Boolean), arrivalCutoff, departureCutoff, lateArrivalCutoff, typeRules };
      const allResults = crossMatch(flights, hotels, cars, dietary, aw, meta, registration, abstracts);
      setResults(allResults); setShowSetup(false);
      setLastRunSig(JSON.stringify({ arrivalStart, arrivalEnd, departureStart, departureEnd, preferredAirports, departureAirports, arrivalCutoff, departureCutoff, lateArrivalCutoff, typeRules, eventName }));
    } catch (err) { setError("Could not read files: " + err.message); }
    setLoading(false);
  }

  function updateMeta(record, update) {
    const key = record.email || record.key;
    setMeta(prev => ({ ...prev, [key]: { ...prev[key], ...update } }));
    setResults(prev => prev ? prev.map(r => {
      if ((r.email || r.key) !== key) return r;
      const updated = { ...r, ...update };
      const active = updated.issues.filter(x => !(updated.resolved || []).includes(x.text));
      updated.status = active.length === 0 ? "ok" : active.length === 1 ? "warn" : "error";
      return updated;
    }) : prev);
  }

  function toggleResolve(record, issueText) {
    const current = record.resolved || [];
    const resolved = current.includes(issueText) ? current.filter(x => x !== issueText) : [...current, issueText];
    updateMeta(record, { resolved });
  }

  function saveSession() {
    if (!results) return;
    const session = { id:Date.now(), name:(projectName||eventName)||`Session ${new Date().toLocaleDateString()}`, date:new Date().toISOString(), meta, projectName, eventName, arrivalStart, arrivalEnd, departureStart, departureEnd, preferredAirports, departureAirports, arrivalCutoff, departureCutoff, lateArrivalCutoff, typeRules, guestCount:results.length, issueCount:results.filter(r=>r.status!=="ok").length, results };
    const next = [session, ...savedSessions.filter(s => s.name !== session.name)].slice(0, 50);
    setSavedSessions(next);
    try {
      storage.set(storageKey, JSON.stringify(next));
    } catch(e) {
      // localStorage quota exceeded — retry without the heavy results arrays on older sessions
      try {
        const trimmed = next.map((s, i) => i === 0 ? s : { ...s, results: undefined });
        storage.set(storageKey, JSON.stringify(trimmed));
      } catch(e2) {}
    }
    isDirty.current = false;
    setAutoSaveStatus("idle");
    setSaveMsg(user ? "Saved to this device" : "Saved to this device");
    setTimeout(() => setSaveMsg(""), 3000);
  }

  // Multi-hotel: build and send a separate guest list to each property's contact, containing only that property's guests.
  function exportToHotelsByProperty() {
    if (!XLSX) { setError("Spreadsheet library not loaded."); return; }
    const propContacts = (contacts.hotels || []).filter(h => h.email && h.property);
    if (propContacts.length === 0) { setContactsOpen(true); return; }
    let sent = 0;
    propContacts.forEach((pc, idx) => {
      const propRows = filtered.filter(r => (r.hotel?.hotel || "").trim().toLowerCase() === pc.property.trim().toLowerCase());
      if (propRows.length === 0) return;
      const rows = propRows.map(r => ({
        "Guest": r.displayName, "Email": r.email||"—",
        "Status": {ok:"Aligned",warn:"1 Issue",error:"Action Needed"}[r.status],
        "Active Issues": r.issues.filter(x=>!(r.resolved||[]).includes(x.text)).map(x=>x.text).join("; ")||"None",
        "Hotel": r.hotel?.hotel||"—", "Check-In": fmt(r.hotel?.checkIn), "Check-Out": fmt(r.hotel?.checkOut), "Room/Conf": r.hotel?.room||"—",
        "Note": r.note||"—",
      }));
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(rows), "Rooming List");
      XLSX.writeFile(wb, `groupgrid-${(eventName||"event").replace(/\s+/g,"-")}-${pc.property.replace(/\s+/g,"-")}.xlsx`);
      const subject = encodeURIComponent(`${eventName||"Event"} — Rooming list for ${pc.property}`);
      const body = encodeURIComponent(`Dear ${pc.name||"Team"},\n\nAttached is the current rooming list for ${pc.property} (${propRows.length} guests) for ${eventName||"our event"}.\n\nThe Excel file has been downloaded to your device — please attach it before sending.\n\nThank you,\n${contacts.plannerName||"[Your Name]"}`);
      setTimeout(() => window.open(`mailto:${pc.email}?subject=${subject}&body=${body}`, "_blank"), 300 * (idx+1));
      sent++;
    });
    if (sent === 0) setError("No guests matched your hotel properties. Check the property names match the rooming lists.");
  }

  function exportToContact(contactType) {
    
    if (!XLSX) { setError("Spreadsheet library not loaded."); return; }
    // Multi-hotel routing: if sending to "hotel" and per-property contacts exist, send each property its own list.
    if (contactType === "hotel" && Array.isArray(contacts.hotels) && contacts.hotels.filter(h=>h.email).length > 0) {
      return exportToHotelsByProperty();
    }
    const contact = contacts[contactType];
    if (!contact?.email) { setContactsOpen(true); return; }
    const rows = filtered.map(r => ({
      "Guest": r.displayName, "Email": r.email||"—",
      "Status": {ok:"Aligned",warn:"1 Issue",error:"Action Needed"}[r.status],
      "Active Issues": r.issues.filter(x=>!(r.resolved||[]).includes(x.text)).map(x=>x.text).join("; ")||"None",
      "Flight Arrival": fmt(r.flight?.flightArrival), "Arrival Time": fmtTime(r.flight?.arrivalTime, timeFormat)||"—", "Arrival Airport": (r.flight?.arrivalAirport||r.flight?.airport||"").toUpperCase()||"—", "Hotel Check-In": fmt(r.hotel?.checkIn), "Arrival Δ": r.details?.arrDiff??"N/A",
      "Flight Departure": fmt(r.flight?.flightDeparture), "Departure Time": fmtTime(r.flight?.departureTime, timeFormat)||"—", "Departure Airport": (r.flight?.departureAirport||r.flight?.airport||"").toUpperCase()||"—", "Hotel Check-Out": fmt(r.hotel?.checkOut), "Departure Δ": r.details?.depDiff??"N/A",
      "Car Pickup": fmt(r.car?.pickupDate), "Car Pickup Time": fmtTime(r.car?.pickupTime, timeFormat)||"—", "Car Dropoff": fmt(r.car?.dropoffDate), "Car Dropoff Time": fmtTime(r.car?.dropoffTime, timeFormat)||"—",
      "Hotel": r.hotel?.hotel||"—", "Room/Conf": r.hotel?.room||"—",
      "Dietary": r.diet?.dietary||"—", "Accessibility": r.diet?.accessibility||"—",
      "Note": r.note||"—",
    }));
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(rows), "GroupGrid Report");
    const filename = `groupgrid-${(eventName||"report").replace(/\s+/g,"-")}-for-${contact.name||contactType}.xlsx`;
    XLSX.writeFile(wb, filename);
    // Open mailto with the file ready (browsers can't attach files via mailto, so we open email + note)
    const subject = encodeURIComponent(`${eventName||"Event"} — Guest Report`);
    const issueCount = filtered.filter(r=>r.status!=="ok").length;
    const body = encodeURIComponent(
      `Dear ${contact.name||"Team"},\n\nPlease find attached the latest guest report for ${eventName||"our upcoming event"}.\n\nSummary:\n• Total Guests: ${filtered.length}\n• Aligned: ${filtered.filter(r=>r.status==="ok").length}\n• Issues: ${issueCount}\n\nThe Excel report has been downloaded to your device. Please attach it to this email before sending.\n\nThank you,\n[Your Name]`
    );
    setTimeout(() => window.open(`mailto:${contact.email}?subject=${subject}&body=${body}`, "_blank"), 300);
  }

  function exportReport() {
    const rows = filtered.map(r => ({ "First Name":r.firstName||r.displayName.split(" ")[0]||"—", "Last Name":r.lastName||r.displayName.split(" ").slice(1).join(" ")||"—", "Full Name":r.displayName, "Email":r.email||"—", "Registered":r.reg?"Yes":(r.registered?"Yes":"No"), "Status":{ok:"Aligned",warn:"1 Issue",error:"Action Needed"}[r.status], "Active Issues":r.issues.filter(x=>!(r.resolved||[]).includes(x.text)).map(x=>x.text).join("; ")||"None", "Resolved":r.resolved?.join("; ")||"—", "Note":r.note||"—", "Note By":r.noteBy||"—", "Note Added":r.noteAt ? new Date(r.noteAt).toLocaleString() : "—", "Company":r.reg?.company||"—", "Job Title":r.reg?.jobTitle||"—", "Requested Check-In":fmt(r.reg?.regCheckIn), "Requested Check-Out":fmt(r.reg?.regCheckOut), "Dietary":r.diet?.dietary||r.reg?.dietaryRequest||"—", "Accessibility":r.diet?.accessibility||"—", "Flight Arrival":fmt(r.flight?.flightArrival), "Arrival Time":fmtTime(r.flight?.arrivalTime, timeFormat)||"—", "Hotel Check-In":fmt(r.hotel?.checkIn), "Arrival Δ":r.details?.arrDiff??"N/A", "Flight Departure":fmt(r.flight?.flightDeparture), "Departure Time":fmtTime(r.flight?.departureTime, timeFormat)||"—", "Hotel Check-Out":fmt(r.hotel?.checkOut), "Departure Δ":r.details?.depDiff??"N/A", "Car Pickup":fmt(r.car?.pickupDate), "Car Pickup Time":fmtTime(r.car?.pickupTime, timeFormat)||"—", "Car Dropoff":fmt(r.car?.dropoffDate), "Car Dropoff Time":fmtTime(r.car?.dropoffTime, timeFormat)||"—", "Hotel":r.hotel?.hotel||"—", "Room":r.hotel?.room||"—", "Arrival Airport":(r.flight?.arrivalAirport||r.flight?.airport||"").toUpperCase()||"—", "Departure Airport":(r.flight?.departureAirport||r.flight?.airport||"").toUpperCase()||"—", "Matched By":r.matchedBy, "Sources":[r.reg?.source, r.flight?.source, r.hotel?.source, r.car?.source, r.diet?.source].filter(Boolean).filter((v,i,a)=>a.indexOf(v)===i).join(", ")||"—" }));
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(rows), "GroupGrid");
    XLSX.writeFile(wb, `groupgrid-${(eventName||"report").replace(/\s+/g,"-")}-${new Date().toISOString().slice(0,10)}.xlsx`);
  }

  function toggleSort(col) {
    if (sortBy === col) setSortDir(d => d === "asc" ? "desc" : "asc");
    else { setSortBy(col); setSortDir("asc"); }
  }

  function sortedFiltered(rows) {
    if (!sortBy) return rows;
    return [...rows].sort((a, b) => {
      let av, bv;
      if (sortBy === "name" || sortBy === "lastName")  { av = (a.lastName||a.displayName).toLowerCase(); bv = (b.lastName||b.displayName).toLowerCase(); }
      else if (sortBy === "firstName") { av = (a.firstName||a.displayName).toLowerCase(); bv = (b.firstName||b.displayName).toLowerCase(); }
      else if (sortBy === "email") { av = (a.email||"").toLowerCase(); bv = (b.email||"").toLowerCase(); }
      else if (sortBy === "status") { const o = {ok:0,warn:1,error:2}; av = o[a.status]??0; bv = o[b.status]??0; }
      else if (sortBy === "arrival")  { av = a.flight?.flightArrival?.getTime()??0; bv = b.flight?.flightArrival?.getTime()??0; }
      else if (sortBy === "checkin")  { av = a.hotel?.checkIn?.getTime()??0; bv = b.hotel?.checkIn?.getTime()??0; }
      else if (sortBy === "departure"){ av = a.flight?.flightDeparture?.getTime()??0; bv = b.flight?.flightDeparture?.getTime()??0; }
      else if (sortBy === "checkout") { av = a.hotel?.checkOut?.getTime()??0; bv = b.hotel?.checkOut?.getTime()??0; }
      else if (sortBy === "hotel")    { av = (a.hotel?.hotel||"").toLowerCase(); bv = (b.hotel?.hotel||"").toLowerCase(); }
      else if (sortBy === "flags")    { av = a.issues.filter(x=>!(a.resolved||[]).includes(x.text)).length; bv = b.issues.filter(x=>!(b.resolved||[]).includes(x.text)).length; }
      else if (sortBy === "note")     { av = (a.note||"").toLowerCase(); bv = (b.note||"").toLowerCase(); }
      else return 0;
      if (av < bv) return sortDir === "asc" ? -1 : 1;
      if (av > bv) return sortDir === "asc" ? 1 : -1;
      return 0;
    });
  }

  function toggleSelectAll() {
    const ids = filtered.map(r => r.key);
    const allSel = ids.every(id => selectedRows.has(id));
    setSelectedRows(allSel ? new Set() : new Set(ids));
  }

  function toggleSelectRow(key) {
    setSelectedRows(prev => { const n = new Set(prev); n.has(key) ? n.delete(key) : n.add(key); return n; });
  }

  // Quick-send emails for selected guests, right from the cross-check grid (no tab switch).
  // Uses the standard templates; deep customization lives in the Communications tab.
  function emailSelected() {
    const picked = filtered.filter(r => selectedRows.has(r.key) && r.email && (r.issues||[]).filter(x=>!(r.resolved||[]).includes(x.text)).length > 0);
    if (picked.length === 0) return;
    if (picked.length > 8 && !window.confirm(`This will open ${picked.length} email drafts in your mail app, one at a time. Continue?`)) return;
    const extra = {
      eventName: eventName || "our event",
      plannerName: contacts?.plannerName || "",
      hotelName: contacts?.hotel?.name || "", hotelEmail: contacts?.hotel?.email || "",
      travelName: contacts?.travel?.name || "", travelEmail: contacts?.travel?.email || "",
    };
    picked.forEach((record, idx) => {
      const applicable = getApplicableTemplates(record);
      let subject, body;
      if (applicable.length > 0 && DEFAULT_TEMPLATES[applicable[0]]) {
        const tmpl = DEFAULT_TEMPLATES[applicable[0]];
        subject = fillTemplate(tmpl.subject, record, extra);
        body = fillTemplate(tmpl.body, record, extra);
      } else {
        // Generic fallback for issues without a specific template (date mismatch, wrong hotel, etc.)
        const issueList = (record.issues||[]).filter(x=>!(record.resolved||[]).includes(x.text)).map(x => "• " + x.text).join("\n");
        subject = `${eventName || "Event"} [Travel]: Could you confirm your travel details?`;
        body = `Hi ${record.firstName || record.displayName || "there"},\n\nWhile reviewing arrangements for ${eventName || "our event"}, we found something on your record that needs attention:\n\n${issueList}\n\nCould you take a look and let us know? Thank you.\n\n${contacts?.plannerName || "[Your Name]"}`;
      }
      // Stagger so the browser doesn't block multiple mailto: opens
      setTimeout(() => window.open(`mailto:${record.email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`, "_blank"), 250 * idx);
    });
  }

  const REPORT_FIELDS = [
    { key:"lastName", label:"Last Name", group:"Attendee", get:r => r.lastName||r.displayName.split(" ").slice(1).join(" ")||"—" },
    { key:"firstName", label:"First Name", group:"Attendee", get:r => r.firstName||r.displayName.split(" ")[0]||"—" },
    { key:"email", label:"Email", group:"Attendee", get:r => r.email||"—" },
    { key:"company", label:"Company", group:"Attendee", get:r => r.reg?.company||"—" },
    { key:"note", label:"Note", group:"Attendee", get:r => r.note||"—" },
    { key:"noteBy", label:"Note By", group:"Attendee", get:r => r.noteBy||"—" },
    { key:"noteAt", label:"Note Added", group:"Attendee", get:r => r.noteAt ? new Date(r.noteAt).toLocaleString() : "—" },
    { key:"status", label:"Status", group:"Status", get:r => ({ok:"Aligned",warn:"1 Issue",error:"Action Needed"}[r.status]) },
    { key:"issues", label:"Flagged Issues", group:"Status", get:r => r.issues.filter(x=>!(r.resolved||[]).includes(x.text)).map(x=>x.text).join("; ")||"None" },
    { key:"flightArrival", label:"Flight Arrival", group:"Flight", get:r => fmt(r.flight?.flightArrival) },
    { key:"arrivalTime", label:"Arrival Time", group:"Flight", get:r => fmtTime(r.flight?.arrivalTime, timeFormat)||"—" },
    { key:"arrivalAirport", label:"Arrival Airport", group:"Flight", get:r => (r.flight?.arrivalAirport||r.flight?.airport||"").toUpperCase()||"—" },
    { key:"flightIn", label:"Flight In #", group:"Flight", get:r => r.flight?.flightIn||"—" },
    { key:"flightDeparture", label:"Flight Departure", group:"Flight", get:r => fmt(r.flight?.flightDeparture) },
    { key:"departureTime", label:"Departure Time", group:"Flight", get:r => fmtTime(r.flight?.departureTime, timeFormat)||"—" },
    { key:"departureAirport", label:"Departure Airport", group:"Flight", get:r => (r.flight?.departureAirport||r.flight?.airport||"").toUpperCase()||"—" },
    { key:"flightOut", label:"Flight Out #", group:"Flight", get:r => r.flight?.flightOut||"—" },
    { key:"hotel", label:"Hotel", group:"Hotel", get:r => r.hotel?.hotel||"—" },
    { key:"checkIn", label:"Hotel Check-In", group:"Hotel", get:r => fmt(r.hotel?.checkIn) },
    { key:"checkOut", label:"Hotel Check-Out", group:"Hotel", get:r => fmt(r.hotel?.checkOut) },
    { key:"room", label:"Room / Conf.", group:"Hotel", get:r => r.hotel?.room||"—" },
    { key:"carPickup", label:"Car Pickup", group:"Car", get:r => fmt(r.car?.pickupDate) },
    { key:"carPickupTime", label:"Car Pickup Time", group:"Car", get:r => fmtTime(r.car?.pickupTime, timeFormat)||"—" },
    { key:"carDropoff", label:"Car Dropoff", group:"Car", get:r => fmt(r.car?.dropoffDate) },
  ];
  const applyReportTarget = (t) => { setReportTarget(t); setReportFields(new Set(REPORT_PRESETS[t])); };
  const toggleReportField = (k) => setReportFields(prev => { const n = new Set(prev); n.has(k) ? n.delete(k) : n.add(k); return n; });
  const setReportFieldGroup = (keys, on) => setReportFields(prev => { const n = new Set(prev); keys.forEach(k => on ? n.add(k) : n.delete(k)); return n; });
  const byLastName = (a,b) => (a.lastName||a.displayName||"").localeCompare(b.lastName||b.displayName||"", undefined, { sensitivity:"base" });
  function exportCustomReport() {
    const cols = REPORT_FIELDS.filter(f => reportFields.has(f.key));
    if (!cols.length) return;
    const rows = [...results].sort(byLastName).map(r => Object.fromEntries(cols.map(f => [f.label, f.get(r)])));
    const sheet = { general:"Report", hotel:"Hotel", car:"Car Transfers", travel:"Travel" }[reportTarget] || "Report";
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(rows), sheet);
    XLSX.writeFile(wb, `groupgrid-${(eventName||"report").replace(/\s+/g,"-")}-${reportTarget}-${new Date().toISOString().slice(0,10)}.xlsx`);
  }
  function exportOnsiteList() {
    const rows = [...results].sort(byLastName).map(r => ({
      "Last Name": r.lastName||r.displayName.split(" ").slice(1).join(" ")||"—",
      "First Name": r.firstName||r.displayName.split(" ")[0]||"—",
      "Email": r.email||"—",
      "Note": r.note||"—",
      "Flight Arrival": fmt(r.flight?.flightArrival),
      "Arrival Time": fmtTime(r.flight?.arrivalTime, timeFormat)||"—",
      "Arrival Airport": (r.flight?.arrivalAirport||r.flight?.airport||"").toUpperCase()||"—",
      "Flight In #": r.flight?.flightIn||"—",
      "Flight Departure": fmt(r.flight?.flightDeparture),
      "Departure Time": fmtTime(r.flight?.departureTime, timeFormat)||"—",
      "Departure Airport": (r.flight?.departureAirport||r.flight?.airport||"").toUpperCase()||"—",
      "Flight Out #": r.flight?.flightOut||"—",
      "Hotel": r.hotel?.hotel||"—",
      "Check-In": fmt(r.hotel?.checkIn),
      "Check-Out": fmt(r.hotel?.checkOut),
      "Room": r.hotel?.room||"—",
      "Car Pickup": fmt(r.car?.pickupDate),
      "Car Pickup Time": fmtTime(r.car?.pickupTime, timeFormat)||"—",
      "Car Dropoff": fmt(r.car?.dropoffDate),
      "Status": ({ok:"Aligned",warn:"1 Issue",error:"Action Needed"}[r.status]),
      "Flags": r.issues.filter(x=>!(r.resolved||[]).includes(x.text)).map(x=>x.text).join("; ")||"None",
    }));
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(rows), "Onsite Itinerary");
    XLSX.writeFile(wb, `groupgrid-${(eventName||"event").replace(/\s+/g,"-")}-onsite-itinerary-${new Date().toISOString().slice(0,10)}.xlsx`);
  }

  function exportSelected() {
    const toExport = selectedRows.size > 0 ? filtered.filter(r => selectedRows.has(r.key)) : filtered;
    const rows = toExport.map(r => ({
      "First Name":r.firstName||r.displayName.split(" ")[0]||"—",
      "Last Name":r.lastName||r.displayName.split(" ").slice(1).join(" ")||"—",
      "Full Name":r.displayName,
      "Email":r.email||"—",
      "Registered":r.reg?"Yes":(r.registered?"Yes":"No"),
      "Status":{ok:"Aligned",warn:"1 Issue",error:"Action Needed"}[r.status],
      "Active Issues":r.issues.filter(x=>!(r.resolved||[]).includes(x.text)).map(x=>x.text).join("; ")||"None",
      "Note":r.note||"—",
      "Note By":r.noteBy||"—",
      "Note Added":r.noteAt ? new Date(r.noteAt).toLocaleString() : "—",
      "Requested Check-In":fmt(r.reg?.regCheckIn),
      "Requested Check-Out":fmt(r.reg?.regCheckOut),
      "Car Pickup":fmt(r.car?.pickupDate),
      "Car Pickup Time":fmtTime(r.car?.pickupTime, timeFormat)||"—",
      "Flight Arrival":fmt(r.flight?.flightArrival),
      "Arrival Time":fmtTime(r.flight?.arrivalTime, timeFormat)||"—",
      "Arrival Airport":(r.flight?.arrivalAirport||r.flight?.airport||"").toUpperCase()||"—",
      "Flight In":r.flight?.flightIn||"—",
      "Hotel":r.hotel?.hotel||"—",
      "Hotel Check-In":fmt(r.hotel?.checkIn),
      "Arrival Δ":r.details?.arrDiff??"N/A",
      "Hotel Check-Out":fmt(r.hotel?.checkOut),
      "Departure Δ":r.details?.depDiff??"N/A",
      "Room":r.hotel?.room||"—",
      "Flight Departure":fmt(r.flight?.flightDeparture),
      "Departure Time":fmtTime(r.flight?.departureTime, timeFormat)||"—",
      "Departure Airport":(r.flight?.departureAirport||r.flight?.airport||"").toUpperCase()||"—",
      "Flight Out":r.flight?.flightOut||"—",
      "Car Dropoff":fmt(r.car?.dropoffDate),
      "Car Dropoff Time":fmtTime(r.car?.dropoffTime, timeFormat)||"—",
      "Company":r.reg?.company||"—",
      "Job Title":r.reg?.jobTitle||"—",
      "Dietary":r.diet?.dietary||r.reg?.dietaryRequest||"—",
      "Accessibility":r.diet?.accessibility||"—"
    }));
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(rows), "GroupGrid");
    const label = selectedRows.size > 0 ? `${selectedRows.size}-selected` : "all";
    XLSX.writeFile(wb, `groupgrid-${(eventName||"report").replace(/\s+/g,"-")}-${label}-${new Date().toISOString().slice(0,10)}.xlsx`);
  }

  function generateShareableReport() {
    const evName = eventName || "Event";
    const dateStr = new Date().toLocaleDateString("en-US", { month:"long", day:"numeric", year:"numeric", hour:"2-digit", minute:"2-digit" });
    const flagged = results.filter(r => r.status !== "ok");
    const aligned = results.filter(r => r.status === "ok");

    const localCounts = {
      total:     results.length,
      ok:        results.filter(r => r.status === "ok").length,
      error:     results.filter(r => r.status === "error").length,
      missing:   results.filter(r => r.issues.some(x => x.type === "missing")).length,
      window:    results.filter(r => r.issues.some(x => x.type === "window")).length,
      duplicate: results.filter(r => r.issues.some(x => x.type === "duplicate")).length,
      mismatch:  results.filter(r => r.issues.some(x => x.type === "mismatch")).length,
    };

    // ── helpers ──
    function sBadge(status) {
      if (status === "ok")   return '<span style="background:#E3F7F0;color:#0D9E6E;padding:2px 10px;border-radius:20px;font-size:12px;font-weight:600;">Aligned</span>';
      if (status === "warn") return '<span style="background:#FEF2DC;color:#C97A0A;padding:2px 10px;border-radius:20px;font-size:12px;font-weight:600;">1 Issue</span>';
      return '<span style="background:#FDECEC;color:#C0392B;padding:2px 10px;border-radius:20px;font-size:12px;font-weight:600;">Action Needed</span>';
    }
    function sDelta(val) {
      if (val === null || val === undefined) return "\u2014";
      if (val === 0) return '<span style="color:#0D9E6E;font-weight:600;">On time</span>';
      const days = Math.abs(val), word = days === 1 ? "day" : "days", dir = val > 0 ? "late" : "early";
      return '<span style="color:' + (days <= 1 ? "#C97A0A" : "#C0392B") + ';font-weight:600;">' + days + " " + word + " " + dir + "</span>";
    }
    function sCell(val) { return val || "\u2014"; }
    function missingCell() { return '<span style="color:#C0392B;font-weight:600;">Missing</span>'; }

    // ── guest rows ──
    var guestRows = "";
    for (var gi = 0; gi < results.length; gi++) {
      var r = results[gi];
      var activeIssues = r.issues.filter(function(x) { return !(r.resolved || []).includes(x.text); });
      var issueHtml = "";
      if (activeIssues.length === 0) {
        issueHtml = '<span style="color:#0D9E6E;">&#10003; Clear</span>';
      } else {
        for (var ii = 0; ii < activeIssues.length; ii++) {
          var ic = activeIssues[ii].type === "missing" ? "#C97A0A" : activeIssues[ii].type === "window" ? "#6B3FA0" : "#C0392B";
          issueHtml += '<div style="color:' + ic + ';font-size:12px;margin:1px 0;">&bull; ' + activeIssues[ii].text + "</div>";
        }
      }
      var noteCell = r.note
        ? '<td style="padding:10px 12px;font-size:12px;color:#4A5568;font-style:italic;">' + r.note + "</td>"
        : '<td style="padding:10px 12px;color:#B8C0D8;">\u2014</td>';
      guestRows += '<tr style="border-bottom:1px solid #DDE2EF;' + (r.status === "error" ? "background:#FDECEC;" : "") + '">'
        + '<td style="padding:10px 12px;font-weight:600;white-space:nowrap;">' + r.displayName + "</td>"
        + '<td style="padding:10px 12px;font-size:13px;color:#4A5568;">' + sCell(r.email) + "</td>"
        + '<td style="padding:10px 12px;">' + sBadge(r.status) + "</td>"
        + '<td style="padding:10px 12px;font-size:13px;">' + (r.flight ? fmt(r.flight.flightArrival) + (r.flight.arrivalTime ? '<div style="font-size:11px;color:#7E8BA8;">' + fmtTime(r.flight.arrivalTime, timeFormat) + '</div>' : "") : missingCell()) + "</td>"
        + '<td style="padding:10px 12px;font-size:13px;color:#4A5568;font-weight:600;">' + ((r.flight && (r.flight.arrivalAirport||r.flight.airport)) ? (r.flight.arrivalAirport||r.flight.airport).toUpperCase() : "\u2014") + "</td>"
        + '<td style="padding:10px 12px;font-size:13px;">' + (r.hotel ? fmt(r.hotel.checkIn) : missingCell()) + "</td>"
        + '<td style="padding:10px 12px;font-size:13px;">' + sDelta(r.details && r.details.arrDiff) + "</td>"
        + '<td style="padding:10px 12px;font-size:13px;">' + (r.flight ? fmt(r.flight.flightDeparture) + (r.flight.departureTime ? '<div style="font-size:11px;color:#7E8BA8;">' + fmtTime(r.flight.departureTime, timeFormat) + '</div>' : "") : missingCell()) + "</td>"
        + '<td style="padding:10px 12px;font-size:13px;color:#4A5568;font-weight:600;">' + ((r.flight && (r.flight.departureAirport||r.flight.airport)) ? (r.flight.departureAirport||r.flight.airport).toUpperCase() : "\u2014") + "</td>"
        + '<td style="padding:10px 12px;font-size:13px;">' + (r.hotel ? fmt(r.hotel.checkOut) : missingCell()) + "</td>"
        + '<td style="padding:10px 12px;font-size:13px;">' + sDelta(r.details && r.details.depDiff) + "</td>"
        + '<td style="padding:10px 12px;font-size:13px;">' + issueHtml + "</td>"
        + noteCell
        + "</tr>";
    }

    // ── diet rows ──
    var dietRows = "";
    var dietGuests = SHOW_DIETARY ? results.filter(function(r) { return r.diet && (r.diet.dietary || r.diet.accessibility || r.diet.specialNotes); }) : [];
    for (var di = 0; di < dietGuests.length; di++) {
      var dr = dietGuests[di];
      dietRows += '<tr style="border-bottom:1px solid #DDE2EF;">'
        + '<td style="padding:10px 12px;font-weight:600;">' + dr.displayName + "</td>"
        + '<td style="padding:10px 12px;font-size:13px;">' + sCell(dr.diet.dietary) + "</td>"
        + '<td style="padding:10px 12px;font-size:13px;">' + sCell(dr.diet.accessibility) + "</td>"
        + '<td style="padding:10px 12px;font-size:13px;color:#4A5568;font-style:italic;">' + sCell(dr.diet.specialNotes) + "</td>"
        + "</tr>";
    }

    // ── summary cards ──
    var summaryCards = [
      { label:"Total Guests",   val:results.length,                                    color:"#0C1E3F", bg:"white" },
      { label:"Fully Aligned",  val:aligned.length,                                    color:"#0D9E6E", bg:"#E3F7F0" },
      { label:"Action Needed",  val:flagged.length, color:"#C0392B", bg:"#FDECEC" },
      { label:"Alignment Rate", val:Math.round(aligned.length / results.length * 100) + "%", color:"#00A896", bg:"#E0FAF7" },
    ];
    var cardsHtml = "";
    for (var ci = 0; ci < summaryCards.length; ci++) {
      var sc = summaryCards[ci];
      cardsHtml += '<div style="background:' + sc.bg + ';border:1px solid #DDE2EF;border-radius:10px;padding:18px 20px;">'
        + '<div style="font-size:13px;color:#7E8BA8;margin-bottom:6px;">' + sc.label + "</div>"
        + '<div style="font-size:28px;font-weight:700;color:' + sc.color + ';">' + sc.val + "</div>"
        + "</div>";
    }

    // ── issue breakdown ──
    var issueBreakdown = "";
    if (flagged.length > 0) {
      var chips = "";
      if (localCounts.missing > 0) chips += '<div style="background:#FEF2DC;border-radius:8px;padding:10px 16px;"><div style="font-size:12px;color:#C97A0A;font-weight:600;text-transform:uppercase;letter-spacing:0.04em;">Missing Record</div><div style="font-size:22px;font-weight:700;color:#C97A0A;">' + localCounts.missing + "</div></div>";
      if (localCounts.mismatch > 0) chips += '<div style="background:#FDECEC;border-radius:8px;padding:10px 16px;"><div style="font-size:12px;color:#C0392B;font-weight:600;text-transform:uppercase;letter-spacing:0.04em;">Date Mismatch</div><div style="font-size:22px;font-weight:700;color:#C0392B;">' + localCounts.mismatch + "</div></div>";
      if (localCounts.window > 0)  chips += '<div style="background:#EEE5F9;border-radius:8px;padding:10px 16px;"><div style="font-size:12px;color:#6B3FA0;font-weight:600;text-transform:uppercase;letter-spacing:0.04em;">Outside Window</div><div style="font-size:22px;font-weight:700;color:#6B3FA0;">' + localCounts.window + "</div></div>";
      if (localCounts.duplicate > 0) chips += '<div style="background:#FEF2DC;border-radius:8px;padding:10px 16px;"><div style="font-size:12px;color:#C97A0A;font-weight:600;text-transform:uppercase;letter-spacing:0.04em;">Duplicates</div><div style="font-size:22px;font-weight:700;color:#C97A0A;">' + localCounts.duplicate + "</div></div>";
      issueBreakdown = '<div style="background:white;border:1px solid #DDE2EF;border-radius:10px;padding:20px 24px;margin-bottom:24px;"><div style="font-size:15px;font-weight:700;margin-bottom:14px;color:#0C1E3F;">Issue Breakdown</div><div style="display:flex;gap:12px;flex-wrap:wrap;">' + chips + "</div></div>";
    }

    // ── contacts block ──
    var contactsBlock = "";
    if (contacts.hotel.email || contacts.travel.email) {
      var hotelDiv = contacts.hotel.email
        ? '<div style="background:#F0F2F7;border-radius:8px;padding:14px 16px;">'
          + '<div style="font-size:11px;font-weight:600;color:#7E8BA8;text-transform:uppercase;letter-spacing:0.04em;margin-bottom:8px;">Hotel Contact</div>'
          + (contacts.hotel.name ? '<div style="font-weight:600;margin-bottom:2px;">' + contacts.hotel.name + "</div>" : "")
          + (contacts.hotel.property ? '<div style="font-size:13px;color:#4A5568;">' + contacts.hotel.property + "</div>" : "")
          + (contacts.hotel.email ? '<div style="font-size:13px;color:#4C62C4;margin-top:4px;">' + contacts.hotel.email + "</div>" : "")
          + (contacts.hotel.phone ? '<div style="font-size:13px;color:#4A5568;">' + contacts.hotel.phone + "</div>" : "")
          + "</div>" : "";
      var travelDiv = contacts.travel.email
        ? '<div style="background:#F0F2F7;border-radius:8px;padding:14px 16px;">'
          + '<div style="font-size:11px;font-weight:600;color:#7E8BA8;text-transform:uppercase;letter-spacing:0.04em;margin-bottom:8px;">Travel Agency</div>'
          + (contacts.travel.name ? '<div style="font-weight:600;margin-bottom:2px;">' + contacts.travel.name + "</div>" : "")
          + (contacts.travel.agency ? '<div style="font-size:13px;color:#4A5568;">' + contacts.travel.agency + "</div>" : "")
          + (contacts.travel.email ? '<div style="font-size:13px;color:#4C62C4;margin-top:4px;">' + contacts.travel.email + "</div>" : "")
          + (contacts.travel.phone ? '<div style="font-size:13px;color:#4A5568;">' + contacts.travel.phone + "</div>" : "")
          + "</div>" : "";
      contactsBlock = '<div style="background:white;border:1px solid #DDE2EF;border-radius:10px;padding:20px 24px;margin-bottom:24px;"><div style="font-size:15px;font-weight:700;margin-bottom:14px;color:#0C1E3F;">Event Contacts</div><div style="display:grid;grid-template-columns:repeat(2,1fr);gap:16px;">' + hotelDiv + travelDiv + "</div></div>";
    }

    // ── diet table ──
    var dietSection = "";
    if (dietRows) {
      dietSection = '<div style="background:white;border:1px solid #DDE2EF;border-radius:10px;overflow:hidden;margin-bottom:24px;">'
        + '<div style="background:#0A7B7A;padding:14px 20px;"><span style="font-size:14px;font-weight:600;color:white;">Dietary &amp; Accessibility Requirements</span></div>'
        + '<div style="overflow-x:auto;"><table style="width:100%;border-collapse:collapse;font-size:13px;"><thead>'
        + '<tr style="background:#DCF2F2;border-bottom:1px solid #DDE2EF;">'
        + '<th style="padding:10px 12px;text-align:left;font-size:11px;font-weight:600;color:#0A7B7A;text-transform:uppercase;letter-spacing:0.04em;">Guest</th>'
        + '<th style="padding:10px 12px;text-align:left;font-size:11px;font-weight:600;color:#0A7B7A;text-transform:uppercase;letter-spacing:0.04em;">Dietary</th>'
        + '<th style="padding:10px 12px;text-align:left;font-size:11px;font-weight:600;color:#0A7B7A;text-transform:uppercase;letter-spacing:0.04em;">Accessibility</th>'
        + '<th style="padding:10px 12px;text-align:left;font-size:11px;font-weight:600;color:#0A7B7A;text-transform:uppercase;letter-spacing:0.04em;">Notes</th>'
        + "</tr></thead><tbody>" + dietRows + "</tbody></table></div></div>";
    }

    // ── travel window line ──
    var windowLine = (arrivalStart && arrivalEnd)
      ? '<div style="font-size:13px;color:rgba(255,255,255,0.5);margin-top:4px;">Travel window: ' + arrivalStart + " \u2013 " + (departureEnd || arrivalEnd) + "</div>"
      : "";
    var plannerLine = contacts.plannerName
      ? '<div style="font-size:13px;color:rgba(255,255,255,0.6);margin-top:2px;">Prepared by ' + contacts.plannerName + "</div>"
      : "";

    // ── assemble final HTML ──
    var html = "<!DOCTYPE html>"
      + '<html lang="en"><head>'
      + '<meta charset="UTF-8"/>'
      + '<meta name="viewport" content="width=device-width,initial-scale=1"/>'
      + "<title>GroupGrid Report \u2014 " + evName + "</title>"
      + '<link href="https://fonts.googleapis.com/css2?family=IBM+Plex+Sans:wght@400;500;600;700&family=Poppins:wght@500;600;700&display=swap" rel="stylesheet"/>'
      + "<style>*{box-sizing:border-box;margin:0;padding:0;}body{font-family:'IBM Plex Sans',sans-serif;background:#F0F2F7;color:#0C1E3F;font-size:14px;-webkit-font-smoothing:antialiased;}a{color:inherit;text-decoration:none;}@media print{body{background:white;}.no-print{display:none!important;}table{page-break-inside:auto;}tr{page-break-inside:avoid;}}</style>"
      + "</head><body>"
      + '<div style="max-width:1100px;margin:0 auto;padding:32px 24px;">'

      // header
      + '<div style="background:#0C1E3F;border-radius:12px;padding:28px 32px;margin-bottom:24px;display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:16px;">'
      + "<div>"
      + '<div style="font-size:22px;font-weight:700;color:white;margin-bottom:4px;">Group<span style="color:#00C9B1;font-weight:400;">Grid</span><span style="font-size:13px;font-weight:400;color:rgba(255,255,255,0.45);margin-left:12px;">Cross-Check Report</span></div>'
      + '<div style="font-size:18px;font-weight:600;color:rgba(255,255,255,0.9);">' + evName + "</div>"
      + windowLine
      + "</div>"
      + '<div style="text-align:right;">'
      + '<div style="font-size:12px;color:rgba(255,255,255,0.4);">Generated</div>'
      + '<div style="font-size:13px;color:rgba(255,255,255,0.7);">' + dateStr + "</div>"
      + plannerLine
      + "</div></div>"

      // summary cards
      + '<div style="display:grid;grid-template-columns:repeat(4,1fr);gap:12px;margin-bottom:24px;">' + cardsHtml + "</div>"

      // issue breakdown
      + issueBreakdown

      // guest table
      + '<div style="background:white;border:1px solid #DDE2EF;border-radius:10px;overflow:hidden;margin-bottom:24px;">'
      + '<div style="background:#0C1E3F;padding:14px 20px;display:flex;align-items:center;justify-content:space-between;">'
      + '<span style="font-size:14px;font-weight:600;color:white;">All Guests</span>'
      + '<span style="font-size:13px;color:rgba(255,255,255,0.5);">' + results.length + " total \u00b7 " + flagged.length + " flagged</span>"
      + "</div>"
      + '<div style="overflow-x:auto;"><table style="width:100%;border-collapse:collapse;font-size:13px;"><thead>'
      + '<tr style="background:#EEF1F8;border-bottom:1px solid #DDE2EF;">'
      + '<th style="padding:10px 12px;text-align:left;font-size:11px;font-weight:600;color:#4A5568;text-transform:uppercase;letter-spacing:0.04em;white-space:nowrap;">Guest</th>'
      + '<th style="padding:10px 12px;text-align:left;font-size:11px;font-weight:600;color:#4A5568;text-transform:uppercase;letter-spacing:0.04em;">Email</th>'
      + '<th style="padding:10px 12px;text-align:left;font-size:11px;font-weight:600;color:#4A5568;text-transform:uppercase;letter-spacing:0.04em;">Status</th>'
      + '<th style="padding:10px 12px;text-align:left;font-size:11px;font-weight:600;color:#4A5568;text-transform:uppercase;letter-spacing:0.04em;white-space:nowrap;">Flight In</th>'
      + '<th style="padding:10px 12px;text-align:left;font-size:11px;font-weight:600;color:#4A5568;text-transform:uppercase;letter-spacing:0.04em;white-space:nowrap;">Arr Apt</th>'
      + '<th style="padding:10px 12px;text-align:left;font-size:11px;font-weight:600;color:#4A5568;text-transform:uppercase;letter-spacing:0.04em;white-space:nowrap;">Check-In</th>'
      + '<th style="padding:10px 12px;text-align:left;font-size:11px;font-weight:600;color:#4A5568;text-transform:uppercase;letter-spacing:0.04em;">\u0394 Arr</th>'
      + '<th style="padding:10px 12px;text-align:left;font-size:11px;font-weight:600;color:#4A5568;text-transform:uppercase;letter-spacing:0.04em;white-space:nowrap;">Flight Out</th>'
      + '<th style="padding:10px 12px;text-align:left;font-size:11px;font-weight:600;color:#4A5568;text-transform:uppercase;letter-spacing:0.04em;white-space:nowrap;">Dep Apt</th>'
      + '<th style="padding:10px 12px;text-align:left;font-size:11px;font-weight:600;color:#4A5568;text-transform:uppercase;letter-spacing:0.04em;white-space:nowrap;">Check-Out</th>'
      + '<th style="padding:10px 12px;text-align:left;font-size:11px;font-weight:600;color:#4A5568;text-transform:uppercase;letter-spacing:0.04em;">\u0394 Dep</th>'
      + '<th style="padding:10px 12px;text-align:left;font-size:11px;font-weight:600;color:#4A5568;text-transform:uppercase;letter-spacing:0.04em;">Flags</th>'
      + '<th style="padding:10px 12px;text-align:left;font-size:11px;font-weight:600;color:#4A5568;text-transform:uppercase;letter-spacing:0.04em;">Note</th>'
      + "</tr></thead><tbody>" + guestRows + "</tbody></table></div></div>"

      // diet section
      + dietSection

      // contacts
      + contactsBlock

      // footer
      + '<div style="text-align:center;padding:20px;font-size:12px;color:#B8C0D8;">Generated by Group<span style="color:#00C9B1;">Grid</span> \u00b7 ' + dateStr + " \u00b7 Data processed locally \u2014 not stored on any server</div>"
      + "</div></body></html>";

    var filename = "GroupGrid-Report-" + (eventName || "Event").replace(/\s+/g, "-") + "-" + new Date().toISOString().slice(0, 10) + ".html";
    setShareModal({ html, filename });
  }

  const filtered = (results || []).filter(r => {
    if (search && !r.displayName.toLowerCase().includes(search.toLowerCase()) && !r.email.includes(search.toLowerCase())) return false;
    if (filter === "issues") return r.status !== "ok";
    if (filter === "missing") return r.issues.some(x => x.type === "missing");
    if (filter === "window") return r.issues.some(x => x.type === "window");
    if (filter === "mismatch") return r.issues.some(x => x.type === "mismatch");
    if (filter === "duplicate") return r.issues.some(x => x.type === "duplicate");
    if (filter === "unregistered") return r.issues.some(x => x.type === "unregistered");
    if (filter === "airport") return r.issues.some(x => x.type === "airport");
    if (filter === "earlyarrival") return r.issues.some(x => x.type === "earlyarrival");
    if (filter === "earlydeparture") return r.issues.some(x => x.type === "earlydeparture");
    if (filter === "abstractunreg") return r.issues.some(x => x.type === "abstract_unreg");
    if (filter === "typerule") return r.issues.some(x => x.type === "typerule");
    if (["ok","warn","error"].includes(filter)) return r.status === filter;
    return true;
  });

  const counts = results ? { total:results.length, ok:results.filter(r=>r.status==="ok").length, flagged:results.filter(r=>r.status!=="ok").length, warn:results.filter(r=>r.status==="warn").length, error:results.filter(r=>r.status==="error").length, missing:results.filter(r=>r.issues.some(x=>x.type==="missing")).length, window:results.filter(r=>r.issues.some(x=>x.type==="window")).length, mismatch:results.filter(r=>r.issues.some(x=>x.type==="mismatch")).length, duplicate:results.filter(r=>r.issues.some(x=>x.type==="duplicate")).length, unregistered:results.filter(r=>r.issues.some(x=>x.type==="unregistered")).length, airport:results.filter(r=>r.issues.some(x=>x.type==="airport")).length, earlyarrival:results.filter(r=>r.issues.some(x=>x.type==="earlyarrival")).length, earlydeparture:results.filter(r=>r.issues.some(x=>x.type==="earlydeparture")).length, abstractunreg:results.filter(r=>r.issues.some(x=>x.type==="abstract_unreg")).length, typerule:results.filter(r=>r.issues.some(x=>x.type==="typerule")).length, dietary:results.filter(r=>r.diet?.dietary||r.diet?.accessibility).length } : null;

  const hasCars = results?.some(r => r.car);
  const paramsDirty = !!results && !!lastRunSig && lastRunSig !== JSON.stringify({ arrivalStart, arrivalEnd, departureStart, departureEnd, preferredAirports, departureAirports, arrivalCutoff, departureCutoff, lateArrivalCutoff, typeRules, eventName });
  const hasDiet = SHOW_DIETARY && results?.some(r => r.diet);
  const hasHotelNames = results?.some(r => r.hotel?.hotel && r.hotel.hotel.trim());
  const uploadedCount = [registrationFile, flightFile, hotelFile, carFile, dietaryFile].filter(Boolean).length + [...extraHotels, ...extraFlights, ...extraCars, ...extraReg, ...extraDietary].filter(h=>h.file).length;
  const ready = uploadedCount >= 2;


  return (
    <div style={{ minHeight:"100vh", width:"100%", maxWidth:"100vw", overflowX:"clip", background:"#F0F2F7", fontFamily:font, fontSize:"15px", WebkitFontSmoothing:"antialiased", boxSizing:"border-box" }}>
      <GlobalStyles />
      <link href="https://fonts.googleapis.com/css2?family=IBM+Plex+Sans:wght@400;500;600;700&family=Poppins:wght@500;600;700&display=swap" rel="stylesheet" />

      {/* ── Mobile sidebar overlay ── */}
      {isMobile && sidebarOpen && (
        <div className="gg-sidebar-overlay" onClick={() => setSidebarOpen(false)}
          style={{ position:"fixed", top:"52px", left:0, right:0, bottom:0, background:"rgba(15,31,61,0.6)", zIndex:199, backdropFilter:"blur(2px)" }} />
      )}

      {emailModal && <EmailModal record={emailModal} eventName={eventName} contacts={contacts} onClose={() => setEmailModal(null)} />}
      {loginOpen && (
        <div style={{ position:"fixed", inset:0, zIndex:4000, display:"flex", alignItems:"center", justifyContent:"flex-end" }}>
          <div onClick={() => setLoginOpen(false)} style={{ position:"absolute", inset:0, background:"rgba(27,42,74,0.5)", backdropFilter:"blur(4px)" }} />
          <div style={{ position:"relative", zIndex:1, width:"100%", maxWidth:"420px", height:"100%", background:P.navy, boxShadow:"-20px 0 60px rgba(0,0,0,0.4)", display:"flex", flexDirection:"column", overflowY:"auto" }}>
            <LoginPanel onLogin={u => {
                // Migrate anonymous sessions to the newly signed-in account
                try {
                  const anonKey = "groupgrid-sessions-anonymous";
                  const userKey = `groupgrid-sessions-${u.email}`;
                  const anonRaw = storage.get(anonKey);
                  if (anonRaw) {
                    const anonSessions = JSON.parse(anonRaw.value);
                    if (anonSessions.length > 0) {
                      let existing = [];
                      try { const er = storage.get(userKey); if (er) existing = JSON.parse(er.value); } catch(e) {}
                      const merged = [...anonSessions, ...existing.filter(e => !anonSessions.some(a => a.name === e.name))].slice(0, 50);
                      storage.set(userKey, JSON.stringify(merged));
                      storage.delete(anonKey);
                    }
                  }
                } catch(e) {}
                onLogin(u);
                setLoginOpen(false);
                setPage("app");
              }} onClose={() => setLoginOpen(false)} />
          </div>
        </div>
      )}
      {contactsOpen && <ContactsModal contacts={contacts} onSave={setContacts} onClose={() => setContactsOpen(false)} />}
      {supportOpen && <SupportModal user={user} onClose={() => setSupportOpen(false)} />}
      {shareModal && <ShareModal html={shareModal.html} filename={shareModal.filename} onClose={() => setShareModal(null)} />}

      {/* ── Page overlays ── */}
      {(() => {
        const nav = { onHome:() => setPage("landing"), onPricing:() => setPage("pricing"), onAbout:() => setPage("about"), onFaq:() => setPage("faq"), onContact:() => setPage("contact"), onPrivacy:() => setPage("privacy"), onTerms:() => setPage("terms"), onApp:enterApp, current:page };
        return (<>
      {(page === "landing" || (!user && page === "app")) && <div style={{ position:"fixed", inset:0, zIndex:3000, overflowX:"hidden", overflowY:"auto", overscrollBehavior:"none", WebkitOverflowScrolling:"touch" }}><LandingPage onEnter={enterApp} onPricing={() => setPage("pricing")} onAbout={() => setPage("about")} onContact={() => setPage("contact")} onPrivacy={() => setPage("privacy")} onTerms={() => setPage("terms")} onFaq={() => setPage("faq")} /></div>}
      {page === "pricing" && <div style={{ position:"fixed", inset:0, zIndex:3000, overflowX:"hidden", overflowY:"auto", overscrollBehavior:"none", WebkitOverflowScrolling:"touch" }}><PricingPage onBack={() => setPage("landing")} nav={nav} /></div>}
      {page === "about"   && <div style={{ position:"fixed", inset:0, zIndex:3000, overflowX:"hidden", overflowY:"auto", overscrollBehavior:"none", WebkitOverflowScrolling:"touch" }}><AboutPage   onBack={() => setPage("landing")} nav={nav} /></div>}
      {page === "faq"     && <div style={{ position:"fixed", inset:0, zIndex:3000, overflowX:"hidden", overflowY:"auto", overscrollBehavior:"none", WebkitOverflowScrolling:"touch" }}><FAQPage     onBack={() => setPage("landing")} nav={nav} /></div>}
      {page === "contact" && <div style={{ position:"fixed", inset:0, zIndex:3000, overflowX:"hidden", overflowY:"auto", overscrollBehavior:"none", WebkitOverflowScrolling:"touch" }}><ContactPage onBack={() => setPage("landing")} nav={nav} /></div>}
      {page === "privacy" && <div style={{ position:"fixed", inset:0, zIndex:3000, overflowX:"hidden", overflowY:"auto", overscrollBehavior:"none", WebkitOverflowScrolling:"touch" }}><PrivacyPage onBack={() => setPage("landing")} nav={nav} /></div>}
      {page === "terms"   && <div style={{ position:"fixed", inset:0, zIndex:3000, overflowX:"hidden", overflowY:"auto", overscrollBehavior:"none", WebkitOverflowScrolling:"touch" }}><TermsPage   onBack={() => setPage("landing")} nav={nav} /></div>}
        </>);
      })()}

      {/* App shell — only rendered for signed-in users. Logged-out visitors see marketing pages above. */}
      {user && (<>
      {/* Header */}
      <div style={{ background:P.navy, padding:`0 ${isMobile ? "14px" : "32px"}`, display:"flex", alignItems:"center", justifyContent:"space-between", height:"52px", boxShadow:"0 1px 0 rgba(255,255,255,0.06)" }}>
        <div style={{ display:"flex", alignItems:"center", gap:"10px" }}>
          {/* Hamburger — mobile only */}
          {isMobile && (
            <button onClick={() => setSidebarOpen(o => !o)}
              style={{ background:"rgba(255,255,255,0.08)", border:"1px solid rgba(255,255,255,0.12)", borderRadius:"8px", width:36, height:36, display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", gap:"4px", cursor:"pointer", flexShrink:0, padding:0 }}>
              {[0,1,2].map(i => <span key={i} style={{ width:14, height:2, background:"rgba(255,255,255,0.7)", borderRadius:2, transition:"all 0.2s" }} />)}
            </button>
          )}
          <BrandLogo height={isMobile ? 28 : 40} onDark={true} />
            {!isMobile && <button onClick={() => setPage("landing")} style={{ background:"rgba(255,255,255,0.07)", border:"1px solid rgba(255,255,255,0.12)", borderRadius:"7px", padding:"4px 12px", fontSize:"15px", fontWeight:600, color:"rgba(255,255,255,0.45)", fontFamily:font, cursor:"pointer", letterSpacing:"0.03em" }}>← Home</button>}
        </div>
        <div style={{ display:"flex", alignItems:"center", gap:"8px" }}>
          {saveMsg && <span style={{ fontSize:"15px", color:P.accent, fontFamily:font, fontWeight:600 }}>✓ {saveMsg}</span>}
          <div className="gg-header-extras" style={{ display:"flex", alignItems:"center", gap:"8px" }}>
          {results && (
            <div style={{ display:"flex", alignItems:"center", gap:"6px" }}>
              <Btn onClick={saveSession} small color={P.accent}>Save Project</Btn>
            </div>
          )}
          <div style={{ width:1, height:16, background:"rgba(255,255,255,0.15)", marginLeft:"2px" }} />
          {user ? (
            <div style={{ display:"flex", alignItems:"center", gap:"8px" }}>
              <div style={{ width:30, height:30, borderRadius:"50%", background:`linear-gradient(135deg, ${P.periwinkle}, ${P.periwinkleD})`, display:"flex", alignItems:"center", justifyContent:"center", fontSize:"15px", fontWeight:800, color:P.white, fontFamily:font, flexShrink:0, cursor:"default" }} title={user.email}>
                {user.name.charAt(0).toUpperCase()}
              </div>
              <span style={{ fontSize:"15px", color:"rgba(255,255,255,0.75)", fontFamily:font, fontWeight:700 }}>{user.name}</span>
              <button onClick={onLogout} style={{ background:"transparent", border:"1px solid rgba(255,255,255,0.15)", borderRadius:"8px", padding:"4px 10px", fontSize:"15px", fontWeight:700, fontFamily:font, color:"rgba(255,255,255,0.4)", cursor:"pointer" }}>Sign out</button>
            </div>
          ) : (
            <button onClick={() => setLoginOpen(true)} style={{ display:"flex", alignItems:"center", gap:"8px", background:P.accent, border:"none", borderRadius:"8px", padding:"7px 16px", cursor:"pointer", fontFamily:font, boxShadow:"0 1px 8px rgba(0,201,177,0.3)" }}>
              <span style={{ fontSize:"15px", fontWeight:500, color:P.white, letterSpacing:"0em" }}>Sign In</span>
            </button>
          )}
          </div>
          {/* Mobile: auth control always visible — Sign In when logged out, account + Sign out when logged in */}
          {isMobile && !user && (
            <button onClick={() => setLoginOpen(true)} style={{ background:P.accent, border:"none", borderRadius:"8px", padding:"6px 14px", cursor:"pointer", fontFamily:font }}>
              <span style={{ fontSize:"15px", fontWeight:600, color:P.white }}>Sign In</span>
            </button>
          )}
          {isMobile && user && (
            <div style={{ display:"flex", alignItems:"center", gap:"8px" }}>
              <div title={user.email} style={{ width:28, height:28, borderRadius:"50%", background:P.accentD, display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0, fontSize:"15px", fontWeight:700, color:P.white, fontFamily:font, textTransform:"uppercase" }}>{(user.name || user.email || "?").trim().charAt(0)}</div>
              <button onClick={onLogout} style={{ background:"transparent", border:"1px solid rgba(255,255,255,0.2)", borderRadius:"8px", padding:"6px 12px", cursor:"pointer", fontFamily:font }}>
                <span style={{ fontSize:"15px", fontWeight:600, color:"rgba(255,255,255,0.7)" }}>Sign out</span>
              </button>
            </div>
          )}
        </div>
      </div>

      <div style={{ display:"flex", flex:1, width:"100%", minHeight:`calc(100vh - ${isMobile && results ? "104px" : "52px"})`, alignItems:"stretch" }}>

        {/* ── Left Sidebar / Mobile Drawer ── */}
        <div className={`gg-sidebar${isMobile && sidebarOpen ? " open" : ""}`}
          style={{ width:224, flexShrink:0, background:P.navy, borderRight:`1px solid rgba(255,255,255,0.07)`, display:"flex", flexDirection:"column", padding:"20px 14px", overflowY:"auto", position: isMobile ? "fixed" : "relative", left: isMobile ? 0 : undefined, top: isMobile ? "52px" : 0, height: isMobile ? "calc(100vh - 52px)" : "auto", minHeight: isMobile ? undefined : `calc(100vh - 52px)`, alignSelf:"stretch", zIndex: isMobile ? 250 : "auto", transform: isMobile ? (sidebarOpen ? "translateX(0)" : "translateX(-100%)") : "none", transition: isMobile ? "transform 0.25s ease" : "none", boxShadow: isMobile && sidebarOpen ? "4px 0 24px rgba(0,0,0,0.35)" : "none" }}>

          {/* Mobile drawer close */}
          {isMobile && (
            <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:"16px" }}>
              <span style={{ fontSize:"16px", fontWeight:700, color:"rgba(255,255,255,0.5)", letterSpacing:"0.08em", textTransform:"uppercase" }}>Menu</span>
              <button onClick={() => setSidebarOpen(false)} style={{ background:"rgba(255,255,255,0.1)", border:"none", borderRadius:"8px", width:30, height:30, cursor:"pointer", color:"rgba(255,255,255,0.6)", display:"flex", alignItems:"center", justifyContent:"center" }}>
                <X size={14} strokeWidth={1.8}/>
              </button>
            </div>
          )}


          {/* ── Projects section ── */}
          <div style={{ marginTop:"18px" }}>
            <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:"8px", paddingLeft:"4px" }}>
              <span style={{ fontSize:"16px", fontWeight:700, color:P.white, letterSpacing:"0.03em", textTransform:"uppercase" }}>Projects</span>
              {(user || savedSessions.length > 0) && (
                <span style={{ fontSize:"15px", color: user ? P.accent : "rgba(255,255,255,0.35)", fontWeight:600 }}>{user ? `Synced` : "Local only"}</span>
              )}
            </div>

            {/* New project button */}
            <button onClick={() => {
                // Notes and resolved flags live with the project. Starting fresh clears them,
                // so warn if there's unsaved work first \u2014 the user can Save, then reopen to get notes back.
                const hasWork = results && (Object.keys(meta||{}).length > 0 || eventName || projectName);
                if (hasWork && !window.confirm("Start a new project? Your current notes and resolved flags will be cleared from this screen. To keep them, click Cancel, then use Save Now first \u2014 you can reopen this project anytime to get them back.")) return;
                setResults(null); setFlightFile(null); setHotelFile(null); setCarFile(null); setDietaryFile(null); setRegistrationFile(null); setEventName(""); setProjectName(""); setMeta({}); setPreferredAirports(""); setDepartureAirports(""); setArrivalCutoff(""); setDepartureCutoff(""); setLastRunSig(""); setFilter("all"); setSearch(""); setExpanded(null); setActiveTab("grid"); setShowSetup(false); }}
              style={{ width:"100%", display:"flex", alignItems:"center", gap:"8px", background:"rgba(255,255,255,0.07)", border:`1px dashed rgba(255,255,255,0.18)`, borderRadius:"8px", padding:"7px 10px", cursor:"pointer", marginBottom:"6px", fontFamily:font, transition:"all 0.15s", textAlign:"left" }}
              onMouseEnter={e => e.currentTarget.style.background="rgba(255,255,255,0.12)"}
              onMouseLeave={e => e.currentTarget.style.background="rgba(255,255,255,0.07)"}>
              <div style={{ width:24, height:24, borderRadius:"6px", background:"rgba(255,255,255,0.15)", display:"flex", alignItems:"center", justifyContent:"center", fontSize:"15px", flexShrink:0, color:P.white, fontWeight:900 }}>+</div>
              <div>
                <div style={{ fontSize:"15px", fontWeight:800, color:P.white, fontFamily:font }}>New Project</div>
                <div style={{ fontSize:"15px", color:"rgba(255,255,255,0.4)", fontFamily:font }}>Start fresh</div>
              </div>
            </button>

            {/* Current unsaved / active project */}
            {(flightFile || results) && !savedSessions.some(s => s.name === (projectName||eventName) && (projectName||eventName)) && (
              <div style={{ display:"flex", alignItems:"center", gap:"8px", background:"rgba(0,201,177,0.12)", border:`1px solid rgba(0,201,177,0.3)`, borderRadius:"8px", padding:"7px 10px", marginBottom:"4px" }}>
                <div style={{ width:24, height:24, borderRadius:"6px", background:P.accent, display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}>
                  <div style={{ width:7, height:7, borderRadius:"50%", background:P.navy }} />
                </div>
                <div style={{ minWidth:0, flex:1 }}>
                  <div style={{ fontSize:"15px", fontWeight:800, color:P.white, fontFamily:font, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{projectName || eventName || "Unsaved Project"}</div>
                  <div style={{ fontSize:"15px", color:P.accent, fontFamily:font }}>{results ? `${results.length} guests · ${results.filter(r=>r.status!=="ok").length} flags` : "Active"}</div>
                </div>
                <span style={{ fontSize:"15px", background:P.accent, color:P.navy, padding:"2px 6px", borderRadius:"20px", fontFamily:font, fontWeight:800, flexShrink:0 }}>Active</span>
              </div>
            )}

            {/* Saved projects — most recent first */}
            {savedSessions.length > 0 && (
              <div style={{ marginTop:"4px" }}>
                {savedSessions.map((s, idx) => {
                  const isActive = (projectName||eventName) === (s.projectName||s.eventName) && (s.projectName||s.eventName);
                  const color = `hsl(${(idx * 67 + 200) % 360},55%,42%)`;
                  return (
                    <button key={s.id}
                      onClick={() => {
                        setMeta(s.meta||{}); setProjectName(s.projectName||s.eventName||""); setEventName(s.eventName||"");
                        setArrivalStart(s.arrivalStart||""); setArrivalEnd(s.arrivalEnd||"");
                        setDepartureStart(s.departureStart||""); setDepartureEnd(s.departureEnd||"");
                        setPreferredAirports(s.preferredAirports||"");
                        setDepartureAirports(s.departureAirports||"");
                        setArrivalCutoff(s.arrivalCutoff||"");
                        setDepartureCutoff(s.departureCutoff||"");
                        setLateArrivalCutoff(s.lateArrivalCutoff ?? "22:30");
                        setTypeRules(s.typeRules || []);
                        if (s.results && s.results.length) { setResults(rehydrateResults(s.results)); setActiveTab("grid"); setFilter("all"); setExpanded(null); setShowSetup(false); }
                        else { setResults(null); setSaveMsg("This project was saved before full data was stored — re-upload its files to view it."); setTimeout(()=>setSaveMsg(""), 5000); }
                        if (isMobile) setSidebarOpen(false);
                      }}
                      style={{ width:"100%", display:"flex", alignItems:"center", gap:"8px", background:isActive?"rgba(255,255,255,0.1)":"transparent", border:`1.5px solid ${isActive?"rgba(255,255,255,0.15)":"transparent"}`, borderRadius:"10px", padding:"7px 8px", cursor:"pointer", marginBottom:"2px", fontFamily:font, transition:"all 0.12s", textAlign:"left" }}
                      onMouseEnter={e => !isActive && (e.currentTarget.style.background="rgba(255,255,255,0.07)")}
                      onMouseLeave={e => !isActive && (e.currentTarget.style.background="transparent")}>
                      <div style={{ width:24, height:24, borderRadius:"6px", background:color, display:"flex", alignItems:"center", justifyContent:"center", fontSize:"15px", flexShrink:0, color:"white", fontWeight:800 }}>
                        {(s.name||"?").charAt(0).toUpperCase()}
                      </div>
                      <div style={{ minWidth:0, flex:1 }}>
                        <div style={{ fontSize:"15px", fontWeight:800, color:P.white, fontFamily:font, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{s.name}</div>
                        <div style={{ fontSize:"15px", color:"rgba(255,255,255,0.4)", fontFamily:font }}>{s.guestCount} guests · {s.issueCount} flags</div>
                      </div>
                      {results && <button onClick={e => { e.stopPropagation(); setCompareSession(s); setShowDiff(true); setActiveTab("grid"); }} style={{ background:"rgba(255,255,255,0.12)", border:`1px solid rgba(255,255,255,0.2)`, borderRadius:"5px", padding:"2px 7px", fontSize:"15px", color:P.white, fontWeight:700, fontFamily:font, cursor:"pointer", marginRight:"4px" }}>↔ Diff</button>}
                      <button onClick={e => { e.stopPropagation(); setSavedSessions(prev => { const next = prev.filter(x => x.id !== s.id); try { storage.set(storageKey, JSON.stringify(next)); } catch(ex) {} return next; }); }}
                        style={{ background:"transparent", border:"none", color:"rgba(255,255,255,0.2)", fontSize:"15px", cursor:"pointer", padding:"2px 4px", flexShrink:0, lineHeight:1, borderRadius:"4px" }}
                        onMouseEnter={e => { e.currentTarget.style.color = P.red; e.currentTarget.style.background = "rgba(192,57,43,0.2)"; }}
                        onMouseLeave={e => { e.currentTarget.style.color = "rgba(255,255,255,0.2)"; e.currentTarget.style.background = "transparent"; }}
                        title="Remove">✕</button>
                    </button>
                  );
                })}
              </div>
            )}

            {savedSessions.length === 0 && !flightFile && !results && (
              <div style={{ fontSize:"15px", color:"rgba(255,255,255,0.3)", fontFamily:font, paddingLeft:"4px", paddingTop:"2px", fontStyle:"italic" }}>No saved projects yet</div>
            )}

            {/* Sign-in nudge */}
            {!user && savedSessions.length > 0 && (
              <button onClick={() => setLoginOpen(true)} style={{ width:"100%", marginTop:"8px", background:"rgba(107,127,212,0.2)", border:`1px solid rgba(107,127,212,0.35)`, borderRadius:"8px", padding:"6px 10px", cursor:"pointer", fontFamily:font, textAlign:"center" }}>
                <span style={{ fontSize:"15px", fontWeight:700, color:P.white }}>Sign in to sync across devices</span>
              </button>
            )}
          </div>

          {/* Navigation — only shown after results */}
          {results && <>
            <div style={{ width:"100%", height:1, background:"rgba(255,255,255,0.08)", margin:"4px 0 14px" }} />
            <div style={{ fontSize:"17px", fontWeight:600, color:"rgba(255,255,255,0.5)", letterSpacing:"0.08em", textTransform:"uppercase", marginBottom:"8px", paddingLeft:"2px" }}>Views</div>
            {[
              { k:"grid", icon:<GridIcon size={16} line="rgba(255,255,255,0.85)"/>, label:"Group Grid", badge: null },
              { k:"summary", icon:<BarChart2 size={15} strokeWidth={1.8}/>, label:"Summary", badge: results.filter(r=>r.status!=="ok").length > 0 ? results.filter(r=>r.status!=="ok").length : null },
              { k:"comms", icon:<Mail size={15} strokeWidth={1.8}/>, label:"Communications", badge: (() => { const n = results.filter(r => r.email && (r.issues||[]).filter(x=>!(r.resolved||[]).includes(x.text)).length > 0).length; return n > 0 ? n : null; })() },
              { k:"reports", icon:<SpreadsheetIcon size={16} line="rgba(255,255,255,0.85)" accent={P.accent}/>, label:"Reporting", badge: null },
            ].map(({ k, icon, label, badge }) => (
              <button key={k} onClick={() => { setActiveTab(k); if (isMobile) setSidebarOpen(false); }}
                style={{ width:"100%", display:"flex", alignItems:"center", gap:"10px", background:activeTab===k?"rgba(0,201,177,0.18)":"transparent", border:`1px solid ${activeTab===k?"rgba(0,201,177,0.35)":"transparent"}`, borderRadius:"7px", padding:"7px 10px", cursor:"pointer", marginBottom:"2px", textAlign:"left", transition:"all 0.15s" }}
                onMouseEnter={e => activeTab!==k && (e.currentTarget.style.background="rgba(255,255,255,0.07)")}
                onMouseLeave={e => activeTab!==k && (e.currentTarget.style.background="transparent")}>
                <span style={{ width:20, display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0, color:activeTab===k?P.accent:"rgba(255,255,255,0.45)" }}>{icon}</span>
                <span style={{ flex:1, fontSize:"15px", fontWeight:700, color:activeTab===k?P.accent:"rgba(255,255,255,0.7)", fontFamily:font }}>{label}</span>
                {badge && <span style={{ background:P.red, color:P.white, fontSize:"15px", fontWeight:800, padding:"1px 7px", borderRadius:"20px", flexShrink:0 }}>{badge}</span>}
              </button>
            ))}

            <div style={{ width:"100%", height:1, background:"rgba(255,255,255,0.08)", margin:"14px 0" }} />
            <div style={{ fontSize:"17px", fontWeight:600, color:"rgba(255,255,255,0.5)", letterSpacing:"0.08em", textTransform:"uppercase", marginBottom:"8px", paddingLeft:"2px" }}>Filters</div>
            {(() => {
              const alignedCount = results.filter(r=>r.status==="ok").length;
              const actionCount = results.filter(r=>r.status!=="ok").length;
              const mainFilters = [
                { k:"all", icon:"◉", label:"All Guests", count: results.length, color:null, indent:false },
                { k:"ok", icon:<ClearedIcon size={15} line="rgba(255,255,255,0.8)"/>, label:"Aligned", count: alignedCount, color:P.accent, indent:false },
                { k:"issues", icon:<FlagIcon size={15} line="rgba(255,255,255,0.8)"/>, label:"Action Needed", count: actionCount, color:P.red, indent:false },
              ];
              const subFilters = [
                { k:"missing", icon:"○", label:"Missing records", count: results.filter(r=>r.issues.some(x=>x.type==="missing")).length, color:P.amber, indent:true },
                { k:"window", icon:"🗓", label:"Outside dates", count: results.filter(r=>r.issues.some(x=>x.type==="window")).length, color:"#6B3FA0", indent:true },
                { k:"mismatch", icon:"⇄", label:"Date mismatches", count: results.filter(r=>r.issues.some(x=>x.type==="mismatch")).length, color:"#C0392B", indent:true },
                { k:"duplicate", icon:<AlertCircle size={13} strokeWidth={1.8}/>, label:"Duplicates", count: results.filter(r=>r.issues.some(x=>x.type==="duplicate")).length, color:"#C97A0A", indent:true },
              ].filter(f => f.count > 0);
              const renderBtn = ({ k, icon, label, count, color, indent }) => (
                <button key={k} onClick={() => { setFilter(k); setActiveTab("grid"); if (isMobile) setSidebarOpen(false); }}
                  style={{ width:"100%", display:"flex", alignItems:"center", gap:"8px", background:filter===k&&activeTab==="grid"?"rgba(0,201,177,0.15)":"transparent", border:`1px solid ${filter===k&&activeTab==="grid"?"rgba(0,201,177,0.3)":"transparent"}`, borderRadius:"7px", padding:"6px 10px", paddingLeft: indent ? "26px" : "10px", cursor:"pointer", marginBottom:"2px", textAlign:"left" }}
                  onMouseEnter={e => (filter!==k||activeTab!=="grid") && (e.currentTarget.style.background="rgba(255,255,255,0.07)")}
                  onMouseLeave={e => (filter!==k||activeTab!=="grid") && (e.currentTarget.style.background="transparent")}>
                  <span style={{ fontSize:"15px", color:color||"rgba(255,255,255,0.45)", width:16, textAlign:"center", flexShrink:0 }}>{icon}</span>
                  <span style={{ flex:1, fontSize: indent ? "13px" : "15px", fontWeight:filter===k&&activeTab==="grid"?600:400, color:filter===k&&activeTab==="grid"?P.accent:(indent?"rgba(255,255,255,0.5)":"rgba(255,255,255,0.65)"), fontFamily:font }}>{label}</span>
                  <span style={{ fontSize:"15px", fontWeight:600, color:filter===k&&activeTab==="grid"?P.accent:"rgba(255,255,255,0.4)", fontFamily:font }}>{count}</span>
                </button>
              );
              return (<>
                {mainFilters.map(renderBtn)}
                {subFilters.length > 0 && (<>
                  <div style={{ fontSize:"15px", fontWeight:500, color:"rgba(255,255,255,0.3)", letterSpacing:"0.04em", margin:"8px 0 4px", paddingLeft:"10px" }}>Within Action Needed</div>
                  {subFilters.map(renderBtn)}
                </>)}
              </>);
            })()}
            <div style={{ width:"100%", height:1, background:"rgba(255,255,255,0.08)", margin:"14px 0" }} />
            <div style={{ fontSize:"17px", fontWeight:800, color:"rgba(255,255,255,0.5)", letterSpacing:"0.1em", textTransform:"uppercase", marginBottom:"8px", paddingLeft:"4px" }}>Export</div>
            <button onClick={exportReport} style={{ width:"100%", display:"flex", alignItems:"center", gap:"8px", background:"transparent", border:`1.5px solid rgba(255,255,255,0.12)`, borderRadius:"9px", padding:"7px 10px", cursor:"pointer", marginBottom:"6px", fontFamily:font }}
              onMouseEnter={e => e.currentTarget.style.background="rgba(255,255,255,0.08)"}
              onMouseLeave={e => e.currentTarget.style.background="transparent"}>
              <span style={{ fontSize:"15px" }}>⬇</span>
              <span style={{ fontSize:"15px", fontWeight:700, color:"rgba(255,255,255,0.75)" }}>Download Excel</span>
            </button>
            {contacts.hotel.email && (
              <button onClick={() => exportToContact("hotel")} style={{ width:"100%", display:"flex", alignItems:"center", gap:"8px", background:"transparent", border:`1.5px solid rgba(255,255,255,0.12)`, borderRadius:"9px", padding:"7px 10px", cursor:"pointer", marginBottom:"6px", fontFamily:font }}
                onMouseEnter={e => e.currentTarget.style.background="rgba(255,255,255,0.08)"}
                onMouseLeave={e => e.currentTarget.style.background="transparent"}>
                <span style={{ fontSize:"15px" }}>🏨</span>
                <span style={{ fontSize:"15px", fontWeight:700, color:"rgba(255,255,255,0.75)", whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis" }}>Send to {contacts.hotel.name||"Hotel"}</span>
              </button>
            )}
            {contacts.travel.email && (
              <button onClick={() => exportToContact("travel")} style={{ width:"100%", display:"flex", alignItems:"center", gap:"8px", background:"transparent", border:`1.5px solid rgba(255,255,255,0.12)`, borderRadius:"9px", padding:"7px 10px", cursor:"pointer", marginBottom:"6px", fontFamily:font }}
                onMouseEnter={e => e.currentTarget.style.background="rgba(255,255,255,0.08)"}
                onMouseLeave={e => e.currentTarget.style.background="transparent"}>
                <span style={{ fontSize:"15px" }}>✈</span>
                <span style={{ fontSize:"15px", fontWeight:700, color:P.white, whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis" }}>Send to {contacts.travel.name||"Travel Agency"}</span>
              </button>
            )}
            {!contacts.hotel.email && !contacts.travel.email && (
              <button onClick={() => setContactsOpen(true)} style={{ width:"100%", display:"flex", alignItems:"center", gap:"8px", background:"transparent", border:`1.5px dashed rgba(255,255,255,0.15)`, borderRadius:"9px", padding:"7px 10px", cursor:"pointer", fontFamily:font }}>
                <PeopleIcon size={14} line="rgba(255,255,255,0.55)" accent={P.accent}/>
                <span style={{ fontSize:"15px", fontWeight:700, color:"rgba(255,255,255,0.4)" }}>Add contacts</span>
              </button>
            )}
          </>}

          {/* ── Contact support (signed-in users only) ── */}
          <div style={{ marginTop:"auto", paddingTop:"16px" }}>
            <button onClick={() => setSupportOpen(true)} style={{ width:"100%", display:"flex", alignItems:"center", gap:"8px", background:"transparent", border:`1px solid rgba(255,255,255,0.12)`, borderRadius:"9px", padding:"8px 10px", cursor:"pointer", fontFamily:font, transition:"all 0.15s" }}
              onMouseEnter={e => e.currentTarget.style.background="rgba(255,255,255,0.08)"}
              onMouseLeave={e => e.currentTarget.style.background="transparent"}>
              <PeopleIcon size={15} line="rgba(255,255,255,0.55)" accent={P.accent} />
              <span style={{ fontSize:"15px", fontWeight:700, color:"rgba(255,255,255,0.75)" }}>Contact support</span>
            </button>
          </div>
        </div>

        {/* ── Main Content ── */}
        <div className="gg-main" style={{ flex:1, minWidth:0, padding:isMobile ? "16px 14px" : "24px 28px", overflowY:"auto" }}>

        {/* ── Event Info TOP BAR (results state) — moved off the sidebar so the table gets full width ── */}
        {results && !showSetup && (
          <div className="gg-eventbar" style={{ display:"flex", alignItems:"center", gap:"12px", flexWrap:"wrap", background:P.white, border:`1px solid ${P.grey100}`, borderRadius:"12px", padding:"12px 16px", marginBottom:"16px" }}>
            <div style={{ display:"flex", alignItems:"center", gap:"11px", flex:"1 1 200px", minWidth:0 }}>
              <span style={{ width:4, height:34, background:P.accent, borderRadius:"3px", flexShrink:0 }} />
              <div style={{ display:"flex", flexDirection:"column", minWidth:0, flex:1 }}>
                <span style={{ fontSize:"18px", fontWeight:600, color:P.grey600, fontFamily:font, textTransform:"uppercase", letterSpacing:"0.06em", marginBottom:"1px" }}>Event</span>
                <input value={eventName} onChange={e => setEventName(e.target.value)} placeholder="Name your event"
                  style={{ width:"100%", minWidth:0, background:"transparent", border:"none", fontSize:"22px", fontWeight:600, letterSpacing:"-0.02em", color:P.navy, fontFamily:font, outline:"none", padding:"0", lineHeight:1.15 }} />
              </div>
            </div>
            <div style={{ display:"flex", alignItems:"center", gap:"8px", flexShrink:0 }}>
            <div style={{ position:"relative", display:"flex" }}>
              <button onClick={() => setWindowOpen(!windowOpen)}
                style={{ display:"inline-flex", alignItems:"center", gap:"7px", height:"36px", background:hasWindow?P.periwinkle+"14":P.grey50, border:`1.5px solid ${hasWindow?P.periwinkle+"55":P.grey100}`, borderRadius:"9px", padding:"0 13px", fontSize:"17px", fontWeight:500, color:hasWindow?P.periwinkleD:P.grey600, fontFamily:font, cursor:"pointer", whiteSpace:"nowrap" }}>
                {hasWindow ? "Dates set" : "Approved travel dates"} <CalendarIcon size={15} line={hasWindow?P.periwinkleD:P.grey600} accent={P.accent}/>
              </button>
              {windowOpen && (
                <div style={{ position:"absolute", top:"calc(100% + 6px)", right:0, zIndex:60, width:"260px", background:P.white, border:`1px solid ${P.grey100}`, borderRadius:"12px", padding:"14px", boxShadow:"0 12px 32px rgba(15,29,53,0.16)" }}>
                  <div style={{ fontSize:"13px", color:P.grey600, fontFamily:font, marginBottom:"10px", lineHeight:1.5 }}>Flag guests arriving or departing outside these dates.</div>
                  <div style={{ display:"flex", flexDirection:"column", gap:"8px" }}>
                    {[
                      { label:"Earliest arrival", val:arrivalStart, set:setArrivalStart },
                      { label:"Latest arrival", val:arrivalEnd, set:setArrivalEnd },
                      { label:"Earliest departure", val:departureStart, set:setDepartureStart },
                      { label:"Latest departure", val:departureEnd, set:setDepartureEnd },
                    ].map(({ label, val, set }) => (
                      <div key={label}>
                        <div style={{ fontSize:"13px", fontWeight:500, color:P.grey600, fontFamily:font, marginBottom:"3px" }}>{label}</div>
                        <input type="date" value={val} onChange={e => set(e.target.value)}
                          style={{ width:"100%", background:P.grey50, border:`1.5px solid ${val?P.accent+"66":P.grey100}`, borderRadius:"8px", padding:"7px 9px", fontSize:"17px", fontFamily:font, color:val?P.navy:P.grey600, outline:"none", boxSizing:"border-box" }} />
                      </div>
                    ))}
                    <div style={{ display:"flex", gap:"8px", marginTop:"4px" }}>
                      {hasWindow && <button onClick={() => { setArrivalStart(""); setArrivalEnd(""); setDepartureStart(""); setDepartureEnd(""); }} style={{ flex:1, background:"transparent", border:`1px solid ${P.grey200}`, borderRadius:"7px", padding:"6px", color:P.grey600, fontSize:"13px", fontWeight:500, fontFamily:font, cursor:"pointer" }}>Clear</button>}
                      <button onClick={() => setWindowOpen(false)} style={{ flex:1, background:P.navy, border:"none", borderRadius:"7px", padding:"6px", color:P.white, fontSize:"15px", fontWeight:500, fontFamily:font, cursor:"pointer" }}>Done</button>
                    </div>
                  </div>
                </div>
              )}
            </div>
            <button onClick={() => setContactsOpen(true)}
              style={{ display:"inline-flex", alignItems:"center", gap:"7px", height:"36px", background:(contacts.hotel.email||contacts.travel.email)?P.accent+"14":P.grey50, border:`1.5px solid ${(contacts.hotel.email||contacts.travel.email)?P.accent+"55":P.grey100}`, borderRadius:"9px", padding:"0 13px", fontSize:"17px", fontWeight:500, color:(contacts.hotel.email||contacts.travel.email)?P.accentD:P.grey600, fontFamily:font, cursor:"pointer", whiteSpace:"nowrap" }}>
              {(contacts.hotel.email||contacts.travel.email) ? "Contacts added" : "Contacts"} <PeopleIcon size={15} line={(contacts.hotel.email||contacts.travel.email)?P.accentD:P.grey600} accent={P.accent}/>
            </button>
            </div>
          </div>
        )}

        {results && !showSetup && (
          <div style={{ display:"flex", alignItems:"center", gap:"8px", flexWrap:"wrap", fontSize:"13px", color:P.grey600, fontFamily:font, margin:"-6px 0 16px", padding:"0 2px" }}>
            <CalendarIcon size={13} line={P.grey600} accent={P.accent} />
            <span>{hasWindow ? `${arrivalStart?fmt(parseDate(arrivalStart)):"—"} – ${departureEnd?fmt(parseDate(departureEnd)):"—"}` : "No travel window"}</span>
            <span style={{ color:P.grey200 }}>·</span>
            <span>{arrivalCutoff || departureCutoff ? `${arrivalCutoff?`Arr ${fmtTime(arrivalCutoff,"ampm")}`:""}${arrivalCutoff&&departureCutoff?" / ":""}${departureCutoff?`Dep ${fmtTime(departureCutoff,"ampm")}`:""}` : "No cutoff"}</span>
            <span style={{ color:P.grey200 }}>·</span>
            <span>{preferredAirports || departureAirports ? `${preferredAirports||"any"} → ${departureAirports||preferredAirports||"any"}` : "Any airport"}</span>
            <span style={{ color:P.grey200 }}>·</span>
            <span>{[registrationFile, flightFile, hotelFile, carFile, dietaryFile].filter(Boolean).length} files</span>
            <div style={{ marginLeft:"auto", display:"flex", alignItems:"center", gap:"12px" }}>
              {paramsDirty && (
                <button onClick={runCheck} disabled={loading}
                  style={{ display:"inline-flex", alignItems:"center", gap:"7px", background:P.amber+"1A", border:`1.5px solid ${P.amber}66`, borderRadius:"9px", padding:"6px 13px", fontSize:"15px", fontWeight:600, color:"#C97A0A", fontFamily:font, cursor:loading?"wait":"pointer" }}>
                  <CrossCheckIcon size={14} line="#C97A0A" accent={P.amber} />
                  {loading ? "Re-running…" : "Re-run to update flags"}
                </button>
              )}
              <button onClick={() => setShowSetup(true)} style={{ background:"transparent", border:"none", color:P.periwinkleD, fontSize:"15px", fontWeight:600, fontFamily:font, cursor:"pointer", textDecoration:"underline" }}>Edit setup</button>
            </div>
          </div>
        )}
        {showSetup && results && (
          <div style={{ marginBottom:"12px" }}>
            <button onClick={() => setShowSetup(false)} style={{ display:"inline-flex", alignItems:"center", gap:"6px", background:P.white, border:`1.5px solid ${P.grey200}`, borderRadius:"9px", padding:"7px 13px", fontSize:"16px", fontWeight:600, color:P.grey600, fontFamily:font, cursor:"pointer" }}>← Back to results</button>
          </div>
        )}
        {/* ── Upload hero — full size when no results, compact strip when results exist ── */}
        {(!results || showSetup) ? (
          <SetupScreen
            projectName={projectName} setProjectName={setProjectName}
            eventName={eventName} setEventName={setEventName}
            arrivalStart={arrivalStart} setArrivalStart={setArrivalStart}
            arrivalEnd={arrivalEnd} setArrivalEnd={setArrivalEnd}
            departureStart={departureStart} setDepartureStart={setDepartureStart}
            departureEnd={departureEnd} setDepartureEnd={setDepartureEnd}
            preferredAirports={preferredAirports} setPreferredAirports={setPreferredAirports}
            departureAirports={departureAirports} setDepartureAirports={setDepartureAirports}
            arrivalCutoff={arrivalCutoff} setArrivalCutoff={setArrivalCutoff}
            departureCutoff={departureCutoff} setDepartureCutoff={setDepartureCutoff}
            lateArrivalCutoff={lateArrivalCutoff} setLateArrivalCutoff={setLateArrivalCutoff}
            typeRules={typeRules} setTypeRules={setTypeRules}
            isReRun={!!results}
            contacts={contacts} setContacts={setContacts} setContactsOpen={setContactsOpen}
            registrationFile={registrationFile} setRegistrationFile={setRegistrationFile}
            flightFile={flightFile} setFlightFile={setFlightFile}
            hotelFile={hotelFile} setHotelFile={setHotelFile}
            hotelProperty={hotelProperty} setHotelProperty={setHotelProperty}
            extraHotels={extraHotels} setExtraHotels={setExtraHotels}
            extraFlights={extraFlights} setExtraFlights={setExtraFlights}
            extraCars={extraCars} setExtraCars={setExtraCars}
            extraReg={extraReg} setExtraReg={setExtraReg}
            extraDietary={extraDietary} setExtraDietary={setExtraDietary}
            carFile={carFile} setCarFile={setCarFile}
            dietaryFile={dietaryFile} setDietaryFile={setDietaryFile}
            abstractFile={abstractFile} setAbstractFile={setAbstractFile}
            ready={ready} loading={loading} error={error} runCheck={runCheck} isMobile={isMobile}
          />
        ) : (
          <div style={{ marginBottom:"16px", padding:"10px 14px", background:P.white, borderRadius:"12px", border:`1px solid ${P.grey100}` }}>
            <div style={{ display:"grid", gridTemplateColumns: isMobile ? "1fr 1fr" : "auto auto auto auto auto auto auto auto", gap:"8px", alignItems:"center" }}>
              <UploadSquare label="Registration" icon={<PeopleIcon size={22} />} accent={P.accentD} file={registrationFile} setter={setRegistrationFile} required={false} sub="Source of truth" compact />
              <UploadSquare label="Flight"  icon={<PlaneIcon size={22} />} accent={P.periwinkleD} file={flightFile}  setter={setFlightFile}  required={false}  sub="Optional" compact />
              <UploadSquare label="Hotel"   icon={<HotelIcon size={22} />} accent={P.navy}        file={hotelFile}   setter={setHotelFile}   required={false}  sub="Optional" compact />
              <UploadSquare label="Car"     icon={<CarIcon size={22} />}   accent={P.grey600}     file={carFile}     setter={setCarFile}     required={false} sub="Optional" compact />
              {SHOW_DIETARY && <UploadSquare label="Dietary" icon={<Salad size={22} strokeWidth={1.8} color="#0D9E6E"/>} accent={P.teal}        file={dietaryFile} setter={setDietaryFile} required={false} sub="Optional" compact />}
              {!isMobile && <div style={{ width:1, height:32, background:P.grey100, flexShrink:0 }} />}
              <button onClick={runCheck} disabled={!ready || loading}
                style={{ background:ready&&!loading?P.accent:P.grey100, color:ready&&!loading?P.white:P.grey600, border:"none", borderRadius:"7px", padding:"7px 16px", fontSize:"18px", fontWeight:600, fontFamily:font, cursor:ready&&!loading?"pointer":"not-allowed", transition:"all 0.18s", flexShrink:0, whiteSpace:"nowrap", boxShadow:ready&&!loading?"0 1px 6px rgba(0,201,177,0.3)":"none", gridColumn: isMobile ? "1 / -1" : "auto" }}>
                {loading ? "Checking…" : "Re-run Check"}
              </button>
            </div>
            {error && <div style={{ fontSize:"15px", color:P.red, fontFamily:font, background:P.redLight, borderRadius:"8px", padding:"5px 10px", marginTop:"8px" }}>{error}</div>}
            {results && <div style={{ fontSize:"15px", color:P.green, fontFamily:font, fontWeight:600, marginTop:"8px", textAlign: isMobile ? "center" : "right" }}>{results.length} guests · {results.filter(r=>r.status!=="ok").length} flags found</div>}
          </div>
        )}

        {/* Results */}
        {results && !showSetup && (<>

              {showDiff && compareSession && (() => {
                const prevResults = Object.entries(compareSession.meta||{}).map(([k,v]) => ({
                  key:k, email:k.includes("@")?k:"", displayName:v.displayName||k,
                  status:v.status||"ok", issues:v.issues||[], resolved:v.resolved||[], ...v
                }));
                const diff = diffResults(prevResults, results);
                return (
                  <div style={{ background:P.white, border:`1.5px solid ${P.periwinkle}44`, borderRadius:"12px", padding:"16px 20px", marginBottom:"16px" }}>
                    <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:"12px" }}>
                      <div style={{ display:"flex", alignItems:"center", gap:"10px" }}>
                        <span style={{ fontSize:"15px", fontWeight:800, color:P.navy, fontFamily:font }}>↔ Changes vs "{compareSession.name}"</span>
                        <span style={{ fontSize:"16px", color:P.grey600, fontFamily:font }}>{new Date(compareSession.date).toLocaleDateString("en-US",{month:"short",day:"numeric",year:"numeric"})}</span>
                      </div>
                      <button onClick={() => { setShowDiff(false); setCompareSession(null); }} style={{ background:"transparent", border:"none", color:P.grey600, cursor:"pointer", fontSize:"18px", lineHeight:1 }}>×</button>
                    </div>
                    <div style={{ display:"flex", gap:"12px", flexWrap:"wrap" }}>
                      {[
                        { label:"New guests", val:diff.added.length, color:P.green, bg:P.greenLight, items:diff.added.map(r=>r.displayName) },
                        { label:"Removed", val:diff.removed.length, color:P.red, bg:P.redLight, items:diff.removed.map(r=>r.displayName) },
                        { label:"Issues changed", val:diff.changed.length, color:P.amber, bg:P.amberLight, items:diff.changed.map(d=>`${d.curr.displayName}: ${d.prev.issues.map(x=>x.text).join(", ")||"none"} → ${d.curr.issues.map(x=>x.text).join(", ")||"none"}`) },
                        { label:"Unchanged", val:diff.unchanged.length, color:P.grey600, bg:P.grey50, items:[] },
                      ].map(({label,val,color,bg,items}) => (
                        <div key={label} style={{ background:bg, border:`1px solid ${color}33`, borderRadius:"8px", padding:"10px 14px", minWidth:"110px" }}>
                          <div style={{ fontSize:"22px", fontWeight:700, color, fontFamily:fontDisplay }}>{val}</div>
                          <div style={{ fontSize:"15px", fontWeight:600, color, fontFamily:font }}>{label}</div>
                          {items.length > 0 && items.length <= 5 && <div style={{ marginTop:"6px", fontSize:"15px", color, fontFamily:font, lineHeight:1.6 }}>{items.map((x,i)=><div key={i} style={{ opacity:0.8 }}>• {x}</div>)}</div>}
                          {items.length > 5 && <div style={{ marginTop:"6px", fontSize:"15px", color, fontFamily:font, opacity:0.8 }}>• {items[0]}<br/>• {items[1]}<br/>+{items.length-2} more</div>}
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })()}
          {activeTab === "reports" && (
            <div style={{ maxWidth:"860px" }}>
              <h2 style={{ fontSize:"20px", fontWeight:700, color:P.navy, fontFamily:fontDisplay, letterSpacing:"-0.02em", margin:"0 0 4px" }}>Reporting</h2>
              <p style={{ fontSize:"18px", color:P.grey600, fontFamily:font, margin:"0 0 20px", lineHeight:1.5 }}>Export a clean onsite itinerary, the full cross-check report, or build a custom report for a specific vendor.</p>

              <div style={{ background:P.white, border:`1px solid ${P.grey100}`, borderRadius:"14px", padding:"20px 22px", marginBottom:"16px", boxShadow:"0 1px 2px rgba(12,30,63,0.04), 0 14px 30px -20px rgba(12,30,63,0.22)" }}>
                <div style={{ display:"flex", alignItems:"flex-start", gap:"12px", marginBottom:"14px" }}>
                  <div style={{ width:40, height:40, borderRadius:"10px", background:P.navy, display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}><PeopleIcon size={20} line="rgba(255,255,255,0.95)" accent={P.accent} /></div>
                  <div style={{ flex:1 }}>
                    <div style={{ fontSize:"16px", fontWeight:700, color:P.navy, fontFamily:font, marginBottom:"2px" }}>Onsite master itinerary</div>
                    <div style={{ fontSize:"17px", color:P.grey600, fontFamily:font, lineHeight:1.5 }}>Every attendee A to Z by last name, with their full flight, hotel, and car details on one row. Built to print or use onsite.</div>
                  </div>
                </div>
                <button onClick={exportOnsiteList} style={{ display:"inline-flex", alignItems:"center", gap:"8px", background:P.accent, color:P.white, border:"none", borderRadius:"10px", padding:"11px 20px", fontSize:"15px", fontWeight:800, fontFamily:font, cursor:"pointer", boxShadow:"0 2px 12px rgba(0,201,177,0.35)" }}>Download onsite itinerary (Excel)</button>
              </div>

              <div style={{ background:P.white, border:`1px solid ${P.grey100}`, borderRadius:"14px", padding:"20px 22px", marginBottom:"16px", boxShadow:"0 1px 2px rgba(12,30,63,0.04), 0 14px 30px -20px rgba(12,30,63,0.22)" }}>
                <div style={{ fontSize:"16px", fontWeight:700, color:P.navy, fontFamily:font, marginBottom:"2px" }}>Full cross-check report</div>
                <div style={{ fontSize:"17px", color:P.grey600, fontFamily:font, lineHeight:1.5, marginBottom:"14px" }}>Every attendee and every field, including flagged issues and any resolution notes.</div>
                <button onClick={exportSelected} style={{ display:"inline-flex", alignItems:"center", gap:"8px", background:"transparent", color:P.navy, border:`1.5px solid ${P.grey200}`, borderRadius:"10px", padding:"10px 18px", fontSize:"15px", fontWeight:700, fontFamily:font, cursor:"pointer" }}>Export full report</button>
              </div>

              <div style={{ background:P.white, border:`1px solid ${P.grey100}`, borderRadius:"14px", padding:"20px 22px", marginBottom:"16px", boxShadow:"0 1px 2px rgba(12,30,63,0.04), 0 14px 30px -20px rgba(12,30,63,0.22)" }}>
                <div style={{ fontSize:"16px", fontWeight:700, color:P.navy, fontFamily:font, marginBottom:"2px" }}>Custom report</div>
                <div style={{ fontSize:"17px", color:P.grey600, fontFamily:font, lineHeight:1.5, marginBottom:"16px" }}>Pick who it's for and choose the fields. The report includes all {results.length} attendees with just the columns you select.</div>

                <div style={{ fontSize:"16px", fontWeight:700, color:P.grey600, fontFamily:font, textTransform:"uppercase", letterSpacing:"0.05em", marginBottom:"8px" }}>Who is it for?</div>
                <div style={{ display:"flex", gap:"8px", flexWrap:"wrap", marginBottom:"18px" }}>
                  {[["general","Everything"],["hotel","Hotel"],["car","Car transfer"],["travel","Travel agency"]].map(([t,label]) => (
                    <button key={t} onClick={() => applyReportTarget(t)} style={{ background:reportTarget===t?P.accent+"18":P.grey50, border:`1.5px solid ${reportTarget===t?P.accent:P.grey100}`, borderRadius:"9px", padding:"7px 14px", fontSize:"17px", fontWeight:700, color:reportTarget===t?P.accentD:P.grey600, fontFamily:font, cursor:"pointer" }}>{label}</button>
                  ))}
                </div>

                <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:"8px" }}>
                  <div style={{ fontSize:"16px", fontWeight:700, color:P.grey600, fontFamily:font, textTransform:"uppercase", letterSpacing:"0.05em" }}>Columns</div>
                  {reportFields.size > 0 && <button onClick={() => setReportFields(new Set())} style={{ background:"transparent", border:"none", color:P.periwinkleD, fontSize:"15px", fontWeight:600, fontFamily:font, cursor:"pointer" }}>Clear all</button>}
                </div>
                <div style={{ fontSize:"15px", color:P.grey600, fontFamily:font, lineHeight:1.5, marginBottom:"10px" }}>Open a category and check the fields you want. Pick a preset above to start, then fine-tune.</div>
                <div style={{ display:"flex", flexWrap:"wrap", gap:"8px", marginBottom:"4px" }}>
                  {["Attendee","Status","Flight","Hotel","Car"].map(group => (
                    <ReportFieldDropdown key={group} group={group}
                      fields={REPORT_FIELDS.filter(fl => fl.group===group)}
                      selected={reportFields} onToggle={toggleReportField} onSetGroup={setReportFieldGroup} />
                  ))}
                </div>

                <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", gap:"14px", flexWrap:"wrap", marginTop:"18px", paddingTop:"16px", borderTop:`1px solid ${P.grey100}` }}>
                  <span style={{ fontSize:"17px", color:P.grey600, fontFamily:font }}>{reportFields.size} field{reportFields.size===1?"":"s"} selected · all {results.length} attendees</span>
                  <button onClick={exportCustomReport} disabled={!reportFields.size} style={{ display:"inline-flex", alignItems:"center", gap:"8px", background:reportFields.size?P.accent:P.grey100, color:reportFields.size?P.white:P.grey600, border:"none", borderRadius:"10px", padding:"11px 20px", fontSize:"18px", fontWeight:800, fontFamily:font, cursor:reportFields.size?"pointer":"not-allowed", boxShadow:reportFields.size?"0 2px 12px rgba(0,201,177,0.35)":"none" }}>Export custom report</button>
                </div>

                <div style={{ display:"flex", gap:"8px", alignItems:"flex-start", marginTop:"14px", background:P.grey50, borderRadius:"9px", padding:"10px 12px" }}>
                  <span style={{ flexShrink:0, marginTop:"1px" }}><Mail size={14} strokeWidth={1.8} color={P.grey600} /></span>
                  <span style={{ fontSize:"16px", color:P.grey600, fontFamily:font, lineHeight:1.5 }}>Sending a report straight to your vendor contact from the app is coming once your email is connected. For now, download the file here and attach it to your message.</span>
                </div>
              </div>
            </div>
          )}
          {activeTab === "comms" && (
            <CommHub
              results={results}
              eventName={eventName}
              contacts={contacts}
              arrivalStart={arrivalStart}
              arrivalEnd={arrivalEnd}
              departureStart={departureStart}
              departureEnd={departureEnd}
            />
          )}

          {activeTab === "summary" && (
            <div style={{ background:P.white, borderRadius:"10px", padding:"22px", boxShadow:"0 1px 2px rgba(15,29,53,0.05)", border:`1px solid ${P.grey100}` }}>
              <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:"20px" }}>
                <div>
                  <h2 style={{ fontFamily:fontDisplay, fontSize:"18px", fontWeight:700, color:P.navy, margin:"0 0 3px" }}>{eventName||"Event"} — Summary</h2>
                  <div style={{ fontSize:"15px", color:P.navyLight, fontFamily:font }}>{new Date().toLocaleDateString("en-US",{month:"long",day:"numeric",year:"numeric"})}</div>
                </div>
                <div style={{ display:"flex", gap:"8px", alignItems:"center", flexWrap:"wrap" }}>
                  <Btn onClick={exportReport} outline>Export</Btn>
                  {contacts.hotel.email && <Btn onClick={() => exportToContact("hotel")} color={P.accent}>Send to {contacts.hotel.name||"Hotel"} <Mail size={13} strokeWidth={1.8} style={{verticalAlign:"-2px"}}/></Btn>}
                  {contacts.travel.email && <Btn onClick={() => exportToContact("travel")} color={P.accent}>Send to {contacts.travel.name||"Travel Agency"} <Mail size={13} strokeWidth={1.8} style={{verticalAlign:"-2px"}}/></Btn>}
                </div>
              </div>
              <div style={{ display:"grid", gridTemplateColumns:"repeat(4,1fr)", gap:"10px", marginBottom:"20px" }}>
                {[{label:"Total Guests",val:counts.total,color:P.navy,icon:<Users size={14} strokeWidth={1.8}/>},{label:"Fully Aligned",val:counts.ok,color:P.green,icon:<Check size={14} strokeWidth={1.8}/>},{label:"Action Needed",val:counts.flagged,color:P.red,icon:<AlertTriangle size={14} strokeWidth={1.8}/>},{label:"Alignment Rate",val:(counts.total>0?Math.round(counts.ok/counts.total*100):0)+"%",color:P.periwinkleD,icon:<BarChart2 size={14} strokeWidth={1.8}/>}].map(({label,val,color,icon}) => (
                  <div key={label} style={{ background:P.offWhite, borderRadius:"12px", padding:"14px 16px" }}>
                    <div style={{ fontSize:"20px", fontWeight:900, color, fontFamily:font }}>{icon} {val}</div>
                    <div style={{ fontSize:"15px", color:P.navy, fontWeight:600, marginTop:"4px", fontFamily:font }}>{label}</div>
                  </div>
                ))}
              </div>
              <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:"8px", marginBottom:"20px" }}>
                {[{label:"Missing Records",val:counts.missing,color:P.amber,icon:<Circle size={14} strokeWidth={1.8}/>},{label:"Date Mismatches",val:results.filter(r=>r.issues.some(x=>x.type==="mismatch")).length,color:P.red,icon:<AlertTriangle size={14} strokeWidth={1.8}/>},{label:"Outside Window",val:counts.window,color:P.purple,icon:<Calendar size={14} strokeWidth={1.8}/>},{label:"Duplicate Names",val:counts.duplicate,color:"#C97A0A",icon:<AlertCircle size={14} strokeWidth={1.8}/>},...(SHOW_DIETARY?[{label:"Dietary / Access",val:counts.dietary,color:P.teal,icon:<Salad size={14} strokeWidth={1.8}/>}]:[])].map(({label,val,color,icon}) => (
                  <div key={label} style={{ background:P.offWhite, borderRadius:"10px", padding:"10px 14px", display:"flex", alignItems:"center", gap:"10px" }}>
                    <div style={{ fontSize:"18px", fontWeight:900, color, fontFamily:font, minWidth:"28px" }}>{val}</div>
                    <div style={{ fontSize:"15px", color:P.navy, fontWeight:600, fontFamily:font }}>{icon} {label}</div>
                  </div>
                ))}
              </div>
              {counts.flagged > 0 && (
                <div>
                  <div style={{ fontWeight:800, fontSize:"15px", color:P.red, fontFamily:font, marginBottom:"8px" }}>⚑ Guests Requiring Action</div>
                  {results.filter(r=>r.status!=="ok").map((r,i) => (
                    <div key={i} style={{ background:P.redLight, borderRadius:"10px", padding:"10px 14px", display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:"6px" }}>
                      <div>
                        <div style={{ fontWeight:700, fontSize:"15px", color:P.navy, fontFamily:font }}>{r.firstName} {r.lastName}</div>
                        <div style={{ fontSize:"15px", color:P.red, fontFamily:font, marginTop:"2px" }}>{r.issues.filter(x=>!(r.resolved||[]).includes(x.text)).map(x=>x.text).join(" · ")}</div>
                      </div>
                      <Btn onClick={() => setEmailModal(r)} small outline color={P.red}>Draft <Mail size={12} strokeWidth={1.8} style={{verticalAlign:"-2px"}}/></Btn>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {activeTab === "grid" && (<>
            {/* Search + active filter indicator */}
            {(() => {
            const displayRows = sortedFiltered(filtered);
            const allSelected = displayRows.length > 0 && displayRows.every(r => selectedRows.has(r.key));
            const someSelected = displayRows.some(r => selectedRows.has(r.key));
            const selCount = displayRows.filter(r => selectedRows.has(r.key)).length;
            return (<>
            {/* ── Status scorecard — leads the view and doubles as the filter ── */}
            <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit, minmax(118px, 1fr))", gap:"8px", marginBottom:"14px" }}>
              {[
                { k:"all",          l:"All guests",     v:counts.total,        c:P.navy },
                { k:"ok",           l:"Aligned",        v:counts.ok,           c:P.green },
                { k:"issues",       l:"Action needed",  v:counts.flagged,      c:P.red },
                { k:"earlyarrival", l:"Early arrival",  v:counts.earlyarrival, c:P.periwinkleD },
                { k:"earlydeparture", l:"Early departure", v:counts.earlydeparture, c:P.periwinkleD },
                { k:"missing",      l:"Missing record", v:counts.missing,      c:P.amber },
                { k:"airport",      l:"Wrong airport",  v:counts.airport,      c:"#4F8EF7" },
                { k:"window",       l:"Outside window", v:counts.window,       c:P.purple },
                { k:"mismatch",     l:"Date mismatch",  v:counts.mismatch,     c:P.red },
                { k:"duplicate",    l:"Duplicate",      v:counts.duplicate,    c:"#C97A0A" },
                { k:"unregistered", l:"Unregistered",   v:counts.unregistered, c:P.grey600 },
                { k:"abstractunreg", l:"Abstract, not reg.", v:counts.abstractunreg, c:P.purple },
                { k:"typerule",      l:"Wrong arrival day", v:counts.typerule,     c:P.periwinkleD },
              ].filter(card => ["all","ok","issues"].includes(card.k) || card.v > 0).map(({ k, l, v, c }) => {
                const on = filter === k;
                return (
                  <button key={k} onClick={() => setFilter(k)} aria-pressed={on} title={`Show ${l.toLowerCase()}`}
                    style={{ textAlign:"left", background:on?c+"14":P.offWhite, border:`1.5px solid ${on?c:P.grey100}`, borderRadius:"12px", padding:"12px 14px", cursor:"pointer", transition:"all 0.12s", outline:"none" }}>
                    <div style={{ fontSize:"24px", fontWeight:900, color:c, fontFamily:font, lineHeight:1 }}>{v}</div>
                    <div style={{ fontSize:"16px", fontWeight:600, color:on?c:P.grey600, fontFamily:font, marginTop:"5px" }}>{l}</div>
                  </button>
                );
              })}
            </div>
            <div style={{ display:"flex", flexDirection: isMobile ? "column" : "row", alignItems: isMobile ? "stretch" : "center", gap:"10px", marginBottom:"12px" }}>
              {/* Search */}
              <div style={{ position:"relative", flex:1 }}>
                <input placeholder="Search by name or email…" value={search} onChange={e => setSearch(e.target.value)}
                  style={{ width:"100%", background:P.white, border:`1.5px solid ${P.grey200}`, borderRadius:"10px", padding:"10px 12px 10px 34px", color:P.navy, fontSize:"15px", fontFamily:font, outline:"none", boxSizing:"border-box" }} />
                <span style={{ position:"absolute", left:10, top:"50%", transform:"translateY(-50%)", color:P.navyLight, fontSize:"15px", pointerEvents:"none" }}>🔍</span>
                {search && <button onClick={() => setSearch("")} style={{ position:"absolute", right:10, top:"50%", transform:"translateY(-50%)", background:"transparent", border:"none", color:P.navyLight, fontSize:"15px", cursor:"pointer" }}>✕</button>}
              </div>
              {/* Filter pills replaced by the status scorecard above */}
              {/* Sort — full width row on mobile */}
              <div style={{ display:"flex", gap:"8px", alignItems:"center" }}>
              <select value={sortBy||""} onChange={e => { setSortBy(e.target.value||null); setSortDir("asc"); }}
                style={{ background:P.white, border:`1.5px solid ${P.grey200}`, borderRadius:"8px", padding:"8px 10px", fontSize:"15px", fontWeight:700, fontFamily:font, color:P.navy, cursor:"pointer", outline:"none", flex: isMobile ? 1 : "none" }}>
                <option value="">Sort by…</option>
                <option value="lastName">Last Name A→Z</option>
                <option value="firstName">First Name A→Z</option>
                <option value="email">Email A→Z</option>
                <option value="status">Status</option>
                <option value="arrival">Arrival Date</option>
                <option value="checkin">Check-In</option>
                <option value="departure">Departure Date</option>
                <option value="checkout">Check-Out</option>
                <option value="hotel">Hotel</option>
              </select>
              {sortBy && (
                <button onClick={() => setSortDir(d => d==="asc"?"desc":"asc")}
                  style={{ background:P.navy, border:"none", borderRadius:"8px", padding:"8px 10px", fontSize:"15px", fontWeight:700, fontFamily:font, color:P.white, cursor:"pointer" }}>
                  {sortDir === "asc" ? "↑ Asc" : "↓ Desc"}
                </button>
              )}
              <div title="Time display format" style={{ display:"flex", border:`1.5px solid ${P.grey200}`, borderRadius:"8px", overflow:"hidden", flexShrink:0 }}>
                {[{k:"ampm",l:"AM/PM"},{k:"24hr",l:"24h"}].map(({k,l}) => (
                  <button key={k} onClick={() => setTimeFormat(k)}
                    style={{ background:timeFormat===k?P.navy:P.white, color:timeFormat===k?P.white:P.grey600, border:"none", padding:"8px 10px", fontSize:"17px", fontWeight:700, fontFamily:font, cursor:"pointer" }}>{l}</button>
                ))}
              </div>
              <span style={{ fontSize:"15px", color:P.navyLight, fontFamily:font, whiteSpace:"nowrap" }}>{displayRows.length} guests</span>
              </div>{/* end sort wrapper */}
            </div>

            {/* Export / selection toolbar */}
            <div style={{ display:"flex", alignItems:"center", gap:"8px", marginBottom:"12px", padding:"8px 12px", background:P.white, borderRadius:"12px", border:`1px solid ${someSelected ? P.accent+"66" : P.grey100}`, transition:"border-color 0.2s", flexWrap: isMobile ? "nowrap" : "nowrap", overflowX: isMobile ? "auto" : "hidden" }}>
              {/* Select all */}
              <label style={{ display:"flex", alignItems:"center", gap:"7px", cursor:"pointer", flexShrink:0 }}>
                <div onClick={toggleSelectAll} style={{ width:18, height:18, borderRadius:"5px", border:`2px solid ${allSelected?P.accent:someSelected?P.accent:P.grey300}`, background:allSelected?P.accent:someSelected?P.accent+"33":P.white, display:"flex", alignItems:"center", justifyContent:"center", cursor:"pointer", flexShrink:0, transition:"all 0.15s" }}>
                  {allSelected && <span style={{ color:P.white, fontSize:"15px", fontWeight:900, lineHeight:1 }}>✓</span>}
                  {!allSelected && someSelected && <span style={{ color:P.periwinkleD, fontSize:"15px", fontWeight:900, lineHeight:1 }}>—</span>}
                </div>
                <span style={{ fontSize:"15px", fontWeight:700, color:P.navy, fontFamily:font, whiteSpace:"nowrap" }}>
                  {someSelected ? `${selCount} selected` : `Select all`}
                </span>
              </label>
              <div style={{ width:1, height:20, background:P.grey100, flexShrink:0 }} />
              {/* Excel export — PRIMARY */}
              <button onClick={exportSelected}
                style={{ display:"flex", alignItems:"center", gap:"5px", background:P.accent, border:"none", borderRadius:"7px", padding:"5px 13px", fontSize:"15px", fontWeight:700, fontFamily:font, color:P.white, cursor:"pointer", transition:"all 0.15s", whiteSpace:"nowrap", flexShrink:0, boxShadow:"0 1px 6px rgba(0,201,177,0.3)" }}>
                {someSelected ? `Export ${selCount} to Excel` : "Export to Excel"} <FileSpreadsheet size={13} strokeWidth={1.8} style={{verticalAlign:"-2px",marginLeft:"4px"}}/>
              </button>
              {/* Email selected — send messages without leaving the cross-check tab */}
              {someSelected && (() => {
                const emailable = displayRows.filter(r => selectedRows.has(r.key) && r.email && (r.issues||[]).filter(x=>!(r.resolved||[]).includes(x.text)).length > 0);
                return (
                  <button onClick={() => emailSelected()} disabled={emailable.length===0}
                    title={emailable.length===0 ? "Selected guests have no email or no open issues" : `Draft emails to ${emailable.length} guest(s)`}
                    style={{ display:"flex", alignItems:"center", gap:"5px", background:emailable.length>0?P.white:P.grey50, border:`1.5px solid ${emailable.length>0?P.accent:P.grey100}`, borderRadius:"7px", padding:"5px 12px", fontSize:"17px", fontWeight:600, fontFamily:font, color:emailable.length>0?P.accentD:P.grey600, cursor:emailable.length>0?"pointer":"not-allowed", flexShrink:0, whiteSpace:"nowrap" }}>
                    Email {emailable.length>0?emailable.length:""} selected <Mail size={13} strokeWidth={1.8} style={{verticalAlign:"-2px",marginLeft:"2px"}}/>
                  </button>
                );
              })()}
              {/* Share HTML Report — SECONDARY */}
              <button onClick={generateShareableReport}
                style={{ display:"flex", alignItems:"center", gap:"5px", background:P.offWhite, border:`1.5px solid ${P.grey200}`, borderRadius:"7px", padding:"5px 12px", fontSize:"16px", fontWeight:600, fontFamily:font, color:P.grey600, cursor:"pointer", flexShrink:0, whiteSpace:"nowrap" }}>
                Share HTML Report <Send size={12} strokeWidth={1.8} style={{verticalAlign:"-2px",marginLeft:"4px"}}/>
              </button>
              {someSelected && (
                <button onClick={() => setSelectedRows(new Set())}
                  style={{ background:"transparent", border:"none", fontSize:"15px", color:P.navyLight, fontFamily:font, fontWeight:600, cursor:"pointer", whiteSpace:"nowrap", flexShrink:0 }}>
                  Clear
                </button>
              )}
              <div style={{ marginLeft:"auto", display:"flex", gap:"6px", alignItems:"center", flexShrink:0 }}>
                <button onClick={saveSession}
                  style={{ display:"flex", alignItems:"center", gap:"5px", background:P.navy, border:"none", borderRadius:"7px", padding:"5px 14px", fontSize:"15px", fontWeight:700, fontFamily:font, color:P.white, cursor:"pointer", whiteSpace:"nowrap", flexShrink:0 }}>
                  <Save size={13} strokeWidth={1.8} style={{verticalAlign:"-2px"}}/> Save Project
                </button>
                {(filter !== "all" || sortBy) && (
                  <button onClick={() => { setFilter("all"); setSortBy(null); setSortDir("asc"); }}
                    style={{ background:"transparent", border:`1px solid ${P.grey200}`, borderRadius:"6px", padding:"3px 8px", fontSize:"15px", fontWeight:600, color:P.navyLight, fontFamily:font, cursor:"pointer", whiteSpace:"nowrap" }}>
                    Clear filters
                  </button>
                )}
              </div>
            </div>

            {(() => {
              // Virtual scroll calculations
              const OVERSCAN = 4;
              const containerH = TABLE_ROW_HEIGHT * TABLE_VISIBLE_ROWS;
              // compute row tops accounting for expanded rows
              const rowTops = [];
              let cumH = 0;
              for (let i = 0; i < displayRows.length; i++) {
                rowTops.push(cumH);
                cumH += (expanded === displayRows[i].key) ? TABLE_ROW_HEIGHT + TABLE_EXPANDED_HEIGHT : TABLE_ROW_HEIGHT;
              }
              const totalVH = cumH;
              // find visible range
              let vStart = 0;
              while (vStart < displayRows.length - 1 && rowTops[vStart + 1] <= tableScrollTop - OVERSCAN * TABLE_ROW_HEIGHT) vStart++;
              let vEnd = vStart;
              while (vEnd < displayRows.length && rowTops[vEnd] < tableScrollTop + containerH + OVERSCAN * TABLE_ROW_HEIGHT) vEnd++;
              vEnd = Math.min(vEnd, displayRows.length);
              const topPad = rowTops[vStart] || 0;
              const botPad = vEnd < displayRows.length ? totalVH - rowTops[vEnd] : 0;
              return (
            <div style={{ background:P.white, borderRadius:"10px", boxShadow:"0 1px 2px rgba(15,29,53,0.06), 0 4px 12px rgba(15,29,53,0.05)", border:`1px solid ${P.grey100}`, overflow:"hidden" }}>
              <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", padding:"8px 12px", borderBottom:`1px solid ${P.grey100}`, background:P.grey50 }}>
                <span style={{ fontSize:"13px", color:P.grey600, fontFamily:font }}>Scroll to see all columns →</span>
                <div style={{ display:"flex", gap:"6px" }}>
                  <button onClick={() => { if (tableScrollRef.current) tableScrollRef.current.scrollBy({ left:-320, behavior:"smooth" }); }}
                    style={{ width:"30px", height:"28px", borderRadius:"7px", border:`1px solid ${P.grey200}`, background:P.white, color:P.grey600, cursor:"pointer", fontSize:"17px", display:"flex", alignItems:"center", justifyContent:"center" }} title="Scroll left">‹</button>
                  <button onClick={() => { if (tableScrollRef.current) tableScrollRef.current.scrollBy({ left:320, behavior:"smooth" }); }}
                    style={{ width:"30px", height:"28px", borderRadius:"7px", border:`1px solid ${P.grey200}`, background:P.white, color:P.grey600, cursor:"pointer", fontSize:"17px", display:"flex", alignItems:"center", justifyContent:"center" }} title="Scroll right">›</button>
                </div>
              </div>
              <div className="gg-table-wrap" ref={tableScrollRef} onScroll={e => setTableScrollTop(e.currentTarget.scrollTop)}
                style={{ overflowX:"auto", overflowY:"auto", maxHeight:isMobile ? `calc(100vh - 220px)` : `${containerH}px` }}>
                <table style={{ width:"100%", borderCollapse:"collapse", fontSize:"15px", minWidth:hasCars?"1060px":"760px" }}>
                  <thead style={{ position:"sticky", top:0, zIndex:10 }}>
                    <tr style={{ background:P.navy }}>
                      {/* Checkbox column */}
                      <th style={{ padding:"10px 8px 10px 14px", width:"32px" }}>
                        <div onClick={toggleSelectAll} style={{ width:16, height:16, borderRadius:"4px", border:`2px solid ${allSelected?"white":someSelected?"rgba(255,255,255,0.6)":"rgba(255,255,255,0.3)"}`, background:allSelected?"white":someSelected?"rgba(255,255,255,0.2)":"transparent", display:"flex", alignItems:"center", justifyContent:"center", cursor:"pointer", transition:"all 0.15s" }}>
                          {allSelected && <span style={{ color:P.navy, fontSize:"15px", fontWeight:900, lineHeight:1 }}>✓</span>}
                          {!allSelected && someSelected && <span style={{ color:"white", fontSize:"15px", fontWeight:900, lineHeight:1 }}>—</span>}
                        </div>
                      </th>
                      {[
                        { l:"First Name", col:"firstName", w:"110px" },
                        { l:"Last Name",  col:"lastName",  w:"110px" },
                        { l:"Email",      col:"email",     w:"160px" },
                        { l:"Status",    col:"status" },
                        // Arrival side: flight in → car pickup → hotel check-in
                        { l:"Flight Arrival",   col:"arrival" },
                        { l:"Arr Airport",      col:null },
                        ...(hasCars?[{l:"Car Pickup",col:null},{l:"Δ",col:null}]:[]),
                        { l:"Hotel Check-In",  col:"checkin" },
                        { l:"Δ",         col:null },
                        // Departure side: hotel check-out → car dropoff → flight out
                        { l:"Hotel Check-Out", col:"checkout" },
                        { l:"Δ",         col:null },
                        ...(hasCars?[{l:"Car Dropoff",col:null}]:[]),
                        { l:"Flight Departure", col:"departure" },
                        { l:"Dep Airport",      col:null },
                        ...(hasHotelNames?[{l:"Hotel",col:"hotel"}]:[]),
                        ...(hasDiet?[{l:"Dietary",col:null}]:[]),
                        { l:"Flags",     col:"flags" },
                        { l:"Note",      col:"note" },
                      ].map((h, i) => (
                        <th key={i} onClick={h.col ? () => toggleSort(h.col) : undefined}
                          style={{ padding:"10px 12px", textAlign:"left", fontSize:"17px", fontWeight:800, color: sortBy===h.col?"white":"rgba(255,255,255,0.55)", letterSpacing:"0.1em", textTransform:"uppercase", width:h.w, whiteSpace:"nowrap", fontFamily:font, cursor:h.col?"pointer":"default", userSelect:"none", transition:"color 0.15s" }}>
                          {h.l}{sortBy===h.col ? (sortDir==="asc"?" ↑":" ↓") : h.col ? " ↕" : ""}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.length === 0 && (
                      <tr><td colSpan={20} style={{ padding:"40px", textAlign:"center", color:P.navyLight, fontStyle:"italic", fontFamily:font }}>No records match your filter.</td></tr>
                    )}
                    {topPad > 0 && <tr style={{ height:`${topPad}px` }}><td colSpan={20} style={{ padding:0 }} /></tr>}
                    {displayRows.slice(vStart, vEnd).map((r, vi) => {
                      const i = vStart + vi;
                      const isExp = expanded === r.key;
                      const isSel = selectedRows.has(r.key);
                      const baseBg = isSel ? P.accent+"0D" : i%2===0 ? P.white : P.offWhite;
                      const activeIssues = r.issues.filter(x => !(r.resolved||[]).includes(x.text));
                      return (
                        <Fragment key={`${r.key}-${i}`}>
                          <tr onClick={() => setExpanded(isExp ? null : r.key)} style={{ background:isExp?P.grey50:baseBg, borderBottom:`1px solid ${P.grey100}`, cursor:"pointer", outline:isSel?`inset 0 0 0 1.5px ${P.periwinkle}44`:undefined }}
                            onMouseEnter={e => { if(!isExp) e.currentTarget.style.background=P.grey50; }}
                            onMouseLeave={e => { if(!isExp) e.currentTarget.style.background=baseBg; }}>
                            {/* Row checkbox */}
                            <td style={{ padding:"10px 8px 10px 14px" }} onClick={e => { e.stopPropagation(); toggleSelectRow(r.key); }}>
                              <div style={{ width:16, height:16, borderRadius:"4px", border:`2px solid ${isSel?P.accent:P.grey200}`, background:isSel?P.accent:P.white, display:"flex", alignItems:"center", justifyContent:"center", transition:"all 0.15s" }}>
                                {isSel && <span style={{ color:P.white, fontSize:"15px", fontWeight:900, lineHeight:1 }}>✓</span>}
                              </div>
                            </td>
                            {/* First Name */}
                            <td style={{ padding:"10px 12px" }}>
                              <div style={{ display:"flex", alignItems:"center", gap:"6px" }}>
                                <span style={{ fontWeight:600, fontSize:"15px", color:P.navy, fontFamily:font }}>
                                  {r.firstName || r.displayName.split(" ")[0]}
                                </span>
                              </div>
                            </td>
                            {/* Last Name */}
                            <td style={{ padding:"10px 12px", fontWeight:700, color:P.navy, fontSize:"15px", fontFamily:font }}>
                              {r.lastName || r.displayName.split(" ").slice(1).join(" ") || "—"}
                            </td>
                            {/* Email */}
                            <td style={{ padding:"10px 12px", fontSize:"13px", color:r.email?P.grey600:P.grey200, fontFamily:font }}>
                              {r.email || "—"}
                            </td>
                            <td style={{ padding:"10px 12px" }}><StatusChip status={r.status} /></td>
                            {/* Arrival side: flight arrival → car pickup → hotel check-in */}
                            <td style={{ padding:"10px 12px", color:r.flight?P.grey600:P.red, fontSize:"16px", fontFamily:font, fontWeight:r.flight?500:700 }}>{r.flight ? fmt(r.flight.flightArrival) : "⚠ Missing"}{r.flight?.arrivalTime ? <div style={{ fontSize:"13px", color:P.grey600, fontWeight:500 }}>{fmtTime(r.flight.arrivalTime, timeFormat)}</div> : null}</td>
                            <td style={{ padding:"10px 12px", color:P.grey600, fontSize:"17px", fontFamily:font, fontWeight:600, letterSpacing:"0.03em", whiteSpace:"nowrap" }}>{(r.flight?.arrivalAirport || r.flight?.airport || "").toUpperCase() || "—"}</td>
                            {hasCars && <>
                              <td style={{ padding:"10px 12px", color:P.navy, fontSize:"16px", fontFamily:font }}>{fmt(r.car?.pickupDate)}{r.car?.pickupTime ? <div style={{ fontSize:"13px", color:P.grey600, fontWeight:500 }}>{fmtTime(r.car.pickupTime, timeFormat)}</div> : null}</td>
                              <td style={{ padding:"10px 12px", textAlign:"center" }}><Delta val={r.details?.pickupDiff} /></td>
                            </>}
                            <td style={{ padding:"10px 12px", color:r.hotel?P.grey600:P.red, fontSize:"13px", fontFamily:font, fontWeight:r.hotel?500:700 }}>{r.hotel ? fmt(r.hotel.checkIn) : "⚠ Missing"}</td>
                            <td style={{ padding:"10px 12px", textAlign:"center" }}><Delta val={r.details?.arrDiff} /></td>
                            {/* Departure side: hotel check-out → car dropoff → flight departure */}
                            <td style={{ padding:"10px 12px", color:r.hotel?P.grey600:P.red, fontSize:"13px", fontFamily:font, fontWeight:r.hotel?500:700 }}>{r.hotel ? fmt(r.hotel.checkOut) : "⚠ Missing"}</td>
                            <td style={{ padding:"10px 12px", textAlign:"center" }}><Delta val={r.details?.depDiff} /></td>
                            {hasCars && <td style={{ padding:"10px 12px", color:P.navy, fontSize:"16px", fontFamily:font }}>{fmt(r.car?.dropoffDate)}{r.car?.dropoffTime ? <div style={{ fontSize:"13px", color:P.grey600, fontWeight:500 }}>{fmtTime(r.car.dropoffTime, timeFormat)}</div> : null}</td>}
                            <td style={{ padding:"10px 12px", color:r.flight?P.grey600:P.red, fontSize:"16px", fontFamily:font, fontWeight:r.flight?500:700 }}>{r.flight ? fmt(r.flight.flightDeparture) : "⚠ Missing"}{r.flight?.departureTime ? <div style={{ fontSize:"13px", color:P.grey600, fontWeight:500 }}>{fmtTime(r.flight.departureTime, timeFormat)}</div> : null}</td>
                            <td style={{ padding:"10px 12px", color:P.grey600, fontSize:"17px", fontFamily:font, fontWeight:600, letterSpacing:"0.03em", whiteSpace:"nowrap" }}>{(r.flight?.departureAirport || r.flight?.airport || "").toUpperCase() || "—"}</td>
                            {hasHotelNames && (() => {
                              const wrongHotel = (r.issues||[]).some(x => x.text && x.text.includes("but assigned to"));
                              return <td style={{ padding:"10px 12px", color:wrongHotel?P.red:P.navy, fontSize:"15px", fontFamily:font, fontWeight:wrongHotel?600:500, whiteSpace:"nowrap" }}>{r.hotel?.hotel ? (wrongHotel ? "⚠ "+r.hotel.hotel : r.hotel.hotel) : "—"}</td>;
                            })()}
                            {hasDiet && <td style={{ padding:"10px 12px" }}>
                              {r.diet?.dietary ? <span style={{ background:P.tealLight, color:P.teal, fontSize:"16px", fontWeight:700, padding:"2px 8px", borderRadius:"20px", fontFamily:font }}>{r.diet.dietary.slice(0,16)}{r.diet.dietary.length>16?"…":""}</span> : <span style={{ color:P.grey600 }}>—</span>}
                            </td>}
                            <td style={{ padding:"10px 12px" }}>
                              {activeIssues.length === 0
                                ? <span style={{ color:P.grey200, fontSize:"15px" }}>—</span>
                                : <div style={{ display:"flex", flexDirection:"column", gap:"2px" }}>
                                    {activeIssues.some(x=>x.type==="missing") && <span style={{ color:P.amber, fontSize:"15px", fontWeight:700, fontFamily:font }}>○ missing</span>}
                                    {activeIssues.some(x=>x.type==="window") && <span style={{ color:P.purple, fontSize:"15px", fontWeight:700, fontFamily:font }}>🗓 window</span>}
                                    {activeIssues.some(x=>x.type==="airport") && <span style={{ color:"#4F8EF7", fontSize:"15px", fontWeight:700, fontFamily:font }}>✈ airport</span>}
                                    {activeIssues.some(x=>x.type==="mismatch") && <span style={{ color:P.red, fontSize:"15px", fontWeight:700, fontFamily:font }}>⚑ mismatch</span>}
                                    {activeIssues.some(x=>x.type==="duplicate") && <span style={{ color:"#C97A0A", fontSize:"15px", fontWeight:700, fontFamily:font }}>⚠ dupe</span>}
                                  </div>}
                            </td>
                            <td style={{ padding:"10px 12px" }}>
                              {r.note ? <span style={{ color:P.navy, fontSize:"15px", fontFamily:font, maxWidth:"90px", display:"block", overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }} title={r.note}>📝 {r.note}</span> : <span style={{ color:P.grey200, fontSize:"15px" }}>—</span>}
                            </td>
                          </tr>
                          {isExp && (
                            <tr>
                              <td colSpan={20} style={{ padding:0 }}>
                                <div style={{ background:P.grey50, borderBottom:`1px solid ${P.grey100}`, padding:"16px 18px" }}>
                                  <div style={{ display:"flex", alignItems:"center", gap:"8px", marginBottom:"12px", flexWrap:"wrap" }}>
                                    <Btn onClick={() => setEmailModal(r)} small color={P.accent}>Draft Email <Mail size={12} strokeWidth={1.8} style={{verticalAlign:"-2px"}}/></Btn>
                                    <div style={{ flex:1, display:"flex", alignItems:"center", gap:"8px" }}>
                                      <span style={{ fontSize:"15px", fontWeight:700, color:P.navyLight, fontFamily:font, flexShrink:0 }}>Note</span>
                                      <input value={r.note||""} onChange={e => updateMeta(r,{note:e.target.value, noteBy:(user&&user.name)||"You", noteAt:new Date().toISOString()})} placeholder={user ? `Planner note — saved to ${user.name}'s account` : "Planner note — saved locally (sign in to sync)"} onClick={e => e.stopPropagation()}
                                        style={{ flex:1, background:P.white, border:`1.5px solid ${r.note ? P.periwinkle+"66" : P.grey200}`, borderRadius:"9px", padding:"5px 12px", fontSize:"15px", fontFamily:font, color:P.navy, outline:"none" }} />
                                      <Btn onClick={(e) => { if (e && e.stopPropagation) e.stopPropagation(); saveSession(); }} small color={P.accent}>Save Note</Btn>
                                      {r.note && <span style={{ fontSize:"18px", color:P.green, fontFamily:font, fontWeight:700, flexShrink:0 }}>{user ? "synced" : "saved"}</span>}{r.note && r.noteAt && <span style={{ fontSize:"17px", color:P.grey600, fontFamily:font, flexShrink:0, whiteSpace:"nowrap" }}>{(r.noteBy||"You")} · {new Date(r.noteAt).toLocaleString([], { month:"short", day:"numeric", hour:"numeric", minute:"2-digit" })}</span>}
                                    </div>
                                    <span style={{ fontSize:"15px", color:P.navyLight, fontFamily:font }}>{r.matchedBy==="email"?"✉ email match":"👤 name match"}</span>
                                  </div>
                                  <div className="gg-detail-grid" style={{ display:"grid", gridTemplateColumns:hasDiet?"1fr 1fr 1fr 1fr 1fr":"1fr 1fr 1fr 1fr", gap:"10px" }}>
                                    <Card title="✈ Flight" color={P.periwinkleD}>
                                      {r.flight ? <>
                                        <DR label="Arrival" val={fmt(r.flight.flightArrival) + (r.flight.arrivalTime ? " · " + fmtTime(r.flight.arrivalTime, timeFormat) : "")} />
                                        <DR label="Departure" val={fmt(r.flight.flightDeparture) + (r.flight.departureTime ? " · " + fmtTime(r.flight.departureTime, timeFormat) : "")} />
                                        {r.flight.flightIn && <DR label="Inbound #" val={r.flight.flightIn} accent />}
                                        {r.flight.flightOut && <DR label="Outbound #" val={r.flight.flightOut} accent />}
                                        {(r.flight.arrivalAirport || r.flight.airport) && <DR label="Arr Airport" val={(r.flight.arrivalAirport || r.flight.airport).toUpperCase()} />}
                                        {(r.flight.departureAirport || r.flight.airport) && <DR label="Dep Airport" val={(r.flight.departureAirport || r.flight.airport).toUpperCase()} />}
                                        {r.flight.email && <DR label="Email" val={r.flight.email} />}
                                      </> : <div style={{ background:P.amberLight, borderRadius:"8px", padding:"8px 10px", color:P.amber, fontSize:"15px", fontWeight:700, fontFamily:font }}>○ Not in flight manifest</div>}
                                    </Card>
                                    <Card title="Hotel" color={P.navy}>
                                      {r.hotel ? <>
                                        {r.hotel.hotel && <DR label="Property" val={r.hotel.hotel} />}
                                        <DR label="Check-In" val={fmt(r.hotel.checkIn)} />
                                        <DR label="Check-Out" val={fmt(r.hotel.checkOut)} />
                                        {r.hotel.room && <DR label="Room/Conf" val={r.hotel.room} accent />}
                                        {r.hotel.email && <DR label="Email" val={r.hotel.email} />}
                                      </> : <div style={{ background:P.amberLight, borderRadius:"8px", padding:"8px 10px", color:P.amber, fontSize:"15px", fontWeight:700, fontFamily:font }}>○ Not in hotel roster</div>}
                                    </Card>
                                    <Card title="Car Transfers" color={P.grey600}>
                                      {r.car ? <>
                                        <DR label="Pickup" val={fmt(r.car.pickupDate) + (r.car.pickupTime ? " · " + fmtTime(r.car.pickupTime, timeFormat) : "")} />
                                        {r.car.pickupLoc && <DR label="From" val={r.car.pickupLoc} />}
                                        <DR label="Dropoff" val={fmt(r.car.dropoffDate) + (r.car.dropoffTime ? " · " + fmtTime(r.car.dropoffTime, timeFormat) : "")} />
                                        {r.car.dropoffLoc && <DR label="To" val={r.car.dropoffLoc} />}
                                        {r.car.confirmation && <DR label="Conf #" val={r.car.confirmation} accent />}
                                      </> : <div style={{ color:P.grey200, fontSize:"15px", fontStyle:"italic", fontFamily:font }}>No transfer on file</div>}
                                    </Card>
                                    {hasDiet && (
                                      <Card title="🥗 Dietary & Access" color={P.teal}>
                                        {r.diet ? <>
                                          {r.diet.dietary && <DR label="Dietary" val={r.diet.dietary} />}
                                          {r.diet.accessibility && <DR label="Access" val={r.diet.accessibility} />}
                                          {r.diet.specialNotes && <DR label="Notes" val={r.diet.specialNotes} />}
                                        </> : <div style={{ color:P.grey200, fontSize:"15px", fontStyle:"italic", fontFamily:font }}>No dietary info on file</div>}
                                      </Card>
                                    )}
                                    <Card title="⚑ Flags" color={P.red}>
                                      <div style={{ marginBottom:"8px" }}>
                                        <span style={{ fontSize:"15px", fontWeight:700, fontFamily:font, padding:"2px 8px", borderRadius:"20px", background:r.matchedBy==="email"?P.greenLight:P.amberLight, color:r.matchedBy==="email"?P.green:P.amber }}>
                                          {r.matchedBy==="email"?"✉ email match":"👤 name match"}
                                        </span>
                                      </div>
                                      {r.issues.length === 0
                                        ? <div style={{ color:P.green, fontSize:"15px", fontWeight:700, fontFamily:font }}>✓ All clear</div>
                                        : r.issues.map((issue, j) => <IssueTag key={j} issue={issue} resolved={r.resolved} onResolve={txt => toggleResolve(r, txt)} />)}
                                      {r.resolved?.length > 0 && <div style={{ fontSize:"15px", color:P.navyLight, fontFamily:font, marginTop:"4px" }}>{r.resolved.length} resolved</div>}
                                    </Card>
                                  </div>
                                </div>
                              </td>
                            </tr>
                          )}
                        </Fragment>
                      );
                    })}
                    {botPad > 0 && <tr style={{ height:`${botPad}px` }}><td colSpan={20} style={{ padding:0 }} /></tr>}
                  </tbody>
                </table>
              </div>
              <div style={{ padding:"8px 14px", background:P.offWhite, borderTop:`1px solid ${P.grey100}`, display:"flex", alignItems:"center", justifyContent:"space-between" }}>
                <span style={{ fontSize:"15px", color:P.navyLight, fontFamily:font, fontWeight:600 }}>Showing {displayRows.length} of {results.length} guests{selCount > 0 ? ` · ${selCount} selected` : ""}</span>
                <div style={{ display:"flex", gap:"10px", fontSize:"15px", fontFamily:font, fontWeight:700 }}>
                  <span style={{ color:P.amber }}>○ missing</span>
                  <span style={{ color:P.red }}>⚑ mismatch</span>
                  <span style={{ color:P.purple }}>🗓 window</span>
                  <span style={{ color:"#C97A0A" }}>⚠ dupe</span>
                </div>
              </div>
            </div>
              ); // close IIFE return
            })()} {/* close virtual scroll IIFE */}
            </>);
            })()}
        </>)}
        </>)}
      </div>{/* end main content */}
      </div>{/* end sidebar+main flex */}

      {/* ── Mobile bottom nav — only shown when results are loaded ── */}
      {results && (
        <div className="gg-bottom-nav"
          style={{ position:"fixed", bottom:0, left:0, right:0, zIndex:150, background:P.navy, borderTop:`1px solid rgba(255,255,255,0.1)`, padding:"8px 0 max(8px, env(safe-area-inset-bottom))", display:"flex", alignItems:"center", justifyContent:"space-around" }}>
          {[
            { k:"grid",    icon:<GridIcon size={20} line="rgba(255,255,255,0.85)"/>, label:"Grid" },
            { k:"summary", icon:<BarChart2 size={20} strokeWidth={1.8}/>,  label:"Summary" },
            { k:"comms",   icon:<Mail size={20} strokeWidth={1.8}/>,       label:"Comms" },
            { k:"reports", icon:<SpreadsheetIcon size={20} line="rgba(255,255,255,0.85)" accent={P.accent}/>, label:"Report" },
          ].map(({ k, icon, label }) => {
            const active = activeTab === k;
            return (
              <button key={k} onClick={() => { setActiveTab(k); setSidebarOpen(false); }}
                style={{ flex:1, display:"flex", flexDirection:"column", alignItems:"center", gap:"3px", background:"transparent", border:"none", cursor:"pointer", padding:"4px 0" }}>
                <span style={{ color: active ? P.accent : "rgba(255,255,255,0.4)", display:"flex", alignItems:"center" }}>{icon}</span>
                <span style={{ fontSize:"15px", fontWeight: active ? 700 : 500, color: active ? P.accent : "rgba(255,255,255,0.4)", fontFamily:font, letterSpacing:"0.04em" }}>{label}</span>
              </button>
            );
          })}
          <button onClick={() => setSidebarOpen(o => !o)}
            style={{ flex:1, display:"flex", flexDirection:"column", alignItems:"center", gap:"3px", background:"transparent", border:"none", cursor:"pointer", padding:"4px 0" }}>
            <span style={{ display:"flex", flexDirection:"column", alignItems:"center", gap:"3px", color:"rgba(255,255,255,0.4)" }}>
              {[0,1,2].map(i => <span key={i} style={{ width:16, height:2, background:"rgba(255,255,255,0.4)", borderRadius:2, display:"block" }} />)}
            </span>
            <span style={{ fontSize:"15px", fontWeight:500, color:"rgba(255,255,255,0.4)", fontFamily:font, letterSpacing:"0.04em" }}>Menu</span>
          </button>
        </div>
      )}
      </>)}
    </div>
  );
}
