// GroupGrid pure helpers: date and time parsing/formatting, name and column normalization.
// No React or app state, safe to import anywhere.

// Times are stored canonically as 24h "HH:MM"; fmtTime renders them in the chosen format.
export function parseTimeStr(val) {
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
export function fmtTime(hhmm, fmt) {
  if (!hhmm) return "";
  const m = /^(\d{1,2}):(\d{2})$/.exec(hhmm);
  if (!m) return hhmm;
  let hh = +m[1]; const mm = m[2];
  if (fmt === "24hr") return String(hh).padStart(2, "0") + ":" + mm;
  const ap = hh >= 12 ? "PM" : "AM"; let h12 = hh % 12; if (h12 === 0) h12 = 12;
  return h12 + ":" + mm + " " + ap;
}

export function parseDate(val) {
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
export function atNoon(y, mo, day) { const d = new Date(y, mo, day, 12, 0, 0, 0); return isNaN(d) ? null : d; }
export function fmt(date) { if (!date) return "—"; return date.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }); }
// When results are restored from localStorage (JSON), Date objects come back as strings.
// Rehydrate every date field back into a real Date so .toLocaleDateString()/.getTime() work.
export function rehydrateDate(v) {
  if (!v) return v;
  if (v instanceof Date) return v;
  const d = new Date(v);
  return isNaN(d.getTime()) ? null : d;
}
export function rehydrateResults(results) {
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
export function stripTime(d) { if (!d) return null; const x = new Date(d); x.setHours(0, 0, 0, 0); return x; }
export function diffDays(a, b) { if (!a || !b) return null; return Math.round((stripTime(a) - stripTime(b)) / 86400000); }
export function findCol(headers, candidates) {
  const h = headers.map(x => String(x || "").toLowerCase().trim());
  // Exact header match first (so "Arrival" the date isn't confused with "Arrival Airport").
  for (const c of candidates) { const i = h.indexOf(c); if (i !== -1) return i; }
  // Then substring match as a fallback.
  for (const c of candidates) { const i = h.findIndex(x => x.includes(c)); if (i !== -1) return i; }
  return -1;
}
export function normName(n) { return String(n || "").toLowerCase().replace(/[^a-z]/g, ""); }
export function normEmail(e) { return String(e || "").toLowerCase().trim(); }
export function splitName(full) {
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
